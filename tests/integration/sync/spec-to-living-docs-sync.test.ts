/**
 * Integration tests for spec.md → living docs AC sync
 *
 * Tests the CRITICAL MISSING LINK in the sync chain:
 * tasks.md → spec.md → living docs → GitHub
 *
 * @module tests/integration/sync/spec-to-living-docs-sync
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { SpecToLivingDocsSync } from '../../../src/sync/spec-to-living-docs-sync.js';

describe('SpecToLivingDocsSync', () => {
  let testRoot: string;
  let incrementId: string;
  let featureId: string;

  beforeEach(async () => {
    // Create temp directory
    testRoot = path.join(os.tmpdir(), `spec-living-docs-sync-test-${Date.now()}`);
    await mkdir(testRoot, { recursive: true });

    incrementId = '0001-test-feature';
    featureId = 'FS-001';

    // Setup test structure
    await setupTestIncrement();
    await setupLivingDocs();
  });

  afterEach(async () => {
    // Cleanup
    if (existsSync(testRoot)) {
      await rm(testRoot, { recursive: true, force: true });
    }
  });

  async function setupTestIncrement() {
    const incrementPath = path.join(testRoot, '.specweave/increments', incrementId);
    await mkdir(incrementPath, { recursive: true });

    // metadata.json
    await writeFile(
      path.join(incrementPath, 'metadata.json'),
      JSON.stringify({
        id: incrementId,
        featureId,
        status: 'active',
      }, null, 2)
    );

    // spec.md with checked ACs
    const specContent = `---
increment: ${incrementId}
title: "Test Feature"
---

# Test Feature

## User Stories

### US-001: First User Story
**Project**: test-project

**Acceptance Criteria**:
- [x] **AC-US1-01**: First AC (completed)
- [x] **AC-US1-02**: Second AC (completed)
- [ ] **AC-US1-03**: Third AC (incomplete)

### US-002: Second User Story
**Project**: test-project

**Acceptance Criteria**:
- [x] **AC-US2-01**: Fourth AC (completed)
- [x] **AC-US2-02**: Fifth AC (completed)
`;
    await writeFile(path.join(incrementPath, 'spec.md'), specContent);

    // tasks.md with completion
    const tasksContent = `# Tasks

### T-001: Implement first feature
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

### T-002: Implement second feature
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [ ] pending

### T-003: Implement third feature
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
`;
    await writeFile(path.join(incrementPath, 'tasks.md'), tasksContent);
  }

  async function setupLivingDocs() {
    const specsPath = path.join(testRoot, '.specweave/docs/internal/specs/test-project', featureId);
    await mkdir(specsPath, { recursive: true });

    // US-001 file (should be updated)
    const us001Content = `---
id: US-001
feature: ${featureId}
title: First User Story
status: not_started
project: test-project
---

# US-001: First User Story

## Acceptance Criteria

- [ ] **AC-US1-01**: First AC (completed)
- [ ] **AC-US1-02**: Second AC (completed)
- [ ] **AC-US1-03**: Third AC (incomplete)

## Tasks

- [ ] **T-001**: Implement first feature
- [ ] **T-002**: Implement second feature
`;
    await writeFile(path.join(specsPath, 'us-001-first-user-story.md'), us001Content);

    // US-002 file (should be updated)
    const us002Content = `---
id: US-002
feature: ${featureId}
title: Second User Story
status: not_started
project: test-project
---

# US-002: Second User Story

## Acceptance Criteria

- [ ] **AC-US2-01**: Fourth AC (completed)
- [ ] **AC-US2-02**: Fifth AC (completed)

## Tasks

- [ ] **T-003**: Implement third feature
`;
    await writeFile(path.join(specsPath, 'us-002-second-user-story.md'), us002Content);
  }

  it('should sync AC checkboxes from spec.md to living docs US files', async () => {
    // Run sync
    const syncer = new SpecToLivingDocsSync({
      projectRoot: testRoot,
      incrementId,
    });

    const result = await syncer.sync();

    // Verify result
    expect(result.success).toBe(true);
    expect(result.filesProcessed).toBe(2);
    expect(result.filesUpdated).toBe(2);
    expect(result.totalACsUpdated).toBeGreaterThan(0);

    // Read updated US-001 file
    const us001Path = path.join(
      testRoot,
      '.specweave/docs/internal/specs/test-project',
      featureId,
      'us-001-first-user-story.md'
    );
    const us001Updated = await readFile(us001Path, 'utf-8');

    // Check AC checkboxes were updated
    expect(us001Updated).toContain('- [x] **AC-US1-01**: First AC');
    expect(us001Updated).toContain('- [x] **AC-US1-02**: Second AC');
    expect(us001Updated).toContain('- [ ] **AC-US1-03**: Third AC'); // Should remain unchecked

    // Status should NOT be updated (not all ACs complete)
    expect(us001Updated).toMatch(/status:\s+not_started/);

    // Read updated US-002 file
    const us002Path = path.join(
      testRoot,
      '.specweave/docs/internal/specs/test-project',
      featureId,
      'us-002-second-user-story.md'
    );
    const us002Updated = await readFile(us002Path, 'utf-8');

    // Check AC checkboxes were updated
    expect(us002Updated).toContain('- [x] **AC-US2-01**: Fourth AC');
    expect(us002Updated).toContain('- [x] **AC-US2-02**: Fifth AC');

    // Status SHOULD be updated (all ACs complete)
    expect(us002Updated).toMatch(/status:\s+completed/);
  });

  it('should sync task checkboxes from tasks.md to living docs', async () => {
    // Run sync
    const syncer = new SpecToLivingDocsSync({
      projectRoot: testRoot,
      incrementId,
    });

    const result = await syncer.sync();

    expect(result.success).toBe(true);
    expect(result.totalTasksUpdated).toBeGreaterThan(0);

    // Read updated US-001 file
    const us001Path = path.join(
      testRoot,
      '.specweave/docs/internal/specs/test-project',
      featureId,
      'us-001-first-user-story.md'
    );
    const us001Updated = await readFile(us001Path, 'utf-8');

    // Check task checkboxes
    expect(us001Updated).toContain('- [x] **T-001**: Implement first feature');
    expect(us001Updated).toContain('- [ ] **T-002**: Implement second feature');
  });

  it('should update status to completed when all ACs are checked', async () => {
    // Run sync
    const syncer = new SpecToLivingDocsSync({
      projectRoot: testRoot,
      incrementId,
    });

    const result = await syncer.sync();

    // US-002 has all ACs complete
    const us002Path = path.join(
      testRoot,
      '.specweave/docs/internal/specs/test-project',
      featureId,
      'us-002-second-user-story.md'
    );
    const us002Updated = await readFile(us002Path, 'utf-8');

    expect(us002Updated).toMatch(/status:\s+completed/);
    expect(us002Updated).toMatch(/lastModified:/); // Should have timestamp
  });

  it('should handle dry-run mode without modifying files', async () => {
    // Run sync in dry-run
    const syncer = new SpecToLivingDocsSync({
      projectRoot: testRoot,
      incrementId,
      dryRun: true,
    });

    const result = await syncer.sync();

    expect(result.success).toBe(true);
    expect(result.filesUpdated).toBeGreaterThan(0);

    // Read US-001 file - should NOT be modified
    const us001Path = path.join(
      testRoot,
      '.specweave/docs/internal/specs/test-project',
      featureId,
      'us-001-first-user-story.md'
    );
    const us001Content = await readFile(us001Path, 'utf-8');

    // ACs should still be unchecked (dry-run)
    expect(us001Content).toContain('- [ ] **AC-US1-01**: First AC');
    expect(us001Content).toContain('- [ ] **AC-US1-02**: Second AC');
  });

  it('should handle missing featureId gracefully', async () => {
    // Remove featureId from metadata
    const metadataPath = path.join(testRoot, '.specweave/increments', incrementId, 'metadata.json');
    await writeFile(
      metadataPath,
      JSON.stringify({
        id: incrementId,
        status: 'active',
        // No featureId
      }, null, 2)
    );

    const syncer = new SpecToLivingDocsSync({
      projectRoot: testRoot,
      incrementId,
    });

    const result = await syncer.sync();

    // Should succeed with no files processed
    expect(result.success).toBe(true);
    expect(result.filesProcessed).toBe(0);
  });

  it('should handle no living docs files gracefully', async () => {
    // Remove living docs
    const specsPath = path.join(testRoot, '.specweave/docs/internal/specs');
    if (existsSync(specsPath)) {
      await rm(specsPath, { recursive: true, force: true });
    }

    const syncer = new SpecToLivingDocsSync({
      projectRoot: testRoot,
      incrementId,
    });

    const result = await syncer.sync();

    // Should succeed with no files processed
    expect(result.success).toBe(true);
    expect(result.filesProcessed).toBe(0);
  });

  it('should handle empty spec.md gracefully', async () => {
    // Write empty spec.md
    const specPath = path.join(testRoot, '.specweave/increments', incrementId, 'spec.md');
    await writeFile(specPath, '# Empty Spec\n\nNo ACs here.');

    const syncer = new SpecToLivingDocsSync({
      projectRoot: testRoot,
      incrementId,
    });

    const result = await syncer.sync();

    // Should succeed with no ACs updated
    expect(result.success).toBe(true);
    expect(result.totalACsUpdated).toBe(0);
  });
});
