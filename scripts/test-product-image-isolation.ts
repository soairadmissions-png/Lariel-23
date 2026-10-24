import fs from 'fs';
import path from 'path';
import { getDatabase, getDatabaseAsync, saveDatabase, updateProductAtomically, type DatabaseSchema, type DBProduct } from '../server/db.ts';
import { resolveProduct, resolveProductIndex, updateImageDirectlyInCode, ensureProductGallery } from '../server/codeSync.ts';

interface TestAssertion {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  details?: string;
}

const assertions: TestAssertion[] = [];

function assertTest(id: number, name: string, category: string, condition: boolean, details?: string) {
  assertions.push({ id, name, category, passed: condition, details });
  const tag = condition ? '✓ PASS' : '✗ FAIL';
  console.log(`  [${tag}] Test ${id}: ${name} ${details ? `(${details})` : ''}`);
  if (!condition) {
    console.error(`     FAILED: ${details}`);
  }
}

async function runRegressionTestSuite() {
  console.log('\n' + '='.repeat(85));
  console.log('LARIEL ESSENTIALS — PRODUCT IMAGE ISOLATION & CONCURRENCY VERIFICATION SUITE');
  console.log('='.repeat(85) + '\n');

  // Load fresh database
  const db = await getDatabaseAsync(true);
  const originalSnapshot = JSON.stringify(db);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Exact Unique ID Resolution vs Slug Collision
    // -------------------------------------------------------------------------
    console.log('--- Suite 1: Product Identification & ID/Slug Collision Resistance ---');
    const mockProducts: DBProduct[] = [
      {
        id: 'prod-primary-target',
        name: 'Target Dress',
        slug: 'shared-name-dress',
        subtitle: 'Signature robe',
        priceUSD: 100,
        category: 'bridal',
        style: 'Silk',
        collectionName: 'Signature',
        description: '',
        details: [],
        materials: '',
        sizingInfo: '',
        productionTime: '',
        shippingInfo: '',
        careInstructions: '',
        images: ['/uploads/initial_target.jpg'],
        colors: [],
        sizes: [],
        reviewsCount: 0,
        rating: 5,
        crossSellIds: [],
        status: 'published',
        stockQuantity: 10,
        stockStatus: 'in_stock',
        sku: 'TEST-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'shared-name-dress', // Collision: this product's ID equals product 0's slug!
        name: 'Colliding ID Product',
        slug: 'colliding-slug-robe',
        subtitle: 'Colliding robe',
        priceUSD: 120,
        category: 'bridal',
        style: 'Silk',
        collectionName: 'Signature',
        description: '',
        details: [],
        materials: '',
        sizingInfo: '',
        productionTime: '',
        shippingInfo: '',
        careInstructions: '',
        images: ['/uploads/initial_colliding.jpg'],
        colors: [],
        sizes: [],
        reviewsCount: 0,
        rating: 5,
        crossSellIds: [],
        status: 'published',
        stockQuantity: 10,
        stockStatus: 'in_stock',
        sku: 'TEST-2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // When resolving by 'shared-name-dress', exact ID of product 1 MUST match, NOT product 0 by slug!
    const resolvedById = resolveProduct(mockProducts, 'shared-name-dress');
    assertTest(
      1,
      'Exact unique ID match takes precedence over another product\'s slug',
      'Product Identification',
      resolvedById !== undefined && resolvedById.id === 'shared-name-dress' && resolvedById.name === 'Colliding ID Product',
      `Matched: ${resolvedById?.id} (${resolvedById?.name})`
    );

    // When resolving by non-existent ID, returns undefined
    const resolvedNone = resolveProduct(mockProducts, 'non-existent-product-id');
    assertTest(
      2,
      'Non-existent target product ID returns undefined (prevents arbitrary fallback)',
      'Product Identification',
      resolvedNone === undefined,
      'Undefined returned as expected'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Strict Isolation Across Three Distinct Products
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 2: Cross-Product Image Isolation (Products A, B, C) ---');
    const prodA = db.products[0]; // e.g. amanda-3d-petals-robe
    const prodB = db.products[3]; // e.g. classic-silk-robe
    const prodC = db.products[4]; // e.g. sunset-robe

    const origImgA = [...(prodA.images || [])];
    const origImgB = [...(prodB.images || [])];
    const origImgC = [...(prodC.images || [])];

    const uniqueImgA = `/uploads/test_isolated_A_${Date.now()}.jpg`;
    const uniqueImgB = `/uploads/test_isolated_B_${Date.now()}.jpg`;
    const uniqueImgC = `/uploads/test_isolated_C_${Date.now()}.jpg`;

    // 2.1 Update Product A
    await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: prodA.id,
      imageIndex: 0,
      newUrl: uniqueImgA,
    });
    await saveDatabase(db);

    const check1 = await getDatabaseAsync(true);
    const afterA_prodA = check1.products.find(p => p.id === prodA.id)!;
    const afterA_prodB = check1.products.find(p => p.id === prodB.id)!;
    const afterA_prodC = check1.products.find(p => p.id === prodC.id)!;

    assertTest(
      3,
      'Updating Product A changes Product A images',
      'Cross-Product Isolation',
      afterA_prodA.images[0] === uniqueImgA,
      `Product A primary image is ${afterA_prodA.images[0]}`
    );

    assertTest(
      4,
      'Updating Product A leaves Product B completely unchanged',
      'Cross-Product Isolation',
      JSON.stringify(afterA_prodB.images) === JSON.stringify(origImgB),
      `Product B images preserved identically`
    );

    assertTest(
      5,
      'Updating Product A leaves Product C completely unchanged',
      'Cross-Product Isolation',
      JSON.stringify(afterA_prodC.images) === JSON.stringify(origImgC),
      `Product C images preserved identically`
    );

    // 2.2 Update Product B
    await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: prodB.id,
      imageRole: 'hover',
      newUrl: uniqueImgB,
    });
    await saveDatabase(db);

    const check2 = await getDatabaseAsync(true);
    const afterB_prodA = check2.products.find(p => p.id === prodA.id)!;
    const afterB_prodB = check2.products.find(p => p.id === prodB.id)!;
    const afterB_prodC = check2.products.find(p => p.id === prodC.id)!;

    assertTest(
      6,
      'Updating Product B hover slot changes Product B and does not affect Product A or C',
      'Cross-Product Isolation',
      afterB_prodB.images[1] === uniqueImgB &&
      afterB_prodA.images[0] === uniqueImgA &&
      JSON.stringify(afterB_prodC.images) === JSON.stringify(origImgC),
      `Product B hover updated to ${afterB_prodB.images[1]}; Product A and C preserved`
    );

    // 2.3 Update Product C
    await updateImageDirectlyInCode(db, {
      type: 'product',
      targetId: prodC.id,
      imageRole: 'gallery',
      imageIndex: 2,
      newUrl: uniqueImgC,
    });
    await saveDatabase(db);

    const check3 = await getDatabaseAsync(true);
    const afterC_prodA = check3.products.find(p => p.id === prodA.id)!;
    const afterC_prodB = check3.products.find(p => p.id === prodB.id)!;
    const afterC_prodC = check3.products.find(p => p.id === prodC.id)!;

    assertTest(
      7,
      'Updating Product C gallery slot changes Product C without affecting Product A or B',
      'Cross-Product Isolation',
      afterC_prodC.images.includes(uniqueImgC) &&
      afterC_prodA.images[0] === uniqueImgA &&
      afterC_prodB.images[1] === uniqueImgB,
      `All 3 products hold their respective distinct images simultaneously`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Rapid Concurrent Updates Without Overwriting
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 3: Concurrency & Atomic Queue Protection ---');
    const concurrentImgA = `/uploads/concurrent_A_${Date.now()}.jpg`;
    const concurrentImgB = `/uploads/concurrent_B_${Date.now()}.jpg`;
    const concurrentImgC = `/uploads/concurrent_C_${Date.now()}.jpg`;

    // Launch three updates in parallel simultaneously using updateProductAtomically
    await Promise.all([
      updateProductAtomically(prodA.id, async (p) => {
        p.images[0] = concurrentImgA;
        return p;
      }),
      updateProductAtomically(prodB.id, async (p) => {
        p.images[0] = concurrentImgB;
        return p;
      }),
      updateProductAtomically(prodC.id, async (p) => {
        p.images[0] = concurrentImgC;
        return p;
      }),
    ]);

    const checkConcurrent = await getDatabaseAsync(true);
    const finalA = checkConcurrent.products.find(p => p.id === prodA.id)!;
    const finalB = checkConcurrent.products.find(p => p.id === prodB.id)!;
    const finalC = checkConcurrent.products.find(p => p.id === prodC.id)!;

    const allThreeSucceeded =
      finalA.images[0] === concurrentImgA &&
      finalB.images[0] === concurrentImgB &&
      finalC.images[0] === concurrentImgC;

    assertTest(
      8,
      'Simultaneous concurrent updates all persist without race conditions or overwriting',
      'Concurrency Control',
      allThreeSucceeded,
      `Final images: A=${finalA.images[0] === concurrentImgA}, B=${finalB.images[0] === concurrentImgB}, C=${finalC.images[0] === concurrentImgC}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Gallery Handling — No Automatic Image Duplication
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 4: Gallery Handling & Zero Duplication Rule ---');
    const singleImgProd = { ...mockProducts[0], images: ['/uploads/single_original.jpg'] };
    ensureProductGallery(singleImgProd);

    // Appending a new gallery image to a product with 1 image
    const appendImg = '/uploads/appended_gallery_img.jpg';
    const testDb: DatabaseSchema = {
      products: [singleImgProd],
      categories: [],
      orders: [],
      admins: [],
      activityLogs: [],
    };

    await updateImageDirectlyInCode(testDb, {
      type: 'product',
      targetId: singleImgProd.id,
      imageRole: 'gallery',
      newUrl: appendImg,
      persist: false,
    });

    const resultingGallery = testDb.products[0].images;
    const containsNoDuplicates = new Set(resultingGallery).size === resultingGallery.length;
    const didNotDuplicateSlot0 = resultingGallery.filter(url => url === '/uploads/single_original.jpg').length === 1;
    const appendedAtEnd = resultingGallery[resultingGallery.length - 1] === appendImg;

    assertTest(
      9,
      'Never duplicate another image when appending to gallery',
      'Gallery Precision',
      containsNoDuplicates && didNotDuplicateSlot0 && appendedAtEnd,
      `Gallery: [${resultingGallery.join(', ')}] (Length: ${resultingGallery.length})`
    );

    // Replacing specific slot preserves surrounding slots
    const multiSlotProd = {
      ...mockProducts[0],
      images: ['/uploads/slot0.jpg', '/uploads/slot1.jpg', '/uploads/slot2.jpg']
    };
    ensureProductGallery(multiSlotProd);
    const multiDb: DatabaseSchema = {
      products: [multiSlotProd],
      categories: [],
      orders: [],
      admins: [],
      activityLogs: [],
    };

    const replacementUrl = '/uploads/replacement_for_slot1.jpg';
    await updateImageDirectlyInCode(multiDb, {
      type: 'product',
      targetId: multiSlotProd.id,
      imageId: `${multiSlotProd.id}__hover`, // Target slot 1
      newUrl: replacementUrl,
      persist: false,
    });

    const multiResult = multiDb.products[0].images;
    const slot0Preserved = multiResult[0] === '/uploads/slot0.jpg';
    const slot1Replaced = multiResult[1] === replacementUrl;
    const slot2Preserved = multiResult[2] === '/uploads/slot2.jpg';

    assertTest(
      10,
      'Replacing slot 1 preserves slot 0 and slot 2 in exact original order',
      'Gallery Precision',
      slot0Preserved && slot1Replaced && slot2Preserved,
      `Slot 0: ${slot0Preserved}, Slot 1: ${slot1Replaced}, Slot 2: ${slot2Preserved}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Persistence Verification (Disk & Code)
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 5: Persistence Across Disk & Code Files ---');
    const diskDb = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'db.json'), 'utf8'));
    const productsTs = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'products.ts'), 'utf8');

    const inDiskDbA = diskDb.products.some((p: any) => p.id === prodA.id && p.images[0] === concurrentImgA);
    const inProductsTsA = productsTs.includes(concurrentImgA);

    assertTest(
      11,
      'Product update is saved to data/db.json and persists in src/data/products.ts',
      'Persistence',
      inDiskDbA && inProductsTsA,
      `In data/db.json: ${inDiskDbA}, in src/data/products.ts: ${inProductsTsA}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Validation Rejection on Invalid Target Product ID
    // -------------------------------------------------------------------------
    console.log('\n--- Suite 6: Strict Input Validation & Error Propagation ---');
    let threwError = false;
    try {
      await updateImageDirectlyInCode(db, {
        type: 'product',
        targetId: 'invalid-non-existent-id-12345',
        newUrl: '/uploads/should_fail.jpg',
      });
    } catch (err: any) {
      threwError = true;
    }

    assertTest(
      12,
      'Attempting to update an invalid target product throws and aborts without saving',
      'Validation',
      threwError,
      `Error thrown: ${threwError}`
    );

  } finally {
    // Restore pristine database state
    console.log('\nRestoring pristine database snapshot...');
    const restored = JSON.parse(originalSnapshot);
    await saveDatabase(restored);
    console.log('Restoration complete.');
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(85));
  console.log('REGRESSION TEST RESULTS SUMMARY');
  console.log('='.repeat(85));
  const passedCount = assertions.filter(a => a.passed).length;
  const failedCount = assertions.filter(a => !a.passed).length;
  console.log(`TOTAL TESTS: ${assertions.length}`);
  console.log(`PASSED:      ${passedCount}`);
  console.log(`FAILED:      ${failedCount}`);
  console.log('='.repeat(85) + '\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRegressionTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
