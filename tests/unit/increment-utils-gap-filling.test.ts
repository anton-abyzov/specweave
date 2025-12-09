/**
 * Tests for gap-filling increment ID generation (v0.33.1+)
 *
 * Validates that IncrementNumberManager fills gaps in increment numbering
 * instead of always using highest + 1.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IncrementNumberManager } from '../../src/core/increment/increment-utils.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('IncrementNumberManager - Gap Filling', () => {
  let testDir: string;
  let incrementsDir: string;

  beforeEach(() => {
    // Create temp directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-gap-test-'));
    incrementsDir = path.join(testDir, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should fill single gap in sequence', () => {
    // Create increments: 0001, 0002, 0004, 0005 (missing 0003)
    fs.mkdirSync(path.join(incrementsDir, '0001-first'));
    fs.mkdirSync(path.join(incrementsDir, '0002-second'));
    fs.mkdirSync(path.join(incrementsDir, '0004-fourth'));
    fs.mkdirSync(path.join(incrementsDir, '0005-fifth'));

    const nextId = IncrementNumberManager.getNextIncrementNumber(testDir);

    expect(nextId).toBe('0003'); // Should fill the gap!
  });

  it('should fill first gap when multiple gaps exist', () => {
    // Create increments: 0001, 0004, 0007 (missing 0002, 0003, 0005, 0006)
    fs.mkdirSync(path.join(incrementsDir, '0001-first'));
    fs.mkdirSync(path.join(incrementsDir, '0004-fourth'));
    fs.mkdirSync(path.join(incrementsDir, '0007-seventh'));

    const nextId = IncrementNumberManager.getNextIncrementNumber(testDir);

    expect(nextId).toBe('0002'); // Should fill the first gap!
  });

  it('should return sequential number when no gaps exist', () => {
    // Create increments: 0001, 0002, 0003, 0004 (no gaps)
    fs.mkdirSync(path.join(incrementsDir, '0001-first'));
    fs.mkdirSync(path.join(incrementsDir, '0002-second'));
    fs.mkdirSync(path.join(incrementsDir, '0003-third'));
    fs.mkdirSync(path.join(incrementsDir, '0004-fourth'));

    const nextId = IncrementNumberManager.getNextIncrementNumber(testDir);

    expect(nextId).toBe('0005'); // Should continue sequence
  });

  it('should start from 0001 when no increments exist', () => {
    const nextId = IncrementNumberManager.getNextIncrementNumber(testDir);

    expect(nextId).toBe('0001'); // First increment
  });

  it('should fill gaps across all directories (main, archive, paused, abandoned)', () => {
    // Create archive directory
    const archiveDir = path.join(incrementsDir, '_archive');
    const pausedDir = path.join(incrementsDir, '_paused');
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.mkdirSync(pausedDir, { recursive: true });

    // Increments: 0001 (main), 0003 (archive), 0005 (paused) - missing 0002, 0004
    fs.mkdirSync(path.join(incrementsDir, '0001-active'));
    fs.mkdirSync(path.join(archiveDir, '0003-archived'));
    fs.mkdirSync(path.join(pausedDir, '0005-paused'));

    const nextId = IncrementNumberManager.getNextIncrementNumber(testDir);

    expect(nextId).toBe('0002'); // Should fill first gap across all directories
  });

  it('should handle external increments (E suffix) correctly', () => {
    // Create increments: 0001, 0002E, 0004 (missing 0003)
    fs.mkdirSync(path.join(incrementsDir, '0001-internal'));
    fs.mkdirSync(path.join(incrementsDir, '0002E-external'));
    fs.mkdirSync(path.join(incrementsDir, '0004-internal'));

    const nextId = IncrementNumberManager.getNextIncrementNumber(testDir);

    expect(nextId).toBe('0003'); // Should fill gap, ignoring E suffix
  });

  it('should handle 3-digit increment IDs', () => {
    // Create increments: 001, 002, 004 (3-digit format, missing 003)
    fs.mkdirSync(path.join(incrementsDir, '001-first'));
    fs.mkdirSync(path.join(incrementsDir, '002-second'));
    fs.mkdirSync(path.join(incrementsDir, '004-fourth'));

    const nextId = IncrementNumberManager.getNextIncrementNumber(testDir);

    expect(nextId).toBe('0003'); // Should fill gap with 4-digit format
  });

  it('should handle large gap at beginning', () => {
    // Create increments: 0050, 0051 (missing 0001-0049)
    fs.mkdirSync(path.join(incrementsDir, '0050-first'));
    fs.mkdirSync(path.join(incrementsDir, '0051-second'));

    const nextId = IncrementNumberManager.getNextIncrementNumber(testDir);

    expect(nextId).toBe('0001'); // Should start from the beginning!
  });

  it('should generate multiple unique IDs filling gaps sequentially', () => {
    // Create increments: 0001, 0005, 0010 (missing 0002-0004, 0006-0009)
    fs.mkdirSync(path.join(incrementsDir, '0001-first'));
    fs.mkdirSync(path.join(incrementsDir, '0005-fifth'));
    fs.mkdirSync(path.join(incrementsDir, '0010-tenth'));

    // Generate 3 new IDs
    const id1 = IncrementNumberManager.generateUniqueIncrementId('second', { projectRoot: testDir });
    fs.mkdirSync(path.join(incrementsDir, id1)); // Actually create it

    const id2 = IncrementNumberManager.generateUniqueIncrementId('third', { projectRoot: testDir });
    fs.mkdirSync(path.join(incrementsDir, id2));

    const id3 = IncrementNumberManager.generateUniqueIncrementId('fourth', { projectRoot: testDir });

    expect(id1).toBe('0002-second'); // First gap
    expect(id2).toBe('0003-third');  // Second gap
    expect(id3).toBe('0004-fourth'); // Third gap
  });

  it('should maintain gap-filling behavior with generateIncrementId()', () => {
    // Create increments with gap
    fs.mkdirSync(path.join(incrementsDir, '0001-first'));
    fs.mkdirSync(path.join(incrementsDir, '0003-third'));

    const id = IncrementNumberManager.generateIncrementId('second', { projectRoot: testDir });

    expect(id).toBe('0002-second'); // Should fill the gap
  });

  it('should maintain gap-filling behavior with external increments', () => {
    // Create increments with gap
    fs.mkdirSync(path.join(incrementsDir, '0001E-first'));
    fs.mkdirSync(path.join(incrementsDir, '0003E-third'));

    const id = IncrementNumberManager.generateIncrementId('second', {
      projectRoot: testDir,
      isExternal: true
    });

    expect(id).toBe('0002E-second'); // Should fill the gap with E suffix
  });
});
