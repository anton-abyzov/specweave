import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Hoist mocks
const mocks = vi.hoisted(() => ({
  mockExecFileNoThrow: vi.fn(),
}));

vi.mock('../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mocks.mockExecFileNoThrow,
}));

import {
  checkBudget,
  decrementBudget,
  validateBudget,
  getBudgetState,
  EMERGENCY_RESERVE,
} from '../../../src/sync/github-rate-limit-budget.js';

describe('github-rate-limit-budget', () => {
  let tmpDir: string;
  let stateDir: string;
  let stateFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sw-budget-'));
    stateDir = path.join(tmpDir, '.specweave', 'state');
    await fs.mkdir(stateDir, { recursive: true });
    stateFile = path.join(stateDir, 'github-rate-limit.json');
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('checkBudget()', () => {
    it('TC-001: returns false (fail-closed) when no state file exists', async () => {
      // Given: no state file exists
      // When: checkBudget is called
      const result = await checkBudget(tmpDir);

      // Then: returns false — fail-closed prevents runaway API calls
      expect(result).toBe(false);
    });

    it('TC-002: returns false when remaining < 200 (emergency reserve)', async () => {
      // Given: state file with remaining=100
      await fs.writeFile(stateFile, JSON.stringify({
        remaining: 100,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
        lastChecked: new Date().toISOString(),
        callsSinceValidation: 0,
      }));

      // When: checkBudget is called
      const result = await checkBudget(tmpDir);

      // Then: returns false (100 < 200)
      expect(result).toBe(false);
    });

    it('returns true when remaining is above emergency reserve', async () => {
      // Given: state file with remaining=4000
      await fs.writeFile(stateFile, JSON.stringify({
        remaining: 4000,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
        lastChecked: new Date().toISOString(),
        callsSinceValidation: 0,
      }));

      // When: checkBudget is called
      const result = await checkBudget(tmpDir);

      // Then: returns true (4000 > 200)
      expect(result).toBe(true);
    });

    it('returns true when remaining exactly equals emergency reserve', async () => {
      // Given: state file with remaining exactly at EMERGENCY_RESERVE
      await fs.writeFile(stateFile, JSON.stringify({
        remaining: EMERGENCY_RESERVE,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
        lastChecked: new Date().toISOString(),
        callsSinceValidation: 0,
      }));

      // When: checkBudget is called
      const result = await checkBudget(tmpDir);

      // Then: returns true (200 >= 200)
      expect(result).toBe(true);
    });
  });

  describe('decrementBudget()', () => {
    it('TC-003: decrements remaining by 1 atomically', async () => {
      // Given: state file with remaining=4000
      await fs.writeFile(stateFile, JSON.stringify({
        remaining: 4000,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
        lastChecked: new Date().toISOString(),
        callsSinceValidation: 0,
      }));

      // When: decrementBudget is called
      await decrementBudget(tmpDir);

      // Then: file updated to 3999
      const state = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      expect(state.remaining).toBe(3999);
      expect(state.callsSinceValidation).toBe(1);
    });

    it('creates state file with fail-closed default if none exists', async () => {
      // Given: no state file
      // When: decrementBudget is called
      await decrementBudget(tmpDir);

      // Then: state file created with 0 (fail-closed, can't go below 0)
      const state = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      expect(state.remaining).toBe(0);
      expect(state.limit).toBe(5000);
    });

    it('does not decrement below 0', async () => {
      // Given: state file with remaining=0
      await fs.writeFile(stateFile, JSON.stringify({
        remaining: 0,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
        lastChecked: new Date().toISOString(),
        callsSinceValidation: 0,
      }));

      // When: decrementBudget is called
      await decrementBudget(tmpDir);

      // Then: remaining stays at 0
      const state = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      expect(state.remaining).toBe(0);
    });
  });

  describe('validateBudget()', () => {
    it('TC-004: validates via gh api rate_limit and updates state', async () => {
      // Given: stale state (lastChecked > 5min ago)
      await fs.writeFile(stateFile, JSON.stringify({
        remaining: 100,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
        lastChecked: new Date(Date.now() - 6 * 60_000).toISOString(),
        callsSinceValidation: 60,
      }));

      // Mock gh api rate_limit response
      mocks.mockExecFileNoThrow.mockResolvedValueOnce({
        success: true,
        exitCode: 0,
        stdout: JSON.stringify({
          rate: { remaining: 4500, limit: 5000, reset: Math.floor(Date.now() / 1000) + 3600 },
        }),
        stderr: '',
      });

      // When: validateBudget is called
      await validateBudget(tmpDir);

      // Then: state updated with real values
      const state = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      expect(state.remaining).toBe(4500);
      expect(state.limit).toBe(5000);
      expect(state.callsSinceValidation).toBe(0);
    });

    it('keeps existing state if gh api call fails', async () => {
      // Given: existing state
      const original = {
        remaining: 3000,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
        lastChecked: new Date(Date.now() - 6 * 60_000).toISOString(),
        callsSinceValidation: 55,
      };
      await fs.writeFile(stateFile, JSON.stringify(original));

      // Mock gh api rate_limit failure
      mocks.mockExecFileNoThrow.mockResolvedValueOnce({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'API error',
      });

      // When: validateBudget is called
      await validateBudget(tmpDir);

      // Then: state unchanged (except lastChecked updated)
      const state = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      expect(state.remaining).toBe(3000);
    });
  });

  describe('getBudgetState()', () => {
    it('returns fail-closed state (remaining=0) when no file exists', async () => {
      const state = await getBudgetState(tmpDir);
      expect(state.remaining).toBe(0);
      expect(state.limit).toBe(5000);
      expect(state.callsSinceValidation).toBe(0);
    });

    it('reads existing state file', async () => {
      await fs.writeFile(stateFile, JSON.stringify({
        remaining: 2500,
        limit: 5000,
        resetAt: '2026-03-19T12:00:00Z',
        lastChecked: '2026-03-19T11:55:00Z',
        callsSinceValidation: 10,
      }));

      const state = await getBudgetState(tmpDir);
      expect(state.remaining).toBe(2500);
      expect(state.callsSinceValidation).toBe(10);
    });
  });

  describe('TC-005: concurrent access safety', () => {
    it('handles rapid sequential decrements without data loss', async () => {
      // Given: state with remaining=100
      await fs.writeFile(stateFile, JSON.stringify({
        remaining: 100,
        limit: 5000,
        resetAt: new Date(Date.now() + 3600_000).toISOString(),
        lastChecked: new Date().toISOString(),
        callsSinceValidation: 0,
      }));

      // When: 10 sequential decrements
      for (let i = 0; i < 10; i++) {
        await decrementBudget(tmpDir);
      }

      // Then: remaining is 90 (100 - 10)
      const state = JSON.parse(await fs.readFile(stateFile, 'utf-8'));
      expect(state.remaining).toBe(90);
      expect(state.callsSinceValidation).toBe(10);
    });
  });

  describe('fail-closed on read error', () => {
    it('checkBudget returns false when state file is corrupt JSON', async () => {
      // Given: corrupt state file
      await fs.writeFile(stateFile, 'not valid json {{{{');

      // When: checkBudget is called
      const result = await checkBudget(tmpDir);

      // Then: fail-closed — returns false (remaining=0 < 200)
      expect(result).toBe(false);
    });

    it('getBudgetState returns remaining=0 on corrupt file', async () => {
      // Given: corrupt state file
      await fs.writeFile(stateFile, '}{invalid');

      // When: getBudgetState is called
      const state = await getBudgetState(tmpDir);

      // Then: fail-closed defaults
      expect(state.remaining).toBe(0);
      expect(state.limit).toBe(5000);
    });
  });

  describe('EMERGENCY_RESERVE constant', () => {
    it('is 200', () => {
      expect(EMERGENCY_RESERVE).toBe(200);
    });
  });
});
