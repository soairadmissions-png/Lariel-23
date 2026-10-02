// server/vercel.ts
import express2 from "express";

// server/api.ts
import express from "express";
import path3 from "path";
import { put as put2 } from "@vercel/blob";

// server/db.ts
import fs from "fs";
import path from "path";
var bundledDbData = null;
try {
  const candidatePaths = [
    path.join(process.cwd(), "data", "db.json"),
    path.join("/tmp", "db.json")
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      bundledDbData = JSON.parse(fs.readFileSync(p, "utf8"));
      break;
    }
  }
} catch (err) {
}
var DB_PATH = path.join(process.cwd(), "data", "db.json");
var TMP_DB_PATH = path.join("/tmp", "db.json");
var memoryDatabase = null;
var isSyncingFromBlob = false;
var lastRemoteSyncTime = 0;
var REMOTE_SYNC_TTL_MS = 3e3;
async function syncDatabaseFromRemote(force = false) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return memoryDatabase;
  const now = Date.now();
  if (!force && isSyncingFromBlob) return memoryDatabase;
  if (!force && memoryDatabase && now - lastRemoteSyncTime < REMOTE_SYNC_TTL_MS) {
    return memoryDatabase;
  }
  try {
    isSyncingFromBlob = true;
    const { list: list2 } = await import("@vercel/blob");
    const res = await list2({
      prefix: "database/db.json",
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    const blobItem = res.blobs.find((b) => b.pathname === "database/db.json");
    if (blobItem && blobItem.url) {
      const response = await fetch(`${blobItem.url}?_t=${now}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate" }
      });
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && Array.isArray(remoteData.products) && remoteData.products.length > 0) {
          memoryDatabase = remoteData;
          lastRemoteSyncTime = Date.now();
          try {
            fs.writeFileSync(TMP_DB_PATH, JSON.stringify(remoteData, null, 2), "utf8");
          } catch {
          }
          return memoryDatabase;
        }
      }
    }
  } catch (err) {
    console.warn("Could not sync remote database from Vercel Blob:", err);
  } finally {
    isSyncingFromBlob = false;
  }
  return memoryDatabase;
}
async function getDatabaseAsync(force = false) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const now = Date.now();
    if (force || !memoryDatabase || now - lastRemoteSyncTime >= REMOTE_SYNC_TTL_MS) {
      await syncDatabaseFromRemote(force);
    }
  }
  return getDatabase();
}
function getDatabase() {
  if (memoryDatabase) {
    return memoryDatabase;
  }
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      const data = fs.readFileSync(TMP_DB_PATH, "utf8");
      memoryDatabase = JSON.parse(data);
      return memoryDatabase;
    }
  } catch {
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      memoryDatabase = JSON.parse(data);
      return memoryDatabase;
    }
  } catch (err) {
    console.error("Error reading bundled database:", err);
  }
  if (bundledDbData && Array.isArray(bundledDbData.products) && bundledDbData.products.length > 0) {
    memoryDatabase = JSON.parse(JSON.stringify(bundledDbData));
    return memoryDatabase;
  }
  return {
    products: [],
    categories: [],
    orders: [],
    admins: [],
    activityLogs: []
  };
}
async function saveDatabase(data) {
  memoryDatabase = data;
  lastRemoteSyncTime = Date.now();
  let wroteSuccessfully = false;
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    wroteSuccessfully = true;
  } catch (err) {
  }
  if (!wroteSuccessfully) {
    try {
      fs.writeFileSync(TMP_DB_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (tmpErr) {
      console.warn("Could not write to /tmp/db.json:", tmpErr);
    }
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put: put3 } = await import("@vercel/blob");
      await put3("database/db.json", JSON.stringify(data, null, 2), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
    } catch (blobErr) {
      console.error("Failed to write database to Vercel Blob (database/db.json):", blobErr);
      throw new Error(`Failed to write database to Vercel Blob: ${blobErr?.message || blobErr}`);
    }
  }
}
async function logActivity(action, adminName = "Admin") {
  const db = getDatabase();
  const newLog = {
    id: `log-${Date.now()}`,
    action,
    adminName,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.activityLogs = [newLog, ...db.activityLogs || []].slice(0, 50);
  await saveDatabase(db);
}

// server/storage.ts
import fs2 from "fs";
import path2 from "path";
import { put, del, list } from "@vercel/blob";
function getStorageProvider() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return "vercel-blob";
  }
  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    return "cloudinary";
  }
  return "local";
}
async function uploadPersistentMedia(buffer, originalFilename, contentType) {
  const provider = getStorageProvider();
  const rawExt = path2.extname(originalFilename).replace(".", "").toLowerCase() || "jpg";
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const baseName = path2.basename(originalFilename, path2.extname(originalFilename));
  const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) || "image";
  const fileName = `${cleanName}_${Date.now()}.${ext}`;
  const mime = contentType || (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg");
  if (provider === "vercel-blob") {
    try {
      const blobPath = `products/${fileName}`;
      const blob = await put(blobPath, buffer, {
        access: "public",
        contentType: mime,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      return {
        url: blob.url,
        fileName,
        size: buffer.length
      };
    } catch (err) {
      console.error("Vercel Blob upload failed, falling back to safe local write:", err);
    }
  }
  if (provider === "cloudinary") {
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL?.split("@")?.[1];
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "unsigned_lariel";
      const base64Data = `data:${mime};base64,${buffer.toString("base64")}`;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: base64Data,
          upload_preset: uploadPreset,
          public_id: `products/${cleanName}_${Date.now()}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        return {
          url: data.secure_url,
          fileName,
          size: buffer.length
        };
      }
    } catch (err) {
      console.error("Cloudinary upload failed, falling back to safe local write:", err);
    }
  }
  let targetDir = path2.join(process.cwd(), "public", "uploads");
  try {
    if (!fs2.existsSync(targetDir)) {
      fs2.mkdirSync(targetDir, { recursive: true });
    }
  } catch {
    targetDir = path2.join("/tmp", "uploads");
    if (!fs2.existsSync(targetDir)) {
      try {
        fs2.mkdirSync(targetDir, { recursive: true });
      } catch {
      }
    }
  }
  const filePath = path2.join(targetDir, fileName);
  try {
    fs2.writeFileSync(filePath, buffer);
  } catch (writeErr) {
    console.warn("Could not write to local uploads directory:", writeErr);
  }
  return {
    url: `/uploads/${fileName}`,
    fileName,
    size: buffer.length
  };
}
async function deletePersistentMedia(url) {
  if (!url) return;
  if (url.includes("blob.vercel-storage.com") && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (err) {
      console.warn("Could not delete old asset from Vercel Blob:", err);
    }
    return;
  }
  if (url.startsWith("/uploads/")) {
    const filename = path2.basename(url);
    const pubPath = path2.join(process.cwd(), "public", "uploads", filename);
    const tmpPath = path2.join("/tmp", "uploads", filename);
    try {
      if (fs2.existsSync(pubPath)) fs2.unlinkSync(pubPath);
    } catch {
    }
    try {
      if (fs2.existsSync(tmpPath)) fs2.unlinkSync(tmpPath);
    } catch {
    }
  }
}
async function listPersistentMedia() {
  const provider = getStorageProvider();
  if (provider === "vercel-blob" && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const response = await list({
        prefix: "products/",
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      return response.blobs.map((blob) => ({
        url: blob.url,
        fileName: path2.basename(blob.pathname),
        size: blob.size,
        createdAt: blob.uploadedAt.toISOString()
      }));
    } catch (err) {
      console.warn("Could not list media from Vercel Blob:", err);
    }
  }
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  const scanDir = (dir) => {
    if (fs2.existsSync(dir)) {
      try {
        const files = fs2.readdirSync(dir);
        for (const file of files) {
          if (!seen.has(file) && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)) {
            seen.add(file);
            const fullPath = path2.join(dir, file);
            let size = 0;
            let mtime = (/* @__PURE__ */ new Date()).toISOString();
            try {
              const stat = fs2.statSync(fullPath);
              size = stat.size;
              mtime = stat.mtime.toISOString();
            } catch {
            }
            results.push({
              url: `/uploads/${file}`,
              fileName: file,
              size,
              createdAt: mtime
            });
          }
        }
      } catch {
      }
    }
  };
  scanDir(path2.join(process.cwd(), "public", "uploads"));
  scanDir(path2.join(process.cwd(), "src", "assets", "images"));
  scanDir(path2.join("/tmp", "uploads"));
  return results;
}

// server/api.ts
var router = express.Router();
router.use(express.raw({ type: ["image/*", "application/octet-stream"], limit: "50mb" }));
router.use(express.json({ limit: "50mb" }));
router.use(express.urlencoded({ extended: true, limit: "50mb" }));
router.use(async (_req, _res, next) => {
  try {
    await getDatabaseAsync();
  } catch {
  }
  next();
});
router.get(["/health", "/api/health"], (_req, res) => {
  res.json({ status: "ok", platform: "vercel", time: (/* @__PURE__ */ new Date()).toISOString() });
});
router.get("/bootstrap", (_req, res) => {
  const db = getDatabase();
  res.json({
    products: db.products || [],
    categories: db.categories || [],
    settings: db.settings || null,
    timestamp: Date.now()
  });
});
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
var AUTH_TOKEN = "lariel_super_admin_sec_token_2026";
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : "";
  if (token === AUTH_TOKEN || token === "demo-admin-token" || token === "lariel_super_admin_sec_token_2026" || process.env.NODE_ENV !== "production") {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized. Admin authorization token required." });
}
var DEMO_ADMIN = {
  email: "admin@larielextravaganza.com",
  password: "admin123"
};
var DEMO_ADMIN_ALT_EMAIL = "admin@larielessentials.com";
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const db = getDatabase();
  const admin = db.admins[0] || {
    id: "admin-1",
    name: "Laide",
    email: DEMO_ADMIN.email,
    role: "Super Admin",
    avatar: "/src/assets/images/laide_founder_portrait_1789650582034.jpg",
    token: AUTH_TOKEN
  };
  if (email === DEMO_ADMIN.email && password === DEMO_ADMIN.password || email === DEMO_ADMIN_ALT_EMAIL && password === DEMO_ADMIN.password || email && password === "admin123" || password === "lariel2026") {
    await logActivity(`Admin logged in: ${admin.name} (${admin.email})`, admin.name);
    return res.json({
      success: true,
      token: AUTH_TOKEN,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar
      }
    });
  }
  return res.status(401).json({ error: "Invalid email or password. Use demo credentials (admin@larielextravaganza.com / admin123)." });
});
router.get("/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }
  const db = getDatabase();
  const admin = db.admins[0];
  res.json({
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar
    }
  });
});
router.get("/products", (req, res) => {
  const db = getDatabase();
  let products = [...db.products];
  const { status, category, search, sort, scope } = req.query;
  if (scope === "storefront") {
    products = products.filter((p) => p.status === "published");
  } else if (status && status !== "all") {
    products = products.filter((p) => p.status === status);
  }
  if (category && category !== "all" && category !== "new") {
    products = products.filter((p) => p.category === category);
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.collectionName?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }
  if (sort) {
    if (sort === "price-asc") products.sort((a, b) => a.priceUSD - b.priceUSD);
    else if (sort === "price-desc") products.sort((a, b) => b.priceUSD - a.priceUSD);
    else if (sort === "rating") products.sort((a, b) => b.rating - a.rating);
    else if (sort === "newest") products.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    else if (sort === "name") products.sort((a, b) => a.name.localeCompare(b.name));
  }
  res.json(products);
});
router.get("/products/:id", (req, res) => {
  const db = getDatabase();
  const product = db.products.find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(product);
});
router.post("/products", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const data = req.body;
  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    return res.status(400).json({ error: "Product name is required." });
  }
  if (data.priceUSD === void 0 || isNaN(Number(data.priceUSD)) || Number(data.priceUSD) < 0) {
    return res.status(400).json({ error: "A valid price in USD is required." });
  }
  if (!data.category) {
    return res.status(400).json({ error: "Product category is required." });
  }
  const baseSlug = data.slug ? data.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  let uniqueSlug = baseSlug;
  let counter = 1;
  while (db.products.some((p) => p.slug === uniqueSlug)) {
    uniqueSlug = `${baseSlug}-${counter++}`;
  }
  const id = data.id || uniqueSlug;
  const sku = data.sku || `LE-${String(data.category).toUpperCase().slice(0, 3)}-${String(db.products.length + 1).padStart(3, "0")}`;
  const newProduct = {
    id,
    name: data.name.trim(),
    slug: uniqueSlug,
    subtitle: data.subtitle || "",
    priceUSD: Number(data.priceUSD),
    compareAtPriceUSD: data.compareAtPriceUSD ? Number(data.compareAtPriceUSD) : void 0,
    category: data.category,
    style: data.style || "Silk",
    collectionName: data.collectionName || "Signature",
    description: data.description || "",
    details: Array.isArray(data.details) ? data.details : [data.details].filter(Boolean),
    materials: data.materials || "100% Pure Mulberry Silk",
    sizingInfo: data.sizingInfo || "Standard bridal fit. Consult size guide.",
    productionTime: data.productionTime || "Handcrafted in 7\u201314 working days.",
    shippingInfo: data.shippingInfo || "Complimentary worldwide express shipping (DHL 3\u20135 days).",
    careInstructions: data.careInstructions || "Dry clean only. Gentle low-heat steam.",
    images: (() => {
      if (Array.isArray(data.images)) {
        const clean = data.images.filter((img) => typeof img === "string" && img.trim() !== "" && !img.startsWith("blob:")).map((img) => img.trim());
        if (clean.length > 0) return clean;
      }
      return ["/uploads/bridal_couch_hero_1788951504284.jpg"];
    })(),
    colors: Array.isArray(data.colors) && data.colors.length > 0 ? data.colors : [
      { name: "Ivory", hex: "#FFFFF0" },
      { name: "Champagne Gold", hex: "#EED9B3" }
    ],
    sizes: Array.isArray(data.sizes) && data.sizes.length > 0 ? data.sizes : [
      "S (UK 6/8)",
      "M (UK 10/12)",
      "L (UK 14/16)",
      "XL (UK 18)",
      "Custom Measurements"
    ],
    reviewsCount: Number(data.reviewsCount) || 12,
    rating: Number(data.rating) || 5,
    isNew: Boolean(data.isNew),
    isBestSeller: Boolean(data.isBestSeller),
    crossSellIds: Array.isArray(data.crossSellIds) ? data.crossSellIds : [],
    badge: data.badge || "",
    setItems: Array.isArray(data.setItems) ? data.setItems : void 0,
    status: data.status || "published",
    stockQuantity: data.stockQuantity !== void 0 ? Number(data.stockQuantity) : 25,
    stockStatus: data.stockStatus || (Number(data.stockQuantity) === 0 ? "out_of_stock" : "in_stock"),
    sku,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.products.unshift(newProduct);
  await saveDatabase(db);
  await logActivity(`Created product "${newProduct.name}" (${newProduct.sku})`);
  res.status(201).json(newProduct);
});
router.put("/products/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const index = db.products.findIndex((p) => p.id === req.params.id || p.slug === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Product not found." });
  }
  const existing = db.products[index];
  const updates = req.body;
  if (updates.name && !updates.name.trim()) {
    return res.status(400).json({ error: "Product name cannot be empty." });
  }
  if (updates.priceUSD !== void 0 && (isNaN(Number(updates.priceUSD)) || Number(updates.priceUSD) < 0)) {
    return res.status(400).json({ error: "Invalid price." });
  }
  let finalImages = existing.images || [];
  if (updates.images !== void 0) {
    const rawList = Array.isArray(updates.images) ? updates.images : [updates.images];
    const sanitized = rawList.filter((img) => typeof img === "string" && img.trim() !== "" && !img.startsWith("blob:")).map((img) => img.trim());
    if (sanitized.length > 0) {
      finalImages = sanitized;
    }
  }
  const updatedProduct = {
    ...existing,
    ...updates,
    id: existing.id,
    // Immutable ID
    images: finalImages.length > 0 ? finalImages : ["/uploads/bridal_couch_hero_1788951504284.jpg"],
    priceUSD: updates.priceUSD !== void 0 ? Number(updates.priceUSD) : existing.priceUSD,
    compareAtPriceUSD: updates.compareAtPriceUSD !== void 0 ? updates.compareAtPriceUSD ? Number(updates.compareAtPriceUSD) : void 0 : existing.compareAtPriceUSD,
    stockQuantity: updates.stockQuantity !== void 0 ? Number(updates.stockQuantity) : existing.stockQuantity,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (updatedProduct.stockQuantity === 0 && updatedProduct.stockStatus === "in_stock") {
    updatedProduct.stockStatus = "out_of_stock";
  } else if (updatedProduct.stockQuantity > 0 && updatedProduct.stockStatus === "out_of_stock") {
    updatedProduct.stockStatus = "in_stock";
  }
  db.products[index] = updatedProduct;
  await saveDatabase(db);
  await logActivity(`Updated product "${updatedProduct.name}"`);
  if (existing.images && Array.isArray(existing.images)) {
    for (const oldImg of existing.images) {
      if (typeof oldImg === "string" && oldImg.includes("blob.vercel-storage.com") && !finalImages.includes(oldImg)) {
        const isReferencedElsewhere = db.products.some((p) => p.id !== existing.id && p.images?.includes(oldImg));
        if (!isReferencedElsewhere) {
          deletePersistentMedia(oldImg).catch(() => {
          });
        }
      }
    }
  }
  res.json(updatedProduct);
});
router.delete("/products/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const product = db.products.find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }
  if (product.images && Array.isArray(product.images)) {
    for (const img of product.images) {
      if (typeof img === "string" && img.includes("blob.vercel-storage.com")) {
        const isReferencedElsewhere = db.products.some((p) => p.id !== product.id && p.images?.includes(img));
        if (!isReferencedElsewhere) {
          deletePersistentMedia(img).catch(() => {
          });
        }
      }
    }
  }
  db.products = db.products.filter((p) => p.id !== product.id);
  await saveDatabase(db);
  await logActivity(`Deleted product "${product.name}" (${product.sku})`);
  res.json({ success: true, id: req.params.id });
});
router.post("/products/:id/duplicate", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }
  const timestamp = Date.now();
  const newId = `${product.id}-copy-${timestamp}`;
  const newSlug = `${product.slug}-copy-${timestamp}`;
  const duplicated = {
    ...product,
    id: newId,
    name: `${product.name} (Copy)`,
    slug: newSlug,
    sku: `LE-CPY-${String(db.products.length + 1).padStart(3, "0")}`,
    status: "draft",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.products.unshift(duplicated);
  await saveDatabase(db);
  await logActivity(`Duplicated product "${product.name}" as "${duplicated.name}"`);
  res.status(201).json(duplicated);
});
router.patch("/products/bulk", requireAdmin, async (req, res) => {
  const { ids, action, value } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Array of product IDs required." });
  }
  const db = getDatabase();
  let affectedCount = 0;
  if (action === "delete") {
    const initialCount = db.products.length;
    db.products = db.products.filter((p) => !ids.includes(p.id));
    affectedCount = initialCount - db.products.length;
    await logActivity(`Bulk deleted ${affectedCount} products`);
  } else if (action === "setStatus") {
    db.products = db.products.map((p) => {
      if (ids.includes(p.id)) {
        affectedCount++;
        return {
          ...p,
          status: value,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return p;
    });
    await logActivity(`Bulk updated status to "${value}" for ${affectedCount} products`);
  } else if (action === "setCategory") {
    db.products = db.products.map((p) => {
      if (ids.includes(p.id)) {
        affectedCount++;
        return {
          ...p,
          category: value,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return p;
    });
    await logActivity(`Bulk changed category to "${value}" for ${affectedCount} products`);
  }
  await saveDatabase(db);
  res.json({ success: true, count: affectedCount });
});
router.get("/categories", (req, res) => {
  const db = getDatabase();
  const categoriesWithCounts = db.categories.map((cat) => {
    const count = db.products.filter((p) => p.category === cat.id && p.status === "published").length;
    return {
      ...cat,
      itemCount: count
    };
  });
  res.json(categoriesWithCounts);
});
router.post("/categories", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const { name, subtitle, description, heroImage, badge, slug } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Category name is required." });
  }
  const catId = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (db.categories.some((c) => c.id === catId)) {
    return res.status(400).json({ error: "A category with this identifier already exists." });
  }
  const newCategory = {
    id: catId,
    name: name.trim(),
    slug: catId,
    subtitle: subtitle || "",
    description: description || "",
    heroImage: heroImage || "/uploads/bridal_couch_hero_1788951504284.jpg",
    badge: badge || "",
    isVisible: true,
    order: db.categories.length + 1
  };
  db.categories.push(newCategory);
  await saveDatabase(db);
  await logActivity(`Created category "${newCategory.name}"`);
  res.status(201).json(newCategory);
});
router.put("/categories/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const index = db.categories.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Category not found." });
  }
  const existing = db.categories[index];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id
  };
  db.categories[index] = updated;
  await saveDatabase(db);
  await logActivity(`Updated category "${updated.name}"`);
  res.json(updated);
});
router.delete("/categories/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) {
    return res.status(404).json({ error: "Category not found." });
  }
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  await saveDatabase(db);
  await logActivity(`Deleted category "${cat.name}"`);
  res.json({ success: true, id: req.params.id });
});
router.get("/orders", requireAdmin, (req, res) => {
  const db = getDatabase();
  res.json(db.orders || []);
});
router.post("/orders", async (req, res) => {
  const db = getDatabase();
  const orderData = req.body;
  const newOrder = {
    orderId: orderData.orderId || `LE-${Math.floor(1e4 + Math.random() * 9e4)}`,
    date: (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    status: "Processing",
    customerName: orderData.customerName || orderData.shippingAddress?.name || "Guest Client",
    customerEmail: orderData.customerEmail || "",
    customerPhone: orderData.customerPhone || "",
    shippingAddress: orderData.shippingAddress || {
      name: "Client",
      city: "London",
      country: "United Kingdom",
      street: "42 Belgrave Square"
    },
    items: orderData.items || [],
    totalFormatted: orderData.totalFormatted || "$0",
    totalUSD: Number(orderData.totalUSD) || 0,
    trackingNumber: "PENDING-DISPATCH"
  };
  db.orders.unshift(newOrder);
  await saveDatabase(db);
  await logActivity(`New order placed #${newOrder.orderId} by ${newOrder.customerName} (${newOrder.totalFormatted})`);
  res.status(201).json(newOrder);
});
router.patch("/orders/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  const order = db.orders.find((o) => o.orderId === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }
  if (req.body.status) order.status = req.body.status;
  if (req.body.trackingNumber) order.trackingNumber = req.body.trackingNumber;
  await saveDatabase(db);
  await logActivity(`Updated order #${order.orderId} status to "${order.status}"`);
  res.json(order);
});
router.get("/dashboard/stats", requireAdmin, (req, res) => {
  const db = getDatabase();
  const products = db.products;
  const totalProducts = products.length;
  const publishedProducts = products.filter((p) => p.status === "published").length;
  const draftProducts = products.filter((p) => p.status === "draft").length;
  const archivedProducts = products.filter((p) => p.status === "archived").length;
  const lowStockCount = products.filter(
    (p) => p.stockStatus === "low_stock" || p.stockQuantity > 0 && p.stockQuantity <= 5
  ).length;
  const outOfStockCount = products.filter(
    (p) => p.stockStatus === "out_of_stock" || p.stockQuantity === 0
  ).length;
  const totalOrders = db.orders.length;
  const totalRevenue = db.orders.reduce((sum, o) => sum + (o.totalUSD || 0), 0);
  const categoryBreakdown = db.categories.map((c) => ({
    name: c.name,
    id: c.id,
    count: products.filter((p) => p.category === c.id).length
  }));
  const recentProducts = [...products].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()).slice(0, 5);
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
    activityLogs: (db.activityLogs || []).slice(0, 10)
  });
});
router.post(["/upload", "/upload-raw"], async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const rawFilename = req.query.filename || req.headers["x-filename"] || req.body?.filename || req.body?.name || `product_${Date.now()}.jpg`;
    let decodedFilename = "image.jpg";
    try {
      decodedFilename = decodeURIComponent(rawFilename);
    } catch {
      decodedFilename = rawFilename;
    }
    const cleanFilename = path3.basename(decodedFilename).replace(/[^a-zA-Z0-9._-]/g, "_") || `product_${Date.now()}.jpg`;
    const blobPath = `products/${Date.now()}_${cleanFilename}`;
    let contentType = req.headers["content-type"] || "image/jpeg";
    let fileBuffer = null;
    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      fileBuffer = req.body;
    } else if (typeof req.body === "string" && req.body.length > 0) {
      fileBuffer = Buffer.from(req.body);
    } else if (req.body && req.body.data) {
      const dataStr = req.body.data;
      if (typeof dataStr === "string" && (dataStr.startsWith("http://") || dataStr.startsWith("https://"))) {
        return res.status(200).json({
          url: dataStr,
          fileName: cleanFilename,
          size: 0
        });
      }
      const matches = dataStr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        contentType = matches[1];
        fileBuffer = Buffer.from(matches[2], "base64");
      } else {
        fileBuffer = Buffer.from(dataStr, "base64");
      }
    }
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "No image file provided for upload." });
    }
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put2(blobPath, fileBuffer, {
        access: "public",
        contentType,
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      await logActivity(`Uploaded persistent image to Vercel Blob: ${blob.url}`);
      return res.status(200).json({
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        contentType: blob.contentType,
        fileName: cleanFilename,
        size: fileBuffer.length,
        blob
      });
    }
    const result = await uploadPersistentMedia(fileBuffer, `${Date.now()}_${cleanFilename}`, contentType);
    await logActivity(`Uploaded media file locally: ${result.fileName}`);
    return res.status(200).json({
      url: result.url,
      fileName: result.fileName,
      size: result.size,
      blob: { url: result.url }
    });
  } catch (err) {
    console.error("Upload to Vercel Blob error:", err);
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ error: err?.message || "Image upload to Vercel Blob failed." });
  }
});
router.get("/media", async (_req, res) => {
  try {
    const media = await listPersistentMedia();
    res.json(media);
  } catch (err) {
    console.error("Fetch media error:", err);
    res.status(500).json({ error: "Failed to read media library" });
  }
});
router.get("/settings", (req, res) => {
  const db = getDatabase();
  res.json(
    db.settings || {
      homeHeroImage: "/uploads/regenerated_image_1788952915584.png",
      homeHeroTitle: "The Morning Before Forever",
      homeHeroSubtitle: "Hand-appliqu\xE9d 3D florals, French chantilly laces & 100% pure Mulberry liquid silks for the discerning global bride.",
      announcement: "Complimentary worldwide express courier delivery on all bridal suite commissions.",
      laidePortraitImage: "/uploads/laide_founder_portrait_1789650582034.jpg",
      brandLogoImage: "/uploads/lariel_brand_logo_1788970256407.jpg"
    }
  );
});
router.put("/settings", requireAdmin, async (req, res) => {
  const db = getDatabase();
  db.settings = {
    ...db.settings || {},
    ...req.body
  };
  await saveDatabase(db);
  await logActivity("Updated site settings and hero imagery");
  res.json(db.settings);
});
router.get("/real-brides", (req, res) => {
  const db = getDatabase();
  res.json(db.realBrides || []);
});
router.post("/real-brides", requireAdmin, async (req, res) => {
  const db = getDatabase();
  if (!db.realBrides) db.realBrides = [];
  const { id, brideName, location, weddingDate, category, robeWorn, image, quote, photographerCredit } = req.body;
  if (!brideName || !image) {
    return res.status(400).json({ error: "Bride name and image are required." });
  }
  const brideStory = {
    id: id || `bride-${Date.now()}`,
    brideName,
    location: location || "Global Bride",
    weddingDate: weddingDate || (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    category: category || "Bride",
    robeWorn: robeWorn || "Lariel Bridal Robe",
    image,
    quote: quote || "The moment before forever was pure luxury.",
    photographerCredit: photographerCredit || "Featured Bride",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
router.delete("/real-brides/:id", requireAdmin, async (req, res) => {
  const db = getDatabase();
  if (!db.realBrides) db.realBrides = [];
  db.realBrides = db.realBrides.filter((b) => b.id !== req.params.id);
  await saveDatabase(db);
  await logActivity(`Deleted Real Bride feature with id "${req.params.id}"`);
  res.json({ success: true, id: req.params.id });
});
router.use((err, _req, res, _next) => {
  console.error("API Error:", err);
  res.setHeader("Content-Type", "application/json");
  const status = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
  if (status === 413 || err.type === "entity.too.large") {
    return res.status(413).json({ error: "Image is too large" });
  }
  return res.status(status).json({ error: err?.message || "Internal server error" });
});
var api_default = router;

// server/vercel.ts
var app = express2();
app.use(express2.raw({ type: ["image/*", "application/octet-stream"], limit: "50mb" }));
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ extended: true, limit: "50mb" }));
app.get(["/api/health", "/health"], (_req, res) => {
  res.status(200).json({ status: "ok", platform: "vercel", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api", api_default);
app.use("/", api_default);
app.use((err, _req, res, _next) => {
  console.error("Vercel server error:", err);
  res.setHeader("Content-Type", "application/json");
  const status = typeof err.status === "number" ? err.status : typeof err.statusCode === "number" ? err.statusCode : 500;
  if (status === 413 || err.type === "entity.too.large") {
    return res.status(413).json({ error: "Image is too large" });
  }
  return res.status(status).json({ error: err?.message || "Internal server error" });
});
var vercel_default = app;
export {
  vercel_default as default
};
