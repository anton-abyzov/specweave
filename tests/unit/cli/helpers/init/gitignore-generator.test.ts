/**
 * Unit tests for gitignore-generator: the lines SpecWeave owns in a
 * `.gitignore` (1407: init writes only these) and detectTechStack.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import {
  detectTechStack,
  ensureSpecweaveGitignoreEntries,
} from '../../../../../src/cli/helpers/init/gitignore-generator.js';

function tmpPath(name: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return path.join(os.tmpdir(), `sw-gitignore-${name}-${suffix}`);
}

describe('gitignore-generator', () => {
  // ─── SpecWeave's own lines ─────────────────────────────────────

  describe('SpecWeave entries in a new .gitignore', () => {
    let dir: string;
    let lines: string[];

    beforeEach(() => {
      dir = tmpPath('entries');
      mkdirSync(dir, { recursive: true });
      ensureSpecweaveGitignoreEntries(dir, '# SpecWeave');
      lines = readFileSync(path.join(dir, '.gitignore'), 'utf-8').split('\n');
    });

    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    });

    it('holds only SpecWeave lines, no stack or common rules', () => {
      for (const other of ['node_modules/', '.env', '.DS_Store', 'dist/']) expect(lines).not.toContain(other);
      expect(lines.join('\n')).not.toMatch(/migration/);
    });

    it('ignores vskill.lock (0644) and work-handoff artifacts (0867 AC-US6-03)', () => {
      for (const entry of ['vskill.lock', '.handoff/', '.specweave/state/handoff-latest.*']) expect(lines).toContain(entry);
    });

    it('ignores runtime state dirs, fresh-start backups and binary report evidence', () => {
      for (const entry of [
        '.specweave/state/',
        '.specweave/logs/',
        '.specweave/cache/',
        '.specweave/backups/',
        '.specweave/jobs/',
        '/.specweave.backup-*/',
        '**/.specweave/**/reports/*.mp4',
        '**/.specweave/**/reports/*.png',
        '**/.specweave/**/reports/*.jpg',
      ]) {
        expect(lines).toContain(entry);
      }
    });

    it('anchors the framework dirs at the root and writes each rule once', () => {
      expect(lines).toContain('/plugins/');
      expect(lines).toContain('/.claude-plugin/');
      expect(lines).not.toContain('plugins/');
      const rules = lines.map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
      expect(rules.length).toBe(new Set(rules).size);
      for (const gone of ['**/reports/*.aab', '**/reports/*.ipa', '**/reports/*.dSYM/']) expect(lines).not.toContain(gone);
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

});
