/**
 * Unit tests for Import-to-Increment Converter
 *
 * Tests ExternalItem → SpecWeave increment conversion with
 * platform suffixes (G/J/A) and duplicate prevention.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, rmSync } from 'fs';
import { ImportToIncrementConverter } from '../../../src/importers/import-to-increment.js';
import { IncrementExternalRefDetector, formatExternalRef } from '../../../src/importers/increment-external-ref-detector.js';
import type { ExternalItem } from '../../../src/importers/external-importer.js';

function createGitHubItem(overrides: Partial<ExternalItem> = {}): ExternalItem {
  return {
    id: 'github#owner/repo#123',
    type: 'bug',
    title: 'Fix login redirect loop',
    description: 'The login page redirects infinitely when session expires.',
    status: 'open',
    priority: 'P1',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-02-20'),
    url: 'https://github.com/owner/repo/issues/123',
    labels: ['bug', 'auth'],
    acceptanceCriteria: ['Login redirects correctly after session expiry', 'Error page shown for invalid sessions'],
    platform: 'github',
    sourceRepo: 'owner/repo',
    ...overrides,
  };
}

function createJiraItem(overrides: Partial<ExternalItem> = {}): ExternalItem {
  return {
    id: 'PROJ-456',
    type: 'feature',
    title: 'Add payment flow',
    description: 'Implement Stripe checkout integration.',
    status: 'open',
    priority: 'P2',
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-02-18'),
    url: 'https://company.atlassian.net/browse/PROJ-456',
    labels: ['feature', 'payments'],
    platform: 'jira',
    jiraProjectKey: 'PROJ',
    ...overrides,
  };
}

function createADOItem(overrides: Partial<ExternalItem> = {}): ExternalItem {
  return {
    id: '789',
    type: 'task',
    title: 'Setup CI Pipeline',
    description: 'Configure GitHub Actions for automated testing.',
    status: 'open',
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-02-19'),
    url: 'https://dev.azure.com/org/project/_workitems/edit/789',
    labels: ['devops'],
    platform: 'ado',
    adoProjectName: 'project',
    ...overrides,
  };
}

describe('ImportToIncrementConverter', () => {
  let testProjectRoot: string;
  let incrementsDir: string;
  let converter: ImportToIncrementConverter;

  beforeEach(() => {
    testProjectRoot = mkdtempSync(path.join(tmpdir(), 'import-to-increment-test-'));
    incrementsDir = path.join(testProjectRoot, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
    converter = new ImportToIncrementConverter({
      projectRoot: testProjectRoot,
      projectId: 'test-project',
    });
  });

  afterEach(() => {
    if (fs.existsSync(testProjectRoot)) {
      rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  describe('createIncrement() — GitHub', () => {
    it('should create increment with G suffix from GitHub issue', async () => {
      const item = createGitHubItem();
      const result = await converter.createIncrement(item);

      expect(result.incrementId).toMatch(/^\d{4}G-fix-login-redirect-loop$/);
      expect(result.platform).toBe('github');
      expect(result.externalRef).toBe('github#owner/repo#123');
      expect(result.createdFiles).toContain('metadata.json');
      expect(result.createdFiles).toContain('spec.md');
      expect(result.createdFiles).toContain('tasks.md');

      // Verify metadata.json
      const metadataPath = path.join(result.incrementPath, 'metadata.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      expect(metadata.origin).toBe('external');
      expect(metadata.source_platform).toBe('github');
      expect(metadata.external_ref).toBe('github#owner/repo#123');
    });
  });

  describe('createIncrement() — JIRA', () => {
    it('should create increment with J suffix from JIRA issue', async () => {
      const item = createJiraItem();
      const result = await converter.createIncrement(item);

      expect(result.incrementId).toMatch(/^\d{4}J-add-payment-flow$/);
      expect(result.platform).toBe('jira');
      expect(result.externalRef).toBe('jira#PROJ#PROJ-456');
    });
  });

  describe('createIncrement() — ADO', () => {
    it('should create increment with A suffix from ADO work item', async () => {
      const item = createADOItem();
      const result = await converter.createIncrement(item);

      expect(result.incrementId).toMatch(/^\d{4}A-setup-ci-pipeline$/);
      expect(result.platform).toBe('ado');
      expect(result.externalRef).toBe('ado#project#789');
    });
  });

  describe('Duplicate prevention', () => {
    it('should detect duplicate by external_ref', async () => {
      const item = createGitHubItem();

      // First import succeeds
      await converter.createIncrement(item);

      // Second import should throw
      await expect(converter.createIncrement(item)).rejects.toThrow('Duplicate import');
    });

    it('should return existing increment ID for checkDuplicate()', async () => {
      const item = createGitHubItem();
      const result = await converter.createIncrement(item);

      const existingId = converter.checkDuplicate(item);
      expect(existingId).toBe(result.incrementId);
    });

    it('should return null for non-duplicate checkDuplicate()', () => {
      const item = createGitHubItem();
      const existingId = converter.checkDuplicate(item);
      expect(existingId).toBeNull();
    });

    it('should detect duplicates in archive directory', async () => {
      const item = createGitHubItem();

      // Create increment and move to archive
      const result = await converter.createIncrement(item);
      const archiveDir = path.join(incrementsDir, '_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      const archivePath = path.join(archiveDir, path.basename(result.incrementPath));
      fs.renameSync(result.incrementPath, archivePath);

      // Should still detect as duplicate
      const existingId = converter.checkDuplicate(item);
      expect(existingId).toBe(result.incrementId);
    });
  });

  describe('Batch import (createIncrements)', () => {
    it('should create multiple increments', async () => {
      const items = [createGitHubItem(), createJiraItem(), createADOItem()];
      const result = await converter.createIncrements(items);

      expect(result.created.length).toBe(3);
      expect(result.skipped.length).toBe(0);
      expect(result.errors.length).toBe(0);

      // Verify different suffixes
      const suffixes = result.created.map(c => c.incrementId.match(/\d{4}([GJA])/)?.[1]);
      expect(suffixes).toContain('G');
      expect(suffixes).toContain('J');
      expect(suffixes).toContain('A');
    });

    it('should skip duplicates in batch', async () => {
      const item = createGitHubItem();
      // Pre-import one
      await converter.createIncrement(item);

      // Batch with the same + a new one
      const items = [item, createJiraItem()];
      const result = await converter.createIncrements(items);

      expect(result.created.length).toBe(1);
      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0].externalRef).toBe('github#owner/repo#123');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty description', async () => {
      const item = createGitHubItem({ description: '' });
      const result = await converter.createIncrement(item);

      const specPath = path.join(result.incrementPath, 'spec.md');
      const spec = fs.readFileSync(specPath, 'utf-8');
      expect(spec).toContain('Fix login redirect loop');
    });

    it('should handle missing acceptance criteria', async () => {
      const item = createGitHubItem({ acceptanceCriteria: undefined });
      const result = await converter.createIncrement(item);

      const tasksPath = path.join(result.incrementPath, 'tasks.md');
      const tasks = fs.readFileSync(tasksPath, 'utf-8');
      // Should have template tasks, not derived from ACs
      expect(tasks).toContain('TEMPLATE FILE');
    });

    it('should handle long titles by truncating slug', async () => {
      const longTitle = 'This is a very long title that should be truncated to keep folder names reasonable and manageable in the filesystem';
      const item = createGitHubItem({ title: longTitle });
      const result = await converter.createIncrement(item);

      // Slug should be max 50 chars
      const slug = result.incrementId.replace(/^\d{4}[GJAE]-/, '');
      expect(slug.length).toBeLessThanOrEqual(50);
    });
  });
});

describe('IncrementExternalRefDetector', () => {
  let testProjectRoot: string;
  let incrementsDir: string;

  beforeEach(() => {
    testProjectRoot = mkdtempSync(path.join(tmpdir(), 'ref-detector-test-'));
    incrementsDir = path.join(testProjectRoot, '.specweave', 'increments');
    fs.mkdirSync(incrementsDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testProjectRoot)) {
      rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  function createMetadata(dir: string, name: string, externalRef?: string): void {
    const incrementDir = path.join(dir, name);
    fs.mkdirSync(incrementDir, { recursive: true });
    const metadata: Record<string, unknown> = { id: name, status: 'active' };
    if (externalRef) {
      metadata.external_ref = externalRef;
    }
    fs.writeFileSync(path.join(incrementDir, 'metadata.json'), JSON.stringify(metadata));
  }

  it('should find existing external ref', () => {
    createMetadata(incrementsDir, '0001G-feature', 'github#owner/repo#123');
    const detector = new IncrementExternalRefDetector(testProjectRoot);
    const match = detector.hasRef('github#owner/repo#123');
    expect(match).not.toBeNull();
    expect(match!.incrementId).toBe('0001G-feature');
  });

  it('should return null for non-existent ref', () => {
    const detector = new IncrementExternalRefDetector(testProjectRoot);
    const match = detector.hasRef('github#owner/repo#999');
    expect(match).toBeNull();
  });

  it('should scan archive directory', () => {
    const archiveDir = path.join(incrementsDir, '_archive');
    createMetadata(archiveDir, '0001G-old-import', 'github#owner/repo#100');
    const detector = new IncrementExternalRefDetector(testProjectRoot);
    const match = detector.hasRef('github#owner/repo#100');
    expect(match).not.toBeNull();
    expect(match!.location).toBe('_archive');
  });

  it('should scan abandoned directory', () => {
    const abandonedDir = path.join(incrementsDir, '_abandoned');
    createMetadata(abandonedDir, '0002J-dropped', 'jira#PROJ#PROJ-555');
    const detector = new IncrementExternalRefDetector(testProjectRoot);
    const match = detector.hasRef('jira#PROJ#PROJ-555');
    expect(match).not.toBeNull();
    expect(match!.location).toBe('_abandoned');
  });

  it('should handle corrupted metadata.json gracefully', () => {
    const dir = path.join(incrementsDir, '0001-bad');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'metadata.json'), 'not valid json');
    const detector = new IncrementExternalRefDetector(testProjectRoot);
    // Should not throw
    const map = detector.buildRefMap();
    expect(map.size).toBe(0);
  });

  it('should batch check multiple refs', () => {
    createMetadata(incrementsDir, '0001G-feature-a', 'github#owner/repo#1');
    createMetadata(incrementsDir, '0002J-feature-b', 'jira#PROJ#PROJ-2');
    const detector = new IncrementExternalRefDetector(testProjectRoot);
    const duplicates = detector.checkRefs([
      'github#owner/repo#1',
      'jira#PROJ#PROJ-2',
      'ado#org/project#3',
    ]);
    expect(duplicates.size).toBe(2);
    expect(duplicates.has('github#owner/repo#1')).toBe(true);
    expect(duplicates.has('ado#org/project#3')).toBe(false);
  });
});

describe('formatExternalRef()', () => {
  it('should format GitHub ref', () => {
    expect(formatExternalRef('github', 'owner/repo', 123)).toBe('github#owner/repo#123');
  });

  it('should format JIRA ref', () => {
    expect(formatExternalRef('jira', 'PROJ', 'PROJ-456')).toBe('jira#PROJ#PROJ-456');
  });

  it('should format ADO ref', () => {
    expect(formatExternalRef('ado', 'org/project', 789)).toBe('ado#org/project#789');
  });
});
