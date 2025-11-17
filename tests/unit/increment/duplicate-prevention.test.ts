import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Tests for duplicate increment ID prevention
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

describe('Increment Duplicate Prevention', () => {
  let testDir: string;
  let utilsPath: string;

  beforeEach(() => {
    // Create temp directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-dup-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave/increments'), { recursive: true });

    // Calculate path to feature-utils script relative to this test file
    // Test is in: tests/unit/increment/duplicate-prevention.test.ts
    // Script is in: plugins/specweave/skills/increment-planner/scripts/feature-utils.js
    const testFileDir = path.dirname(__filename);
    const projectRoot = path.resolve(testFileDir, '../../..');
    utilsPath = path.join(projectRoot, 'plugins/specweave/skills/increment-planner/scripts/feature-utils.js');

    // Fallback to process.cwd() if the calculated path doesn't exist
    if (!fs.existsSync(utilsPath)) {
      utilsPath = path.join(process.cwd(), 'plugins/specweave/skills/increment-planner/scripts/feature-utils.js');
    }

    // Additional fallback for CI environment where script might be in dist/
    if (!fs.existsSync(utilsPath)) {
      const distPath = path.join(projectRoot, 'dist/plugins/specweave/skills/increment-planner/scripts/feature-utils.js');
      if (fs.existsSync(distPath)) {
        utilsPath = distPath;
      }
    }

    // Verify the script exists before running tests
    if (!fs.existsSync(utilsPath)) {
      throw new Error(`feature-utils.js not found. Tried:\n- ${utilsPath}\n- ${path.join(process.cwd(), 'plugins/specweave/skills/increment-planner/scripts/feature-utils.js')}\n- ${path.join(projectRoot, 'dist/plugins/specweave/skills/increment-planner/scripts/feature-utils.js')}`);
    }
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
  });

  describe('incrementNumberExists()', () => {
    it('should detect existing increment numbers', () => {
      // Create test increments
      fs.mkdirSync(path.join(testDir, '.specweave/increments/0001-test-feature'));
      fs.mkdirSync(path.join(testDir, '.specweave/increments/0002-another-feature'));

      // Test via CLI
      const checkCmd = `node "${utilsPath}" check-increment`;

      // Check existing increment
      try {
        execSync(`${checkCmd} 0001 "${path.join(testDir, '.specweave/increments')}"`, {
          encoding: 'utf-8'
        });
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        expect(error.stderr).toContain('ERROR: Increment 0001 already exists');
        expect(error.status).toBe(1);
      }

      // Check non-existing increment
      const result = execSync(`${checkCmd} 0003 "${path.join(testDir, '.specweave/increments')}"`, {
        encoding: 'utf-8'
      }).trim();
      expect(result).toBe('OK: Increment 0003 is available');
    });

    it('should handle both 3-digit and 4-digit formats', () => {
      // Create increments with both formats
      fs.mkdirSync(path.join(testDir, '.specweave/increments/001-legacy'));
      fs.mkdirSync(path.join(testDir, '.specweave/increments/0002-modern'));

      const checkCmd = `node "${utilsPath}" check-increment`;

      // Check 3-digit (should match against 001)
      try {
        execSync(`${checkCmd} 0001 "${path.join(testDir, '.specweave/increments')}"`, {
          encoding: 'utf-8'
        });
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        expect(error.stderr).toContain('ERROR: Increment 0001 already exists');
      }

      // Check 4-digit
      try {
        execSync(`${checkCmd} 0002 "${path.join(testDir, '.specweave/increments')}"`, {
          encoding: 'utf-8'
        });
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        expect(error.stderr).toContain('ERROR: Increment 0002 already exists');
      }
    });

    it('should prevent duplicate increment creation', () => {
      // Create first increment
      fs.mkdirSync(path.join(testDir, '.specweave/increments/0010-feature-x'));

      // Try to check if we can create same number
      const checkCmd = `node "${utilsPath}" check-increment 0010 "${path.join(testDir, '.specweave/increments')}"`;

      try {
        execSync(checkCmd, { encoding: 'utf-8' });
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        expect(error.stderr).toContain('ERROR: Increment 0010 already exists');
        expect(error.status).toBe(1);
      }
    });
  });

  describe('getNextFeatureNumber()', () => {
    it('should return next available number', () => {
      // Create some increments
      fs.mkdirSync(path.join(testDir, '.specweave/increments/0001-first'));
      fs.mkdirSync(path.join(testDir, '.specweave/increments/0002-second'));
      fs.mkdirSync(path.join(testDir, '.specweave/increments/0005-fifth')); // Gap

      const nextCmd = `node "${utilsPath}" next "${path.join(testDir, '.specweave/increments')}"`;
      const result = execSync(nextCmd, { encoding: 'utf-8' }).trim();

      expect(result).toBe('0006'); // Should be next after highest (0005)
    });

    it('should handle empty increments directory', () => {
      const nextCmd = `node "${utilsPath}" next "${path.join(testDir, '.specweave/increments')}"`;
      const result = execSync(nextCmd, { encoding: 'utf-8' }).trim();

      expect(result).toBe('0001'); // Should start at 0001
    });

    it('should handle mixed 3-digit and 4-digit formats', () => {
      // Create increments with both formats
      fs.mkdirSync(path.join(testDir, '.specweave/increments/001-old'));
      fs.mkdirSync(path.join(testDir, '.specweave/increments/002-old'));
      fs.mkdirSync(path.join(testDir, '.specweave/increments/0010-new'));

      const nextCmd = `node "${utilsPath}" next "${path.join(testDir, '.specweave/increments')}"`;
      const result = execSync(nextCmd, { encoding: 'utf-8' }).trim();

      expect(result).toBe('0011'); // Should be next after highest (0010)
    });
  });

  describe('Real-world scenario', () => {
    it('should prevent accidental duplicate creation in workflow', () => {
      // Simulate the workflow in increment-planner skill

      // Step 1: Get next increment number
      const nextCmd = `node "${utilsPath}" next "${path.join(testDir, '.specweave/increments')}"`;
      const nextNumber = execSync(nextCmd, { encoding: 'utf-8' }).trim();
      expect(nextNumber).toBe('0001');

      // Step 2: Check if it's available (should be)
      const checkCmd = `node "${utilsPath}" check-increment ${nextNumber} "${path.join(testDir, '.specweave/increments')}"`;
      const checkResult = execSync(checkCmd, { encoding: 'utf-8' }).trim();
      expect(checkResult).toBe('OK: Increment 0001 is available');

      // Step 3: Create the increment
      fs.mkdirSync(path.join(testDir, '.specweave/increments/0001-my-feature'));

      // Step 4: If someone tries to create same number again, it should fail
      try {
        execSync(checkCmd, { encoding: 'utf-8' });
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        expect(error.stderr).toContain('ERROR: Increment 0001 already exists');
      }

      // Step 5: Next increment should be 0002
      const nextNumber2 = execSync(nextCmd, { encoding: 'utf-8' }).trim();
      expect(nextNumber2).toBe('0002');
    });
  });
});