/**
 * Session State Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SessionStateManager } from '../../../src/core/auto/session-state.js';
import { AutoSession } from '../../../src/core/auto/types.js';

describe('SessionStateManager', () => {
  let tempDir: string;
  let manager: SessionStateManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-test-'));
    manager = new SessionStateManager(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = SessionStateManager.generateSessionId();
      const id2 = SessionStateManager.generateSessionId();

      expect(id1).toMatch(/^auto-\d{4}-\d{2}-\d{2}-[a-z0-9]{6}$/);
      expect(id2).toMatch(/^auto-\d{4}-\d{2}-\d{2}-[a-z0-9]{6}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createSession', () => {
    it('should create session with defaults', () => {
      const session = manager.createSession({
        incrementQueue: ['0001', '0002'],
      });

      expect(session.sessionId).toMatch(/^auto-/);
      expect(session.status).toBe('running');
      expect(session.iteration).toBe(0);
      expect(session.maxIterations).toBe(100);
      expect(session.incrementQueue).toEqual(['0001', '0002']);
      expect(session.currentIncrement).toBe('0001');
      expect(session.completedIncrements).toEqual([]);
      expect(session.circuitBreakers.github.state).toBe('closed');
    });

    it('should create session with custom options', () => {
      const session = manager.createSession({
        incrementQueue: ['0003'],
        maxIterations: 50,
        maxHours: 8,
        simple: true,
      });

      expect(session.maxIterations).toBe(50);
      expect(session.maxHours).toBe(8);
      expect(session.simple).toBe(true);
    });
  });

  describe('save and load', () => {
    it('should save session to disk', () => {
      const session = manager.createSession({
        incrementQueue: ['0001'],
      });

      const result = manager.save(session);
      expect(result).toBe(true);

      const statePath = path.join(tempDir, '.specweave/state/auto-session.json');
      expect(fs.existsSync(statePath)).toBe(true);
    });

    it('should load session from disk', () => {
      const session = manager.createSession({
        incrementQueue: ['0001', '0002'],
      });
      manager.save(session);

      const loaded = manager.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.sessionId).toBe(session.sessionId);
      expect(loaded!.incrementQueue).toEqual(['0001', '0002']);
    });

    it('should return null when no session exists', () => {
      const loaded = manager.load();
      expect(loaded).toBeNull();
    });

    it('should return null for corrupted state file', () => {
      const stateDir = path.join(tempDir, '.specweave/state');
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(path.join(stateDir, 'auto-session.json'), 'invalid json{', 'utf-8');

      const loaded = manager.load();
      expect(loaded).toBeNull();
    });
  });

  describe('hasActiveSession', () => {
    it('should return false when no session', () => {
      expect(manager.hasActiveSession()).toBe(false);
    });

    it('should return true for running session', () => {
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);

      expect(manager.hasActiveSession()).toBe(true);
    });

    it('should return false for completed session', () => {
      const session = manager.createSession({ incrementQueue: ['0001'] });
      session.status = 'completed';
      manager.save(session);

      expect(manager.hasActiveSession()).toBe(false);
    });
  });

  describe('updateStatus', () => {
    it('should update session status', () => {
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);

      manager.updateStatus('completed', 'All tasks done');

      const loaded = manager.load();
      expect(loaded!.status).toBe('completed');
      expect(loaded!.endReason).toBe('All tasks done');
      expect(loaded!.endTime).toBeDefined();
    });
  });

  describe('incrementIteration', () => {
    it('should increment iteration counter', () => {
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);

      const iteration = manager.incrementIteration();
      expect(iteration).toBe(1);

      const loaded = manager.load();
      expect(loaded!.iteration).toBe(1);
    });

    it('should return -1 when no session', () => {
      const iteration = manager.incrementIteration();
      expect(iteration).toBe(-1);
    });
  });

  describe('isMaxIterationsReached', () => {
    it('should return false when under limit', () => {
      const session = manager.createSession({
        incrementQueue: ['0001'],
        maxIterations: 10,
      });
      session.iteration = 5;
      manager.save(session);

      expect(manager.isMaxIterationsReached()).toBe(false);
    });

    it('should return true when at limit', () => {
      const session = manager.createSession({
        incrementQueue: ['0001'],
        maxIterations: 10,
      });
      session.iteration = 10;
      manager.save(session);

      expect(manager.isMaxIterationsReached()).toBe(true);
    });
  });

  describe('moveToNextIncrement', () => {
    it('should move to next increment in queue', () => {
      const session = manager.createSession({
        incrementQueue: ['0001', '0002', '0003'],
      });
      manager.save(session);

      const next = manager.moveToNextIncrement();
      expect(next).toBe('0002');

      const loaded = manager.load();
      expect(loaded!.completedIncrements).toContain('0001');
      expect(loaded!.currentIncrement).toBe('0002');
      expect(loaded!.incrementQueue).toEqual(['0002', '0003']);
    });

    it('should return null when queue is empty', () => {
      const session = manager.createSession({
        incrementQueue: ['0001'],
      });
      manager.save(session);

      manager.moveToNextIncrement();
      const next = manager.moveToNextIncrement();
      expect(next).toBeNull();
    });
  });

  describe('lock management', () => {
    it('should acquire lock', () => {
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);

      const acquired = manager.acquireLock();
      expect(acquired).toBe(true);
      expect(manager.isLocked()).toBe(true);
    });

    it('should release lock', () => {
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);
      manager.acquireLock();

      manager.releaseLock();
      expect(manager.isLocked()).toBe(false);
    });

    it('should fail to acquire when locked by another session', () => {
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);
      manager.acquireLock();

      // Try to acquire again
      const acquired = manager.acquireLock();
      expect(acquired).toBe(false);
    });

    it('should get lock info', () => {
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);
      manager.acquireLock();

      const info = manager.getLockInfo();
      expect(info).not.toBeNull();
      expect(info!.sessionId).toBe(session.sessionId);
      expect(info!.pid).toBe(process.pid);
    });
  });

  describe('delete', () => {
    it('should delete session and release lock', () => {
      const session = manager.createSession({ incrementQueue: ['0001'] });
      manager.save(session);
      manager.acquireLock();

      manager.delete();

      expect(manager.load()).toBeNull();
      expect(manager.isLocked()).toBe(false);
    });
  });
});
