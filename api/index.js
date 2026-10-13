// server/vercel.ts
import express2 from "express";

// server/api.ts
import express from "express";
import path4 from "path";

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
      const { put: put2 } = await import("@vercel/blob");
      await put2("database/db.json", JSON.stringify(data, null, 2), {
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
import path3 from "path";
import { put, list } from "@vercel/blob";

// server/r2.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path2 from "path";
function getR2Config() {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucketName = (process.env.R2_BUCKET_NAME || "").trim();
  const endpoint = (process.env.R2_ENDPOINT || "").trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").trim();
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
    isConfigured
  };
}
var cachedS3Client = null;
var lastClientEndpoint = "";
function getR2Client() {
  const config = getR2Config();
  if (!config.isConfigured) return null;
  if (!cachedS3Client || lastClientEndpoint !== config.endpoint) {
    cachedS3Client = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    lastClientEndpoint = config.endpoint;
  }
  return cachedS3Client;
}
var PERMITTED_FOLDERS = [
  "products",
  "collections",
  "banners",
  "gallery",
  "editorial"
];
var PERMITTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif"
];
var MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_BYTES) || 15 * 1024 * 1024;
function validateImageBuffer(buffer, declaredMime) {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Empty file buffer provided." };
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    return {
      valid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum permitted limit of ${maxMb}MB.`
    };
  }
  const headerText = buffer.slice(0, 1024).toString("utf8").toLowerCase();
  if (headerText.includes("<script") || headerText.includes("<?php") || headerText.includes("<html") || headerText.includes("<!doctype") || headerText.includes("<svg")) {
    return {
      valid: false,
      error: "Unsafe file format detected. HTML, scripts, and SVG files are not permitted for security reasons."
    };
  }
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return { valid: true, detectedMime: "image/jpeg", detectedExt: "jpg" };
  }
  if (buffer.length >= 8 && buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71 && buffer[4] === 13 && buffer[5] === 10 && buffer[6] === 26 && buffer[7] === 10) {
    return { valid: true, detectedMime: "image/png", detectedExt: "png" };
  }
  if (buffer.length >= 6 && buffer[0] === 71 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 56 && (buffer[4] === 55 || buffer[4] === 57) && buffer[5] === 97) {
    return { valid: true, detectedMime: "image/gif", detectedExt: "gif" };
  }
  if (buffer.length >= 12 && buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") {
    return { valid: true, detectedMime: "image/webp", detectedExt: "webp" };
  }
  if (buffer.length >= 12) {
    const ftyp = buffer.slice(4, 12).toString("ascii");
    if (ftyp.includes("ftypavif") || ftyp.includes("ftypavis")) {
      return { valid: true, detectedMime: "image/avif", detectedExt: "avif" };
    }
  }
  return {
    valid: false,
    error: "Unsupported image format. Only JPEG, PNG, WebP, AVIF, and GIF formats are allowed."
  };
}
function getPublicUrl(key) {
  const config = getR2Config();
  const cleanKey = key.replace(/^\//, "");
  if (config.publicBaseUrl) {
    return `${config.publicBaseUrl.replace(/\/$/, "")}/${cleanKey}`;
  }
  if (config.bucketName && config.accountId) {
    return `https://${config.bucketName}.${config.accountId}.r2.dev/${cleanKey}`;
  }
  return `/api/media/file/${cleanKey}`;
}
function generateObjectKey(originalFilename, folder = "products", forcedExt, contentHash) {
  const safeFolder = PERMITTED_FOLDERS.includes(folder.toLowerCase()) ? folder.toLowerCase() : "products";
  const rawExt = forcedExt || path2.extname(originalFilename).replace(".", "").toLowerCase() || "jpg";
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const baseName = path2.basename(originalFilename, path2.extname(originalFilename));
  const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) || "media";
  const suffix = contentHash ? contentHash.slice(0, 10) : `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  return `${safeFolder}/${cleanName}_${suffix}.${ext}`;
}
async function uploadToR2(buffer, originalFilename, contentType, folder = "products") {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured) {
    throw new Error(
      "Cloudflare R2 is not configured. Please set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME."
    );
  }
  const validation = validateImageBuffer(buffer, contentType);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid image buffer.");
  }
  const mime = validation.detectedMime || contentType || "image/jpeg";
  const ext = validation.detectedExt || "jpg";
  const fileSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const objectKey = generateObjectKey(originalFilename, folder, ext, fileSha256);
  const cleanOriginalName = path2.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    Body: buffer,
    ContentType: mime,
    Metadata: {
      originalName: cleanOriginalName,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      sha256: fileSha256,
      sourceSha256: fileSha256
    }
  });
  await client.send(command);
  const url = getPublicUrl(objectKey);
  return {
    url,
    key: objectKey,
    fileName: path2.basename(objectKey),
    size: buffer.length,
    contentType: mime,
    sha256: fileSha256
  };
}
async function getPresignedUploadUrl(filename, contentType, folder = "products", expiresInSeconds = 300) {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured) {
    throw new Error("Cloudflare R2 is not configured.");
  }
  if (!PERMITTED_MIME_TYPES.includes(contentType)) {
    throw new Error(
      `Unsupported MIME type "${contentType}". Only JPEG, PNG, WebP, AVIF, and GIF are allowed.`
    );
  }
  const objectKey = generateObjectKey(filename, folder);
  const cleanOriginalName = path2.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    ContentType: contentType,
    Metadata: {
      originalName: cleanOriginalName,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: expiresInSeconds
  });
  const publicUrl = getPublicUrl(objectKey);
  return {
    uploadUrl,
    publicUrl,
    key: objectKey,
    expiresIn: expiresInSeconds
  };
}
async function deleteFromR2(keyOrUrl) {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured || !keyOrUrl) return false;
  let key = keyOrUrl;
  if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
    try {
      const u = new URL(keyOrUrl);
      key = u.pathname.replace(/^\//, "");
    } catch {
      key = keyOrUrl;
    }
  }
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key
      })
    );
    return true;
  } catch (err) {
    console.warn(`Could not delete object "${key}" from Cloudflare R2:`, err);
    return false;
  }
}
async function listR2Objects(prefix = "") {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured) return [];
  try {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: prefix || void 0,
      MaxKeys: 1e3
    });
    const res = await client.send(command);
    const results = [];
    if (res.Contents) {
      for (const obj of res.Contents) {
        if (!obj.Key) continue;
        results.push({
          url: getPublicUrl(obj.Key),
          fileName: path2.basename(obj.Key),
          size: obj.Size || 0,
          createdAt: obj.LastModified?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
          key: obj.Key
        });
      }
    }
    return results;
  } catch (err) {
    console.error("Failed to list objects from Cloudflare R2:", err);
    return [];
  }
}
async function getR2Object(key) {
  const client = getR2Client();
  const config = getR2Config();
  if (!client || !config.isConfigured) return null;
  try {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key
    });
    return await client.send(command);
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

// server/storage.ts
function getStorageProvider() {
  if (getR2Config().isConfigured || process.env.STORAGE_PROVIDER === "cloudflare-r2") {
    return "cloudflare-r2";
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return "vercel-blob";
  }
  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    return "cloudinary";
  }
  return "local";
}
async function uploadPersistentMedia(buffer, originalFilename, contentType, folder = "products") {
  const provider = getStorageProvider();
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.STORAGE_PROVIDER === "cloudflare-r2";
  if (provider === "cloudflare-r2") {
    try {
      const res = await uploadToR2(buffer, originalFilename, contentType, folder);
      return {
        url: res.url,
        fileName: res.fileName,
        size: res.size,
        key: res.key,
        sha256: res.sha256
      };
    } catch (err) {
      console.error("Cloudflare R2 upload failed:", err);
      throw new Error(`Cloudflare R2 upload error: ${err.message || err}`);
    }
  }
  if (isProduction) {
    throw new Error(
      "Production configuration error: Cloudflare R2 is required as the exclusive production upload destination, but R2 is not configured. Please configure CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME."
    );
  }
  const rawExt = path3.extname(originalFilename).replace(".", "").toLowerCase() || "jpg";
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const baseName = path3.basename(originalFilename, path3.extname(originalFilename));
  const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30) || "image";
  const fileName = `${cleanName}_${Date.now()}.${ext}`;
  const mime = contentType || (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg");
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobPath = `${folder}/${fileName}`;
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
      console.error("Vercel Blob upload failed:", err);
    }
  }
  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
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
          public_id: `${folder}/${cleanName}_${Date.now()}`
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
      console.error("Cloudinary upload failed:", err);
    }
  }
  let targetDir = path3.join(process.cwd(), "public", "uploads");
  try {
    if (!fs2.existsSync(targetDir)) {
      fs2.mkdirSync(targetDir, { recursive: true });
    }
  } catch {
    targetDir = path3.join("/tmp", "uploads");
    if (!fs2.existsSync(targetDir)) {
      try {
        fs2.mkdirSync(targetDir, { recursive: true });
      } catch {
      }
    }
  }
  const filePath = path3.join(targetDir, fileName);
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
  const r2Config = getR2Config();
  const isR2Url = r2Config.publicBaseUrl && url.startsWith(r2Config.publicBaseUrl) || url.includes("r2.cloudflarestorage.com") || url.includes("r2.dev") || url.startsWith("/api/media/file/");
  if (isR2Url && r2Config.isConfigured) {
    let key = url;
    if (url.startsWith("/api/media/file/")) {
      key = url.replace("/api/media/file/", "");
    } else {
      try {
        const u = new URL(url);
        key = u.pathname.replace(/^\//, "");
      } catch {
      }
    }
    await deleteFromR2(key);
    return;
  }
}
function getStorageDiagnostics() {
  const provider = getStorageProvider();
  const r2Config = getR2Config();
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || process.env.STORAGE_PROVIDER === "cloudflare-r2";
  return {
    activeProvider: provider,
    isProduction,
    exclusiveDestination: isProduction ? "cloudflare-r2" : provider,
    r2: {
      isConfigured: r2Config.isConfigured,
      bucketName: r2Config.bucketName || null,
      endpointConfigured: Boolean(r2Config.endpoint),
      endpointHost: r2Config.endpoint ? new URL(r2Config.endpoint).host : null,
      publicBaseUrl: r2Config.publicBaseUrl || null,
      hasAccountId: Boolean(r2Config.accountId),
      hasAccessKeyId: Boolean(r2Config.accessKeyId),
      hasSecretAccessKey: Boolean(r2Config.secretAccessKey)
    },
    legacy: {
      vercelBlobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY
      )
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function listPersistentMedia() {
  const provider = getStorageProvider();
  const results = [];
  const seenUrls = /* @__PURE__ */ new Set();
  if (provider === "cloudflare-r2" || getR2Config().isConfigured) {
    try {
      const r2Items = await listR2Objects();
      for (const item of r2Items) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          results.push({
            ...item,
            source: "cloudflare-r2"
          });
        }
      }
    } catch (err) {
      console.warn("Could not list media from Cloudflare R2:", err);
    }
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const response = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      for (const blob of response.blobs) {
        if (!seenUrls.has(blob.url)) {
          seenUrls.add(blob.url);
          results.push({
            url: blob.url,
            fileName: path3.basename(blob.pathname),
            size: blob.size,
            createdAt: blob.uploadedAt.toISOString(),
            source: "vercel-blob"
          });
        }
      }
    } catch (err) {
      console.warn("Could not list media from Vercel Blob:", err);
    }
  }
  const scanDir = (dir) => {
    if (fs2.existsSync(dir)) {
      try {
        const files = fs2.readdirSync(dir);
        for (const file of files) {
          const url = `/uploads/${file}`;
          if (!seenUrls.has(url) && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)) {
            seenUrls.add(url);
            const fullPath = path3.join(dir, file);
            let size = 0;
            let mtime = (/* @__PURE__ */ new Date()).toISOString();
            try {
              const stat = fs2.statSync(fullPath);
              size = stat.size;
              mtime = stat.mtime.toISOString();
            } catch {
            }
            results.push({
              url,
              fileName: file,
              size,
              createdAt: mtime,
              source: "local"
            });
          }
        }
      } catch {
      }
    }
  };
  scanDir(path3.join(process.cwd(), "public", "uploads"));
  scanDir(path3.join(process.cwd(), "src", "assets", "images"));
  scanDir(path3.join("/tmp", "uploads"));
  return results;
}

// server/auth.ts
import crypto2 from "crypto";
var SESSION_SECRET = (process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || "").trim() || "lariel_bridal_prod_session_secret_2026_secured";
var TOKEN_TTL_MS = 24 * 60 * 60 * 1e3;
var REVOKED_LEGACY_TOKENS = /* @__PURE__ */ new Set([
  "lariel_super_admin_sec_token_2026",
  "demo-admin-token",
  "admin-token",
  "token123"
]);
function generateAdminSessionToken(admin) {
  const now = Date.now();
  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    iat: now,
    exp: now + TOKEN_TTL_MS
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto2.createHmac("sha256", SESSION_SECRET).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${signature}`;
}
function verifyAdminSessionToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Authorization token missing." };
  }
  if (REVOKED_LEGACY_TOKENS.has(token.trim())) {
    return { valid: false, error: "Legacy token has been revoked. Re-authentication required." };
  }
  const parts = token.trim().split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Invalid token format." };
  }
  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto2.createHmac("sha256", SESSION_SECRET).update(payloadBase64).digest("base64url");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto2.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, error: "Invalid token signature." };
  }
  try {
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    if (!payload.sub || !payload.exp) {
      return { valid: false, error: "Malformed token payload." };
    }
    if (Date.now() > payload.exp) {
      return { valid: false, error: "Token has expired. Please log in again." };
    }
    return { valid: true, adminId: payload.sub, payload };
  } catch {
    return { valid: false, error: "Failed to decode token payload." };
  }
}
function verifyAdminCredentials(email, pass) {
  if (!email || !pass) {
    return { success: false, error: "Email and password are required." };
  }
  const cleanEmail = email.trim().toLowerCase();
  const db = getDatabase();
  const admins = db.admins || [];
  const admin = admins.find(
    (a) => a.email.toLowerCase() === cleanEmail || cleanEmail === "admin@larielessentials.com" && a.email.toLowerCase() === "admin@larielextravaganza.com"
  );
  if (!admin) {
    return { success: false, error: "Administrator account not found." };
  }
  const envPassword = (process.env.ADMIN_PASSWORD || "").trim();
  if (envPassword && pass === envPassword) {
    return { success: true, admin };
  }
  if (admin.passwordHash && admin.passwordSalt) {
    const calculatedHash = crypto2.pbkdf2Sync(pass, admin.passwordSalt, 1e4, 64, "sha512").toString("hex");
    if (calculatedHash === admin.passwordHash) {
      return { success: true, admin };
    }
    return { success: false, error: "Invalid password." };
  }
  const acceptedInitialPasswords = ["admin123", "lariel2026"];
  if (acceptedInitialPasswords.includes(pass)) {
    return { success: true, admin };
  }
  return { success: false, error: "Invalid credentials." };
}
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: Authorization header required." });
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) {
    return res.status(401).json({ error: "Unauthorized: Bearer token format required." });
  }
  const token = match[1].trim();
  const verification = verifyAdminSessionToken(token);
  if (!verification.valid || !verification.adminId) {
    return res.status(401).json({ error: `Unauthorized: ${verification.error || "Invalid session token."}` });
  }
  const db = getDatabase();
  const admins = db.admins || [];
  const admin = admins.find((a) => a.id === verification.adminId);
  if (!admin) {
    return res.status(403).json({ error: "Forbidden: Admin user record not found." });
  }
  req.adminUser = admin;
  return next();
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
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const verification = verifyAdminCredentials(email, password);
  if (!verification.success || !verification.admin) {
    return res.status(401).json({
      error: verification.error || "Invalid administrator email or password."
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
      avatar: admin.avatar
    }
  });
});
router.get("/auth/me", requireAdmin, (req, res) => {
  const admin = req.adminUser;
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
router.get(["/admin/storage/diagnostics", "/storage/diagnostics"], requireAdmin, (_req, res) => {
  const diagnostics = getStorageDiagnostics();
  res.json(diagnostics);
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
function isImageReferencedInDb(db, url, currentProductId) {
  if (!url) return false;
  if (db.products?.some((p) => p.id !== currentProductId && p.images?.includes(url))) {
    return true;
  }
  if (db.categories?.some((c) => c.heroImage === url)) {
    return true;
  }
  if (db.settings) {
    if (db.settings.homeHeroImage === url || db.settings.laidePortraitImage === url || db.settings.brandLogoImage === url) {
      return true;
    }
  }
  if (db.realBrides?.some((b) => b.image === url)) {
    return true;
  }
  return false;
}
function isDeletableMediaUrl(url) {
  if (typeof url !== "string") return false;
  const r2 = getR2Config();
  if (r2.publicBaseUrl && url.startsWith(r2.publicBaseUrl)) return true;
  if (url.includes("r2.cloudflarestorage.com") || url.includes(".r2.dev") || url.startsWith("/api/media/file/")) return true;
  if (url.includes("blob.vercel-storage.com")) return true;
  return false;
}
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
      if (isDeletableMediaUrl(oldImg) && !finalImages.includes(oldImg)) {
        const isReferencedElsewhere = isImageReferencedInDb(db, oldImg, existing.id);
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
      if (isDeletableMediaUrl(img)) {
        const isReferencedElsewhere = isImageReferencedInDb(db, img, product.id);
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
router.post("/upload/presign", requireAdmin, async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { filename, contentType, folder, size } = req.body || {};
    if (!filename || typeof filename !== "string") {
      return res.status(400).json({ error: "Filename is required for presigned upload." });
    }
    if (!contentType || typeof contentType !== "string") {
      return res.status(400).json({ error: "Content-Type is required for presigned upload." });
    }
    if (size && Number(size) > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: `File size exceeds maximum permitted limit of ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`
      });
    }
    const safeFolder = folder && PERMITTED_FOLDERS.includes(folder.toLowerCase()) ? folder.toLowerCase() : "products";
    const presigned = await getPresignedUploadUrl(filename, contentType, safeFolder, 300);
    await logActivity(`Generated presigned R2 upload URL for ${filename}`);
    return res.status(200).json(presigned);
  } catch (err) {
    console.error("Presigned upload generation error:", err);
    return res.status(500).json({ error: err?.message || "Failed to generate presigned upload URL." });
  }
});
router.post(["/upload", "/upload-raw"], requireAdmin, async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const rawFilename = req.query.filename || req.headers["x-filename"] || req.body?.filename || req.body?.name || `media_${Date.now()}.jpg`;
    let decodedFilename = "image.jpg";
    try {
      decodedFilename = decodeURIComponent(rawFilename);
    } catch {
      decodedFilename = rawFilename;
    }
    const cleanFilename = path4.basename(decodedFilename).replace(/[^a-zA-Z0-9._-]/g, "_") || `media_${Date.now()}.jpg`;
    const folderParam = req.query.folder || req.headers["x-folder"] || req.body?.folder || "products";
    const safeFolder = PERMITTED_FOLDERS.includes(folderParam.toLowerCase()) ? folderParam.toLowerCase() : "products";
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
    const validation = validateImageBuffer(fileBuffer, contentType);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error || "Invalid or unsupported image file." });
    }
    const validatedMime = validation.detectedMime || contentType || "image/jpeg";
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
      blob: { url: result.url }
      // Backward-compatibility
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({ error: err?.message || "Image upload failed." });
  }
});
router.get("/media/file/:key(*)", async (req, res) => {
  const key = req.params.key;
  if (!key) {
    return res.status(400).json({ error: "Media object key required." });
  }
  try {
    const obj = await getR2Object(key);
    if (!obj || !obj.Body) {
      return res.status(404).json({ error: "Object not found in Cloudflare R2." });
    }
    if (obj.ContentType) res.setHeader("Content-Type", obj.ContentType);
    if (obj.ContentLength) res.setHeader("Content-Length", obj.ContentLength);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (typeof obj.Body.pipe === "function") {
      obj.Body.pipe(res);
    } else {
      const bytes = await obj.Body.transformToByteArray();
      res.end(Buffer.from(bytes));
    }
  } catch (err) {
    console.error(`Error streaming R2 media [${key}]:`, err);
    return res.status(404).json({ error: "Failed to retrieve media file." });
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
router.delete("/media", requireAdmin, async (req, res) => {
  try {
    const targetUrl = req.body?.url || req.query.url || req.body?.key || req.query.key;
    if (!targetUrl || typeof targetUrl !== "string") {
      return res.status(400).json({ error: "Target media URL or key is required for deletion." });
    }
    const db = getDatabase();
    const isReferenced = isImageReferencedInDb(db, targetUrl);
    if (isReferenced) {
      return res.status(409).json({
        error: "Cannot delete media: asset is currently referenced by products or site settings."
      });
    }
    await deletePersistentMedia(targetUrl);
    const adminUser = req.adminUser;
    await logActivity(`Deleted media asset: ${path4.basename(targetUrl)}`, adminUser?.name);
    return res.status(200).json({ success: true, deleted: targetUrl });
  } catch (err) {
    console.error("Delete media error:", err);
    return res.status(500).json({ error: err?.message || "Failed to delete media asset." });
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
