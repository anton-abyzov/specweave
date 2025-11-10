/**
 * Performance Benchmarks: Brownfield Import
 *
 * Targets:
 * - Import 50 files: <10 seconds
 * - Import 500 files: <2 minutes (120 seconds)
 * - Peak memory usage: <100MB
 */

import { BrownfieldImporter } from '../../src/core/brownfield/importer';
import { BrownfieldAnalyzer } from '../../src/core/brownfield/analyzer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ImportBenchmarkResult {
  fileCount: number;
  analyzeTime: number;
  importTime: number;
  totalTime: number;
  filesPerSecond: number;
  peakMemoryMB: number;
  success: boolean;
}

function getMemoryUsageMB(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed / 1024 / 1024; // Convert to MB
}

async function createTestFiles(dir: string, count: number): Promise<void> {
  await fs.ensureDir(dir);

  for (let i = 1; i <= count; i++) {
    const isSpec = i % 3 === 0;
    const isModule = i % 5 === 0;
    const isTeam = i % 7 === 0;

    let content: string;
    if (isSpec) {
      content = `# Feature ${i}

## User Story
As a user, I want feature ${i} so that I can achieve goal ${i}.

## Acceptance Criteria
- AC-${i}-1: Criterion 1
- AC-${i}-2: Criterion 2
- AC-${i}-3: Criterion 3
`;
    } else if (isModule) {
      content = `# Module ${i}

## Architecture
This module implements component ${i}.

## API Reference
- function${i}()
- class${i}
`;
    } else if (isTeam) {
      content = `# Team Guide ${i}

## Setup
1. Install dependencies
2. Configure environment

## Workflows
Daily standup at 10am
`;
    } else {
      content = `# Document ${i}

Some content for document ${i}.
Notes and random information.
`;
    }

    await fs.writeFile(path.join(dir, `file-${i}.md`), content);
  }
}

async function runImportBenchmark(fileCount: number): Promise<ImportBenchmarkResult> {
  const testDir = path.join(__dirname, `../fixtures/perf-import-${fileCount}`);
  const sourceDir = path.join(testDir, 'source');
  const specweaveRoot = path.join(testDir, '.specweave');

  // Setup
  await fs.ensureDir(testDir);
  await fs.ensureDir(specweaveRoot);

  const configPath = path.join(specweaveRoot, 'config.json');
  await fs.writeFile(configPath, JSON.stringify({
    multiProject: {
      enabled: false,
      activeProject: 'default',
      projects: []
    },
    brownfieldImports: []
  }, null, 2));

  // Create test files
  await createTestFiles(sourceDir, fileCount);

  const analyzer = new BrownfieldAnalyzer();
  const importer = new BrownfieldImporter(testDir);

  // Measure initial memory
  const initialMemory = getMemoryUsageMB();
  let peakMemory = initialMemory;

  // Benchmark analysis
  const analyzeStart = Date.now();
  const analysisResult = await analyzer.analyze(sourceDir);
  const analyzeTime = Date.now() - analyzeStart;

  peakMemory = Math.max(peakMemory, getMemoryUsageMB());

  // Benchmark import
  const importStart = Date.now();
  await importer.import({
    sourcePath: sourceDir,
    sourceType: 'test',
    preserveStructure: false,
    analysisResult
  });
  const importTime = Date.now() - importStart;

  peakMemory = Math.max(peakMemory, getMemoryUsageMB());

  const totalTime = analyzeTime + importTime;
  const filesPerSecond = (fileCount / totalTime) * 1000;
  const peakMemoryMB = peakMemory - initialMemory;

  // Cleanup
  await fs.remove(testDir);

  return {
    fileCount,
    analyzeTime,
    importTime,
    totalTime,
    filesPerSecond,
    peakMemoryMB,
    success: true
  };
}

async function runBrownfieldImportBenchmarks(): Promise<void> {
  console.log('\n=== Brownfield Import Performance Benchmarks ===\n');

  // Benchmark 1: 50 files (target: <10 seconds)
  console.log('📊 Benchmark: 50 files');
  const result50 = await runImportBenchmark(50);

  console.log(`   Analyze Time: ${result50.analyzeTime}ms`);
  console.log(`   Import Time: ${result50.importTime}ms`);
  console.log(`   Total Time: ${result50.totalTime}ms (${(result50.totalTime / 1000).toFixed(2)}s)`);
  console.log(`   Files/sec: ${result50.filesPerSecond.toFixed(1)}`);
  console.log(`   Peak Memory: ${result50.peakMemoryMB.toFixed(1)}MB`);
  console.log(`   ${result50.totalTime < 10000 ? '✅ PASS' : '❌ FAIL'} (<10s target)\n`);

  // Benchmark 2: 100 files (intermediate benchmark)
  console.log('📊 Benchmark: 100 files');
  const result100 = await runImportBenchmark(100);

  console.log(`   Total Time: ${result100.totalTime}ms (${(result100.totalTime / 1000).toFixed(2)}s)`);
  console.log(`   Files/sec: ${result100.filesPerSecond.toFixed(1)}`);
  console.log(`   Peak Memory: ${result100.peakMemoryMB.toFixed(1)}MB\n`);

  // Benchmark 3: 500 files (target: <2 minutes)
  console.log('📊 Benchmark: 500 files');
  const result500 = await runImportBenchmark(500);

  console.log(`   Analyze Time: ${result500.analyzeTime}ms`);
  console.log(`   Import Time: ${result500.importTime}ms`);
  console.log(`   Total Time: ${result500.totalTime}ms (${(result500.totalTime / 1000).toFixed(2)}s)`);
  console.log(`   Files/sec: ${result500.filesPerSecond.toFixed(1)}`);
  console.log(`   Peak Memory: ${result500.peakMemoryMB.toFixed(1)}MB`);
  console.log(`   ${result500.totalTime < 120000 ? '✅ PASS' : '❌ FAIL'} (<120s target)\n`);

  // Summary
  console.log('\n=== Summary ===');
  console.log(`50 files < 10s: ${result50.totalTime < 10000 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`500 files < 120s: ${result500.totalTime < 120000 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Peak memory < 100MB: ${result500.peakMemoryMB < 100 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nScaling factor: ${(result500.totalTime / result50.totalTime).toFixed(1)}x (expected ~10x for 10x files)`);
  console.log('');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBrownfieldImportBenchmarks()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}

export { runBrownfieldImportBenchmarks };
