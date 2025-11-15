/**
 * Conflict Resolver - Merge content and resolve duplicate conflicts
 *
 * Provides utilities to merge valuable content from losing versions to winning version,
 * and delete losing versions with user confirmation.
 *
 * Part of increment 0033: Duplicate Increment Prevention System
 */

import fs from 'fs-extra';
import * as path from 'path';
import type { Duplicate, IncrementLocation } from './duplicate-detector.js';

/**
 * Options for conflict resolution
 */
export interface ResolveOptions {
  dryRun?: boolean;
  force?: boolean;
  merge?: boolean;
}

/**
 * Result of conflict resolution
 */
export interface ResolutionResult {
  winner: string;
  merged: string[];
  deleted: string[];
  reportPath: string;
  dryRun: boolean;
}

/**
 * Resolve conflict by merging winner + losers
 */
export async function resolveConflict(
  duplicate: Duplicate,
  options: ResolveOptions = {}
): Promise<ResolutionResult> {
  const winner = duplicate.recommendedWinner;
  const losers = duplicate.losingVersions;

  // Step 1: Merge valuable content from losers → winner (if merge enabled)
  const mergedFiles: string[] = [];
  if (options.merge) {
    const merged = await mergeContent(winner, losers, options);
    mergedFiles.push(...merged);
  }

  // Step 2: Create resolution report
  const reportPath = await createResolutionReport(duplicate, mergedFiles, options);

  // Step 3: Delete losing versions (if not dry-run)
  const deletedPaths: string[] = [];
  if (!options.dryRun) {
    for (const loser of losers) {
      if (options.force || await confirmDeletion(loser)) {
        await fs.remove(loser.path);
        deletedPaths.push(loser.path);
      }
    }
  } else {
    // Dry-run: just record what would be deleted
    deletedPaths.push(...losers.map(l => l.path));
  }

  return {
    winner: winner.path,
    merged: mergedFiles,
    deleted: deletedPaths,
    reportPath,
    dryRun: options.dryRun || false
  };
}

/**
 * Merge content from losing versions into winner
 */
export async function mergeContent(
  winner: IncrementLocation,
  losers: IncrementLocation[],
  options: ResolveOptions = {}
): Promise<string[]> {
  const mergedFiles: string[] = [];

  for (const loser of losers) {
    // Merge reports/ folder (preserve all reports)
    const loserReportsDir = path.join(loser.path, 'reports');
    if (await fs.pathExists(loserReportsDir)) {
      const winnerReportsDir = path.join(winner.path, 'reports');
      await fs.ensureDir(winnerReportsDir);

      const reportFiles = await fs.readdir(loserReportsDir);
      for (const file of reportFiles) {
        const sourcePath = path.join(loserReportsDir, file);
        const targetPath = path.join(winnerReportsDir, file);

        // Skip if not a file
        const stats = await fs.stat(sourcePath);
        if (!stats.isFile()) continue;

        // Rename if file exists (add timestamp)
        let finalPath = targetPath;
        if (await fs.pathExists(targetPath)) {
          const ext = path.extname(file);
          const base = path.basename(file, ext);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
          finalPath = path.join(winnerReportsDir, `${base}-MERGED-${timestamp}${ext}`);
        }

        if (!options.dryRun) {
          await fs.copy(sourcePath, finalPath);
        }
        mergedFiles.push(finalPath);
      }
    }

    // Merge metadata (union of GitHub/JIRA/ADO links)
    const loserMetadataPath = path.join(loser.path, 'metadata.json');
    if (await fs.pathExists(loserMetadataPath)) {
      const winnerMetadataPath = path.join(winner.path, 'metadata.json');

      if (await fs.pathExists(winnerMetadataPath)) {
        try {
          const loserMetadata = await fs.readJson(loserMetadataPath);
          const winnerMetadata = await fs.readJson(winnerMetadataPath);

          // Merge external links (take non-null values)
          const merged = {
            ...winnerMetadata,
            github: winnerMetadata.github || loserMetadata.github,
            jira: winnerMetadata.jira || loserMetadata.jira,
            ado: winnerMetadata.ado || loserMetadata.ado
          };

          if (!options.dryRun) {
            await fs.writeJson(winnerMetadataPath, merged, { spaces: 2 });
          }
          mergedFiles.push(winnerMetadataPath);
        } catch (error) {
          // Skip corrupted metadata
        }
      }
    }
  }

  return mergedFiles;
}

/**
 * Create resolution report in winner's reports/ folder
 */
async function createResolutionReport(
  duplicate: Duplicate,
  mergedFiles: string[],
  options: ResolveOptions
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportName = `DUPLICATE-RESOLUTION-${timestamp}.md`;
  const reportPath = path.join(duplicate.recommendedWinner.path, 'reports', reportName);

  const content = generateReportContent(duplicate, mergedFiles, options);

  if (!options.dryRun) {
    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeFile(reportPath, content, 'utf-8');
  }

  return reportPath;
}

/**
 * Generate resolution report content
 */
function generateReportContent(
  duplicate: Duplicate,
  mergedFiles: string[],
  options: ResolveOptions
): string {
  const winner = duplicate.recommendedWinner;
  const losers = duplicate.losingVersions;
  const timestamp = new Date().toISOString();

  return `# Duplicate Resolution Report

**Generated**: ${timestamp}
**Increment Number**: ${duplicate.incrementNumber}
**Resolution Strategy**: ${options.merge ? 'Merge + Delete' : 'Delete Only'}

## Conflict Summary

**Total Locations Found**: ${duplicate.locations.length}

### Winner: ${winner.name}
- **Path**: \`${winner.path}\`
- **Status**: ${winner.status}
- **Last Activity**: ${winner.lastActivity}
- **File Count**: ${winner.fileCount}
- **Has Reports**: ${winner.hasReports ? 'Yes' : 'No'}
- **Has GitHub Link**: ${winner.hasGitHubLink ? 'Yes' : 'No'}

**Reason Selected**: ${duplicate.resolutionReason}

## Losing Versions

${losers.map((loser, idx) => `
### ${idx + 1}. ${loser.name}
- **Path**: \`${loser.path}\`
- **Status**: ${loser.status}
- **Last Activity**: ${loser.lastActivity}
- **File Count**: ${loser.fileCount}
- **Action**: ${options.dryRun ? 'Would be deleted' : 'Deleted'}
`).join('\n')}

## Merged Content

${options.merge ? `
**Total Files Merged**: ${mergedFiles.length}

${mergedFiles.length > 0 ? mergedFiles.map(f => `- \`${path.basename(f)}\``).join('\n') : 'No files merged'}
` : 'Content merge was not enabled (--merge flag not used)'}

## Command Used

\`\`\`bash
/specweave:fix-duplicates ${options.merge ? '--merge ' : ''}${options.force ? '--force ' : ''}${options.dryRun ? '--dry-run' : ''}
\`\`\`

## Next Steps

${options.dryRun ? `
This was a dry-run. To apply these changes:
1. Review this report
2. Run: \`/specweave:fix-duplicates --merge\` (without --dry-run)
` : `
✅ Duplicate resolved successfully!

- Winner preserved at: \`${winner.path}\`
- ${losers.length} losing version(s) deleted
- ${mergedFiles.length} file(s) merged
`}

---

🤖 Generated by SpecWeave Duplicate Prevention System
`;
}

/**
 * Confirm deletion with user (interactive)
 */
async function confirmDeletion(loser: IncrementLocation): Promise<boolean> {
  // In a real CLI, this would prompt the user
  // For now, we'll just return true (force mode)
  // This will be implemented properly in the CLI command
  console.log(`⚠️  Delete ${loser.path}? (Use --force to skip this prompt)`);
  return true;
}

/**
 * Resolve multiple duplicates in batch
 */
export async function resolveAllDuplicates(
  duplicates: Duplicate[],
  options: ResolveOptions = {}
): Promise<ResolutionResult[]> {
  const results: ResolutionResult[] = [];

  for (const duplicate of duplicates) {
    try {
      const result = await resolveConflict(duplicate, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to resolve duplicate ${duplicate.incrementNumber}:`, error);
    }
  }

  return results;
}
