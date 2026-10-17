import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getR2Client, getR2Config } from '../server/r2';

dotenv.config({ path: '.env.production.local', override: true });

const manifestPath = path.resolve('data/r2-migration-manifest.json');
const execute = process.argv.includes('--execute');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

function sha256(data: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  return types[ext] || 'application/octet-stream';
}

function isMissingObject(error: any): boolean {
  return (
    error?.$metadata?.httpStatusCode === 404 ||
    error?.name === 'NoSuchKey' ||
    error?.name === 'NotFound'
  );
}

async function readR2Object(client: any, bucket: string, key: string) {
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!result.Body) throw new Error(`R2 returned an empty body for ${key}`);
  return Buffer.from(await result.Body.transformToByteArray());
}

async function main() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.items) || manifest.items.length === 0) {
    throw new Error('Manifest has no items.');
  }

  const config = getR2Config();
  if (!config.isConfigured) {
    throw new Error('R2 is not fully configured in .env.production.local.');
  }
  if (config.bucketName !== 'client-images') {
    throw new Error(`Unexpected R2 bucket: ${config.bucketName}`);
  }
  if (manifest.r2Bucket && manifest.r2Bucket !== config.bucketName) {
    throw new Error(
      `Manifest bucket (${manifest.r2Bucket}) does not match configured bucket (${config.bucketName}).`,
    );
  }

  const client = getR2Client();
  if (!client) throw new Error('Could not create the R2 client.');

  // Group all references by destination key. Different hashes for one key
  // are unsafe, so reject them before making any changes.
  const groups = new Map<string, any[]>();
  for (const item of manifest.items) {
    if (!item.destinationKey || !item.sourceFilePath || !item.sourceSha256) {
      throw new Error('An item is missing its destination key, source path, or SHA-256.');
    }
    const key = String(item.destinationKey).replace(/^\/+/, '');
    if (!key) throw new Error('A destination key is empty.');

    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }

  for (const [key, items] of groups) {
    const hashes = new Set(items.map((item) => String(item.sourceSha256).toLowerCase()));
    if (hashes.size !== 1) {
      throw new Error(`Conflicting source hashes target the same key: ${key}`);
    }
  }

  // Read and validate every distinct source file before uploading anything.
  const sourceBuffers = new Map<string, Buffer>();
  for (const item of manifest.items) {
    const sourcePath = path.isAbsolute(item.sourceFilePath)
      ? item.sourceFilePath
      : path.resolve(item.sourceFilePath);

    if (!sourceBuffers.has(sourcePath)) {
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source file is missing: ${sourcePath}`);
      }
      sourceBuffers.set(sourcePath, fs.readFileSync(sourcePath));
    }

    const actualHash = sha256(sourceBuffers.get(sourcePath)!);
    if (actualHash !== String(item.sourceSha256).toLowerCase()) {
      throw new Error(`Source SHA-256 mismatch: ${sourcePath}`);
    }
  }

  const entries = [...groups.entries()].slice(0, limit);

  console.log(`Bucket: ${config.bucketName}`);
  console.log(`Manifest references: ${manifest.items.length}`);
  console.log(`Unique destination keys: ${groups.size}`);
  console.log(`Keys selected this run: ${entries.length}`);
  console.log(`Mode: ${execute ? 'UPLOAD AND VERIFY' : 'DRY RUN'}`);
  console.log('All source files and destination-key hashes validated.');

  if (!execute) {
    console.log('Dry run only. No R2 objects were changed.');
    console.log('Add --execute to upload.');
    return;
  }

  let uploaded = 0;
  let alreadyCorrect = 0;

  for (const [key, items] of entries) {
    const item = items[0];
    const sourcePath = path.isAbsolute(item.sourceFilePath)
      ? item.sourceFilePath
      : path.resolve(item.sourceFilePath);
    const buffer = sourceBuffers.get(sourcePath)!;
    const expectedHash = String(item.sourceSha256).toLowerCase();

    // If the key exists, never overwrite it unless its content is already
    // exactly correct. Unexpected errors stop the process.
    let exists = false;
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: config.bucketName, Key: key }),
      );
      exists = true;
    } catch (error: any) {
      if (!isMissingObject(error)) throw error;
    }

    if (exists) {
      const existing = await readR2Object(client, config.bucketName, key);
      const existingHash = sha256(existing);
      if (existingHash !== expectedHash) {
        throw new Error(
          `SAFETY STOP: R2 key already exists with different content: ${key}`,
        );
      }
      console.log(`ALREADY VERIFIED: ${key}`);
      alreadyCorrect++;
      continue;
    }

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType(sourcePath),
        Metadata: { sha256: expectedHash },
      }),
    );

    const downloaded = await readR2Object(client, config.bucketName, key);
    const downloadedHash = sha256(downloaded);

    if (downloadedHash !== expectedHash) {
      throw new Error(`UPLOAD VERIFICATION FAILED: ${key}`);
    }

    console.log(`UPLOADED AND VERIFIED: ${key}`);
    uploaded++;
  }

  console.log('--- RESULT ---');
  console.log(`Uploaded and verified: ${uploaded}`);
  console.log(`Already present and verified: ${alreadyCorrect}`);
  console.log('Database changed: NO');
  console.log('Manifest changed: NO');
  console.log('R2 objects deleted: NO');
}

main().catch((error) => {
  console.error('R2 media upload stopped:', error.message || error);
  process.exitCode = 1;
});
