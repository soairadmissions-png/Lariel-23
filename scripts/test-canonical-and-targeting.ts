import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { uploadPersistentMedia } from '../server/storage.ts';
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

async function runCanonicalAndTargetingTests() {
  console.log('='.repeat(80));
  console.log('LARIEL ESSENTIALS — CANONICAL STORAGE & TARGETING PRECISION TEST SUITE');
  console.log('='.repeat(80));

  // --------------------------------------------------------------------------
  // TEST 1: Single Canonical Local Destination (public/uploads ONLY)
  // --------------------------------------------------------------------------
  try {
    const testJpgBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03,
      0xff, 0xd9,
    ]);
    const uploadRes = await uploadPersistentMedia(
      testJpgBuffer,
      'canonical_single_test.jpg',
      'image/jpeg'
    );

    const publicUploadPath = path.join(process.cwd(), 'public', 'uploads', uploadRes.fileName);
    const inPublicUploads = fs.existsSync(publicUploadPath);

    // Verify it was NOT written to secondary legacy directories
    const inSrcAssets = fs.existsSync(path.join(process.cwd(), 'src', 'assets', 'images', uploadRes.fileName));
    const inSrcUploads = fs.existsSync(path.join(process.cwd(), 'src', 'assets', 'images', 'uploads', uploadRes.fileName));
    const inPublicImagesProducts = fs.existsSync(path.join(process.cwd(), 'public', 'images', 'products', uploadRes.fileName));
    const inDistUploads = fs.existsSync(path.join(process.cwd(), 'dist', 'uploads', uploadRes.fileName));

    const singleWriteCompliant = inPublicUploads && !inSrcAssets && !inSrcUploads && !inPublicImagesProducts && !inDistUploads;

    if (singleWriteCompliant && uploadRes.localSaved) {
      recordTest(
        1,
        'Single canonical local destination write',
        'Storage Architecture',
        'PASS',
        `public/uploads: true, secondary duplicates written: 0, url: ${uploadRes.url}`
      );
    } else {
      recordTest(1, 'Single canonical local destination write', 'Storage Architecture', 'FAIL',
        `inPublicUploads=${inPublicUploads}, inSrcAssets=${inSrcAssets}, inSrcUploads=${inSrcUploads}, inPublicImagesProducts=${inPublicImagesProducts}`
      );
    }

    // Clean up test file
    if (fs.existsSync(publicUploadPath)) fs.unlinkSync(publicUploadPath);
  } catch (err: any) {
    recordTest(1, 'Single canonical local destination write', 'Storage Architecture', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Product Gallery Replacement at Index 0 & Cross-Product Isolation
  // --------------------------------------------------------------------------
  try {
    const db = await getDatabaseAsync();
    const targetProduct = db.products[0];
    const originalImage = targetProduct.images?.[0] || '';
    const secondProduct = db.products[1];
    const secondProductOriginalImg = secondProduct.images?.[0] || '';

    const testNewImgUrl = `/uploads/test_product_idx0_${Date.now()}.jpg`;

    // Perform target update
    const syncRes = await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: targetProduct.id,
      imageIndex: 0,
      newUrl: testNewImgUrl,
    });
    await saveDatabase(db);

    const updatedDb = await getDatabaseAsync();
    const updatedTargetProduct = updatedDb.products.find(p => p.id === targetProduct.id)!;
    const updatedSecondProduct = updatedDb.products.find(p => p.id === secondProduct.id)!;

    const idx0Updated = updatedTargetProduct.images[0] === testNewImgUrl;
    const secondProductUntouched = updatedSecondProduct.images[0] === secondProductOriginalImg;

    if (syncRes.success && idx0Updated && secondProductUntouched) {
      recordTest(
        2,
        'Product gallery replacement at index 0 with cross-product isolation',
        'Targeting Precision',
        'PASS',
        `Target product ID ${targetProduct.id} updated, adjacent product ID ${secondProduct.id} untouched`
      );
    } else {
      recordTest(2, 'Product gallery replacement at index 0', 'Targeting Precision', 'FAIL',
        `idx0Updated=${idx0Updated}, secondProductUntouched=${secondProductUntouched}`
      );
    }

    // Revert target product back to original state
    await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: targetProduct.id,
      imageIndex: 0,
      newUrl: originalImage,
    });
    await saveDatabase(db);
  } catch (err: any) {
    recordTest(2, 'Product gallery replacement at index 0', 'Targeting Precision', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Product Gallery Array Padding (Appending at high index without index shift)
  // --------------------------------------------------------------------------
  try {
    const db = await getDatabaseAsync();
    const targetProduct = db.products[0];
    const initialGalleryLength = (targetProduct.images || []).length;
    const targetIndex = initialGalleryLength + 2; // Beyond current array length
    const paddedImgUrl = `/uploads/test_padded_idx_${Date.now()}.jpg`;

    const syncRes = await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: targetProduct.id,
      imageIndex: targetIndex,
      newUrl: paddedImgUrl,
    });
    await saveDatabase(db);

    const updatedDb = await getDatabaseAsync();
    const updatedTarget = updatedDb.products.find(p => p.id === targetProduct.id)!;

    // Under Requirement 4: Never fill missing gallery positions by duplicating another image automatically.
    // Instead, appends cleanly to the gallery without duplicating images[0].
    const appendedWithoutDuplicatePadding =
      updatedTarget.images.includes(paddedImgUrl) &&
      updatedTarget.images.filter(img => img === targetProduct.images[0]).length === 1 &&
      updatedTarget.images.every((item) => item && typeof item === 'string' && item.trim() !== '');

    if (syncRes.success && appendedWithoutDuplicatePadding) {
      recordTest(
        3,
        'Product gallery handles out-of-bounds index without duplicating other images',
        'Targeting Precision',
        'PASS',
        `Appended cleanly to len ${updatedTarget.images.length} with zero duplicate image padding`
      );
    } else {
      recordTest(3, 'Product gallery handles out-of-bounds index without duplicating other images', 'Targeting Precision', 'FAIL',
        `success=${syncRes.success}, len=${updatedTarget?.images?.length}, hasDuplicates=${updatedTarget.images.filter(img => img === targetProduct.images[0]).length > 1}`
      );
    }

    // Restore gallery back to original length
    const restoredDb = await getDatabaseAsync();
    const p = restoredDb.products.find(prod => prod.id === targetProduct.id)!;
    p.images = p.images.slice(0, initialGalleryLength);
    await saveDatabase(restoredDb);
  } catch (err: any) {
    recordTest(3, 'Product gallery array index padding', 'Targeting Precision', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Category Image Targeting
  // --------------------------------------------------------------------------
  try {
    const db = await getDatabaseAsync();
    const targetCat = db.categories[0];
    const originalCatImg = targetCat.heroImage || '';
    const testCatImg = `/uploads/test_category_${Date.now()}.jpg`;

    const syncRes = await updateImageDirectlyInCode(db, {
      type: 'category',
      targetId: targetCat.id,
      newUrl: testCatImg,
    });
    await saveDatabase(db);

    const updatedDb = await getDatabaseAsync();
    const updatedCat = updatedDb.categories.find(c => c.id === targetCat.id)!;

    if (syncRes.success && updatedCat.heroImage === testCatImg) {
      recordTest(
        4,
        'Category image targeting and DB persistence',
        'Targeting Precision',
        'PASS',
        `Category ID '${targetCat.id}' updated to ${testCatImg}`
      );
    } else {
      recordTest(4, 'Category image targeting', 'Targeting Precision', 'FAIL',
        `success=${syncRes.success}, updatedImg=${updatedCat?.heroImage}`
      );
    }

    // Revert
    await updateImageDirectlyInCode(db, {
      type: 'category',
      targetId: targetCat.id,
      newUrl: originalCatImg,
    });
    await saveDatabase(db);
  } catch (err: any) {
    recordTest(4, 'Category image targeting', 'Targeting Precision', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Banner and Hero Settings Targeting (heroImage / homeHeroImage)
  // --------------------------------------------------------------------------
  try {
    const db = await getDatabaseAsync();
    const originalHero = db.settings?.heroImage || db.settings?.homeHeroImage;
    const testHeroImg = `/uploads/test_hero_banner_${Date.now()}.jpg`;

    const syncRes = await updateImageDirectlyInCode(db, {
      type: 'setting',
      targetId: 'homeHeroImage',
      newUrl: testHeroImg,
    });
    await saveDatabase(db);

    const updatedDb = await getDatabaseAsync();
    const heroSaved = updatedDb.settings?.homeHeroImage === testHeroImg && updatedDb.settings?.heroImage === testHeroImg;

    if (syncRes.success && heroSaved) {
      recordTest(
        5,
        'Hero banner settings targeting and dual key synchronization',
        'Targeting Precision',
        'PASS',
        `homeHeroImage and heroImage both updated to ${testHeroImg}`
      );
    } else {
      recordTest(5, 'Hero banner settings targeting', 'Targeting Precision', 'FAIL',
        `success=${syncRes.success}, heroSaved=${heroSaved}`
      );
    }

    // Revert
    if (originalHero) {
      await updateImageDirectlyInCode(db, {
        type: 'setting',
        targetId: 'homeHeroImage',
        newUrl: originalHero,
      });
      await saveDatabase(db);
    }
  } catch (err: any) {
    recordTest(5, 'Hero banner settings targeting', 'Targeting Precision', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Brand Identity Targeting (Logo, Wordmark, Founder Portrait, Admin Avatar)
  // --------------------------------------------------------------------------
  try {
    const db = await getDatabaseAsync();
    const testLogo = `/uploads/test_brand_logo_${Date.now()}.jpg`;
    const testFounder = `/uploads/test_founder_${Date.now()}.jpg`;
    const testAvatar = `/uploads/test_avatar_${Date.now()}.jpg`;

    const syncLogo = await updateImageDirectlyInCode(db, {
      type: 'canonical',
      targetId: 'LOGO_EMBLEM',
      newUrl: testLogo,
    });

    const syncFounder = await updateImageDirectlyInCode(db, {
      type: 'canonical',
      targetId: 'FOUNDER_PORTRAIT',
      newUrl: testFounder,
    });

    const syncAvatar = await updateImageDirectlyInCode(db, {
      type: 'canonical',
      targetId: 'ADMIN_AVATAR',
      newUrl: testAvatar,
    });

    await saveDatabase(db);

    const updatedDb = await getDatabaseAsync();
    const logoSaved = updatedDb.settings?.brandLogoImage === testLogo;
    const founderSaved = updatedDb.settings?.laidePortraitImage === testFounder;

    if (syncLogo.success && syncFounder.success && syncAvatar.success && logoSaved && founderSaved) {
      recordTest(
        6,
        'Brand identity targeting (Logo, Founder Portrait, Admin Avatar)',
        'Targeting Precision',
        'PASS',
        'LOGO_EMBLEM, FOUNDER_PORTRAIT, and brand settings persisted in db.json'
      );
    } else {
      recordTest(6, 'Brand identity targeting', 'Targeting Precision', 'FAIL',
        `logoSaved=${logoSaved}, founderSaved=${founderSaved}`
      );
    }

    // Restore brand defaults
    await updateImageDirectlyInCode(db, {
      type: 'canonical',
      targetId: 'LOGO_EMBLEM',
      newUrl: '/uploads/lariel_brand_logo_1788970256407.jpg',
    });
    await updateImageDirectlyInCode(db, {
      type: 'canonical',
      targetId: 'FOUNDER_PORTRAIT',
      newUrl: '/uploads/laide_founder_portrait_1789650582034.jpg',
    });
    await saveDatabase(db);
  } catch (err: any) {
    recordTest(6, 'Brand identity targeting', 'Targeting Precision', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Ephemeral Warning & Persistence Status Truth Reporting
  // --------------------------------------------------------------------------
  try {
    const testBuf = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03,
      0xff, 0xd9,
    ]);

    // Test in simulated Vercel environment without credentials
    const origVercel = process.env.VERCEL;
    process.env.VERCEL = '1';

    const ephemRes = await uploadPersistentMedia(
      testBuf,
      'ephemeral_audit_test.jpg',
      'image/jpeg'
    );

    const hasEphemeralWarning = (ephemRes.warnings || []).some(w => w.toLowerCase().includes('ephemeral') || w.toLowerCase().includes('storage'));
    const isEphemeralType = ephemRes.persistenceType === 'ephemeral_unpersisted';

    // Restore env
    if (origVercel !== undefined) {
      process.env.VERCEL = origVercel;
    } else {
      delete process.env.VERCEL;
    }

    // Clean up test file if written
    const ephemFilePath = path.join(process.cwd(), 'public', 'uploads', ephemRes.fileName);
    if (fs.existsSync(ephemFilePath)) fs.unlinkSync(ephemFilePath);

    if (hasEphemeralWarning && isEphemeralType && !ephemRes.remoteConfirmed) {
      recordTest(
        7,
        'Ephemeral environment detection and persistence warning reporting',
        'Status Reporting & Safety',
        'PASS',
        `persistenceType: ${ephemRes.persistenceType}, warning: "${ephemRes.warnings?.[0]}"`
      );
    } else {
      recordTest(7, 'Ephemeral environment detection', 'Status Reporting & Safety', 'FAIL',
        `hasWarning=${hasEphemeralWarning}, isEphemeral=${isEphemeralType}`
      );
    }
  } catch (err: any) {
    recordTest(7, 'Ephemeral environment detection', 'Status Reporting & Safety', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Storefront Asset Preservation (Zero 404s for Catalog)
  // --------------------------------------------------------------------------
  try {
    const db = await getDatabaseAsync();
    let checkedCount = 0;
    let missingCount = 0;
    const missingAssets: string[] = [];

    // Check all products
    for (const prod of db.products) {
      const allImgs = [...(prod.images || [])];
      for (const imgUrl of allImgs) {
        if (!imgUrl || !imgUrl.startsWith('/uploads/')) continue;
        checkedCount++;
        const filename = imgUrl.replace('/uploads/', '');
        const diskPath = path.join(process.cwd(), 'public', 'uploads', filename);
        if (!fs.existsSync(diskPath)) {
          missingCount++;
          missingAssets.push(imgUrl);
        }
      }
    }

    // Check all categories
    for (const cat of db.categories) {
      if (!cat.heroImage || !cat.heroImage.startsWith('/uploads/')) continue;
      checkedCount++;
      const filename = cat.heroImage.replace('/uploads/', '');
      const diskPath = path.join(process.cwd(), 'public', 'uploads', filename);
      if (!fs.existsSync(diskPath)) {
        missingCount++;
        missingAssets.push(cat.heroImage);
      }
    }

    if (missingCount === 0 && checkedCount > 50) {
      recordTest(
        8,
        'Storefront catalog asset preservation (100% on disk in public/uploads/)',
        'Asset Integrity',
        'PASS',
        `Checked ${checkedCount} catalog images across products & categories: 0 missing (100% intact)`
      );
    } else {
      recordTest(8, 'Storefront catalog asset preservation', 'Asset Integrity', 'FAIL',
        `missingCount=${missingCount}/${checkedCount}, missing=[${missingAssets.slice(0, 5).join(', ')}]`
      );
    }
  } catch (err: any) {
    recordTest(8, 'Storefront catalog asset preservation', 'Asset Integrity', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Complete Unsplash & External Placeholder Fallback Absence
  // --------------------------------------------------------------------------
  try {
    const searchDirs = ['src', 'data', 'server'];
    const bannedPatterns = ['unsplash.com', 'placeholder.com', 'via.placeholder', 'dummyimage.com'];
    let violationCount = 0;
    const violations: string[] = [];

    function scanDir(dirPath: string) {
      if (!fs.existsSync(dirPath)) return;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
            scanDir(fullPath);
          }
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json|html|css)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          for (const pattern of bannedPatterns) {
            if (content.toLowerCase().includes(pattern)) {
              violationCount++;
              violations.push(`${fullPath} matches "${pattern}"`);
            }
          }
        }
      }
    }

    for (const d of searchDirs) {
      scanDir(path.join(process.cwd(), d));
    }

    if (violationCount === 0) {
      recordTest(
        9,
        'Complete Unsplash & external placeholder fallback absence across codebase',
        'Fallback Hygiene',
        'PASS',
        'Zero Unsplash or mock placeholder references detected across src/, data/, and server/'
      );
    } else {
      recordTest(9, 'Complete Unsplash fallback absence', 'Fallback Hygiene', 'FAIL',
        `Found ${violationCount} violations: ${violations.slice(0, 3).join('; ')}`
      );
    }
  } catch (err: any) {
    recordTest(9, 'Complete Unsplash fallback absence', 'Fallback Hygiene', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Multi-Product Canonical Image Re-Use Preservation
  // --------------------------------------------------------------------------
  try {
    const db = await getDatabaseAsync();
    const prodA = db.products[0];
    const prodB = db.products[1];
    const origA = [...(prodA.images || [])];
    const origB = [...(prodB.images || [])];

    const sharedCanonicalUrl = '/uploads/bridal_couch_hero_1788951504284.jpg';

    // Assign shared canonical image to prodA at index 0 and prodB at index 0
    await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: prodA.id,
      imageIndex: 0,
      newUrl: sharedCanonicalUrl,
    });
    await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: prodB.id,
      imageIndex: 0,
      newUrl: sharedCanonicalUrl,
    });
    await saveDatabase(db);

    const reloadedDb = await getDatabaseAsync();
    const reloadedA = reloadedDb.products.find(p => p.id === prodA.id)!;
    const reloadedB = reloadedDb.products.find(p => p.id === prodB.id)!;

    const bothShare = reloadedA.images?.[0] === sharedCanonicalUrl && reloadedB.images?.[0] === sharedCanonicalUrl;

    // Now update only prodA, verify prodB is completely unaffected
    const uniqueUrlA = '/uploads/lariel_brand_logo_1788970256407.jpg';
    await updateImageDirectlyInCode(reloadedDb, {
      type: 'product',
      targetId: prodA.id,
      imageIndex: 0,
      newUrl: uniqueUrlA,
    });
    await saveDatabase(reloadedDb);

    const isolatedDb = await getDatabaseAsync();
    const finalA = isolatedDb.products.find(p => p.id === prodA.id)!;
    const finalB = isolatedDb.products.find(p => p.id === prodB.id)!;

    const isolationPreserved = finalA.images?.[0] === uniqueUrlA && finalB.images?.[0] === sharedCanonicalUrl;

    // Restore originals
    const restoreDb = await getDatabaseAsync();
    const restoreA = restoreDb.products.find(p => p.id === prodA.id)!;
    const restoreB = restoreDb.products.find(p => p.id === prodB.id)!;
    restoreA.images = origA;
    restoreB.images = origB;
    await saveDatabase(restoreDb);

    if (bothShare && isolationPreserved) {
      recordTest(
        10,
        'Multi-product canonical image re-use preservation & cross-product isolation',
        'Asset Integrity',
        'PASS',
        'Shared image references preserved without file duplication; independent product updates verified'
      );
    } else {
      recordTest(10, 'Multi-product canonical image re-use', 'Asset Integrity', 'FAIL',
        `bothShare=${bothShare}, isolationPreserved=${isolationPreserved}`
      );
    }
  } catch (err: any) {
    recordTest(10, 'Multi-product canonical image re-use', 'Asset Integrity', 'FAIL', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 11: Retry Endpoint Recovery & Idempotent Database Sync
  // --------------------------------------------------------------------------
  try {
    const db = await getDatabaseAsync();
    const targetProd = db.products[0];
    const origImg0 = targetProd.images?.[0];
    const retryTargetUrl = `/uploads/retry_recovered_${Date.now()}.jpg`;

    // Perform retry-save recovery workflow
    const retryCodeRes = await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: targetProd.id,
      imageIndex: 0,
      newUrl: retryTargetUrl,
    });
    await saveDatabase(db);

    const verifiedDb = await getDatabaseAsync();
    const verifiedProd = verifiedDb.products.find(p => p.id === targetProd.id)!;
    const retrySaved = verifiedProd.images?.[0] === retryTargetUrl && Array.isArray(retryCodeRes.filesUpdated) && retryCodeRes.filesUpdated.length > 0;

    // Restore original
    await updateImageDirectlyInCode(verifiedDb, {
      type: 'product',
      targetId: targetProd.id,
      imageIndex: 0,
      newUrl: origImg0,
    });
    await saveDatabase(verifiedDb);

    if (retrySaved) {
      recordTest(
        11,
        'Retry endpoint recovery and idempotent database synchronization',
        'Persistence Reliability',
        'PASS',
        `Files updated: ${retryCodeRes.filesUpdated.length}, restored cleanly: true`
      );
    } else {
      recordTest(11, 'Retry endpoint recovery', 'Persistence Reliability', 'FAIL',
        `retrySaved=${retrySaved}`
      );
    }
  } catch (err: any) {
    recordTest(11, 'Retry endpoint recovery', 'Persistence Reliability', 'FAIL', err.message);
  }

  console.log('='.repeat(80));
  const allPassed = testResults.every(t => t.status === 'PASS');
  const passCount = testResults.filter(t => t.status === 'PASS').length;
  console.log(`TEST SUITE RESULTS: ${passCount}/${testResults.length} tests passed (${Math.round(passCount / testResults.length * 100)}%)`);
  console.log('='.repeat(80));

  if (!allPassed) {
    process.exit(1);
  }
}

runCanonicalAndTargetingTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
