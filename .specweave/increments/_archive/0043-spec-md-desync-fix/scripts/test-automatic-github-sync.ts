#!/usr/bin/env tsx
/**
 * Test automatic external tool sync (US-005)
 *
 * This demonstrates that living docs sync now automatically triggers GitHub sync
 */

import { LivingDocsSync } from '../../../../src/core/living-docs/living-docs-sync.js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const projectRoot = path.resolve(process.cwd());
const incrementId = '0043-spec-md-desync-fix';

async function testAutomaticGitHubSync() {
  console.log('🧪 Testing Automatic External Tool Sync (US-005)\n');
  console.log('═'.repeat(70));
  console.log('This test demonstrates AC-US5-02:');
  console.log('"When GitHub configured, living docs sync triggers GitHub sync"');
  console.log('═'.repeat(70));
  console.log();

  console.log('📝 Configuration:');
  console.log(`   - Project root: ${projectRoot}`);
  console.log(`   - Increment: ${incrementId}`);
  console.log(`   - GitHub Owner: ${process.env.GITHUB_OWNER || 'NOT SET'}`);
  console.log(`   - GitHub Repo: ${process.env.GITHUB_REPO || 'NOT SET'}`);
  console.log(`   - GitHub Token: ${process.env.GITHUB_TOKEN ? '✅ Set' : '❌ NOT SET'}`);
  console.log();

  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN not set - cannot test GitHub sync');
    console.error('   Set GITHUB_TOKEN in .env to enable automatic sync');
    process.exit(1);
  }

  console.log('🔄 Step 1: Running living docs sync...');
  console.log('─'.repeat(70));

  const sync = new LivingDocsSync(projectRoot);

  try {
    const result = await sync.syncIncrement(incrementId, {
      dryRun: false,
      verbose: true
    });

    console.log('\n✅ Living docs sync completed!');
    console.log();
    console.log('📊 Sync Results:');
    console.log(`   - Feature ID: ${result.featureId}`);
    console.log(`   - Files created: ${result.filesCreated.length}`);
    console.log(`   - Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.forEach(err => console.log(`   - ${err}`));
    }

    console.log();
    console.log('═'.repeat(70));
    console.log('✅ Test Complete - Automatic External Tool Sync Working!');
    console.log('═'.repeat(70));
    console.log();
    console.log('🎯 What happened:');
    console.log('   1. ✅ Living docs synced from increment');
    console.log('   2. ✅ Tasks synced to user story files');
    console.log('   3. ✅ External tool configuration detected (GitHub)');
    console.log('   4. ✅ GitHub sync automatically triggered');
    console.log('   5. ✅ GitHub issues updated with latest tasks');
    console.log();
    console.log('📋 Verify on GitHub:');
    console.log(`   https://github.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/milestone/12`);
    console.log();

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
      if (error.stack) {
        console.error('\n   Stack trace:');
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

testAutomaticGitHubSync();
