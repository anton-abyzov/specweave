/**
 * Unit Tests: Status Line Validator
 *
 * Tests the desync detection and validation logic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { StatusLineValidator } from '../../src/core/status-line-validator.js';
import { silentLogger } from '../../src/utils/logger.js';

describe('StatusLineValidator', () => {
  let validator: StatusLineValidator;
  let testRoot: string;

  beforeEach(async () => {
    validator = new StatusLineValidator({ logger: silentLogger });
    testRoot = path.join(os.tmpdir(), `validator-test-${Date.now()}`);
    await fs.ensureDir(testRoot);
  });

  afterEach(async () => {
    if (testRoot && await fs.pathExists(testRoot)) {
      await fs.remove(testRoot);
    }
  });

  describe('validateIncrement', () => {
    it('should pass validation when all metrics match', async () => {
      // Create increment with 2 completed / 3 total tasks
      // Note: 2/3 = 66.666...% which rounds to 67%
      await createTestIncrement(testRoot, '0001-test', {
        actualCompleted: 2,
        totalTasks: 3,
        frontmatterCompleted: 2,
        frontmatterTotal: 3,
        cacheCompleted: 2,
        cacheTotal: 3,
        cachePercentage: 67  // Math.round(2/3 * 100) = 67
      });

      const result = await validator.validateIncrement(testRoot, '0001-test');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.actual.completedTasks).toBe(2);
      expect(result.frontmatter.completedTasks).toBe(2);
      expect(result.cache.completedTasks).toBe(2);
    });

    it('should detect frontmatter desync', async () => {
      await createTestIncrement(testRoot, '0002-test', {
        actualCompleted: 3,
        totalTasks: 5,
        frontmatterCompleted: 2, // Stale frontmatter!
        frontmatterTotal: 5,
        cacheCompleted: 3,
        cacheTotal: 5,
        cachePercentage: 60
      });

      const result = await validator.validateIncrement(testRoot, '0002-test');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Frontmatter desync: actual=3, frontmatter=2');
      expect(result.actual.completedTasks).toBe(3);
      expect(result.frontmatter.completedTasks).toBe(2);
    });

    it('should detect cache desync', async () => {
      await createTestIncrement(testRoot, '0003-test', {
        actualCompleted: 4,
        totalTasks: 5,
        frontmatterCompleted: 4,
        frontmatterTotal: 5,
        cacheCompleted: 2, // Stale cache!
        cacheTotal: 5,
        cachePercentage: 40
      });

      const result = await validator.validateIncrement(testRoot, '0003-test');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Cache desync: actual=4, cache=2');
      expect(result.actual.completedTasks).toBe(4);
      expect(result.cache.completedTasks).toBe(2);
    });

    it('should detect percentage mismatch', async () => {
      await createTestIncrement(testRoot, '0004-test', {
        actualCompleted: 2,
        totalTasks: 5,
        frontmatterCompleted: 2,
        frontmatterTotal: 5,
        cacheCompleted: 2,
        cacheTotal: 5,
        cachePercentage: 50 // Wrong! Should be 40%
      });

      const result = await validator.validateIncrement(testRoot, '0004-test');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Percentage desync: actual=40%, cache=50%');
    });

    it('should detect stale cache (> 24 hours)', async () => {
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      await createTestIncrement(testRoot, '0005-test', {
        actualCompleted: 1,
        totalTasks: 3,
        frontmatterCompleted: 1,
        frontmatterTotal: 3,
        cacheCompleted: 1,
        cacheTotal: 3,
        cachePercentage: 33,
        cacheTimestamp: yesterday
      });

      const result = await validator.validateIncrement(testRoot, '0005-test');

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('Cache stale'))).toBe(true);
    });

    it('should handle missing cache gracefully', async () => {
      await createTestIncrement(testRoot, '0006-test', {
        actualCompleted: 2,
        totalTasks: 3,
        frontmatterCompleted: 2,
        frontmatterTotal: 3,
        createCache: false
      });

      const result = await validator.validateIncrement(testRoot, '0006-test');

      // Missing cache is OK - validation passes because cache check is skipped
      // (only current increment's cache is validated)
      expect(result.isValid).toBe(true);
      expect(result.cache.completedTasks).toBe(0);
      expect(result.cache.totalTasks).toBe(0);
    });
  });

  describe('validateAll', () => {
    it('should validate all active increments', async () => {
      // Create 2 active, 1 completed increment
      await createTestIncrement(testRoot, '0001-active-1', {
        actualCompleted: 1,
        totalTasks: 2,
        frontmatterCompleted: 1,
        frontmatterTotal: 2,
        cacheCompleted: 1,
        cacheTotal: 2,
        cachePercentage: 50,
        status: 'active'
      });

      await createTestIncrement(testRoot, '0002-active-2', {
        actualCompleted: 2,
        totalTasks: 3,
        frontmatterCompleted: 2,
        frontmatterTotal: 3,
        cacheCompleted: 2,
        cacheTotal: 3,
        cachePercentage: 67,  // Math.round(2/3 * 100) = 67
        status: 'active'
      });

      await createTestIncrement(testRoot, '0003-completed', {
        actualCompleted: 3,
        totalTasks: 3,
        frontmatterCompleted: 3,
        frontmatterTotal: 3,
        cacheCompleted: 3,
        cacheTotal: 3,
        cachePercentage: 100,
        status: 'completed'
      });

      const results = await validator.validateAll(testRoot);

      // Should only validate active increments
      expect(results).toHaveLength(2);
      expect(results.every(r => r.isValid)).toBe(true);
    });

    it('should report multiple desync issues', async () => {
      await createTestIncrement(testRoot, '0001-bad', {
        actualCompleted: 3,
        totalTasks: 5,
        frontmatterCompleted: 2, // Desync!
        frontmatterTotal: 5,
        cacheCompleted: 1, // Desync!
        cacheTotal: 5,
        cachePercentage: 20, // Desync!
        status: 'active'
      });

      const results = await validator.validateAll(testRoot);

      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(false);
      expect(results[0].issues.length).toBeGreaterThan(1);
    });
  });

  describe('generateReport', () => {
    it('should generate report with issues', async () => {
      const results = [
        {
          isValid: false,
          incrementId: '0001-test',
          actual: { completedTasks: 3, totalTasks: 5, percentage: 60 },
          frontmatter: { completedTasks: 2, totalTasks: 5 },
          cache: { completedTasks: 2, totalTasks: 5, percentage: 40, lastUpdate: '2025-11-20T00:00:00Z' },
          issues: ['Frontmatter desync: actual=3, frontmatter=2', 'Cache desync: actual=3, cache=2']
        }
      ];

      const report = validator.generateReport(results);

      expect(report).toContain('# Status Line Validation Report');
      expect(report).toContain('Invalid: 1');
      expect(report).toContain('### 0001-test');
      expect(report).toContain('Frontmatter desync');
      expect(report).toContain('Cache desync');
    });

    it('should generate clean report when all valid', async () => {
      const results = [
        {
          isValid: true,
          incrementId: '0001-test',
          actual: { completedTasks: 2, totalTasks: 3, percentage: 66 },
          frontmatter: { completedTasks: 2, totalTasks: 3 },
          cache: { completedTasks: 2, totalTasks: 3, percentage: 66, lastUpdate: '2025-11-20T00:00:00Z' },
          issues: []
        }
      ];

      const report = validator.generateReport(results);

      expect(report).toContain('All Status Lines Valid ✅');
      expect(report).toContain('Valid: 1');
      expect(report).toContain('Invalid: 0');
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

interface TestIncrementConfig {
  actualCompleted: number;
  totalTasks: number;
  frontmatterCompleted: number;
  frontmatterTotal: number;
  cacheCompleted?: number;
  cacheTotal?: number;
  cachePercentage?: number;
  cacheTimestamp?: string;
  status?: string;
  createCache?: boolean;
}

async function createTestIncrement(
  projectRoot: string,
  incrementId: string,
  config: TestIncrementConfig
): Promise<void> {
  const incrementDir = path.join(projectRoot, '.specweave', 'increments', incrementId);
  const stateDir = path.join(projectRoot, '.specweave', 'state');

  await fs.ensureDir(incrementDir);
  await fs.ensureDir(stateDir);

  // Create spec.md
  await fs.writeFile(
    path.join(incrementDir, 'spec.md'),
    `---
status: ${config.status || 'active'}
created: 2025-11-20T00:00:00Z
---

# Test Increment
`
  );

  // Create tasks.md
  const tasks: string[] = [];
  for (let i = 1; i <= config.totalTasks; i++) {
    const isCompleted = i <= config.actualCompleted;
    tasks.push(`### T-00${i}: Task ${i}
**Status**: ${isCompleted ? '[x] completed' : '[ ] pending'}
`);
  }

  await fs.writeFile(
    path.join(incrementDir, 'tasks.md'),
    `---
total_tasks: ${config.frontmatterTotal}
completed: ${config.frontmatterCompleted}
---

# Tasks

${tasks.join('\n')}
`
  );

  // Create status line cache
  if (config.createCache !== false) {
    await fs.writeJson(path.join(stateDir, 'status-line.json'), {
      current: {
        id: incrementId,
        name: incrementId,
        completed: config.cacheCompleted ?? config.actualCompleted,
        total: config.cacheTotal ?? config.totalTasks,
        percentage: config.cachePercentage ?? Math.round((config.actualCompleted / config.totalTasks) * 100)
      },
      openCount: 1,
      lastUpdate: config.cacheTimestamp || new Date().toISOString()
    });
  }
}
