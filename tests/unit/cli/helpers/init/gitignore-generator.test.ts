/**
 * Unit tests for gitignore-generator: the lines SpecWeave owns in a
 * `.gitignore` (1407: init writes only these).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';
import { ensureSpecweaveGitignoreEntries } from '../../../../../src/cli/helpers/init/gitignore-generator.js';

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
});
