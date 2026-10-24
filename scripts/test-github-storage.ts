import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import dotenv from 'dotenv';
import {
  getGitHubConfig,
  generateSafeUniqueFilename,
  commitFileToGitHub,
  getGitHubDiagnostics,
  type GitHubConfig,
} from '../server/github.ts';
import { validateImageBuffer } from '../server/r2.ts';
import { uploadPersistentMedia, getStorageDiagnostics } from '../server/storage.ts';
import { getDatabaseAsync, saveDatabase, type DatabaseSchema } from '../server/db.ts';
import { updateImageDirectlyInCode } from '../server/codeSync.ts';

dotenv.config();

export interface TestResult {
  id: number;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const testResults: TestResult[] = [];

function recordTest(id: number, name: string, category: string, status: 'PASS' | 'FAIL', details?: string) {
  testResults.push({ id, name, category, status, details });
  const icon = status === 'PASS' ? '✓ PASS' : '✗ FAIL';
  console.log(`  [${icon}] Test ${id}: ${name} ${details ? `(${details})` : ''}`);
}

async function runTestSuite() {
  console.log('='.repeat(80));
  console.log('LARIEL ESSENTIALS — GITHUB STORAGE & PERSISTENCE VERIFICATION SUITE');
  console.log('='.repeat(80));

  // --------------------------------------------------------------------------
  // TEST 1: Image Magic Bytes & Upload Validation
  // --------------------------------------------------------------------------
  try {
    // 1a. Valid JPEG magic bytes: FF D8 FF E0
    const validJpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const valJpg = validateImageBuffer(validJpg, 'image/jpeg');

    // 1b. Valid PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const valPng = validateImageBuffer(validPng, 'image/png');

    // 1c. Invalid HTML / script file
    const maliciousScript = Buffer.from('<script>alert("hack")</script>', 'utf8');
    const valScript = validateImageBuffer(maliciousScript, 'image/jpeg');

    // 1d. Invalid SVG file
    const svgFile = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>', 'utf8');
    const valSvg = validateImageBuffer(svgFile, 'image/svg+xml');

    const isValid = valJpg.valid && valPng.valid && !valScript.valid && !valSvg.valid;

    recordTest(
      1,
      'Upload file validation & magic bytes inspection',
      'Security & Validation',
      isValid ? 'PASS' : 'FAIL',
      `JPEG: ${valJpg.valid}, PNG: ${valPng.valid}, Script blocked: ${!valScript.valid}, SVG blocked: ${!valSvg.valid}`
    );
  } catch (err: any) {
    recordTest(1, 'Upload file validation & magic bytes inspection', 'Security & Validation', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Safe Unique Filename Generation
  // --------------------------------------------------------------------------
  try {
    const rawName1 = 'Couture Bridal Robe (White & Gold) 2026!@#.jpeg';
    const rawName2 = 'Couture Bridal Robe (White & Gold) 2026!@#.jpeg';

    const fn1 = generateSafeUniqueFilename(rawName1);
    const fn2 = generateSafeUniqueFilename(rawName2);

    const isUnique = fn1 !== fn2;
    const isSafeChars = /^[a-z0-9_]+_[0-9]+_[a-f0-9]{6}\.jpg$/.test(fn1);
    const hasCorrectExt = fn1.endsWith('.jpg');

    recordTest(
      2,
      'Safe unique filename generation',
      'Naming & Sanitization',
      isUnique && isSafeChars && hasCorrectExt ? 'PASS' : 'FAIL',
      `Generated: ${fn1} (safe: ${isSafeChars}, unique: ${isUnique})`
    );
  } catch (err: any) {
    recordTest(2, 'Safe unique filename generation', 'Naming & Sanitization', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Local Filesystem Storage (public/uploads & public/images/products)
  // --------------------------------------------------------------------------
  let testUploadedFileName = '';
  try {
    const testJpgBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0xff, 0xd9,
    ]);

    const uploadRes = await uploadPersistentMedia(
      testJpgBuffer,
      'github_test_robe.jpg',
      'image/jpeg',
      'products'
    );

    testUploadedFileName = uploadRes.fileName;
    const pubPath = path.join(process.cwd(), 'public', 'uploads', testUploadedFileName);
    const existsOnDisk = fs.existsSync(pubPath);
    const readBuffer = existsOnDisk ? fs.readFileSync(pubPath) : Buffer.from([]);
    const matchesBytes = Buffer.compare(testJpgBuffer, readBuffer) === 0;

    recordTest(
      3,
      'Local codebase persistence in public/uploads/',
      'Filesystem Storage',
      existsOnDisk && matchesBytes ? 'PASS' : 'FAIL',
      `File: ${testUploadedFileName}, Bytes verified: ${matchesBytes}, URL: ${uploadRes.url}`
    );
  } catch (err: any) {
    recordTest(3, 'Local codebase persistence in public/uploads/', 'Filesystem Storage', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: GitHub API Commit Workflow (Simulated Mock GitHub API Server)
  // --------------------------------------------------------------------------
  try {
    let mockServerReceivedBody: any = null;
    let mockServerReceivedAuth = '';
    let mockConflictTriggered = false;

    // Start a temporary mock GitHub server on an ephemeral local port
    const mockServer = http.createServer((req, res) => {
      mockServerReceivedAuth = req.headers['authorization'] || '';

      if (req.method === 'GET' && req.url?.includes('/contents/')) {
        // Return existing file SHA or 404
        if (req.url.includes('existing_file')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sha: 'existing_sha_123456' }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Not Found' }));
        }
        return;
      }

      if (req.method === 'PUT' && req.url?.includes('/contents/')) {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          mockServerReceivedBody = JSON.parse(body);

          // Simulate 409 conflict once to test retry handling if header requested
          if (req.headers['x-simulate-conflict'] && !mockConflictTriggered) {
            mockConflictTriggered = true;
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Git conflict: ref was updated' }));
            return;
          }

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            content: {
              name: path.basename(req.url!),
              path: req.url,
              sha: 'sha_committed_987654321',
              html_url: `https://github.com/mock-owner/mock-repo/blob/main/${req.url}`,
            },
            commit: {
              sha: 'commit_sha_abcdef123456',
              message: mockServerReceivedBody.message,
            },
          }));
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => resolve());
    });

    const addr = mockServer.address() as any;
    const mockPort = addr.port;

    // Temporarily point mock GitHub request by intercepting fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = input.toString();
      if (urlStr.includes('api.github.com/repos/mock-owner/mock-repo')) {
        const mockUrl = urlStr.replace('https://api.github.com', `http://127.0.0.1:${mockPort}`);
        return originalFetch(mockUrl, init);
      }
      return originalFetch(input, init);
    };

    const mockConfig: GitHubConfig = {
      token: 'ghp_mock_token_secret_1234567890abcdef',
      owner: 'mock-owner',
      repo: 'mock-repo',
      branch: 'main',
      committerName: 'Lariel Essentials Admin',
      committerEmail: 'admin@larielextravaganza.com',
      isConfigured: true,
    };

    const testBuf = Buffer.from('Binary image content for GitHub commit test', 'utf8');
    const commitResult = await commitFileToGitHub({
      repoPath: 'public/uploads/test_mock_commit.jpg',
      buffer: testBuf,
      message: 'feat(media): test image commit',
      config: mockConfig,
    });

    // Restore fetch and close mock server
    globalThis.fetch = originalFetch;
    mockServer.close();

    const verifiedAuth = mockServerReceivedAuth.includes('Bearer ghp_mock_token_secret');
    const verifiedBase64 = mockServerReceivedBody?.content === testBuf.toString('base64');
    const verifiedSuccess = commitResult.success && commitResult.sha === 'sha_committed_987654321';

    recordTest(
      4,
      'GitHub REST API binary commit workflow & SHA verification',
      'GitHub API Integration',
      verifiedAuth && verifiedBase64 && verifiedSuccess ? 'PASS' : 'FAIL',
      `Auth header sent: ${verifiedAuth}, Base64 verified: ${verifiedBase64}, Commit SHA: ${commitResult.commitSha}`
    );
  } catch (err: any) {
    recordTest(4, 'GitHub REST API binary commit workflow & SHA verification', 'GitHub API Integration', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Concurrent Commit Collision & Conflict (HTTP 409) Retry Handling
  // --------------------------------------------------------------------------
  try {
    let putAttempts = 0;
    const conflictMockServer = http.createServer((req, res) => {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sha: `dynamic_sha_attempt_${putAttempts}` }));
        return;
      }
      if (req.method === 'PUT') {
        putAttempts++;
        if (putAttempts === 1) {
          // First attempt fails with 409 Conflict
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Conflict: branch head has moved' }));
          return;
        }
        // Second attempt succeeds
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          content: { sha: 'sha_recovered_after_conflict' },
          commit: { sha: 'commit_sha_recovered_456' },
        }));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => {
      conflictMockServer.listen(0, '127.0.0.1', () => resolve());
    });

    const cAddr = conflictMockServer.address() as any;
    const cPort = cAddr.port;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = input.toString();
      if (urlStr.includes('api.github.com/repos/conflict-owner/conflict-repo')) {
        const mockUrl = urlStr.replace('https://api.github.com', `http://127.0.0.1:${cPort}`);
        return originalFetch(mockUrl, init);
      }
      return originalFetch(input, init);
    };

    const conflictConfig: GitHubConfig = {
      token: 'ghp_conflict_token',
      owner: 'conflict-owner',
      repo: 'conflict-repo',
      branch: 'main',
      committerName: 'Lariel Admin',
      committerEmail: 'admin@larielextravaganza.com',
      isConfigured: true,
    };

    const res = await commitFileToGitHub({
      repoPath: 'public/uploads/concurrent_test.jpg',
      buffer: Buffer.from('conflict test'),
      config: conflictConfig,
      maxRetries: 2,
    });

    globalThis.fetch = originalFetch;
    conflictMockServer.close();

    const handledRetry = res.success && res.sha === 'sha_recovered_after_conflict' && putAttempts === 2;

    recordTest(
      5,
      'Concurrent commit collision & 409 conflict retry resilience',
      'Concurrency & Resilience',
      handledRetry ? 'PASS' : 'FAIL',
      `Attempts: ${putAttempts}, Recovered: ${res.success}, Final SHA: ${res.sha}`
    );
  } catch (err: any) {
    recordTest(5, 'Concurrent commit collision & 409 conflict retry resilience', 'Concurrency & Resilience', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Token Masking & Diagnostic Sanitization
  // --------------------------------------------------------------------------
  try {
    const rawToken = 'ghp_superSecretToken1234567890abcdefgh';
    process.env.GITHUB_TOKEN = rawToken;
    process.env.GITHUB_OWNER = 'lariel-brand';
    process.env.GITHUB_REPO = 'lariel-essentials-ecommerce';

    const diag = await getGitHubDiagnostics();
    const storageDiag = getStorageDiagnostics();

    // Verify token itself is NOT exposed in plain text in diagnostics
    const tokenIsMasked = !JSON.stringify(diag).includes(rawToken);
    const storageTokenIsMasked = !JSON.stringify(storageDiag).includes(rawToken);
    const hasPrefix = diag.tokenPrefix === 'ghp_...efgh';

    recordTest(
      6,
      'Token confidentiality & credential masking',
      'Security',
      tokenIsMasked && storageTokenIsMasked && hasPrefix ? 'PASS' : 'FAIL',
      `Token secret protected: ${tokenIsMasked}, Prefix: ${diag.tokenPrefix}`
    );
  } catch (err: any) {
    recordTest(6, 'Token confidentiality & credential masking', 'Security', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Database Persistence & Code Reference Synchronization
  // --------------------------------------------------------------------------
  try {
    const db = await getDatabaseAsync(true);
    const testProduct = db.products[0];
    const originalImage = testProduct.images[0];

    const newTestImageUrl = `/uploads/github_sync_test_${Date.now()}.jpg`;

    // Apply update to product in code and database
    const updateResult = await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: testProduct.id,
      imageIndex: 0,
      newUrl: newTestImageUrl,
    });

    // Verify disk database read
    const reloadedDb = await getDatabaseAsync(true);
    const reloadedProduct = reloadedDb.products.find((p) => p.id === testProduct.id);
    const dbPersisted = reloadedProduct?.images[0] === newTestImageUrl;

    // Verify src/data/products.ts content
    const productsTsContent = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'products.ts'), 'utf8');
    const codePersisted = productsTsContent.includes(newTestImageUrl);

    // Restore original image
    await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: testProduct.id,
      imageIndex: 0,
      newUrl: originalImage,
    });

    recordTest(
      7,
      'Authoritative database persistence & code reference sync',
      'Data Integrity',
      dbPersisted && codePersisted ? 'PASS' : 'FAIL',
      `data/db.json persisted: ${dbPersisted}, src/data/products.ts synced: ${codePersisted}`
    );
  } catch (err: any) {
    recordTest(7, 'Authoritative database persistence & code reference sync', 'Data Integrity', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Storefront Static Image Delivery Resolution
  // --------------------------------------------------------------------------
  try {
    // Check that public/uploads is configured and test file is readable
    const sampleImage = fs.readdirSync(path.join(process.cwd(), 'public', 'uploads'))[0];
    const filePath = path.join(process.cwd(), 'public', 'uploads', sampleImage);
    const stat = fs.statSync(filePath);
    const isReadable = stat.isFile() && stat.size > 0;

    recordTest(
      8,
      'Storefront static image resolution from public/uploads/',
      'Asset Delivery',
      isReadable ? 'PASS' : 'FAIL',
      `Sample asset: /uploads/${sampleImage} (${(stat.size / 1024).toFixed(1)} KB)`
    );
  } catch (err: any) {
    recordTest(8, 'Storefront static image resolution from public/uploads/', 'Asset Delivery', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Production Build Integrity
  // --------------------------------------------------------------------------
  try {
    const hasDistIndex = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'));
    const hasServerCjs = fs.existsSync(path.join(process.cwd(), 'dist', 'server.cjs'));
    const hasApiIndex = fs.existsSync(path.join(process.cwd(), 'api', 'index.js'));
    const buildOk = hasDistIndex && hasServerCjs && hasApiIndex;

    recordTest(
      9,
      'Production build bundle integrity',
      'Build & Packaging',
      buildOk ? 'PASS' : 'FAIL',
      `dist/index.html: ${hasDistIndex}, dist/server.cjs: ${hasServerCjs}, api/index.js: ${hasApiIndex}`
    );
  } catch (err: any) {
    recordTest(9, 'Production build bundle integrity', 'Build & Packaging', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('='.repeat(80));
  const passed = testResults.filter((t) => t.status === 'PASS').length;
  const total = testResults.length;
  console.log(`TEST SUITE RESULTS: ${passed}/${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log('='.repeat(80));

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
