import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpecSyncManager } from '../../../src/core/increment/spec-sync-manager.js';
import { silentLogger } from '../../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SpecSyncManager - Plan Regeneration', () => {
  let testDir: string;
  let manager: SpecSyncManager;
  let incrementsDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-test-'));
    incrementsDir = path.join(testDir, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
    manager = new SpecSyncManager(testDir, { logger: silentLogger });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('regeneration context preparation', () => {
    it('should identify plan.md needs regeneration when spec changes', async () => {
      const incrementId = '0101-plan-detect';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({ id: incrementId, status: 'active' }, null, 2)
      );
      fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Old Plan');

      const now = Date.now();
      while (Date.now() - now < 10) {}

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Updated Spec');

      const result = await manager.syncIncrement(incrementId);

      expect(result.synced).toBe(true);
      expect(result.regenerationContext?.specContent).toContain('Updated Spec');
    });
  });

  describe('plan.md diff generation', () => {
    it('should identify when plan.md has no changes needed', async () => {
      const incrementId = '0102-no-changes';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec');
      fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');

      const result = await manager.syncIncrement(incrementId);

      expect(result.synced).toBe(false);
    });
  });

  describe('error handling for plan regeneration', () => {
    it('should handle missing increment directory', () => {
      const detection = manager.detectSpecChange('9999-nonexistent');
      expect(detection.specChanged).toBe(false);
      expect(detection.reason).toContain('does not exist');
    });
  });

  describe('regeneration workflow integration', () => {
    it('should support skipping plan regeneration via flag', async () => {
      const incrementId = '0107-skip-regen';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');
      const now = Date.now();
      while (Date.now() - now < 10) {}
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec updated');

      const result = await manager.syncIncrement(incrementId, true);

      expect(result.synced).toBe(false);
      expect(result.reason).toContain('skipped by user');
    });
  });
});
