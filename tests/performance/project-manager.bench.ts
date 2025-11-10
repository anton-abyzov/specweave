/**
 * Performance Benchmarks: ProjectManager
 *
 * Targets:
 * - Path resolution: <1ms per call (1000 calls benchmark)
 * - Caching improves performance (verify cache hits faster)
 */

import { ProjectManager } from '../../src/core/multi-project/project-manager';
import { ConfigManager } from '../../src/core/config-manager';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
}

async function benchmark(
  name: string,
  iterations: number,
  fn: () => void | Promise<void>
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warm-up
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
    times.push(duration);
  }

  const totalTime = times.reduce((sum, t) => sum + t, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSecond = 1000 / avgTime;

  return {
    operation: name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSecond
  };
}

async function runProjectManagerBenchmarks(): Promise<void> {
  console.log('\n=== ProjectManager Performance Benchmarks ===\n');

  const testDir = path.join(__dirname, '../fixtures/perf-test');
  const specweaveRoot = path.join(testDir, '.specweave');

  // Setup
  await fs.ensureDir(testDir);
  await fs.ensureDir(specweaveRoot);

  const configPath = path.join(specweaveRoot, 'config.json');
  await fs.writeFile(configPath, JSON.stringify({
    multiProject: {
      enabled: true,
      activeProject: 'web-app',
      projects: [
        {
          id: 'web-app',
          name: 'Web Application',
          description: 'Frontend web app',
          techStack: ['react', 'typescript'],
          team: 'Web Team'
        }
      ]
    }
  }, null, 2));

  const manager = new ProjectManager(testDir);

  // Benchmark 1: getProjectBasePath() (1000 iterations)
  const basePathResult = await benchmark(
    'getProjectBasePath()',
    1000,
    () => manager.getProjectBasePath()
  );

  console.log(`📊 ${basePathResult.operation}`);
  console.log(`   Iterations: ${basePathResult.iterations}`);
  console.log(`   Avg Time: ${basePathResult.avgTime.toFixed(4)}ms`);
  console.log(`   Min Time: ${basePathResult.minTime.toFixed(4)}ms`);
  console.log(`   Max Time: ${basePathResult.maxTime.toFixed(4)}ms`);
  console.log(`   Ops/sec: ${basePathResult.opsPerSecond.toFixed(0)}`);
  console.log(`   ${basePathResult.avgTime < 1 ? '✅ PASS' : '❌ FAIL'} (<1ms target)\n`);

  // Benchmark 2: getSpecsPath() (1000 iterations)
  const specsPathResult = await benchmark(
    'getSpecsPath()',
    1000,
    () => manager.getSpecsPath()
  );

  console.log(`📊 ${specsPathResult.operation}`);
  console.log(`   Avg Time: ${specsPathResult.avgTime.toFixed(4)}ms`);
  console.log(`   ${specsPathResult.avgTime < 1 ? '✅ PASS' : '❌ FAIL'} (<1ms target)\n`);

  // Benchmark 3: getModulesPath() (1000 iterations)
  const modulesPathResult = await benchmark(
    'getModulesPath()',
    1000,
    () => manager.getModulesPath()
  );

  console.log(`📊 ${modulesPathResult.operation}`);
  console.log(`   Avg Time: ${modulesPathResult.avgTime.toFixed(4)}ms`);
  console.log(`   ${modulesPathResult.avgTime < 1 ? '✅ PASS' : '❌ FAIL'} (<1ms target)\n`);

  // Benchmark 4: getActiveProject() with caching (1000 iterations)
  const getActiveProjectResult = await benchmark(
    'getActiveProject() with caching',
    1000,
    () => manager.getActiveProject()
  );

  console.log(`📊 ${getActiveProjectResult.operation}`);
  console.log(`   Avg Time: ${getActiveProjectResult.avgTime.toFixed(4)}ms`);
  console.log(`   Ops/sec: ${getActiveProjectResult.opsPerSecond.toFixed(0)}`);
  console.log(`   ${getActiveProjectResult.avgTime < 0.1 ? '✅ PASS' : '❌ FAIL'} (<0.1ms target with caching)\n`);

  // Benchmark 5: Cache invalidation + reload
  const cacheInvalidationResult = await benchmark(
    'clearCache() + getActiveProject()',
    100,
    () => {
      manager.clearCache();
      manager.getActiveProject();
    }
  );

  console.log(`📊 ${cacheInvalidationResult.operation}`);
  console.log(`   Avg Time: ${cacheInvalidationResult.avgTime.toFixed(4)}ms`);
  console.log(`   ${cacheInvalidationResult.avgTime < 5 ? '✅ PASS' : '❌ FAIL'} (<5ms target)\n`);

  // Cleanup
  await fs.remove(testDir);

  console.log('\n=== Summary ===');
  console.log(`Total benchmarks: 5`);
  console.log(`All path resolution < 1ms: ${
    basePathResult.avgTime < 1 &&
    specsPathResult.avgTime < 1 &&
    modulesPathResult.avgTime < 1 ? '✅ PASS' : '❌ FAIL'
  }`);
  console.log(`Caching effective: ${getActiveProjectResult.avgTime < 0.1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runProjectManagerBenchmarks()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}

export { runProjectManagerBenchmarks };
