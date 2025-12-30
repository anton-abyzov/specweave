/**
 * Circuit Breaker Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitOpenError,
  parseRateLimitHeaders,
} from '../../../src/core/auto/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let tempDir: string;
  let stateDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'circuit-breaker-'));
    stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });

    // Create session file
    fs.writeFileSync(
      path.join(stateDir, 'auto-session.json'),
      JSON.stringify({ circuitBreakers: {} })
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('execute', () => {
    it('should execute operation when circuit is closed', async () => {
      const breaker = new CircuitBreaker('test', tempDir);

      const result = await breaker.execute(async () => 'success');

      expect(result).toBe('success');
    });

    it('should throw CircuitOpenError when circuit is open', async () => {
      const breaker = new CircuitBreaker('test', tempDir, { failureThreshold: 2 });

      // Trigger failures to open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('fail');
          });
        } catch {
          // Expected
        }
      }

      await expect(
        breaker.execute(async () => 'should not run')
      ).rejects.toThrow(CircuitOpenError);
    });

    it('should record success and reset failure count', async () => {
      const breaker = new CircuitBreaker('test', tempDir);

      // Record a failure
      breaker.recordFailure();
      expect(breaker.getStatus().failures).toBe(1);

      // Record success
      await breaker.execute(async () => 'success');
      expect(breaker.getStatus().failures).toBe(0);
    });
  });

  describe('state transitions', () => {
    it('should open after failure threshold', () => {
      const breaker = new CircuitBreaker('test', tempDir, { failureThreshold: 3 });

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getStatus().state).toBe('closed');

      breaker.recordFailure();
      expect(breaker.getStatus().state).toBe('open');
    });

    it('should transition to half-open after timeout', async () => {
      const breaker = new CircuitBreaker('test', tempDir, {
        failureThreshold: 1,
        resetTimeout: 10, // 10ms for testing
      });

      breaker.recordFailure();
      expect(breaker.getStatus().state).toBe('open');

      // Wait for timeout
      await new Promise((r) => setTimeout(r, 20));

      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getStatus().state).toBe('half-open');
    });

    it('should close after successes in half-open', async () => {
      const breaker = new CircuitBreaker('test', tempDir, {
        failureThreshold: 1,
        resetTimeout: 10,
        successThreshold: 2,
      });

      // Open the circuit
      breaker.recordFailure();
      expect(breaker.getStatus().state).toBe('open');

      // Wait for half-open
      await new Promise((r) => setTimeout(r, 20));
      breaker.isOpen(); // Trigger transition check

      // Record successes
      breaker.recordSuccess();
      expect(breaker.getStatus().state).toBe('half-open');

      breaker.recordSuccess();
      expect(breaker.getStatus().state).toBe('closed');
    });

    it('should reopen on failure in half-open', async () => {
      const breaker = new CircuitBreaker('test', tempDir, {
        failureThreshold: 1,
        resetTimeout: 10,
      });

      // Open the circuit
      breaker.recordFailure();
      await new Promise((r) => setTimeout(r, 20));
      breaker.isOpen(); // Trigger half-open

      expect(breaker.getStatus().state).toBe('half-open');

      // Fail in half-open
      breaker.recordFailure();
      expect(breaker.getStatus().state).toBe('open');
    });
  });

  describe('queueOperation', () => {
    it('should queue operations when circuit is open', () => {
      const breaker = new CircuitBreaker('test', tempDir, { failureThreshold: 1 });

      breaker.recordFailure();
      const opId = breaker.queueOperation('sync', { id: '123' });

      expect(opId).toMatch(/^op-\d+-\w+$/);
      expect(breaker.getStatus().queuedOperations).toHaveLength(1);
      expect(breaker.getStatus().queuedOperations[0].operation).toBe('sync');
    });
  });

  describe('reset', () => {
    it('should reset circuit to closed state', () => {
      const breaker = new CircuitBreaker('test', tempDir, { failureThreshold: 1 });

      breaker.recordFailure();
      breaker.queueOperation('test', {});

      expect(breaker.getStatus().state).toBe('open');
      expect(breaker.getStatus().queuedOperations).toHaveLength(1);

      breaker.reset();

      expect(breaker.getStatus().state).toBe('closed');
      expect(breaker.getStatus().queuedOperations).toHaveLength(0);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let tempDir: string;
  let stateDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'circuit-registry-'));
    stateDir = path.join(tempDir, '.specweave', 'state');
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(
      path.join(stateDir, 'auto-session.json'),
      JSON.stringify({ circuitBreakers: {} })
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should get or create breakers', () => {
    const registry = new CircuitBreakerRegistry(tempDir);

    const breaker1 = registry.getBreaker('github');
    const breaker2 = registry.getBreaker('github');

    expect(breaker1).toBe(breaker2);
    expect(breaker1.getName()).toBe('github');
  });

  it('should check if any circuit is open', () => {
    const registry = new CircuitBreakerRegistry(tempDir);
    registry.initializeDefaults();

    expect(registry.hasOpenCircuit()).toBe(false);

    const github = registry.getBreaker('github');
    for (let i = 0; i < 3; i++) {
      github.recordFailure();
    }

    expect(registry.hasOpenCircuit()).toBe(true);
  });

  it('should get all status', () => {
    const registry = new CircuitBreakerRegistry(tempDir);
    registry.getBreaker('github');
    registry.getBreaker('jira');

    const status = registry.getAllStatus();

    expect(Object.keys(status)).toEqual(['github', 'jira']);
    expect(status.github.state).toBe('closed');
    expect(status.jira.state).toBe('closed');
  });

  it('should reset all circuits', () => {
    const registry = new CircuitBreakerRegistry(tempDir);
    const github = registry.getBreaker('github', { failureThreshold: 1 });
    const jira = registry.getBreaker('jira', { failureThreshold: 1 });

    github.recordFailure();
    jira.recordFailure();

    expect(registry.hasOpenCircuit()).toBe(true);

    registry.resetAll();

    expect(registry.hasOpenCircuit()).toBe(false);
  });
});

describe('parseRateLimitHeaders', () => {
  it('should detect GitHub rate limit', () => {
    const futureReset = Math.floor(Date.now() / 1000) + 60;
    const result = parseRateLimitHeaders({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(futureReset),
    });

    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60000);
  });

  it('should detect Retry-After header', () => {
    const result = parseRateLimitHeaders({
      'retry-after': '120',
    });

    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBe(120000);
  });

  it('should return not limited when no rate limit headers', () => {
    const result = parseRateLimitHeaders({});

    expect(result.limited).toBe(false);
    expect(result.retryAfter).toBe(0);
  });

  it('should handle remaining > 0', () => {
    const result = parseRateLimitHeaders({
      'x-ratelimit-remaining': '100',
      'x-ratelimit-reset': '12345',
    });

    expect(result.limited).toBe(false);
  });
});
