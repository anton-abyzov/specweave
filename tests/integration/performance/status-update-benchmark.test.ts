import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { IncrementFactory } from '../test-utils/increment-factory.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { SpecFrontmatterUpdater } from '../../../src/core/increment/spec-frontmatter-updater.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';

describe('Status Update Performance', () => {
  let testRoot: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    testRoot = path.join(
      os.tmpdir(),
      `perf-test-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`
    );

    await fs.ensureDir(testRoot);

    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
    vi.restoreAllMocks();
  });

  it('completes updateStatus() in < 10ms average', async () => {
    // GIVEN: Test increment
    await IncrementFactory.create(testRoot, '0001-perf', {
      status: 'active',
      title: 'Performance Test'
    });

    // Warm up (JIT compilation, file system cache)
    MetadataManager.updateStatus('0001-perf', IncrementStatus.PAUSED);
    MetadataManager.updateStatus('0001-perf', IncrementStatus.ACTIVE);

    // WHEN: Benchmark 50 iterations (active → paused, paused → active)
    // Start in ACTIVE state (warm-up ended in active)
    const iterations = 50;
    const timings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Transition: active → paused
      let start = performance.now();
      MetadataManager.updateStatus('0001-perf', IncrementStatus.PAUSED);
      let duration = performance.now() - start;
      timings.push(duration);

      // Transition: paused → active
      start = performance.now();
      MetadataManager.updateStatus('0001-perf', IncrementStatus.ACTIVE);
      duration = performance.now() - start;
      timings.push(duration);
    }

    // THEN: Calculate statistics
    const avg = timings.reduce((a, b) => a + b) / timings.length;
    const sorted = [...timings].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(timings.length * 0.50)];
    const p95 = sorted[Math.floor(timings.length * 0.95)];
    const p99 = sorted[Math.floor(timings.length * 0.99)];

    console.log(`Performance Stats (${timings.length} transitions):
      Avg: ${avg.toFixed(2)}ms
      p50: ${p50.toFixed(2)}ms
      p95: ${p95.toFixed(2)}ms
      p99: ${p99.toFixed(2)}ms
    `);

    // Assert targets
    expect(avg).toBeLessThan(10);
    expect(p95).toBeLessThan(20);
  });

  it('completes spec.md read in < 2ms average', async () => {
    // GIVEN: Test increment
    await IncrementFactory.create(testRoot, '0001-read', {
      status: 'active',
      title: 'Read Test'
    });

    // WHEN: Benchmark 100 reads
    const iterations = 100;
    const timings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await SpecFrontmatterUpdater.readStatus('0001-read');
      const duration = performance.now() - start;
      timings.push(duration);
    }

    // THEN: Calculate average
    const avg = timings.reduce((a, b) => a + b) / timings.length;

    console.log(`Read Performance: ${avg.toFixed(2)}ms average`);

    expect(avg).toBeLessThan(2);
  });

  it('completes spec.md write in < 5ms average', async () => {
    // GIVEN: Test increment
    await IncrementFactory.create(testRoot, '0001-write', {
      status: 'active',
      title: 'Write Test'
    });

    // WHEN: Benchmark 50 writes (fewer iterations due to I/O)
    const iterations = 50;
    const timings: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await SpecFrontmatterUpdater.updateStatus(
        '0001-write',
        i % 2 === 0 ? IncrementStatus.ACTIVE : IncrementStatus.PAUSED
      );
      const duration = performance.now() - start;
      timings.push(duration);
    }

    // THEN: Calculate average
    const avg = timings.reduce((a, b) => a + b) / timings.length;
    const sorted = [...timings].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(iterations * 0.95)];

    console.log(`Write Performance: ${avg.toFixed(2)}ms average, p95: ${p95.toFixed(2)}ms`);

    expect(avg).toBeLessThan(5);
    expect(p95).toBeLessThan(10);
  });
});
