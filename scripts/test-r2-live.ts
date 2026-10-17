
import dotenv from 'dotenv';
dotenv.config();

import { uploadToR2, getR2Object, deleteFromR2 } from '../server/r2.ts';
import crypto from 'node:crypto';

async function main() {
  let uploadedKey: string | undefined;

  // A tiny PNG test image. No existing media is used or modified.
  const imageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p5sAAAAASUVORK5CYII=',
    'base64'
  );

  const originalHash = crypto
    .createHash('sha256')
    .update(imageBuffer)
    .digest('hex');

  try {
    console.log('1/4 Uploading a temporary test image to Cloudflare R2...');

    const uploaded = await uploadToR2(
      imageBuffer,
      'r2-live-smoke-test.png',
      'image/png',
      'products'
    );

    uploadedKey = uploaded.key;

    console.log('Upload request succeeded.');
    console.log('Object key:', uploadedKey);
    console.log('Reported size:', uploaded.size, 'bytes');

    if (uploaded.sha256 !== originalHash) {
      throw new Error('Upload result SHA-256 does not match the test image.');
    }

    console.log('\n2/4 Reading the uploaded object back from R2...');

    const object = await getR2Object(uploadedKey);

    if (!object?.Body) {
      throw new Error('The uploaded object could not be read back.');
    }

    const downloadedBytes = Buffer.from(
      await object.Body.transformToByteArray()
    );

    const downloadedHash = crypto
      .createHash('sha256')
      .update(downloadedBytes)
      .digest('hex');

    if (!downloadedBytes.equals(imageBuffer)) {
      throw new Error('Read-back bytes differ from the original test image.');
    }

    if (downloadedHash !== originalHash) {
      throw new Error('Read-back SHA-256 verification failed.');
    }

    console.log('Read-back succeeded.');
    console.log('Byte-for-byte comparison: PASS');
    console.log('SHA-256 comparison: PASS');

    console.log('\n3/4 Deleting only the temporary test object...');

    const deleted = await deleteFromR2(uploadedKey);

    if (!deleted) {
      throw new Error(
        'Deletion was not confirmed. Check the object in the R2 dashboard.'
      );
    }

    console.log('Delete request succeeded.');

    console.log('\n4/4 Confirming the test object is gone...');

    const remainingObject = await getR2Object(uploadedKey);

    if (remainingObject !== null) {
      throw new Error(
        'The object still appears to exist after deletion. Check R2 manually.'
      );
    }

    uploadedKey = undefined;

    console.log('\nSUCCESS: Cloudflare R2 live smoke test passed.');
    console.log('Upload, read-back, byte comparison, and deletion verified.');
  } catch (error) {
    console.error('\nLIVE TEST FAILED.');

    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unexpected error occurred.');
    }

    if (uploadedKey) {
      console.log('Attempting cleanup of the test object only...');

      const cleanedUp = await deleteFromR2(uploadedKey);

      if (cleanedUp) {
        console.log('Cleanup request succeeded. Verify removal if needed.');
      } else {
        console.error(
          'Cleanup could not be confirmed. Check this object key in R2:',
          uploadedKey
        );
      }
    }

    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    'Unexpected test runner error:',
    error instanceof Error ? error.message : 'Unknown error'
  );
  process.exitCode = 1;
});
