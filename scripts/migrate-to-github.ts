import dotenv from 'dotenv';
import { getDatabaseAsync } from '../server/db.ts';
import { getGitHubConfig, getGitHubDiagnostics } from '../server/github.ts';
import { scanForVercelBlobs, migrateVercelBlobsToGitHub } from '../server/migration.ts';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isVerify = args.includes('--verify');

  console.log('='.repeat(80));
  console.log('LARIEL ESSENTIALS — GITHUB REPOSITORY MEDIA MIGRATION');
  console.log('='.repeat(80));

  const ghConfig = getGitHubConfig();
  console.log('GitHub Configuration Status:');
  console.log(`  - Configured: ${ghConfig.isConfigured ? 'YES' : 'NO'}`);
  console.log(`  - Owner: ${ghConfig.owner || '(not set)'}`);
  console.log(`  - Repository: ${ghConfig.repo || '(not set)'}`);
  console.log(`  - Target Branch: ${ghConfig.branch}`);
  console.log(`  - Committer: ${ghConfig.committerName} <${ghConfig.committerEmail}>`);
  console.log(`  - Token Present: ${Boolean(ghConfig.token) ? 'YES' : 'NO'}`);

  if (ghConfig.isConfigured) {
    const diag = await getGitHubDiagnostics();
    console.log(`  - GitHub API Connectivity: ${diag.apiConnected ? 'CONNECTED' : 'DISCONNECTED'}`);
    if (diag.repoPermissions) {
      console.log(`  - Push (Write) Permission: ${diag.repoPermissions.push ? 'YES' : 'NO'}`);
    }
    if (diag.error) {
      console.warn(`  - Notice: ${diag.error}`);
    }
  } else {
    console.log('  - Note: Images will be saved to public/uploads/ and local codebase.');
  }

  console.log('-'.repeat(80));

  const db = await getDatabaseAsync();
  const blobsToMigrate = scanForVercelBlobs(db);

  console.log(`Found ${blobsToMigrate.length} media assets eligible for migration:`);
  for (const item of blobsToMigrate) {
    console.log(`  - [${item.type}] ${item.targetId}: ${item.originalUrl}`);
  }

  if (isVerify) {
    console.log('\nVerification complete. Run with --dry-run or without flags to execute.');
    return;
  }

  if (blobsToMigrate.length === 0) {
    console.log('\nAll images in catalog are already stored in local repository/uploads. No migration needed!');
    return;
  }

  console.log(`\nStarting migration ${isDryRun ? '(DRY RUN - no files will be written)' : '(LIVE)'}...`);
  const result = await migrateVercelBlobsToGitHub({ dryRun: isDryRun });

  console.log('\nMigration Complete:');
  console.log(`  - Total found: ${result.totalFound}`);
  console.log(`  - Migrated: ${result.migratedCount}`);
  console.log(`  - Failed: ${result.failedCount}`);
  console.log(`  - Skipped: ${result.skippedCount}`);

  for (const item of result.items) {
    const statusIcon = item.status === 'MIGRATED' ? '✓' : item.status === 'FAILED' ? '✗' : '○';
    console.log(`  ${statusIcon} [${item.status}] ${item.id} -> ${item.migratedUrl || item.originalUrl} ${item.githubCommitted ? '(GitHub committed)' : ''}`);
    if (item.error) {
      console.log(`      Error: ${item.error}`);
    }
  }

  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
