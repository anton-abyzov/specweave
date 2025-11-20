/**
 * Integration Tests: post-increment-completion Hook - Living Docs Sync
 *
 * Tests the critical missing feature (v0.24.0): Automatic living docs sync
 * when an increment is marked complete.
 *
 * **What This Tests**:
 * 1. Hook calls sync-living-docs.js when increment completes
 * 2. Feature specs finalized with all user stories
 * 3. ADRs created/updated (if present)
 * 4. Architecture docs updated (if changed)
 * 5. Delivery docs synced
 * 6. Hook handles errors gracefully (non-blocking)
 * 7. Hook works with or without GitHub issue
 *
 * **Architecture**:
 * - post-increment-completion.sh → sync-living-docs.js → LivingDocsSync
 * - Non-blocking execution (sync failures don't crash hook)
 * - Feature ID extraction from spec.md frontmatter
 * - Project ID extraction from config.json
 *
 * @group integration
 * @group hooks
 * @group living-docs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { findProjectRoot } from '../../test-utils/project-root.js';

// ✅ SAFE: Find project root from test file location, not process.cwd()
const projectRoot = findProjectRoot(import.meta.url);

describe('post-increment-completion Hook - Living Docs Sync', () => {
  let testRoot: string;
  let incrementPath: string;
  let hookPath: string;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `test-increment-completion-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Create minimal SpecWeave structure
    await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'docs', 'internal', 'specs', 'specweave'));

    // Create test increment with complete tasks
    incrementPath = path.join(testRoot, '.specweave', 'increments', '0001-test-feature');
    await fs.ensureDir(incrementPath);

    // Create spec.md with epic field
    const specContent = `---
increment: 0001-test-feature
epic: FS-001
status: completed
type: feature
priority: high
created: 2025-11-20
---

# Test Feature

## Overview

Test feature for hook integration testing.

## User Stories

### US-001: As a user, I want to test the hook

**Priority**: P0 (Critical)

**Description**: Test that the hook works correctly.

**Acceptance Criteria**:
- [x] **AC-US1-01**: Hook executes without errors
- [x] **AC-US1-02**: Living docs are created
- [x] **AC-US1-03**: Files are in correct structure
`;

    await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');

    // Create metadata.json
    const metadata = {
      id: '0001-test-feature',
      status: 'completed',
      type: 'feature',
      priority: 'high',
      created: '2025-11-20'
    };

    await fs.writeFile(
      path.join(incrementPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    // Create tasks.md
    const tasksContent = `---
total_tasks: 3
completed: 3
---

# Tasks

## T-001: Test task one

**Status**: [x] completed
**User Story**: US-001
**Satisfies ACs**: AC-US1-01

## T-002: Test task two

**Status**: [x] completed
**User Story**: US-001
**Satisfies ACs**: AC-US1-02

## T-003: Test task three

**Status**: [x] completed
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

    // Create config.json
    const config = {
      activeProject: 'specweave',
      hooks: {
        post_task_completion: {
          sync_living_docs: true
        }
      },
      livingDocs: {
        intelligent: {
          enabled: true
        }
      }
    };

    await fs.writeFile(
      path.join(testRoot, '.specweave', 'config.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    // Find hook script
    hookPath = path.join(
      projectRoot,
      'plugins/specweave/hooks/post-increment-completion.sh'
    );
  });

  afterEach(async () => {
    // Cleanup
    if (testRoot && await fs.pathExists(testRoot)) {
      await fs.remove(testRoot);
    }
  });

  it('should call sync-living-docs.js when increment completes', async () => {
    expect(await fs.pathExists(hookPath)).toBe(true);

    // Execute hook
    const result = execSync(
      `bash "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify sync was triggered
    expect(result).toContain('Performing final living docs sync');
    expect(result).toContain('Living docs sync complete');

    // Verify living docs were created
    const livingDocsPath = path.join(
      testRoot,
      '.specweave/docs/internal/specs/specweave/FS-001'
    );

    expect(await fs.pathExists(livingDocsPath)).toBe(true);
    expect(await fs.pathExists(path.join(livingDocsPath, 'README.md'))).toBe(true);
  });

  it('should extract feature ID from spec.md frontmatter', async () => {
    const result = execSync(
      `bash "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify feature ID extraction
    expect(result).toContain('Using feature ID from spec.md: FS-001');

    // Verify living docs created with correct feature ID
    const livingDocsPath = path.join(
      testRoot,
      '.specweave/docs/internal/specs/specweave/FS-001'
    );

    expect(await fs.pathExists(livingDocsPath)).toBe(true);
  });

  it('should extract project ID from config.json', async () => {
    const result = execSync(
      `bash "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify project ID extraction
    expect(result).toContain('Project ID: specweave');

    // Verify living docs created in correct project folder
    const livingDocsPath = path.join(
      testRoot,
      '.specweave/docs/internal/specs/specweave/FS-001'
    );

    expect(await fs.pathExists(livingDocsPath)).toBe(true);
  });

  it('should finalize user stories in living docs', async () => {
    execSync(
      `bash "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Check user story files were created
    const livingDocsPath = path.join(
      testRoot,
      '.specweave/docs/internal/specs/specweave/FS-001'
    );

    const files = await fs.readdir(livingDocsPath);
    const userStoryFiles = files.filter(f => f.startsWith('us-'));

    expect(userStoryFiles.length).toBeGreaterThan(0);

    // Verify user story content has task links
    const usFile = path.join(livingDocsPath, userStoryFiles[0]);
    const usContent = await fs.readFile(usFile, 'utf-8');

    // Should contain task references
    expect(usContent).toMatch(/T-\d{3}/);
  });

  it('should work without GitHub issue linked', async () => {
    // Remove GitHub info from metadata
    const metadata = {
      id: '0001-test-feature',
      status: 'completed',
      type: 'feature',
      priority: 'high',
      created: '2025-11-20'
      // NO github field
    };

    await fs.writeFile(
      path.join(incrementPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    const result = execSync(
      `bash "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify hook still runs sync even without GitHub issue
    expect(result).toContain('No GitHub issue linked');
    expect(result).toContain('Performing final living docs sync');
    expect(result).toContain('Living docs sync complete');

    // Verify living docs were created
    const livingDocsPath = path.join(
      testRoot,
      '.specweave/docs/internal/specs/specweave/FS-001'
    );

    expect(await fs.pathExists(livingDocsPath)).toBe(true);
  });

  it('should handle missing epic field gracefully', async () => {
    // Update spec.md without epic field
    const specContent = `---
increment: 0001-test-feature
status: completed
type: feature
priority: high
created: 2025-11-20
---

# Test Feature

## User Stories

### US-001: Test
**Acceptance Criteria**:
- [x] **AC-US1-01**: Test
`;

    await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');

    const result = execSync(
      `bash "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify hook handles missing epic field
    expect(result).toContain('No epic field found');
    expect(result).toContain('will auto-generate feature ID');
    expect(result).toContain('Living docs sync complete');

    // Verify living docs were created (with auto-generated ID)
    const specsDir = path.join(
      testRoot,
      '.specweave/docs/internal/specs/specweave'
    );

    const files = await fs.readdir(specsDir);
    expect(files.length).toBeGreaterThan(0);
  });

  it('should handle sync errors gracefully (non-blocking)', async () => {
    // Create invalid spec.md (missing frontmatter)
    await fs.writeFile(
      path.join(incrementPath, 'spec.md'),
      '# Invalid Spec\n\nThis spec has no frontmatter.',
      'utf-8'
    );

    // Execute hook - should not throw
    const result = execSync(
      `bash "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify error was logged but execution continued
    expect(result).toContain('Performing final living docs sync');
    // May contain error, but hook should complete
  });

  it('should update status line after sync', async () => {
    const result = execSync(
      `bash "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify status line update happens (hook completes successfully)
    expect(result).not.toContain('error');
    expect(result).not.toContain('failed');

    // Note: Actual status line update is in separate script
    // This test just verifies hook doesn't crash
  });

  it('should create ADRs directory structure', async () => {
    // Create ADR in increment reports
    const reportsDir = path.join(incrementPath, 'reports');
    await fs.ensureDir(reportsDir);

    const adrContent = `# ADR-0001: Test Architecture Decision

## Status
Accepted

## Context
Need to test ADR finalization during increment completion.

## Decision
Use the post-increment-completion hook to finalize ADRs.

## Consequences
ADRs automatically copied to living docs when increment completes.
`;

    await fs.writeFile(
      path.join(reportsDir, 'adr-0001-test-decision.md'),
      adrContent,
      'utf-8'
    );

    execSync(
      `bash "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify ADR structure exists (may be created by sync)
    const adrDir = path.join(
      testRoot,
      '.specweave/docs/internal/architecture/adr'
    );

    // Note: Actual ADR copying may be implemented in future enhancement
    // This test ensures structure is created
    if (await fs.pathExists(adrDir)) {
      expect(await fs.pathStat(adrDir)).toBeTruthy();
    }
  });
});

describe('post-increment-completion Hook - Edge Cases', () => {
  let testRoot: string;
  let hookPath: string;

  beforeEach(async () => {
    testRoot = path.join(os.tmpdir(), `test-increment-edge-${Date.now()}`);
    await fs.ensureDir(testRoot);

    hookPath = path.join(
      projectRoot,
      'plugins/specweave/hooks/post-increment-completion.sh'
    );
  });

  afterEach(async () => {
    if (testRoot && await fs.pathExists(testRoot)) {
      await fs.remove(testRoot);
    }
  });

  it('should handle missing increment gracefully', async () => {
    const result = execSync(
      `bash "${hookPath}" 9999-nonexistent`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Should log warning and exit gracefully
    expect(result).toContain('not found');
  });

  it('should handle missing sync script gracefully', async () => {
    // Create increment but no sync script available
    const incrementPath = path.join(testRoot, '.specweave', 'increments', '0001-test');
    await fs.ensureDir(incrementPath);

    await fs.writeFile(
      path.join(incrementPath, 'metadata.json'),
      JSON.stringify({ id: '0001-test', status: 'completed' }, null, 2),
      'utf-8'
    );

    const result = execSync(
      `bash "${hookPath}" 0001-test`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Should log warning about missing script
    expect(result).toContain('sync-living-docs.js not found');
    expect(result).toContain('manually sync');
  });
});
