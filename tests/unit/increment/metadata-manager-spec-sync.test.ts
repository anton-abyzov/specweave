/**
 * Unit Tests for MetadataManager spec.md Sync Integration
 *
 * Task: T-005 - Add spec.md Sync to MetadataManager.updateStatus()
 * Increment: 0043-spec-md-desync-fix
 * Test Mode: TDD (Test-First Development)
 * Coverage Target: 92%
 *
 * User Stories: US-002
 * Acceptance Criteria: AC-US2-01, AC-US2-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';
import { silentLogger } from '../../../src/utils/logger.js';
import matter from 'gray-matter';

describe('MetadataManager - spec.md Sync Integration', () => {
  let testRoot: string;
  let incrementId: string;
  let incrementDir: string;
  let metadataPath: string;
  let specPath: string;
  let testCounter = 0;

  beforeEach(async () => {
    // Create isolated test directory with counter to ensure uniqueness
    testCounter++;
    testRoot = path.join(os.tmpdir(), `metadata-spec-sync-test-${Date.now()}-${testCounter}-${Math.random().toString(36).substring(7)}`);
    await fs.ensureDir(testRoot);

    // Create increment structure with unique ID per test
    incrementId = `000${testCounter}-test-increment`;
    incrementDir = path.join(testRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Create metadata.json
    metadataPath = path.join(incrementDir, 'metadata.json');
    const metadata = {
      id: incrementId,
      status: IncrementStatus.ACTIVE,
      type: 'feature',
      created: '2025-01-01T00:00:00Z',
      lastActivity: '2025-01-01T00:00:00Z'
    };
    await fs.writeJson(metadataPath, metadata);

    // Create spec.md with YAML frontmatter
    specPath = path.join(incrementDir, 'spec.md');
    const specContent = `---
increment: ${incrementId}
title: Test Increment
priority: P1
status: active
type: feature
created: 2025-01-01
---

# Test Increment

Test content here.
`;
    await fs.writeFile(specPath, specContent, 'utf-8');

    // Mock process.cwd() to return test root
    vi.spyOn(process, 'cwd').mockReturnValue(testRoot);

    // Use silent logger to prevent test output pollution
    MetadataManager.setLogger(silentLogger);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testRoot);
    vi.restoreAllMocks();
  });

  describe('T-005: MetadataManager Integration Tests (TDD Red Phase)', () => {
    it('testUpdateStatusUpdatesBothFiles - should update both metadata.json AND spec.md', async () => {
      // GIVEN an increment with metadata.json and spec.md both showing status="active"
      const metadataBefore = await fs.readJson(metadataPath);
      expect(metadataBefore.status).toBe(IncrementStatus.ACTIVE);

      const specBefore = await fs.readFile(specPath, 'utf-8');
      expect(specBefore).toContain('status: active');

      // WHEN updateStatus() is called with status="completed"
      const result = MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN metadata.json should be updated immediately (synchronous)
      expect(result.status).toBe(IncrementStatus.COMPLETED);
      const metadataAfter = await fs.readJson(metadataPath);
      expect(metadataAfter.status).toBe(IncrementStatus.COMPLETED);

      // AND spec.md should ALSO be updated synchronously (no wait needed)
      // Implementation uses updateSpecMdStatusSync() which is synchronous
      const specAfter = await fs.readFile(specPath, 'utf-8');
      expect(specAfter).toContain('status: completed');
      expect(specAfter).not.toContain('status: active');
    });

    it('testUpdateStatusSynchronousSpecUpdate - should update spec.md synchronously with metadata.json', async () => {
      // GIVEN an increment with valid metadata and spec.md
      // (already set up in beforeEach)

      // WHEN updateStatus() is called (synchronous operation)
      const result = MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN metadata.json should be updated immediately
      expect(result.status).toBe(IncrementStatus.COMPLETED);

      // AND spec.md should ALSO be updated immediately (no async wait needed)
      // This verifies the implementation uses synchronous update
      const specAfter = await fs.readFile(specPath, 'utf-8');
      expect(specAfter).toContain('status: completed');
      expect(specAfter).not.toContain('status: active');

      // AND both files should have consistent status
      const metadataAfter = await fs.readJson(metadataPath);
      const parsed = matter(specAfter);
      expect(metadataAfter.status).toBe(parsed.data.status);
    });

    it('testUpdateStatusPreservesSpecFrontmatter - should preserve all spec.md frontmatter fields', async () => {
      // GIVEN an increment with spec.md containing multiple frontmatter fields
      // (already set up in beforeEach)

      // WHEN updateStatus() is called (synchronous operation)
      MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN all other frontmatter fields should remain unchanged (no wait needed)
      const specAfter = await fs.readFile(specPath, 'utf-8');
      const parsed = matter(specAfter);

      expect(parsed.data.increment).toBe(incrementId);
      expect(parsed.data.title).toBe('Test Increment');
      expect(parsed.data.priority).toBe('P1');
      expect(parsed.data.type).toBe('feature');
      // gray-matter parses dates as Date objects, check it exists
      expect(parsed.data.created).toBeTruthy();

      // AND body content should be preserved
      expect(parsed.content.trim()).toContain('# Test Increment');
      expect(parsed.content.trim()).toContain('Test content here.');
    });

    it('testUpdateStatusUpdatesActiveCache - should update active increment cache appropriately', async () => {
      // GIVEN an active increment
      // (already set up in beforeEach with status=active)

      // Reset module cache to ensure fresh import with mocked process.cwd()
      // This prevents module caching issues when running all tests together
      vi.resetModules();

      // Import ActiveIncrementManager to verify cache updates
      const { ActiveIncrementManager } = await import('../../../src/core/increment/active-increment-manager.js');
      // Pass testRoot explicitly to avoid relying on mocked process.cwd() timing
      const activeManager = new ActiveIncrementManager(testRoot);

      // WHEN updateStatus() is called to complete the increment
      MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);

      // THEN active increment cache should be updated (smartUpdate called)
      // We can verify by checking that the completed increment is NOT active
      const currentActive = activeManager.getActive();
      expect(currentActive).not.toBe(incrementId);
    });
  });
});
