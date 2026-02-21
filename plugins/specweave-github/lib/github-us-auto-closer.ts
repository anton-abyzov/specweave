/**
 * GitHub US Auto-Closer — Closes GitHub issues when all ACs are complete
 *
 * For each affected user story, checks if ALL acceptance criteria are
 * marked complete in spec.md. If so, posts a completion comment and
 * closes the associated GitHub issue.
 *
 * @module github-us-auto-closer
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

export interface AutoCloseOptions {
  owner: string;
  repo: string;
  token?: string;
}

export interface AutoCloseResult {
  closed: Array<{ usId: string; issueNumber: number }>;
  skipped: Array<{ usId: string; reason: string }>;
  errors: Array<{ usId: string; error: string }>;
}

interface ParsedACState {
  id: string;
  description: string;
  completed: boolean;
}

interface ParsedUSIssueLink {
  issueNumber: number;
  issueUrl: string;
}

/**
 * Auto-close GitHub issues for user stories with all ACs complete.
 *
 * For each affected US:
 * 1. Parse AC states from spec.md
 * 2. Skip if not all ACs complete
 * 3. Look up GitHub issue link from frontmatter
 * 4. Check if issue already closed (idempotent)
 * 5. Post completion comment
 * 6. Close issue via `gh issue close`
 *
 * Never throws — all errors captured in result.errors.
 */
export async function autoCloseCompletedUserStories(
  incrementId: string,
  affectedUSIds: string[],
  specPath: string,
  options: AutoCloseOptions,
): Promise<AutoCloseResult> {
  const result: AutoCloseResult = { closed: [], skipped: [], errors: [] };

  if (affectedUSIds.length === 0) {
    return result;
  }

  let content: string;
  try {
    content = await readFile(specPath, 'utf-8');
  } catch (err) {
    result.errors.push({
      usId: affectedUSIds[0],
      error: err instanceof Error ? err.message : String(err),
    });
    return result;
  }

  const issueLinks = await parseIssueLinks(specPath);
  const repoSlug = `${options.owner}/${options.repo}`;
  const env = options.token ? { GH_TOKEN: options.token } : undefined;
  const execOpts = env ? { env } : {};

  for (const usId of affectedUSIds) {
    const acStates = parseACStatesForUS(content, usId);

    // Skip if not all ACs complete
    if (acStates.length === 0 || acStates.some(ac => !ac.completed)) {
      result.skipped.push({ usId, reason: 'incomplete-acs' });
      continue;
    }

    // Skip if no issue link
    const link = issueLinks[usId];
    if (!link) {
      result.skipped.push({ usId, reason: 'no-issue-link' });
      continue;
    }

    const issueNum = String(link.issueNumber);

    // Check if already closed (idempotent)
    const viewResult = await execFileNoThrow(
      'gh',
      ['issue', 'view', issueNum, '--json', 'state', '-R', repoSlug],
      execOpts,
    );

    if (viewResult.success) {
      try {
        const issueState = JSON.parse(viewResult.stdout);
        if (issueState.state === 'CLOSED') {
          result.skipped.push({ usId, reason: 'already-closed' });
          continue;
        }
      } catch {
        // Parse error — proceed with close attempt
      }
    }

    // Post completion comment
    const commentBody = buildCompletionComment(incrementId, usId, acStates);
    await execFileNoThrow(
      'gh',
      ['issue', 'comment', issueNum, '--body', commentBody, '-R', repoSlug],
      execOpts,
    );

    // Close the issue
    const closeResult = await execFileNoThrow(
      'gh',
      ['issue', 'close', issueNum, '-R', repoSlug],
      execOpts,
    );

    if (closeResult.success) {
      result.closed.push({ usId, issueNumber: link.issueNumber });
    } else {
      result.errors.push({
        usId,
        error: closeResult.stderr || 'Unknown error closing issue',
      });
    }
  }

  return result;
}

/**
 * Build a completion comment for a fully-complete user story.
 */
function buildCompletionComment(
  incrementId: string,
  usId: string,
  acStates: ParsedACState[],
): string {
  const total = acStates.length;

  let comment = `**All acceptance criteria completed** — ${usId} (Increment ${incrementId})\n\n`;
  comment += `**Status**: ${total}/${total} ACs complete (100%)\n\n`;

  comment += `**Completed**:\n`;
  for (const ac of acStates) {
    comment += `- [x] **${ac.id}**: ${ac.description}\n`;
  }
  comment += '\n';

  comment += `---\n`;
  comment += `Auto-closed by SpecWeave | ${new Date().toISOString().split('T')[0]}\n`;

  return comment;
}

/**
 * Parse issue links from metadata.json (sibling of spec.md).
 *
 * Supports TWO formats:
 * - OLD: metadata.github.issues[] with { userStory, number, url }
 * - NEW: metadata.externalLinks.github.issues with { [US-XXX]: { issueNumber, issueUrl } }
 *
 * Falls back to empty if metadata.json is missing or invalid.
 */
async function parseIssueLinks(specPath: string): Promise<Record<string, ParsedUSIssueLink>> {
  const links: Record<string, ParsedUSIssueLink> = {};

  try {
    const metadataPath = path.join(path.dirname(specPath), 'metadata.json');
    if (!existsSync(metadataPath)) return links;

    const raw = await readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(raw);

    // OLD format: metadata.github.issues[] array
    if (metadata.github?.issues && Array.isArray(metadata.github.issues)) {
      for (const entry of metadata.github.issues) {
        if (entry.userStory && entry.number) {
          links[entry.userStory] = {
            issueNumber: entry.number,
            issueUrl: entry.url || '',
          };
        }
      }
    }

    // NEW format: metadata.externalLinks.github.issues object
    if (metadata.externalLinks?.github?.issues) {
      const issues = metadata.externalLinks.github.issues;
      for (const [usId, data] of Object.entries(issues)) {
        const issueData = data as { issueNumber?: number; issueUrl?: string };
        if (issueData.issueNumber) {
          links[usId] = {
            issueNumber: issueData.issueNumber,
            issueUrl: issueData.issueUrl || '',
          };
        }
      }
    }
  } catch {
    // Graceful fallback: return empty if metadata.json is missing or invalid
  }

  return links;
}

/**
 * Extract AC states for a specific user story from spec.md content.
 */
function parseACStatesForUS(content: string, usId: string): ParsedACState[] {
  const states: ParsedACState[] = [];
  // AC IDs use unpadded US number: US-001 → AC-US1-XX
  const usNum = String(parseInt(usId.replace('US-', ''), 10));

  const acPattern = new RegExp(
    `- \\[([ x])\\] \\*\\*AC-US${usNum}-(\\d+)\\*\\*:\\s*(.+)`,
    'g',
  );

  let match;
  while ((match = acPattern.exec(content)) !== null) {
    states.push({
      id: `AC-US${usNum}-${match[2]}`,
      description: match[3].trim(),
      completed: match[1] === 'x',
    });
  }

  return states;
}
