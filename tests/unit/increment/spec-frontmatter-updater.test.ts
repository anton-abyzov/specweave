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
  let testCounter = 0;

  beforeEach(async () => {
    // Create isolated test directory with counter to ensure uniqueness
    testCounter++;
    testRoot = path.join(os.tmpdir(), `spec-frontmatter-test-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`);
    await fs.ensureDir(testRoot);

    // Create increment structure with unique ID per test
    incrementId = `000${testCounter}-test-increment`;
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

  describe('T-002: Atomic Write Tests', () => {
    it('testAtomicWriteSuccess - should write atomically and update status', async () => {
      // GIVEN a spec.md file with valid frontmatter
      // (already set up in beforeEach)

      // WHEN updateStatus() is called
      await SpecFrontmatterUpdater.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN temp file should not exist after successful write
      const tempPath = `${specPath}.tmp`;
      expect(await fs.pathExists(tempPath)).toBe(false);

      // AND final file should exist with updated content
      expect(await fs.pathExists(specPath)).toBe(true);
      const finalContent = await fs.readFile(specPath, 'utf-8');
      expect(finalContent).toContain('status: completed');
      expect(finalContent).not.toContain('status: active');
    });

    it('testAtomicWritePreservesFieldOrder - should preserve YAML field order', async () => {
      // GIVEN a spec.md with specific field order
      const originalContent = await fs.readFile(specPath, 'utf-8');
      const originalLines = originalContent.split('\n');

      // Find indices of key fields
      const incrementLineIndex = originalLines.findIndex(l => l.includes('increment:'));
      const titleLineIndex = originalLines.findIndex(l => l.includes('title:'));
      const priorityLineIndex = originalLines.findIndex(l => l.includes('priority:'));
      const statusLineIndex = originalLines.findIndex(l => l.includes('status:'));

      // WHEN updateStatus() is called
      await SpecFrontmatterUpdater.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN field order should be preserved
      const updatedContent = await fs.readFile(specPath, 'utf-8');
      const updatedLines = updatedContent.split('\n');

      const newIncrementLineIndex = updatedLines.findIndex(l => l.includes('increment:'));
      const newTitleLineIndex = updatedLines.findIndex(l => l.includes('title:'));
      const newPriorityLineIndex = updatedLines.findIndex(l => l.includes('priority:'));
      const newStatusLineIndex = updatedLines.findIndex(l => l.includes('status:'));

      // Field order should be same (relative positions)
      expect(newIncrementLineIndex).toBe(incrementLineIndex);
      expect(newTitleLineIndex).toBe(titleLineIndex);
      expect(newPriorityLineIndex).toBe(priorityLineIndex);
      expect(newStatusLineIndex).toBe(statusLineIndex);
    });

    it('testAtomicWriteHandlesMissingFile - should throw error for missing spec.md', async () => {
      // GIVEN a non-existent increment
      const nonExistentId = '9999-missing';

      // WHEN updateStatus() is called
      // THEN it should throw SpecUpdateError
      await expect(
        SpecFrontmatterUpdater.updateStatus(nonExistentId, IncrementStatus.COMPLETED)
      ).rejects.toThrow(/spec\.md not found/i);
    });

    it('testAtomicWriteHandlesInvalidStatus - should throw error for invalid enum value', async () => {
      // GIVEN a valid spec.md
      // (already set up in beforeEach)

      // WHEN updateStatus() is called with invalid status
      // THEN it should throw SpecUpdateError with validation message
      await expect(
        SpecFrontmatterUpdater.updateStatus(incrementId, 'not-a-real-status' as IncrementStatus)
      ).rejects.toThrow(/invalid.*status/i);

      // AND original spec.md should be unchanged
      const content = await fs.readFile(specPath, 'utf-8');
      expect(content).toContain('status: active'); // Original status preserved
    });
  });

  describe('T-003: readStatus() Method Tests', () => {
    it('testReadStatusReturnsCurrentStatus - should read correct status value', async () => {
      // GIVEN an increment with spec.md containing status="active"
      const specContent = `---
increment: ${incrementId}
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

      // WHEN readStatus() is called
      const status = await SpecFrontmatterUpdater.readStatus(incrementId);

      // THEN it should return the current status value
      expect(status).toBe(IncrementStatus.ACTIVE);
    });

    it('testReadStatusReturnsNullIfFileMissing - should return null for missing file', async () => {
      // GIVEN a non-existent increment
      const nonExistentId = '9999-missing';

      // WHEN readStatus() is called
      const status = await SpecFrontmatterUpdater.readStatus(nonExistentId);

      // THEN it should return null (not throw error)
      expect(status).toBeNull();
    });

    it('testReadStatusReturnsNullIfFieldMissing - should return null for missing status field', async () => {
      // GIVEN a spec.md WITHOUT status field
      const specWithoutStatus = `---
increment: ${incrementId}
title: Test Increment
priority: P1
type: feature
---

# Test Increment

Content here.
`;
      await fs.writeFile(specPath, specWithoutStatus, 'utf-8');

      // WHEN readStatus() is called
      const status = await SpecFrontmatterUpdater.readStatus(incrementId);

      // THEN it should return null
      expect(status).toBeNull();
    });

    it('testReadStatusValidatesEnumValue - should throw for invalid enum value', async () => {
      // GIVEN a spec.md with invalid status value
      const specWithInvalidStatus = `---
increment: 0001-test-increment
title: Test Increment
status: invalid-status-value
---

# Test Increment

Content here.
`;
      await fs.writeFile(specPath, specWithInvalidStatus, 'utf-8');

      // WHEN readStatus() is called
      // THEN it should throw SpecUpdateError
      await expect(
        SpecFrontmatterUpdater.readStatus(incrementId)
      ).rejects.toThrow(/invalid.*status/i);
    });
  });

  describe('T-004: validate() Method Tests', () => {
    it('testValidatePassesForValidStatus - should return true for valid status', async () => {
      // GIVEN an increment with valid spec.md containing status="active"
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

      // WHEN validate() is called
      const result = await SpecFrontmatterUpdater.validate(incrementId);

      // THEN it should return true
      expect(result).toBe(true);
    });

    it('testValidateThrowsForInvalidEnumValue - should throw for invalid status value', async () => {
      // GIVEN a spec.md with invalid status value
      const specWithInvalidStatus = `---
increment: 0001-test-increment
title: Test Increment
status: not-a-valid-status
---

# Test Increment

Content here.
`;
      await fs.writeFile(specPath, specWithInvalidStatus, 'utf-8');

      // WHEN validate() is called
      // THEN it should throw SpecUpdateError
      await expect(
        SpecFrontmatterUpdater.validate(incrementId)
      ).rejects.toThrow(/invalid.*status/i);
    });

    it('testValidateThrowsForMissingStatusField - should throw if status field missing', async () => {
      // GIVEN a spec.md WITHOUT status field
      const specWithoutStatus = `---
increment: 0001-test-increment
title: Test Increment
priority: P1
---

# Test Increment

Content here.
`;
      await fs.writeFile(specPath, specWithoutStatus, 'utf-8');

      // WHEN validate() is called
      // THEN it should throw SpecUpdateError
      await expect(
        SpecFrontmatterUpdater.validate(incrementId)
      ).rejects.toThrow(/missing.*status/i);
    });

    it('testValidateThrowsForMissingFile - should throw if spec.md missing', async () => {
      // GIVEN a non-existent increment
      const nonExistentId = '9999-missing';

      // WHEN validate() is called
      // THEN it should throw SpecUpdateError
      await expect(
        SpecFrontmatterUpdater.validate(nonExistentId)
      ).rejects.toThrow(/missing.*status/i);
    });
  });
});
