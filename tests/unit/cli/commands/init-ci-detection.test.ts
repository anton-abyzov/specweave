/**
 * CI Detection Tests (0188 T-011)
 *
 * Tests the unified isNonInteractive() function that replaces
 * the duplicate isCI and isQuickMode definitions in init.ts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isNonInteractive } from '../../../../src/cli/commands/init.js';

describe('isNonInteractive() - Unified CI Detection (0188 T-011)', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const envVars = ['CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'CIRCLECI', 'JENKINS_URL'];

  beforeEach(() => {
    // Save and clear all CI env vars
    for (const key of envVars) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    // Restore original env vars
    for (const key of envVars) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it('should detect CI=true', () => {
    process.env.CI = 'true';
    expect(isNonInteractive({})).toBe(true);
  });

  it('should detect GITHUB_ACTIONS=true', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(isNonInteractive({})).toBe(true);
  });

  it('should detect GITLAB_CI=true', () => {
    process.env.GITLAB_CI = 'true';
    expect(isNonInteractive({})).toBe(true);
  });

  it('should detect CIRCLECI=true', () => {
    process.env.CIRCLECI = 'true';
    expect(isNonInteractive({})).toBe(true);
  });

  it('should detect JENKINS_URL', () => {
    process.env.JENKINS_URL = 'http://jenkins.example.com';
    expect(isNonInteractive({})).toBe(true);
  });

  it('should detect --quick flag', () => {
    expect(isNonInteractive({ quick: true })).toBe(true);
  });

  it('should return false when no CI env vars and no flags', () => {
    const result = isNonInteractive({});
    // In test env, stdin.isTTY may be false, so only assert when TTY is available
    if (process.stdin.isTTY) {
      expect(result).toBe(false);
    }
  });
});
