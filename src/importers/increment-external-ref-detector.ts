/**
 * Increment External Reference Detector
 *
 * Scans ALL increment metadata.json files for `external_ref` fields
 * to prevent duplicate imports from external tools (GitHub/JIRA/ADO).
 *
 * @module increment-external-ref-detector
 * @since 1.0.272
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Scan result for an existing external reference.
 */
export interface ExternalRefMatch {
  /** Increment ID that already has this external ref */
  incrementId: string;
  /** Lifecycle directory where the increment was found */
  location: 'active' | '_archive' | '_abandoned' | '_paused';
  /** The external_ref value from metadata.json */
  externalRef: string;
}

/**
 * Detects duplicate external references across all increment directories.
 *
 * Scans metadata.json files in:
 * - .specweave/increments/ (active)
 * - .specweave/increments/_archive/
 * - .specweave/increments/_abandoned/
 * - .specweave/increments/_paused/
 *
 * @example
 * ```typescript
 * const detector = new IncrementExternalRefDetector('/path/to/project');
 * const existing = detector.hasRef('github#owner/repo#123');
 * if (existing) {
 *   console.log(`Already imported as ${existing.incrementId}`);
 * }
 * ```
 */
export class IncrementExternalRefDetector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Build a map of all external references across all increments.
   *
   * @returns Map of external_ref → ExternalRefMatch
   */
  buildRefMap(): Map<string, ExternalRefMatch> {
    const refMap = new Map<string, ExternalRefMatch>();
    const incrementsDir = path.join(this.projectRoot, '.specweave', 'increments');

    const dirsToScan: Array<{ path: string; location: ExternalRefMatch['location'] }> = [
      { path: incrementsDir, location: 'active' },
      { path: path.join(incrementsDir, '_archive'), location: '_archive' },
      { path: path.join(incrementsDir, '_abandoned'), location: '_abandoned' },
      { path: path.join(incrementsDir, '_paused'), location: '_paused' },
    ];

    for (const { path: dirPath, location } of dirsToScan) {
      if (!fs.existsSync(dirPath)) continue;

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name.startsWith('_')) continue; // Skip lifecycle subdirs

          const metadataPath = path.join(dirPath, entry.name, 'metadata.json');
          if (!fs.existsSync(metadataPath)) continue;

          try {
            const raw = fs.readFileSync(metadataPath, 'utf-8');
            const metadata = JSON.parse(raw);

            if (metadata.external_ref) {
              refMap.set(metadata.external_ref, {
                incrementId: metadata.id || entry.name,
                location,
                externalRef: metadata.external_ref,
              });
            }
          } catch {
            // Corrupted metadata.json — skip silently
            continue;
          }
        }
      } catch {
        // Permission denied or other error — skip
        continue;
      }
    }

    return refMap;
  }

  /**
   * Check if an external reference already exists in any increment.
   *
   * @param externalRef - External reference to check (e.g., "github#owner/repo#123")
   * @returns The match if found, null otherwise
   */
  hasRef(externalRef: string): ExternalRefMatch | null {
    const refMap = this.buildRefMap();
    return refMap.get(externalRef) ?? null;
  }

  /**
   * Check multiple external references at once (batch dedup).
   *
   * @param externalRefs - Array of external references to check
   * @returns Map of refs that already exist → their matches
   */
  checkRefs(externalRefs: string[]): Map<string, ExternalRefMatch> {
    const refMap = this.buildRefMap();
    const duplicates = new Map<string, ExternalRefMatch>();

    for (const ref of externalRefs) {
      const match = refMap.get(ref);
      if (match) {
        duplicates.set(ref, match);
      }
    }

    return duplicates;
  }
}

/**
 * Generate a canonical external_ref string from platform and issue details.
 *
 * @param platform - Source platform
 * @param identifier - Platform-specific identifier
 * @returns Canonical external_ref string
 *
 * @example
 * ```typescript
 * formatExternalRef('github', 'owner/repo', 123) → 'github#owner/repo#123'
 * formatExternalRef('jira', 'PROJ', 'PROJ-456')   → 'jira#PROJ#PROJ-456'
 * formatExternalRef('ado', 'org/project', 789)     → 'ado#org/project#789'
 * ```
 */
export function formatExternalRef(
  platform: 'github' | 'jira' | 'ado',
  context: string,
  issueId: string | number
): string {
  return `${platform}#${context}#${issueId}`;
}
