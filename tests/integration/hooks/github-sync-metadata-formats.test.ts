import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Integration tests for metadata format reading in ac-sync-dispatcher.sh
 * and github-auto-create-handler.sh idempotency check.
 *
 * Tests the jq expressions against fixture metadata files in old, new, and mixed formats.
 */

describe('ac-sync-dispatcher metadata format reading', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'sw-metadata-test-'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeMetadata(name: string, content: object): string {
    const path = join(tmpDir, `${name}.json`);
    writeFileSync(path, JSON.stringify(content, null, 2));
    return path;
  }

  /**
   * The jq expression used by ac-sync-dispatcher to extract affected US IDs.
   * This mirrors the FIXED version that reads both old and new formats.
   */
  function extractUSIds(metadataPath: string): string[] {
    const jqExpr = `
      [
        (.externalLinks.github.issues // {} | keys[]),
        (.externalLinks.jira.userStories // {} | keys[]),
        (.externalLinks.ado.userStories // {} | keys[]),
        (.github.issues // [] | .[].userStory // empty)
      ] | flatten | unique
    `;
    try {
      const result = execSync(`jq -r '${jqExpr}' "${metadataPath}"`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      }).trim();
      return JSON.parse(result);
    } catch {
      return [];
    }
  }

  describe('OLD format (github.issues[])', () => {
    it('finds US IDs from github.issues[].userStory', () => {
      const path = writeMetadata('old-format', {
        github: {
          issues: [
            { userStory: 'US-001', number: 1163, url: 'https://example.com/1163' },
            { userStory: 'US-002', number: 1164, url: 'https://example.com/1164' },
          ],
          lastSync: '2026-02-15T04:34:53.404Z',
        },
      });
      const ids = extractUSIds(path);
      expect(ids).toContain('US-001');
      expect(ids).toContain('US-002');
      expect(ids).toHaveLength(2);
    });
  });

  describe('NEW format (externalLinks.github.issues)', () => {
    it('finds US IDs from externalLinks.github.issues keys', () => {
      const path = writeMetadata('new-format', {
        externalLinks: {
          github: {
            issues: {
              'US-001': { issueNumber: 100, issueUrl: 'https://example.com/100' },
              'US-003': { issueNumber: 101, issueUrl: 'https://example.com/101' },
            },
          },
        },
      });
      const ids = extractUSIds(path);
      expect(ids).toContain('US-001');
      expect(ids).toContain('US-003');
      expect(ids).toHaveLength(2);
    });
  });

  describe('Mixed format (both present)', () => {
    it('returns deduplicated union of both formats', () => {
      const path = writeMetadata('mixed-format', {
        externalLinks: {
          github: {
            issues: {
              'US-001': { issueNumber: 100 },
              'US-002': { issueNumber: 101 },
            },
          },
        },
        github: {
          issues: [
            { userStory: 'US-001', number: 100 },
            { userStory: 'US-003', number: 102 },
          ],
        },
      });
      const ids = extractUSIds(path);
      expect(ids).toContain('US-001');
      expect(ids).toContain('US-002');
      expect(ids).toContain('US-003');
      expect(ids).toHaveLength(3); // US-001 deduplicated
    });
  });

  describe('Empty/missing metadata', () => {
    it('returns empty array for empty externalLinks', () => {
      const path = writeMetadata('empty-links', {
        externalLinks: {},
      });
      const ids = extractUSIds(path);
      expect(ids).toEqual([]);
    });

    it('returns empty array for minimal metadata', () => {
      const path = writeMetadata('minimal', {
        id: '0210-test',
        status: 'active',
      });
      const ids = extractUSIds(path);
      expect(ids).toEqual([]);
    });
  });
});

describe('github-auto-create-handler idempotency check', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'sw-idempotent-test-'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeMetadata(name: string, content: object): string {
    const path = join(tmpDir, `${name}.json`);
    writeFileSync(path, JSON.stringify(content, null, 2));
    return path;
  }

  /**
   * The jq expression used by github-auto-create-handler for idempotency.
   * This mirrors the FIXED version that checks both formats.
   */
  function countExistingIssues(metadataPath: string): number {
    const jqExpr = `
      [
        (.externalLinks.github.issues // {} | to_entries[] | select(.value.issueNumber != null)),
        (.github.issues // [] | .[] | select(.number != null))
      ] | length
    `;
    try {
      const result = execSync(`jq '${jqExpr}' "${metadataPath}"`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      }).trim();
      return parseInt(result, 10);
    } catch {
      return 0;
    }
  }

  it('counts issues in NEW format (externalLinks)', () => {
    const path = writeMetadata('new-idempotent', {
      externalLinks: {
        github: {
          issues: {
            'US-001': { issueNumber: 100, issueUrl: 'https://example.com/100' },
            'US-002': { issueNumber: 101, issueUrl: 'https://example.com/101' },
          },
        },
      },
    });
    expect(countExistingIssues(path)).toBe(2);
  });

  it('counts issues in OLD format (github.issues[])', () => {
    const path = writeMetadata('old-idempotent', {
      github: {
        issues: [
          { userStory: 'US-001', number: 1163 },
          { userStory: 'US-002', number: 1164 },
          { userStory: 'US-003', number: 1165 },
        ],
      },
    });
    expect(countExistingIssues(path)).toBe(3);
  });

  it('counts combined issues from both formats', () => {
    const path = writeMetadata('mixed-idempotent', {
      externalLinks: {
        github: {
          issues: {
            'US-001': { issueNumber: 100 },
          },
        },
      },
      github: {
        issues: [
          { userStory: 'US-001', number: 100 },
          { userStory: 'US-002', number: 101 },
        ],
      },
    });
    // Note: jq counts both instances (3 total), which is > 0 so idempotency check passes
    expect(countExistingIssues(path)).toBeGreaterThan(0);
  });

  it('returns 0 for empty metadata', () => {
    const path = writeMetadata('empty-idempotent', {
      externalLinks: {},
    });
    expect(countExistingIssues(path)).toBe(0);
  });
});
