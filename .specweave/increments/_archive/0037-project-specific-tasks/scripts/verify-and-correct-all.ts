#!/usr/bin/env ts-node

/**
 * Verify and Correct All Increments - Truth Verification
 *
 * Purpose: Verify ACTUAL state vs EXPECTED state for all increments
 */

import * as fs from 'fs';
import * as path from 'path';

interface IncrementVerification {
  id: string;
  status: string;
  expectedTaskState: 'all-checked' | 'as-is' | 'unchecked';
  actualChecked: number;
  actualUnchecked: number;
  totalTasks: number;
  isCorrect: boolean;
  needsCorrection: boolean;
  acTotal: number;
  acChecked: number;
  acShouldBeChecked: number; // Based on task completion
}

async function verifyAll(): Promise<void> {
  const rootPath = process.cwd();
  const incrementsDir = path.join(rootPath, '.specweave', 'increments');

  console.log('🔍 VERIFYING ALL INCREMENTS - ACTUAL STATE\n');

  const folders = fs.readdirSync(incrementsDir)
    .filter(f => !f.startsWith('_'))
    .filter(f => fs.statSync(path.join(incrementsDir, f)).isDirectory())
    .sort();

  const verifications: IncrementVerification[] = [];

  for (const folder of folders) {
    const incrementPath = path.join(incrementsDir, folder);
    const metadataPath = path.join(incrementPath, 'metadata.json');
    const tasksPath = path.join(incrementPath, 'tasks.md');
    const specPath = path.join(incrementPath, 'spec.md');

    let status = 'unknown';
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        status = metadata.status || 'unknown';
      } catch (e) {
        // Ignore
      }
    }

    // Count tasks
    let actualChecked = 0;
    let actualUnchecked = 0;
    let totalTasks = 0;

    if (fs.existsSync(tasksPath)) {
      const content = fs.readFileSync(tasksPath, 'utf-8');
      const checked = (content.match(/^- \[x\]/gm) || []).length;
      const unchecked = (content.match(/^- \[ \]/gm) || []).length;
      actualChecked = checked;
      actualUnchecked = unchecked;
      totalTasks = checked + unchecked;
    }

    // Count ACs
    let acTotal = 0;
    let acChecked = 0;
    if (fs.existsSync(specPath)) {
      const content = fs.readFileSync(specPath, 'utf-8');
      acTotal = (content.match(/^- \[[x ]\] AC-/gm) || []).length;
      acChecked = (content.match(/^- \[x\] AC-/gm) || []).length;
    }

    // Determine expected state
    let expectedTaskState: 'all-checked' | 'as-is' | 'unchecked';
    if (status === 'completed') {
      expectedTaskState = 'all-checked';
    } else if (status === 'planning') {
      expectedTaskState = 'unchecked'; // Planning = tasks created but not executed
    } else {
      expectedTaskState = 'as-is'; // Active/unknown = user manages
    }

    // Check if state is correct
    let isCorrect = false;
    if (expectedTaskState === 'all-checked') {
      isCorrect = totalTasks === 0 || actualUnchecked === 0;
    } else if (expectedTaskState === 'unchecked') {
      isCorrect = true; // Planning is allowed to have any state
    } else {
      isCorrect = true; // Active can have any state
    }

    const needsCorrection = !isCorrect;

    // Calculate how many ACs should be checked based on task completion
    const acShouldBeChecked = totalTasks > 0 && actualUnchecked === 0 ? acTotal : 0;

    verifications.push({
      id: folder,
      status,
      expectedTaskState,
      actualChecked,
      actualUnchecked,
      totalTasks,
      isCorrect,
      needsCorrection,
      acTotal,
      acChecked,
      acShouldBeChecked
    });
  }

  // Print table
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('INCREMENT VERIFICATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('ID'.padEnd(45) + 'Status'.padEnd(12) + 'Tasks'.padEnd(15) + 'ACs'.padEnd(12) + 'Correct');
  console.log('─'.repeat(100));

  for (const v of verifications) {
    const taskInfo = `${v.actualChecked}✓/${v.totalTasks}`;
    const acInfo = `${v.acChecked}/${v.acTotal}`;
    const correctIcon = v.isCorrect ? '✅' : '❌';

    console.log(
      v.id.padEnd(45) +
      v.status.padEnd(12) +
      taskInfo.padEnd(15) +
      acInfo.padEnd(12) +
      correctIcon
    );
  }

  console.log('\n─'.repeat(100));

  // Summary
  const needCorrection = verifications.filter(v => v.needsCorrection);
  console.log(`\n✅ Correct: ${verifications.length - needCorrection.length}`);
  console.log(`❌ Need Correction: ${needCorrection.length}\n`);

  if (needCorrection.length > 0) {
    console.log('INCREMENTS NEEDING CORRECTION:\n');
    for (const v of needCorrection) {
      console.log(`${v.id}:`);
      console.log(`  Status: ${v.status}`);
      console.log(`  Expected: ${v.expectedTaskState}`);
      console.log(`  Actual: ${v.actualChecked} checked, ${v.actualUnchecked} unchecked`);
      console.log(`  Issue: Completed increment should have all tasks marked [x]\n`);
    }
  }

  // Special note for planning increments
  const planningIncrements = verifications.filter(v => v.status === 'planning');
  if (planningIncrements.length > 0) {
    console.log('PLANNING INCREMENTS (Unchecked is CORRECT):\n');
    for (const v of planningIncrements) {
      console.log(`${v.id}:`);
      console.log(`  Tasks created: ${v.totalTasks}`);
      console.log(`  Currently checked: ${v.actualChecked} (${Math.round(v.actualChecked/v.totalTasks*100)}%)`);
      console.log(`  Status: ✅ Correct - Planning status means tasks not yet executed\n`);
    }
  }
}

verifyAll().catch((error) => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});
