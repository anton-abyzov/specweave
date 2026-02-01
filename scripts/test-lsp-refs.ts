/**
 * Standalone LSP test script - demonstrates actual semantic references
 * Run: npx tsx scripts/test-lsp-refs.ts
 */
import { TsServerClient } from '../src/core/lsp/tsserver-client.js';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

const projectRoot = process.cwd();
const testFile = 'src/core/increment/active-increment-manager.ts';

function findSymbolPosition(filePath: string, pattern: RegExp): { line: number; character: number } | null {
  const content = fs.readFileSync(path.join(projectRoot, filePath), 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(pattern);
    if (match) {
      const char = lines[i].indexOf(match[1] || match[0]);
      return { line: i, character: char >= 0 ? char : 0 };
    }
  }
  return null;
}

async function main() {
  console.log('\n🚀 Starting tsserver...');
  const client = new TsServerClient(projectRoot);
  const ok = await client.initialize();
  if (!ok) {
    console.log('❌ Failed to initialize tsserver');
    process.exit(1);
  }

  await client.warmup();
  console.log('✅ tsserver ready\n');

  const pos = findSymbolPosition(testFile, /class\s+(ActiveIncrementManager)/);
  if (!pos) {
    console.log('❌ Could not find ActiveIncrementManager');
    await client.shutdown();
    process.exit(1);
  }

  console.log(`📍 Found ActiveIncrementManager at line ${pos.line + 1}\n`);

  const absoluteFile = path.join(projectRoot, testFile);
  const result = await client.findReferences(absoluteFile, pos.line, pos.character);

  // Group by file
  const fileGroups = new Map<string, number>();
  const locations = result.locations || [];
  for (const loc of locations) {
    const file = loc.uri.replace('file://' + projectRoot, '');
    fileGroups.set(file, (fileGroups.get(file) || 0) + 1);
  }

  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│      LSP: ActiveIncrementManager Semantic References        │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│  Total references: ${String(locations.length).padStart(3)}                                      │`);
  console.log(`│  Unique files:     ${String(fileGroups.size).padStart(3)}                                      │`);
  console.log('├─────────────────────────────────────────────────────────────┤');

  const sorted = [...fileGroups.entries()].sort((a, b) => b[1] - a[1]);
  for (const [file, count] of sorted) {
    const short = file.length > 50 ? '...' + file.slice(-47) : file;
    console.log(`│  ${short.padEnd(52)} (${count})`);
  }
  console.log('└─────────────────────────────────────────────────────────────┘');

  // Compare with grep
  const grepOut = execSync('grep -rn "ActiveIncrementManager" --include="*.ts" src/ | wc -l', {
    cwd: projectRoot,
    encoding: 'utf-8',
  });
  const grepCount = parseInt(grepOut.trim(), 10);

  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│      LSP vs Grep Comparison                                 │');
  console.log('├─────────────────────────────────────────────────────────────┤');
  console.log(`│  Grep (text matches):      ${String(grepCount).padStart(3)} lines                          │`);
  console.log(`│  LSP (semantic refs):      ${String(locations.length).padStart(3)} references                     │`);
  console.log('│                                                             │');
  console.log('│  ✓ LSP finds actual TYPE usages (imports, calls, types)    │');
  console.log('│  ✗ Grep includes comments, strings, docs (noise)           │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  // Show specific reference locations
  console.log('📋 Reference Locations (first 10):');
  for (const loc of locations.slice(0, 10)) {
    const file = loc.uri.replace('file://' + projectRoot, '');
    const line = loc.range.start.line + 1;
    console.log(`   ${file}:${line}`);
  }

  await client.shutdown();
  console.log('\n✅ Done');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
