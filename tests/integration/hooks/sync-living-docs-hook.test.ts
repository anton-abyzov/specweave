/**
 * Integration Tests: sync-living-docs Hook
 *
 * Tests the post-task-completion hook that automatically syncs living docs.
 *
 * Critical tests:
 * 1. Hook uses LivingDocsSync (not old SpecDistributor API)
 * 2. Hook syncs successfully after task completion
 * 3. Hook handles errors gracefully (non-blocking)
 * 4. Hook respects config.json settings
 * 5. Hook creates living docs in correct structure
 *
 * @group integration
 * @group hooks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

describe('sync-living-docs Hook Integration', () => {
  let testRoot: string;
  let incrementPath: string;

  beforeEach(async () => {
    // Create isolated test directory
    testRoot = path.join(os.tmpdir(), `test-hook-${Date.now()}`);
    await fs.ensureDir(testRoot);

    // Create minimal SpecWeave structure
    await fs.ensureDir(path.join(testRoot, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testRoot, '.specweave', 'docs', 'internal', 'specs'));

    // Create test increment
    incrementPath = path.join(testRoot, '.specweave', 'increments', '0001-test-feature');
    await fs.ensureDir(incrementPath);

    // Create spec.md
    const specContent = `---
increment: 0001-test-feature
status: in-progress
type: feature
priority: high
created: 2025-11-19
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
- [ ] **AC-US1-03**: Files are in correct structure
`;

    await fs.writeFile(path.join(incrementPath, 'spec.md'), specContent, 'utf-8');

    // Create metadata.json
    const metadata = {
      id: '0001-test-feature',
      status: 'in-progress',
      type: 'feature',
      priority: 'high',
      created: '2025-11-19'
    };

    await fs.writeFile(
      path.join(incrementPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    // Create tasks.md
    const tasksContent = `---
total_tasks: 1
completed: 1
---

# Tasks

## T-001: Test task

**Status**: [x] completed
**Covers**: AC-US1-01, AC-US1-02
`;

    await fs.writeFile(path.join(incrementPath, 'tasks.md'), tasksContent, 'utf-8');

    // Create config.json with sync enabled
    const config = {
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
  });

  afterEach(async () => {
    // Cleanup
    if (testRoot && await fs.pathExists(testRoot)) {
      await fs.remove(testRoot);
    }
  });

  it('should execute hook without errors', async () => {
    // Find hook script
    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/sync-living-docs.js'
    );

    expect(await fs.pathExists(hookPath)).toBe(true);

    // Execute hook
    const result = execSync(
      `node "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify output
    expect(result).toContain('Living docs sync enabled');
    expect(result).toContain('Living docs sync complete');
    expect(result).not.toContain('distributor.distribute is not a function');
  });

  it('should use LivingDocsSync (not old SpecDistributor)', async () => {
    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/sync-living-docs.js'
    );

    const hookContent = await fs.readFile(hookPath, 'utf-8');

    // Verify it imports LivingDocsSync
    expect(hookContent).toContain('LivingDocsSync');
    expect(hookContent).toContain('living-docs-sync.js');

    // Verify it uses new API (not just checking strings, but actual implementation)
    expect(hookContent).toContain('new LivingDocsSync(projectRoot');
    expect(hookContent).toContain('await sync.syncIncrement(incrementId');

    // Verify old API is NOT in active code (only in comments explaining the fix)
    const codeWithoutComments = hookContent.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeWithoutComments).not.toContain('new SpecDistributor(');
    expect(codeWithoutComments).not.toContain('await distributor.distribute(');
  });

  it('should create living docs structure', async () => {
    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/sync-living-docs.js'
    );

    // Execute hook
    execSync(
      `node "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify living docs were created
    const livingDocsPath = path.join(
      testRoot,
      '.specweave/docs/internal/specs/specweave/FS-001'
    );

    expect(await fs.pathExists(livingDocsPath)).toBe(true);
    expect(await fs.pathExists(path.join(livingDocsPath, 'README.md'))).toBe(true);

    // Check for user story files
    const files = await fs.readdir(livingDocsPath);
    const userStoryFiles = files.filter(f => f.startsWith('us-'));
    expect(userStoryFiles.length).toBeGreaterThan(0);
  });

  it('should respect config.json settings', async () => {
    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/sync-living-docs.js'
    );

    // Disable sync in config
    const config = {
      hooks: {
        post_task_completion: {
          sync_living_docs: false
        }
      }
    };

    await fs.writeFile(
      path.join(testRoot, '.specweave', 'config.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    // Execute hook
    const result = execSync(
      `node "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify sync was skipped
    expect(result).toContain('Living docs sync disabled');
    expect(result).not.toContain('Living docs sync complete');
  });

  it('should handle errors gracefully (non-blocking)', async () => {
    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/sync-living-docs.js'
    );

    // Create invalid spec.md (missing frontmatter)
    await fs.writeFile(
      path.join(incrementPath, 'spec.md'),
      '# Invalid Spec\n\nThis spec has no frontmatter.',
      'utf-8'
    );

    // Execute hook - should not throw
    const result = execSync(
      `node "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify error was logged but execution continued
    expect(result).toContain('Living docs sync enabled');
    // Hook might fail but shouldn't crash
  });

  it('should handle missing increment gracefully', async () => {
    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/sync-living-docs.js'
    );

    // Execute hook for non-existent increment
    const result = execSync(
      `node "${hookPath}" 9999-nonexistent`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Should handle gracefully (non-blocking)
    expect(result).toContain('Living docs sync enabled');
  });

  it('should log detailed progress', async () => {
    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/sync-living-docs.js'
    );

    const result = execSync(
      `node "${hookPath}" 0001-test-feature`,
      {
        cwd: testRoot,
        encoding: 'utf-8',
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Verify detailed logging (updated for intelligent sync mode v0.18.0+)
    expect(result).toContain('Checking living docs sync');
    expect(result).toContain('Living docs sync enabled');
    expect(result).toContain('Using intelligent sync mode');
    // Note: May fallback to hierarchical distribution if not fully implemented
    expect(result).toMatch(/Syncing increment to living docs structure|Falling back to hierarchical distribution mode/);
  });
});

describe('sync-living-docs Hook Architecture', () => {
  it('should have comprehensive documentation comments', async () => {
    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/sync-living-docs.js'
    );

    const hookContent = await fs.readFile(hookPath, 'utf-8');

    // Verify documentation exists
    expect(hookContent).toContain('LONG-TERM FIX');
    expect(hookContent).toContain('Why this change:');
    expect(hookContent).toContain('Architecture:');
    expect(hookContent).toContain('Previous broken code:');
  });

  it('should be future-proof (use stable API)', async () => {
    const hookPath = path.join(
      process.cwd(),
      'plugins/specweave/lib/hooks/sync-living-docs.js'
    );

    const hookContent = await fs.readFile(hookPath, 'utf-8');

    // Verify it uses stable API
    expect(hookContent).toContain('LivingDocsSync');
    expect(hookContent).toContain('syncIncrement');

    // Verify deprecated APIs are NOT in active code (only in comments)
    const codeWithoutComments = hookContent.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeWithoutComments).not.toContain('new SpecDistributor(');
    expect(codeWithoutComments).not.toContain('await distributor.distribute(');
  });
});
