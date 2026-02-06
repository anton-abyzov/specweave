/**
 * Tests for 100% coverage option and mode-aware defaults (increment 0189)
 *
 * TDD RED phase: These tests assert new behavior that doesn't exist yet.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  updateConfigWithTesting,
  getTestingStrings,
  getCoverageDefault,
} from '../../../../../src/cli/helpers/init/testing-config.js';

describe('100% coverage option (0189)', () => {
  describe('getTestingStrings', () => {
    it('should include coverage100 string in English', () => {
      const strings = getTestingStrings('en');
      expect(strings.coverage100).toBeDefined();
      expect(strings.coverage100).toContain('100%');
    });

    it('should include coverage100 string in all 9 languages', () => {
      const languages = ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'] as const;
      for (const lang of languages) {
        const strings = getTestingStrings(lang);
        expect(strings.coverage100, `coverage100 missing for ${lang}`).toBeDefined();
      }
    });
  });

  describe('updateConfigWithTesting with 100% coverage', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = path.join(os.tmpdir(), `sw-test-coverage-${Date.now()}`);
      fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(testDir, '.specweave', 'config.json'),
        JSON.stringify({ version: '2.0' }, null, 2),
      );
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should set all coverage targets to 100 when coverage is 100%', () => {
      updateConfigWithTesting(testDir, 'TDD', 100);
      const config = JSON.parse(
        fs.readFileSync(path.join(testDir, '.specweave', 'config.json'), 'utf-8'),
      );
      expect(config.testing.coverageTargets).toEqual({
        unit: 100,
        integration: 100,
        e2e: 100,
      });
    });
  });
});

describe('mode-aware coverage defaults (0189)', () => {
  describe('getCoverageDefault', () => {
    it('should return 90 for TDD mode', () => {
      expect(getCoverageDefault('TDD')).toBe(90);
    });

    it('should return 80 for test-after mode', () => {
      expect(getCoverageDefault('test-after')).toBe(80);
    });

    it('should return 0 for manual mode', () => {
      expect(getCoverageDefault('manual')).toBe(0);
    });

    it('should return 0 for none mode', () => {
      expect(getCoverageDefault('none')).toBe(0);
    });
  });
});
