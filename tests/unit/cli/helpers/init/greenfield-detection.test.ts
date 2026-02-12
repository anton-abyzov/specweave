/**
 * Tests for greenfield detection heuristic
 * T-005 [RED] → T-006 [GREEN]
 *
 * Default assumption: brownfield. Only greenfield when provably empty.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import * as fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';

import {
  isGreenfield,
  isGreenfieldDetailed,
  isGreenfieldMultiRepo,
} from '../../../../../src/cli/helpers/init/greenfield-detection.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-greenfield-${name}-${suffix}`);
}

describe('greenfield-detection', () => {
  let dir: string;

  beforeEach(() => {
    dir = tmpPath('gf');
    mkdirSync(dir, { recursive: true });
  });

  afterEach(async () => {
    await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => {});
  });

  // ─── isGreenfield ─────────────────────────────────────────────

  describe('isGreenfield', () => {
    it('should return true for empty directory', () => {
      expect(isGreenfield(dir)).toBe(true);
    });

    it('should return true for dir with only README', () => {
      writeFileSync(path.join(dir, 'README.md'), '# My Project');
      expect(isGreenfield(dir)).toBe(true);
    });

    it('should return true for dir with README + LICENSE + .gitignore', () => {
      writeFileSync(path.join(dir, 'README.md'), '# Project');
      writeFileSync(path.join(dir, 'LICENSE'), 'MIT');
      writeFileSync(path.join(dir, '.gitignore'), 'node_modules/');
      expect(isGreenfield(dir)).toBe(true);
    });

    it('should return true for package.json with 0 deps (npm init -y)', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        description: '',
        main: 'index.js',
      }));
      expect(isGreenfield(dir)).toBe(true);
    });

    it('should return false when package.json has dependencies', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        name: 'my-project',
        dependencies: { express: '^4.0.0', lodash: '^4.0.0' },
      }));
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return false when package.json has devDependencies', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        name: 'my-project',
        devDependencies: { vitest: '^1.0.0' },
      }));
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return false when src/ has a .ts file', () => {
      mkdirSync(path.join(dir, 'src'), { recursive: true });
      writeFileSync(path.join(dir, 'src', 'index.ts'), 'export const x = 1;');
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return false when root has a .py file', () => {
      writeFileSync(path.join(dir, 'main.py'), 'print("hello")');
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return false when nested dir has source files', () => {
      mkdirSync(path.join(dir, 'src', 'components'), { recursive: true });
      writeFileSync(path.join(dir, 'src', 'components', 'Button.tsx'), 'export const Button = () => null;');
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return true when node_modules has .js files but no source code', () => {
      mkdirSync(path.join(dir, 'node_modules', 'some-pkg'), { recursive: true });
      writeFileSync(path.join(dir, 'node_modules', 'some-pkg', 'index.js'), 'module.exports = {}');
      // No source files outside node_modules, no deps in package.json
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'empty' }));
      expect(isGreenfield(dir)).toBe(true);
    });

    it('should return false when requirements.txt has content', () => {
      writeFileSync(path.join(dir, 'requirements.txt'), 'flask==2.0.0\nrequests>=2.28.0\n');
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return true when requirements.txt is empty', () => {
      writeFileSync(path.join(dir, 'requirements.txt'), '');
      expect(isGreenfield(dir)).toBe(true);
    });

    it('should return true when requirements.txt has only comments', () => {
      writeFileSync(path.join(dir, 'requirements.txt'), '# TODO: add deps\n# pip install flask\n');
      expect(isGreenfield(dir)).toBe(true);
    });

    it('should return false when go.mod has require', () => {
      writeFileSync(path.join(dir, 'go.mod'), 'module example.com/myapp\n\ngo 1.21\n\nrequire github.com/gin-gonic/gin v1.9.0\n');
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return false when Cargo.toml has [dependencies]', () => {
      writeFileSync(path.join(dir, 'Cargo.toml'), '[package]\nname = "myapp"\n\n[dependencies]\nserde = "1.0"\n');
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return false for a .java file', () => {
      mkdirSync(path.join(dir, 'src', 'main', 'java'), { recursive: true });
      writeFileSync(path.join(dir, 'src', 'main', 'java', 'App.java'), 'public class App {}');
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return false for a .go file', () => {
      writeFileSync(path.join(dir, 'main.go'), 'package main');
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should return false for a .rs file', () => {
      mkdirSync(path.join(dir, 'src'), { recursive: true });
      writeFileSync(path.join(dir, 'src', 'main.rs'), 'fn main() {}');
      expect(isGreenfield(dir)).toBe(false);
    });

    it('should skip .specweave directory during scan', () => {
      mkdirSync(path.join(dir, '.specweave', 'state'), { recursive: true });
      writeFileSync(path.join(dir, '.specweave', 'state', 'data.ts'), 'export const x = 1;');
      expect(isGreenfield(dir)).toBe(true);
    });

    it('should return true for non-existent directory', () => {
      const noDir = path.join(dir, 'does-not-exist');
      expect(isGreenfield(noDir)).toBe(true);
    });
  });

  // ─── isGreenfieldDetailed ─────────────────────────────────────

  describe('isGreenfieldDetailed', () => {
    it('should return reason for brownfield (source files)', () => {
      writeFileSync(path.join(dir, 'app.js'), 'console.log("hi")');
      const result = isGreenfieldDetailed(dir);
      expect(result.isGreenfield).toBe(false);
      expect(result.reason).toMatch(/source files/i);
    });

    it('should return reason for brownfield (dependencies)', () => {
      writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
        dependencies: { express: '^4.0.0' },
      }));
      const result = isGreenfieldDetailed(dir);
      expect(result.isGreenfield).toBe(false);
      expect(result.reason).toMatch(/dependencies/i);
    });

    it('should return reason for greenfield', () => {
      writeFileSync(path.join(dir, 'README.md'), '# Empty');
      const result = isGreenfieldDetailed(dir);
      expect(result.isGreenfield).toBe(true);
      expect(result.reason).toMatch(/no source/i);
    });
  });

  // ─── isGreenfieldMultiRepo ────────────────────────────────────

  describe('isGreenfieldMultiRepo', () => {
    it('should return true when all repos are empty', () => {
      const repo1 = tmpPath('mr1');
      const repo2 = tmpPath('mr2');
      mkdirSync(repo1, { recursive: true });
      mkdirSync(repo2, { recursive: true });
      writeFileSync(path.join(repo1, 'README.md'), '# Repo 1');
      writeFileSync(path.join(repo2, 'README.md'), '# Repo 2');

      expect(isGreenfieldMultiRepo([repo1, repo2])).toBe(true);

      fsPromises.rm(repo1, { recursive: true, force: true }).catch(() => {});
      fsPromises.rm(repo2, { recursive: true, force: true }).catch(() => {});
    });

    it('should return false when any repo has code', () => {
      const empty = tmpPath('empty');
      const hasCode = tmpPath('code');
      mkdirSync(empty, { recursive: true });
      mkdirSync(hasCode, { recursive: true });
      writeFileSync(path.join(empty, 'README.md'), '# Empty');
      writeFileSync(path.join(hasCode, 'index.ts'), 'export const x = 1;');

      expect(isGreenfieldMultiRepo([empty, hasCode])).toBe(false);

      fsPromises.rm(empty, { recursive: true, force: true }).catch(() => {});
      fsPromises.rm(hasCode, { recursive: true, force: true }).catch(() => {});
    });

    it('should return true for empty array', () => {
      expect(isGreenfieldMultiRepo([])).toBe(true);
    });
  });
});
