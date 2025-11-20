/**
 * Tests for DesyncDetector - Status desync detection and recovery
 *
 * Incident Reference: 2025-11-20 - Silent failure caused increment 0047
 * to have metadata.json="completed" while spec.md="active"
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import matter from 'gray-matter';
import { DesyncDetector } from '../../../src/core/increment/desync-detector.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';
import { silentLogger } from '../../../src/utils/logger.js';

describe('DesyncDetector', () => {
  let testDir: string;
  let incrementsDir: string;
  let detector: DesyncDetector;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `desync-test-${Date.now()}`);
    incrementsDir = path.join(testDir, '.specweave', 'increments');
    await fs.ensureDir(incrementsDir);

    detector = new DesyncDetector({
      logger: silentLogger,
      projectRoot: testDir,
    });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('checkIncrement', () => {
    it('should detect no desync when both statuses match', async () => {
      // Create increment with matching statuses
      const incrementId = '0001-test';
      await createIncrement(incrementId, IncrementStatus.ACTIVE, IncrementStatus.ACTIVE);

      const result = await detector.checkIncrement(incrementId);

      expect(result.hasDesync).toBe(false);
      expect(result.metadataStatus).toBe(IncrementStatus.ACTIVE);
      expect(result.specStatus).toBe(IncrementStatus.ACTIVE);
      expect(result.error).toBeUndefined();
    });

    it('should detect desync when statuses differ', async () => {
      // Create increment with mismatched statuses (the bug!)
      const incrementId = '0047-us-task-linkage';
      await createIncrement(
        incrementId,
        IncrementStatus.COMPLETED, // metadata.json
        IncrementStatus.ACTIVE      // spec.md
      );

      const result = await detector.checkIncrement(incrementId);

      expect(result.hasDesync).toBe(true);
      expect(result.metadataStatus).toBe(IncrementStatus.COMPLETED);
      expect(result.specStatus).toBe(IncrementStatus.ACTIVE);
      expect(result.error).toBeUndefined();
    });

    it('should handle missing metadata.json gracefully', async () => {
      const incrementId = '0002-test';
      const incrementDir = path.join(incrementsDir, incrementId);
      await fs.ensureDir(incrementDir);

      // Create only spec.md, no metadata.json
      await createSpecMd(incrementDir, IncrementStatus.ACTIVE);

      const result = await detector.checkIncrement(incrementId);

      expect(result.hasDesync).toBe(false);
      expect(result.metadataStatus).toBe(null);
      expect(result.specStatus).toBe(IncrementStatus.ACTIVE);
    });

    it('should handle missing spec.md gracefully', async () => {
      const incrementId = '0003-test';
      const incrementDir = path.join(incrementsDir, incrementId);
      await fs.ensureDir(incrementDir);

      // Create only metadata.json, no spec.md
      await createMetadataJson(incrementDir, IncrementStatus.ACTIVE);

      const result = await detector.checkIncrement(incrementId);

      expect(result.hasDesync).toBe(false);
      expect(result.metadataStatus).toBe(IncrementStatus.ACTIVE);
      expect(result.specStatus).toBe(null);
    });

    it('should handle missing increment directory gracefully', async () => {
      const incrementId = '9999-nonexistent';

      const result = await detector.checkIncrement(incrementId);

      expect(result.hasDesync).toBe(false);
      expect(result.metadataStatus).toBe(null);
      expect(result.specStatus).toBe(null);
    });

    it('should detect all status transition desyncs', async () => {
      const testCases: Array<{
        metadata: IncrementStatus;
        spec: IncrementStatus;
      }> = [
        { metadata: IncrementStatus.ACTIVE, spec: IncrementStatus.COMPLETED },
        { metadata: IncrementStatus.COMPLETED, spec: IncrementStatus.ACTIVE },
        { metadata: IncrementStatus.PAUSED, spec: IncrementStatus.ACTIVE },
        { metadata: IncrementStatus.BACKLOG, spec: IncrementStatus.ACTIVE },
        { metadata: IncrementStatus.ABANDONED, spec: IncrementStatus.ACTIVE },
      ];

      for (let i = 0; i < testCases.length; i++) {
        const { metadata, spec } = testCases[i];
        const incrementId = `000${i + 4}-test`;
        await createIncrement(incrementId, metadata, spec);

        const result = await detector.checkIncrement(incrementId);

        expect(result.hasDesync).toBe(true);
        expect(result.metadataStatus).toBe(metadata);
        expect(result.specStatus).toBe(spec);
      }
    });
  });

  describe('scanAll', () => {
    it('should scan all increments and find no desyncs', async () => {
      // Create 3 healthy increments
      await createIncrement('0001-test', IncrementStatus.ACTIVE, IncrementStatus.ACTIVE);
      await createIncrement('0002-test', IncrementStatus.COMPLETED, IncrementStatus.COMPLETED);
      await createIncrement('0003-test', IncrementStatus.PAUSED, IncrementStatus.PAUSED);

      const report = await detector.scanAll();

      expect(report.totalScanned).toBe(3);
      expect(report.totalDesyncs).toBe(0);
      expect(report.healthy).toHaveLength(3);
      expect(report.desyncs).toHaveLength(0);
      expect(report.errors).toHaveLength(0);
    });

    it('should scan all increments and find desyncs', async () => {
      // Create 2 healthy, 2 desynced increments
      await createIncrement('0001-healthy', IncrementStatus.ACTIVE, IncrementStatus.ACTIVE);
      await createIncrement('0002-desynced', IncrementStatus.COMPLETED, IncrementStatus.ACTIVE);
      await createIncrement('0003-healthy', IncrementStatus.COMPLETED, IncrementStatus.COMPLETED);
      await createIncrement('0004-desynced', IncrementStatus.PAUSED, IncrementStatus.ACTIVE);

      const report = await detector.scanAll();

      expect(report.totalScanned).toBe(4);
      expect(report.totalDesyncs).toBe(2);
      expect(report.healthy).toHaveLength(2);
      expect(report.desyncs).toHaveLength(2);
      expect(report.errors).toHaveLength(0);

      expect(report.desyncs[0].incrementId).toBe('0002-desynced');
      expect(report.desyncs[1].incrementId).toBe('0004-desynced');
    });

    it('should skip _archive directory', async () => {
      // Create increments in archive
      const archiveDir = path.join(incrementsDir, '_archive');
      await fs.ensureDir(archiveDir);
      await fs.ensureDir(path.join(archiveDir, '0099-archived'));

      // Create active increment
      await createIncrement('0001-active', IncrementStatus.ACTIVE, IncrementStatus.ACTIVE);

      const report = await detector.scanAll();

      expect(report.totalScanned).toBe(1);
      expect(report.healthy).toEqual(['0001-active']);
    });

    it('should handle empty increments directory', async () => {
      const report = await detector.scanAll();

      expect(report.totalScanned).toBe(0);
      expect(report.totalDesyncs).toBe(0);
      expect(report.healthy).toHaveLength(0);
      expect(report.desyncs).toHaveLength(0);
    });
  });

  describe('fixDesync', () => {
    it('should fix desync by updating spec.md to match metadata.json', async () => {
      const incrementId = '0047-us-task-linkage';
      await createIncrement(
        incrementId,
        IncrementStatus.COMPLETED, // metadata.json (source of truth)
        IncrementStatus.ACTIVE      // spec.md (wrong!)
      );

      const fixed = await detector.fixDesync(incrementId);

      expect(fixed).toBe(true);

      // Verify spec.md was updated
      const incrementDir = path.join(incrementsDir, incrementId);
      const specPath = path.join(incrementDir, 'spec.md');
      const content = await fs.readFile(specPath, 'utf-8');
      const parsed = matter(content);

      expect(parsed.data.status).toBe(IncrementStatus.COMPLETED);

      // Verify no desync remains
      const result = await detector.checkIncrement(incrementId);
      expect(result.hasDesync).toBe(false);
    });

    it('should not fix if no desync exists', async () => {
      const incrementId = '0001-test';
      await createIncrement(incrementId, IncrementStatus.ACTIVE, IncrementStatus.ACTIVE);

      const fixed = await detector.fixDesync(incrementId);

      expect(fixed).toBe(false);
    });

    it('should handle missing metadata.json', async () => {
      const incrementId = '0002-test';
      const incrementDir = path.join(incrementsDir, incrementId);
      await fs.ensureDir(incrementDir);
      await createSpecMd(incrementDir, IncrementStatus.ACTIVE);

      const fixed = await detector.fixDesync(incrementId);

      expect(fixed).toBe(false);
    });

    it('should handle file write errors gracefully', async () => {
      const incrementId = '0003-test';
      await createIncrement(incrementId, IncrementStatus.COMPLETED, IncrementStatus.ACTIVE);

      // Make spec.md read-only to trigger write error
      const specPath = path.join(incrementsDir, incrementId, 'spec.md');
      await fs.chmod(specPath, 0o444);

      const fixed = await detector.fixDesync(incrementId);

      expect(fixed).toBe(false);

      // Restore permissions
      await fs.chmod(specPath, 0o644);
    });

    it('should fix multiple desyncs in sequence', async () => {
      await createIncrement('0001-test', IncrementStatus.COMPLETED, IncrementStatus.ACTIVE);
      await createIncrement('0002-test', IncrementStatus.PAUSED, IncrementStatus.ACTIVE);
      await createIncrement('0003-test', IncrementStatus.BACKLOG, IncrementStatus.ACTIVE);

      const fixed1 = await detector.fixDesync('0001-test');
      const fixed2 = await detector.fixDesync('0002-test');
      const fixed3 = await detector.fixDesync('0003-test');

      expect(fixed1).toBe(true);
      expect(fixed2).toBe(true);
      expect(fixed3).toBe(true);

      // Verify all fixed
      const report = await detector.scanAll();
      expect(report.totalDesyncs).toBe(0);
    });
  });

  describe('validateOrThrow', () => {
    it('should not throw if no desync', async () => {
      const incrementId = '0001-test';
      await createIncrement(incrementId, IncrementStatus.ACTIVE, IncrementStatus.ACTIVE);

      await expect(detector.validateOrThrow(incrementId)).resolves.toBeUndefined();
    });

    it('should throw if desync detected', async () => {
      const incrementId = '0047-us-task-linkage';
      await createIncrement(
        incrementId,
        IncrementStatus.COMPLETED,
        IncrementStatus.ACTIVE
      );

      await expect(detector.validateOrThrow(incrementId)).rejects.toThrow(
        /CRITICAL: Status desync detected/
      );
      await expect(detector.validateOrThrow(incrementId)).rejects.toThrow(
        /metadata.json: completed/
      );
      await expect(detector.validateOrThrow(incrementId)).rejects.toThrow(
        /spec.md: active/
      );
    });

    it('should include fix command in error message', async () => {
      const incrementId = '0047-us-task-linkage';
      await createIncrement(
        incrementId,
        IncrementStatus.COMPLETED,
        IncrementStatus.ACTIVE
      );

      await expect(detector.validateOrThrow(incrementId)).rejects.toThrow(
        /\/specweave:sync-status/
      );
    });
  });

  describe('formatReport', () => {
    it('should format report with no desyncs', async () => {
      await createIncrement('0001-test', IncrementStatus.ACTIVE, IncrementStatus.ACTIVE);

      const report = await detector.scanAll();
      const formatted = detector.formatReport(report);

      expect(formatted).toContain('STATUS DESYNC DETECTION REPORT');
      expect(formatted).toContain('Total Scanned: 1');
      expect(formatted).toContain('Desyncs Found: 0');
      expect(formatted).toContain('✅ All increments healthy');
    });

    it('should format report with desyncs', async () => {
      await createIncrement('0047-us-task-linkage', IncrementStatus.COMPLETED, IncrementStatus.ACTIVE);

      const report = await detector.scanAll();
      const formatted = detector.formatReport(report);

      expect(formatted).toContain('DESYNCS DETECTED (CRITICAL!)');
      expect(formatted).toContain('❌ 0047-us-task-linkage');
      expect(formatted).toContain('metadata.json: completed');
      expect(formatted).toContain('spec.md:       active');
      expect(formatted).toContain('Fix command: /specweave:sync-status');
    });
  });

  // Helper functions
  async function createIncrement(
    incrementId: string,
    metadataStatus: IncrementStatus,
    specStatus: IncrementStatus
  ): Promise<void> {
    const incrementDir = path.join(incrementsDir, incrementId);
    await fs.ensureDir(incrementDir);

    await createMetadataJson(incrementDir, metadataStatus);
    await createSpecMd(incrementDir, specStatus);
  }

  async function createMetadataJson(
    incrementDir: string,
    status: IncrementStatus
  ): Promise<void> {
    const metadata = {
      id: path.basename(incrementDir),
      status,
      type: 'feature',
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    await fs.writeJson(path.join(incrementDir, 'metadata.json'), metadata, {
      spaces: 2,
    });
  }

  async function createSpecMd(
    incrementDir: string,
    status: IncrementStatus
  ): Promise<void> {
    const frontmatter = {
      increment: path.basename(incrementDir),
      title: 'Test Increment',
      type: 'feature',
      priority: 'P1',
      status,
      created: '2025-11-20',
    };

    const content = matter.stringify('# Test Increment\n\nTest content', frontmatter);
    await fs.writeFile(path.join(incrementDir, 'spec.md'), content, 'utf-8');
  }
});
