#!/usr/bin/env node
/**
 * Test: Does Node.js fs.writeFile() trigger Claude Code PostToolUse hooks?
 *
 * CRITICAL TEST for v0.26.0 patch release
 * See: Judge LLM review - Unknown if fs operations trigger hooks
 *
 * Purpose:
 * - Verify whether native Node.js fs.writeFile() triggers Claude Code's
 *   PostToolUse:Write hook (defined in plugins/specweave/.claude-plugin/plugin.json)
 * - If YES: Need guards at all 19+ fs.writeFile locations
 * - If NO: Current guards at TypeScript layer are sufficient
 *
 * Usage:
 *   node scripts/test-fs-writefile-hook-triggering.js
 *   # Then check: tail -50 .specweave/logs/hooks-debug.log
 *   # Look for: PostToolUse:Write events
 *
 * Expected Results:
 *   SCENARIO A (Hooks Trigger):
 *     - hooks-debug.log shows "PostToolUse:Write" event
 *     - post-edit-write-consolidated.sh executes
 *     - VERDICT: Need guards at fs.writeFile layer
 *
 *   SCENARIO B (Hooks Don't Trigger):
 *     - No hook events in hooks-debug.log
 *     - VERDICT: Current guards sufficient
 */

import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Test file location
const testFile = path.join(projectRoot, '.specweave/logs/fs-hook-test.txt');
const hookLogFile = path.join(projectRoot, '.specweave/logs/hooks-debug.log');

async function runTest() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔬 fs.writeFile() Hook Triggering Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Step 1: Clear hook log (or note starting point)
  let hookLogStartSize = 0;
  if (existsSync(hookLogFile)) {
    const logContent = await readFile(hookLogFile, 'utf-8');
    hookLogStartSize = logContent.length;
    console.log(`📋 Hook log current size: ${hookLogStartSize} bytes`);
  } else {
    console.log('📋 Hook log does not exist yet');
  }

  console.log('');
  console.log('🔧 Step 1: Writing test file with fs.writeFile()...');
  console.log(`   File: ${testFile}`);
  console.log('   Method: Node.js fs/promises writeFile()');
  console.log('');

  // Step 2: Write file using native fs.writeFile()
  const timestamp = new Date().toISOString();
  const testContent = `fs.writeFile() hook test - ${timestamp}\n\nThis file was created to test if Node.js fs.writeFile() operations trigger Claude Code's PostToolUse:Write hooks.\n`;

  try {
    await writeFile(testFile, testContent, 'utf-8');
    console.log('✅ File written successfully');
  } catch (error) {
    console.error('❌ Failed to write file:', error.message);
    process.exit(1);
  }

  // Step 3: Wait for potential hook execution
  console.log('');
  console.log('⏳ Waiting 2 seconds for hooks to fire...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 4: Check if hook log changed
  console.log('');
  console.log('🔍 Checking hook log for PostToolUse:Write events...');

  if (!existsSync(hookLogFile)) {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESULT: NO HOOK LOG CREATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ VERDICT: fs.writeFile() does NOT trigger Claude Code hooks');
    console.log('   Current guards at TypeScript layer are SUFFICIENT');
    console.log('   No additional guards needed at fs.writeFile locations');
    console.log('');
    return;
  }

  const logContentAfter = await readFile(hookLogFile, 'utf-8');
  const hookLogEndSize = logContentAfter.length;
  const newLogContent = logContentAfter.slice(hookLogStartSize);

  console.log(`   Hook log new size: ${hookLogEndSize} bytes`);
  console.log(`   New content: ${hookLogEndSize - hookLogStartSize} bytes`);

  // Step 5: Analyze new log content
  if (hookLogEndSize === hookLogStartSize) {
    // No new content
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESULT: NO NEW HOOK EVENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ VERDICT: fs.writeFile() does NOT trigger Claude Code hooks');
    console.log('   Current guards at TypeScript layer are SUFFICIENT');
    console.log('   No additional guards needed at fs.writeFile locations');
    console.log('');
  } else {
    // New content detected - check for PostToolUse:Write
    const hasPostToolUse = newLogContent.includes('PostToolUse');
    const hasWriteMatcher = newLogContent.includes('Write');
    const hasOurTestFile = newLogContent.includes('fs-hook-test.txt');

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESULT: NEW HOOK EVENTS DETECTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('New log content:');
    console.log('----------------------------------------');
    console.log(newLogContent.slice(0, 500)); // First 500 chars
    if (newLogContent.length > 500) {
      console.log('... (truncated)');
    }
    console.log('----------------------------------------');
    console.log('');
    console.log('Analysis:');
    console.log(`  - Contains "PostToolUse": ${hasPostToolUse ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Contains "Write": ${hasWriteMatcher ? '✅ YES' : '❌ NO'}`);
    console.log(`  - References test file: ${hasOurTestFile ? '✅ YES' : '❌ NO'}`);
    console.log('');

    if (hasPostToolUse && hasWriteMatcher) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  CRITICAL FINDING');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('❌ VERDICT: fs.writeFile() DOES trigger Claude Code hooks!');
      console.log('');
      console.log('🚨 IMMEDIATE ACTION REQUIRED:');
      console.log('   1. Add SKIP_EXTERNAL_SYNC guards to ALL fs.writeFile() calls');
      console.log('   2. Affected files:');
      console.log('      - plugins/specweave-github/lib/github-feature-sync.ts (2 locations)');
      console.log('      - plugins/specweave-github/lib/ThreeLayerSyncManager.ts (10+ locations)');
      console.log('      - plugins/specweave-github/lib/task-sync.ts (2 locations)');
      console.log('      - plugins/specweave-github/lib/task-parser.ts (1 location)');
      console.log('   3. Implement universal recursion guard at fs layer');
      console.log('');
      console.log('📋 See: Judge LLM review for detailed mitigation strategy');
      console.log('');
    } else {
      console.log('✅ VERDICT: fs.writeFile() does NOT trigger Claude Code hooks');
      console.log('   (Log activity unrelated to our test file)');
      console.log('   Current guards at TypeScript layer are SUFFICIENT');
      console.log('');
    }
  }

  // Cleanup
  console.log('🧹 Cleaning up test file...');
  try {
    await writeFile(testFile, '', 'utf-8'); // Empty the file
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.warn('⚠️  Cleanup failed (non-critical):', error.message);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Test Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

// Run test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
