/**
 * GitHub AC Comment Poster — Posts progress comments to GitHub issues
 * when acceptance criteria are completed in spec.md.
 *
 * Triggered by github-ac-sync-handler.sh after task-ac-sync-guard
 * updates spec.md ACs.
 *
 * @module github-ac-comment-poster
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

export interface CommentPostOptions {
  owner: string;
  repo: string;
  token?: string;
}

export interface CommentPostResult {
  posted: Array<{ usId: string; issueNumber: number }>;
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
 * Post AC progress comments to GitHub issues for affected user stories.
 *
 * For each affected US:
 * 1. Look up GitHub issue link from spec.md frontmatter
 * 2. Extract AC states for that US
 * 3. Build progress comment
 * 4. Post via `gh issue comment`
 *
 * Never throws — all errors are captured in result.errors.
 */
export async function postACProgressComments(
  incrementId: string,
  affectedUSIds: string[],
  specPath: string,
  options: CommentPostOptions,
): Promise<CommentPostResult> {
  const result: CommentPostResult = { posted: [], errors: [] };

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

  for (const usId of affectedUSIds) {
    const link = issueLinks[usId];
    if (!link) {
      continue;
    }

    const acStates = parseACStatesForUS(content, usId);

    // Skip progress comment when all ACs are complete — the auto-closer will
    // post its own "All acceptance criteria completed" comment instead,
    // preventing duplicate comments on the same issue.
    const allComplete = acStates.length > 0 && acStates.every(ac => ac.completed);

    if (!allComplete) {
      const commentBody = buildProgressCommentForUS(incrementId, usId, acStates);

      const execResult = await execFileNoThrow(
        'gh',
        ['issue', 'comment', String(link.issueNumber), '--body', commentBody, '-R', repoSlug],
        env ? { env } : {},
      );

      if (execResult.success) {
        result.posted.push({ usId, issueNumber: link.issueNumber });
      } else {
        result.errors.push({
          usId,
          error: execResult.stderr || 'Unknown error posting comment',
        });
      }
    } else {
      // Still track as posted for body-patch below
      result.posted.push({ usId, issueNumber: link.issueNumber });
    }

    // Patch AC checkboxes directly in the issue body using the known issue number
    if (acStates.length > 0) {
      try {
        await patchIssueBodyCheckboxes(link.issueNumber, acStates, repoSlug, env);
      } catch (patchErr) {
        // Body patch failure is non-blocking but should be visible
        result.errors.push({
          usId,
          error: `body-patch: ${patchErr instanceof Error ? patchErr.message : String(patchErr)}`,
        });
      }
    }
  }

  return result;
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
          // NEW format entries override OLD format for the same US
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

  // Support both bold (**AC-US1-01**:) and plain (AC-US1-01:) formats
  const acPattern = new RegExp(
    `- \\[([ x])\\] (?:\\*\\*)?AC-US${usNum}-(\\d+)(?:\\*\\*)?:\\s*(.+)`,
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

/**
 * Build a progress comment for a specific user story.
 * Follows ProgressCommentBuilder format: percentage, AC checkboxes, timestamp.
 */
function buildProgressCommentForUS(
  incrementId: string,
  usId: string,
  acStates: ParsedACState[],
): string {
  const total = acStates.length;
  const completed = acStates.filter(ac => ac.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  let comment = `**Progress Update** — ${usId} (Increment ${incrementId})\n\n`;
  comment += `**Status**: ${completed}/${total} ACs complete (${percentage}%)\n\n`;

  if (completed > 0) {
    comment += `**Completed**:\n`;
    for (const ac of acStates.filter(a => a.completed)) {
      comment += `- [x] **${ac.id}**: ${ac.description}\n`;
    }
    comment += '\n';
  }

  if (completed < total) {
    comment += `**Remaining**:\n`;
    for (const ac of acStates.filter(a => !a.completed)) {
      comment += `- [ ] **${ac.id}**: ${ac.description}\n`;
    }
    comment += '\n';
  }

  comment += `---\n`;
  comment += `Auto-synced by SpecWeave | ${new Date().toISOString().split('T')[0]}\n`;

  return comment;
}

/**
 * Patch AC checkboxes in the GitHub issue body in-place.
 * Fetches the current body, flips checkboxes to match local AC states,
 * and updates the issue. Only modifies lines matching AC-USXX-YY patterns.
 */
async function patchIssueBodyCheckboxes(
  issueNumber: number,
  acStates: ParsedACState[],
  repoSlug: string,
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  // Build a map of AC ID → completed
  const acMap = new Map(acStates.map(ac => [ac.id, ac.completed]));

  // Fetch current issue body
  const fetchResult = await execFileNoThrow(
    'gh',
    ['issue', 'view', String(issueNumber), '--json', 'body', '-q', '.body', '-R', repoSlug],
    env ? { env } : {},
  );
  if (!fetchResult.success || !fetchResult.stdout) return;

  const body = fetchResult.stdout;

  // Patch AC checkboxes: match both bold and plain AC-ID patterns
  const patchedBody = body.replace(
    /^(- \[)[ x](\] (?:\*\*)?)(AC-[A-Z0-9]+-\d+)((?:\*\*)?: .+)$/gm,
    (_match: string, prefix: string, mid: string, acId: string, suffix: string) => {
      const completed = acMap.get(acId);
      if (completed !== undefined) {
        return `${prefix}${completed ? 'x' : ' '}${mid}${acId}${suffix}`;
      }
      return _match;
    },
  );

  if (patchedBody === body) return; // No changes needed

  const editResult = await execFileNoThrow(
    'gh',
    ['issue', 'edit', String(issueNumber), '--body', patchedBody, '-R', repoSlug],
    env ? { env } : {},
  );
  if (!editResult.success) {
    throw new Error(editResult.stderr || 'Failed to update issue body');
  }
}
