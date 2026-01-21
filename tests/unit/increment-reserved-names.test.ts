/**
 * Tests for reserved increment name validation.
 *
 * CRITICAL (v1.0.105): Increment names CANNOT use reserved keywords like
 * "reports", "backup", "temp" as these are reserved for SpecWeave internal use.
 *
 * This test suite validates that:
 * 1. Reserved names are rejected during increment creation
 * 2. Non-reserved names are accepted
 * 3. Error messages are clear and actionable
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IncrementNumberManager } from '../../src/core/increment/increment-utils.js';

describe('IncrementNumberManager - Reserved Name Validation', () => {
  let testDir: string;
  let incrementsDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-reserved-test-'));
    incrementsDir = path.join(testDir, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Reserved Name Rejection', () => {
    const reservedNames = [
      'reports',
      'backup',
      'backups',
      'temp',
      'tmp',
      'logs',
      'scripts',
      'docs',
      'documentation',
      'archive',
      'abandoned',
      'paused',
      'config',
      'cache',
      'state'
    ];

    reservedNames.forEach((reservedName) => {
      it(`should reject reserved name "${reservedName}"`, () => {
        expect(() => {
          IncrementNumberManager.generateIncrementId(reservedName, {
            projectRoot: testDir
          });
        }).toThrow(/RESERVED NAME VIOLATION/);
      });

      it(`should reject reserved name "${reservedName}" (case-insensitive)`, () => {
        const upperCase = reservedName.toUpperCase();
        expect(() => {
          IncrementNumberManager.generateIncrementId(upperCase, {
            projectRoot: testDir
          });
        }).toThrow(/RESERVED NAME VIOLATION/);
      });
    });

    it('should provide clear error message for reserved names', () => {
      try {
        IncrementNumberManager.generateIncrementId('reports', {
          projectRoot: testDir
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('RESERVED NAME VIOLATION');
        expect(message).toContain('reports');
        expect(message).toContain('SpecWeave internal use');
        expect(message).toContain('FIX:');
        expect(message).toContain('reporting-feature');
      }
    });
  });

  describe('Valid Name Acceptance', () => {
    const validNames = [
      'my-feature',
      'reporting-feature',
      'backup-system',
      'temp-data-cleanup',
      'log-viewer',
      'script-generator',
      'documentation-site',
      'archive-manager',
      'config-validator',
      'cache-optimizer',
      'state-management'
    ];

    validNames.forEach((validName) => {
      it(`should accept valid name "${validName}"`, () => {
        const incrementId = IncrementNumberManager.generateIncrementId(validName, {
          projectRoot: testDir
        });

        expect(incrementId).toMatch(/^\d{4}-/);
        expect(incrementId).toContain(validName);
      });
    });
  });

  describe('External Increments with Reserved Names', () => {
    it('should reject reserved name even for external increments', () => {
      expect(() => {
        IncrementNumberManager.generateIncrementId('reports', {
          projectRoot: testDir,
          isExternal: true
        });
      }).toThrow(/RESERVED NAME VIOLATION/);
    });

    it('should accept valid external increment names', () => {
      const incrementId = IncrementNumberManager.generateIncrementId('reporting-feature', {
        projectRoot: testDir,
        isExternal: true
      });

      expect(incrementId).toMatch(/^\d{4}E-/);
      expect(incrementId).toContain('reporting-feature');
    });
  });

  describe('Compound Names with Reserved Keywords', () => {
    it('should accept compound names containing reserved keywords', () => {
      // "user-reports" contains "reports" but is not exactly "reports"
      const incrementId = IncrementNumberManager.generateIncrementId('user-reports-feature', {
        projectRoot: testDir
      });

      expect(incrementId).toMatch(/^\d{4}-user-reports-feature$/);
    });

    it('should accept names with reserved keywords as prefixes', () => {
      const incrementId = IncrementNumberManager.generateIncrementId('logs-viewer', {
        projectRoot: testDir
      });

      expect(incrementId).toMatch(/^\d{4}-logs-viewer$/);
    });

    it('should accept names with reserved keywords as suffixes', () => {
      const incrementId = IncrementNumberManager.generateIncrementId('system-backup', {
        projectRoot: testDir
      });

      expect(incrementId).toMatch(/^\d{4}-system-backup$/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(() => {
        IncrementNumberManager.generateIncrementId('', {
          projectRoot: testDir
        });
      }).not.toThrow(/RESERVED NAME VIOLATION/);
      // May throw other validation errors, but not reserved name error
    });

    it('should handle whitespace-only names', () => {
      expect(() => {
        IncrementNumberManager.generateIncrementId('   ', {
          projectRoot: testDir
        });
      }).not.toThrow(/RESERVED NAME VIOLATION/);
    });

    it('should handle names with special characters', () => {
      const incrementId = IncrementNumberManager.generateIncrementId('my-feature_v2', {
        projectRoot: testDir
      });

      expect(incrementId).toMatch(/^\d{4}-my-feature_v2$/);
    });
  });
});
