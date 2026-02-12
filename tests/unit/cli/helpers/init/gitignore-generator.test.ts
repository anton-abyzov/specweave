/**
 * Unit tests for gitignore-generator
 *
 * Tests generateGitignore (pure), detectTechStack, writeGitignore (temp dirs).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import {
  generateGitignore,
  detectTechStack,
  writeGitignore,
} from '../../../../../src/cli/helpers/init/gitignore-generator.js';
import type { TechStackDetection } from '../../../../../src/cli/helpers/init/gitignore-generator.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-gitignore-${name}-${suffix}`);
}

describe('gitignore-generator', () => {
  // ─── generateGitignore (pure) ──────────────────────────────────

  describe('generateGitignore', () => {
    it('should include common entries by default', () => {
      const detection: TechStackDetection = {
        detected: [],
        primary: null,
        categories: new Map(),
      };
      const result = generateGitignore(detection);
      expect(result).toContain('node_modules/');
      expect(result).toContain('.env');
      expect(result).toContain('.DS_Store');
    });

    it('should include SpecWeave entries by default', () => {
      const detection: TechStackDetection = {
        detected: [],
        primary: null,
        categories: new Map(),
      };
      const result = generateGitignore(detection);
      expect(result).toContain('.specweave/cache/');
    });

    it('should exclude common when includeCommon=false', () => {
      const detection: TechStackDetection = {
        detected: [],
        primary: null,
        categories: new Map(),
      };
      const result = generateGitignore(detection, { includeCommon: false });
      // Should not have common entries like .DS_Store unless they appear in specweave
      expect(result).not.toContain('.DS_Store');
    });

    it('should exclude SpecWeave when includeSpecweave=false', () => {
      const detection: TechStackDetection = {
        detected: [],
        primary: null,
        categories: new Map(),
      };
      const result = generateGitignore(detection, { includeSpecweave: false });
      expect(result).not.toContain('.specweave/cache/');
    });

    it('should include tech-specific entries', () => {
      const categories = new Map<any, string[]>();
      categories.set('language', ['typescript']);
      categories.set('framework', ['nextjs']);

      const detection: TechStackDetection = {
        detected: [
          { name: 'typescript', confidence: 'high', source: 'file', category: 'language' },
          { name: 'nextjs', confidence: 'high', source: 'file', category: 'framework' },
        ],
        primary: 'nextjs',
        categories,
      };

      const result = generateGitignore(detection);
      expect(result).toContain('*.tsbuildinfo');
      expect(result).toContain('.next/');
    });

    it('should include custom entries', () => {
      const detection: TechStackDetection = {
        detected: [],
        primary: null,
        categories: new Map(),
      };
      const result = generateGitignore(detection, {
        customEntries: ['my-custom-dir/', 'secret.key'],
      });
      expect(result).toContain('my-custom-dir/');
      expect(result).toContain('secret.key');
      expect(result).toContain('# Project-specific');
    });

    it('should not have triple blank lines', () => {
      const detection: TechStackDetection = {
        detected: [],
        primary: null,
        categories: new Map(),
      };
      const result = generateGitignore(detection);
      expect(result).not.toContain('\n\n\n');
    });

    it('should end with newline', () => {
      const detection: TechStackDetection = {
        detected: [],
        primary: null,
        categories: new Map(),
      };
      const result = generateGitignore(detection);
      expect(result.endsWith('\n')).toBe(true);
    });
  });

  // ─── detectTechStack ───────────────────────────────────────────

  describe('detectTechStack', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('detect');
      mkdirSync(dir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should detect TypeScript from tsconfig.json', async () => {
      writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
      const detection = await detectTechStack(dir);
      const names = detection.detected.map(d => d.name);
      expect(names).toContain('typescript');
    });

    it('should detect JavaScript from package.json', async () => {
      writeFileSync(path.join(dir, 'package.json'), '{"name":"test"}');
      const detection = await detectTechStack(dir);
      const names = detection.detected.map(d => d.name);
      expect(names).toContain('javascript');
    });

    it('should detect Next.js from next.config.js', async () => {
      writeFileSync(path.join(dir, 'next.config.js'), 'module.exports = {}');
      const detection = await detectTechStack(dir);
      expect(detection.primary).toBe('nextjs');
    });

    it('should detect tech from user prompt keywords', async () => {
      const detection = await detectTechStack(dir, 'building a react app with prisma');
      const names = detection.detected.map(d => d.name);
      expect(names).toContain('react');
      expect(names).toContain('prisma');
    });

    it('should return empty detection for empty directory', async () => {
      const detection = await detectTechStack(dir);
      expect(detection.detected).toEqual([]);
      expect(detection.primary).toBeNull();
    });

    it('should prefer framework as primary over language', async () => {
      writeFileSync(path.join(dir, 'package.json'), '{"name":"test"}');
      writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
      writeFileSync(path.join(dir, 'angular.json'), '{}');
      const detection = await detectTechStack(dir);
      expect(detection.primary).toBe('angular');
    });

    it('should organize detected tech by category', async () => {
      writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
      writeFileSync(path.join(dir, 'vitest.config.ts'), '{}');
      const detection = await detectTechStack(dir);
      expect(detection.categories.get('language')).toContain('typescript');
      expect(detection.categories.get('testing')).toContain('vitest');
    });
  });

  // ─── writeGitignore ────────────────────────────────────────────

  describe('writeGitignore', () => {
    let dir: string;

    beforeEach(() => {
      dir = tmpPath('write');
      mkdirSync(dir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('should create new .gitignore', async () => {
      const result = await writeGitignore(dir, 'node_modules/\n.env\n');
      expect(result.action).toBe('created');
      const content = readFileSync(path.join(dir, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules/');
    });

    it('should merge with existing .gitignore', async () => {
      writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
      const result = await writeGitignore(dir, 'node_modules/\n.env\ndist/\n');
      expect(result.action).toBe('merged');
      const content = readFileSync(path.join(dir, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });

    it('should skip when merge=false and .gitignore exists', async () => {
      writeFileSync(path.join(dir, '.gitignore'), 'existing\n');
      const result = await writeGitignore(dir, 'new content\n', { merge: false });
      expect(result.action).toBe('skipped');
    });

    it('should create backup when merging', async () => {
      writeFileSync(path.join(dir, '.gitignore'), 'original\n');
      await writeGitignore(dir, 'new-entry/\n', { backup: true });
      const backup = readFileSync(path.join(dir, '.gitignore.backup'), 'utf-8');
      expect(backup).toContain('original');
    });

    it('should skip merge when no new entries', async () => {
      writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n.env\n');
      const result = await writeGitignore(dir, 'node_modules/\n.env\n');
      expect(result.action).toBe('skipped');
    });
  });
});
