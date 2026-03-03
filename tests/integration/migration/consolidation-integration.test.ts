/**
 * Integration Test: Consolidation Engine
 *
 * Tests scanForOrphans() and executeConsolidation() with real filesystem
 * fixtures in os.tmpdir(). Verifies orphan detection, duplicate handling,
 * living doc migration, dry-run output, and execute behavior.
 *
 * Satisfies: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
 * See: .specweave/increments/0416-umbrella-sync-consolidation/spec.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  scanForOrphans,
  executeConsolidation,
} from '../../../src/core/migration/consolidation-engine.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-consolidation-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function mkdirp(...segments: string[]): string {
  const p = path.join(tmpDir, ...segments);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

function writeFile(...segments: string[]): void {
  const p = path.join(tmpDir, ...segments);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ test: true }));
}

describe('Consolidation Integration', () => {
  describe('AC-US2-01: scanForOrphans scans repositories/*/', () => {
    it('detects orphaned increments in nested repos', async () => {
      // Setup: nested repo with an increment NOT in umbrella root
      mkdirp('repositories', 'org', 'repo-a', '.specweave', 'increments', '0010-feature-a');
      writeFile('repositories', 'org', 'repo-a', '.specweave', 'increments', '0010-feature-a', 'metadata.json');
      mkdirp('.specweave', 'increments'); // umbrella root increments dir (empty)

      const plan = await scanForOrphans(tmpDir);

      expect(plan.moves).toHaveLength(1);
      expect(plan.moves[0].type).toBe('increment');
      expect(plan.moves[0].from).toContain('0010-feature-a');
      expect(plan.moves[0].to).toContain(path.join('.specweave', 'increments', '0010-feature-a'));
    });

    it('scans across multiple orgs and repos', async () => {
      mkdirp('repositories', 'org-a', 'repo-1', '.specweave', 'increments', '0020-x');
      mkdirp('repositories', 'org-b', 'repo-2', '.specweave', 'increments', '0030-y');
      mkdirp('.specweave', 'increments');

      const plan = await scanForOrphans(tmpDir);

      expect(plan.moves).toHaveLength(2);
    });
  });

  describe('AC-US2-02: orphaned increments are moved to umbrella root', () => {
    it('moves orphan increment via executeConsolidation', async () => {
      const nestedInc = mkdirp('repositories', 'org', 'repo', '.specweave', 'increments', '0010-feature');
      writeFile('repositories', 'org', 'repo', '.specweave', 'increments', '0010-feature', 'spec.md');
      mkdirp('.specweave', 'increments');

      const plan = await scanForOrphans(tmpDir);
      await executeConsolidation(plan, tmpDir);

      const movedPath = path.join(tmpDir, '.specweave', 'increments', '0010-feature');
      expect(fs.existsSync(movedPath)).toBe(true);
      expect(fs.existsSync(path.join(movedPath, 'spec.md'))).toBe(true);
      expect(fs.existsSync(nestedInc)).toBe(false);
    });
  });

  describe('AC-US2-03: duplicate increments — umbrella root copy is kept', () => {
    it('deletes nested copy when umbrella root has same increment', async () => {
      // Both umbrella root and nested repo have 0010-feature
      mkdirp('.specweave', 'increments', '0010-feature');
      writeFile('.specweave', 'increments', '0010-feature', 'metadata.json');
      const nestedInc = mkdirp('repositories', 'org', 'repo', '.specweave', 'increments', '0010-feature');
      writeFile('repositories', 'org', 'repo', '.specweave', 'increments', '0010-feature', 'metadata.json');

      const plan = await scanForOrphans(tmpDir);
      expect(plan.deletions).toHaveLength(1);
      expect(plan.deletions[0].reason).toBe('duplicate');

      await executeConsolidation(plan, tmpDir);

      // Umbrella root still exists
      expect(fs.existsSync(path.join(tmpDir, '.specweave', 'increments', '0010-feature', 'metadata.json'))).toBe(true);
      // Nested copy is gone
      expect(fs.existsSync(nestedInc)).toBe(false);
    });
  });

  describe('AC-US2-04: living docs are moved to umbrella root', () => {
    it('moves nested living docs to umbrella root docs dir', async () => {
      mkdirp('repositories', 'org', 'repo', '.specweave', 'docs', 'internal', 'specs');
      writeFile('repositories', 'org', 'repo', '.specweave', 'docs', 'internal', 'specs', 'api.md');
      mkdirp('.specweave', 'docs');

      const plan = await scanForOrphans(tmpDir);

      const docMoves = plan.moves.filter(m => m.type === 'living-doc');
      expect(docMoves.length).toBeGreaterThanOrEqual(1);

      await executeConsolidation(plan, tmpDir);

      // Verify doc was moved to correct path (not doubled) under umbrella .specweave/docs/
      const expectedPath = path.join(tmpDir, '.specweave', 'docs', 'internal', 'specs', 'api.md');
      expect(fs.existsSync(expectedPath)).toBe(true);
      // Verify no doubled path like .../specs/specs/api.md
      const doubledPath = path.join(tmpDir, '.specweave', 'docs', 'internal', 'specs', 'specs', 'api.md');
      expect(fs.existsSync(doubledPath)).toBe(false);
    });
  });

  describe('AC-US2-05: dry-run plan without making changes', () => {
    it('scanForOrphans produces plan without modifying filesystem', async () => {
      const nestedInc = mkdirp('repositories', 'org', 'repo', '.specweave', 'increments', '0010-feature');
      writeFile('repositories', 'org', 'repo', '.specweave', 'increments', '0010-feature', 'spec.md');
      mkdirp('.specweave', 'increments');

      const plan = await scanForOrphans(tmpDir);

      // Plan has moves but files haven't moved
      expect(plan.moves).toHaveLength(1);
      expect(fs.existsSync(path.join(nestedInc, 'spec.md'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, '.specweave', 'increments', '0010-feature'))).toBe(false);
    });
  });

  describe('mixed scenario', () => {
    it('handles orphans, duplicates, and docs in one pass', async () => {
      // Orphan increment
      mkdirp('repositories', 'org', 'repo-a', '.specweave', 'increments', '0010-orphan');
      writeFile('repositories', 'org', 'repo-a', '.specweave', 'increments', '0010-orphan', 'metadata.json');

      // Duplicate increment (exists in both)
      mkdirp('repositories', 'org', 'repo-a', '.specweave', 'increments', '0020-dup');
      mkdirp('.specweave', 'increments', '0020-dup');

      // Orphan doc
      mkdirp('repositories', 'org', 'repo-b', '.specweave', 'docs', 'specs');
      writeFile('repositories', 'org', 'repo-b', '.specweave', 'docs', 'specs', 'readme.md');

      mkdirp('.specweave', 'increments');
      mkdirp('.specweave', 'docs');

      const plan = await scanForOrphans(tmpDir);

      expect(plan.moves.filter(m => m.type === 'increment')).toHaveLength(1);
      expect(plan.deletions).toHaveLength(1);
      expect(plan.moves.filter(m => m.type === 'living-doc').length).toBeGreaterThanOrEqual(1);

      await executeConsolidation(plan, tmpDir);

      // Orphan moved
      expect(fs.existsSync(path.join(tmpDir, '.specweave', 'increments', '0010-orphan', 'metadata.json'))).toBe(true);
      // Duplicate nested removed
      expect(fs.existsSync(path.join(tmpDir, 'repositories', 'org', 'repo-a', '.specweave', 'increments', '0020-dup'))).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns empty plan when no repositories/ dir exists', async () => {
      mkdirp('.specweave', 'increments');
      // No repositories/ dir at all

      const plan = await scanForOrphans(tmpDir);
      expect(plan.moves).toHaveLength(0);
      expect(plan.deletions).toHaveLength(0);
    });

    it('returns empty plan when nested repos have no .specweave/', async () => {
      mkdirp('repositories', 'org', 'repo');
      mkdirp('.specweave', 'increments');

      const plan = await scanForOrphans(tmpDir);
      expect(plan.moves).toHaveLength(0);
      expect(plan.deletions).toHaveLength(0);
    });
  });
});

/** Recursively get all file paths under a directory */
function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}
