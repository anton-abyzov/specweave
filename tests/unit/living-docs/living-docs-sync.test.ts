/**
 * Unit Tests: LivingDocsSync
 *
 * Tests the core sync mechanism for syncing increment specs to living docs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import * as os from 'os';
import { LivingDocsSync } from '../../../src/core/living-docs/living-docs-sync.js';

describe('LivingDocsSync', () => {
  let testRoot: string;
  let sync: LivingDocsSync;

  beforeEach(async () => {
    // SAFE: Use isolated temp directory
    testRoot = path.join(os.tmpdir(), `test-living-docs-sync-${Date.now()}`);
    await fs.ensureDir(testRoot);
    sync = new LivingDocsSync(testRoot);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  describe('syncIncrement - Greenfield Increments', () => {
    it('should sync greenfield increment without feature field and auto-generate FS-XXX', async () => {
      // Create increment 0040 without feature field (greenfield)
      const incrementPath = path.join(testRoot, '.specweave/increments/0040-test-feature');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0040-test-feature
title: "Test Feature"
status: completed
type: bug
---

# Test Feature

## Overview

This is a test feature for greenfield sync.

### US-001: First User Story

**As a** developer
**I want** to test sync
**So that** I can verify it works

**Acceptance Criteria**:

- [ ] AC-US1-01: First criterion
- [x] AC-US1-02: Second criterion (completed)
`
      );

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: '0040-test-feature',
        status: 'completed',
        created: '2025-11-17T00:00:00Z'
      });

      // Sync increment
      const result = await sync.syncIncrement('0040-test-feature');

      // Verify success
      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-040'); // Auto-generated
      expect(result.filesCreated.length).toBeGreaterThan(0);

      // Verify FEATURE.md created
      const featurePath = path.join(
        testRoot,
        '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md'
      );
      expect(await fs.pathExists(featurePath)).toBe(true);

      const featureContent = await fs.readFile(featurePath, 'utf-8');
      expect(featureContent).toContain('id: FS-040');
      expect(featureContent).toContain('Test Feature');

      // Verify README.md created
      const readmePath = path.join(
        testRoot,
        '.specweave/docs/internal/specs/specweave/FS-040/README.md'
      );
      expect(await fs.pathExists(readmePath)).toBe(true);

      // Verify user story file created
      const userStoryFiles = await fs.readdir(
        path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-040')
      );
      const storyFiles = userStoryFiles.filter(f => f.startsWith('us-'));
      expect(storyFiles.length).toBeGreaterThan(0);
    });

    it('should handle increment 0041 with auto-generated FS-041', async () => {
      const incrementPath = path.join(testRoot, '.specweave/increments/0041-another-feature');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0041-another-feature
title: "Another Test Feature"
status: completed
---

# Another Test Feature

## Overview

Another greenfield feature.
`
      );

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: '0041-another-feature',
        status: 'completed'
      });

      const result = await sync.syncIncrement('0041-another-feature');

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-041'); // Auto-generated
    });
  });

  describe('syncIncrement - Brownfield Increments', () => {
    it('should honor explicit feature ID from metadata.json', async () => {
      const incrementPath = path.join(testRoot, '.specweave/increments/0050-imported');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0050-imported
title: "Imported Feature"
imported: true
---

# Imported Feature
`
      );

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: '0050-imported',
        feature: 'FS-25-11-15-external',
        status: 'completed',
        imported: true  // CRITICAL: Mark as brownfield (imported from external tool)
      });

      const result = await sync.syncIncrement('0050-imported');

      expect(result.success).toBe(true);
      expect(result.featureId).toBe('FS-25-11-15-external'); // From metadata (brownfield format preserved)
    });
  });

  describe('syncIncrement - Dry Run Mode', () => {
    it('should not create files in dry-run mode', async () => {
      const incrementPath = path.join(testRoot, '.specweave/increments/0040-test');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0040-test
---
# Test
`
      );

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: '0040-test',
        status: 'completed'
      });

      const result = await sync.syncIncrement('0040-test', { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.filesCreated.length).toBeGreaterThan(0);
      expect(result.filesCreated[0]).toContain('(dry-run)');

      // Verify no files actually created
      const featurePath = path.join(
        testRoot,
        '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md'
      );
      expect(await fs.pathExists(featurePath)).toBe(false);
    });
  });

  describe('syncIncrement - Error Handling', () => {
    it('should fail gracefully if spec.md not found', async () => {
      const result = await sync.syncIncrement('0099-nonexistent');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Spec file not found');
    });

    it('should fail gracefully for invalid increment ID format', async () => {
      const result = await sync.syncIncrement('invalid-format');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('parseIncrementSpec', () => {
    it('should extract title from frontmatter', async () => {
      const incrementPath = path.join(testRoot, '.specweave/increments/0040-test');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
title: "Custom Title"
---
# Heading
`
      );

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: '0040-test',
        status: 'completed'
      });

      const result = await sync.syncIncrement('0040-test');
      expect(result.success).toBe(true);

      const featureContent = await fs.readFile(
        path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-040/FEATURE.md'),
        'utf-8'
      );
      expect(featureContent).toContain('Custom Title');
    });

    it('should extract user stories from spec content', async () => {
      const incrementPath = path.join(testRoot, '.specweave/increments/0040-test');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0040-test
---

# Test

### US-001: First Story

**As a** user
**I want** feature A
**So that** I can do X

- [ ] AC-US1-01: Criterion 1

### US-002: Second Story

**As a** admin
**I want** feature B
**So that** I can do Y

- [ ] AC-US2-01: Criterion 2
`
      );

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: '0040-test',
        status: 'completed'
      });

      const result = await sync.syncIncrement('0040-test');
      expect(result.success).toBe(true);

      // Verify both user stories created
      const storyFiles = await fs.readdir(
        path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-040')
      );
      const userStories = storyFiles.filter(f => f.startsWith('us-'));
      expect(userStories.length).toBe(2);
      expect(userStories.some(f => f.includes('us-001'))).toBe(true);
      expect(userStories.some(f => f.includes('us-002'))).toBe(true);
    });

    it('should extract acceptance criteria with completion status', async () => {
      const incrementPath = path.join(testRoot, '.specweave/increments/0040-test');
      await fs.ensureDir(incrementPath);

      await fs.writeFile(
        path.join(incrementPath, 'spec.md'),
        `---
increment: 0040-test
---

# Test

### US-001: Story

- [ ] AC-US1-01: Incomplete criterion
- [x] AC-US1-02: Completed criterion
`
      );

      await fs.writeJson(path.join(incrementPath, 'metadata.json'), {
        id: '0040-test',
        status: 'completed'
      });

      const result = await sync.syncIncrement('0040-test');
      expect(result.success).toBe(true);

      const userStoryContent = await fs.readFile(
        (await fs.readdir(
          path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-040')
        ))
        .filter(f => f.startsWith('us-001'))
        .map(f => path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-040', f))[0],
        'utf-8'
      );

      expect(userStoryContent).toContain('- [ ] **AC-US1-01**: Incomplete criterion');
      expect(userStoryContent).toContain('- [x] **AC-US1-02**: Completed criterion');
    });
  });
});
