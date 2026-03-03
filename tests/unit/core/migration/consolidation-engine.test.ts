/**
 * Consolidation Engine Unit Tests
 *
 * Tests scanForOrphans() and executeConsolidation() for migrating
 * orphaned increments and living docs from nested repos to umbrella root.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fsPromises } from 'fs';
import * as fs from 'fs';
import path from 'path';
import os from 'os';

import {
  scanForOrphans,
  executeConsolidation,
  type ConsolidationPlan,
} from '../../../../src/core/migration/consolidation-engine.js';

describe('consolidation-engine', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `consolidation-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fsPromises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fsPromises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper: create a nested repo with .specweave/increments
   */
  async function createNestedRepo(
    repoPath: string,
    increments: string[],
    docs: string[] = [],
  ): Promise<void> {
    for (const inc of increments) {
      const incDir = path.join(repoPath, '.specweave', 'increments', inc);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ increment: inc }),
      );
    }
    for (const doc of docs) {
      const docDir = path.join(repoPath, '.specweave', 'docs', doc);
      await fsPromises.mkdir(docDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(docDir, 'index.md'),
        `# ${doc}`,
      );
    }
  }

  /**
   * Helper: create umbrella root .specweave/increments
   */
  async function createUmbrellaIncrements(
    umbrellaRoot: string,
    increments: string[],
  ): Promise<void> {
    for (const inc of increments) {
      const incDir = path.join(umbrellaRoot, '.specweave', 'increments', inc);
      await fsPromises.mkdir(incDir, { recursive: true });
      await fsPromises.writeFile(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({ increment: inc, source: 'umbrella' }),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // scanForOrphans
  // ---------------------------------------------------------------------------

  describe('scanForOrphans', () => {
    it('detects orphan increments not present in umbrella root', async () => {
      // Create nested repo with increment
      const repoDir = path.join(testDir, 'repositories', 'org', 'my-repo');
      await createNestedRepo(repoDir, ['0010-feature-foo']);

      // Create umbrella root with no increments
      await fsPromises.mkdir(path.join(testDir, '.specweave', 'increments'), { recursive: true });

      const plan = await scanForOrphans(testDir);

      expect(plan.moves).toHaveLength(1);
      expect(plan.moves[0].type).toBe('increment');
      expect(plan.moves[0].from).toContain('0010-feature-foo');
      expect(plan.moves[0].to).toContain(path.join('.specweave', 'increments', '0010-feature-foo'));
      expect(plan.deletions).toHaveLength(0);
    });

    it('detects duplicate increments and schedules deletion of nested copy', async () => {
      // Create nested repo with increment
      const repoDir = path.join(testDir, 'repositories', 'org', 'my-repo');
      await createNestedRepo(repoDir, ['0010-feature-foo']);

      // Create same increment in umbrella root
      await createUmbrellaIncrements(testDir, ['0010-feature-foo']);

      const plan = await scanForOrphans(testDir);

      expect(plan.moves).toHaveLength(0);
      expect(plan.deletions).toHaveLength(1);
      expect(plan.deletions[0].path).toContain('0010-feature-foo');
      expect(plan.deletions[0].reason).toBe('duplicate');
    });

    it('detects orphan living docs and schedules moves', async () => {
      const repoDir = path.join(testDir, 'repositories', 'org', 'my-repo');
      await createNestedRepo(repoDir, [], ['internal/specs/my-project']);

      // Create umbrella root docs dir
      await fsPromises.mkdir(path.join(testDir, '.specweave', 'docs'), { recursive: true });

      const plan = await scanForOrphans(testDir);

      expect(plan.moves.some(m => m.type === 'living-doc')).toBe(true);
    });

    it('handles multiple nested repos with mixed orphans and duplicates', async () => {
      // Repo 1: has orphan + duplicate
      const repo1 = path.join(testDir, 'repositories', 'org', 'repo1');
      await createNestedRepo(repo1, ['0010-orphan', '0020-duplicate']);

      // Repo 2: has another orphan
      const repo2 = path.join(testDir, 'repositories', 'org', 'repo2');
      await createNestedRepo(repo2, ['0030-another-orphan']);

      // Umbrella root has 0020
      await createUmbrellaIncrements(testDir, ['0020-duplicate']);

      const plan = await scanForOrphans(testDir);

      expect(plan.moves).toHaveLength(2); // 0010 + 0030
      expect(plan.deletions).toHaveLength(1); // 0020
    });

    it('returns empty plan when no nested .specweave dirs exist', async () => {
      // Create repos dir but no .specweave inside
      await fsPromises.mkdir(path.join(testDir, 'repositories', 'org', 'my-repo'), { recursive: true });
      await fsPromises.mkdir(path.join(testDir, '.specweave', 'increments'), { recursive: true });

      const plan = await scanForOrphans(testDir);

      expect(plan.moves).toHaveLength(0);
      expect(plan.deletions).toHaveLength(0);
    });

    it('returns empty plan when repositories dir does not exist', async () => {
      await fsPromises.mkdir(path.join(testDir, '.specweave', 'increments'), { recursive: true });

      const plan = await scanForOrphans(testDir);

      expect(plan.moves).toHaveLength(0);
      expect(plan.deletions).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // executeConsolidation
  // ---------------------------------------------------------------------------

  describe('executeConsolidation', () => {
    it('moves orphan increment to umbrella root', async () => {
      const repoDir = path.join(testDir, 'repositories', 'org', 'my-repo');
      await createNestedRepo(repoDir, ['0010-feature-foo']);
      await fsPromises.mkdir(path.join(testDir, '.specweave', 'increments'), { recursive: true });

      const plan: ConsolidationPlan = {
        moves: [{
          from: path.join(repoDir, '.specweave', 'increments', '0010-feature-foo'),
          to: path.join(testDir, '.specweave', 'increments', '0010-feature-foo'),
          type: 'increment',
        }],
        deletions: [],
      };

      await executeConsolidation(plan, testDir);

      // Verify moved
      const movedMetadata = path.join(testDir, '.specweave', 'increments', '0010-feature-foo', 'metadata.json');
      expect(fs.existsSync(movedMetadata)).toBe(true);
      const content = JSON.parse(fs.readFileSync(movedMetadata, 'utf-8'));
      expect(content.increment).toBe('0010-feature-foo');

      // Verify source removed
      expect(fs.existsSync(path.join(repoDir, '.specweave', 'increments', '0010-feature-foo'))).toBe(false);
    });

    it('deletes duplicate nested increment', async () => {
      const repoDir = path.join(testDir, 'repositories', 'org', 'my-repo');
      await createNestedRepo(repoDir, ['0010-feature-foo']);
      await createUmbrellaIncrements(testDir, ['0010-feature-foo']);

      const nestedIncPath = path.join(repoDir, '.specweave', 'increments', '0010-feature-foo');
      const plan: ConsolidationPlan = {
        moves: [],
        deletions: [{
          path: nestedIncPath,
          reason: 'duplicate',
        }],
      };

      await executeConsolidation(plan, testDir);

      // Nested copy should be deleted
      expect(fs.existsSync(nestedIncPath)).toBe(false);

      // Umbrella copy should remain
      const umbrellaInc = path.join(testDir, '.specweave', 'increments', '0010-feature-foo', 'metadata.json');
      expect(fs.existsSync(umbrellaInc)).toBe(true);
    });

    it('moves living docs to umbrella root', async () => {
      const repoDir = path.join(testDir, 'repositories', 'org', 'my-repo');
      const nestedDocDir = path.join(repoDir, '.specweave', 'docs', 'internal', 'specs', 'my-project');
      await fsPromises.mkdir(nestedDocDir, { recursive: true });
      await fsPromises.writeFile(path.join(nestedDocDir, 'index.md'), '# My Project');

      const umbrellaDocDir = path.join(testDir, '.specweave', 'docs', 'internal', 'specs');
      await fsPromises.mkdir(umbrellaDocDir, { recursive: true });

      const plan: ConsolidationPlan = {
        moves: [{
          from: nestedDocDir,
          to: path.join(umbrellaDocDir, 'my-project'),
          type: 'living-doc',
        }],
        deletions: [],
      };

      await executeConsolidation(plan, testDir);

      // Verify moved
      const movedDoc = path.join(umbrellaDocDir, 'my-project', 'index.md');
      expect(fs.existsSync(movedDoc)).toBe(true);
      expect(fs.readFileSync(movedDoc, 'utf-8')).toBe('# My Project');

      // Verify source removed
      expect(fs.existsSync(nestedDocDir)).toBe(false);
    });

    it('creates parent directories for move targets', async () => {
      const repoDir = path.join(testDir, 'repositories', 'org', 'my-repo');
      await createNestedRepo(repoDir, ['0010-feature-foo']);

      // Don't create .specweave/increments/ in umbrella root — executeConsolidation should handle it
      const plan: ConsolidationPlan = {
        moves: [{
          from: path.join(repoDir, '.specweave', 'increments', '0010-feature-foo'),
          to: path.join(testDir, '.specweave', 'increments', '0010-feature-foo'),
          type: 'increment',
        }],
        deletions: [],
      };

      await executeConsolidation(plan, testDir);

      const movedMetadata = path.join(testDir, '.specweave', 'increments', '0010-feature-foo', 'metadata.json');
      expect(fs.existsSync(movedMetadata)).toBe(true);
    });

    it('handles empty plan gracefully', async () => {
      const plan: ConsolidationPlan = { moves: [], deletions: [] };

      // Should not throw
      await executeConsolidation(plan, testDir);
    });
  });
});
