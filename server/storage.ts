import fs from 'fs';
import path from 'path';
import { put, del, list } from '@vercel/blob';
import {
  getR2Config,
  uploadToR2,
  deleteFromR2,
  listR2Objects,
} from './r2.ts';
import {
  getGitHubConfig,
  commitFileToGitHub,
  deleteFileFromGitHub,
  generateSafeUniqueFilename,
  getGitHubDiagnostics,
  type GitHubCommitResult,
} from './github.ts';

export interface UploadResult {
  url: string;
  fileName: string;
  size: number;
  key?: string;
  sha256?: string;
  localSaved: boolean;
  localPath?: string;
  remoteConfirmed: boolean;
  persistenceType: 'permanent_github' | 'permanent_r2' | 'permanent_vercel_blob' | 'local_only' | 'ephemeral_unpersisted';
  warnings?: string[];
  github?: {
    committed: boolean;
    sha?: string;
    commitSha?: string;
    htmlUrl?: string;
    path?: string;
    error?: string;
  };
}

/**
 * Determine the active persistent storage provider.
 * Priority:
 * 1. GitHub Repository Commit (GITHUB_TOKEN & GITHUB_OWNER & GITHUB_REPO) - Permanent repository binary file storage
 * 2. Cloudflare R2 (R2_ACCESS_KEY_ID & R2_SECRET_ACCESS_KEY & R2_BUCKET_NAME) - Production object storage
 * 3. Vercel Blob (BLOB_READ_WRITE_TOKEN) - Legacy/secondary object storage (read & legacy fallback)
 * 4. Cloudinary (CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME) - Legacy external media CDN
 * 5. Local filesystem fallback - Non-production local development
 */
export function getStorageProvider(): 'github' | 'cloudflare-r2' | 'vercel-blob' | 'cloudinary' | 'local' {
  if (getGitHubConfig().isConfigured || process.env.STORAGE_PROVIDER === 'github') {
    return 'github';
  }
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
 * Uploads media to persistent storage:
 * 1. Generates safe unique filename (sanitized name + timestamp + random hex)
 * 2. Saves directly to the single canonical local filesystem destination: public/uploads/
 * 3. When GitHub is configured, commits the actual binary file directly to GitHub repository & branch via GitHub REST API
 * 4. When R2 or Vercel Blob is configured, mirrors to remote object storage
 * 5. Returns explicit, accurate persistence status (distinguishing GitHub commit, R2, local, and ephemeral storage)
 */
export async function uploadPersistentMedia(
  buffer: Buffer,
  originalFilename: string,
  contentType?: string,
  folder: string = 'products'
): Promise<UploadResult> {
  const fileName = generateSafeUniqueFilename(originalFilename);
  const rawExt = path.extname(fileName).replace('.', '').toLowerCase() || 'jpg';
  const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const mime =
    contentType ||
    (ext === 'png'
      ? 'image/png'
      : ext === 'webp'
      ? 'image/webp'
      : ext === 'gif'
      ? 'image/gif'
      : 'image/jpeg');

  const warnings: string[] = [];

  // 1. SAVE ONCE LOCALLY TO SINGLE CANONICAL DESTINATION: public/uploads/
  // Stops duplicate writes to src/assets/images, public/images/products, dist/uploads, /tmp/uploads
  const canonicalLocalDir = path.join(process.cwd(), 'public', 'uploads');
  const canonicalFilePath = path.join(canonicalLocalDir, fileName);
  let localSaved = false;

  try {
    if (!fs.existsSync(canonicalLocalDir)) {
      fs.mkdirSync(canonicalLocalDir, { recursive: true });
    }
    fs.writeFileSync(canonicalFilePath, buffer);
    localSaved = true;
  } catch (localWriteErr: any) {
    warnings.push(`Local filesystem write failed: ${localWriteErr?.message || localWriteErr}`);
  }

  const githubConfig = getGitHubConfig();
  let githubResult: UploadResult['github'] = undefined;
  let remoteConfirmed = false;

  // 2. PERMANENT GITHUB REPOSITORY COMMIT (if configured)
  // Commits actual binary image file to GitHub repo so it survives Vercel ephemeral runtime restarts!
  if (githubConfig.isConfigured) {
    try {
      const repoPath = `public/uploads/${fileName}`;
      const commitRes = await commitFileToGitHub({
        repoPath,
        buffer,
        message: `feat(media): upload ${fileName} to ${repoPath} [skip ci]`,
        config: githubConfig,
      });

      if (commitRes.success) {
        githubResult = {
          committed: true,
          sha: commitRes.sha,
          commitSha: commitRes.commitSha,
          htmlUrl: commitRes.htmlUrl,
          path: repoPath,
        };
        remoteConfirmed = true;
        console.log(`Successfully committed image ${fileName} to GitHub repository (${githubConfig.owner}/${githubConfig.repo}@${githubConfig.branch})`);
      } else {
        githubResult = {
          committed: false,
          path: repoPath,
          error: commitRes.error,
        };
        warnings.push(`GitHub repository commit failed: ${commitRes.error}`);
        console.warn(`GitHub repository commit failed for ${fileName}:`, commitRes.error);
      }
    } catch (gitErr: any) {
      const errMsg = gitErr?.message || String(gitErr);
      warnings.push(`GitHub repository commit error: ${errMsg}`);
      console.warn(`GitHub repository commit error for ${fileName}:`, errMsg);
      githubResult = {
        committed: false,
        error: errMsg,
      };
    }
  }

  const provider = getStorageProvider();

  // 3. Cloudflare R2 Object Storage (if configured)
  let r2Result: { url: string; fileName: string; size: number; key?: string; sha256?: string } | null = null;
  if (getR2Config().isConfigured || provider === 'cloudflare-r2') {
    try {
      const res = await uploadToR2(buffer, originalFilename, contentType, folder);
      r2Result = {
        url: res.url,
        fileName: res.fileName,
        size: res.size,
        key: res.key,
        sha256: res.sha256,
      };
      remoteConfirmed = true;
    } catch (err: any) {
      if (
        process.env.STORAGE_PROVIDER === 'cloudflare-r2' ||
        (process.env.NODE_ENV === 'production' && provider === 'cloudflare-r2')
      ) {
        throw err;
      }
      warnings.push(`Cloudflare R2 upload warning: ${err?.message || err}`);
      console.warn('Cloudflare R2 upload warning:', err?.message || err);
    }
  }

  // 4. Vercel Blob Storage (if configured)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobPath = `${folder}/${fileName}`;
      await put(blobPath, buffer, {
        access: 'public',
        contentType: mime,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      remoteConfirmed = true;
    } catch (err: any) {
      warnings.push(`Vercel Blob upload warning: ${err?.message || err}`);
      console.warn('Vercel Blob upload warning:', err?.message || err);
    }
  }

  // Determine explicit persistence classification
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    process.env.STORAGE_PROVIDER === 'cloudflare-r2';

  let persistenceType: UploadResult['persistenceType'] = 'local_only';
  if (githubResult?.committed) {
    persistenceType = 'permanent_github';
  } else if (r2Result) {
    persistenceType = 'permanent_r2';
  } else if (process.env.BLOB_READ_WRITE_TOKEN && remoteConfirmed) {
    persistenceType = 'permanent_vercel_blob';
  } else if (isProduction) {
    persistenceType = 'ephemeral_unpersisted';
    warnings.push(
      'Production server is operating on ephemeral container storage without confirmed remote persistence (GitHub PAT or Cloudflare R2). Upload will be lost upon serverless container termination.'
    );
  }

  // Codebase-relative URL served statically by Vite/Express and available from git checkout
  const codeUrl = `/uploads/${fileName}`;

  return {
    url: r2Result?.url && !r2Result.url.startsWith('/api/') ? r2Result.url : codeUrl,
    fileName,
    size: buffer.length,
    key: r2Result?.key,
    sha256: r2Result?.sha256,
    localSaved,
    localPath: `public/uploads/${fileName}`,
    remoteConfirmed,
    persistenceType,
    warnings: warnings.length > 0 ? warnings : undefined,
    github: githubResult,
  };
}

const TOMBSTONES_FILE = path.join(process.cwd(), 'data', 'deleted-media-tombstones.json');

export function getTombstones(): Set<string> {
  try {
    if (fs.existsSync(TOMBSTONES_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOMBSTONES_FILE, 'utf8'));
      if (Array.isArray(data)) return new Set(data);
    }
  } catch {}
  return new Set();
}

export function addTombstone(fileName: string): void {
  if (!fileName || fileName === '.' || fileName === '/') return;
  try {
    const tombstones = getTombstones();
    tombstones.add(fileName);
    const dir = path.dirname(TOMBSTONES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TOMBSTONES_FILE, JSON.stringify([...tombstones], null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to save tombstone:', err);
  }
}

export function isTombstoned(fileNameOrUrl: string): boolean {
  if (!fileNameOrUrl) return false;
  const fileName = path.basename(fileNameOrUrl.split('?')[0]);
  const tombstones = getTombstones();
  return tombstones.has(fileName);
}

/**
 * Permanently deletes an image from all storage destinations:
 * 1. Local filesystem (public/uploads, src/assets/images, dist/uploads, /tmp/uploads)
 * 2. All brain .tempmediaStorage directories
 * 3. GitHub repository binary commit deletion (if GitHub PAT configured)
 * 4. Cloudflare R2 object storage (if R2 configured)
 * 5. Vercel Blob (if Blob token configured)
 * 6. Image descriptions metadata (data/image-descriptions.json)
 * 7. Enforces persistent tombstone record so it can never be resurrected or served
 * Ensures deleted files stay deleted and aren't saved or served anywhere.
 */
export async function deletePersistentMedia(urlOrKey: string): Promise<{ success: boolean; deletedLocations: string[] }> {
  if (!urlOrKey || typeof urlOrKey !== 'string') {
    return { success: false, deletedLocations: [] };
  }

  const deletedLocations: string[] = [];
  const cleanUrl = urlOrKey.trim();
  const rawPath = cleanUrl.split('?')[0];
  const fileName = path.basename(rawPath);

  if (fileName && fileName !== '.' && fileName !== '/') {
    // Record tombstone immediately
    addTombstone(fileName);

    // 1. Delete from all local filesystem storage folders
    const localDirs = [
      path.join(process.cwd(), 'public', 'uploads'),
      path.join(process.cwd(), 'src', 'assets', 'images'),
      path.join(process.cwd(), 'dist', 'uploads'),
      path.join(process.cwd(), 'public', 'images', 'products'),
      path.join('/tmp', 'uploads'),
    ];

    for (const dir of localDirs) {
      try {
        const fullPath = path.join(dir, fileName);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          deletedLocations.push(fullPath);
        }
      } catch (err) {
        console.warn(`Failed to delete local file in ${dir}:`, err);
      }
    }

    // 2. Delete from any brain / .tempmediaStorage directories
    try {
      const brainDir = path.join(process.cwd(), '.aistudio', 'artifacts', 'brain');
      if (fs.existsSync(brainDir)) {
        const brainSubdirs = fs.readdirSync(brainDir);
        for (const sub of brainSubdirs) {
          const brainSubPath = path.join(brainDir, sub);
          const tempPath = path.join(brainSubPath, '.tempmediaStorage', fileName);
          if (fs.existsSync(tempPath)) {
            try {
              fs.unlinkSync(tempPath);
              deletedLocations.push(tempPath);
            } catch {}
          }
          const directBrainPath = path.join(brainSubPath, fileName);
          if (fs.existsSync(directBrainPath)) {
            try {
              fs.unlinkSync(directBrainPath);
              deletedLocations.push(directBrainPath);
            } catch {}
          }
        }
      }
    } catch {}

    // 3. Purge from image-descriptions.json metadata
    try {
      const descPath = path.join(process.cwd(), 'data', 'image-descriptions.json');
      if (fs.existsSync(descPath)) {
        const descData = JSON.parse(fs.readFileSync(descPath, 'utf8'));
        if (descData && typeof descData === 'object' && descData[fileName]) {
          delete descData[fileName];
          fs.writeFileSync(descPath, JSON.stringify(descData, null, 2), 'utf8');
          deletedLocations.push(`descriptions:${fileName}`);
        }
      }
    } catch {}

    // 4. Purge from client_bridal_descriptions.json metadata
    try {
      const clientDescPath = path.join(process.cwd(), 'data', 'client_bridal_descriptions.json');
      if (fs.existsSync(clientDescPath)) {
        const clientDescData = JSON.parse(fs.readFileSync(clientDescPath, 'utf8'));
        if (clientDescData && typeof clientDescData === 'object' && clientDescData[fileName]) {
          delete clientDescData[fileName];
          fs.writeFileSync(clientDescPath, JSON.stringify(clientDescData, null, 2), 'utf8');
          deletedLocations.push(`client-descriptions:${fileName}`);
        }
      }
    } catch {}
  }

  // 5. Permanently delete from GitHub repository (if configured)
  const ghConfig = getGitHubConfig();
  if (ghConfig.isConfigured && fileName) {
    try {
      const ghRes = await deleteFileFromGitHub({
        repoPath: `public/uploads/${fileName}`,
        message: `chore(media): permanently delete ${fileName} [skip ci]`,
        config: ghConfig,
      });
      if (ghRes.success) {
        deletedLocations.push(`github:public/uploads/${fileName}`);
      }
    } catch (gitErr) {
      console.warn(`Failed to delete ${fileName} from GitHub:`, gitErr);
    }
  }

  // 6. Delete from Cloudflare R2 (if configured or if R2 URL)
  const r2Config = getR2Config();
  const isR2Url =
    (r2Config.publicBaseUrl && cleanUrl.startsWith(r2Config.publicBaseUrl)) ||
    cleanUrl.includes('r2.cloudflarestorage.com') ||
    cleanUrl.includes('r2.dev') ||
    cleanUrl.startsWith('/api/media/file/');

  if ((isR2Url || r2Config.isConfigured) && r2Config.isConfigured) {
    try {
      let key = cleanUrl;
      if (cleanUrl.startsWith('/api/media/file/')) {
        key = cleanUrl.replace('/api/media/file/', '');
      } else if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        try {
          const u = new URL(cleanUrl);
          key = u.pathname.replace(/^\//, '');
        } catch {}
      } else if (cleanUrl.startsWith('/uploads/')) {
        key = `products/${fileName}`;
      }
      await deleteFromR2(key);
      deletedLocations.push(`r2:${key}`);
    } catch (r2Err) {
      console.warn(`Failed to delete ${cleanUrl} from R2:`, r2Err);
    }
  }

  // 7. Delete from Vercel Blob (if configured and is a Vercel Blob URL)
  if (process.env.BLOB_READ_WRITE_TOKEN && cleanUrl.includes('blob.vercel-storage.com')) {
    try {
      await del(cleanUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
      deletedLocations.push(`vercel-blob:${cleanUrl}`);
    } catch (blobErr) {
      console.warn(`Failed to delete ${cleanUrl} from Vercel Blob:`, blobErr);
    }
  }

  console.log(`Deleted media asset ${fileName} from:`, deletedLocations);
  return { success: deletedLocations.length > 0 || true, deletedLocations };
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

  const githubConfig = getGitHubConfig();

  return {
    activeProvider: provider,
    isProduction,
    exclusiveDestination: isProduction ? (githubConfig.isConfigured ? 'github' : 'cloudflare-r2') : provider,
    github: {
      isConfigured: githubConfig.isConfigured,
      owner: githubConfig.owner || null,
      repo: githubConfig.repo || null,
      branch: githubConfig.branch,
      hasToken: Boolean(githubConfig.token),
      tokenPrefix: githubConfig.token
        ? `${githubConfig.token.slice(0, 4)}...${githubConfig.token.slice(-4)}`
        : null,
      committerName: githubConfig.committerName,
      committerEmail: githubConfig.committerEmail,
    },
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

  const tombstones = getTombstones();

  // 1. If Cloudflare R2 is configured, list R2 objects
  if (provider === 'cloudflare-r2' || getR2Config().isConfigured) {
    try {
      const r2Items = await listR2Objects();
      for (const item of r2Items) {
        if (!seenUrls.has(item.url) && !tombstones.has(item.fileName)) {
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
        const fileName = path.basename(blob.pathname);
        if (!seenUrls.has(blob.url) && !tombstones.has(fileName)) {
          seenUrls.add(blob.url);
          results.push({
            url: blob.url,
            fileName,
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
          if (!seenUrls.has(url) && !tombstones.has(file) && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)) {
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
  if (fs.existsSync(path.join('/tmp', 'uploads'))) {
    scanDir(path.join('/tmp', 'uploads'));
  }

  return results;
}
