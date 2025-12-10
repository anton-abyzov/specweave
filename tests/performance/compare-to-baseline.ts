/**
 * Compare Performance Results to Baselines
 *
 * Detects performance regressions by comparing results to baseline thresholds
 */

import * as fs from 'fs';
import * as path from 'path';

interface Baseline {
  registry_update_latency_ms: {
    p50: number;
    p95: number;
    p99: number;
  };
  heartbeat_overhead: {
    cpu_percent_max: number;
    memory_mb_max: number;
  };
  cleanup_service_scan_time_ms: {
    sessions_10: number;
    sessions_50: number;
    sessions_100: number;
  };
  regression_threshold_percent: number;
}

interface BenchmarkResult {
  operation: string;
  iterations: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

interface ComparisonResult {
  metric: string;
  baseline: number;
  measured: number;
  diff_percent: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
}

/**
 * Compare value to baseline
 */
function compareToBaseline(
  metric: string,
  baseline: number,
  measured: number,
  threshold: number
): ComparisonResult {
  const diffPercent = ((measured - baseline) / baseline) * 100;

  let status: 'PASS' | 'WARN' | 'FAIL';
  let message: string;

  if (diffPercent > threshold) {
    status = 'FAIL';
    message = `Regression detected: ${diffPercent.toFixed(1)}% slower (threshold: ${threshold}%)`;
  } else if (diffPercent > threshold / 2) {
    status = 'WARN';
    message = `Approaching threshold: ${diffPercent.toFixed(1)}% slower`;
  } else {
    status = 'PASS';
    message = diffPercent > 0
      ? `${diffPercent.toFixed(1)}% slower (within threshold)`
      : `${Math.abs(diffPercent).toFixed(1)}% faster`;
  }

  return { metric, baseline, measured, diff_percent: diffPercent, status, message };
}

/**
 * Main comparison function
 */
function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Performance Baseline Comparison');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load baselines
  const baselinesPath = path.join(__dirname, 'baselines.json');
  const baselines: Baseline = JSON.parse(fs.readFileSync(baselinesPath, 'utf-8'));

  // Load results
  const resultsPath = path.join(__dirname, 'results.json');

  if (!fs.existsSync(resultsPath)) {
    console.error('❌ Results file not found. Run benchmarks first:');
    console.error('   ts-node tests/performance/session-registry-bench.ts');
    process.exit(1);
  }

  const results: BenchmarkResult[] = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

  const comparisons: ComparisonResult[] = [];
  const threshold = baselines.regression_threshold_percent;

  // Compare registry update latency
  const updateResult = results.find(r => r.operation === 'registry_update');
  if (updateResult) {
    comparisons.push(compareToBaseline(
      'Registry Update P50',
      baselines.registry_update_latency_ms.p50,
      updateResult.p50_ms,
      threshold
    ));

    comparisons.push(compareToBaseline(
      'Registry Update P95',
      baselines.registry_update_latency_ms.p95,
      updateResult.p95_ms,
      threshold
    ));

    comparisons.push(compareToBaseline(
      'Registry Update P99',
      baselines.registry_update_latency_ms.p99,
      updateResult.p99_ms,
      threshold
    ));
  }

  // Compare cleanup scan times
  const scan10 = results.find(r => r.operation === 'cleanup_scan_10_sessions');
  if (scan10) {
    comparisons.push(compareToBaseline(
      'Cleanup Scan (10 sessions)',
      baselines.cleanup_service_scan_time_ms.sessions_10,
      scan10.avg_ms,
      threshold
    ));
  }

  const scan50 = results.find(r => r.operation === 'cleanup_scan_50_sessions');
  if (scan50) {
    comparisons.push(compareToBaseline(
      'Cleanup Scan (50 sessions)',
      baselines.cleanup_service_scan_time_ms.sessions_50,
      scan50.avg_ms,
      threshold
    ));
  }

  const scan100 = results.find(r => r.operation === 'cleanup_scan_100_sessions');
  if (scan100) {
    comparisons.push(compareToBaseline(
      'Cleanup Scan (100 sessions)',
      baselines.cleanup_service_scan_time_ms.sessions_100,
      scan100.avg_ms,
      threshold
    ));
  }

  // Print comparison report
  console.log('Metric                          Baseline    Measured    Diff      Status');
  console.log('─────────────────────────────────────────────────────────────────────────');

  let hasFailures = false;

  for (const comp of comparisons) {
    const statusSymbol = comp.status === 'PASS' ? '✅' : comp.status === 'WARN' ? '⚠️ ' : '❌';
    const diffStr = comp.diff_percent >= 0 ? `+${comp.diff_percent.toFixed(1)}%` : `${comp.diff_percent.toFixed(1)}%`;

    console.log(
      `${comp.metric.padEnd(30)} ${comp.baseline.toFixed(1).padStart(8)} ms ${comp.measured.toFixed(1).padStart(8)} ms ${diffStr.padStart(8)}  ${statusSymbol}`
    );

    if (comp.status === 'FAIL') {
      hasFailures = true;
    }
  }

  console.log('');

  // Summary
  const passCount = comparisons.filter(c => c.status === 'PASS').length;
  const warnCount = comparisons.filter(c => c.status === 'WARN').length;
  const failCount = comparisons.filter(c => c.status === 'FAIL').length;

  console.log('Summary:');
  console.log(`  ✅ Passed:  ${passCount}/${comparisons.length}`);
  console.log(`  ⚠️  Warnings: ${warnCount}/${comparisons.length}`);
  console.log(`  ❌ Failed:  ${failCount}/${comparisons.length}`);
  console.log('');

  if (hasFailures) {
    console.log('❌ Performance regression detected!');
    console.log('');
    console.log('Failing metrics:');
    for (const comp of comparisons.filter(c => c.status === 'FAIL')) {
      console.log(`  • ${comp.metric}: ${comp.message}`);
    }
    console.log('');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  Some metrics approaching threshold');
    process.exit(0);
  } else {
    console.log('✅ All metrics within acceptable range');
    process.exit(0);
  }
}

main();
