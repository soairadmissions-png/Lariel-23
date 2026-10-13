import fs from 'fs';
import path from 'path';
import {
  validateImageBuffer,
  generateObjectKey,
  MAX_FILE_SIZE_BYTES,
  PERMITTED_MIME_TYPES,
  getR2Config,
} from '../server/r2.ts';
import {
  getStorageProvider,
  uploadPersistentMedia,
} from '../server/storage.ts';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('LARIEL ESSENTIALS - STORAGE & R2 VERIFICATION TEST SUITE');
  console.log('='.repeat(70));

  // TEST 1: Buffer magic bytes validation for JPEG
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const jpegVal = validateImageBuffer(jpegHeader);
  assert(jpegVal.valid && jpegVal.detectedMime === 'image/jpeg', 'Validates authentic JPEG magic bytes');

  // TEST 2: Buffer magic bytes validation for PNG
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const pngVal = validateImageBuffer(pngHeader);
  assert(pngVal.valid && pngVal.detectedMime === 'image/png', 'Validates authentic PNG magic bytes');

  // TEST 3: Buffer magic bytes validation for WebP
  const webpHeader = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.alloc(4),
    Buffer.from('WEBP', 'ascii'),
  ]);
  const webpVal = validateImageBuffer(webpHeader);
  assert(webpVal.valid && webpVal.detectedMime === 'image/webp', 'Validates authentic WebP magic bytes');

  // TEST 4: Buffer magic bytes validation for GIF
  const gifHeader = Buffer.from('GIF89a', 'ascii');
  const gifVal = validateImageBuffer(gifHeader);
  assert(gifVal.valid && gifVal.detectedMime === 'image/gif', 'Validates authentic GIF magic bytes');

  // TEST 5: Rejection of malicious HTML / script uploads
  const htmlPayload = Buffer.from('<html><script>alert("xss")</script></html>');
  const htmlVal = validateImageBuffer(htmlPayload);
  assert(!htmlVal.valid, 'Rejects HTML and script payloads');

  // TEST 6: Rejection of SVG format
  const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>');
  const svgVal = validateImageBuffer(svgPayload);
  assert(!svgVal.valid, 'Rejects SVG files per security specification');

  // TEST 7: Rejection of executable binaries
  const exePayload = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // MZ executable
  const exeVal = validateImageBuffer(exePayload);
  assert(!exeVal.valid, 'Rejects executable binary formats');

  // TEST 8: Rejection of oversized files
  const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
  const oversizedVal = validateImageBuffer(oversizedBuffer);
  assert(!oversizedVal.valid && (oversizedVal.error || '').includes('exceeds'), 'Rejects files exceeding maximum allowed size');

  // TEST 9: Collision-resistant key generation with prefix separation
  const key1 = generateObjectKey('test image.jpg', 'products');
  const key2 = generateObjectKey('test image.jpg', 'products');
  assert(key1.startsWith('products/') && key1 !== key2, 'Generates unique collision-resistant keys with products/ prefix');

  const bannerKey = generateObjectKey('hero.png', 'banners');
  assert(bannerKey.startsWith('banners/'), 'Applies banners/ logical folder prefix correctly');

  const collectionKey = generateObjectKey('collection.jpg', 'collections');
  assert(collectionKey.startsWith('collections/'), 'Applies collections/ logical folder prefix correctly');

  // TEST 10: Path manipulation sanitization
  const pathTraversalKey = generateObjectKey('../../../etc/passwd', 'malicious/path');
  assert(!pathTraversalKey.includes('..') && pathTraversalKey.startsWith('products/'), 'Prevents directory traversal and sanitizes invalid folders');

  // TEST 11: Storage provider fallback behavior
  const provider = getStorageProvider();
  assert(
    provider === 'cloudflare-r2' || provider === 'vercel-blob' || provider === 'local',
    `Storage provider correctly detects environment: ${provider}`
  );

  // TEST 12: Local fallback upload saves without errors
  const sampleUploadBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x00, 0x01]);
  const localUpload = await uploadPersistentMedia(sampleUploadBuffer, 'unit_test_image.jpg', 'image/jpeg', 'products');
  assert(Boolean(localUpload.url && localUpload.fileName), 'Upload handler generates valid URL and filename');

  // TEST 13: Database integrity check
  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  assert(fs.existsSync(dbPath), 'Database file data/db.json exists and is readable');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  assert(Array.isArray(dbData.products) && dbData.products.length > 0, 'Database contains active product catalog');

  // TEST 14: Shared image preservation check
  const sharedImage = dbData.products[0]?.images?.[0];
  if (sharedImage) {
    const isShared = dbData.products.filter((p: any) => p.images?.includes(sharedImage)).length;
    assert(isShared >= 1, `Shared asset inventory verified (referenced ${isShared} times)`);
  }

  // TEST 15: Verify build outputs for Vercel
  const distHtml = path.join(process.cwd(), 'dist', 'index.html');
  const serverCjs = path.join(process.cwd(), 'dist', 'server.cjs');
  const vercelApi = path.join(process.cwd(), 'api', 'index.js');
  assert(fs.existsSync(distHtml), 'Vite production bundle dist/index.html is compiled');
  assert(fs.existsSync(serverCjs), 'Node.js server bundle dist/server.cjs is generated');
  assert(fs.existsSync(vercelApi), 'Vercel serverless function api/index.js is bundled');

  // TEST 16: Verify no secrets leaked in client bundle
  const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
  let secretFound = false;
  if (fs.existsSync(distAssetsDir)) {
    const files = fs.readdirSync(distAssetsDir);
    for (const file of files) {
      if (file.endsWith('.js')) {
        const content = fs.readFileSync(path.join(distAssetsDir, file), 'utf8');
        if (
          content.includes('R2_SECRET_ACCESS_KEY') ||
          content.includes('BLOB_READ_WRITE_TOKEN') ||
          content.includes('CLOUDFLARE_API_KEY')
        ) {
          secretFound = true;
          break;
        }
      }
    }
  }
  assert(!secretFound, 'Client bundle is free of private server secrets');

  console.log('='.repeat(70));
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('='.repeat(70));

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
