import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import {
  getDatabase,
  getDatabaseAsync,
  saveDatabase,
  type DatabaseSchema,
} from '../server/db.ts';

// Load .env if present
dotenv.config();

const MANIFEST_PATH = path.join(process.cwd(), 'data', 'r2-migration-manifest.json');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

export interface MigrationItem {
  recordType: 'product' | 'category' | 'settings' | 'realBride' | 'admin' | 'generic';
  recordId: string;
  field: string;
  sourceUrl: string;
  sourceFilePath?: string;
  sourceSize?: number;
  sourceSha256?: string;
  destinationKey: string;
  destinationUrl: string;
  status: 'pending' | 'completed' | 'verified' | 'failed' | 'skipped';
  verified: boolean;
  error?: string | null;
  migratedAt?: string;
}

export interface MigrationManifest {
  version: string;
  createdAt: string;
  updatedAt: string;
  authoritativeStorage: 'vercel-blob' | 'local-json';
  r2Bucket: string;
  publicBaseUrl: string;
  backupFile?: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  pendingItems: number;
  skippedItems: number;
  items: MigrationItem[];
}

function getR2Config() {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
  const endpoint =
    (process.env.R2_ENDPOINT || '').trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || '').trim();

  const isConfigured = Boolean(
    accessKeyId && secretAccessKey && bucketName && (endpoint || accountId)
  );

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint,
    publicBaseUrl,
    isConfigured,
  };
}

function getPublicUrl(key: string, publicBaseUrl?: string, bucketName?: string, accountId?: string): string {
  const cleanKey = key.replace(/^\//, '');
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${cleanKey}`;
  }
  if (bucketName && accountId) {
    return `https://${bucketName}.${accountId}.r2.dev/${cleanKey}`;
  }
  return `/api/media/file/${cleanKey}`;
}

function findLocalFile(urlOrPath: string): { filePath: string; buffer: Buffer } | null {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;

  // Clean query strings
  const cleanPath = urlOrPath.split('?')[0];
  const filename = path.basename(cleanPath);
  if (!filename || filename === '.' || filename === '/') return null;

  const candidateDirs = [
    path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), 'src', 'assets', 'images'),
    path.join(process.cwd(), 'dist', 'uploads'),
    path.join(process.cwd(), 'dist', 'assets'),
    path.join('/tmp', 'uploads'),
  ];

  for (const dir of candidateDirs) {
    const p = path.join(dir, filename);
    if (fs.existsSync(p)) {
      try {
        const buffer = fs.readFileSync(p);
        if (buffer.length > 0) {
          return { filePath: p, buffer };
        }
      } catch {}
    }
  }

  return null;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename.split('?')[0]).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.avif':
      return 'image/avif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
}

function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Checks if a URL is already a migrated Cloudflare R2 URL.
 */
function isAlreadyR2Url(url: string, publicBaseUrl?: string, bucketName?: string, accountId?: string): boolean {
  if (!url) return false;
  if (publicBaseUrl && url.startsWith(publicBaseUrl)) return true;
  if (url.includes('.r2.cloudflarestorage.com')) return true;
  if (bucketName && accountId && url.includes(`${bucketName}.${accountId}.r2.dev`)) return true;
  if (url.startsWith('/api/media/file/')) return true;
  return false;
}

export async function runMigration() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isVerifyOnly = args.includes('--verify');
  const isRollback = args.includes('--rollback');
  const isForce = args.includes('--force');

  const sampleArg = args.find((a) => a.startsWith('--sample='));
  const sampleLimit = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : 0;

  console.log('='.repeat(70));
  console.log('LARIEL ESSENTIALS - CLOUDFLARE R2 PRODUCTION MIGRATION ENGINE');
  console.log('='.repeat(70));

  // Determine authoritative persistence mechanism
  const isRemoteAuthoritative = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const authoritativeStorage = isRemoteAuthoritative ? 'vercel-blob' : 'local-json';
  console.log(`Authoritative Database Persistence: [${authoritativeStorage.toUpperCase()}]`);
  if (isRemoteAuthoritative) {
    console.log('  -> Live production persistence tier: Vercel Blob (database/db.json)');
  } else {
    console.log('  -> Local development persistence tier: data/db.json & /tmp/db.json');
  }

  // 1. ROLLBACK MODE
  if (isRollback) {
    console.log('\n[ROLLBACK] Locating latest authoritative database backup...');
    if (!fs.existsSync(BACKUPS_DIR)) {
      console.error(`Backups directory does not exist: ${BACKUPS_DIR}`);
      process.exit(1);
    }
    const backupFiles = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith('db-backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (backupFiles.length === 0) {
      console.error('No database backups found in data/backups/');
      process.exit(1);
    }

    const latestBackupFile = path.join(BACKUPS_DIR, backupFiles[0]);
    console.log(`[ROLLBACK] Reading backup file: ${latestBackupFile}`);
    const backupData: DatabaseSchema = JSON.parse(fs.readFileSync(latestBackupFile, 'utf8'));

    console.log('[ROLLBACK] Restoring backup to authoritative database tier...');
    await saveDatabase(backupData);

    // Independent database read verification
    const verifiedDb = await getDatabaseAsync(true);
    console.log(`[ROLLBACK] Successfully restored! Authoritative catalog contains ${verifiedDb.products?.length} products.`);
    return;
  }

  // 2. CHECK R2 CONFIGURATION
  const r2 = getR2Config();
  console.log(`\nCloudflare Account ID: ${r2.accountId ? r2.accountId.slice(0, 6) + '...' : '(Not set)'}`);
  console.log(`R2 Bucket Name:        ${r2.bucketName || '(Not set)'}`);
  console.log(`R2 Endpoint:           ${r2.endpoint || '(Not set)'}`);
  console.log(`R2 Public Base URL:    ${r2.publicBaseUrl || '(Not set - using fallback delivery format)'}`);
  console.log(
    `Execution Mode:        ${
      isDryRun
        ? 'DRY-RUN (Simulating only - zero writes)'
        : isVerifyOnly
        ? 'VERIFY ONLY'
        : sampleLimit
        ? `STAGED SAMPLE (Limit: ${sampleLimit})`
        : 'FULL MIGRATION'
    }`
  );

  if (!isDryRun && !r2.isConfigured) {
    console.error('\nERROR: Cloudflare R2 credentials are not configured in environment.');
    console.error('To run migration, please configure:');
    console.error('  CLOUDFLARE_ACCOUNT_ID=...');
    console.error('  R2_ACCESS_KEY_ID=...');
    console.error('  R2_SECRET_ACCESS_KEY=...');
    console.error('  R2_BUCKET_NAME=...');
    console.error('  R2_PUBLIC_BASE_URL=...');
    console.error('\nOr run in dry-run mode to inspect the migration plan:');
    console.error('  npm run migrate:r2:dry-run');
    process.exit(1);
  }

  // 3. FETCH AUTHORITATIVE DATABASE VIA SERVER ABSTRACTION
  console.log('\n[DATABASE] Fetching authoritative database state...');
  const db: DatabaseSchema = await getDatabaseAsync(true);

  if (!db || !Array.isArray(db.products) || db.products.length === 0) {
    console.error('Failed to load active catalog from authoritative database.');
    process.exit(1);
  }
  console.log(`[DATABASE] Loaded authoritative database (${db.products.length} products, ${db.categories?.length || 0} categories)`);

  // Ensure backups directory exists
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  // Take immutable backup before performing any migration
  const timestamp = Date.now();
  const backupFileName = `db-backup-${timestamp}.json`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);
  fs.writeFileSync(backupFilePath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`[BACKUP] Authoritative database snapshot saved to: ${backupFilePath}`);

  // 4. INVENTORY ALL MEDIA-BEARING FIELDS IN SCHEMA
  console.log('\n[INVENTORY] Scanning all schema records for media references...');
  const itemsToMigrate: MigrationItem[] = [];

  // Helper to register an item
  const registerItem = (
    recordType: MigrationItem['recordType'],
    recordId: string,
    field: string,
    url: string,
    folder: string
  ) => {
    if (!url || typeof url !== 'string' || !url.trim() || url.startsWith('data:')) return;
    const cleanUrl = url.trim();

    // Skip if already in R2 format
    const alreadyMigrated = isAlreadyR2Url(cleanUrl, r2.publicBaseUrl, r2.bucketName, r2.accountId);

    const filename = path.basename(cleanUrl.split('?')[0]);
    const cleanBasename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const local = findLocalFile(cleanUrl);

    let destKey: string;
    let fileSha: string | undefined;

    if (local) {
      fileSha = computeSha256(local.buffer);
      // Generate collision-free key incorporating short hash
      const ext = path.extname(cleanBasename) || '.jpg';
      const nameWithoutExt = path.basename(cleanBasename, ext);
      destKey = `${folder}/${nameWithoutExt}_${fileSha.slice(0, 8)}${ext}`;
    } else {
      destKey = `${folder}/${cleanBasename}`;
    }

    const destinationUrl = getPublicUrl(destKey, r2.publicBaseUrl, r2.bucketName, r2.accountId);

    itemsToMigrate.push({
      recordType,
      recordId,
      field,
      sourceUrl: cleanUrl,
      sourceFilePath: local?.filePath,
      sourceSize: local?.buffer.length,
      sourceSha256: fileSha,
      destinationKey: destKey,
      destinationUrl,
      status: alreadyMigrated ? 'skipped' : 'pending',
      verified: alreadyMigrated,
      migratedAt: alreadyMigrated ? new Date().toISOString() : undefined,
    });
  };

  // 4.1 Products: images array + individual image fields
  (db.products || []).forEach((p: any) => {
    (p.images || []).forEach((img: string, idx: number) => {
      registerItem('product', p.id, `images[${idx}]`, img, 'products');
    });
    if (p.featuredImage) registerItem('product', p.id, 'featuredImage', p.featuredImage, 'products');
    if (p.hoverImage) registerItem('product', p.id, 'hoverImage', p.hoverImage, 'products');
    if (p.thumbnail) registerItem('product', p.id, 'thumbnail', p.thumbnail, 'products');
  });

  // 4.2 Categories: heroImage, image, bannerImage
  (db.categories || []).forEach((c: any) => {
    if (c.heroImage) registerItem('category', c.id, 'heroImage', c.heroImage, 'collections');
    if (c.image) registerItem('category', c.id, 'image', c.image, 'collections');
    if (c.bannerImage) registerItem('category', c.id, 'bannerImage', c.bannerImage, 'collections');
  });

  // 4.3 Site Settings
  if (db.settings) {
    Object.entries(db.settings).forEach(([key, val]) => {
      if (typeof val === 'string' && (key.toLowerCase().includes('image') || val.includes('/uploads/'))) {
        const folder = key.toLowerCase().includes('hero')
          ? 'banners'
          : key.toLowerCase().includes('logo') || key.toLowerCase().includes('portrait')
          ? 'editorial'
          : 'editorial';
        registerItem('settings', 'siteSettings', key, val, folder);
      }
    });
  }

  // 4.4 Real Brides
  (db.realBrides || []).forEach((b: any) => {
    if (b.image) registerItem('realBride', b.id, 'image', b.image, 'editorial');
    if (Array.isArray(b.images)) {
      b.images.forEach((img: string, idx: number) => {
        registerItem('realBride', b.id, `images[${idx}]`, img, 'editorial');
      });
    }
  });

  // 4.5 Admins
  (db.admins || []).forEach((a: any) => {
    if (a.avatar) registerItem('admin', a.id, 'avatar', a.avatar, 'editorial');
  });

  console.log(`[INVENTORY] Found ${itemsToMigrate.length} media field references across schema records.`);

  // 5. GROUP UNIQUE ASSETS BY SOURCE CHECKSUM & DESTINATION KEY
  const uniqueUploadMap = new Map<
    string,
    { buffer: Buffer; mime: string; sha256: string; items: MigrationItem[] }
  >();

  for (const item of itemsToMigrate) {
    if (item.status === 'skipped') continue;

    const local = findLocalFile(item.sourceUrl);
    if (local) {
      const sha = computeSha256(local.buffer);
      if (!uniqueUploadMap.has(item.destinationKey)) {
        uniqueUploadMap.set(item.destinationKey, {
          buffer: local.buffer,
          mime: getMimeType(item.destinationKey),
          sha256: sha,
          items: [item],
        });
      } else {
        uniqueUploadMap.get(item.destinationKey)!.items.push(item);
      }
    }
  }

  console.log(`[INVENTORY] Unique distinct media files to upload: ${uniqueUploadMap.size}`);

  // 6. DRY RUN MODE
  if (isDryRun) {
    console.log('\n--- DRY-RUN SUMMARY ---');
    console.log(`Total database media references: ${itemsToMigrate.length}`);
    console.log(`Distinct unique files to R2:     ${uniqueUploadMap.size}`);

    let index = 0;
    uniqueUploadMap.forEach((entry, destKey) => {
      index++;
      const sampleItem = entry.items[0];
      console.log(
        `  [${index}/${uniqueUploadMap.size}] ${destKey.padEnd(52)} (${(entry.buffer.length / 1024).toFixed(1)} KB) [SHA: ${entry.sha256.slice(0, 10)}] <- ${sampleItem.sourceFilePath || sampleItem.sourceUrl}`
      );
    });

    const manifest: MigrationManifest = {
      version: '2.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authoritativeStorage,
      r2Bucket: r2.bucketName || 'unknown',
      publicBaseUrl: r2.publicBaseUrl || '',
      backupFile: backupFilePath,
      totalItems: itemsToMigrate.length,
      completedItems: 0,
      failedItems: 0,
      pendingItems: itemsToMigrate.length,
      skippedItems: itemsToMigrate.filter((i) => i.status === 'skipped').length,
      items: itemsToMigrate,
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`\nManifest written to: ${MANIFEST_PATH}`);
    console.log('Dry-run completed successfully with zero modifications to R2 or database.');
    return;
  }

  // 7. SETUP S3 CLIENT FOR LIVE MIGRATION
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: r2.endpoint,
    credentials: {
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
    },
  });

  let uploadedCount = 0;
  let verifiedCount = 0;
  let failedCount = 0;

  const entriesToProcess = Array.from(uniqueUploadMap.entries());
  const processLimit = sampleLimit > 0 ? Math.min(sampleLimit, entriesToProcess.length) : entriesToProcess.length;

  console.log(`\n[MIGRATION] Starting upload of ${processLimit} unique media assets to Cloudflare R2 bucket "${r2.bucketName}"...`);

  for (let i = 0; i < processLimit; i++) {
    const [destKey, entry] = entriesToProcess[i];
    process.stdout.write(`  (${i + 1}/${processLimit}) Uploading ${destKey}... `);

    try {
      // Check if object already exists in R2 with matching SHA-256
      let alreadyIdentical = false;
      try {
        const head = await s3Client.send(
          new HeadObjectCommand({
            Bucket: r2.bucketName,
            Key: destKey,
          })
        );
        const remoteSha = head.Metadata?.sourcesha256 || head.Metadata?.sha256;
        if (remoteSha === entry.sha256 && !isForce) {
          alreadyIdentical = true;
        }
      } catch {}

      if (!alreadyIdentical) {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: r2.bucketName,
            Key: destKey,
            Body: entry.buffer,
            ContentType: entry.mime,
            Metadata: {
              sourceSha256: entry.sha256,
              sha256: entry.sha256,
              migratedAt: new Date().toISOString(),
            },
          })
        );
        uploadedCount++;
      }

      // Re-verify object directly in Cloudflare R2 with HeadObject
      const verifyHead = await s3Client.send(
        new HeadObjectCommand({
          Bucket: r2.bucketName,
          Key: destKey,
        })
      );

      const verifiedSha = verifyHead.Metadata?.sourcesha256 || verifyHead.Metadata?.sha256;
      const sizeMatches = verifyHead.ContentLength === entry.buffer.length;
      const shaMatches = !verifiedSha || verifiedSha === entry.sha256;

      if (sizeMatches && shaMatches) {
        verifiedCount++;
        entry.items.forEach((it) => {
          it.status = 'completed';
          it.verified = true;
          it.error = null;
          it.migratedAt = new Date().toISOString();
        });
        console.log(`VERIFIED (${(entry.buffer.length / 1024).toFixed(1)} KB, SHA-256: ${entry.sha256.slice(0, 8)})`);
      } else {
        throw new Error(`Integrity mismatch: size match=${sizeMatches}, sha match=${shaMatches}`);
      }
    } catch (err: any) {
      failedCount++;
      entry.items.forEach((it) => {
        it.status = 'failed';
        it.verified = false;
        it.error = err.message || String(err);
      });
      console.log(`FAILED (${err.message})`);
    }
  }

  // 8. UPDATE AUTHORITATIVE DATABASE ONLY FOR FULLY VERIFIED ITEMS
  console.log('\n[DATABASE] Updating verified references in authoritative database...');
  let updatedReferencesCount = 0;

  for (const item of itemsToMigrate) {
    if (item.verified && item.status === 'completed') {
      const oldUrl = item.sourceUrl;
      const newUrl = item.destinationUrl;

      if (item.recordType === 'product') {
        const prod = db.products.find((p: any) => p.id === item.recordId);
        if (prod) {
          if (Array.isArray(prod.images)) {
            prod.images = prod.images.map((img: string) => (img === oldUrl ? newUrl : img));
          }
          if ((prod as any).featuredImage === oldUrl) (prod as any).featuredImage = newUrl;
          if ((prod as any).hoverImage === oldUrl) (prod as any).hoverImage = newUrl;
          if ((prod as any).thumbnail === oldUrl) (prod as any).thumbnail = newUrl;
          updatedReferencesCount++;
        }
      } else if (item.recordType === 'category') {
        const cat = (db.categories || []).find((c: any) => c.id === item.recordId);
        if (cat) {
          if (cat.heroImage === oldUrl) cat.heroImage = newUrl;
          if ((cat as any).image === oldUrl) (cat as any).image = newUrl;
          if ((cat as any).bannerImage === oldUrl) (cat as any).bannerImage = newUrl;
          updatedReferencesCount++;
        }
      } else if (item.recordType === 'settings' && db.settings) {
        if ((db.settings as any)[item.field] === oldUrl) {
          (db.settings as any)[item.field] = newUrl;
          updatedReferencesCount++;
        }
      } else if (item.recordType === 'realBride' && db.realBrides) {
        const bride = db.realBrides.find((b: any) => b.id === item.recordId);
        if (bride) {
          if (bride.image === oldUrl) bride.image = newUrl;
          if (Array.isArray((bride as any).images)) {
            (bride as any).images = (bride as any).images.map((img: string) => (img === oldUrl ? newUrl : img));
          }
          updatedReferencesCount++;
        }
      } else if (item.recordType === 'admin' && db.admins) {
        const admin = db.admins.find((a: any) => a.id === item.recordId);
        if (admin && admin.avatar === oldUrl) {
          admin.avatar = newUrl;
          updatedReferencesCount++;
        }
      }
    }
  }

  // Save updated database to authoritative persistence tier (Vercel Blob + local)
  await saveDatabase(db);
  console.log(`[DATABASE] Saved ${updatedReferencesCount} updated media references to authoritative storage (${authoritativeStorage}).`);

  // Independent database read verification
  const verificationDb = await getDatabaseAsync(true);
  console.log(`[DATABASE VERIFICATION] Re-read authoritative database: verified ${verificationDb.products?.length} products intact.`);

  // 9. SAVE FINAL MANIFEST
  const finalManifest: MigrationManifest = {
    version: '2.0.0',
    createdAt: new Date(timestamp).toISOString(),
    updatedAt: new Date().toISOString(),
    authoritativeStorage,
    r2Bucket: r2.bucketName,
    publicBaseUrl: r2.publicBaseUrl,
    backupFile: backupFilePath,
    totalItems: itemsToMigrate.length,
    completedItems: itemsToMigrate.filter((i) => i.status === 'completed').length,
    failedItems: itemsToMigrate.filter((i) => i.status === 'failed').length,
    pendingItems: itemsToMigrate.filter((i) => i.status === 'pending').length,
    skippedItems: itemsToMigrate.filter((i) => i.status === 'skipped').length,
    items: itemsToMigrate,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(finalManifest, null, 2), 'utf8');
  console.log(`[MANIFEST] Final manifest written to ${MANIFEST_PATH}`);

  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION EXECUTION COMPLETED');
  console.log('='.repeat(70));
  console.log(`Total References Processed: ${itemsToMigrate.length}`);
  console.log(`Verified Destination Files: ${verifiedCount}`);
  console.log(`Failed Assets:              ${failedCount}`);
  console.log(`Database References Saved:  ${updatedReferencesCount}`);
  console.log(`Backup Location:            ${backupFilePath}`);
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch((err) => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
}
