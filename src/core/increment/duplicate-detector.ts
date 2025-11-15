/**
 * Duplicate Detector - Scan filesystem and detect duplicate increments
 *
 * Detects increments that exist in multiple locations (active, archive, abandoned)
 * or have the same increment number with different names.
 *
 * Part of increment 0033: Duplicate Increment Prevention System
 */

import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { IncrementStatus } from '../types/increment-metadata.js';

/**
 * Report of all duplicates found
 */
export interface DuplicateReport {
  duplicates: Duplicate[];
  totalChecked: number;
  duplicateCount: number;
}

/**
 * A duplicate increment (same number in multiple locations or with different names)
 */
export interface Duplicate {
  incrementNumber: string;
  locations: IncrementLocation[];
  recommendedWinner: IncrementLocation;
  losingVersions: IncrementLocation[];
  resolutionReason: string;
}

/**
 * Information about an increment location
 */
export interface IncrementLocation {
  path: string;
  name: string;
  status: IncrementStatus;
  lastActivity: string;
  fileCount: number;
  totalSize: number;
  hasReports: boolean;
  hasGitHubLink: boolean;
}

/**
 * Scan all increment folders and detect duplicates
 */
export async function detectAllDuplicates(
  rootDir: string
): Promise<DuplicateReport> {
  const incrementsDir = path.join(rootDir, '.specweave', 'increments');

  // Check if increments directory exists
  if (!await fs.pathExists(incrementsDir)) {
    return {
      duplicates: [],
      totalChecked: 0,
      duplicateCount: 0
    };
  }

  // Scan all locations in parallel
  const [active, archived, abandoned] = await Promise.all([
    scanDirectory(incrementsDir, false),
    scanDirectory(path.join(incrementsDir, '_archive'), false),
    scanDirectory(path.join(incrementsDir, '_abandoned'), false)
  ]);

  // Group by increment number
  const byNumber = new Map<string, IncrementLocation[]>();
  const allIncrements = [...active, ...archived, ...abandoned];

  for (const inc of allIncrements) {
    const number = extractIncrementNumber(inc.name);
    if (!number) continue; // Skip non-increment folders

    if (!byNumber.has(number)) {
      byNumber.set(number, []);
    }
    byNumber.get(number)!.push(inc);
  }

  // Find duplicates (increment number exists in >1 location or >1 name)
  const duplicates: Duplicate[] = [];
  byNumber.forEach((locations, number) => {
    if (locations.length > 1) {
      // Duplicate found!
      const winner = selectWinner(locations);
      duplicates.push({
        incrementNumber: number,
        locations,
        recommendedWinner: winner,
        losingVersions: locations.filter(l => l !== winner),
        resolutionReason: explainWinner(winner, locations)
      });
    }
  });

  return {
    duplicates,
    totalChecked: allIncrements.length,
    duplicateCount: duplicates.length
  };
}

/**
 * Detect duplicates for a specific increment number
 */
export async function detectDuplicatesByNumber(
  incrementNumber: string,
  rootDir: string
): Promise<IncrementLocation[]> {
  const report = await detectAllDuplicates(rootDir);

  // Normalize increment number (remove leading zeros if present)
  const normalizedNumber = incrementNumber.padStart(4, '0');

  const duplicate = report.duplicates.find(
    d => d.incrementNumber === normalizedNumber
  );

  return duplicate ? duplicate.locations : [];
}

/**
 * Scan a directory for increment folders
 */
async function scanDirectory(
  dir: string,
  throwOnError: boolean = false
): Promise<IncrementLocation[]> {
  try {
    // Check if directory exists
    if (!await fs.pathExists(dir)) {
      return [];
    }

    // Find all directories matching increment pattern (####-*)
    const pattern = path.join(dir, '[0-9][0-9][0-9][0-9]-*');
    const allPaths = await glob(pattern);

    const locations: IncrementLocation[] = [];

    for (const incPath of allPaths) {
      try {
        const stats = await fs.stat(incPath);
        if (!stats.isDirectory()) continue;

        const name = path.basename(incPath);

        // Skip nested .specweave folders
        if (incPath.includes('.specweave/increments/.specweave')) {
          continue;
        }

        // Read metadata
        const metadataPath = path.join(incPath, 'metadata.json');
        let metadata: any = {
          status: 'unknown',
          lastActivity: new Date(stats.mtime).toISOString()
        };

        if (await fs.pathExists(metadataPath)) {
          try {
            metadata = await fs.readJson(metadataPath);
          } catch (error) {
            // Skip corrupted metadata (will be caught by validation)
          }
        }

        // Count files recursively
        const allFiles = await glob(path.join(incPath, '**/*'));
        const fileCount = allFiles.filter(async f => {
          try {
            const fstats = await fs.stat(f);
            return fstats.isFile();
          } catch {
            return false;
          }
        }).length;

        // Calculate total size
        let totalSize = 0;
        for (const file of allFiles) {
          try {
            const fstats = await fs.stat(file);
            if (fstats.isFile()) {
              totalSize += fstats.size;
            }
          } catch {
            // Skip files we can't read
          }
        }

        // Check for reports folder
        const reportsDir = path.join(incPath, 'reports');
        const hasReports = await fs.pathExists(reportsDir);

        // Check for GitHub link in metadata
        const hasGitHubLink = metadata.github && metadata.github.issue;

        locations.push({
          path: incPath,
          name,
          status: metadata.status || 'unknown',
          lastActivity: metadata.lastActivity || new Date(stats.mtime).toISOString(),
          fileCount,
          totalSize,
          hasReports,
          hasGitHubLink
        });
      } catch (error) {
        // Skip increments we can't read
        if (throwOnError) throw error;
      }
    }

    return locations;
  } catch (error) {
    if (throwOnError) throw error;
    return [];
  }
}

/**
 * Extract increment number from increment name (e.g., "0001-feature" → "0001")
 */
function extractIncrementNumber(name: string): string | null {
  const match = name.match(/^(\d{4})-/);
  return match ? match[1] : null;
}

/**
 * Select winning version based on priority rules
 */
function selectWinner(locations: IncrementLocation[]): IncrementLocation {
  // Priority 1: Active status > Completed > Paused > Backlog > Abandoned
  const statusPriority: Record<string, number> = {
    active: 5,
    completed: 4,
    paused: 3,
    backlog: 2,
    abandoned: 1,
    unknown: 0
  };

  // Sort by priority
  const sorted = [...locations].sort((a, b) => {
    // 1. Status priority
    const aPriority = statusPriority[a.status] || 0;
    const bPriority = statusPriority[b.status] || 0;
    if (bPriority !== aPriority) return bPriority - aPriority;

    // 2. Most recent activity
    const aTime = new Date(a.lastActivity).getTime();
    const bTime = new Date(b.lastActivity).getTime();
    if (bTime !== aTime) return bTime - aTime;

    // 3. Most complete (more files)
    if (b.fileCount !== a.fileCount) return b.fileCount - a.fileCount;

    // 4. Location preference (active > _archive > _abandoned)
    const locationScore = (loc: IncrementLocation) => {
      if (loc.path.includes('_abandoned')) return 1;
      if (loc.path.includes('_archive')) return 2;
      return 3; // active
    };
    return locationScore(b) - locationScore(a);
  });

  return sorted[0];
}

/**
 * Explain why this version won
 */
function explainWinner(
  winner: IncrementLocation,
  all: IncrementLocation[]
): string {
  const reasons: string[] = [];

  const statusPriority: Record<string, number> = {
    active: 5,
    completed: 4,
    paused: 3,
    backlog: 2,
    abandoned: 1,
    unknown: 0
  };

  // Check status
  const winnerStatusPriority = statusPriority[winner.status] || 0;
  const hasLowerStatus = all.some(loc =>
    loc !== winner && (statusPriority[loc.status] || 0) < winnerStatusPriority
  );
  if (hasLowerStatus) {
    reasons.push(`Higher status (${winner.status})`);
  }

  // Check recency
  const winnerTime = new Date(winner.lastActivity).getTime();
  const hasOlderActivity = all.some(loc =>
    loc !== winner && new Date(loc.lastActivity).getTime() < winnerTime
  );
  if (hasOlderActivity) {
    const date = new Date(winner.lastActivity).toISOString().split('T')[0];
    reasons.push(`Most recent activity (${date})`);
  }

  // Check completeness
  const hasFewerFiles = all.some(loc => loc !== winner && loc.fileCount < winner.fileCount);
  if (hasFewerFiles) {
    reasons.push(`Most complete (${winner.fileCount} files)`);
  }

  // Check location
  const winnerLocation = winner.path.includes('_abandoned') ? 'abandoned' :
                        winner.path.includes('_archive') ? 'archive' : 'active';
  const hasWorseLocation = all.some(loc => {
    const locLocation = loc.path.includes('_abandoned') ? 'abandoned' :
                       loc.path.includes('_archive') ? 'archive' : 'active';
    const locationPriority = { active: 3, archive: 2, abandoned: 1 };
    return locationPriority[locLocation as keyof typeof locationPriority] <
           locationPriority[winnerLocation as keyof typeof locationPriority];
  });
  if (hasWorseLocation) {
    reasons.push(`In ${winnerLocation} location`);
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Default selection';
}
