import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveIncrementId } from '../../../src/utils/resolve-increment-id.js';

describe('resolveIncrementId', () => {
  let tmpDir: string;
  let incrementsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-resolve-test-'));
    incrementsDir = path.join(tmpDir, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns full slug unchanged for exact match', () => {
    fs.mkdirSync(path.join(incrementsDir, '0589-cli-complete-improvements'));
    const result = resolveIncrementId('0589-cli-complete-improvements', tmpDir);
    expect(result).toBe('0589-cli-complete-improvements');
  });

  it('resolves short prefix to single match', () => {
    fs.mkdirSync(path.join(incrementsDir, '0589-cli-complete-improvements'));
    const result = resolveIncrementId('0589', tmpDir);
    expect(result).toBe('0589-cli-complete-improvements');
  });

  it('returns null for no match', () => {
    fs.mkdirSync(path.join(incrementsDir, '0589-cli-complete-improvements'));
    const result = resolveIncrementId('9999', tmpDir);
    expect(result).toBeNull();
  });

  it('returns array of matches for ambiguous prefix', () => {
    fs.mkdirSync(path.join(incrementsDir, '0573-fix-a'));
    fs.mkdirSync(path.join(incrementsDir, '0573-fix-b'));
    const result = resolveIncrementId('0573', tmpDir);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result).toContain('0573-fix-a');
    expect(result).toContain('0573-fix-b');
  });

  it('returns null for empty increments directory', () => {
    const result = resolveIncrementId('0589', tmpDir);
    expect(result).toBeNull();
  });

  it('returns null when increments directory does not exist', () => {
    const noIncDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-no-inc-'));
    try {
      const result = resolveIncrementId('0589', noIncDir);
      expect(result).toBeNull();
    } finally {
      fs.rmSync(noIncDir, { recursive: true, force: true });
    }
  });

  it('prefers exact match over prefix match', () => {
    // Edge case: '0589' could be both exact match and prefix of '0589-foo'
    fs.mkdirSync(path.join(incrementsDir, '0589'));
    fs.mkdirSync(path.join(incrementsDir, '0589-cli-complete-improvements'));
    const result = resolveIncrementId('0589', tmpDir);
    // Exact match should win — returns string, not array
    expect(result).toBe('0589');
  });
});
