import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import {
  getDatabase,
  getDatabaseAsync,
  saveDatabase,
  logActivity,
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
  const product = db.products.find((p) => p.id === req.params.id || p.slug === req.params.id);
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
      return ['/uploads/bridal_couch_hero_1788951504284.jpg'];
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
  if (typeof url !== 'string') return false;
  const r2 = getR2Config();
  if (r2.publicBaseUrl && url.startsWith(r2.publicBaseUrl)) return true;
  if (url.includes('r2.cloudflarestorage.com') || url.includes('.r2.dev') || url.startsWith('/api/media/file/')) return true;
  if (url.includes('blob.vercel-storage.com')) return true;
  return false;
}

// PUT /api/products/:id
router.put('/products/:id', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  const index = db.products.findIndex((p) => p.id === req.params.id || p.slug === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const existing = db.products[index];
  const updates = req.body;

  // Validation
  if (updates.name && (!updates.name.trim())) {
    return res.status(400).json({ error: 'Product name cannot be empty.' });
  }
  if (updates.priceUSD !== undefined && (isNaN(Number(updates.priceUSD)) || Number(updates.priceUSD) < 0)) {
    return res.status(400).json({ error: 'Invalid price.' });
  }

  // Handle and sanitize images safely
  let finalImages = existing.images || [];
  if (updates.images !== undefined) {
    const rawList = Array.isArray(updates.images) ? updates.images : [updates.images];
    const sanitized = rawList
      .filter((img: any) => typeof img === 'string' && img.trim() !== '' && !img.startsWith('blob:'))
      .map((img: string) => img.trim());

    // Only update images if we have at least one valid sanitized image
    if (sanitized.length > 0) {
      finalImages = sanitized;
    }
  }

  const updatedProduct: DBProduct = {
    ...existing,
    ...updates,
    id: existing.id, // Immutable ID
    images: finalImages.length > 0 ? finalImages : ['/uploads/bridal_couch_hero_1788951504284.jpg'],
    priceUSD: updates.priceUSD !== undefined ? Number(updates.priceUSD) : existing.priceUSD,
    compareAtPriceUSD: updates.compareAtPriceUSD !== undefined ? (updates.compareAtPriceUSD ? Number(updates.compareAtPriceUSD) : undefined) : existing.compareAtPriceUSD,
    stockQuantity: updates.stockQuantity !== undefined ? Number(updates.stockQuantity) : existing.stockQuantity,
    updatedAt: new Date().toISOString(),
  };

  // Adjust stock status automatically if quantity set to 0
  if (updatedProduct.stockQuantity === 0 && updatedProduct.stockStatus === 'in_stock') {
    updatedProduct.stockStatus = 'out_of_stock';
  } else if (updatedProduct.stockQuantity > 0 && updatedProduct.stockStatus === 'out_of_stock') {
    updatedProduct.stockStatus = 'in_stock';
  }

  db.products[index] = updatedProduct;
  await saveDatabase(db);
  await logActivity(`Updated product "${updatedProduct.name}"`);

  // Cleanup replaced persistent remote images only after product update has successfully saved
  // and only if not shared by other products/categories
  if (existing.images && Array.isArray(existing.images)) {
    for (const oldImg of existing.images) {
      if (isDeletableMediaUrl(oldImg) && !finalImages.includes(oldImg)) {
        const isReferencedElsewhere = isImageReferencedInDb(db, oldImg, existing.id);
        if (!isReferencedElsewhere) {
          deletePersistentMedia(oldImg).catch(() => {});
        }
      }
    }
  }

  res.json(updatedProduct);
});

// DELETE /api/products/:id
router.delete('/products/:id', requireAdmin, async (req: Request, res: Response) => {
  const db = getDatabase();
  const product = db.products.find((p) => p.id === req.params.id || p.slug === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  // Cleanup persistent remote images if not referenced elsewhere in the catalog
  if (product.images && Array.isArray(product.images)) {
    for (const img of product.images) {
      if (isDeletableMediaUrl(img)) {
        const isReferencedElsewhere = isImageReferencedInDb(db, img, product.id);
        if (!isReferencedElsewhere) {
          deletePersistentMedia(img).catch(() => {});
        }
      }
    }
  }

  db.products = db.products.filter((p) => p.id !== product.id);
  await saveDatabase(db);
  await logActivity(`Deleted product "${product.name}" (${product.sku})`);

  res.json({ success: true, id: req.params.id });
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
    heroImage: heroImage || '/uploads/bridal_couch_hero_1788951504284.jpg',
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

// POST /api/upload - Authenticated, validated server-side media upload
router.post(['/upload', '/upload-raw'], requireAdmin, async (req: Request, res: Response) => {
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

    let contentType = (req.headers['content-type'] as string) || 'image/jpeg';
    let fileBuffer: Buffer | null = null;

    // 1. Receive and parse the uploaded image
    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      fileBuffer = req.body;
    } else if (typeof req.body === 'string' && req.body.length > 0) {
      fileBuffer = Buffer.from(req.body);
    } else if (req.body && req.body.data) {
      const dataStr = req.body.data;
      if (typeof dataStr === 'string' && (dataStr.startsWith('http://') || dataStr.startsWith('https://'))) {
        return res.status(200).json({
          url: dataStr,
          fileName: cleanFilename,
          size: 0,
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

    // 4. Upload to persistent media storage (Cloudflare R2 primary, or safe local fallback)
    const result = await uploadPersistentMedia(
      fileBuffer,
      cleanFilename,
      validatedMime,
      safeFolder
    );

    const provider = getStorageProvider();
    await logActivity(`Uploaded media file [${provider}]: ${result.fileName}`);

    return res.status(200).json({
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      key: result.key,
      blob: { url: result.url }, // Backward-compatibility
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err?.message || 'Image upload failed.' });
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
    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json({ error: 'Target media URL or key is required for deletion.' });
    }

    const db = getDatabase();
    // Safety check: verify if the image is currently referenced in active catalog
    const isReferenced = isImageReferencedInDb(db, targetUrl);
    if (isReferenced) {
      return res.status(409).json({
        error: 'Cannot delete media: asset is currently referenced by products or site settings.',
      });
    }

    await deletePersistentMedia(targetUrl);
    const adminUser = (req as any).adminUser;
    await logActivity(`Deleted media asset: ${path.basename(targetUrl)}`, adminUser?.name);

    return res.status(200).json({ success: true, deleted: targetUrl });
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
  db.realBrides = db.realBrides.filter((b) => b.id !== req.params.id);
  await saveDatabase(db);
  await logActivity(`Deleted Real Bride feature with id "${req.params.id}"`);
  res.json({ success: true, id: req.params.id });
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
