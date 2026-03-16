/**
 * Unit tests for ImportCoordinator increment wiring (T-015)
 *
 * Tests that imported items can be converted to proper SpecWeave increments
 * via ImportToIncrementConverter integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ImportToIncrementConverter } from '../../../src/importers/import-to-increment.js';
import type { ExternalItem } from '../../../src/importers/external-importer.js';

describe('ImportToIncrementConverter integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'import-inc-test-'));
    // Setup minimal SpecWeave project structure
    mkdirSync(join(tempDir, '.specweave', 'increments'), { recursive: true });
    writeFileSync(
      join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', testing: { defaultTestMode: 'TDD', defaultCoverageTarget: 90 } }),
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('imports a JIRA issue → increment directory with metadata.json, spec.md, tasks.md', async () => {
    const converter = new ImportToIncrementConverter({
      projectRoot: tempDir,
      projectId: 'test-project',
    });

    const jiraItem: ExternalItem = {
      id: 'PROJ-123',
      type: 'user-story',
      title: 'User can log in',
      description: 'As a user I want to log in so I can access my account',
      status: 'open',
      priority: 'P1',
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-01-20'),
      url: 'https://jira.example.com/browse/PROJ-123',
      labels: ['auth', 'login'],
      platform: 'jira',
      jiraProjectKey: 'PROJ',
    };

    const result = await converter.createIncrement(jiraItem);

    // Verify increment was created
    expect(result.incrementId).toMatch(/^\d{4}J-user-can-log-in$/);
    expect(result.platform).toBe('jira');
    expect(result.externalRef).toBe('jira#PROJ#PROJ-123');
    expect(existsSync(result.incrementPath)).toBe(true);

    // Verify metadata.json exists with externalLinks
    const metadataPath = join(result.incrementPath, 'metadata.json');
    expect(existsSync(metadataPath)).toBe(true);
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
    expect(metadata.external_ref).toBe('jira#PROJ#PROJ-123');

    // Verify spec.md exists
    const specPath = join(result.incrementPath, 'spec.md');
    expect(existsSync(specPath)).toBe(true);

    // Verify tasks.md exists
    const tasksPath = join(result.incrementPath, 'tasks.md');
    expect(existsSync(tasksPath)).toBe(true);
  });

  it('imports a GitHub issue → increment with G suffix', async () => {
    const converter = new ImportToIncrementConverter({
      projectRoot: tempDir,
      projectId: 'test-project',
    });

    const githubItem: ExternalItem = {
      id: 'github#owner/repo#42',
      type: 'bug',
      title: 'Fix broken login',
      description: 'Login page crashes on mobile',
      status: 'open',
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-05'),
      url: 'https://github.com/owner/repo/issues/42',
      labels: ['bug'],
      platform: 'github',
      sourceRepo: 'owner/repo',
    };

    const result = await converter.createIncrement(githubItem);

    expect(result.incrementId).toMatch(/^\d{4}G-fix-broken-login$/);
    expect(result.platform).toBe('github');
    expect(existsSync(join(result.incrementPath, 'metadata.json'))).toBe(true);
    expect(existsSync(join(result.incrementPath, 'spec.md'))).toBe(true);
    expect(existsSync(join(result.incrementPath, 'tasks.md'))).toBe(true);
  });

  it('batch import deduplicates existing items', async () => {
    const converter = new ImportToIncrementConverter({
      projectRoot: tempDir,
      projectId: 'test-project',
    });

    const item: ExternalItem = {
      id: 'PROJ-456',
      type: 'feature',
      title: 'Add search feature',
      description: 'Full-text search for docs',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      url: 'https://jira.example.com/browse/PROJ-456',
      labels: [],
      platform: 'jira',
      jiraProjectKey: 'PROJ',
    };

    // First import succeeds
    const result1 = await converter.createIncrements([item]);
    expect(result1.created).toHaveLength(1);
    expect(result1.skipped).toHaveLength(0);

    // Second import with same item should skip
    const converter2 = new ImportToIncrementConverter({
      projectRoot: tempDir,
      projectId: 'test-project',
    });
    const result2 = await converter2.createIncrements([item]);
    expect(result2.created).toHaveLength(0);
    expect(result2.skipped).toHaveLength(1);
    expect(result2.skipped[0].reason).toContain('Already imported');
  });
});
