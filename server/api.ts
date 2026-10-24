import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import {
  getDatabase,
  getDatabaseAsync,
  saveDatabase,
  logActivity,
  withDatabaseMutation,
  updateProductAtomically,
} from './db.ts';
import type {
  DBProduct,
  DBCategory,
  DBOrder,
} from './db.ts';
import {
  uploadPersistentMedia,
  deletePersistentMedia,
  listPersistentMedia,
  getStorageProvider,
  getStorageDiagnostics,
} from './storage.ts';
import {
  getR2Config,
  getPresignedUploadUrl,
  validateImageBuffer,
  getR2Object,
  PERMITTED_FOLDERS,
  MAX_FILE_SIZE_BYTES,
} from './r2.ts';
import {
  requireAdmin,
  generateAdminSessionToken,
  verifyAdminCredentials,
} from './auth.ts';
import {
  getAllEditableImages,
  updateImageDirectlyInCode,
  syncAllCode,
  ensureProductGallery,
  resolveProduct,
  resolveProductIndex,
} from './codeSync.ts';
import {
  getGitHubConfig,
  getGitHubDiagnostics,
  generateSafeUniqueFilename,
  commitFileToGitHub,
  commitMultipleFilesToGitHub,
} from './github.ts';
import {
  scanForVercelBlobs,
  migrateVercelBlobsToGitHub,
} from './migration.ts';

const router = express.Router();

// Middleware to parse JSON and raw image uploads with 50mb limit
router.use(express.raw({ type: ['image/*', 'application/octet-stream'], limit: '50mb' }));
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure persistent remote database from Vercel Blob is loaded before serving requests
router.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await getDatabaseAsync();
  } catch {}
  next();
});

// Bootstrap endpoint for full initial state
router.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({ status: 'ok', platform: 'vercel', time: new Date().toISOString() });
});

router.get('/bootstrap', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({
    products: db.products || [],
    categories: db.categories || [],
    settings: db.settings || null,
    timestamp: Date.now(),
  });
});

// Disable caching across all API endpoints to guarantee freshness
router.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// -------------------------------------------------------------
// AUTH ENDPOINTS (SECURED SERVER-SIDE AUTHENTICATION)
// -------------------------------------------------------------

router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body || {};

  const verification = verifyAdminCredentials(email, password);
  if (!verification.success || !verification.admin) {
    return res.status(401).json({
      error: verification.error || 'Invalid administrator email or password.',
    });
  }

  const admin = verification.admin;
  const token = generateAdminSessionToken(admin);

  await logActivity(`Admin logged in: ${admin.name} (${admin.email})`, admin.name);

  return res.json({
    success: true,
    token,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar,
    },
  });
});

router.get('/auth/me', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser;
  res.json({
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar,
    },
  });
});

// -------------------------------------------------------------
// STORAGE DIAGNOSTICS (ADMIN-ONLY)
// -------------------------------------------------------------

router.get(['/admin/storage/diagnostics', '/storage/diagnostics'], requireAdmin, (_req: Request, res: Response) => {
  const diagnostics = getStorageDiagnostics();
  res.json(diagnostics);
});

// -------------------------------------------------------------
// PRODUCT ENDPOINTS
// -------------------------------------------------------------

// GET /api/products
router.get('/products', (req: Request, res: Response) => {
  const db = getDatabase();
  let products = [...db.products];

  const { status, category, search, sort, scope } = req.query;

  // Storefront scope: only returns published products by default
  if (scope === 'storefront') {
    products = products.filter((p) => p.status === 'published');
  } else if (status && status !== 'all') {
    products = products.filter((p) => p.status === status);
  }

  if (category && category !== 'all' && category !== 'new') {
    products = products.filter((p) => p.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.collectionName?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }

  if (sort) {
    if (sort === 'price-asc') products.sort((a, b) => a.priceUSD - b.priceUSD);
    else if (sort === 'price-desc') products.sort((a, b) => b.priceUSD - a.priceUSD);
    else if (sort === 'rating') products.sort((a, b) => b.rating - a.rating);
    else if (sort === 'newest') products.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    else if (sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name));
  }

  res.json(products);
});

// GET /api/products/:id
router.get('/products/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const product = resolveProduct(db.products, req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// POST /api/products
router.post('/products', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  const data = req.body;

  // Validation
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    return res.status(400).json({ error: 'Product name is required.' });
  }
  if (data.priceUSD === undefined || isNaN(Number(data.priceUSD)) || Number(data.priceUSD) < 0) {
    return res.status(400).json({ error: 'A valid price in USD is required.' });
  }
  if (!data.category) {
    return res.status(400).json({ error: 'Product category is required.' });
  }

  // Generate unique slug & id
  const baseSlug = data.slug
    ? data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  let uniqueSlug = baseSlug;
  let counter = 1;
  while (db.products.some((p) => p.slug === uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter++}`;
  }

  const id = data.id || uniqueSlug;
  const sku = data.sku || `LE-${String(data.category).toUpperCase().slice(0, 3)}-${String(db.products.length + 1).padStart(3, '0')}`;

  const newProduct: DBProduct = {
    id,
    name: data.name.trim(),
    slug: uniqueSlug,
    subtitle: data.subtitle || '',
    priceUSD: Number(data.priceUSD),
    compareAtPriceUSD: data.compareAtPriceUSD ? Number(data.compareAtPriceUSD) : undefined,
    category: data.category,
    style: data.style || 'Silk',
    collectionName: data.collectionName || 'Signature',
    description: data.description || '',
    details: Array.isArray(data.details) ? data.details : [data.details].filter(Boolean),
    materials: data.materials || '100% Pure Mulberry Silk',
    sizingInfo: data.sizingInfo || 'Standard bridal fit. Consult size guide.',
    productionTime: data.productionTime || 'Handcrafted in 7–14 working days.',
    shippingInfo: data.shippingInfo || 'Complimentary worldwide express shipping (DHL 3–5 days).',
    careInstructions: data.careInstructions || 'Dry clean only. Gentle low-heat steam.',
    images: (() => {
      if (Array.isArray(data.images)) {
        const clean = data.images
          .filter((img: any) => typeof img === 'string' && img.trim() !== '' && !img.startsWith('blob:'))
          .map((img: string) => img.trim());
        if (clean.length > 0) return clean;
      }
      return [];
    })(),
    colors: Array.isArray(data.colors) && data.colors.length > 0 ? data.colors : [
      { name: 'Ivory', hex: '#FFFFF0' },
      { name: 'Champagne Gold', hex: '#EED9B3' },
    ],
    sizes: Array.isArray(data.sizes) && data.sizes.length > 0 ? data.sizes : [
      'S (UK 6/8)', 'M (UK 10/12)', 'L (UK 14/16)', 'XL (UK 18)', 'Custom Measurements'
    ],
    reviewsCount: Number(data.reviewsCount) || 12,
    rating: Number(data.rating) || 5.0,
    isNew: Boolean(data.isNew),
    isBestSeller: Boolean(data.isBestSeller),
    crossSellIds: Array.isArray(data.crossSellIds) ? data.crossSellIds : [],
    badge: data.badge || '',
    setItems: Array.isArray(data.setItems) ? data.setItems : undefined,
    status: data.status || 'published',
    stockQuantity: data.stockQuantity !== undefined ? Number(data.stockQuantity) : 25,
    stockStatus: data.stockStatus || (Number(data.stockQuantity) === 0 ? 'out_of_stock' : 'in_stock'),
    sku,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ensureProductGallery(newProduct);
  db.products.unshift(newProduct);
  await saveDatabase(db);
  await logActivity(`Created product "${newProduct.name}" (${newProduct.sku})`);

  res.status(201).json(newProduct);
});

// Helper to determine if an image is referenced anywhere in the CMS database
function isImageReferencedInDb(db: any, url: string, currentProductId?: string): boolean {
  if (!url) return false;
  if (db.products?.some((p: any) => p.id !== currentProductId && p.images?.includes(url))) {
    return true;
  }
  if (db.categories?.some((c: any) => c.heroImage === url)) {
    return true;
  }
  if (db.settings) {
    if (
      db.settings.homeHeroImage === url ||
      db.settings.laidePortraitImage === url ||
      db.settings.brandLogoImage === url
    ) {
      return true;
    }
  }
  if (db.realBrides?.some((b: any) => b.image === url)) {
    return true;
  }
  return false;
}

function isDeletableMediaUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  const clean = url.trim();
  if (clean.startsWith('/uploads/') || clean.includes('/uploads/')) return true;
  if (clean.includes('r2.cloudflarestorage.com') || clean.includes('.r2.dev') || clean.startsWith('/api/media/file/')) return true;
  if (clean.includes('blob.vercel-storage.com')) return true;
  const r2 = getR2Config();
  if (r2.publicBaseUrl && clean.startsWith(r2.publicBaseUrl)) return true;
  return false;
}

// PUT /api/products/:id
router.put('/products/:id', requireAdmin, async (req: Request, res: Response) => {
  const updates = req.body;

  // Validation
  if (updates.name && (!updates.name.trim())) {
    return res.status(400).json({ error: 'Product name cannot be empty.' });
  }
  if (updates.priceUSD !== undefined && (isNaN(Number(updates.priceUSD)) || Number(updates.priceUSD) < 0)) {
    return res.status(400).json({ error: 'Invalid price.' });
  }

  try {
    const updatedProduct = await updateProductAtomically(req.params.id, async (existing) => {
      // Handle and sanitize images safely
      let finalImages = existing.images || [];
      if (updates.images !== undefined) {
        const rawList = Array.isArray(updates.images) ? updates.images : [updates.images];
        const sanitized = rawList
          .filter((img: any) => typeof img === 'string' && img.trim() !== '' && !img.startsWith('blob:'))
          .map((img: string) => img.trim());

        if (sanitized.length > 0) {
          finalImages = sanitized;
        } else if (rawList.length === 0) {
          finalImages = [];
        }
      }

      const merged: DBProduct = {
        ...existing,
        ...updates,
        id: existing.id, // Strictly preserve original immutable ID
        images: finalImages,
        priceUSD: updates.priceUSD !== undefined ? Number(updates.priceUSD) : existing.priceUSD,
        compareAtPriceUSD: updates.compareAtPriceUSD !== undefined ? (updates.compareAtPriceUSD ? Number(updates.compareAtPriceUSD) : undefined) : existing.compareAtPriceUSD,
        stockQuantity: updates.stockQuantity !== undefined ? Number(updates.stockQuantity) : existing.stockQuantity,
        updatedAt: new Date().toISOString(),
      };

      // Adjust stock status automatically if quantity set to 0
      if (merged.stockQuantity === 0 && merged.stockStatus === 'in_stock') {
        merged.stockStatus = 'out_of_stock';
      } else if (merged.stockQuantity > 0 && merged.stockStatus === 'out_of_stock') {
        merged.stockStatus = 'in_stock';
      }

      return merged;
    });

    await logActivity(`Updated product "${updatedProduct.name}"`);
    return res.json(updatedProduct);
  } catch (err: any) {
    if (err?.message?.includes('Product not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err?.message || 'Failed to update product.' });
  }
});

// DELETE /api/products/:id
router.delete('/products/:id', requireAdmin, async (req: Request, res: Response) => {
  return withDatabaseMutation(async () => {
    const db = getDatabase();
    const product = resolveProduct(db.products, req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Cleanup persistent remote images if not referenced elsewhere in the catalog
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (isDeletableMediaUrl(img)) {
          const isReferencedElsewhere = isImageReferencedInDb(db, img, product.id);
          if (!isReferencedElsewhere) {
            try {
              await deletePersistentMedia(img);
            } catch (delErr) {
              console.warn(`Failed to delete media for deleted product: ${img}`, delErr);
            }
          }
        }
      }
    }

    db.products = db.products.filter((p) => p.id !== product.id);
    await saveDatabase(db);
    await logActivity(`Deleted product "${product.name}" (${product.sku})`);

    return res.json({ success: true, id: product.id });
  });
});

// POST /api/products/:id/duplicate
router.post('/products/:id/duplicate', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  const product = db.products.find((p) => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const timestamp = Date.now();
  const newId = `${product.id}-copy-${timestamp}`;
  const newSlug = `${product.slug}-copy-${timestamp}`;

  const duplicated: DBProduct = {
    ...product,
    id: newId,
    name: `${product.name} (Copy)`,
    slug: newSlug,
    sku: `LE-CPY-${String(db.products.length + 1).padStart(3, '0')}`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.products.unshift(duplicated);
  await saveDatabase(db);
  await logActivity(`Duplicated product "${product.name}" as "${duplicated.name}"`);

  res.status(201).json(duplicated);
});

// PATCH /api/products/bulk
router.patch('/products/bulk', requireAdmin, async (req: Request, res: Response) => {
  const { ids, action, value } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array of product IDs required.' });
  }

  const db = getDatabase();
  let affectedCount = 0;

  if (action === 'delete') {
    const toDelete = db.products.filter((p) => ids.includes(p.id));
    for (const prod of toDelete) {
      if (Array.isArray(prod.images)) {
        for (const img of prod.images) {
          if (isDeletableMediaUrl(img) && !isImageReferencedInDb(db, img, prod.id)) {
            try {
              await deletePersistentMedia(img);
            } catch (err) {
              console.warn(`Failed to delete media for product ${prod.id}:`, err);
            }
          }
        }
      }
    }
    const initialCount = db.products.length;
    db.products = db.products.filter((p) => !ids.includes(p.id));
    affectedCount = initialCount - db.products.length;
    await logActivity(`Bulk deleted ${affectedCount} products`);
  } else if (action === 'setStatus') {
    db.products = db.products.map((p) => {
      if (ids.includes(p.id)) {
        affectedCount++;
        return {
          ...p,
          status: value as 'published' | 'draft' | 'archived',
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    await logActivity(`Bulk updated status to "${value}" for ${affectedCount} products`);
  } else if (action === 'setCategory') {
    db.products = db.products.map((p) => {
      if (ids.includes(p.id)) {
        affectedCount++;
        return {
          ...p,
          category: value,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    await logActivity(`Bulk changed category to "${value}" for ${affectedCount} products`);
  }

  await saveDatabase(db);
  res.json({ success: true, count: affectedCount });
});

// -------------------------------------------------------------
// CATEGORY ENDPOINTS
// -------------------------------------------------------------

router.get('/categories', (req: Request, res: Response) => {
  const db = getDatabase();
  // Compute dynamic live product counts
  const categoriesWithCounts = db.categories.map((cat) => {
    const count = db.products.filter((p) => p.category === cat.id && p.status === 'published').length;
    return {
      ...cat,
      itemCount: count,
    };
  });
  res.json(categoriesWithCounts);
});

router.post('/categories', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  const { name, subtitle, description, heroImage, badge, slug } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const catId = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  if (db.categories.some((c) => c.id === catId)) {
    return res.status(400).json({ error: 'A category with this identifier already exists.' });
  }

  const newCategory: DBCategory = {
    id: catId,
    name: name.trim(),
    slug: catId,
    subtitle: subtitle || '',
    description: description || '',
    heroImage: heroImage || '',
    badge: badge || '',
    isVisible: true,
    order: db.categories.length + 1,
  };

  db.categories.push(newCategory);
  await saveDatabase(db);
  await logActivity(`Created category "${newCategory.name}"`);

  res.status(201).json(newCategory);
});

router.put('/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  const index = db.categories.findIndex((c) => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  const existing = db.categories[index];
  const updated: DBCategory = {
    ...existing,
    ...req.body,
    id: existing.id,
  };

  db.categories[index] = updated;
  await saveDatabase(db);
  await logActivity(`Updated category "${updated.name}"`);

  res.json(updated);
});

router.delete('/categories/:id', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  const cat = db.categories.find((c) => c.id === req.params.id);

  if (!cat) {
    return res.status(404).json({ error: 'Category not found.' });
  }

  if (cat.heroImage && isDeletableMediaUrl(cat.heroImage) && !isImageReferencedInDb(db, cat.heroImage)) {
    try {
      await deletePersistentMedia(cat.heroImage);
    } catch {}
  }

  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  await saveDatabase(db);
  await logActivity(`Deleted category "${cat.name}"`);

  res.json({ success: true, id: req.params.id });
});

// -------------------------------------------------------------
// ORDERS ENDPOINTS
// -------------------------------------------------------------

router.get('/orders', requireAdmin, (req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.orders || []);
});

router.post('/orders', async (req: Request, res: Response) => {
  const db = getDatabase();
  const orderData = req.body;

  const newOrder: DBOrder = {
    orderId: orderData.orderId || `LE-${Math.floor(10000 + Math.random() * 90000)}`,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    status: 'Processing',
    customerName: orderData.customerName || orderData.shippingAddress?.name || 'Guest Client',
    customerEmail: orderData.customerEmail || '',
    customerPhone: orderData.customerPhone || '',
    shippingAddress: orderData.shippingAddress || {
      name: 'Client',
      city: 'London',
      country: 'United Kingdom',
      street: '42 Belgrave Square',
    },
    items: orderData.items || [],
    totalFormatted: orderData.totalFormatted || '$0',
    totalUSD: Number(orderData.totalUSD) || 0,
    trackingNumber: 'PENDING-DISPATCH',
  };

  db.orders.unshift(newOrder);
  await saveDatabase(db);
  await logActivity(`New order placed #${newOrder.orderId} by ${newOrder.customerName} (${newOrder.totalFormatted})`);

  res.status(201).json(newOrder);
});

router.patch('/orders/:id', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  const order = db.orders.find((o) => o.orderId === req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (req.body.status) order.status = req.body.status;
  if (req.body.trackingNumber) order.trackingNumber = req.body.trackingNumber;

  await saveDatabase(db);
  await logActivity(`Updated order #${order.orderId} status to "${order.status}"`);

  res.json(order);
});

// -------------------------------------------------------------
// DASHBOARD STATS
// -------------------------------------------------------------

router.get('/dashboard/stats', requireAdmin, (req: Request, res: Response) => {
  const db = getDatabase();
  const products = db.products;

  const totalProducts = products.length;
  const publishedProducts = products.filter((p) => p.status === 'published').length;
  const draftProducts = products.filter((p) => p.status === 'draft').length;
  const archivedProducts = products.filter((p) => p.status === 'archived').length;

  const lowStockCount = products.filter(
    (p) => p.stockStatus === 'low_stock' || (p.stockQuantity > 0 && p.stockQuantity <= 5)
  ).length;

  const outOfStockCount = products.filter(
    (p) => p.stockStatus === 'out_of_stock' || p.stockQuantity === 0
  ).length;

  const totalOrders = db.orders.length;
  const totalRevenue = db.orders.reduce((sum, o) => sum + (o.totalUSD || 0), 0);

  const categoryBreakdown = db.categories.map((c) => ({
    name: c.name,
    id: c.id,
    count: products.filter((p) => p.category === c.id).length,
  }));

  const recentProducts = [...products]
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 5);

  res.json({
    totalProducts,
    publishedProducts,
    draftProducts,
    archivedProducts,
    lowStockCount,
    outOfStockCount,
    totalCategories: db.categories.length,
    totalOrders,
    totalRevenue,
    categoryBreakdown,
    recentProducts,
    recentOrders: db.orders.slice(0, 5),
    activityLogs: (db.activityLogs || []).slice(0, 10),
  });
});

// -------------------------------------------------------------
// MEDIA UPLOAD & CLOUDFLARE R2 INTEGRATION
// -------------------------------------------------------------

// POST /api/upload/presign - Generate short-lived presigned upload URL for direct R2 uploads
router.post('/upload/presign', requireAdmin, async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { filename, contentType, folder, size } = req.body || {};

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Filename is required for presigned upload.' });
    }

    if (!contentType || typeof contentType !== 'string') {
      return res.status(400).json({ error: 'Content-Type is required for presigned upload.' });
    }

    if (size && Number(size) > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: `File size exceeds maximum permitted limit of ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`,
      });
    }

    const safeFolder = (folder && PERMITTED_FOLDERS.includes(folder.toLowerCase()))
      ? folder.toLowerCase()
      : 'products';

    const presigned = await getPresignedUploadUrl(filename, contentType, safeFolder, 300);
    await logActivity(`Generated presigned R2 upload URL for ${filename}`);

    return res.status(200).json(presigned);
  } catch (err: any) {
    console.error('Presigned upload generation error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to generate presigned upload URL.' });
  }
});

// POST /api/upload & POST /api/upload-and-save-to-code - Authenticated, validated server-side media upload
router.post(['/upload', '/upload-raw', '/upload-and-save-to-code'], requireAdmin, async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const rawFilename =
      (req.query.filename as string) ||
      (req.headers['x-filename'] as string) ||
      req.body?.filename ||
      req.body?.name ||
      `media_${Date.now()}.jpg`;

    let decodedFilename = 'image.jpg';
    try {
      decodedFilename = decodeURIComponent(rawFilename);
    } catch {
      decodedFilename = rawFilename;
    }
    const cleanFilename = path.basename(decodedFilename).replace(/[^a-zA-Z0-9._-]/g, '_') || `media_${Date.now()}.jpg`;

    const folderParam = (req.query.folder as string) || (req.headers['x-folder'] as string) || req.body?.folder || 'products';
    const safeFolder = PERMITTED_FOLDERS.includes(folderParam.toLowerCase() as any) ? folderParam.toLowerCase() : 'products';

    // Target information for direct-to-code saving with stable unique image mapping
    const targetType = (req.query.targetType as string) || (req.headers['x-target-type'] as string) || req.body?.targetType;
    let targetId = (req.query.targetId as string) || (req.headers['x-target-id'] as string) || req.body?.targetId;
    const imageId = (req.query.imageId as string) || (req.headers['x-image-id'] as string) || req.body?.imageId;
    const imageRole = (req.query.imageRole as string) || (req.headers['x-image-role'] as string) || req.body?.imageRole;
    const imageIndex = req.query.imageIndex !== undefined ? Number(req.query.imageIndex) : (req.headers['x-image-index'] !== undefined ? Number(req.headers['x-image-index']) : (req.body?.imageIndex !== undefined ? Number(req.body?.imageIndex) : 0));

    // CRITICAL: Validate target product and image slot BEFORE uploading any file
    if (targetType === 'product') {
      if (!targetId || typeof targetId !== 'string' || !targetId.trim()) {
        return res.status(400).json({ error: 'Target product ID is required.' });
      }
      const db = getDatabase();
      const targetProd = resolveProduct(db.products, targetId);
      if (!targetProd) {
        return res.status(404).json({
          error: `Target product not found with ID "${targetId}". Upload aborted to prevent image misassignment.`,
        });
      }
      // Strictly lock targetId to the exact unique product ID
      targetId = targetProd.id;
      ensureProductGallery(targetProd);

      // Validate imageId before upload to prevent uploading file for invalid slot
      if (imageId && typeof imageId === 'string' && imageId.trim()) {
        const cleanImgId = imageId.trim();
        if (cleanImgId.includes('__')) {
          const [prefix] = cleanImgId.split('__');
          if (prefix && prefix !== targetProd.id) {
            return res.status(400).json({
              error: `Image identifier "${cleanImgId}" belongs to product "${prefix}", not target product "${targetProd.id}". Upload rejected.`,
            });
          }
        }
        if (cleanImgId === `${targetProd.id}__primary` || cleanImgId === 'primary' || cleanImgId === `${targetProd.id}_primary`) {
          if (imageRole && imageRole !== 'primary') {
            return res.status(400).json({
              error: `Image role "${imageRole}" conflicts with primary image identifier "${cleanImgId}".`,
            });
          }
        } else if (cleanImgId === `${targetProd.id}__hover` || cleanImgId === 'hover' || cleanImgId === `${targetProd.id}_hover`) {
          if (imageRole && imageRole !== 'hover') {
            return res.status(400).json({
              error: `Image role "${imageRole}" conflicts with hover image identifier "${cleanImgId}".`,
            });
          }
        } else {
          const gm = cleanImgId.match(/__gallery_(\d+)$/);
          if (gm) {
            const idx = Number(gm[1]);
            if (idx > (targetProd.images || []).length) {
              return res.status(400).json({
                error: `Stale or out-of-bounds gallery slot index ${idx} in identifier "${cleanImgId}". Product currently has ${targetProd.images?.length || 0} images.`,
              });
            }
            if (imageRole && imageRole !== 'gallery') {
              return res.status(400).json({
                error: `Image role "${imageRole}" conflicts with gallery image identifier "${cleanImgId}".`,
              });
            }
          } else {
            const found = targetProd.imageGallery?.findIndex((img) => img.id === cleanImgId);
            if (found === undefined || found === -1) {
              return res.status(400).json({
                error: `Image identifier "${cleanImgId}" is invalid or does not exist on product "${targetProd.id}". Upload rejected.`,
              });
            }
          }
        }
      }
    }

    let contentType = (req.headers['content-type'] as string) || 'image/jpeg';
    let fileBuffer: Buffer | null = null;

    // 1. Receive and parse the uploaded image
    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      fileBuffer = req.body;
    } else if (typeof req.body === 'string' && req.body.length > 0) {
      fileBuffer = Buffer.from(req.body);
    } else if (req.body && req.body.data) {
      const dataStr = req.body.data;
      if (typeof dataStr === 'string' && (dataStr.startsWith('http://') || dataStr.startsWith('https://') || dataStr.startsWith('/uploads/'))) {
        let codeResult: any = null;
        if (targetType && targetId) {
          await withDatabaseMutation(async () => {
            const db = getDatabase();
            codeResult = await updateImageDirectlyInCode(db, {
              type: targetType as any,
              targetId,
              imageId,
              imageRole,
              imageIndex: Number(imageIndex) || 0,
              newUrl: dataStr,
            });
            await saveDatabase(db);
          });
        }
        if (targetType && targetId && (!codeResult || !codeResult.success)) {
          return res.status(500).json({
            error: `Failed to save image URL to ${targetType}:${targetId}`,
            url: dataStr,
          });
        }
        return res.status(200).json({
          url: dataStr,
          fileName: cleanFilename,
          size: 0,
          codeSaved: Boolean(codeResult?.success),
          filesUpdated: codeResult?.filesUpdated || [],
          item: codeResult?.item,
        });
      }
      const matches = dataStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        contentType = matches[1];
        fileBuffer = Buffer.from(matches[2], 'base64');
      } else {
        fileBuffer = Buffer.from(dataStr, 'base64');
      }
    }

    // 2. Validate that a file buffer was provided
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'No image file provided for upload.' });
    }

    // 3. Inspect magic bytes and validate permitted MIME types
    const validation = validateImageBuffer(fileBuffer, contentType);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || 'Invalid or unsupported image file.' });
    }
    const validatedMime = validation.detectedMime || contentType || 'image/jpeg';

    // 4. Upload to persistent media storage (saving directly into public/uploads & src/assets/images)
    const result = await uploadPersistentMedia(
      fileBuffer,
      cleanFilename,
      validatedMime,
      safeFolder
    );

    const provider = getStorageProvider();
    await logActivity(`Uploaded media file [${provider}]: ${result.fileName}`);

    // 5. If target information was provided, save directly to code immediately!
    let codeResult: any = null;
    let ghCommitResult: any = null;
    let codeUpdateError: string | null = null;

    if (targetType && targetId) {
      try {
        await withDatabaseMutation(async () => {
          const db = getDatabase();
          codeResult = await updateImageDirectlyInCode(db, {
            type: targetType as any,
            targetId,
            imageId,
            imageRole,
            imageIndex: Number(imageIndex) || 0,
            newUrl: result.url,
          });
          // Authoritatively persist updated database
          await saveDatabase(db);
        });
        await logActivity(`Saved uploaded image [${result.fileName}] directly to code: ${codeResult.filesUpdated.join(', ')}`);

        // If GitHub is configured, commit updated data and code files so they permanently persist on GitHub!
        const ghConfig = getGitHubConfig();
        if (ghConfig.isConfigured && Array.isArray(codeResult?.files) && codeResult.files.length > 0) {
          try {
            const allFilesToCommit: Array<{ path: string; buffer?: Buffer; content?: string }> = [
              {
                path: `public/uploads/${result.fileName}`,
                buffer: fileBuffer,
              },
              ...codeResult.files,
            ];

            ghCommitResult = await commitMultipleFilesToGitHub(
              allFilesToCommit,
              `feat(media): upload ${result.fileName} and update code for ${targetType}:${targetId}`
            );
            if (ghCommitResult.success) {
              await logActivity(`Committed uploaded image and code to GitHub (${ghCommitResult.commitSha || 'success'})`);
            } else {
              console.warn('GitHub commit warnings:', ghCommitResult.errors);
            }
          } catch (gitCodeErr: any) {
            console.warn('Failed to prepare GitHub code commit:', gitCodeErr);
            ghCommitResult = { success: false, errors: [gitCodeErr?.message || String(gitCodeErr)] };
          }
        }
      } catch (codeErr: any) {
        codeUpdateError = codeErr?.message || String(codeErr);
        console.error('Failed to directly apply uploaded image to code:', codeErr);
      }
    }

    // Never report success if durable image save or database update failed!
    if (targetType && targetId && (!codeResult || !codeResult.success || codeUpdateError)) {
      return res.status(500).json({
        error: `Image was uploaded, but failed to save to product record: ${codeUpdateError || 'Catalog database save failure'}`,
        url: result.url,
        fileName: result.fileName,
        targetType,
        targetId,
        imageId,
        imageRole,
        imageIndex,
        dbUpdated: false,
        codeSaved: false,
        status: {
          validated: true,
          localSaved: result.localSaved,
          remoteConfirmed: result.remoteConfirmed,
          dbUpdated: false,
          persistenceType: result.persistenceType,
        },
      });
    }

    if (!result.localSaved && !result.remoteConfirmed) {
      return res.status(500).json({
        error: 'Image upload failed: Durable file persistence failed.',
        url: result.url,
      });
    }

    const finalGithub = ghCommitResult
      ? {
          committed: Boolean(ghCommitResult.success),
          commitSha: ghCommitResult.commitSha || result.github?.commitSha,
          htmlUrl: ghCommitResult.htmlUrl || result.github?.htmlUrl,
          path: `public/uploads/${result.fileName}`,
          error: ghCommitResult.errors?.join('; ') || result.github?.error,
        }
      : result.github;

    const responseStatus = {
      validated: true,
      localSaved: result.localSaved,
      localPath: result.localPath,
      remoteConfirmed: result.remoteConfirmed,
      remoteProvider: (result.github?.committed || ghCommitResult?.success)
        ? 'github'
        : (result.key ? 'cloudflare-r2' : (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'none')),
      dbUpdated: Boolean(codeResult?.success),
      filesUpdated: codeResult?.filesUpdated || [],
      github: finalGithub,
      persistenceType: result.persistenceType,
    };

    const warnings = [...(result.warnings || [])];
    if (finalGithub && !finalGithub.committed && getGitHubConfig().isConfigured) {
      warnings.push(`GitHub commit did not complete: ${finalGithub.error || 'Check repository permissions'}`);
    }

    return res.status(200).json({
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      key: result.key,
      status: responseStatus,
      warnings: warnings.length > 0 ? warnings : undefined,
      blob: { url: result.url }, // Backward-compatibility
      codeSaved: Boolean(codeResult?.success),
      filesUpdated: codeResult?.filesUpdated || [],
      item: codeResult?.item,
      github: finalGithub,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err?.message || 'Image upload failed.' });
  }
});

// POST /api/upload/retry-save - Safely retry failed database write or GitHub commit without re-uploading file
router.post('/upload/retry-save', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { url, fileName, targetType, targetId, imageId, imageRole, imageIndex } = req.body || {};
    if (!url || !targetType || !targetId) {
      return res.status(400).json({ error: 'url, targetType, and targetId are required for retry-save.' });
    }

    let codeResult: any = null;
    await withDatabaseMutation(async () => {
      const db = getDatabase();
      if (targetType === 'product') {
        const prod = resolveProduct(db.products, targetId);
        if (!prod) {
          throw new Error(`Product not found with ID "${targetId}"`);
        }
      }
      codeResult = await updateImageDirectlyInCode(db, {
        type: targetType,
        targetId,
        imageId,
        imageRole,
        imageIndex: Number(imageIndex) || 0,
        newUrl: url,
      });
      await saveDatabase(db);
    });

    if (!codeResult || !codeResult.success) {
      return res.status(500).json({ error: 'Failed to save image to product record on retry.' });
    }

    let ghCommitResult: any = null;
    const ghConfig = getGitHubConfig();
    if (ghConfig.isConfigured && Array.isArray(codeResult?.files) && codeResult.files.length > 0) {
      try {
        ghCommitResult = await commitMultipleFilesToGitHub(
          codeResult.files,
          `fix(media): retry code update for ${targetType}:${targetId}`
        );
      } catch (err: any) {
        ghCommitResult = { success: false, errors: [err?.message || String(err)] };
      }
    }

    return res.json({
      success: true,
      url,
      fileName,
      status: {
        dbUpdated: true,
        filesUpdated: codeResult.filesUpdated,
        github: ghCommitResult
          ? {
              committed: Boolean(ghCommitResult.success),
              commitSha: ghCommitResult.commitSha,
              error: ghCommitResult.errors?.join('; '),
            }
          : undefined,
      },
      item: codeResult.item,
      filesUpdated: codeResult.filesUpdated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to retry saving to code.' });
  }
});

// -------------------------------------------------------------
// GITHUB STORAGE & REPOSITORY STATUS (ADMIN-ONLY)
// -------------------------------------------------------------

router.get(['/github/status', '/github/diagnostics'], requireAdmin, async (_req: Request, res: Response) => {
  try {
    const diagnostics = await getGitHubDiagnostics();
    res.json(diagnostics);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to retrieve GitHub diagnostics' });
  }
});

// POST /api/github/migrate - Migrate legacy Vercel Blobs to local uploads & GitHub repository
router.post('/github/migrate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { dryRun } = req.body || {};
    const report = await migrateVercelBlobsToGitHub({ dryRun: Boolean(dryRun) });
    await logActivity(`Executed Vercel Blob to GitHub migration: ${report.migratedCount} migrated, ${report.failedCount} failed`);
    res.json(report);
  } catch (err: any) {
    console.error('Migration error:', err);
    res.status(500).json({ error: err?.message || 'Migration execution failed' });
  }
});

// GET /api/media/file/:key(*) - Stream media directly from Cloudflare R2 if accessed via proxy
router.get('/media/file/:key(*)', async (req: Request, res: Response) => {
  const key = req.params.key;
  if (!key) {
    return res.status(400).json({ error: 'Media object key required.' });
  }

  try {
    const obj = await getR2Object(key);
    if (!obj || !obj.Body) {
      return res.status(404).json({ error: 'Object not found in Cloudflare R2.' });
    }

    if (obj.ContentType) res.setHeader('Content-Type', obj.ContentType);
    if (obj.ContentLength) res.setHeader('Content-Length', obj.ContentLength);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // obj.Body is a readable stream in Node.js AWS SDK
    if (typeof (obj.Body as any).pipe === 'function') {
      (obj.Body as any).pipe(res);
    } else {
      const bytes = await (obj.Body as any).transformToByteArray();
      res.end(Buffer.from(bytes));
    }
  } catch (err: any) {
    console.error(`Error streaming R2 media [${key}]:`, err);
    return res.status(404).json({ error: 'Failed to retrieve media file.' });
  }
});

router.get('/media', async (_req: Request, res: Response) => {
  try {
    const media = await listPersistentMedia();
    res.json(media);
  } catch (err: any) {
    console.error('Fetch media error:', err);
    res.status(500).json({ error: 'Failed to read media library' });
  }
});

router.delete('/media', requireAdmin, async (req: Request, res: Response) => {
  try {
    const targetUrl = (req.body?.url || req.query.url || req.body?.key || req.query.key) as string;
    const force = req.body?.force !== undefined ? Boolean(req.body.force) : true;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json({ error: 'Target media URL or key is required for deletion.' });
    }

    const db = getDatabase();
    const isReferenced = isImageReferencedInDb(db, targetUrl);

    if (isReferenced && !force) {
      return res.status(409).json({
        error: 'Cannot delete media: asset is currently referenced by products or site settings.',
        referenced: true,
      });
    }

    // Permanently remove image file from all storage (disk, GitHub, R2, Blob)
    const deleteResult = await deletePersistentMedia(targetUrl);

    // Clean up references across products, categories, settings, and real brides without restoring old images or guessing replacements
    if (Array.isArray(db.products)) {
      for (const prod of db.products) {
        if (Array.isArray(prod.images) && prod.images.includes(targetUrl)) {
          prod.images = prod.images.filter((img) => img !== targetUrl);
          ensureProductGallery(prod);
          prod.updatedAt = new Date().toISOString();
        }
      }
    }

    if (Array.isArray(db.categories)) {
      for (const cat of db.categories) {
        if (cat.heroImage === targetUrl) {
          cat.heroImage = '';
        }
      }
    }

    if (db.settings) {
      if (db.settings.homeHeroImage === targetUrl) {
        delete db.settings.homeHeroImage;
      }
      if (db.settings.heroImage === targetUrl) {
        delete db.settings.heroImage;
      }
      if (db.settings.laidePortraitImage === targetUrl) {
        delete db.settings.laidePortraitImage;
      }
      if (db.settings.brandLogoImage === targetUrl) {
        delete db.settings.brandLogoImage;
      }
      if ((db.settings as any).adminAvatarImage === targetUrl) {
        delete (db.settings as any).adminAvatarImage;
      }
      if ((db.settings as any).canonicalOverrides) {
        for (const [k, v] of Object.entries((db.settings as any).canonicalOverrides)) {
          if (v === targetUrl) {
            delete (db.settings as any).canonicalOverrides[k];
          }
        }
      }
      (db as any).siteSettings = { ...db.settings };
    }

    if (Array.isArray(db.realBrides)) {
      for (const b of db.realBrides) {
        if (b.image === targetUrl) {
          b.image = '';
        }
      }
    }

    await saveDatabase(db);

    const adminUser = (req as any).adminUser;
    await logActivity(`Permanently deleted media asset: ${path.basename(targetUrl)}`, adminUser?.name);

    return res.status(200).json({
      success: true,
      deleted: targetUrl,
      deletedLocations: deleteResult.deletedLocations,
    });
  } catch (err: any) {
    console.error('Delete media error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to delete media asset.' });
  }
});

// -------------------------------------------------------------
// SITE SETTINGS ENDPOINTS
// -------------------------------------------------------------

router.get('/settings', (req: Request, res: Response) => {
  const db = getDatabase();
  res.json(
    db.settings || {
      homeHeroImage: '/uploads/regenerated_image_1788952915584.png',
      homeHeroTitle: 'The Morning Before Forever',
      homeHeroSubtitle: 'Hand-appliquéd 3D florals, French chantilly laces & 100% pure Mulberry liquid silks for the discerning global bride.',
      announcement: 'Complimentary worldwide express courier delivery on all bridal suite commissions.',
      laidePortraitImage: '/uploads/laide_founder_portrait_1789650582034.jpg',
      brandLogoImage: '/uploads/lariel_brand_logo_1788970256407.jpg',
    }
  );
});

router.put('/settings', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  db.settings = {
    ...(db.settings || {}),
    ...req.body,
  };
  await saveDatabase(db);
  await logActivity('Updated site settings and hero imagery');
  res.json(db.settings);
});

// -------------------------------------------------------------
// REAL BRIDES / LOOKBOOK ENDPOINTS
// -------------------------------------------------------------

router.get('/real-brides', (req: Request, res: Response) => {
  const db = getDatabase();
  res.json(db.realBrides || []);
});

router.post('/real-brides', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  if (!db.realBrides) db.realBrides = [];
  
  const { id, brideName, location, weddingDate, category, robeWorn, image, quote, photographerCredit } = req.body;
  
  if (!brideName || !image) {
    return res.status(400).json({ error: 'Bride name and image are required.' });
  }

  const brideStory = {
    id: id || `bride-${Date.now()}`,
    brideName,
    location: location || 'Global Bride',
    weddingDate: weddingDate || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    category: category || 'Bride',
    robeWorn: robeWorn || 'Lariel Bridal Robe',
    image,
    quote: quote || 'The moment before forever was pure luxury.',
    photographerCredit: photographerCredit || 'Featured Bride',
    createdAt: new Date().toISOString(),
  };

  const existingIdx = db.realBrides.findIndex((b) => b.id === brideStory.id);
  if (existingIdx >= 0) {
    db.realBrides[existingIdx] = { ...db.realBrides[existingIdx], ...brideStory };
  } else {
    db.realBrides.unshift(brideStory);
  }

  await saveDatabase(db);
  await logActivity(`Published Real Bride feature: "${brideName}"`);
  res.json(brideStory);
});

router.delete('/real-brides/:id', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  if (!db.realBrides) db.realBrides = [];
  const bride = db.realBrides.find((b) => b.id === req.params.id);
  if (bride && bride.image && isDeletableMediaUrl(bride.image) && !isImageReferencedInDb(db, bride.image)) {
    try {
      await deletePersistentMedia(bride.image);
    } catch {}
  }
  db.realBrides = db.realBrides.filter((b) => b.id !== req.params.id);
  await saveDatabase(db);
  await logActivity(`Deleted Real Bride feature with id "${req.params.id}"`);
  res.json({ success: true, id: req.params.id });
});

// -------------------------------------------------------------
// DIRECT-TO-CODE IMAGE EDITING & INVENTORY ENDPOINTS
// -------------------------------------------------------------

router.get('/images/inventory', requireAdmin, (req: Request, res: Response) => {
  const db = getDatabase();
  const inventory = getAllEditableImages(db);
  res.json({
    total: inventory.length,
    images: inventory,
  });
});

router.put('/images/edit', requireAdmin, async (req: Request, res: Response) => {
  try {
    let { type, targetId, imageId, imageRole, imageIndex, newUrl } = req.body || {};
    if (!type || !targetId || !newUrl) {
      return res.status(400).json({ error: 'Missing type, targetId, or newUrl in edit request.' });
    }

    let result: any = null;
    await withDatabaseMutation(async () => {
      const db = getDatabase();
      if (type === 'product') {
        const prod = resolveProduct(db.products, targetId);
        if (!prod) {
          throw new Error(`Product not found with ID "${targetId}"`);
        }
        targetId = prod.id;
      }
      result = await updateImageDirectlyInCode(db, {
        type,
        targetId,
        imageId,
        imageRole,
        imageIndex: Number(imageIndex) || 0,
        newUrl,
      });
      await saveDatabase(db);
    });

    if (!result || !result.success) {
      return res.status(500).json({ error: 'Failed to update image in database.' });
    }

    await logActivity(`Edited image for [${type}:${targetId}] -> saved directly to code: ${result.filesUpdated.join(', ')}`);

    return res.json({
      success: true,
      message: `Image updated and saved directly to ${result.filesUpdated.join(', ')}`,
      filesUpdated: result.filesUpdated,
      timestamp: result.timestamp,
      item: result.item,
    });
  } catch (err: any) {
    console.error('Direct code image edit error:', err);
    const status = err?.message?.includes('not found') ? 404 : 500;
    return res.status(status).json({ error: err?.message || 'Failed to edit image in code.' });
  }
});

router.post('/images/sync-all', requireAdmin, async (req: Request, res: Response) => {
  try {
    let result: any = null;
    await withDatabaseMutation(async () => {
      const db = getDatabase();
      result = syncAllCode(db);
      await saveDatabase(db);
    });
    await logActivity(`Synchronized entire database state directly into code files: ${result.filesUpdated.join(', ')}`);
    return res.json({
      success: true,
      message: `All catalog and image data synchronized directly to code files.`,
      filesUpdated: result.filesUpdated,
      timestamp: result.timestamp,
    });
  } catch (err: any) {
    console.error('Sync all to code error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to sync to code.' });
  }
});

// POST /api/images/delete-from-code - Delete image from code files directly
router.post(['/images/delete', '/images/delete-from-code'], requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type, targetId, imageId, imageRole, imageIndex } = req.body;
    if (!type || !targetId) {
      return res.status(400).json({ error: 'type and targetId are required for deletion.' });
    }

    return await withDatabaseMutation(async () => {
      const db = getDatabase();
      let action = 'deleted';
      let message = 'Image deleted from code';
      let filesUpdated: string[] = [];

      if (type === 'product') {
        const prod = resolveProduct(db.products, targetId);
        if (!prod) {
          return res.status(404).json({ error: `Product not found with ID ${targetId}` });
        }

        if (!Array.isArray(prod.images)) prod.images = [];

        // Determine target position:
        let targetPos = -1;
        if (imageId) {
          if (imageId === `${prod.id}__primary` || imageId === 'primary' || imageId.endsWith('__primary')) {
            targetPos = 0;
          } else if (imageId === `${prod.id}__hover` || imageId === 'hover' || imageId.endsWith('__hover')) {
            targetPos = 1;
          } else {
            const found = prod.imageGallery?.findIndex((img) => img.id === imageId);
            if (found !== undefined && found >= 0) {
              targetPos = found;
            } else {
              const m = imageId.match(/__gallery_(\d+)/);
              if (m) {
                targetPos = Number(m[1]);
              }
            }
          }
        }

        if (targetPos === -1 && imageIndex !== undefined) {
          targetPos = Number(imageIndex);
        }

        if (targetPos >= 0 && targetPos < prod.images.length) {
          // If it is the only image and targetPos === 0, delete the product!
          if (prod.images.length <= 1 && targetPos === 0) {
            const removedImages = [...prod.images];
            db.products = db.products.filter((p) => p.id !== prod.id);
            action = 'deleted_product';
            message = `Deleted product "${prod.name}" and updated src/data/products.ts`;
            for (const img of removedImages) {
              if (isDeletableMediaUrl(img) && !isImageReferencedInDb(db, img, prod.id)) {
                try { await deletePersistentMedia(img); } catch {}
              }
            }
          } else {
            // Remove the image at targetPos
            const removedUrl = prod.images.splice(targetPos, 1)[0];
            ensureProductGallery(prod);
            prod.updatedAt = new Date().toISOString();
            action = 'removed_image';
            message = `Deleted image #${targetPos + 1} from "${prod.name}" and updated src/data/products.ts`;
            // Cleanup unreferenced media file permanently
            if (isDeletableMediaUrl(removedUrl) && !isImageReferencedInDb(db, removedUrl)) {
              try { await deletePersistentMedia(removedUrl); } catch {}
            }
          }
        } else {
          // Default: delete product
          const removedImages = [...prod.images];
          db.products = db.products.filter((p) => p.id !== prod.id);
          action = 'deleted_product';
          message = `Deleted product "${prod.name}" and updated src/data/products.ts`;
          for (const img of removedImages) {
            if (isDeletableMediaUrl(img) && !isImageReferencedInDb(db, img, prod.id)) {
              try { await deletePersistentMedia(img); } catch {}
            }
          }
        }

        if (action !== 'deleted_product') {
          prod.updatedAt = new Date().toISOString();
        }
        const syncRes = syncAllCode(db);
        await saveDatabase(db);
        filesUpdated = syncRes.filesUpdated;
      } else if (type === 'real-bride') {
        db.realBrides = (db.realBrides || []).filter((b) => b.id !== targetId);
        const syncRes = syncAllCode(db);
        await saveDatabase(db);
        filesUpdated = syncRes.filesUpdated;
        message = `Deleted Real Bride story and updated src/data/realBrides.ts`;
      } else if (type === 'category') {
        const cat = db.categories.find((c) => c.id === targetId);
        if (cat) {
          cat.heroImage = '';
          const syncRes = syncAllCode(db);
          await saveDatabase(db);
          filesUpdated = syncRes.filesUpdated;
          message = `Cleared hero image for category "${cat.name}" in code`;
        }
      } else if (type === 'setting' || type === 'canonical') {
        if (db.settings) {
          delete (db.settings as any)[targetId];
          if ((db.settings as any).canonicalOverrides) {
            delete (db.settings as any).canonicalOverrides[targetId];
          }
          (db as any).siteSettings = { ...db.settings };
        }
        const syncRes = syncAllCode(db);
        await saveDatabase(db);
        filesUpdated = syncRes.filesUpdated;
        message = `Reset setting image "${targetId}" in code`;
      }

      await logActivity(`Deleted image for [${type}:${targetId}] -> updated code: ${filesUpdated.join(', ')}`);

      return res.json({
        success: true,
        action,
        message,
        filesUpdated,
        timestamp: Date.now(),
      });
    });
  } catch (err: any) {
    console.error('Delete image from code error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to delete image from code.' });
  }
});

// Global JSON error handler to guarantee API responses are always JSON and never HTML
router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  res.setHeader('Content-Type', 'application/json');
  const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  if (status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Image is too large' });
  }
  return res.status(status).json({ error: err?.message || 'Internal server error' });
});

export default router;
