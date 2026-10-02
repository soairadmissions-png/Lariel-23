import fs from 'fs';
import path from 'path';
import { put, del, list } from '@vercel/blob';

export interface UploadResult {
  url: string;
  fileName: string;
  size: number;
}

/**
 * Determine the active persistent storage provider.
 * Priority:
 * 1. Vercel Blob (BLOB_READ_WRITE_TOKEN) - Native Vercel object storage
 * 2. Cloudinary (CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME) - External media CDN
 * 3. Local filesystem /tmp fallback - Development and offline environments
 */
export function getStorageProvider(): 'vercel-blob' | 'cloudinary' | 'local' {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return 'vercel-blob';
  }
  if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)) {
    return 'cloudinary';
  }
  return 'local';
}

/**
 * Uploads media to persistent object storage.
 * On Vercel, this stores the asset in Vercel Blob or Cloudinary, generating a permanent canonical HTTPS URL.
 */
export async function uploadPersistentMedia(
  buffer: Buffer,
  originalFilename: string,
  contentType?: string
): Promise<UploadResult> {
  const provider = getStorageProvider();

  const rawExt = path.extname(originalFilename).replace('.', '').toLowerCase() || 'jpg';
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const baseName = path.basename(originalFilename, path.extname(originalFilename));
  const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) || 'image';
  const fileName = `${cleanName}_${Date.now()}.${ext}`;
  const mime = contentType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg');

  // 1. Vercel Blob Storage (Permanent Vercel Object Storage)
  if (provider === 'vercel-blob') {
    try {
      const blobPath = `products/${fileName}`;
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
      console.error('Vercel Blob upload failed, falling back to safe local write:', err);
    }
  }

  // 2. Cloudinary Storage (if configured via environment variables)
  if (provider === 'cloudinary') {
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
          public_id: `products/${cleanName}_${Date.now()}`,
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
      console.error('Cloudinary upload failed, falling back to safe local write:', err);
    }
  }

  // 3. Local Filesystem / Development / Safe Fallback
  // Try writing to public/uploads; if read-only (as on Vercel runtime), use /tmp
  let targetDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch {
    // EROFS or permission error on Vercel ephemeral container
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
 * Optionally deletes an image from persistent object storage when replaced or deleted.
 */
export async function deletePersistentMedia(url: string): Promise<void> {
  if (!url) return;

  // If Vercel Blob URL
  if (url.includes('blob.vercel-storage.com') && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (err) {
      console.warn('Could not delete old asset from Vercel Blob:', err);
    }
    return;
  }

  // If local file
  if (url.startsWith('/uploads/')) {
    const filename = path.basename(url);
    const pubPath = path.join(process.cwd(), 'public', 'uploads', filename);
    const tmpPath = path.join('/tmp', 'uploads', filename);
    try {
      if (fs.existsSync(pubPath)) fs.unlinkSync(pubPath);
    } catch {}
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {}
  }
}

/**
 * Retrieves list of persistent media assets (from Vercel Blob or local disk).
 */
export async function listPersistentMedia(): Promise<{ url: string; fileName: string; size: number; createdAt: string }[]> {
  const provider = getStorageProvider();

  if (provider === 'vercel-blob' && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const response = await list({
        prefix: 'products/',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return response.blobs.map((blob) => ({
        url: blob.url,
        fileName: path.basename(blob.pathname),
        size: blob.size,
        createdAt: blob.uploadedAt.toISOString(),
      }));
    } catch (err) {
      console.warn('Could not list media from Vercel Blob:', err);
    }
  }

  // Local fallback
  const results: { url: string; fileName: string; size: number; createdAt: string }[] = [];
  const seen = new Set<string>();

  const scanDir = (dir: string) => {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (!seen.has(file) && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)) {
            seen.add(file);
            const fullPath = path.join(dir, file);
            let size = 0;
            let mtime = new Date().toISOString();
            try {
              const stat = fs.statSync(fullPath);
              size = stat.size;
              mtime = stat.mtime.toISOString();
            } catch {}
            results.push({
              url: `/uploads/${file}`,
              fileName: file,
              size,
              createdAt: mtime,
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
