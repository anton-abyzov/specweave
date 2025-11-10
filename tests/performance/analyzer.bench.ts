/**
 * Performance Benchmarks: BrownfieldAnalyzer
 *
 * Targets:
 * - Classify 100 files: <5 seconds
 * - Accuracy vs speed trade-off analysis
 */

import { BrownfieldAnalyzer } from '../../src/core/brownfield/analyzer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AnalyzerBenchmarkResult {
  fileCount: number;
  totalTime: number;
  avgTimePerFile: number;
  filesPerSecond: number;
  accuracy: number;
  success: boolean;
}

async function createClassifiedTestFiles(dir: string, count: number): Promise<Map<string, string>> {
  await fs.ensureDir(dir);

  const expectedClassifications = new Map<string, string>();

  for (let i = 1; i <= count; i++) {
    const classification = i % 4 === 0 ? 'spec' : i % 4 === 1 ? 'module' : i % 4 === 2 ? 'team' : 'legacy';

    let content: string;
    let filename: string;

    switch (classification) {
      case 'spec':
        filename = `spec-${i}.md`;
        content = `# User Story ${i}

As a user, I want feature ${i}.

## Acceptance Criteria
- AC-${i}-1: Valid credentials
- AC-${i}-2: Error handling
- AC-${i}-3: User story completion
`;
        break;

      case 'module':
        filename = `module-${i}.md`;
        content = `# Module ${i}

## Architecture
Component-based architecture for module ${i}.

## API Reference
- class Module${i}
- interface IModule${i}
`;
        break;

      case 'team':
        filename = `team-${i}.md`;
        content = `# Team Guide ${i}

## Onboarding
Setup instructions for team ${i}.

## Workflows
Daily standup, sprint planning.
`;
        break;

      case 'legacy':
        filename = `legacy-${i}.md`;
        content = `# Document ${i}

Random notes and ideas.
Meeting notes from last week.
`;
        break;
    }

    await fs.writeFile(path.join(dir, filename), content);
    expectedClassifications.set(filename, classification);
  }

  return expectedClassifications;
}

async function runAnalyzerBenchmark(fileCount: number): Promise<AnalyzerBenchmarkResult> {
  const testDir = path.join(__dirname, `../fixtures/perf-analyzer-${fileCount}`);

  // Setup
  await fs.ensureDir(testDir);

  // Create test files with known classifications
  const expectedClassifications = await createClassifiedTestFiles(testDir, fileCount);

  const analyzer = new BrownfieldAnalyzer();

  // Benchmark classification
  const startTime = Date.now();
  const result = await analyzer.analyze(testDir);
  const totalTime = Date.now() - startTime;

  const avgTimePerFile = totalTime / fileCount;
  const filesPerSecond = (fileCount / totalTime) * 1000;

  // Calculate accuracy
  let correctClassifications = 0;
  for (const [filename, expectedType] of expectedClassifications) {
    const actualFile = [...result.specs, ...result.modules, ...result.team, ...result.legacy]
      .find(f => f.fileName === filename);

    if (actualFile && actualFile.type === expectedType) {
      correctClassifications++;
    }
  }

  const accuracy = correctClassifications / fileCount;

  // Cleanup
  await fs.remove(testDir);

  return {
    fileCount,
    totalTime,
    avgTimePerFile,
    filesPerSecond,
    accuracy,
    success: true
  };
}

async function runAnalyzerBenchmarks(): Promise<void> {
  console.log('\n=== BrownfieldAnalyzer Performance Benchmarks ===\n');

  // Benchmark 1: 100 files (target: <5 seconds)
  console.log('📊 Benchmark: 100 files');
  const result100 = await runAnalyzerBenchmark(100);

  console.log(`   Total Time: ${result100.totalTime}ms (${(result100.totalTime / 1000).toFixed(2)}s)`);
  console.log(`   Avg Time/File: ${result100.avgTimePerFile.toFixed(2)}ms`);
  console.log(`   Files/sec: ${result100.filesPerSecond.toFixed(1)}`);
  console.log(`   Accuracy: ${(result100.accuracy * 100).toFixed(1)}%`);
  console.log(`   ${result100.totalTime < 5000 ? '✅ PASS' : '❌ FAIL'} (<5s target)`);
  console.log(`   ${result100.accuracy >= 0.85 ? '✅ PASS' : '❌ FAIL'} (≥85% accuracy target)\n`);

  // Benchmark 2: 250 files (extended benchmark)
  console.log('📊 Benchmark: 250 files');
  const result250 = await runAnalyzerBenchmark(250);

  console.log(`   Total Time: ${result250.totalTime}ms (${(result250.totalTime / 1000).toFixed(2)}s)`);
  console.log(`   Avg Time/File: ${result250.avgTimePerFile.toFixed(2)}ms`);
  console.log(`   Files/sec: ${result250.filesPerSecond.toFixed(1)}`);
  console.log(`   Accuracy: ${(result250.accuracy * 100).toFixed(1)}%\n`);

  // Benchmark 3: 500 files (stress test)
  console.log('📊 Benchmark: 500 files');
  const result500 = await runAnalyzerBenchmark(500);

  console.log(`   Total Time: ${result500.totalTime}ms (${(result500.totalTime / 1000).toFixed(2)}s)`);
  console.log(`   Avg Time/File: ${result500.avgTimePerFile.toFixed(2)}ms`);
  console.log(`   Files/sec: ${result500.filesPerSecond.toFixed(1)}`);
  console.log(`   Accuracy: ${(result500.accuracy * 100).toFixed(1)}%\n`);

  // Summary
  console.log('\n=== Summary ===');
  console.log(`100 files < 5s: ${result100.totalTime < 5000 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Accuracy ≥ 85%: ${result100.accuracy >= 0.85 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nScaling analysis:`);
  console.log(`  100 → 250 files: ${(result250.totalTime / result100.totalTime).toFixed(2)}x time`);
  console.log(`  100 → 500 files: ${(result500.totalTime / result100.totalTime).toFixed(2)}x time`);
  console.log(`  Expected: ~2.5x and ~5x (linear scaling)\n`);

  console.log(`Accuracy consistency:`);
  console.log(`  100 files: ${(result100.accuracy * 100).toFixed(1)}%`);
  console.log(`  250 files: ${(result250.accuracy * 100).toFixed(1)}%`);
  console.log(`  500 files: ${(result500.accuracy * 100).toFixed(1)}%`);
  console.log(`  ${Math.abs(result100.accuracy - result500.accuracy) < 0.05 ? '✅ PASS' : '⚠️ WARN'} (accuracy should be consistent)`);
  console.log('');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAnalyzerBenchmarks()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}

export { runAnalyzerBenchmarks };
