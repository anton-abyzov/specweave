/**
 * Unit tests for LivingDocsSync archive check
 *
 * Verifies that archived increments are skipped during living docs sync
 * to prevent recreating archived feature folders.
 *
 * See: ULTRATHINK-ARCHIVE-REORGANIZATION-BUG.md for root cause analysis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { LivingDocsSync } from '../../../src/core/living-docs/living-docs-sync.js';
import { silentLogger } from '../../../src/utils/logger.js';

describe('LivingDocsSync - Archive Check', () => {
  let testRoot: string;

  beforeEach(async () => {
    // Create temp directory for testing
    testRoot = path.join(os.tmpdir(), `specweave-test-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Create base structure
    await fs.ensureDir(path.join(testRoot, '.specweave/increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave/increments/_archive'));
    await fs.ensureDir(path.join(testRoot, '.specweave/docs/internal/specs'));
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(testRoot);
  });

  /**
   * Test: Skip sync for archived increments
   *
   * AC: When increment is in _archive/ folder, sync should skip
   * and return success with error message
   */
  it('should skip sync for archived increments', async () => {
    const incrementId = '0039-test';

    // Create increment spec in _archive/
    const archiveSpec = path.join(testRoot, '.specweave/increments/_archive', incrementId);
    await fs.ensureDir(archiveSpec);
    await fs.writeFile(
      path.join(archiveSpec, 'spec.md'),
      `---
increment: ${incrementId}
title: Test Increment
---

# Test Increment

## User Stories

### US-001: Test Story

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test criterion
`,
      'utf-8'
    );

    // Attempt to sync
    const sync = new LivingDocsSync(testRoot, { logger: silentLogger });
    const result = await sync.syncIncrement(incrementId);

    // Should succeed but skip sync
    expect(result.success).toBe(true);
    expect(result.errors).toContain('Increment is archived - sync skipped to prevent folder recreation');
    expect(result.filesCreated).toHaveLength(0);
    expect(result.filesUpdated).toHaveLength(0);

    // Verify folders NOT created
    const featuresPath = path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-039');
    const projectPath = path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-039');

    expect(await fs.pathExists(featuresPath)).toBe(false);
    expect(await fs.pathExists(projectPath)).toBe(false);
  });

  /**
   * Test: Sync active increments normally
   *
   * AC: When increment is in active location, sync should proceed
   */
  it('should sync active increments normally', async () => {
    const incrementId = '0040-test';

    // Create increment spec in ACTIVE location
    const activeSpec = path.join(testRoot, '.specweave/increments', incrementId);
    await fs.ensureDir(activeSpec);
    await fs.writeFile(
      path.join(activeSpec, 'spec.md'),
      `---
increment: ${incrementId}
title: Active Test Increment
status: active
---

# Active Test Increment

## User Stories

### US-001: Active Story

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Test criterion
`,
      'utf-8'
    );

    // Sync active increment
    const sync = new LivingDocsSync(testRoot, { logger: silentLogger });
    const result = await sync.syncIncrement(incrementId);

    // Should succeed and create files
    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    // Verify folders created in active location
    const featuresPath = path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-040');
    const projectPath = path.join(testRoot, '.specweave/docs/internal/specs/specweave/FS-040');

    expect(await fs.pathExists(featuresPath)).toBe(true);
    expect(await fs.pathExists(projectPath)).toBe(true);

    // Verify they're NOT in archive location
    const featuresArchive = path.join(testRoot, '.specweave/docs/internal/specs/_features/_archive/FS-040');
    const projectArchive = path.join(testRoot, '.specweave/docs/internal/specs/specweave/_archive/FS-040');

    expect(await fs.pathExists(featuresArchive)).toBe(false);
    expect(await fs.pathExists(projectArchive)).toBe(false);
  });

  /**
   * Test: Archive check called before processing
   *
   * AC: Archive check should be first operation in syncIncrement()
   */
  it('should check archive status before processing spec', async () => {
    const incrementId = '0041-test';

    // Create increment in archive WITHOUT spec.md (missing file)
    const archiveSpec = path.join(testRoot, '.specweave/increments/_archive', incrementId);
    await fs.ensureDir(archiveSpec);
    // NO spec.md created - would fail if parsing attempted

    // Attempt to sync
    const sync = new LivingDocsSync(testRoot, { logger: silentLogger });
    const result = await sync.syncIncrement(incrementId);

    // Should skip BEFORE attempting to parse spec.md
    expect(result.success).toBe(true);
    expect(result.errors).toContain('Increment is archived - sync skipped to prevent folder recreation');

    // If spec parsing was attempted, it would have failed with "Spec file not found"
    // But archive check happens first, so we get "archived" message instead
  });

  /**
   * Test: Multiple sync calls for archived increment
   *
   * AC: Repeated sync calls should consistently skip archived increments
   */
  it('should consistently skip archived increments on multiple calls', async () => {
    const incrementId = '0042-test';

    // Create archived increment
    const archiveSpec = path.join(testRoot, '.specweave/increments/_archive', incrementId);
    await fs.ensureDir(archiveSpec);
    await fs.writeFile(
      path.join(archiveSpec, 'spec.md'),
      `---
increment: ${incrementId}
title: Test
---
# Test
`,
      'utf-8'
    );

    const sync = new LivingDocsSync(testRoot, { logger: silentLogger });

    // Call sync 3 times
    const result1 = await sync.syncIncrement(incrementId);
    const result2 = await sync.syncIncrement(incrementId);
    const result3 = await sync.syncIncrement(incrementId);

    // All should skip
    expect(result1.success).toBe(true);
    expect(result1.errors).toContain('Increment is archived - sync skipped to prevent folder recreation');

    expect(result2.success).toBe(true);
    expect(result2.errors).toContain('Increment is archived - sync skipped to prevent folder recreation');

    expect(result3.success).toBe(true);
    expect(result3.errors).toContain('Increment is archived - sync skipped to prevent folder recreation');

    // No folders created
    const featuresPath = path.join(testRoot, '.specweave/docs/internal/specs/_features/FS-042');
    expect(await fs.pathExists(featuresPath)).toBe(false);
  });
});
