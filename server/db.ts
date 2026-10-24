import fs from 'fs';
import path from 'path';
import { syncAllCode, ensureProductGallery, resolveProductIndex } from './codeSync.ts';

let bundledDbData: any = null;
try {
  const candidatePaths = [
    path.join(process.cwd(), 'data', 'db.json'),
    path.join('/tmp', 'db.json'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      bundledDbData = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    }
  }
} catch (err) {
  // Ignored if file cannot be read at initial load
}

export interface DBProductColor {
  name: string;
  hex: string;
}

export interface DBProductImageRecord {
  id: string; // Guaranteed stable unique ID: e.g. `${productId}__primary`, `${productId}__hover`, `${productId}__gallery_${index}`
  url: string;
  position: number;
  role: 'primary' | 'hover' | 'gallery';
  caption?: string;
  updatedAt?: string;
}

export interface DBProduct {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  priceUSD: number;
  compareAtPriceUSD?: number;
  category: 'bridal' | 'bridesmaids' | 'sets' | 'adire' | 'pyjamas' | 'accessories' | 'personalised' | 'junior' | 'new';
  style: 'Silk' | 'Tulle' | 'Lace' | 'Corset' | 'Embellished' | 'Custom';
  collectionName: string;
  description: string;
  details: string[];
  materials: string;
  sizingInfo: string;
  productionTime: string;
  shippingInfo: string;
  careInstructions: string;
  images: string[];
  imageGallery?: DBProductImageRecord[];
  colors: DBProductColor[];
  sizes: string[];
  reviewsCount: number;
  rating: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  crossSellIds: string[];
  badge?: string;
  setItems?: string[];
  status: 'published' | 'draft' | 'archived';
  stockQuantity: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'made_to_order';
  sku: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBCategory {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  heroImage: string;
  badge?: string;
  isVisible: boolean;
  order: number;
}

export interface DBOrder {
  orderId: string;
  date: string;
  status: 'Processing' | 'In Production' | 'Shipped' | 'Delivered';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    name: string;
    city: string;
    country: string;
    street: string;
  };
  items: {
    productName: string;
    color: string;
    size: string;
    quantity: number;
    priceFormatted: string;
    priceUSD: number;
  }[];
  totalFormatted: string;
  totalUSD: number;
  trackingNumber: string;
}

export interface DBAdmin {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Product Manager' | 'Content Manager';
  avatar: string;
  token: string;
}

export interface DBActivityLog {
  id: string;
  action: string;
  adminName: string;
  timestamp: string;
}

export interface DBSiteSettings {
  homeHeroImage?: string;
  heroImage?: string;
  homeHeroTitle?: string;
  homeHeroSubtitle?: string;
  announcement?: string;
  laidePortraitImage?: string;
  brandLogoImage?: string;
  brandWordmarkImage?: string;
  adminAvatarImage?: string;
  canonicalOverrides?: Record<string, string>;
  [key: string]: any;
}

export interface DBRealBride {
  id: string;
  brideName: string;
  location: string;
  weddingDate: string;
  category: string;
  robeWorn: string;
  image: string;
  quote: string;
  photographerCredit?: string;
  createdAt?: string;
}

export interface DatabaseSchema {
  version?: number;
  products: DBProduct[];
  categories: DBCategory[];
  orders: DBOrder[];
  admins: DBAdmin[];
  activityLogs: DBActivityLog[];
  settings?: DBSiteSettings;
  realBrides?: DBRealBride[];
}

// Atomic serialization queue for database updates to eliminate race conditions
let dbMutationQueue: Promise<any> = Promise.resolve();

/**
 * Executes a database mutating operation sequentially through the mutation queue.
 * Guarantees that concurrent uploads or updates cannot overwrite each other's changes.
 */
export function withDatabaseMutation<T>(operation: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    return await operation();
  };
  const result = dbMutationQueue.then(run, run);
  dbMutationQueue = result.then(() => {}, () => {});
  return result;
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const TMP_DB_PATH = path.join('/tmp', 'db.json');

let memoryDatabase: DatabaseSchema | null = null;
let isSyncingFromBlob = false;
let lastRemoteSyncTime = 0;
let lastDiskMtime = 0;
const REMOTE_SYNC_TTL_MS = 3000; // Re-read db.json from Blob at most every 3 seconds

/**
 * Sync persistent database from Vercel Blob when deployed on Vercel
 */
export async function syncDatabaseFromRemote(force = false): Promise<DatabaseSchema | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return memoryDatabase;
  const now = Date.now();
  if (!force && isSyncingFromBlob) return memoryDatabase;
  if (!force && memoryDatabase && (now - lastRemoteSyncTime < REMOTE_SYNC_TTL_MS)) {
    return memoryDatabase;
  }

  try {
    isSyncingFromBlob = true;
    const { list } = await import('@vercel/blob');
    const res = await list({
      prefix: 'database/db.json',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const blobItem = res.blobs.find((b) => b.pathname === 'database/db.json');
    if (blobItem && blobItem.url) {
      const response = await fetch(`${blobItem.url}?_t=${now}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && Array.isArray(remoteData.products) && remoteData.products.length > 0) {
          const localDb = getDatabase();
          const currentVersion = Math.max(Number(memoryDatabase?.version) || 0, Number(localDb?.version) || 0);
          const remoteVersion = Number(remoteData.version) || 0;

          // CRITICAL: Reject stale remote data. Never overwrite newer local state with older remote snapshot.
          if (remoteVersion <= currentVersion && currentVersion > 0) {
            console.warn(`[db-sync] Remote Vercel Blob database is not newer (remote v${remoteVersion} <= local v${currentVersion}). Ignoring remote snapshot.`);
            lastRemoteSyncTime = Date.now();
            return memoryDatabase || localDb;
          }

          memoryDatabase = remoteData;
          lastRemoteSyncTime = Date.now();
          // Keep local files authoritatively synchronized with remote update
          try {
            syncAllCode(remoteData);
            fs.writeFileSync(DB_PATH, JSON.stringify(remoteData, null, 2), 'utf8');
            lastDiskMtime = fs.statSync(DB_PATH).mtimeMs;
          } catch {}
          try {
            fs.writeFileSync(TMP_DB_PATH, JSON.stringify(remoteData, null, 2), 'utf8');
          } catch {}
          return memoryDatabase;
        }
      }
    }
  } catch (err) {
    console.warn('Could not sync remote database from Vercel Blob:', err);
  } finally {
    isSyncingFromBlob = false;
  }
  return memoryDatabase;
}

export async function getDatabaseAsync(force = false): Promise<DatabaseSchema> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const now = Date.now();
    if (force || !memoryDatabase || (now - lastRemoteSyncTime >= REMOTE_SYNC_TTL_MS)) {
      await syncDatabaseFromRemote(force);
    }
  }
  return getDatabase();
}

export function getDatabase(): DatabaseSchema {
  // 1. Primary: Check authoritative repo data/db.json on disk for changes
  try {
    if (fs.existsSync(DB_PATH)) {
      const stat = fs.statSync(DB_PATH);
      if (!memoryDatabase || stat.mtimeMs > lastDiskMtime) {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          const diskVersion = Number(parsed.version) || 0;
          const memVersion = Number(memoryDatabase?.version) || 0;
          if (!memoryDatabase || diskVersion >= memVersion) {
            memoryDatabase = parsed;
            lastDiskMtime = stat.mtimeMs;
            // Unify settings and siteSettings
            if (memoryDatabase.settings && !(memoryDatabase as any).siteSettings) {
              (memoryDatabase as any).siteSettings = memoryDatabase.settings;
            } else if ((memoryDatabase as any).siteSettings && !memoryDatabase.settings) {
              memoryDatabase.settings = (memoryDatabase as any).siteSettings;
            }
            try {
              fs.writeFileSync(TMP_DB_PATH, JSON.stringify(memoryDatabase, null, 2), 'utf8');
            } catch {}
            return memoryDatabase!;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error reading bundled database:', err);
  }

  if (memoryDatabase) {
    return memoryDatabase;
  }

  // 2. Secondary fallback: instance /tmp/db.json only if DB_PATH was absent or unreadable
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      const data = fs.readFileSync(TMP_DB_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        memoryDatabase = parsed;
        return memoryDatabase!;
      }
    }
  } catch {}

  // 3. Bundled compiled fallback only if no database file exists on disk
  if (!fs.existsSync(DB_PATH) && !fs.existsSync(TMP_DB_PATH)) {
    if (bundledDbData && Array.isArray((bundledDbData as any).products) && (bundledDbData as any).products.length > 0) {
      memoryDatabase = JSON.parse(JSON.stringify(bundledDbData));
      return memoryDatabase!;
    }
  }

  return {
    products: [],
    categories: [],
    orders: [],
    admins: [],
    activityLogs: [],
  };
}

export async function saveDatabase(data: DatabaseSchema): Promise<void> {
  // Monotonic version increment for optimistic concurrency tracking
  data.version = Math.max(Number(data.version) || 0, Number(memoryDatabase?.version) || 0) + 1;

  // Ensure settings and siteSettings are always unified so they never diverge
  if (data.settings && !(data as any).siteSettings) {
    (data as any).siteSettings = { ...data.settings };
  } else if ((data as any).siteSettings && !data.settings) {
    data.settings = { ...(data as any).siteSettings };
  } else if (data.settings && (data as any).siteSettings) {
    const unified = { ...(data as any).siteSettings, ...data.settings };
    data.settings = unified;
    (data as any).siteSettings = unified;
  }

  memoryDatabase = data;
  bundledDbData = JSON.parse(JSON.stringify(data));
  lastRemoteSyncTime = Date.now();

  // 1. Direct synchronization to source code files (src/data/products.ts, data/db.json, imageDefaults.ts, realBrides.ts)
  try {
    syncAllCode(data);
  } catch (syncErr) {
    console.warn('Could not sync to source code files:', syncErr);
  }

  // 2. Safe atomic local filesystem write: write to temp file then atomic rename
  const jsonStr = JSON.stringify(data, null, 2);
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpFile = path.join(dir, `.db.json.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`);
    fs.writeFileSync(tmpFile, jsonStr, 'utf8');
    fs.renameSync(tmpFile, DB_PATH);
    try {
      lastDiskMtime = fs.statSync(DB_PATH).mtimeMs;
    } catch {}
  } catch (err) {
    // Direct write fallback
    try {
      fs.writeFileSync(DB_PATH, jsonStr, 'utf8');
      try {
        lastDiskMtime = fs.statSync(DB_PATH).mtimeMs;
      } catch {}
    } catch {}
  }

  try {
    fs.writeFileSync(TMP_DB_PATH, jsonStr, 'utf8');
  } catch (tmpErr) {
    console.warn('Could not write to /tmp/db.json:', tmpErr);
  }

  // 3. Persistent remote storage on Vercel Blob (persists across restarts and redeployments)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import('@vercel/blob');
      await put('database/db.json', JSON.stringify(data, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (blobErr: any) {
      console.error('Failed to write database to Vercel Blob (database/db.json):', blobErr);
      throw new Error(`Failed to write database to Vercel Blob: ${blobErr?.message || blobErr}`);
    }
  }

  // 3. Persistent GitHub code commit when repository integration is configured
  try {
    const { getGitHubConfig, commitMultipleFilesToGitHub } = await import('./github.ts');
    const ghConfig = getGitHubConfig();
    if (ghConfig.isConfigured) {
      const { getUpdatedCodeFiles } = await import('./codeSync.ts');
      const filesToCommit = getUpdatedCodeFiles(data);
      if (filesToCommit.length > 0) {
        commitMultipleFilesToGitHub(
          filesToCommit,
          `chore(catalog): synchronize products and media directly to code files`
        ).catch((ghErr) => {
          console.warn('Background GitHub commit warning:', ghErr);
        });
      }
    }
  } catch {}
}

/**
 * Safely updates a product atomically inside the database mutation queue.
 * Guarantees that concurrent updates cannot overwrite unrelated products or create stale snapshots.
 */
export async function updateProductAtomically(
  productId: string,
  updater: (existing: DBProduct) => DBProduct | Promise<DBProduct>
): Promise<DBProduct> {
  return withDatabaseMutation(async () => {
    const db = getDatabase();
    const index = resolveProductIndex(db.products, productId);
    if (index === -1) {
      throw new Error(`Product not found with ID or slug "${productId}"`);
    }
    const existing = db.products[index];
    const updated = await updater(existing);
    // Unique ID is strictly immutable
    updated.id = existing.id;
    ensureProductGallery(updated);
    db.products[index] = updated;
    await saveDatabase(db);
    return updated;
  });
}

export async function logActivity(action: string, adminName: string = 'Admin'): Promise<void> {
  const db = getDatabase();
  const newLog: DBActivityLog = {
    id: `log-${Date.now()}`,
    action,
    adminName,
    timestamp: new Date().toISOString(),
  };
  db.activityLogs = [newLog, ...(db.activityLogs || [])].slice(0, 50);
  await saveDatabase(db);
}
