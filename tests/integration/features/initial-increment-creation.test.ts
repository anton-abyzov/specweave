/**
 * Integration test for initial increment creation during `specweave init`
 *
 * Verifies that:
 * 1. Initial increment 0001-project-setup is created automatically
 * 2. All required files are present (spec.md, plan.md, tasks.md, metadata.json)
 * 3. Increment is in ACTIVE status
 * 4. spec.md contains proper YAML frontmatter and content
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { generateInitialIncrement } from '../../../src/cli/helpers/init/initial-increment-generator.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { IncrementStatus } from '../../../src/core/types/increment-metadata.js';

describe('Initial Increment Creation', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `specweave-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Create .specweave/increments directory
    await fs.ensureDir(path.join(testDir, '.specweave', 'increments'));

    // Change to test directory for MetadataManager
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up test directory
    if (testDir && fs.existsSync(testDir)) {
      await fs.remove(testDir);
    }
  });

  it('creates initial increment 0001-project-setup', async () => {
    const incrementId = await generateInitialIncrement({
      projectPath: testDir,
      projectName: 'test-project'
    });

    expect(incrementId).toBe('0001-project-setup');

    const incrementPath = path.join(testDir, '.specweave', 'increments', incrementId);
    expect(fs.existsSync(incrementPath)).toBe(true);
  });

  it('creates all required files (spec.md, plan.md, tasks.md, metadata.json)', async () => {
    await generateInitialIncrement({
      projectPath: testDir,
      projectName: 'test-project'
    });

    const incrementPath = path.join(testDir, '.specweave', 'increments', '0001-project-setup');

    const specFile = path.join(incrementPath, 'spec.md');
    const planFile = path.join(incrementPath, 'plan.md');
    const tasksFile = path.join(incrementPath, 'tasks.md');
    const metadataFile = path.join(incrementPath, 'metadata.json');

    expect(fs.existsSync(specFile)).toBe(true);
    expect(fs.existsSync(planFile)).toBe(true);
    expect(fs.existsSync(tasksFile)).toBe(true);
    expect(fs.existsSync(metadataFile)).toBe(true);
  });

  it('creates increment with ACTIVE status', async () => {
    await generateInitialIncrement({
      projectPath: testDir,
      projectName: 'test-project'
    });

    const metadata = MetadataManager.read('0001-project-setup');
    expect(metadata.status).toBe(IncrementStatus.ACTIVE);
  });

  it('spec.md contains proper YAML frontmatter', async () => {
    await generateInitialIncrement({
      projectPath: testDir,
      projectName: 'test-project'
    });

    const specPath = path.join(testDir, '.specweave', 'increments', '0001-project-setup', 'spec.md');
    const specContent = fs.readFileSync(specPath, 'utf-8');

    // Check for YAML frontmatter
    expect(specContent).toMatch(/^---\n/);
    expect(specContent).toContain('increment: 0001-project-setup');
    expect(specContent).toContain('title: "Project Setup"');
    expect(specContent).toContain('type: feature');
    expect(specContent).toContain('priority: P0');
    expect(specContent).toContain('status: active');
  });

  it('spec.md contains project name in content', async () => {
    await generateInitialIncrement({
      projectPath: testDir,
      projectName: 'my-awesome-app'
    });

    const specPath = path.join(testDir, '.specweave', 'increments', '0001-project-setup', 'spec.md');
    const specContent = fs.readFileSync(specPath, 'utf-8');

    expect(specContent).toContain('Initialize my-awesome-app with SpecWeave framework');
  });

  it('tasks.md includes US-Task linkage fields', async () => {
    await generateInitialIncrement({
      projectPath: testDir,
      projectName: 'test-project'
    });

    const tasksPath = path.join(testDir, '.specweave', 'increments', '0001-project-setup', 'tasks.md');
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');

    // Check for new US-Task linkage format
    expect(tasksContent).toContain('**User Story**: US-001');
    expect(tasksContent).toContain('**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03');
    expect(tasksContent).toContain('## User Story: US-001 - Development Environment');
  });

  it('metadata.json has correct structure', async () => {
    await generateInitialIncrement({
      projectPath: testDir,
      projectName: 'test-project'
    });

    const metadataPath = path.join(testDir, '.specweave', 'increments', '0001-project-setup', 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    expect(metadata.id).toBe('0001-project-setup');
    expect(metadata.status).toBe('active');
    expect(metadata.type).toBe('feature');
    expect(metadata.testMode).toBe('test-after');
    expect(metadata.coverageTarget).toBe(80);
    expect(metadata.created).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(metadata.lastActivity).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('plan.md includes getting started instructions', async () => {
    await generateInitialIncrement({
      projectPath: testDir,
      projectName: 'test-project'
    });

    const planPath = path.join(testDir, '.specweave', 'increments', '0001-project-setup', 'plan.md');
    const planContent = fs.readFileSync(planPath, 'utf-8');

    expect(planContent).toContain('Implementation Plan: Project Setup');
    expect(planContent).toContain('/specweave:increment');
    expect(planContent).toContain('Next actions:');
  });

  it('supports optional tech stack parameter', async () => {
    await generateInitialIncrement({
      projectPath: testDir,
      projectName: 'test-project',
      techStack: 'Node.js + TypeScript + React'
    });

    const specPath = path.join(testDir, '.specweave', 'increments', '0001-project-setup', 'spec.md');
    const specContent = fs.readFileSync(specPath, 'utf-8');

    expect(specContent).toContain('**Tech Stack**: Node.js + TypeScript + React');
  });
});
