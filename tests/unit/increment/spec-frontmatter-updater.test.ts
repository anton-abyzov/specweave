/**
 * Unit Tests for SpecFrontmatterUpdater
 *
 * Task: T-001 - Create SpecFrontmatterUpdater Class Foundation
 * Increment: 0043-spec-md-desync-fix
 * Test Mode: TDD (Test-First Development)
 * Coverage Target: 95%
 *
 * User Stories: US-002
 * Acceptance Criteria: AC-US2-01, AC-US2-04
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { SpecFrontmatterUpdater } from '../../../src/core/increment/spec-frontmatter-updater.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';

describe('SpecFrontmatterUpdater', () => {
  let testRoot: string;
  let incrementId: string;
  let specPath: string;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `spec-frontmatter-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Create increment structure
    incrementId = '0001-test-increment';
    const incrementDir = path.join(testRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Create test spec.md with YAML frontmatter
    specPath = path.join(incrementDir, 'spec.md');
    const specContent = `---
increment: 0001-test-increment
title: Test Increment
priority: P1
status: active
type: feature
created: 2025-01-01
test_mode: TDD
coverage_target: 90
---

# Test Increment

Test content here.
`;
    await fs.writeFile(specPath, specContent, 'utf-8');

    // Mock process.cwd() to return test root
    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testRoot);
    vi.restoreAllMocks();
  });

  describe('T-001: Foundation Tests (TDD Red Phase)', () => {
    it('testUpdateStatusChangesStatusField - should update status field in frontmatter', async () => {
      // GIVEN an increment with spec.md containing status="active"
      const originalContent = await fs.readFile(specPath, 'utf-8');
      expect(originalContent).toContain('status: active');

      // WHEN updateStatus() is called with status="completed"
      await SpecFrontmatterUpdater.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN spec.md frontmatter should be updated to status="completed"
      const updatedContent = await fs.readFile(specPath, 'utf-8');
      expect(updatedContent).toContain('status: completed');
      expect(updatedContent).not.toContain('status: active');
    });

    it('testUpdateStatusPreservesOtherFields - should preserve all other frontmatter fields', async () => {
      // GIVEN an increment with spec.md containing multiple fields
      // (already set up in beforeEach)

      // WHEN updateStatus() is called
      await SpecFrontmatterUpdater.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN all other frontmatter fields should remain unchanged
      const updatedContent = await fs.readFile(specPath, 'utf-8');
      expect(updatedContent).toContain('increment: 0001-test-increment');
      expect(updatedContent).toContain('title: Test Increment');
      expect(updatedContent).toContain('priority: P1');
      expect(updatedContent).toContain('type: feature');
      expect(updatedContent).toContain('created: 2025-01-01');
      expect(updatedContent).toContain('test_mode: TDD');
      expect(updatedContent).toContain('coverage_target: 90');

      // AND body content should be preserved
      expect(updatedContent).toContain('# Test Increment');
      expect(updatedContent).toContain('Test content here.');
    });

    it('testUpdateStatusValidatesEnum - should reject invalid status values', async () => {
      // GIVEN an increment with valid spec.md
      // (already set up in beforeEach)

      // WHEN updateStatus() is called with invalid status value
      // THEN it should throw an error
      await expect(
        SpecFrontmatterUpdater.updateStatus(incrementId, 'invalid-status' as IncrementStatus)
      ).rejects.toThrow(/invalid.*status/i);
    });

    it('testUpdateStatusHandlesMissingField - should add status field if missing', async () => {
      // GIVEN a spec.md WITHOUT status field
      const specWithoutStatus = `---
increment: 0001-test-increment
title: Test Increment
priority: P1
type: feature
---

# Test Increment

Content here.
`;
      await fs.writeFile(specPath, specWithoutStatus, 'utf-8');

      // WHEN updateStatus() is called
      await SpecFrontmatterUpdater.updateStatus(incrementId, IncrementStatus.ACTIVE);

      // THEN status field should be added
      const updatedContent = await fs.readFile(specPath, 'utf-8');
      expect(updatedContent).toContain('status: active');
    });
  });
});
