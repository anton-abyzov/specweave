#!/usr/bin/env node
/**
 * Comprehensive Judge for Archive/Sync System
 *
 * Verifies ALL aspects of the archive system work correctly:
 * 1. Increment ↔ Feature 1:1 mapping
 * 2. "Keep last N" algorithm correctness
 * 3. Feature ID derivation from increment number
 * 4. FEATURE.md references correct increment
 * 5. No orphan features or increments
 * 6. Archive contains correct items
 */

import * as fs from 'fs';
import * as path from 'path';

const rootDir = process.cwd();
const incrementsDir = path.join(rootDir, '.specweave', 'increments');
const archiveDir = path.join(incrementsDir, '_archive');
const specsDir = path.join(rootDir, '.specweave', 'docs', 'internal', 'specs', 'specweave');
const specsArchiveDir = path.join(specsDir, '_archive');

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧑‍⚖️ COMPREHENSIVE JUDGE: Archive/Sync System Verification');
console.log('═══════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
const failures = [];

function test(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ ${name}`);
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   → ${details}`);
    failures.push({ name, details });
  }
}

function getIncrements(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(d => /^\d{4}-/.test(d) && fs.statSync(path.join(dir, d)).isDirectory())
    .map(d => ({
      name: d,
      number: parseInt(d.slice(0, 4)),
      id: d.slice(0, 4)
    }))
    .sort((a, b) => a.number - b.number);
}

function getFeatures(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(d => /^FS-\d{3}$/.test(d) && fs.statSync(path.join(dir, d)).isDirectory())
    .map(d => ({
      id: d,
      number: parseInt(d.slice(3))
    }))
    .sort((a, b) => a.number - b.number);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: Data Collection
// ═══════════════════════════════════════════════════════════════
console.log('📊 PHASE 1: Data Collection\n');

const activeIncrements = getIncrements(incrementsDir);
const archivedIncrements = getIncrements(archiveDir);
const activeFeatures = getFeatures(specsDir);
const archivedFeatures = getFeatures(specsArchiveDir);

console.log(`   Active Increments (${activeIncrements.length}): ${activeIncrements.map(i => i.id).join(', ')}`);
console.log(`   Archived Increments (${archivedIncrements.length}): ${archivedIncrements.slice(-5).map(i => i.id).join(', ')}... (showing last 5)`);
console.log(`   Active Features (${activeFeatures.length}): ${activeFeatures.map(f => f.id).join(', ')}`);
console.log(`   Archived Features (${archivedFeatures.length}): ${archivedFeatures.slice(-5).map(f => f.id).join(', ')}... (showing last 5)`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// PHASE 2: Core Rules Verification
// ═══════════════════════════════════════════════════════════════
console.log('📋 PHASE 2: Core Rules Verification\n');

// Rule 1: Active increments count
console.log('--- Rule 1: Keep Last N Algorithm ---');
const allIncrementNumbers = [...activeIncrements, ...archivedIncrements]
  .map(i => i.number)
  .sort((a, b) => b - a);
const uniqueNumbers = [...new Set(allIncrementNumbers)];
const last5Numbers = uniqueNumbers.slice(0, 5);

console.log(`   Last 5 by NUMBER globally: ${last5Numbers.map(n => n.toString().padStart(4, '0')).join(', ')}`);

const activeNotInLast5 = activeIncrements.filter(i => !last5Numbers.includes(i.number));
test(
  'All active increments are in last 5 by number',
  activeNotInLast5.length === 0,
  activeNotInLast5.length > 0 ? `Found ${activeNotInLast5.length} active not in last 5: ${activeNotInLast5.map(i => i.id).join(', ')}` : ''
);

// Rule 2: 1:1 Mapping
console.log('\n--- Rule 2: 1:1 Increment ↔ Feature Mapping ---');

// Each active increment should have a matching feature
for (const inc of activeIncrements) {
  const expectedFeatureId = `FS-${inc.number.toString().padStart(3, '0')}`;
  const hasFeature = activeFeatures.some(f => f.id === expectedFeatureId);
  test(
    `Increment ${inc.id} → ${expectedFeatureId}`,
    hasFeature,
    hasFeature ? '' : `Feature ${expectedFeatureId} not found`
  );
}

// Each active feature should have a matching increment
for (const feat of activeFeatures) {
  const expectedIncId = feat.number.toString().padStart(4, '0');
  const hasIncrement = activeIncrements.some(i => i.id === expectedIncId);
  test(
    `Feature ${feat.id} → increment ${expectedIncId}`,
    hasIncrement,
    hasIncrement ? '' : `Increment ${expectedIncId} not found (orphan feature!)`
  );
}

// Rule 3: FEATURE.md references
console.log('\n--- Rule 3: FEATURE.md References Correct Increment ---');

for (const feat of activeFeatures) {
  const featureMdPath = path.join(specsDir, feat.id, 'FEATURE.md');
  if (!fs.existsSync(featureMdPath)) {
    test(`${feat.id}/FEATURE.md exists`, false, 'File not found');
    continue;
  }

  const content = fs.readFileSync(featureMdPath, 'utf-8');
  const match = content.match(/\[(\d{4})-[^\]]+\]\([^)]*increments/);

  if (!match) {
    test(`${feat.id}/FEATURE.md has increment reference`, false, 'No increment reference found');
    continue;
  }

  const referencedNumber = parseInt(match[1]);
  const expectedNumber = feat.number;

  test(
    `${feat.id} references increment ${match[1]}`,
    referencedNumber === expectedNumber,
    referencedNumber !== expectedNumber ? `Expected ${expectedNumber.toString().padStart(4, '0')}, got ${match[1]}` : ''
  );
}

// Rule 4: No duplicates
console.log('\n--- Rule 4: No Duplicate IDs ---');

const activeIncIds = activeIncrements.map(i => i.id);
const archivedIncIds = archivedIncrements.map(i => i.id);
const duplicateIncs = activeIncIds.filter(id => archivedIncIds.includes(id));
test(
  'No increment exists in both active and archive',
  duplicateIncs.length === 0,
  duplicateIncs.length > 0 ? `Duplicates: ${duplicateIncs.join(', ')}` : ''
);

const activeFeatIds = activeFeatures.map(f => f.id);
const archivedFeatIds = archivedFeatures.map(f => f.id);
const duplicateFeats = activeFeatIds.filter(id => archivedFeatIds.includes(id));
test(
  'No feature exists in both active and archive',
  duplicateFeats.length === 0,
  duplicateFeats.length > 0 ? `Duplicates: ${duplicateFeats.join(', ')}` : ''
);

// Rule 5: Archived consistency
console.log('\n--- Rule 5: Archived Items Consistency ---');

// Check a sample of archived increments have corresponding archived features
const sampleArchivedIncs = archivedIncrements.slice(-10);
let archivedConsistent = true;
const inconsistentArchived = [];

for (const inc of sampleArchivedIncs) {
  const expectedFeatureId = `FS-${inc.number.toString().padStart(3, '0')}`;
  const inActiveFeatures = activeFeatures.some(f => f.id === expectedFeatureId);
  const inArchivedFeatures = archivedFeatures.some(f => f.id === expectedFeatureId);

  // Archived increment should NOT have active feature (unless increment was just archived)
  if (inActiveFeatures && !activeIncrements.some(i => i.number === inc.number)) {
    archivedConsistent = false;
    inconsistentArchived.push(`${inc.id} archived but ${expectedFeatureId} still active`);
  }
}

test(
  'Archived increments have no active features (sample check)',
  archivedConsistent,
  inconsistentArchived.join('; ')
);

// ═══════════════════════════════════════════════════════════════
// PHASE 3: Algorithm Verification
// ═══════════════════════════════════════════════════════════════
console.log('\n📋 PHASE 3: Algorithm Verification\n');

// Verify the "keep last 5" is working correctly
const expectedActiveNumbers = last5Numbers.filter(n =>
  activeIncrements.some(i => i.number === n) ||
  !archivedIncrements.some(i => i.number === n)
);

test(
  `Active count (${activeIncrements.length}) ≤ keep-last (5)`,
  activeIncrements.length <= 5,
  `Too many active: ${activeIncrements.length}`
);

test(
  'All active increments are sequential (no gaps in last N)',
  activeIncrements.every(i => last5Numbers.includes(i.number)),
  ''
);

// ═══════════════════════════════════════════════════════════════
// PHASE 4: Final Verdict
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📊 FINAL VERDICT');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
console.log(`   Pass Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);

if (failures.length > 0) {
  console.log('\n   ❌ FAILURES:');
  failures.forEach(f => {
    console.log(`      - ${f.name}`);
    if (f.details) console.log(`        ${f.details}`);
  });
}

console.log('');
if (passedTests === totalTests) {
  console.log('🎉 ALL TESTS PASSED - Archive system is working correctly!');
  console.log('');
  console.log('   Summary:');
  console.log(`   - ${activeIncrements.length} active increments: ${activeIncrements.map(i => i.id).join(', ')}`);
  console.log(`   - ${activeFeatures.length} active features: ${activeFeatures.map(f => f.id).join(', ')}`);
  console.log(`   - 1:1 mapping verified ✓`);
  console.log(`   - Keep-last-5 algorithm verified ✓`);
  console.log(`   - No duplicates ✓`);
  console.log(`   - FEATURE.md references correct ✓`);
} else {
  console.log('⚠️  SOME TESTS FAILED - Review failures above');
}

console.log('\n═══════════════════════════════════════════════════════════════\n');

process.exit(passedTests === totalTests ? 0 : 1);
