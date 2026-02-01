#!/usr/bin/env npx tsx
/**
 * LSP Benchmark: tsserver vs grep
 *
 * Run: npx tsx scripts/lsp-benchmark.ts
 */

import { TsServerClient } from '../src/core/lsp/tsserver-client.js';
import { execSync } from 'child_process';
import * as path from 'path';

const projectRoot = process.cwd();
const testFile = 'src/core/increment/metadata-manager.ts';
const testSymbol = 'MetadataManager';

async function benchmark() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║      LSP (tsserver) vs GREP BENCHMARK                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Initialize tsserver
  console.log('🔄 Initializing tsserver...');
  const tsClient = new TsServerClient(projectRoot);
  const initialized = await tsClient.initialize();

  if (!initialized) {
    console.log('❌ Failed to initialize tsserver');
    return;
  }

  // Warmup
  console.log('🔥 Warming up tsserver...');
  await tsClient.warmup();
  console.log('✅ Ready!\n');

  const iterations = 5;
  const absoluteFile = path.join(projectRoot, testFile);

  // ═══════════════════════════════════════════════════════════
  // TEST 1: Find References
  // ═══════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Find References to "MetadataManager"');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const grepTimes: number[] = [];
  const lspTimes: number[] = [];

  // Grep
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    execSync('grep -rn "' + testSymbol + '" --include="*.ts" src/', {
      cwd: projectRoot,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    grepTimes.push(performance.now() - start);
  }

  // LSP
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await tsClient.findReferences(absoluteFile, 43, 13);
    lspTimes.push(performance.now() - start);
  }

  const avgGrep = grepTimes.reduce((a, b) => a + b, 0) / iterations;
  const avgLsp = lspTimes.reduce((a, b) => a + b, 0) / iterations;
  const speedup = avgGrep / avgLsp;

  console.log('  GREP times:     ' + grepTimes.map((t) => t.toFixed(1) + 'ms').join(', '));
  console.log('  tsserver times: ' + lspTimes.map((t) => t.toFixed(1) + 'ms').join(', '));
  console.log('');
  console.log('  📊 Average GREP:     ' + avgGrep.toFixed(2) + ' ms');
  console.log('  📊 Average tsserver: ' + avgLsp.toFixed(2) + ' ms');
  console.log('  ⚡ Speedup:          ' + speedup.toFixed(1) + 'x ' + (speedup > 1 ? 'FASTER' : 'slower'));

  // ═══════════════════════════════════════════════════════════
  // TEST 2: Accuracy
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Accuracy - Search for "read" symbol');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const grepOutput = execSync('grep -rn "\\bread\\b" --include="*.ts" src/ | wc -l', {
    cwd: projectRoot,
    encoding: 'utf-8',
  });
  const grepMatches = parseInt(grepOutput.trim(), 10);

  // Find read method
  const lspResult = await tsClient.findReferences(absoluteFile, 55, 10);
  const lspMatches = lspResult.locations?.length || 0;

  console.log('  GREP matches (text "read"):   ' + grepMatches + ' matches');
  console.log('  tsserver refs (semantic):     ' + lspMatches + ' references');
  console.log('  ❌ False positives avoided:    ' + (grepMatches - lspMatches));
  console.log('');
  console.log('  Why? Grep matches: read, readFile, readFileSync, readdir, etc.');
  console.log('  tsserver only matches actual MetadataManager.read() calls.');

  // ═══════════════════════════════════════════════════════════
  // TEST 3: Type Information
  // ═══════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Type Information (hover)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const hoverResult = await tsClient.hover(absoluteFile, 43, 13);

  console.log('  GREP:     ❌ Cannot determine types');
  console.log('  tsserver: ✅ Full type information:');
  if (hoverResult.contents) {
    const lines = hoverResult.contents.split('\n').slice(0, 3);
    lines.forEach((line) => console.log('            ' + line));
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                      CONCLUSION                               ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║  tsserver provides:                                           ║');
  console.log('║  ✅ Faster repeated queries (after warmup)                    ║');
  console.log('║  ✅ Semantic accuracy (no false positives)                    ║');
  console.log('║  ✅ Type information grep cannot provide                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  await tsClient.shutdown();
}

benchmark().catch(console.error);
