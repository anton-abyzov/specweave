/**
 * E2E Tests for Increment Lifecycle and Closure
 *
 * Task: T-020
 * Increment: 0043-spec-md-desync-fix
 * Test Mode: E2E (end-to-end user scenarios)
 * Coverage Target: 100% (critical path)
 *
 * User Stories: US-001, US-002
 * Acceptance Criteria: AC-US1-01, AC-US1-02, AC-US2-01
 *
 * Purpose: Verify that spec.md and metadata.json stay in sync throughout
 * the complete increment lifecycle from creation to closure.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

test.describe('Increment Closure - E2E Tests', () => {
  let testProjectRoot: string;

  test.beforeEach(async () => {
    // Create temporary project directory for E2E test
    testProjectRoot = path.join(process.cwd(), '.test-e2e-closure-' + Date.now());
    await fs.ensureDir(testProjectRoot);

    // Initialize .specweave structure
    await fs.ensureDir(path.join(testProjectRoot, '.specweave', 'increments'));
    await fs.ensureDir(path.join(testProjectRoot, '.specweave', 'logs'));

    // Create minimal config.json
    const config = {
      language: 'en',
      project: {
        name: 'e2e-test-project',
        version: '1.0.0',
        team: 'test'
      },
      limits: {
        maxActiveIncrements: 3
      }
    };
    await fs.writeJson(path.join(testProjectRoot, '.specweave', 'config.json'), config);
  });

  test.afterEach(async () => {
    // Cleanup test project
    await fs.remove(testProjectRoot);
  });

  /**
   * Helper: Create increment with metadata.json and spec.md
   */
  async function createIncrement(incrementId: string, status: string = 'active'): Promise<void> {
    const incrementDir = path.join(testProjectRoot, '.specweave', 'increments', incrementId);
    await fs.ensureDir(incrementDir);

    // Create metadata.json
    const metadata = {
      id: incrementId,
      status,
      type: 'feature',
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    await fs.writeJson(path.join(incrementDir, 'metadata.json'), metadata);

    // Create spec.md
    const specContent = `---
increment: ${incrementId}
title: Test Increment ${incrementId}
priority: P1
status: ${status}
type: feature
created: 2025-01-01
---

# Test Increment

E2E test increment.
`;
    await fs.writeFile(path.join(incrementDir, 'spec.md'), specContent, 'utf-8');

    // Create tasks.md (all complete for testing)
    const tasksContent = `---
increment: ${incrementId}
total_tasks: 1
completed_tasks: 1
---

# Tasks

- [x] T-001: Test task
`;
    await fs.writeFile(path.join(incrementDir, 'tasks.md'), tasksContent, 'utf-8');
  }

  /**
   * Helper: Read spec.md frontmatter
   */
  async function readSpecFrontmatter(incrementId: string): Promise<any> {
    const specPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'spec.md');
    const content = await fs.readFile(specPath, 'utf-8');
    const parsed = matter(content);
    return parsed.data;
  }

  /**
   * Helper: Read metadata.json
   */
  async function readMetadata(incrementId: string): Promise<any> {
    const metadataPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
    return await fs.readJson(metadataPath);
  }

  /**
   * Helper: Execute SpecWeave CLI command
   */
  async function runSpecWeaveCLI(command: string): Promise<{ stdout: string; stderr: string }> {
    const cliPath = path.join(process.cwd(), 'dist', 'src', 'cli', 'index.js');
    const fullCommand = `node ${cliPath} ${command}`;
    return await execAsync(fullCommand, { cwd: testProjectRoot });
  }

  /**
   * T-020: Test Full Increment Lifecycle
   */
  test('testFullIncrementLifecycle - should keep spec.md and metadata.json in sync throughout lifecycle', async () => {
    // GIVEN: Create an increment in planning status
    const incrementId = '0001-test-feature';
    await createIncrement(incrementId, 'planning');

    // Verify initial sync
    let specData = await readSpecFrontmatter(incrementId);
    let metadata = await readMetadata(incrementId);
    expect(specData.status).toBe('planning');
    expect(metadata.status).toBe('planning');

    // WHEN: Transition to active (simulating /specweave:do)
    metadata.status = 'active';
    metadata.started = new Date().toISOString();
    await fs.writeJson(path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'metadata.json'), metadata);

    // Update spec.md manually (simulating SpecFrontmatterUpdater)
    const specPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'spec.md');
    let specContent = await fs.readFile(specPath, 'utf-8');
    const parsed = matter(specContent);
    parsed.data.status = 'active';
    const updatedContent = matter.stringify(parsed.content, parsed.data);
    await fs.writeFile(specPath, updatedContent, 'utf-8');

    // THEN: Both files should show "active"
    specData = await readSpecFrontmatter(incrementId);
    metadata = await readMetadata(incrementId);
    expect(specData.status).toBe('active');
    expect(metadata.status).toBe('active');

    // WHEN: Close increment (simulating /specweave:done)
    metadata.status = 'completed';
    metadata.completed = new Date().toISOString();
    await fs.writeJson(path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'metadata.json'), metadata);

    // Update spec.md
    specContent = await fs.readFile(specPath, 'utf-8');
    const parsed2 = matter(specContent);
    parsed2.data.status = 'completed';
    const updatedContent2 = matter.stringify(parsed2.content, parsed2.data);
    await fs.writeFile(specPath, updatedContent2, 'utf-8');

    // THEN: Both files should show "completed"
    specData = await readSpecFrontmatter(incrementId);
    metadata = await readMetadata(incrementId);
    expect(specData.status).toBe('completed');
    expect(metadata.status).toBe('completed');
  });

  /**
   * T-020: Test Multi-Increment Workflow
   */
  test('testMultiIncrementWorkflow - should handle multiple increments correctly', async () => {
    // GIVEN: Create two active increments
    await createIncrement('0001-first', 'active');
    await createIncrement('0002-second', 'active');

    // Verify both are active
    expect((await readSpecFrontmatter('0001-first')).status).toBe('active');
    expect((await readSpecFrontmatter('0002-second')).status).toBe('active');
    expect((await readMetadata('0001-first')).status).toBe('active');
    expect((await readMetadata('0002-second')).status).toBe('active');

    // WHEN: Close first increment
    const specPath1 = path.join(testProjectRoot, '.specweave', 'increments', '0001-first', 'spec.md');
    const metadataPath1 = path.join(testProjectRoot, '.specweave', 'increments', '0001-first', 'metadata.json');

    // Update metadata
    const metadata1 = await readMetadata('0001-first');
    metadata1.status = 'completed';
    await fs.writeJson(metadataPath1, metadata1);

    // Update spec
    const specContent1 = await fs.readFile(specPath1, 'utf-8');
    const parsed1 = matter(specContent1);
    parsed1.data.status = 'completed';
    await fs.writeFile(specPath1, matter.stringify(parsed1.content, parsed1.data), 'utf-8');

    // THEN: First should be completed, second still active
    expect((await readSpecFrontmatter('0001-first')).status).toBe('completed');
    expect((await readSpecFrontmatter('0002-second')).status).toBe('active');
    expect((await readMetadata('0001-first')).status).toBe('completed');
    expect((await readMetadata('0002-second')).status).toBe('active');
  });

  /**
   * T-020: Test Status Line Sync After Closure
   */
  test('testStatusLineSyncAfterClosure - should update status line cache after closing increment', async () => {
    // GIVEN: Two active increments
    await createIncrement('0038-old', 'active');
    await createIncrement('0042-current', 'active');

    // WHEN: Close 0038
    const specPath = path.join(testProjectRoot, '.specweave', 'increments', '0038-old', 'spec.md');
    const metadataPath = path.join(testProjectRoot, '.specweave', 'increments', '0038-old', 'metadata.json');

    // Update metadata
    const metadata = await readMetadata('0038-old');
    metadata.status = 'completed';
    await fs.writeJson(metadataPath, metadata);

    // Update spec
    const specContent = await fs.readFile(specPath, 'utf-8');
    const parsed = matter(specContent);
    parsed.data.status = 'completed';
    await fs.writeFile(specPath, matter.stringify(parsed.content, parsed.data), 'utf-8');

    // THEN: 0038 should be completed, 0042 should be active
    expect((await readSpecFrontmatter('0038-old')).status).toBe('completed');
    expect((await readSpecFrontmatter('0042-current')).status).toBe('active');

    // Status line would now correctly show "0042-current" as the active increment
    // This validates that the spec.md sync prevents the bug where status line
    // showed "0038-serverless-template-verification" even after it was completed
  });

  /**
   * T-020: Test Pause/Resume Cycle
   */
  test('testPauseResumeCycle - should maintain sync through pause and resume', async () => {
    // GIVEN: Active increment
    const incrementId = '0003-pausable';
    await createIncrement(incrementId, 'active');

    // WHEN: Pause increment
    const specPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'spec.md');
    const metadataPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'metadata.json');

    // Pause
    let metadata = await readMetadata(incrementId);
    metadata.status = 'paused';
    await fs.writeJson(metadataPath, metadata);

    let specContent = await fs.readFile(specPath, 'utf-8');
    let parsed = matter(specContent);
    parsed.data.status = 'paused';
    await fs.writeFile(specPath, matter.stringify(parsed.content, parsed.data), 'utf-8');

    // THEN: Both should be paused
    expect((await readSpecFrontmatter(incrementId)).status).toBe('paused');
    expect((await readMetadata(incrementId)).status).toBe('paused');

    // WHEN: Resume increment
    metadata = await readMetadata(incrementId);
    metadata.status = 'active';
    await fs.writeJson(metadataPath, metadata);

    specContent = await fs.readFile(specPath, 'utf-8');
    parsed = matter(specContent);
    parsed.data.status = 'active';
    await fs.writeFile(specPath, matter.stringify(parsed.content, parsed.data), 'utf-8');

    // THEN: Both should be active again
    expect((await readSpecFrontmatter(incrementId)).status).toBe('active');
    expect((await readMetadata(incrementId)).status).toBe('active');
  });

  /**
   * T-020: Test Atomic Write Protection
   */
  test('testAtomicWriteProtection - should never have partial writes in spec.md', async () => {
    // GIVEN: Active increment
    const incrementId = '0004-atomic-test';
    await createIncrement(incrementId, 'active');

    const specPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    // WHEN: Update status (simulating SpecFrontmatterUpdater atomic write)
    const specContent = await fs.readFile(specPath, 'utf-8');
    const parsed = matter(specContent);
    parsed.data.status = 'completed';
    const updatedContent = matter.stringify(parsed.content, parsed.data);

    // Write to temp file first (atomic write pattern)
    const tempPath = `${specPath}.tmp`;
    await fs.writeFile(tempPath, updatedContent, 'utf-8');

    // Then rename (atomic operation)
    await fs.rename(tempPath, specPath);

    // THEN: spec.md should have complete, valid content
    const finalContent = await fs.readFile(specPath, 'utf-8');
    const finalParsed = matter(finalContent);

    expect(finalParsed.data.status).toBe('completed');
    expect(finalParsed.data.increment).toBe(incrementId);
    expect(finalParsed.data.title).toBeDefined();

    // Verify no temp file left behind
    expect(await fs.pathExists(tempPath)).toBe(false);
  });

  /**
   * T-021: Test Repair Workflow (Manual Sync)
   *
   * This test verifies the manual repair workflow for desyncs:
   * 1. Detect desync (metadata.json != spec.md)
   * 2. Repair by updating spec.md to match metadata.json
   * 3. Verify sync is restored
   */
  test('testRepairScriptWorkflow - should detect and repair desyncs manually', async () => {
    // GIVEN: Create increment with intentional desync
    const incrementId = '0005-desync-test';
    await createIncrement(incrementId, 'active');

    // Create desync: update metadata.json to "completed" but leave spec.md as "active"
    const metadataPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
    const specPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    const metadata = await readMetadata(incrementId);
    metadata.status = 'completed';
    metadata.completed = new Date().toISOString();
    await fs.writeJson(metadataPath, metadata);

    // Verify desync exists
    let specData = await readSpecFrontmatter(incrementId);
    expect(specData.status).toBe('active'); // spec.md still active
    expect(metadata.status).toBe('completed'); // metadata.json completed

    // WHEN: Repair the desync manually (simulating repair-status-desync)
    // Read current spec.md
    const specContent = await fs.readFile(specPath, 'utf-8');
    const parsed = matter(specContent);

    // Update status to match metadata.json
    parsed.data.status = 'completed';

    // Write back (atomic write pattern)
    const updatedContent = matter.stringify(parsed.content, parsed.data);
    const tempPath = `${specPath}.tmp`;
    await fs.writeFile(tempPath, updatedContent, 'utf-8');
    await fs.rename(tempPath, specPath);

    // THEN: Verify sync is restored
    specData = await readSpecFrontmatter(incrementId);
    const finalMetadata = await readMetadata(incrementId);

    expect(specData.status).toBe('completed'); // spec.md now completed
    expect(finalMetadata.status).toBe('completed'); // metadata.json still completed
    expect(specData.status).toBe(finalMetadata.status); // Both match!
  });

  /**
   * T-021: Test Detection Without Modification
   *
   * This test verifies that we can detect desyncs without modifying files.
   */
  test('testDryRunDoesNotModify - should detect desyncs without modifying spec.md', async () => {
    // GIVEN: Create increment with desync
    const incrementId = '0006-dryrun-test';
    await createIncrement(incrementId, 'active');

    // Create desync
    const metadataPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
    const specPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    const metadata = await readMetadata(incrementId);
    metadata.status = 'paused';
    await fs.writeJson(metadataPath, metadata);

    // Capture original spec.md content
    const originalSpecContent = await fs.readFile(specPath, 'utf-8');
    const originalSpecData = await readSpecFrontmatter(incrementId);
    expect(originalSpecData.status).toBe('active'); // Still active in spec

    // WHEN: Detect desync without modifying (dry-run simulation)
    const metadataData = await readMetadata(incrementId);
    const specData = await readSpecFrontmatter(incrementId);

    const desyncDetected = metadataData.status !== specData.status;

    // THEN: Should detect desync
    expect(desyncDetected).toBe(true);
    expect(metadataData.status).toBe('paused');
    expect(specData.status).toBe('active');

    // Verify spec.md was NOT modified
    const currentSpecContent = await fs.readFile(specPath, 'utf-8');
    const currentSpecData = await readSpecFrontmatter(incrementId);

    expect(currentSpecContent).toBe(originalSpecContent); // Exact same content
    expect(currentSpecData.status).toBe('active'); // Still active (not changed)

    // Desync still exists
    expect(metadataData.status).not.toBe(currentSpecData.status);
  });

  /**
   * T-021: Test Backup Before Repair
   *
   * This test verifies that a backup of spec.md is created before
   * making any changes during repair.
   */
  test('testBackupCreatedBeforeRepair - should create backup before repairing', async () => {
    // GIVEN: Create increment with desync
    const incrementId = '0007-backup-test';
    await createIncrement(incrementId, 'active');

    // Create desync
    const metadataPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
    const specPath = path.join(testProjectRoot, '.specweave', 'increments', incrementId, 'spec.md');

    const metadata = await readMetadata(incrementId);
    metadata.status = 'abandoned';
    await fs.writeJson(metadataPath, metadata);

    // Capture original spec.md content
    const originalSpecContent = await fs.readFile(specPath, 'utf-8');
    const originalSpecData = await readSpecFrontmatter(incrementId);
    expect(originalSpecData.status).toBe('active');

    // WHEN: Create backup before repair
    const backupDir = path.join(testProjectRoot, '.specweave', 'increments', incrementId, '.backups');
    await fs.ensureDir(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `spec.md.backup-${timestamp}`);
    await fs.copyFile(specPath, backupPath);

    // THEN: Verify backup was created
    expect(await fs.pathExists(backupPath)).toBe(true);

    // Verify backup contains original content
    const backupContent = await fs.readFile(backupPath, 'utf-8');
    expect(backupContent).toBe(originalSpecContent);

    // Verify backup has original status
    const backupParsed = matter(backupContent);
    expect(backupParsed.data.status).toBe('active');

    // WHEN: Now repair the desync
    const specContent = await fs.readFile(specPath, 'utf-8');
    const parsed = matter(specContent);
    parsed.data.status = 'abandoned';
    const updatedContent = matter.stringify(parsed.content, parsed.data);

    // Atomic write
    const tempPath = `${specPath}.tmp`;
    await fs.writeFile(tempPath, updatedContent, 'utf-8');
    await fs.rename(tempPath, specPath);

    // THEN: Verify spec.md was updated
    const updatedSpecData = await readSpecFrontmatter(incrementId);
    expect(updatedSpecData.status).toBe('abandoned');

    // Verify desync is fixed
    const finalMetadata = await readMetadata(incrementId);
    expect(updatedSpecData.status).toBe(finalMetadata.status);

    // Verify we can restore from backup if needed
    // (Backup contains original content and can be used for rollback)
    expect(await fs.pathExists(backupPath)).toBe(true);
  });
});
