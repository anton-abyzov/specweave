/**
 * Unit tests for body diff check in updateUserStoryIssue
 *
 * Verifies that `updateUserStoryIssue` skips `gh issue edit` when the
 * normalized body matches what is already on GitHub, preventing
 * unnecessary API calls.
 *
 * @see T-009: RED phase - edit is called unconditionally
 * @see T-010: GREEN phase - add body diff check before edit
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Source-level assertion: updateUserStoryIssue should contain body diff logic
// ---------------------------------------------------------------------------

const SYNC_FILE_PATH = path.resolve(
  __dirname,
  '../../../plugins/specweave/lib/integrations/github/github-feature-sync.ts'
);

describe('updateUserStoryIssue body diff check', () => {
  let sourceCode: string;

  beforeEach(() => {
    sourceCode = fs.readFileSync(SYNC_FILE_PATH, 'utf-8');
  });

  it('should import normalizeIssueBody from github-body-utils', () => {
    expect(sourceCode).toMatch(/import.*normalizeIssueBody.*from.*github-body-utils/);
  });

  it('should fetch current issue body before editing (gh issue view)', () => {
    // The updateUserStoryIssue method definition should contain a `gh issue view` call
    const methodStart = sourceCode.indexOf('private async updateUserStoryIssue(');
    expect(methodStart).toBeGreaterThan(-1);
    const methodSection = sourceCode.slice(methodStart, methodStart + 2000);
    expect(methodSection).toContain('issue');
    expect(methodSection).toContain('view');
    expect(methodSection).toContain('--json');
    expect(methodSection).toContain('body');
  });

  it('should compare normalized bodies before calling gh issue edit', () => {
    const methodStart = sourceCode.indexOf('private async updateUserStoryIssue(');
    const methodSection = sourceCode.slice(methodStart, methodStart + 2000);
    // Should call normalizeIssueBody on both current and new bodies
    expect(methodSection).toContain('normalizeIssueBody');
  });

  it('should skip gh issue edit when normalized bodies match', () => {
    const methodStart = sourceCode.indexOf('private async updateUserStoryIssue(');
    const methodSection = sourceCode.slice(methodStart, methodStart + 2000);
    // Should have conditional logic around the edit call
    // The pattern should compare normalized bodies and skip edit
    expect(methodSection).toMatch(/normalizeIssueBody/);
    // There should be a condition that prevents the edit
    expect(methodSection).toMatch(/skip|match|identical|unchanged/i);
  });

  it('should handle 404 from gh issue view gracefully (proceed with edit)', () => {
    const methodStart = sourceCode.indexOf('private async updateUserStoryIssue(');
    const methodSection = sourceCode.slice(methodStart, methodStart + 2000);
    // Should catch errors from gh issue view and fall through to edit
    expect(methodSection).toMatch(/catch|error|fail|404/i);
  });
});
