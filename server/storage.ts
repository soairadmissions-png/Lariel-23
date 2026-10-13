import fs from 'fs';
import path from 'path';
import { put, del, list } from '@vercel/blob';
import {
  getR2Config,
  uploadToR2,
  deleteFromR2,
  listR2Objects,
  PermittedFolder,
} from './r2.ts';

export interface UploadResult {
  url: string;
  fileName: string;
  size: number;
  key?: string;
  sha256?: string;
}

/**
 * Determine the active persistent storage provider.
 * Priority:
 * 1. Cloudflare R2 (R2_ACCESS_KEY_ID & R2_SECRET_ACCESS_KEY & R2_BUCKET_NAME) - Production object storage
 * 2. Vercel Blob (BLOB_READ_WRITE_TOKEN) - Legacy/secondary object storage (read & legacy fallback)
 * 3. Cloudinary (CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME) - Legacy external media CDN
 * 4. Local filesystem fallback - Non-production local development
 */
export function getStorageProvider(): 'cloudflare-r2' | 'vercel-blob' | 'cloudinary' | 'local' {
  if (getR2Config().isConfigured || process.env.STORAGE_PROVIDER === 'cloudflare-r2') {
    return 'cloudflare-r2';
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return 'vercel-blob';
  }
  if (
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
  ) {
    return 'cloudinary';
  }
  return 'local';
}

/**
 * Uploads media to persistent object storage (preferring Cloudflare R2).
 * In production or when R2 is configured, Cloudflare R2 is the exclusive upload destination.
 * Upload failures on R2 NEVER silently fall back to legacy storage.
 */
export async function uploadPersistentMedia(
  buffer: Buffer,
  originalFilename: string,
  contentType?: string,
  folder: string = 'products'
): Promise<UploadResult> {
  const provider = getStorageProvider();
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    process.env.STORAGE_PROVIDER === 'cloudflare-r2';

  // 1. Cloudflare R2 Object Storage (Exclusive Production Destination)
  if (provider === 'cloudflare-r2') {
    try {
      const res = await uploadToR2(buffer, originalFilename, contentType, folder);
      return {
        url: res.url,
        fileName: res.fileName,
        size: res.size,
        key: res.key,
        sha256: res.sha256,
      };
    } catch (err: any) {
      console.error('Cloudflare R2 upload failed:', err);
      // Hard requirement: Never silently fall back when R2 is the configured destination
      throw new Error(`Cloudflare R2 upload error: ${err.message || err}`);
    }
  }

  // 2. Strict Production Guard: Production must never write to local disk or unverified fallback
  if (isProduction) {
    throw new Error(
      'Production configuration error: Cloudflare R2 is required as the exclusive production upload destination, but R2 is not configured. Please configure CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.'
    );
  }

  const rawExt = path.extname(originalFilename).replace('.', '').toLowerCase() || 'jpg';
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const baseName = path.basename(originalFilename, path.extname(originalFilename));
  const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) || 'image';
  const fileName = `${cleanName}_${Date.now()}.${ext}`;
  const mime =
    contentType ||
    (ext === 'png'
      ? 'image/png'
      : ext === 'webp'
      ? 'image/webp'
      : ext === 'gif'
      ? 'image/gif'
      : 'image/jpeg');

  // 3. Vercel Blob Storage (Legacy Fallback in non-R2 environments)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobPath = `${folder}/${fileName}`;
      const blob = await put(blobPath, buffer, {
        access: 'public',
        contentType: mime,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return {
        url: blob.url,
        fileName,
        size: buffer.length,
      };
    } catch (err: any) {
      console.error('Vercel Blob upload failed:', err);
    }
  }

  // 4. Cloudinary Storage (if configured)
  if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)) {
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL?.split('@')?.[1];
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'unsigned_lariel';
      const base64Data = `data:${mime};base64,${buffer.toString('base64')}`;

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64Data,
          upload_preset: uploadPreset,
          public_id: `${folder}/${cleanName}_${Date.now()}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          url: data.secure_url,
          fileName,
          size: buffer.length,
        };
      }
    } catch (err: any) {
      console.error('Cloudinary upload failed:', err);
    }
  }

  // 5. Local Filesystem Fallback (Development & Offline Environments Only)
  let targetDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch {
    targetDir = path.join('/tmp', 'uploads');
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
      } catch {}
    }
  }

  const filePath = path.join(targetDir, fileName);
  try {
    fs.writeFileSync(filePath, buffer);
  } catch (writeErr) {
    console.warn('Could not write to local uploads directory:', writeErr);
  }

  return {
    url: `/uploads/${fileName}`,
    fileName,
    size: buffer.length,
  };
}

/**
 * Deletes an image from persistent object storage when replaced or deleted.
 * Note: Legacy assets (Vercel Blob and local disk) are intentionally preserved
 * during the migration window to ensure zero loss and reliable rollback.
 */
export async function deletePersistentMedia(url: string): Promise<void> {
  if (!url) return;

  const r2Config = getR2Config();

  // If Cloudflare R2 URL or key
  const isR2Url =
    (r2Config.publicBaseUrl && url.startsWith(r2Config.publicBaseUrl)) ||
    url.includes('r2.cloudflarestorage.com') ||
    url.includes('r2.dev') ||
    url.startsWith('/api/media/file/');

  if (isR2Url && r2Config.isConfigured) {
    let key = url;
    if (url.startsWith('/api/media/file/')) {
      key = url.replace('/api/media/file/', '');
    } else {
      try {
        const u = new URL(url);
        key = u.pathname.replace(/^\//, '');
      } catch {}
    }
    await deleteFromR2(key);
    return;
  }

  // Legacy assets: Do not delete legacy Vercel Blob or local files during migration window
  // to ensure backwards compatibility and rollback availability.
}

/**
 * Diagnostic information about the active storage subsystem.
 * Strictly sanitizes credentials so no secret keys or tokens are exposed.
 */
export function getStorageDiagnostics() {
  const provider = getStorageProvider();
  const r2Config = getR2Config();
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    process.env.STORAGE_PROVIDER === 'cloudflare-r2';

  return {
    activeProvider: provider,
    isProduction,
    exclusiveDestination: isProduction ? 'cloudflare-r2' : provider,
    r2: {
      isConfigured: r2Config.isConfigured,
      bucketName: r2Config.bucketName || null,
      endpointConfigured: Boolean(r2Config.endpoint),
      endpointHost: r2Config.endpoint ? new URL(r2Config.endpoint).host : null,
      publicBaseUrl: r2Config.publicBaseUrl || null,
      hasAccountId: Boolean(r2Config.accountId),
      hasAccessKeyId: Boolean(r2Config.accessKeyId),
      hasSecretAccessKey: Boolean(r2Config.secretAccessKey),
    },
    legacy: {
      vercelBlobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_URL ||
          (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
      ),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Retrieves list of persistent media assets (from Cloudflare R2, Vercel Blob, or local disk).
 */
export async function listPersistentMedia(): Promise<
  { url: string; fileName: string; size: number; createdAt: string; source?: string }[]
> {
  const provider = getStorageProvider();
  const results: { url: string; fileName: string; size: number; createdAt: string; source?: string }[] = [];
  const seenUrls = new Set<string>();

  // 1. If Cloudflare R2 is configured, list R2 objects
  if (provider === 'cloudflare-r2' || getR2Config().isConfigured) {
    try {
      const r2Items = await listR2Objects();
      for (const item of r2Items) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          results.push({
            ...item,
            source: 'cloudflare-r2',
          });
        }
      }
    } catch (err) {
      console.warn('Could not list media from Cloudflare R2:', err);
    }
  }

  // 2. If Vercel Blob is also configured, list blobs
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const response = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      for (const blob of response.blobs) {
        if (!seenUrls.has(blob.url)) {
          seenUrls.add(blob.url);
          results.push({
            url: blob.url,
            fileName: path.basename(blob.pathname),
            size: blob.size,
            createdAt: blob.uploadedAt.toISOString(),
            source: 'vercel-blob',
          });
        }
      }
    } catch (err) {
      console.warn('Could not list media from Vercel Blob:', err);
    }
  }

  // 3. Local fallback assets
  const scanDir = (dir: string) => {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const url = `/uploads/${file}`;
          if (!seenUrls.has(url) && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)) {
            seenUrls.add(url);
            const fullPath = path.join(dir, file);
            let size = 0;
            let mtime = new Date().toISOString();
            try {
              const stat = fs.statSync(fullPath);
              size = stat.size;
              mtime = stat.mtime.toISOString();
            } catch {}
            results.push({
              url,
              fileName: file,
              size,
              createdAt: mtime,
              source: 'local',
            });
          }
        }
      } catch {}
    }
  };

  scanDir(path.join(process.cwd(), 'public', 'uploads'));
  scanDir(path.join(process.cwd(), 'src', 'assets', 'images'));
  scanDir(path.join('/tmp', 'uploads'));

  return results;
}
