// Judge LLM verification script for archive/sync consistency
import * as fs from 'fs';
import * as path from 'path';

const rootDir = process.cwd();
const incrementsDir = path.join(rootDir, '.specweave', 'increments');
const specsDir = path.join(rootDir, '.specweave', 'docs', 'internal', 'specs', 'specweave');

console.log('🧑‍⚖️ JUDGE: Verifying Archive/Sync Consistency\n');

// Get active increments
const activeIncrements = fs.readdirSync(incrementsDir)
  .filter(d => /^\d{4}-/.test(d) && fs.statSync(path.join(incrementsDir, d)).isDirectory())
  .map(d => ({ id: d.slice(0, 4), name: d, number: parseInt(d.slice(0, 4)) }))
  .sort((a, b) => a.number - b.number);

// Get active feature specs
const activeFeatures = fs.readdirSync(specsDir)
  .filter(d => /^FS-\d{3}$/.test(d) && fs.statSync(path.join(specsDir, d)).isDirectory())
  .map(d => ({ id: d, number: parseInt(d.slice(3)) }))
  .sort((a, b) => a.number - b.number);

console.log('📦 Active Increments:', activeIncrements.map(i => i.id).join(', '));
console.log('📂 Active Features:', activeFeatures.map(f => f.id).join(', '));
console.log('');

// Rule 1: Feature ID must derive from increment number
console.log('📋 RULE 1: Feature ID = FS-{increment_number}');
let rule1Pass = true;
for (const inc of activeIncrements) {
  const incNum = parseInt(inc.id);
  const expectedFeatureId = `FS-${incNum.toString().padStart(3, '0')}`;
  const featureExists = activeFeatures.some(f => f.id === expectedFeatureId);

  if (featureExists) {
    console.log(`   ✓ ${inc.name} → ${expectedFeatureId}`);
  } else {
    console.log(`   ✗ ${inc.name} → ${expectedFeatureId} MISSING!`);
    rule1Pass = false;
  }
}
console.log(rule1Pass ? '   ✅ PASS' : '   ❌ FAIL');
console.log('');

// Rule 2: No orphan features (features without corresponding increment)
console.log('📋 RULE 2: No orphan features');
let rule2Pass = true;
for (const feature of activeFeatures) {
  const expectedIncPrefix = feature.number.toString().padStart(4, '0');
  const incrementExists = activeIncrements.some(i => i.id === expectedIncPrefix);

  if (incrementExists) {
    console.log(`   ✓ ${feature.id} → increment ${expectedIncPrefix} exists`);
  } else {
    console.log(`   ✗ ${feature.id} → NO increment ${expectedIncPrefix}!`);
    rule2Pass = false;
  }
}
console.log(rule2Pass ? '   ✅ PASS' : '   ❌ FAIL');
console.log('');

// Rule 3: Feature FEATURE.md references correct increment
console.log('📋 RULE 3: FEATURE.md references matching increment');
let rule3Pass = true;
for (const feature of activeFeatures) {
  const featureMd = path.join(specsDir, feature.id, 'FEATURE.md');
  if (!fs.existsSync(featureMd)) {
    console.log(`   ✗ ${feature.id}/FEATURE.md not found`);
    rule3Pass = false;
    continue;
  }

  const content = fs.readFileSync(featureMd, 'utf-8');
  const match = content.match(/\[(\d{4})-[^\]]+\]\([^)]*increments/);

  if (match) {
    const referencedIncrement = match[1];
    const expectedIncrement = feature.number.toString().padStart(4, '0');

    if (referencedIncrement === expectedIncrement) {
      console.log(`   ✓ ${feature.id} references ${referencedIncrement}`);
    } else {
      console.log(`   ✗ ${feature.id} references ${referencedIncrement} but should reference ${expectedIncrement}`);
      rule3Pass = false;
    }
  } else {
    console.log(`   ? ${feature.id} - no increment reference found`);
  }
}
console.log(rule3Pass ? '   ✅ PASS' : '   ❌ FAIL');
console.log('');

// Final verdict
const allPass = rule1Pass && rule2Pass && rule3Pass;
console.log('═══════════════════════════════════════');
console.log(allPass ? '🎉 VERDICT: ALL RULES PASS' : '⚠️  VERDICT: SOME RULES FAILED');
console.log('═══════════════════════════════════════');

process.exit(allPass ? 0 : 1);
