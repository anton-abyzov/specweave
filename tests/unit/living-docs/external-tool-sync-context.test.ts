/**
 * External Tool Sync Context Detection Tests
 *
 * Tests the SKIP_EXTERNAL_SYNC environment variable protection
 * that prevents infinite recursion in hook context.
 *
 * See: ADR-0131 (External Tool Sync Context Detection)
 * See: .specweave/increments/0053-safe-feature-deletion/reports/ORCHESTRATOR-FIX-COMPREHENSIVE-ANALYSIS-2025-11-24.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LivingDocsSync } from '../../../src/core/living-docs/living-docs-sync.js';
import { silentLogger } from '../../../src/utils/logger.js';
import { createIsolatedTestDir } from '../../test-utils/isolated-test-dir.js';
import * as fs from 'fs';
import * as path from 'path';

describe('External Tool Sync Context Detection', () => {
  let projectRoot: string;
  let cleanup: () => void;

  beforeEach(async () => {
    const isolated = await createIsolatedTestDir('external-tool-sync-context');
    projectRoot = isolated.testDir;
    cleanup = isolated.cleanup;

    // Create minimal project structure
    const incrementPath = path.join(projectRoot, '.specweave/increments/0001-test');
    await fs.promises.mkdir(incrementPath, { recursive: true });

    // Create spec.md with minimal content
    const specContent = `---
increment: 0001-test
title: Test Increment
feature_id: FS-001
---

# Test Increment

## User Stories

### US-001: Test Story

- [ ] **AC-US1-01**: Test criterion
`;
    await fs.promises.writeFile(path.join(incrementPath, 'spec.md'), specContent);

    // Create metadata.json
    const metadata = {
      id: '0001-test',
      status: 'active',
      feature_id: 'FS-001'
    };
    await fs.promises.writeFile(
      path.join(incrementPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
  });

  afterEach(async () => {
    cleanup();
    delete process.env.SKIP_EXTERNAL_SYNC;
  });

  describe('Hook Context (SKIP_EXTERNAL_SYNC=true)', () => {
    beforeEach(() => {
      process.env.SKIP_EXTERNAL_SYNC = 'true';
    });

    it('should skip external tool sync when SKIP_EXTERNAL_SYNC is set', async () => {
      const sync = new LivingDocsSync(projectRoot, { logger: silentLogger });

      // Spy on syncToExternalTools (private method)
      const syncToExternalToolsSpy = vi.spyOn(
        sync as any,
        'syncToExternalTools'
      );

      const result = await sync.syncIncrement('0001-test');

      expect(result.success).toBe(true);
      expect(syncToExternalToolsSpy).not.toHaveBeenCalled();
    });

    it('should log skip message when external sync is skipped', async () => {
      const logSpy = vi.fn();
      const testLogger = {
        log: logSpy,
        error: vi.fn(),
        warn: vi.fn()
      };

      const sync = new LivingDocsSync(projectRoot, { logger: testLogger });

      await sync.syncIncrement('0001-test');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('External tool sync skipped')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('SKIP_EXTERNAL_SYNC=true')
      );
    });

    it('should still sync living docs even when external sync is skipped', async () => {
      const sync = new LivingDocsSync(projectRoot, { logger: silentLogger });

      const result = await sync.syncIncrement('0001-test');

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-001');
      // Living docs should be created
      const featurePath = path.join(
        projectRoot,
        '.specweave/docs/internal/specs/_features/FS-001'
      );
      expect(fs.existsSync(featurePath)).toBe(true);
    });
  });

  describe('User Context (SKIP_EXTERNAL_SYNC not set)', () => {
    it('should allow external tool sync when SKIP_EXTERNAL_SYNC is not set', async () => {
      const sync = new LivingDocsSync(projectRoot, { logger: silentLogger });

      // Spy on syncToExternalTools
      const syncToExternalToolsSpy = vi.spyOn(
        sync as any,
        'syncToExternalTools'
      );

      const result = await sync.syncIncrement('0001-test');

      expect(result.success).toBe(true);
      expect(syncToExternalToolsSpy).toHaveBeenCalled();
    });

    it('should not log skip message when external sync runs', async () => {
      const logSpy = vi.fn();
      const testLogger = {
        log: logSpy,
        error: vi.fn(),
        warn: vi.fn()
      };

      const sync = new LivingDocsSync(projectRoot, { logger: testLogger });

      await sync.syncIncrement('0001-test');

      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('External tool sync skipped')
      );
    });
  });

  describe('Dry Run Mode', () => {
    it('should skip external sync in dry run mode regardless of SKIP_EXTERNAL_SYNC', async () => {
      process.env.SKIP_EXTERNAL_SYNC = 'false';

      const sync = new LivingDocsSync(projectRoot, { logger: silentLogger });

      const syncToExternalToolsSpy = vi.spyOn(
        sync as any,
        'syncToExternalTools'
      );

      const result = await sync.syncIncrement('0001-test', { dryRun: true });

      expect(result.success).toBe(true);
      expect(syncToExternalToolsSpy).not.toHaveBeenCalled();
    });
  });

  describe('Two-Context Architecture', () => {
    it('should demonstrate hook context behavior', async () => {
      // Simulate hook context
      process.env.SKIP_EXTERNAL_SYNC = 'true';

      const logSpy = vi.fn();
      const testLogger = {
        log: logSpy,
        error: vi.fn(),
        warn: vi.fn()
      };

      const sync = new LivingDocsSync(projectRoot, { logger: testLogger });

      await sync.syncIncrement('0001-test');

      // Verify hook context protection
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('External tool sync skipped')
      );
    });

    it('should demonstrate user context behavior', async () => {
      // Simulate user context (no SKIP flag)
      delete process.env.SKIP_EXTERNAL_SYNC;

      const sync = new LivingDocsSync(projectRoot, { logger: silentLogger });

      const syncToExternalToolsSpy = vi.spyOn(
        sync as any,
        'syncToExternalTools'
      );

      await sync.syncIncrement('0001-test');

      // Verify user context allows external sync
      expect(syncToExternalToolsSpy).toHaveBeenCalled();
    });
  });
});
