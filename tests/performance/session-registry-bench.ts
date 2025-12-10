/**
 * Session Registry Performance Benchmark
 *
 * Measures registry update latency and performance
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface BenchmarkResults {
  operation: string;
  iterations: number;
  total_ms: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  min_ms: number;
  max_ms: number;
}

/**
 * Measure registry update latency
 */
async function benchmarkRegistryUpdates(iterations: number = 1000): Promise<BenchmarkResults> {
  const projectRoot = process.cwd();
  const sessionId = `bench-${Date.now()}`;
  const latencies: number[] = [];

  console.log(`🔬 Benchmarking registry updates (${iterations} iterations)...`);

  // Register session first
  execSync(
    `node dist/src/cli/register-session.js "${sessionId}" ${process.pid} "benchmark"`,
    { cwd: projectRoot, stdio: 'pipe' }
  );

  // Measure heartbeat update latency
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    execSync(
      `node dist/src/cli/update-heartbeat.js "${sessionId}"`,
      { cwd: projectRoot, stdio: 'pipe' }
    );

    const end = performance.now();
    latencies.push(end - start);

    if (i % 100 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${iterations}`);
    }
  }

  // Clean up
  execSync(
    `node dist/src/cli/remove-session.js "${sessionId}"`,
    { cwd: projectRoot, stdio: 'pipe' }
  );

  // Calculate statistics
  latencies.sort((a, b) => a - b);

  const totalMs = latencies.reduce((sum, val) => sum + val, 0);
  const avgMs = totalMs / iterations;
  const p50Ms = latencies[Math.floor(iterations * 0.5)];
  const p95Ms = latencies[Math.floor(iterations * 0.95)];
  const p99Ms = latencies[Math.floor(iterations * 0.99)];
  const minMs = latencies[0];
  const maxMs = latencies[latencies.length - 1];

  return {
    operation: 'registry_update',
    iterations,
    total_ms: totalMs,
    avg_ms: avgMs,
    p50_ms: p50Ms,
    p95_ms: p95Ms,
    p99_ms: p99Ms,
    min_ms: minMs,
    max_ms: maxMs
  };
}

/**
 * Measure cleanup service scan time
 */
async function benchmarkCleanupScan(sessionCount: number): Promise<BenchmarkResults> {
  const projectRoot = process.cwd();
  const sessionIds: string[] = [];

  console.log(`\n🔬 Benchmarking cleanup scan (${sessionCount} sessions)...`);

  // Create mock sessions
  for (let i = 0; i < sessionCount; i++) {
    const sessionId = `bench-scan-${i}-${Date.now()}`;
    sessionIds.push(sessionId);

    execSync(
      `node dist/src/cli/register-session.js "${sessionId}" ${10000 + i} "benchmark"`,
      { cwd: projectRoot, stdio: 'pipe' }
    );
  }

  console.log(`  Created ${sessionCount} sessions`);

  // Measure scan time (dry-run)
  const measurements: number[] = [];

  for (let i = 0; i < 10; i++) {
    const start = performance.now();

    execSync(
      `node dist/src/cli/get-stale-sessions.js 60`,
      { cwd: projectRoot, stdio: 'pipe' }
    );

    const end = performance.now();
    measurements.push(end - start);
  }

  // Clean up sessions
  for (const sessionId of sessionIds) {
    execSync(
      `node dist/src/cli/remove-session.js "${sessionId}"`,
      { cwd: projectRoot, stdio: 'pipe' }
    );
  }

  measurements.sort((a, b) => a - b);

  const totalMs = measurements.reduce((sum, val) => sum + val, 0);
  const avgMs = totalMs / measurements.length;

  return {
    operation: `cleanup_scan_${sessionCount}_sessions`,
    iterations: measurements.length,
    total_ms: totalMs,
    avg_ms: avgMs,
    p50_ms: measurements[Math.floor(measurements.length * 0.5)],
    p95_ms: measurements[Math.floor(measurements.length * 0.95)],
    p99_ms: measurements[Math.floor(measurements.length * 0.99)],
    min_ms: measurements[0],
    max_ms: measurements[measurements.length - 1]
  };
}

/**
 * Main benchmark runner
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Session Registry Performance Benchmark');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results: BenchmarkResults[] = [];

  // Benchmark 1: Registry updates
  const updateResults = await benchmarkRegistryUpdates(1000);
  results.push(updateResults);

  // Benchmark 2: Cleanup scans
  const scanResults10 = await benchmarkCleanupScan(10);
  results.push(scanResults10);

  const scanResults50 = await benchmarkCleanupScan(50);
  results.push(scanResults50);

  const scanResults100 = await benchmarkCleanupScan(100);
  results.push(scanResults100);

  // Print results
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Benchmark Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const result of results) {
    console.log(`${result.operation}:`);
    console.log(`  Iterations: ${result.iterations}`);
    console.log(`  Average:    ${result.avg_ms.toFixed(2)} ms`);
    console.log(`  P50:        ${result.p50_ms.toFixed(2)} ms`);
    console.log(`  P95:        ${result.p95_ms.toFixed(2)} ms`);
    console.log(`  P99:        ${result.p99_ms.toFixed(2)} ms`);
    console.log(`  Min:        ${result.min_ms.toFixed(2)} ms`);
    console.log(`  Max:        ${result.max_ms.toFixed(2)} ms`);
    console.log('');
  }

  // Save results to file
  const resultsFile = path.join(process.cwd(), 'tests/performance/results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

  console.log(`✅ Results saved to: ${resultsFile}\n`);
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
