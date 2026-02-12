/**
 * Tests for AutoModeFlag schema completeness
 *
 * The AutoModeFlag interface must match what the stop hook and skill expect.
 * Fields like tddMode and requireTests are written by the session setup
 * but were missing from the interface — this test ensures they exist.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { AutoModeFlag, SuccessCriterion } from '../../../../src/core/auto/types.js';
import { DEFAULT_SUCCESS_CRITERIA } from '../../../../src/core/auto/types.js';

describe('AutoModeFlag schema', () => {
  it('should support tddMode field', () => {
    // The session marker needs to store TDD mode status
    const flag: AutoModeFlag = {
      active: true,
      timestamp: new Date().toISOString(),
      incrementIds: ['0001-test'],
      tddMode: true,
    };
    expect(flag.tddMode).toBe(true);
  });

  it('should support requireTests field', () => {
    const flag: AutoModeFlag = {
      active: true,
      timestamp: new Date().toISOString(),
      requireTests: true,
    };
    expect(flag.requireTests).toBe(true);
  });

  it('should support all quality-related success criteria types', () => {
    const qualityCriteria: SuccessCriterion[] = [
      { type: 'tests_pass', description: 'Tests must pass', required: true },
      { type: 'build_succeeds', description: 'Build must succeed', required: true },
      { type: 'custom_command', description: 'Custom', required: false, command: 'npm run lint' },
    ];

    const flag: AutoModeFlag = {
      active: true,
      timestamp: new Date().toISOString(),
      successCriteria: [...DEFAULT_SUCCESS_CRITERIA, ...qualityCriteria],
    };

    expect(flag.successCriteria).toHaveLength(5);
    expect(flag.successCriteria!.map((c) => c.type)).toContain('tests_pass');
    expect(flag.successCriteria!.map((c) => c.type)).toContain('build_succeeds');
  });

  it('should be serializable to JSON and back', () => {
    const flag: AutoModeFlag = {
      active: true,
      timestamp: new Date().toISOString(),
      incrementIds: ['0001-feature', '0002-feature'],
      tddMode: true,
      requireTests: true,
      successCriteria: DEFAULT_SUCCESS_CRITERIA,
      successSummary: 'All tasks complete',
      userGoal: 'Build auth module',
    };

    const json = JSON.stringify(flag, null, 2);
    const parsed = JSON.parse(json) as AutoModeFlag;

    expect(parsed.active).toBe(true);
    expect(parsed.tddMode).toBe(true);
    expect(parsed.requireTests).toBe(true);
    expect(parsed.incrementIds).toEqual(['0001-feature', '0002-feature']);
    expect(parsed.successCriteria).toHaveLength(2);
  });

  it('should produce valid JSON that stop hook can read', () => {
    // The stop hook reads: jq -r '.active // false' auto-mode.json
    // It must be valid JSON with "active" at the top level
    const flag: AutoModeFlag = {
      active: true,
      timestamp: new Date().toISOString(),
      incrementIds: ['0001-test'],
    };

    const json = JSON.stringify(flag);
    const parsed = JSON.parse(json);

    // This is what the stop hook checks
    expect(parsed.active).toBe(true);
    expect(typeof parsed.active).toBe('boolean');
  });
});
