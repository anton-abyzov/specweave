#!/usr/bin/env node
/**
 * Sync All Specs to GitHub
 *
 * This script syncs all living docs specs from .specweave/docs/internal/specs/
 * to GitHub Projects with linked issues for user stories.
 *
 * Usage:
 *   node .specweave/increments/0029-cicd-failure-detection-auto-fix/scripts/sync-all-specs-to-github.js
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GitHubSpecSync } from '../../../../dist/plugins/specweave-github/lib/github-spec-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('🔄 Syncing all specs to GitHub...\n');

  const cwd = process.cwd();
  const specsDir = path.join(cwd, '.specweave/docs/internal/specs/default');

  // Find all spec files
  const specFiles = fs.readdirSync(specsDir)
    .filter(f => f.startsWith('spec-') && f.endsWith('.md'))
    .filter(f => !f.includes('_archive') && !f.includes('_DEPRECATED'))
    .sort();

  console.log(`📄 Found ${specFiles.length} specs to sync:\n`);
  specFiles.forEach((file, i) => {
    console.log(`   ${i + 1}. ${file}`);
  });
  console.log('');

  // Initialize sync
  const sync = new GitHubSpecSync(cwd);

  const results = {
    success: [],
    failed: []
  };

  // Sync each spec
  for (const specFile of specFiles) {
    const specId = specFile.replace(/^spec-/, '').replace(/\.md$/, '');
    const specPath = path.join(specsDir, specFile);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 Syncing ${specId}...`);
    console.log(`   File: ${specFile}`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      const result = await sync.syncSpecToGitHub(specId);

      if (result.success) {
        console.log(`✅ Successfully synced ${specId}`);
        if (result.projectUrl) {
          console.log(`   🔗 GitHub Project: ${result.projectUrl}`);
        }
        if (result.issuesCreated) {
          console.log(`   📝 Created ${result.issuesCreated} issues`);
        }
        if (result.issuesUpdated) {
          console.log(`   🔄 Updated ${result.issuesUpdated} issues`);
        }
        results.success.push(specId);
      } else {
        console.log(`❌ Failed to sync ${specId}: ${result.error}`);
        results.failed.push({ spec: specId, error: result.error || 'Unknown error' });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error syncing ${specId}:`, errorMsg);
      results.failed.push({ spec: specId, error: errorMsg });
    }

    // Add delay between syncs to avoid rate limiting
    if (specFiles.indexOf(specFile) < specFiles.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next sync...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SYNC SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Successful: ${results.success.length}`);
  results.success.forEach(spec => console.log(`   - ${spec}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(({ spec, error }) => {
      console.log(`   - ${spec}: ${error}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n🎉 Sync complete! ${results.success.length}/${specFiles.length} specs synced successfully.`);

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
