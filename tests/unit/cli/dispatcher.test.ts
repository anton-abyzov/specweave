/**
 * Tests for dispatcher.ts --effort flag parsing (0669 Wave 3 / AC-US11-05).
 *
 * The dispatcher parses CLI arguments shared across skill-invoking commands.
 * --effort accepts low | medium | high | xhigh | max and defaults to xhigh.
 * --effort max emits an overthinking advisory on stderr.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseEffortFlag,
  EFFORT_LEVELS,
  DEFAULT_EFFORT,
  type EffortLevel,
} from '../../../src/cli/dispatcher.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dispatcher --effort flag', () => {
  it('parses --effort xhigh and sets options.effort = "xhigh"', () => {
    const result = parseEffortFlag(['--effort', 'xhigh']);
    expect(result.effort).toBe<EffortLevel>('xhigh');
    expect(result.error).toBeUndefined();
  });

  it('parses --effort max and sets options.effort = "max"', () => {
    const result = parseEffortFlag(['--effort', 'max']);
    expect(result.effort).toBe<EffortLevel>('max');
  });

  it('rejects invalid effort level --effort invalid', () => {
    const result = parseEffortFlag(['--effort', 'invalid']);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/invalid/i);
  });

  it('rejects --effort with no value', () => {
    const result = parseEffortFlag(['--effort']);
    expect(result.error).toBeDefined();
  });

  it('defaults effort to xhigh when --effort is not specified', () => {
    const result = parseEffortFlag([]);
    expect(result.effort).toBe<EffortLevel>('xhigh');
    expect(result.error).toBeUndefined();
  });

  it('DEFAULT_EFFORT is "xhigh"', () => {
    expect(DEFAULT_EFFORT).toBe<EffortLevel>('xhigh');
  });

  it('EFFORT_LEVELS includes all five levels', () => {
    expect(EFFORT_LEVELS).toEqual(
      expect.arrayContaining(['low', 'medium', 'high', 'xhigh', 'max']),
    );
  });

  it('accepts lowercase and normalizes case', () => {
    const result = parseEffortFlag(['--effort', 'XHIGH']);
    expect(result.effort).toBe<EffortLevel>('xhigh');
  });

  it('emits overthinking advisory to stderr when --effort max is parsed', () => {
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    parseEffortFlag(['--effort', 'max']);
    const calls = errSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => /overthinking/i.test(s))).toBe(true);
  });

  it('does not emit advisory for non-max levels', () => {
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    parseEffortFlag(['--effort', 'xhigh']);
    const calls = errSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => /overthinking/i.test(s))).toBe(false);
  });
});
