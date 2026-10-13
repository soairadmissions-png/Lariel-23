import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

/**
 * Cloudflare R2 Configuration and Credentials Resolver
 * Reads server-side environment variables configured in Vercel or environment.
 */
export function getR2Config() {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
  const endpoint =
    (process.env.R2_ENDPOINT || '').trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || '').trim();

  const isConfigured = Boolean(
    accessKeyId &&
    secretAccessKey &&
    bucketName &&
    (endpoint || accountId)
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

let cachedS3Client: S3Client | null = null;
let lastClientEndpoint: string = '';

/**
 * Returns an authenticated S3Client connected to Cloudflare R2.
 */
export function getR2Client(): S3Client | null {
  const config = getR2Config();
  if (!config.isConfigured) return null;

  if (!cachedS3Client || lastClientEndpoint !== config.endpoint) {
    cachedS3Client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    lastClientEndpoint = config.endpoint;
  }

  return cachedS3Client;
}

/**
 * Allowed logical folders for media assets
 */
export const PERMITTED_FOLDERS = [
  'products',
  'collections',
  'banners',
  'gallery',
  'editorial',
] as const;

export type PermittedFolder = (typeof PERMITTED_FOLDERS)[number];

/**
 * Allowed media MIME types
 */
export const PERMITTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;

/**
 * Default maximum file size: 15MB
 */
export const MAX_FILE_SIZE_BYTES =
  Number(process.env.MAX_FILE_SIZE_BYTES) || 15 * 1024 * 1024;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
  detectedExt?: string;
}

/**
 * Validates actual binary content and inspects magic bytes.
 * Rejects executables, scripts, HTML, SVG, and non-whitelisted formats.
 */
export function validateImageBuffer(
  buffer: Buffer,
  declaredMime?: string
): ValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty file buffer provided.' };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum permitted limit of ${maxMb}MB.`,
    };
  }

  // Quick check for dangerous text/script content in first 1024 bytes
  const headerText = buffer.slice(0, 1024).toString('utf8').toLowerCase();
  if (
    headerText.includes('<script') ||
    headerText.includes('<?php') ||
    headerText.includes('<html') ||
    headerText.includes('<!doctype') ||
    headerText.includes('<svg')
  ) {
    return {
      valid: false,
      error: 'Unsafe file format detected. HTML, scripts, and SVG files are not permitted for security reasons.',
    };
  }

  // 1. JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg', detectedExt: 'jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png', detectedExt: 'png' };
  }

  // 3. GIF: GIF87a or GIF89a (47 49 46 38 37 61 / 47 49 46 38 39 61)
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { valid: true, detectedMime: 'image/gif', detectedExt: 'gif' };
  }

  // 4. WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { valid: true, detectedMime: 'image/webp', detectedExt: 'webp' };
  }

  // 5. AVIF: ....ftypavif or ....ftypavis
  if (buffer.length >= 12) {
    const ftyp = buffer.slice(4, 12).toString('ascii');
    if (ftyp.includes('ftypavif') || ftyp.includes('ftypavis')) {
      return { valid: true, detectedMime: 'image/avif', detectedExt: 'avif' };
    }
  }

  return {
    valid: false,
    error: 'Unsupported image format. Only JPEG, PNG, WebP, AVIF, and GIF formats are allowed.',
  };
}

/**
 * Resolves the public delivery URL for a given Cloudflare R2 object key.
 */
export function getPublicUrl(key: string): string {
  const config = getR2Config();
  const cleanKey = key.replace(/^\//, '');

  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/$/, '')}/${cleanKey}`;
  }

  if (config.bucketName && config.accountId) {
    return `https://${config.bucketName}.${config.accountId}.r2.dev/${cleanKey}`;
  }

  // Application fallback proxy route
  return `/api/media/file/${cleanKey}`;
}

/**
 * Generates an organized, collision-resistant object key.
 * Allows optional contentHash for deterministic, collision-free asset keys.
 */
export function generateObjectKey(
  originalFilename: string,
  folder: string = 'products',
  forcedExt?: string,
  contentHash?: string
): string {
  const safeFolder = PERMITTED_FOLDERS.includes(folder.toLowerCase() as any)
    ? folder.toLowerCase()
    : 'products';

  const rawExt =
    forcedExt ||
    path.extname(originalFilename).replace('.', '').toLowerCase() ||
    'jpg';
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;

  const baseName = path.basename(originalFilename, path.extname(originalFilename));
  const cleanName =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 30) || 'media';

  const suffix = contentHash
    ? contentHash.slice(0, 10)
    : `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  return `${safeFolder}/${cleanName}_${suffix}.${ext}`;
}

export interface R2UploadResult {
  url: string;
  key: string;
  fileName: string;
  size: number;
  contentType: string;
  sha256?: string;
}

/**
 * Uploads a validated buffer directly to Cloudflare R2.
 */
export async function uploadToR2(
  buffer: Buffer,
  originalFilename: string,
  contentType?: string,
  folder: string = 'products'
): Promise<R2UploadResult> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured) {
    throw new Error(
      'Cloudflare R2 is not configured. Please set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.'
    );
  }

  const validation = validateImageBuffer(buffer, contentType);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image buffer.');
  }

  const mime = validation.detectedMime || contentType || 'image/jpeg';
  const ext = validation.detectedExt || 'jpg';
  const fileSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const objectKey = generateObjectKey(originalFilename, folder, ext, fileSha256);
  const cleanOriginalName = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_');

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    Body: buffer,
    ContentType: mime,
    Metadata: {
      originalName: cleanOriginalName,
      uploadedAt: new Date().toISOString(),
      sha256: fileSha256,
      sourceSha256: fileSha256,
    },
  });

  await client.send(command);

  const url = getPublicUrl(objectKey);

  return {
    url,
    key: objectKey,
    fileName: path.basename(objectKey),
    size: buffer.length,
    contentType: mime,
    sha256: fileSha256,
  };
}

/**
 * Creates a short-lived presigned PUT URL for direct browser uploads to R2.
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  folder: string = 'products',
  expiresInSeconds = 300 // 5 minutes
): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured) {
    throw new Error('Cloudflare R2 is not configured.');
  }

  if (!PERMITTED_MIME_TYPES.includes(contentType as any)) {
    throw new Error(
      `Unsupported MIME type "${contentType}". Only JPEG, PNG, WebP, AVIF, and GIF are allowed.`
    );
  }

  const objectKey = generateObjectKey(filename, folder);
  const cleanOriginalName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    ContentType: contentType,
    Metadata: {
      originalName: cleanOriginalName,
      uploadedAt: new Date().toISOString(),
    },
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds,
  });
  const publicUrl = getPublicUrl(objectKey);

  return {
    uploadUrl,
    publicUrl,
    key: objectKey,
    expiresIn: expiresInSeconds,
  };
}

/**
 * Verifies whether an object exists in Cloudflare R2 and retrieves metadata.
 */
export async function verifyR2Object(
  keyOrUrl: string
): Promise<{ exists: boolean; size?: number; contentType?: string; sha256?: string }> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured) {
    return { exists: false };
  }

  let key = keyOrUrl;
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    try {
      const u = new URL(keyOrUrl);
      key = u.pathname.replace(/^\//, '');
    } catch {
      key = keyOrUrl;
    }
  }

  try {
    const res = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      })
    );
    return {
      exists: true,
      size: res.ContentLength,
      contentType: res.ContentType,
      sha256: res.Metadata?.sha256 || res.Metadata?.sourcesha256,
    };
  } catch (err: any) {
    if (
      err.name === 'NotFound' ||
      err.$metadata?.httpStatusCode === 404 ||
      err.message?.includes('404')
    ) {
      return { exists: false };
    }
    throw err;
  }
}

/**
 * Deletes an object from Cloudflare R2.
 */
export async function deleteFromR2(keyOrUrl: string): Promise<boolean> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured || !keyOrUrl) return false;

  let key = keyOrUrl;
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    try {
      const u = new URL(keyOrUrl);
      key = u.pathname.replace(/^\//, '');
    } catch {
      key = keyOrUrl;
    }
  }

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      })
    );
    return true;
  } catch (err) {
    console.warn(`Could not delete object "${key}" from Cloudflare R2:`, err);
    return false;
  }
}

/**
 * Lists objects from Cloudflare R2.
 */
export async function listR2Objects(
  prefix: string = ''
): Promise<{ url: string; fileName: string; size: number; createdAt: string; key: string }[]> {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured) return [];

  try {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: prefix || undefined,
      MaxKeys: 1000,
    });

    const res = await client.send(command);
    const results: { url: string; fileName: string; size: number; createdAt: string; key: string }[] = [];

    if (res.Contents) {
      for (const obj of res.Contents) {
        if (!obj.Key) continue;
        results.push({
          url: getPublicUrl(obj.Key),
          fileName: path.basename(obj.Key),
          size: obj.Size || 0,
          createdAt: obj.LastModified?.toISOString() || new Date().toISOString(),
          key: obj.Key,
        });
      }
    }

    return results;
  } catch (err) {
    console.error('Failed to list objects from Cloudflare R2:', err);
    return [];
  }
}

/**
 * Retrieves an object stream from Cloudflare R2 for local delivery/proxying.
 */
export async function getR2Object(key: string) {
  const client = getR2Client();
  const config = getR2Config();

  if (!client || !config.isConfigured) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });
    return await client.send(command);
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}
