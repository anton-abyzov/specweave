/**
 * GitHub Issue Body Parser
 *
 * Parses AC checkbox state and sync metadata from a GitHub issue body.
 * Used by the pull sync to detect changes made on GitHub.
 *
 * @module github-issue-body-parser
 */

export interface ParsedIssueBody {
  /** AC ID → checked state and description */
  acceptanceCriteria: Record<string, { checked: boolean; description: string }>;
  /** Sync marker metadata (if present) */
  syncMarker?: { specId: string; userStoryId: string };
}

// Regex to match AC checkboxes: - [x] **AC-US1-01**: Description
const AC_CHECKBOX_RE = /^-\s+\[([ xX])\]\s+\*\*(?<acId>AC-[A-Z0-9]+-\d+)\*\*:\s*(?<desc>.+)$/;

// Regex to match sync footer marker
const SYNC_MARKER_RE = /<!--\s*specweave:sync\s+(?:spec=(?<specId>[^\s]+)\s+)?us=(?<usId>[^\s]+)\s*-->/;

/**
 * Parse a GitHub issue body to extract AC checkbox states and sync metadata.
 *
 * Strategy:
 * 1. Try to find ACs within "## Acceptance Criteria" section
 * 2. Fallback: scan entire body for AC-pattern checkboxes
 * 3. Parse sync footer marker if present
 */
export function parseIssueBody(body: string): ParsedIssueBody {
  const result: ParsedIssueBody = {
    acceptanceCriteria: {},
  };

  if (!body || !body.trim()) {
    return result;
  }

  const lines = body.split('\n');

  // Try to find the "## Acceptance Criteria" section
  let inAcSection = false;
  let foundAcSection = false;

  for (const line of lines) {
    // Detect section boundaries
    if (/^##\s+Acceptance Criteria/i.test(line)) {
      inAcSection = true;
      foundAcSection = true;
      continue;
    }
    if (inAcSection && /^##\s+/.test(line)) {
      inAcSection = false;
      continue;
    }

    if (inAcSection) {
      const match = line.match(AC_CHECKBOX_RE);
      if (match?.groups) {
        result.acceptanceCriteria[match.groups.acId] = {
          checked: match[1] !== ' ',
          description: match.groups.desc.trim(),
        };
      }
    }
  }

  // Fallback: if no AC section found, scan the entire body
  if (!foundAcSection) {
    for (const line of lines) {
      const match = line.match(AC_CHECKBOX_RE);
      if (match?.groups) {
        result.acceptanceCriteria[match.groups.acId] = {
          checked: match[1] !== ' ',
          description: match.groups.desc.trim(),
        };
      }
    }
  }

  // Parse sync footer marker
  const syncMatch = body.match(SYNC_MARKER_RE);
  if (syncMatch?.groups?.usId) {
    result.syncMarker = {
      specId: syncMatch.groups.specId || '',
      userStoryId: syncMatch.groups.usId,
    };
  }

  return result;
}
