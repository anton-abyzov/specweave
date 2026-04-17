/**
 * Tests for auto.ts native-mode flags (0669 Wave 3 / AC-US12-03).
 *
 * Flags under test:
 *   --respect-native  Default: true when running in Claude Code. When true, emit a
 *                     one-time stderr advisory pointing users at native Shift+Tab
 *                     auto mode.
 *   --force-sw-auto   Default: false. When true, suppress the advisory (user has
 *                     deliberately chosen sw:auto over native).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseAutoNativeFlags,
  shouldEmitNativeAdvisory,
  emitNativeAdvisory,
  resetNativeAdvisoryState,
  type AutoNativeOptions,
} from '../../../src/cli/commands/auto.js';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  resetNativeAdvisoryState();
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

describe('auto.ts native mode flags', () => {
  it('defaults --respect-native to true when running in Claude Code', () => {
    process.env.CLAUDE_CODE = '1';
    const opts = parseAutoNativeFlags([]);
    expect(opts.respectNative).toBe(true);
    expect(opts.forceSw).toBe(false);
  });

  it('defaults --respect-native to false when not running in Claude Code', () => {
    delete process.env.CLAUDE_CODE;
    delete process.env.CLAUDE_CODE_SESSION;
    const opts = parseAutoNativeFlags([]);
    expect(opts.respectNative).toBe(false);
  });

  it('--force-sw-auto sets forceSw = true and suppresses advisory emission', () => {
    process.env.CLAUDE_CODE = '1';
    const opts = parseAutoNativeFlags(['--force-sw-auto']);
    expect(opts.forceSw).toBe(true);
    expect(shouldEmitNativeAdvisory(opts)).toBe(false);
  });

  it('--respect-native false disables advisory even in Claude Code', () => {
    process.env.CLAUDE_CODE = '1';
    const opts = parseAutoNativeFlags(['--respect-native', 'false']);
    expect(opts.respectNative).toBe(false);
    expect(shouldEmitNativeAdvisory(opts)).toBe(false);
  });

  it('--respect-native true (explicit) and no --force-sw-auto triggers advisory in Claude Code', () => {
    process.env.CLAUDE_CODE = '1';
    const opts: AutoNativeOptions = parseAutoNativeFlags(['--respect-native']);
    expect(opts.respectNative).toBe(true);
    expect(shouldEmitNativeAdvisory(opts)).toBe(true);
  });

  it('emits the native-auto advisory to stderr exactly once per session', () => {
    process.env.CLAUDE_CODE = '1';
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const opts = parseAutoNativeFlags([]);

    emitNativeAdvisory(opts);
    emitNativeAdvisory(opts);
    emitNativeAdvisory(opts);

    const adviseCount = errSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((s) => /Shift\+Tab|native auto/i.test(s)).length;
    expect(adviseCount).toBe(1);
  });

  it('advisory mentions Shift+Tab and --force-sw-auto suppression', () => {
    process.env.CLAUDE_CODE = '1';
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const opts = parseAutoNativeFlags([]);
    emitNativeAdvisory(opts);
    const body = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(body).toMatch(/Shift\+Tab/);
    expect(body).toMatch(/--force-sw-auto/);
  });

  it('does not emit advisory outside Claude Code', () => {
    delete process.env.CLAUDE_CODE;
    delete process.env.CLAUDE_CODE_SESSION;
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const opts = parseAutoNativeFlags([]);
    emitNativeAdvisory(opts);
    const body = errSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(body).not.toMatch(/Shift\+Tab/);
  });
});
