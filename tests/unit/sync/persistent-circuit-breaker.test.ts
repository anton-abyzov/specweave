/**
 * Unit tests for PersistentCircuitBreaker
 *
 * Wraps the in-memory SyncCircuitBreaker with file-based persistence
 * so circuit state survives across process restarts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PersistentCircuitBreaker } from '../../../src/core/sync/persistent-circuit-breaker.js';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('PersistentCircuitBreaker', () => {
  let tempDir: string;
  let stateFile: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pcb-test-'));
    stateFile = join(tempDir, 'circuit-breaker.json');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('starts closed when no state file exists', () => {
    const breaker = new PersistentCircuitBreaker(stateFile);
    expect(breaker.canSync()).toBe(true);
    expect(breaker.getState().state).toBe('closed');
  });

  it('writes state file after recordFailure()', () => {
    const breaker = new PersistentCircuitBreaker(stateFile);
    breaker.recordFailure();

    expect(existsSync(stateFile)).toBe(true);
    const data = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(data.failures).toBe(1);
    expect(data.state).toBe('closed');
  });

  it('opens after 3 failures and persists open state', () => {
    const breaker = new PersistentCircuitBreaker(stateFile);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.canSync()).toBe(false);

    const data = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(data.failures).toBe(3);
    expect(data.state).toBe('open');
  });

  it('restores open state from file — new instance reads persisted state', () => {
    // First instance: open the circuit
    const breaker1 = new PersistentCircuitBreaker(stateFile);
    breaker1.recordFailure();
    breaker1.recordFailure();
    breaker1.recordFailure();
    expect(breaker1.canSync()).toBe(false);

    // Second instance from same file: should immediately be open
    const breaker2 = new PersistentCircuitBreaker(stateFile);
    expect(breaker2.canSync()).toBe(false);
    expect(breaker2.getState().state).toBe('open');
    expect(breaker2.getState().failures).toBe(3);
  });

  it('persists success — resets state file', () => {
    const breaker = new PersistentCircuitBreaker(stateFile);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();

    const data = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(data.failures).toBe(0);
    expect(data.state).toBe('closed');
  });

  it('persists reset', () => {
    const breaker = new PersistentCircuitBreaker(stateFile);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.reset();

    const data = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(data.failures).toBe(0);
    expect(data.state).toBe('closed');

    // New instance should be closed
    const breaker2 = new PersistentCircuitBreaker(stateFile);
    expect(breaker2.canSync()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // T-034: Restart recovery — open → cooldown → half-open → success → closed
  // -------------------------------------------------------------------------
  it('transitions to half-open after cooldown on restart', () => {
    // Open the breaker
    const breaker1 = new PersistentCircuitBreaker(stateFile);
    breaker1.recordFailure();
    breaker1.recordFailure();
    breaker1.recordFailure();
    expect(breaker1.getState().state).toBe('open');

    // Advance clock past 5-minute cooldown
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);

    // New instance simulates process restart
    const breaker2 = new PersistentCircuitBreaker(stateFile);
    // After cooldown, canSync transitions to half-open
    expect(breaker2.canSync()).toBe(true);
    expect(breaker2.getState().state).toBe('half-open');

    vi.restoreAllMocks();
  });

  it('full restart recovery: open → restart → cooldown → half-open → success → closed → file updated', () => {
    const now = Date.now();

    // Phase 1: Open the breaker via failures
    const breaker1 = new PersistentCircuitBreaker(stateFile);
    breaker1.recordFailure();
    breaker1.recordFailure();
    breaker1.recordFailure();
    expect(breaker1.canSync()).toBe(false);

    // Phase 2: Restart with time past cooldown
    vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);
    const breaker2 = new PersistentCircuitBreaker(stateFile);

    // Phase 3: canSync returns true (half-open)
    expect(breaker2.canSync()).toBe(true);

    // Phase 4: Success transitions to closed
    breaker2.recordSuccess();
    expect(breaker2.getState().state).toBe('closed');
    expect(breaker2.getState().failures).toBe(0);

    // Phase 5: State file reflects closed state
    const data = JSON.parse(readFileSync(stateFile, 'utf-8'));
    expect(data.state).toBe('closed');
    expect(data.failures).toBe(0);

    vi.restoreAllMocks();
  });

  it('stays open on restart if cooldown has not elapsed', () => {
    const breaker1 = new PersistentCircuitBreaker(stateFile);
    breaker1.recordFailure();
    breaker1.recordFailure();
    breaker1.recordFailure();

    // Only 1 minute has passed — not past 5-minute cooldown
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 60 * 1000);

    const breaker2 = new PersistentCircuitBreaker(stateFile);
    expect(breaker2.canSync()).toBe(false);
    expect(breaker2.getState().state).toBe('open');

    vi.restoreAllMocks();
  });

  it('handles corrupted state file gracefully', () => {
    const { writeFileSync } = require('fs');
    writeFileSync(stateFile, 'not valid json!!!');

    const breaker = new PersistentCircuitBreaker(stateFile);
    expect(breaker.canSync()).toBe(true);
    expect(breaker.getState().state).toBe('closed');
  });
});
