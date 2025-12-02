/**
 * Unit tests for BrownfieldDiscrepancyManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  BrownfieldDiscrepancyManager,
  BrownfieldDiscrepancyCreate,
} from '../../../../src/core/discrepancy/index.js';

describe('BrownfieldDiscrepancyManager', () => {
  let tempDir: string;
  let manager: BrownfieldDiscrepancyManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discrepancy-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
    manager = new BrownfieldDiscrepancyManager(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const createTestDiscrepancy = (
    overrides: Partial<BrownfieldDiscrepancyCreate> = {}
  ): BrownfieldDiscrepancyCreate => ({
    type: 'missing-docs',
    module: 'payment-service',
    codeLocation: 'src/payment/processor.ts:42',
    summary: 'Missing API documentation',
    details: 'The processPayment function has no documentation.',
    evidence: {
      codeSnippet: 'export function processPayment() { ... }',
    },
    priority: 'high',
    confidence: 85,
    autoDetected: true,
    status: 'pending',
    detectedAt: new Date().toISOString(),
    detectedBy: 'brownfield-analyzer',
    lastChecked: new Date().toISOString(),
    ...overrides,
  });

  describe('createDiscrepancy', () => {
    it('should create discrepancy with auto-generated ID', async () => {
      const data = createTestDiscrepancy();
      const result = await manager.createDiscrepancy(data);

      expect(result.id).toBe('DISC-0001');
      expect(result.type).toBe('missing-docs');
      expect(result.module).toBe('payment-service');
    });

    it('should increment ID for each new discrepancy', async () => {
      const disc1 = await manager.createDiscrepancy(createTestDiscrepancy());
      const disc2 = await manager.createDiscrepancy(createTestDiscrepancy());
      const disc3 = await manager.createDiscrepancy(createTestDiscrepancy());

      expect(disc1.id).toBe('DISC-0001');
      expect(disc2.id).toBe('DISC-0002');
      expect(disc3.id).toBe('DISC-0003');
    });

    it('should persist discrepancy to filesystem', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy());

      const filePath = path.join(
        tempDir,
        '.specweave',
        'discrepancies',
        'pending',
        '0001-0100',
        'DISC-0001.json'
      );
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(content.id).toBe('DISC-0001');
    });
  });

  describe('getDiscrepancy', () => {
    it('should retrieve discrepancy by ID', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy());

      const result = await manager.getDiscrepancy('DISC-0001');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('DISC-0001');
      expect(result?.type).toBe('missing-docs');
    });

    it('should return null for non-existent ID', async () => {
      const result = await manager.getDiscrepancy('DISC-9999');
      expect(result).toBeNull();
    });
  });

  describe('updateDiscrepancy', () => {
    it('should update discrepancy fields', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy());

      const updated = await manager.updateDiscrepancy('DISC-0001', {
        priority: 'critical',
        summary: 'Updated summary',
      });

      expect(updated?.priority).toBe('critical');
      expect(updated?.summary).toBe('Updated summary');
    });

    it('should update lastChecked on update', async () => {
      const disc = await manager.createDiscrepancy(createTestDiscrepancy());
      const originalLastChecked = disc.lastChecked;

      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 10));

      const updated = await manager.updateDiscrepancy('DISC-0001', {
        summary: 'Updated',
      });

      expect(new Date(updated!.lastChecked).getTime()).toBeGreaterThan(
        new Date(originalLastChecked).getTime()
      );
    });

    it('should return null for non-existent ID', async () => {
      const result = await manager.updateDiscrepancy('DISC-9999', {
        summary: 'Test',
      });
      expect(result).toBeNull();
    });
  });

  describe('listDiscrepancies', () => {
    it('should list all discrepancies', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy({ module: 'mod1' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ module: 'mod2' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ module: 'mod3' }));

      const result = await manager.listDiscrepancies();

      expect(result.length).toBe(3);
    });

    it('should filter by module', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy({ module: 'payment' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ module: 'auth' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ module: 'payment' }));

      const result = await manager.listDiscrepancies({ module: 'payment' });

      expect(result.length).toBe(2);
      expect(result.every(d => d.module === 'payment')).toBe(true);
    });

    it('should filter by type', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy({ type: 'missing-docs' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ type: 'stale-docs' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ type: 'missing-docs' }));

      const result = await manager.listDiscrepancies({ type: 'missing-docs' });

      expect(result.length).toBe(2);
      expect(result.every(d => d.type === 'missing-docs')).toBe(true);
    });

    it('should filter by priority', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy({ priority: 'critical' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ priority: 'low' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ priority: 'critical' }));

      const result = await manager.listDiscrepancies({ priority: 'critical' });

      expect(result.length).toBe(2);
      expect(result.every(d => d.priority === 'critical')).toBe(true);
    });

    it('should filter by minimum confidence', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy({ confidence: 90 }));
      await manager.createDiscrepancy(createTestDiscrepancy({ confidence: 50 }));
      await manager.createDiscrepancy(createTestDiscrepancy({ confidence: 75 }));

      const result = await manager.listDiscrepancies({ minConfidence: 70 });

      expect(result.length).toBe(2);
      expect(result.every(d => d.confidence >= 70)).toBe(true);
    });

    it('should apply pagination', async () => {
      for (let i = 0; i < 10; i++) {
        await manager.createDiscrepancy(createTestDiscrepancy({ module: `mod-${i}` }));
      }

      const page1 = await manager.listDiscrepancies({ limit: 3, offset: 0 });
      const page2 = await manager.listDiscrepancies({ limit: 3, offset: 3 });

      expect(page1.length).toBe(3);
      expect(page2.length).toBe(3);
    });

    it('should sort by priority then date', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy({ priority: 'low' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ priority: 'critical' }));
      await manager.createDiscrepancy(createTestDiscrepancy({ priority: 'high' }));

      const result = await manager.listDiscrepancies();

      expect(result[0].priority).toBe('critical');
      expect(result[1].priority).toBe('high');
      expect(result[2].priority).toBe('low');
    });
  });

  describe('getStats', () => {
    it('should calculate stats correctly', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy({
        type: 'missing-docs',
        priority: 'high',
      }));
      await manager.createDiscrepancy(createTestDiscrepancy({
        type: 'stale-docs',
        priority: 'critical',
      }));
      await manager.createDiscrepancy(createTestDiscrepancy({
        type: 'missing-docs',
        priority: 'low',
      }));

      const stats = await manager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(3);
      expect(stats.byType['missing-docs']).toBe(2);
      expect(stats.byType['stale-docs']).toBe(1);
      expect(stats.byPriority.critical).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.low).toBe(1);
    });
  });

  describe('linkToIncrement', () => {
    it('should link discrepancy to increment', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy());

      await manager.linkToIncrement('DISC-0001', '0086-brownfield');

      const disc = await manager.getDiscrepancy('DISC-0001');
      expect(disc?.status).toBe('in-progress');
      expect(disc?.incrementId).toBe('0086-brownfield');
    });
  });

  describe('resolveDiscrepancy', () => {
    it('should resolve discrepancy and move to resolved folder', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy());

      await manager.resolveDiscrepancy('DISC-0001', {
        type: 'doc-updated',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'user',
      });

      const disc = await manager.getDiscrepancy('DISC-0001');
      expect(disc?.status).toBe('resolved');
      expect(disc?.resolution?.type).toBe('doc-updated');
    });
  });

  describe('ignoreDiscrepancy', () => {
    it('should ignore discrepancy with reason', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy());

      await manager.ignoreDiscrepancy('DISC-0001', 'False positive - test code');

      const disc = await manager.getDiscrepancy('DISC-0001');
      expect(disc?.status).toBe('ignored');
      expect(disc?.resolution?.type).toBe('false-positive');
      expect(disc?.resolution?.notes).toBe('False positive - test code');
    });
  });

  describe('createBatch', () => {
    it('should create multiple discrepancies at once', async () => {
      const data = [
        createTestDiscrepancy({ module: 'mod1' }),
        createTestDiscrepancy({ module: 'mod2' }),
        createTestDiscrepancy({ module: 'mod3' }),
      ];

      const results = await manager.createBatch(data);

      expect(results.length).toBe(3);
      expect(results[0].id).toBe('DISC-0001');
      expect(results[1].id).toBe('DISC-0002');
      expect(results[2].id).toBe('DISC-0003');
    });
  });

  describe('getBatchFolder', () => {
    it('should place DISC-0001 in 0001-0100 folder', () => {
      expect(manager.getBatchFolder(1)).toBe('0001-0100');
      expect(manager.getBatchFolder(50)).toBe('0001-0100');
      expect(manager.getBatchFolder(100)).toBe('0001-0100');
    });

    it('should place DISC-0101 in 0101-0200 folder', () => {
      expect(manager.getBatchFolder(101)).toBe('0101-0200');
      expect(manager.getBatchFolder(150)).toBe('0101-0200');
      expect(manager.getBatchFolder(200)).toBe('0101-0200');
    });

    it('should handle higher numbers', () => {
      expect(manager.getBatchFolder(1001)).toBe('1001-1100');
      expect(manager.getBatchFolder(9999)).toBe('9901-10000');
    });
  });

  describe('deleteDiscrepancy', () => {
    it('should delete discrepancy', async () => {
      await manager.createDiscrepancy(createTestDiscrepancy());

      const deleted = await manager.deleteDiscrepancy('DISC-0001');
      expect(deleted).toBe(true);

      const disc = await manager.getDiscrepancy('DISC-0001');
      expect(disc).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const deleted = await manager.deleteDiscrepancy('DISC-9999');
      expect(deleted).toBe(false);
    });
  });
});
