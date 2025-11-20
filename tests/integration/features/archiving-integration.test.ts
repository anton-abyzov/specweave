/**
 * Integration Test: Comprehensive Archiving Flow
 *
 * Tests the complete archiving workflow:
 * 1. Archive increment → automatically archives feature in ALL locations
 * 2. _features/FS-XXX → _features/_archive/FS-XXX
 * 3. specs/{project}/FS-XXX → specs/{project}/_archive/FS-XXX
 * 4. Link updates in markdown files
 * 5. Safety checks (don't archive with active increments)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { IncrementArchiver } from '../../../src/core/increment/increment-archiver.js';
import { FeatureArchiver } from '../../../src/core/living-docs/feature-archiver.js';
import { createIsolatedTestDir } from '../../test-utils/isolated-test-dir.js';
import { silentLogger } from '../../../src/utils/logger.js';

describe('Comprehensive Archiving Integration', () => {
  let testDir: string;
  let cleanup: () => Promise<void>;
  let incrementArchiver: IncrementArchiver;
  let featureArchiver: FeatureArchiver;

  beforeEach(async () => {
    // Create isolated test directory
    const isolated = await createIsolatedTestDir('archiving-integration');
    testDir = isolated.testDir;
    cleanup = isolated.cleanup;

    // Initialize archivers
    incrementArchiver = new IncrementArchiver(testDir, { logger: silentLogger });
    featureArchiver = new FeatureArchiver(testDir);
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('Complete Archiving Flow', () => {
    it('should archive increment and automatically archive feature in ALL locations', async () => {
      // Setup: Create increment 0047 with completed status
      const incrementDir = path.join(testDir, '.specweave/increments/0047-us-task-linkage');
      await fs.ensureDir(incrementDir);

      // Create metadata.json
      await fs.writeJson(path.join(incrementDir, 'metadata.json'), {
        id: '0047-us-task-linkage',
        status: 'completed',
        type: 'feature',
        created: '2025-11-19T10:00:00Z',
        completed: '2025-11-19T16:00:00Z'
      });

      // Create spec.md with feature reference
      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        `---
increment: 0047-us-task-linkage
title: "US-Task Linkage"
status: completed
epic: FS-047
---

# Feature: US-Task Linkage

Complete requirements in living docs.
`
      );

      // Setup: Create shared feature in _features/FS-047
      const sharedFeatureDir = path.join(testDir, '.specweave/docs/internal/specs/_features/FS-047');
      await fs.ensureDir(sharedFeatureDir);
      await fs.writeFile(
        path.join(sharedFeatureDir, 'FEATURE.md'),
        `---
feature: FS-047
title: "US-Task Linkage"
status: active
created: 2025-11-19
---

# Feature FS-047

Feature documentation here.
`
      );

      // Setup: Create project-specific feature in specs/specweave/FS-047
      const projectFeatureDir = path.join(testDir, '.specweave/docs/internal/specs/specweave/FS-047');
      await fs.ensureDir(projectFeatureDir);
      await fs.writeFile(
        path.join(projectFeatureDir, 'README.md'),
        `# FS-047: US-Task Linkage

Project-specific implementation for SpecWeave.
`
      );

      // Setup: Create markdown file with links to test link updates
      const readmePath = path.join(testDir, 'README.md');
      await fs.writeFile(
        readmePath,
        `# Test Project

See [Feature FS-047](.specweave/docs/internal/specs/_features/FS-047/FEATURE.md)
See [Implementation](.specweave/docs/internal/specs/specweave/FS-047/README.md)
`
      );

      // Verify setup (before archiving)
      expect(await fs.pathExists(incrementDir)).toBe(true);
      expect(await fs.pathExists(sharedFeatureDir)).toBe(true);
      expect(await fs.pathExists(projectFeatureDir)).toBe(true);

      // ACT: Archive the increment (should automatically archive features)
      const result = await incrementArchiver.archive({
        increments: ['0047'],
        preserveActive: false, // Allow archiving even if marked as active
        dryRun: false
      });

      // ASSERT: Increment archived
      expect(result.archived).toContain('0047-us-task-linkage');
      expect(result.errors).toHaveLength(0);

      // ASSERT: Increment moved to _archive
      const archivedIncrementDir = path.join(testDir, '.specweave/increments/_archive/0047-us-task-linkage');
      expect(await fs.pathExists(archivedIncrementDir)).toBe(true);
      expect(await fs.pathExists(incrementDir)).toBe(false); // Original removed

      // ASSERT: Shared feature moved to _features/_archive/FS-047
      const archivedSharedFeatureDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/_features/_archive/FS-047'
      );
      expect(await fs.pathExists(archivedSharedFeatureDir)).toBe(true);
      expect(await fs.pathExists(sharedFeatureDir)).toBe(false); // Original removed

      // ASSERT: Project feature moved to specs/specweave/_archive/FS-047
      const archivedProjectFeatureDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/specweave/_archive/FS-047'
      );
      expect(await fs.pathExists(archivedProjectFeatureDir)).toBe(true);
      expect(await fs.pathExists(projectFeatureDir)).toBe(false); // Original removed

      // ASSERT: Links updated in README.md
      const updatedReadme = await fs.readFile(readmePath, 'utf-8');
      expect(updatedReadme).toContain('.specweave/docs/internal/specs/_features/_archive/FS-047/FEATURE.md');
      expect(updatedReadme).toContain('.specweave/docs/internal/specs/specweave/_archive/FS-047/README.md');
      expect(updatedReadme).not.toContain('_features/FS-047/FEATURE.md'); // Old link removed
      expect(updatedReadme).not.toContain('specweave/FS-047/README.md'); // Old link removed
    });

    it('should handle multiple project folders for the same feature', async () => {
      // Setup: Create increment 0050
      const incrementDir = path.join(testDir, '.specweave/increments/0050-multi-project-feature');
      await fs.ensureDir(incrementDir);

      await fs.writeJson(path.join(incrementDir, 'metadata.json'), {
        id: '0050-multi-project-feature',
        status: 'completed',
        type: 'feature',
        created: '2025-11-19T10:00:00Z'
      });

      await fs.writeFile(
        path.join(incrementDir, 'spec.md'),
        `---
epic: FS-050
---
# Multi-Project Feature
`
      );

      // Setup: Create shared feature
      const sharedFeatureDir = path.join(testDir, '.specweave/docs/internal/specs/_features/FS-050');
      await fs.ensureDir(sharedFeatureDir);
      await fs.writeFile(path.join(sharedFeatureDir, 'FEATURE.md'), '# FS-050');

      // Setup: Create feature in MULTIPLE project folders
      const projects = ['specweave', 'frontend', 'backend'];
      for (const project of projects) {
        const projectDir = path.join(testDir, `.specweave/docs/internal/specs/${project}/FS-050`);
        await fs.ensureDir(projectDir);
        await fs.writeFile(path.join(projectDir, 'README.md'), `# FS-050 - ${project}`);
      }

      // ACT: Archive increment
      const result = await incrementArchiver.archive({
        increments: ['0050'],
        preserveActive: false,
        dryRun: false
      });

      // ASSERT: Increment archived
      expect(result.archived).toContain('0050-multi-project-feature');

      // ASSERT: Shared feature archived
      const archivedSharedDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/_features/_archive/FS-050'
      );
      expect(await fs.pathExists(archivedSharedDir)).toBe(true);

      // ASSERT: ALL project folders archived
      for (const project of projects) {
        const archivedProjectDir = path.join(
          testDir,
          `.specweave/docs/internal/specs/${project}/_archive/FS-050`
        );
        expect(await fs.pathExists(archivedProjectDir)).toBe(true);

        // Original removed
        const originalProjectDir = path.join(
          testDir,
          `.specweave/docs/internal/specs/${project}/FS-050`
        );
        expect(await fs.pathExists(originalProjectDir)).toBe(false);
      }
    });
  });

  describe('Safety Checks', () => {
    it('should NOT archive feature if any linked increment is still active', async () => {
      // Setup: Create TWO increments for the same feature FS-051
      // Increment 1: Active (should prevent archiving)
      const increment1Dir = path.join(testDir, '.specweave/increments/0051-feature-part1');
      await fs.ensureDir(increment1Dir);
      await fs.writeJson(path.join(increment1Dir, 'metadata.json'), {
        id: '0051-feature-part1',
        status: 'active', // ← Still active!
        type: 'feature'
      });
      await fs.writeFile(
        path.join(increment1Dir, 'spec.md'),
        `---
epic: FS-051
---
# Part 1
`
      );

      // Increment 2: Completed (we'll archive this)
      const increment2Dir = path.join(testDir, '.specweave/increments/0052-feature-part2');
      await fs.ensureDir(increment2Dir);
      await fs.writeJson(path.join(increment2Dir, 'metadata.json'), {
        id: '0052-feature-part2',
        status: 'completed',
        type: 'feature'
      });
      await fs.writeFile(
        path.join(increment2Dir, 'spec.md'),
        `---
epic: FS-051
---
# Part 2
`
      );

      // Setup: Create shared feature FS-051
      const sharedFeatureDir = path.join(testDir, '.specweave/docs/internal/specs/_features/FS-051');
      await fs.ensureDir(sharedFeatureDir);
      await fs.writeFile(path.join(sharedFeatureDir, 'FEATURE.md'), '# FS-051');

      // Setup: Create project feature
      const projectFeatureDir = path.join(testDir, '.specweave/docs/internal/specs/specweave/FS-051');
      await fs.ensureDir(projectFeatureDir);
      await fs.writeFile(path.join(projectFeatureDir, 'README.md'), '# FS-051');

      // ACT: Archive only increment 0052 (part 2)
      const result = await incrementArchiver.archive({
        increments: ['0052'],
        preserveActive: false,
        dryRun: false
      });

      // ASSERT: Increment 0052 archived
      expect(result.archived).toContain('0052-feature-part2');

      // ASSERT: Feature FS-051 NOT archived (because increment 0051 is still active)
      const archivedSharedDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/_features/_archive/FS-051'
      );
      expect(await fs.pathExists(archivedSharedDir)).toBe(false); // NOT archived

      // ASSERT: Shared feature still in active location
      expect(await fs.pathExists(sharedFeatureDir)).toBe(true);

      // ASSERT: Project feature still in active location
      expect(await fs.pathExists(projectFeatureDir)).toBe(true);
    });

    it('should archive feature only when ALL linked increments are archived', async () => {
      // Setup: Create two increments for FS-053, both completed
      const increment1Dir = path.join(testDir, '.specweave/increments/0053-feature-part1');
      await fs.ensureDir(increment1Dir);
      await fs.writeJson(path.join(increment1Dir, 'metadata.json'), {
        id: '0053-feature-part1',
        status: 'completed',
        type: 'feature'
      });
      await fs.writeFile(
        path.join(increment1Dir, 'spec.md'),
        `---
epic: FS-053
---
# Part 1
`
      );

      const increment2Dir = path.join(testDir, '.specweave/increments/0054-feature-part2');
      await fs.ensureDir(increment2Dir);
      await fs.writeJson(path.join(increment2Dir, 'metadata.json'), {
        id: '0054-feature-part2',
        status: 'completed',
        type: 'feature'
      });
      await fs.writeFile(
        path.join(increment2Dir, 'spec.md'),
        `---
epic: FS-053
---
# Part 2
`
      );

      // Setup: Create shared feature
      const sharedFeatureDir = path.join(testDir, '.specweave/docs/internal/specs/_features/FS-053');
      await fs.ensureDir(sharedFeatureDir);
      await fs.writeFile(path.join(sharedFeatureDir, 'FEATURE.md'), '# FS-053');

      // ACT: Archive FIRST increment only
      await incrementArchiver.archive({
        increments: ['0053'],
        preserveActive: false,
        dryRun: false
      });

      // ASSERT: Feature NOT archived yet (increment 0054 still active)
      const archivedSharedDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/_features/_archive/FS-053'
      );
      expect(await fs.pathExists(archivedSharedDir)).toBe(false);
      expect(await fs.pathExists(sharedFeatureDir)).toBe(true);

      // ACT: Archive SECOND increment
      await incrementArchiver.archive({
        increments: ['0054'],
        preserveActive: false,
        dryRun: false
      });

      // ASSERT: NOW feature is archived (all increments archived)
      expect(await fs.pathExists(archivedSharedDir)).toBe(true);
      expect(await fs.pathExists(sharedFeatureDir)).toBe(false); // Moved to archive
    });
  });

  describe('Restoration Flow', () => {
    it('should restore increment and features from archive', async () => {
      // Setup: Create archived increment and features
      const archivedIncrementDir = path.join(
        testDir,
        '.specweave/increments/_archive/0055-archived-feature'
      );
      await fs.ensureDir(archivedIncrementDir);
      await fs.writeJson(path.join(archivedIncrementDir, 'metadata.json'), {
        id: '0055-archived-feature',
        status: 'completed'
      });
      await fs.writeFile(path.join(archivedIncrementDir, 'spec.md'), '---\nepic: FS-055\n---');

      const archivedSharedFeatureDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/_features/_archive/FS-055'
      );
      await fs.ensureDir(archivedSharedFeatureDir);
      await fs.writeFile(path.join(archivedSharedFeatureDir, 'FEATURE.md'), '# FS-055');

      const archivedProjectFeatureDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/specweave/_archive/FS-055'
      );
      await fs.ensureDir(archivedProjectFeatureDir);
      await fs.writeFile(path.join(archivedProjectFeatureDir, 'README.md'), '# FS-055');

      // ACT: Restore increment
      await incrementArchiver.restore('0055-archived-feature');

      // ASSERT: Increment restored to active location
      const restoredIncrementDir = path.join(testDir, '.specweave/increments/0055-archived-feature');
      expect(await fs.pathExists(restoredIncrementDir)).toBe(true);
      expect(await fs.pathExists(archivedIncrementDir)).toBe(false);

      // ACT: Restore feature (would need to be done manually via FeatureArchiver)
      await featureArchiver.restoreFeature('FS-055');

      // ASSERT: Shared feature restored
      const restoredSharedFeatureDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/_features/FS-055'
      );
      expect(await fs.pathExists(restoredSharedFeatureDir)).toBe(true);
      expect(await fs.pathExists(archivedSharedFeatureDir)).toBe(false);

      // ASSERT: Project feature restored
      const restoredProjectFeatureDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/specweave/FS-055'
      );
      expect(await fs.pathExists(restoredProjectFeatureDir)).toBe(true);
      expect(await fs.pathExists(archivedProjectFeatureDir)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle increment without corresponding feature gracefully', async () => {
      // Setup: Create increment without feature folders
      const incrementDir = path.join(testDir, '.specweave/increments/0056-no-feature');
      await fs.ensureDir(incrementDir);
      await fs.writeJson(path.join(incrementDir, 'metadata.json'), {
        id: '0056-no-feature',
        status: 'completed'
      });
      await fs.writeFile(path.join(incrementDir, 'spec.md'), '# No Feature');

      // ACT: Archive increment (feature folders don't exist)
      const result = await incrementArchiver.archive({
        increments: ['0056'],
        preserveActive: false,
        dryRun: false
      });

      // ASSERT: Increment archived successfully (no errors)
      expect(result.archived).toContain('0056-no-feature');
      expect(result.errors).toHaveLength(0);

      // ASSERT: Increment moved to archive
      const archivedDir = path.join(testDir, '.specweave/increments/_archive/0056-no-feature');
      expect(await fs.pathExists(archivedDir)).toBe(true);
    });

    it('should handle feature with no increments (orphaned feature)', async () => {
      // Setup: Create feature without any increments
      const orphanedFeatureDir = path.join(testDir, '.specweave/docs/internal/specs/_features/FS-099');
      await fs.ensureDir(orphanedFeatureDir);
      await fs.writeFile(path.join(orphanedFeatureDir, 'FEATURE.md'), '# Orphaned Feature');

      // ACT: Try to archive features (with orphaned option)
      const result = await featureArchiver.archiveFeatures({
        archiveOrphanedFeatures: true,
        dryRun: false
      });

      // ASSERT: Orphaned feature archived
      expect(result.archivedFeatures).toContain('FS-099');

      // ASSERT: Feature moved to archive
      const archivedDir = path.join(
        testDir,
        '.specweave/docs/internal/specs/_features/_archive/FS-099'
      );
      expect(await fs.pathExists(archivedDir)).toBe(true);
      expect(await fs.pathExists(orphanedFeatureDir)).toBe(false);
    });
  });
});
