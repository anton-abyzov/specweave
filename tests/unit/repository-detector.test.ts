import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectSpecWeaveRepository, logRepositoryWarnings } from '../../src/utils/repository-detector.js';

describe('repository-detector', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test fixtures
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-repo-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('detectSpecWeaveRepository', () => {
    it('detects SpecWeave repo with all signals (high confidence)', () => {
      // Create fixture with all SpecWeave signals
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'specweave', version: '1.0.0' })
      );
      fs.mkdirSync(path.join(tempDir, 'src/cli/commands'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'plugins/specweave'), { recursive: true });

      const result = detectSpecWeaveRepository(tempDir);

      expect(result.isSpecWeaveRepo).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.detectionSignals).toHaveLength(3);
      expect(result.detectionSignals).toContain('package.json:name=specweave');
      expect(result.detectionSignals).toContain('src/cli/commands exists');
      expect(result.detectionSignals).toContain('plugins/specweave exists');
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('detects SpecWeave repo with 2 signals (medium confidence)', () => {
      // Only package.json and src/cli/commands
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'specweave', version: '1.0.0' })
      );
      fs.mkdirSync(path.join(tempDir, 'src/cli/commands'), { recursive: true });

      const result = detectSpecWeaveRepository(tempDir);

      expect(result.isSpecWeaveRepo).toBe(true);
      expect(result.confidence).toBe('medium');
      expect(result.detectionSignals).toHaveLength(2);
    });

    it('returns false for user project (only 1 signal)', () => {
      // Create user project fixture (different package name)
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '1.0.0' })
      );
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });

      const result = detectSpecWeaveRepository(tempDir);

      expect(result.isSpecWeaveRepo).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.detectionSignals.length).toBeLessThan(2);
      expect(result.warnings).toBeUndefined();
    });

    it('handles missing package.json gracefully', () => {
      const result = detectSpecWeaveRepository(tempDir);

      expect(result.isSpecWeaveRepo).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.detectionSignals).toHaveLength(0);
    });

    it('handles invalid package.json gracefully', () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), 'invalid json{');

      const result = detectSpecWeaveRepository(tempDir);

      expect(result.isSpecWeaveRepo).toBe(false);
      expect(result.detectionSignals.length).toBeLessThan(2);
    });

    it('returns false when package.json name is not "specweave"', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'specweave-plugin', version: '1.0.0' })
      );
      fs.mkdirSync(path.join(tempDir, 'src/cli/commands'), { recursive: true });

      const result = detectSpecWeaveRepository(tempDir);

      // Only 1 signal (src/cli/commands), not enough
      expect(result.isSpecWeaveRepo).toBe(false);
      expect(result.detectionSignals).toHaveLength(1);
      expect(result.detectionSignals).not.toContain('package.json:name=specweave');
    });

    it('includes helpful warnings for SpecWeave contributors', () => {
      // Create full SpecWeave fixture
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'specweave' })
      );
      fs.mkdirSync(path.join(tempDir, 'src/cli/commands'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'plugins/specweave'), { recursive: true });

      const result = detectSpecWeaveRepository(tempDir);

      expect(result.warnings).toBeDefined();
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('working on SpecWeave'),
          expect.stringContaining('tested thoroughly')
        ])
      );
    });

    it('handles filesystem errors gracefully', () => {
      // Try to detect in a non-existent directory
      const nonExistentDir = path.join(tempDir, 'does-not-exist');

      const result = detectSpecWeaveRepository(nonExistentDir);

      expect(result.isSpecWeaveRepo).toBe(false);
      expect(result.confidence).toBe('low');
    });
  });

  describe('logRepositoryWarnings', () => {
    it('logs warnings for SpecWeave repository', () => {
      const repoInfo = {
        isSpecWeaveRepo: true,
        detectionSignals: ['package.json:name=specweave', 'src/cli/commands exists'],
        confidence: 'high' as const,
        warnings: ['You are working on SpecWeave itself.', 'Ensure changes are tested thoroughly.']
      };

      // This function logs to console, just ensure it doesn't throw
      expect(() => logRepositoryWarnings(repoInfo)).not.toThrow();
    });

    it('does not log for user projects', () => {
      const repoInfo = {
        isSpecWeaveRepo: false,
        detectionSignals: [],
        confidence: 'low' as const
      };

      // Should not throw
      expect(() => logRepositoryWarnings(repoInfo)).not.toThrow();
    });
  });
});
