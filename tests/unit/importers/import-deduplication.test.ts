/**
 * Unit tests for import deduplication (T-017)
 *
 * Tests that re-importing an item that already exists as an increment
 * updates the existing metadata rather than creating a new directory.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ImportToIncrementConverter } from '../../../src/importers/import-to-increment.js';
import { IncrementExternalRefDetector, formatExternalRef } from '../../../src/importers/increment-external-ref-detector.js';
import type { ExternalItem } from '../../../src/importers/external-importer.js';

describe('import deduplication', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'import-dedup-test-'));
    mkdirSync(join(tempDir, '.specweave', 'increments'), { recursive: true });
    writeFileSync(
      join(tempDir, '.specweave', 'config.json'),
      JSON.stringify({ version: '2.0', testing: { defaultTestMode: 'TDD', defaultCoverageTarget: 90 } }),
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('increment exists with matching external_ref → no new directory created, skipped', async () => {
    // Pre-create an increment with external_ref matching GitHub issue #42
    const existingDir = join(tempDir, '.specweave', 'increments', '0001G-existing-feature');
    mkdirSync(existingDir, { recursive: true });
    writeFileSync(
      join(existingDir, 'metadata.json'),
      JSON.stringify({
        id: '0001G-existing-feature',
        external_ref: 'github#owner/repo#42',
        externalLinks: {
          github: { issueNumber: 42 },
        },
      }),
    );

    // Count dirs before import
    const dirsBefore = readdirSync(join(tempDir, '.specweave', 'increments')).filter(
      (d) => !d.startsWith('_'),
    );

    const converter = new ImportToIncrementConverter({
      projectRoot: tempDir,
      projectId: 'test-project',
    });

    const item: ExternalItem = {
      id: 'github#owner/repo#42',
      type: 'feature',
      title: 'Existing feature',
      description: 'Already imported',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      url: 'https://github.com/owner/repo/issues/42',
      labels: [],
      platform: 'github',
      sourceRepo: 'owner/repo',
    };

    const result = await converter.createIncrements([item]);

    // Should be skipped, not created
    expect(result.created).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].existingIncrementId).toBe('0001G-existing-feature');

    // No new directories created
    const dirsAfter = readdirSync(join(tempDir, '.specweave', 'increments')).filter(
      (d) => !d.startsWith('_'),
    );
    expect(dirsAfter.length).toBe(dirsBefore.length);
  });

  it('detector finds refs across active and archive directories', () => {
    // Active increment
    const activeDir = join(tempDir, '.specweave', 'increments', '0001J-jira-feature');
    mkdirSync(activeDir, { recursive: true });
    writeFileSync(
      join(activeDir, 'metadata.json'),
      JSON.stringify({ id: '0001J-jira-feature', external_ref: 'jira#PROJ#PROJ-100' }),
    );

    // Archived increment
    const archiveDir = join(tempDir, '.specweave', 'increments', '_archive', '0002G-old-github');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(
      join(archiveDir, 'metadata.json'),
      JSON.stringify({ id: '0002G-old-github', external_ref: 'github#org/repo#99' }),
    );

    const detector = new IncrementExternalRefDetector(tempDir);

    // Both should be found
    const jiraMatch = detector.hasRef('jira#PROJ#PROJ-100');
    expect(jiraMatch).not.toBeNull();
    expect(jiraMatch!.incrementId).toBe('0001J-jira-feature');
    expect(jiraMatch!.location).toBe('active');

    const githubMatch = detector.hasRef('github#org/repo#99');
    expect(githubMatch).not.toBeNull();
    expect(githubMatch!.incrementId).toBe('0002G-old-github');
    expect(githubMatch!.location).toBe('_archive');

    // Unknown ref returns null
    expect(detector.hasRef('ado#org/proj#999')).toBeNull();
  });

  it('batch check deduplicates multiple refs efficiently', () => {
    // Create two increments
    const dir1 = join(tempDir, '.specweave', 'increments', '0001G-feat-a');
    mkdirSync(dir1, { recursive: true });
    writeFileSync(join(dir1, 'metadata.json'), JSON.stringify({ external_ref: 'github#o/r#1' }));

    const dir2 = join(tempDir, '.specweave', 'increments', '0002J-feat-b');
    mkdirSync(dir2, { recursive: true });
    writeFileSync(join(dir2, 'metadata.json'), JSON.stringify({ external_ref: 'jira#P#P-2' }));

    const detector = new IncrementExternalRefDetector(tempDir);
    const dupes = detector.checkRefs(['github#o/r#1', 'jira#P#P-2', 'ado#x/y#3']);

    expect(dupes.size).toBe(2);
    expect(dupes.has('github#o/r#1')).toBe(true);
    expect(dupes.has('jira#P#P-2')).toBe(true);
    expect(dupes.has('ado#x/y#3')).toBe(false);
  });

  it('formatExternalRef produces canonical format', () => {
    expect(formatExternalRef('github', 'owner/repo', 42)).toBe('github#owner/repo#42');
    expect(formatExternalRef('jira', 'PROJ', 'PROJ-456')).toBe('jira#PROJ#PROJ-456');
    expect(formatExternalRef('ado', 'org/project', 789)).toBe('ado#org/project#789');
  });
});
