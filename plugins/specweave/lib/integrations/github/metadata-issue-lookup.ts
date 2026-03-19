/**
 * Look up GitHub issue numbers from increment metadata.json.
 *
 * Used to skip DuplicateDetector.createWithProtection() for issues
 * that are already linked in metadata (saves 2-3 API calls per issue).
 *
 * Supports both metadata formats:
 * - NEW: metadata.externalLinks.github.issues{} (keyed by US-ID)
 * - OLD: metadata.github.issues[] (array with userStory field)
 *
 * @module metadata-issue-lookup
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

/**
 * Get the GitHub issue number for a user story from increment metadata.
 *
 * @param incrementsDir - Path to .specweave/increments/ directory
 * @param featureId - Feature ID (e.g., "FS-621")
 * @param userStoryId - User story ID (e.g., "US-001")
 * @returns Issue number or null if not found
 */
export async function getIssueNumberFromMetadata(
  incrementsDir: string,
  featureId: string,
  userStoryId: string,
): Promise<number | null> {
  try {
    if (!existsSync(incrementsDir)) return null;

    // Derive increment number from feature ID (FS-621 → 0621)
    const numMatch = featureId.match(/FS-0*(\d+)E?/i);
    if (!numMatch) return null;

    const paddedNum = String(parseInt(numMatch[1], 10)).padStart(4, '0');

    // Find matching increment folder
    const entries = await readdir(incrementsDir);
    const match = entries.find(e => e.startsWith(paddedNum + '-'));
    if (!match) return null;

    const metadataPath = path.join(incrementsDir, match, 'metadata.json');
    if (!existsSync(metadataPath)) return null;

    const raw = await readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(raw);

    // NEW format: externalLinks.github.issues{} (keyed by US-ID)
    const newFormat = metadata?.externalLinks?.github?.issues?.[userStoryId];
    if (newFormat?.issueNumber) {
      return newFormat.issueNumber;
    }

    // OLD format: github.issues[] (array with userStory field)
    const oldFormat = metadata?.github?.issues;
    if (Array.isArray(oldFormat)) {
      const entry = oldFormat.find(
        (i: { userStory: string; number: number }) => i.userStory === userStoryId,
      );
      if (entry?.number) return entry.number;
    }

    return null;
  } catch {
    // Gracefully handle corrupted metadata, missing files, etc.
    return null;
  }
}
