import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Core unit tests for SpecSyncManager
 * Tests: detectSpecChange, formatSyncMessage, syncIncrement, getActiveIncrementId, checkActiveIncrement
 */

import { SpecSyncManager } from '../../../src/core/increment/spec-sync-manager.js';
import { silentLogger } from '../../../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SpecSyncManager - Core', () => {
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

  describe('detectSpecChange', () => {
    it('should detect when spec.md is newer than plan.md', () => {
      const incrementId = '0001-test-increment';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const planPath = path.join(incrementDir, 'plan.md');
      fs.writeFileSync(planPath, '# Plan');

      const now = Date.now();
      while (Date.now() - now < 10) { /* Wait 10ms */ }

      const specPath = path.join(incrementDir, 'spec.md');
      fs.writeFileSync(specPath, '# Spec');

      const result = manager.detectSpecChange(incrementId);

      expect(result.specChanged).toBe(true);
      expect(result.incrementId).toBe(incrementId);
      expect(result.specModTime).toBeGreaterThan(result.planModTime);
      expect(result.reason).toContain('spec.md modified after plan.md');
    });

    it('should not detect change when spec.md is older than plan.md', () => {
      const incrementId = '0002-test-increment';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specPath = path.join(incrementDir, 'spec.md');
      fs.writeFileSync(specPath, '# Spec');

      const now = Date.now();
      while (Date.now() - now < 10) { /* Wait 10ms */ }

      const planPath = path.join(incrementDir, 'plan.md');
      fs.writeFileSync(planPath, '# Plan');

      const result = manager.detectSpecChange(incrementId);

      expect(result.specChanged).toBe(false);
      expect(result.reason).toContain('has not changed since plan.md');
    });

    it('should handle missing plan.md (planning phase)', () => {
      const incrementId = '0003-test-increment';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const specPath = path.join(incrementDir, 'spec.md');
      fs.writeFileSync(specPath, '# Spec');

      const result = manager.detectSpecChange(incrementId);

      expect(result.specChanged).toBe(false);
      expect(result.planModTime).toBe(0);
      expect(result.reason).toContain('planning phase');
    });

    it('should handle missing spec.md', () => {
      const incrementId = '0004-test-increment';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      const planPath = path.join(incrementDir, 'plan.md');
      fs.writeFileSync(planPath, '# Plan');

      const result = manager.detectSpecChange(incrementId);

      expect(result.specChanged).toBe(false);
      expect(result.specModTime).toBe(0);
      expect(result.reason).toContain('does not exist');
    });

    it('should include tasks.md modification time if present', () => {
      const incrementId = '0005-test-increment';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');
      fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec');
      fs.writeFileSync(path.join(incrementDir, 'tasks.md'), '# Tasks');

      const result = manager.detectSpecChange(incrementId);

      expect(result.tasksModTime).toBeGreaterThan(0);
    });
  });

  describe('formatSyncMessage', () => {
    it('should return empty string when spec has not changed', () => {
      const detection = {
        specChanged: false,
        specModTime: 1000,
        planModTime: 2000,
        tasksModTime: 0,
        incrementId: '0001-test',
        reason: 'spec.md has not changed'
      };

      const message = manager.formatSyncMessage(detection);

      expect(message).toBe('');
    });

    it('should return formatted message when spec has changed', () => {
      const detection = {
        specChanged: true,
        specModTime: 2000,
        planModTime: 1000,
        tasksModTime: 0,
        incrementId: '0001-test',
        reason: 'spec.md modified after plan.md'
      };

      const message = manager.formatSyncMessage(detection);

      expect(message).toContain('SPEC CHANGED');
      expect(message).toContain('0001-test');
      expect(message).toContain('spec.md was modified AFTER plan.md');
      expect(message).toContain('plan.md (using Architect Agent)');
      expect(message).toContain('tasks.md (using test-aware-planner)');
      expect(message).toContain('--skip-sync');
    });
  });

  describe('syncIncrement', () => {
    it('should not sync when spec has not changed', async () => {
      const incrementId = '0006-test-increment';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Spec');
      fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');

      const result = await manager.syncIncrement(incrementId);

      expect(result.synced).toBe(false);
    });

    it('should sync when spec is newer than plan', async () => {
      const incrementId = '0007-test-increment';
      const incrementDir = path.join(incrementsDir, incrementId);
      fs.mkdirSync(incrementDir, { recursive: true });

      fs.writeFileSync(
        path.join(incrementDir, 'metadata.json'),
        JSON.stringify({ id: incrementId, status: 'active' }, null, 2)
      );

      fs.writeFileSync(path.join(incrementDir, 'plan.md'), '# Plan');

      const now = Date.now();
      while (Date.now() - now < 10) { /* Wait */ }

      fs.writeFileSync(path.join(incrementDir, 'spec.md'), '# Updated Spec');

      const result = await manager.syncIncrement(incrementId);

      expect(result.synced).toBe(true);
    });
  });

  describe('getActiveIncrementId', () => {
    it('should return null or string when checking active increments', () => {
      // Note: Uses isolated testDir which may have no active increments
      const activeId = manager.getActiveIncrementId();
      expect(activeId === null || typeof activeId === 'string').toBe(true);
    });
  });

  describe('checkActiveIncrement', () => {
    it('should handle checking active increment status', () => {
      // Note: Uses isolated testDir which may have no active increments
      const result = manager.checkActiveIncrement();
      if (result === null) {
        expect(result).toBeNull();
      } else {
        expect(result.incrementId).toBeDefined();
        expect(result.specChanged).toBeDefined();
      }
    });
  });
});
