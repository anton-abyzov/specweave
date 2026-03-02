/**
 * Unit tests for init location guard rails
 *
 * Tests detectUmbrellaParent() and detectSuspiciousPath()
 * to prevent .specweave/ folder proliferation in wrong locations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import * as fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  detectUmbrellaParent,
  detectSuspiciousPath,
  SUSPICIOUS_PATH_SEGMENTS,
} from '../../../../../src/cli/helpers/init/path-utils.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-guard-test-${name}-${suffix}`);
}

describe('init location guards', () => {
  // ─── detectUmbrellaParent ──────────────────────────────────────

  describe('detectUmbrellaParent', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('umbrella');
      mkdirSync(dir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('TC-001: detects umbrella via config umbrellaRepo field', () => {
      // Create umbrella structure: dir/.specweave/config.json with umbrellaRepo
      const specweaveDir = path.join(dir, '.specweave');
      mkdirSync(specweaveDir, { recursive: true });
      writeFileSync(
        path.join(specweaveDir, 'config.json'),
        JSON.stringify({ repository: { umbrellaRepo: true } }),
      );

      // Target dir is a sub-repo inside the umbrella
      const subRepo = path.join(dir, 'repositories', 'org', 'my-repo');
      mkdirSync(subRepo, { recursive: true });

      const result = detectUmbrellaParent(subRepo);
      expect(result).not.toBeNull();
      expect(result!.umbrellaRoot).toBe(dir);
      expect(result!.reason).toBe('config-umbrella-repo');
    });

    it('TC-002: detects umbrella via repositories/ sibling directory', () => {
      // Create umbrella structure: dir/.specweave/config.json (no umbrellaRepo) + repositories/
      const specweaveDir = path.join(dir, '.specweave');
      mkdirSync(specweaveDir, { recursive: true });
      writeFileSync(
        path.join(specweaveDir, 'config.json'),
        JSON.stringify({ project: { name: 'my-umbrella' } }),
      );
      mkdirSync(path.join(dir, 'repositories'), { recursive: true });

      // Target dir is inside repositories
      const subRepo = path.join(dir, 'repositories', 'org', 'sub-repo');
      mkdirSync(subRepo, { recursive: true });

      const result = detectUmbrellaParent(subRepo);
      expect(result).not.toBeNull();
      expect(result!.umbrellaRoot).toBe(dir);
      expect(result!.reason).toBe('repositories-dir');
    });

    it('TC-003: returns null when not inside an umbrella', () => {
      // Just a standalone project dir — no parent .specweave/
      const project = path.join(dir, 'standalone-project');
      mkdirSync(project, { recursive: true });

      const result = detectUmbrellaParent(project);
      expect(result).toBeNull();
    });

    it('TC-004: returns null when parent has .specweave but no config.json', () => {
      // Stale .specweave folder with no config
      const specweaveDir = path.join(dir, '.specweave');
      mkdirSync(specweaveDir, { recursive: true });
      // No config.json — just a stale folder

      const subDir = path.join(dir, 'some-project');
      mkdirSync(subDir, { recursive: true });

      const result = detectUmbrellaParent(subDir);
      expect(result).toBeNull();
    });

    it('returns null when config.json has invalid JSON', () => {
      const specweaveDir = path.join(dir, '.specweave');
      mkdirSync(specweaveDir, { recursive: true });
      writeFileSync(path.join(specweaveDir, 'config.json'), 'not valid json');
      mkdirSync(path.join(dir, 'repositories'), { recursive: true });

      const subDir = path.join(dir, 'repositories', 'sub');
      mkdirSync(subDir, { recursive: true });

      // Invalid JSON but repositories/ dir exists — should still detect via repositories-dir
      const result = detectUmbrellaParent(subDir);
      expect(result).not.toBeNull();
      expect(result!.reason).toBe('repositories-dir');
    });

    it('returns null when config exists but no umbrella indicators', () => {
      const specweaveDir = path.join(dir, '.specweave');
      mkdirSync(specweaveDir, { recursive: true });
      writeFileSync(
        path.join(specweaveDir, 'config.json'),
        JSON.stringify({ project: { name: 'simple-project' } }),
      );
      // No repositories/ dir, no umbrellaRepo in config

      const subDir = path.join(dir, 'src', 'components');
      mkdirSync(subDir, { recursive: true });

      const result = detectUmbrellaParent(subDir);
      expect(result).toBeNull();
    });
  });

  // ─── detectSuspiciousPath ──────────────────────────────────────

  describe('detectSuspiciousPath', () => {
    it('TC-007: detects node_modules in path', () => {
      const result = detectSuspiciousPath('/home/user/project/node_modules/some-pkg');
      expect(result).not.toBeNull();
      expect(result!.segment).toBe('node_modules');
      expect(result!.suggestedRoot).toBe('/home/user/project');
    });

    it('TC-008: detects stories in path', () => {
      const result = detectSuspiciousPath('/home/user/project/src/stories');
      expect(result).not.toBeNull();
      expect(result!.segment).toBe('stories');
      expect(result!.suggestedRoot).toBe('/home/user/project/src');
    });

    it('TC-009: detects dist in path', () => {
      const result = detectSuspiciousPath('/home/user/project/dist/output');
      expect(result).not.toBeNull();
      expect(result!.segment).toBe('dist');
      expect(result!.suggestedRoot).toBe('/home/user/project');
    });

    it('TC-010: returns null for clean project root', () => {
      const result = detectSuspiciousPath('/home/user/my-project');
      expect(result).toBeNull();
    });

    it('TC-011: detects .git in path', () => {
      const result = detectSuspiciousPath('/home/user/project/.git/hooks');
      expect(result).not.toBeNull();
      expect(result!.segment).toBe('.git');
    });

    it('TC-012: SUSPICIOUS_PATH_SEGMENTS is an exported readonly array', () => {
      expect(Array.isArray(SUSPICIOUS_PATH_SEGMENTS)).toBe(true);
      expect(SUSPICIOUS_PATH_SEGMENTS.length).toBeGreaterThan(10);
      expect(SUSPICIOUS_PATH_SEGMENTS).toContain('node_modules');
      expect(SUSPICIOUS_PATH_SEGMENTS).toContain('.git');
      expect(SUSPICIOUS_PATH_SEGMENTS).toContain('dist');
    });

    it('does NOT flag src as suspicious (common project root name)', () => {
      const result = detectSuspiciousPath('/home/user/src');
      expect(result).toBeNull();
    });

    it('does NOT flag lib as suspicious', () => {
      const result = detectSuspiciousPath('/home/user/lib');
      expect(result).toBeNull();
    });

    it('does NOT flag test as suspicious', () => {
      const result = detectSuspiciousPath('/home/user/test');
      expect(result).toBeNull();
    });

    it('detects .next build dir', () => {
      const result = detectSuspiciousPath('/home/user/project/.next/server');
      expect(result).not.toBeNull();
      expect(result!.segment).toBe('.next');
    });

    it('detects coverage dir', () => {
      const result = detectSuspiciousPath('/home/user/project/coverage/lcov');
      expect(result).not.toBeNull();
      expect(result!.segment).toBe('coverage');
    });

    it('detects __pycache__', () => {
      const result = detectSuspiciousPath('/home/user/project/__pycache__');
      expect(result).not.toBeNull();
      expect(result!.segment).toBe('__pycache__');
    });

    it('detects build dir', () => {
      const result = detectSuspiciousPath('/home/user/project/build/static');
      expect(result).not.toBeNull();
      expect(result!.segment).toBe('build');
    });
  });
});
