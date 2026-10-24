import fs from 'fs';
import path from 'path';
import { getDatabase, saveDatabase, type DatabaseSchema } from './db.ts';
import { getGitHubConfig, commitFileToGitHub, commitMultipleFilesToGitHub, generateSafeUniqueFilename } from './github.ts';
import { validateImageBuffer } from './r2.ts';
import { syncAllCode } from './codeSync.ts';

export interface MigrationItem {
  id: string;
  type: 'product' | 'category' | 'setting' | 'real-bride' | 'journal';
  targetId: string;
  imageIndex?: number;
  originalUrl: string;
  migratedUrl?: string;
  fileName?: string;
  size?: number;
  status: 'PENDING' | 'MIGRATED' | 'FAILED' | 'SKIPPED';
  githubCommitted?: boolean;
  githubSha?: string;
  error?: string;
}

export interface MigrationReport {
  timestamp: string;
  dryRun: boolean;
  totalFound: number;
  migratedCount: number;
  failedCount: number;
  skippedCount: number;
  githubConfigured: boolean;
  items: MigrationItem[];
}

/**
 * Scan database for any images hosted on Vercel Blob or external legacy storage
 */
export function scanForVercelBlobs(db: DatabaseSchema): MigrationItem[] {
  const items: MigrationItem[] = [];

  const isMigratableUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim().toLowerCase();
    return clean.includes('blob.vercel-storage.com') ||
      clean.includes('.vercel-storage.com') ||
      (clean.startsWith('http') && !clean.includes('larielextravaganza.com') && !clean.includes('localhost') && !clean.includes('127.0.0.1'));
  };

  // 1. Products
  if (Array.isArray(db.products)) {
    for (const p of db.products) {
      if (Array.isArray(p.images)) {
        p.images.forEach((img, idx) => {
          if (isMigratableUrl(img)) {
            items.push({
              id: `product-${p.id}-${idx}`,
              type: 'product',
              targetId: p.id,
              imageIndex: idx,
              originalUrl: img,
              status: 'PENDING',
            });
          }
        });
      }
    }
  }

  // 2. Categories
  if (Array.isArray(db.categories)) {
    for (const c of db.categories) {
      if (c.heroImage && isMigratableUrl(c.heroImage)) {
        items.push({
          id: `category-${c.id}`,
          type: 'category',
          targetId: c.id,
          originalUrl: c.heroImage,
          status: 'PENDING',
        });
      }
    }
  }

  // 3. Settings
  if (db.settings) {
    const s = db.settings;
    if (s.homeHeroImage && isMigratableUrl(s.homeHeroImage)) {
      items.push({
        id: 'setting-homeHeroImage',
        type: 'setting',
        targetId: 'homeHeroImage',
        originalUrl: s.homeHeroImage,
        status: 'PENDING',
      });
    }
    if (s.laidePortraitImage && isMigratableUrl(s.laidePortraitImage)) {
      items.push({
        id: 'setting-laidePortraitImage',
        type: 'setting',
        targetId: 'laidePortraitImage',
        originalUrl: s.laidePortraitImage,
        status: 'PENDING',
      });
    }
    if (s.brandLogoImage && isMigratableUrl(s.brandLogoImage)) {
      items.push({
        id: 'setting-brandLogoImage',
        type: 'setting',
        targetId: 'brandLogoImage',
        originalUrl: s.brandLogoImage,
        status: 'PENDING',
      });
    }
  }

  // 4. Real Brides
  if (Array.isArray(db.realBrides)) {
    for (const b of db.realBrides) {
      if (b.image && isMigratableUrl(b.image)) {
        items.push({
          id: `real-bride-${b.id}`,
          type: 'real-bride',
          targetId: b.id,
          originalUrl: b.image,
          status: 'PENDING',
        });
      }
    }
  }

  return items;
}

/**
 * Execute migration of Vercel Blob images to local public/uploads/ and GitHub repository.
 */
export async function migrateVercelBlobsToGitHub(options: {
  dryRun?: boolean;
}): Promise<MigrationReport> {
  const dryRun = Boolean(options.dryRun);
  const db = getDatabase();
  const items = scanForVercelBlobs(db);
  const githubConfig = getGitHubConfig();

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    dryRun,
    totalFound: items.length,
    migratedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    githubConfigured: githubConfig.isConfigured,
    items,
  };

  if (items.length === 0) {
    console.log('No legacy Vercel Blob or external URLs found needing migration.');
    return report;
  }

  const uploadDirs = [
    path.join(process.cwd(), 'public', 'uploads'),
  ];

  for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  let dbModified = false;

  for (const item of items) {
    if (dryRun) {
      item.status = 'SKIPPED';
      report.skippedCount++;
      continue;
    }

    try {
      // 1. Download image from original Vercel Blob URL
      const response = await fetch(item.originalUrl, {
        headers: { 'User-Agent': 'Lariel-Migration-Tool/1.0' },
      });

      if (!response.ok) {
        throw new Error(`Failed to download image (HTTP ${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 2. Validate image buffer
      const validation = validateImageBuffer(buffer);
      if (!validation.valid) {
        throw new Error(`Image validation failed: ${validation.error}`);
      }

      // 3. Generate safe unique filename
      let originalName = 'migrated_image.jpg';
      try {
        const u = new URL(item.originalUrl);
        originalName = path.basename(u.pathname) || 'migrated_image.jpg';
      } catch {}

      const fileName = generateSafeUniqueFilename(originalName, validation.detectedExt || 'jpg');
      item.fileName = fileName;
      item.size = buffer.length;

      // 4. Save to local disk directories
      for (const dir of uploadDirs) {
        try {
          fs.writeFileSync(path.join(dir, fileName), buffer);
        } catch {}
      }

      const localUrl = `/uploads/${fileName}`;
      item.migratedUrl = localUrl;

      // 5. Commit actual binary file to GitHub if configured
      if (githubConfig.isConfigured) {
        const repoPath = `public/uploads/${fileName}`;
        const commitRes = await commitFileToGitHub({
          repoPath,
          buffer,
          message: `chore(migration): migrate ${fileName} from Vercel Blob [skip ci]`,
          config: githubConfig,
        });

        if (commitRes.success) {
          item.githubCommitted = true;
          item.githubSha = commitRes.sha;
        } else {
          item.githubCommitted = false;
          item.error = `Saved locally, but GitHub commit failed: ${commitRes.error}`;
        }
      }

      // 6. Update database reference
      if (item.type === 'product') {
        const prod = db.products.find((p) => p.id === item.targetId);
        if (prod && Array.isArray(prod.images) && item.imageIndex !== undefined) {
          prod.images[item.imageIndex] = localUrl;
          dbModified = true;
        }
      } else if (item.type === 'category') {
        const cat = db.categories.find((c) => c.id === item.targetId);
        if (cat) {
          cat.heroImage = localUrl;
          dbModified = true;
        }
      } else if (item.type === 'setting') {
        if (db.settings) {
          (db.settings as any)[item.targetId] = localUrl;
          dbModified = true;
        }
      } else if (item.type === 'real-bride') {
        const bride = db.realBrides?.find((b) => b.id === item.targetId);
        if (bride) {
          bride.image = localUrl;
          dbModified = true;
        }
      }

      item.status = 'MIGRATED';
      report.migratedCount++;
    } catch (err: any) {
      item.status = 'FAILED';
      item.error = err.message || String(err);
      report.failedCount++;
    }
  }

  // Save updated database and sync code files
  if (dbModified && !dryRun) {
    await saveDatabase(db);
    syncAllCode(db);

    // Commit updated database state to GitHub if configured
    if (githubConfig.isConfigured) {
      try {
        const filesToSync = [
          { path: 'data/db.json', content: JSON.stringify(db, null, 2) },
          { path: 'src/data/products.ts', content: fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'products.ts'), 'utf8') },
        ];
        await commitMultipleFilesToGitHub(filesToSync, 'chore(migration): sync database state after blob migration');
      } catch (syncErr) {
        console.warn('Could not commit migrated db to GitHub:', syncErr);
      }
    }
  }

  // Save migration manifest
  try {
    const manifestDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(
      path.join(manifestDir, 'github-migration-manifest.json'),
      JSON.stringify(report, null, 2),
      'utf8'
    );
  } catch {}

  return report;
}
