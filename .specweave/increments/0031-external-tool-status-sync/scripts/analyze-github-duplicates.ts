#!/usr/bin/env node
/**
 * GitHub Issue Duplicate Analysis Script
 *
 * Analyzes GitHub issues for SpecWeave features and detects:
 * - Duplicate FS-* feature issues
 * - Duplicate INC-* increment issues
 * - Orphaned issues without corresponding living docs
 * - Missing GitHub issues for features
 */

interface GitHubIssue {
  number: number;
  title: string;
  state: 'OPEN' | 'CLOSED';
  labels: string[];
}

interface DuplicateGroup {
  featureId: string;
  issues: GitHubIssue[];
  livingDocsExists: boolean;
}

interface AnalysisReport {
  livingDocsCount: number;
  githubIssuesCount: number;
  uniqueFeatures: number;
  duplicateGroups: DuplicateGroup[];
  orphanedIssues: GitHubIssue[];
  missingIssues: string[];
  incrementDuplicates: GitHubIssue[];
}

// Parse GitHub issue output (number|state|title format)
function parseGitHubIssues(output: string): GitHubIssue[] {
  return output
    .trim()
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const [number, state, title] = line.split('|');
      return {
        number: parseInt(number),
        title: title.trim(),
        state: state as 'OPEN' | 'CLOSED',
        labels: []
      };
    });
}

// Extract feature ID from issue title (e.g., "[FS-25-11-12]" -> "FS-25-11-12")
function extractFeatureId(title: string): string | null {
  const match = title.match(/\[([^\]]+)\]/);
  return match ? match[1] : null;
}

// Normalize feature ID for comparison (handles folder names)
function normalizeFeatureId(id: string): string {
  // FS-25-11-12-external-tool-status-sync -> FS-25-11-12
  return id.split('-').slice(0, 4).join('-');
}

// Group issues by feature ID
function groupIssuesByFeature(issues: GitHubIssue[]): Map<string, GitHubIssue[]> {
  const groups = new Map<string, GitHubIssue[]>();

  for (const issue of issues) {
    const featureId = extractFeatureId(issue.title);
    if (!featureId) continue;

    const normalized = normalizeFeatureId(featureId);
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized)!.push(issue);
  }

  return groups;
}

// Build analysis report
function buildAnalysisReport(
  livingDocsFolders: string[],
  fsIssues: GitHubIssue[],
  incIssues: GitHubIssue[]
): AnalysisReport {
  const issueGroups = groupIssuesByFeature(fsIssues);
  const livingDocsSet = new Set(
    livingDocsFolders.map(folder => normalizeFeatureId(folder))
  );

  const duplicateGroups: DuplicateGroup[] = [];
  const orphanedIssues: GitHubIssue[] = [];
  const missingIssues: string[] = [];

  // Find duplicates and orphans
  for (const [featureId, issues] of issueGroups) {
    const livingDocsExists = livingDocsSet.has(featureId);

    if (issues.length > 1) {
      duplicateGroups.push({
        featureId,
        issues: issues.sort((a, b) => a.number - b.number),
        livingDocsExists
      });
    }

    if (!livingDocsExists) {
      orphanedIssues.push(...issues);
    }
  }

  // Find missing issues (features without GitHub issues)
  for (const folder of livingDocsFolders) {
    const normalized = normalizeFeatureId(folder);
    if (!issueGroups.has(normalized)) {
      missingIssues.push(folder);
    }
  }

  // Find increment duplicates
  const incGroups = groupIssuesByFeature(incIssues);
  const incrementDuplicates: GitHubIssue[] = [];

  for (const issues of incGroups.values()) {
    if (issues.length > 1) {
      incrementDuplicates.push(...issues.sort((a, b) => a.number - b.number));
    }
  }

  return {
    livingDocsCount: livingDocsFolders.length,
    githubIssuesCount: fsIssues.length,
    uniqueFeatures: issueGroups.size,
    duplicateGroups: duplicateGroups.sort((a, b) =>
      b.issues.length - a.issues.length
    ),
    orphanedIssues,
    missingIssues,
    incrementDuplicates
  };
}

// Generate cleanup commands
function generateCleanupCommands(report: AnalysisReport): string[] {
  const commands: string[] = [];

  // Close all duplicate issues except the first (lowest number)
  for (const group of report.duplicateGroups) {
    const [keep, ...close] = group.issues;

    for (const issue of close) {
      const reason = issue.state === 'CLOSED'
        ? 'Duplicate (already closed)'
        : `Duplicate of #${keep.number}`;

      commands.push(
        `gh issue close ${issue.number} --repo anton-abyzov/specweave --comment "Closing duplicate issue. Keeping #${keep.number} as canonical issue. ${reason}"`
      );
    }
  }

  // Close increment duplicates (keep lowest number)
  if (report.incrementDuplicates.length > 0) {
    const [keep, ...close] = report.incrementDuplicates;

    for (const issue of close) {
      commands.push(
        `gh issue close ${issue.number} --repo anton-abyzov/specweave --comment "Closing duplicate increment issue. Keeping #${keep.number} as canonical issue."`
      );
    }
  }

  return commands;
}

// Generate markdown report
function generateMarkdownReport(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push('# GitHub Issue Duplicate Analysis Report');
  lines.push('');
  lines.push(`**Date**: ${new Date().toISOString()}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Living Docs Features**: ${report.livingDocsCount}`);
  lines.push(`- **GitHub FS-* Issues**: ${report.githubIssuesCount}`);
  lines.push(`- **Unique Features**: ${report.uniqueFeatures}`);
  lines.push(`- **Duplicate Groups**: ${report.duplicateGroups.length}`);
  lines.push(`- **Total Duplicates**: ${report.githubIssuesCount - report.uniqueFeatures}`);
  lines.push(`- **Increment Duplicates**: ${report.incrementDuplicates.length}`);
  lines.push(`- **Orphaned Issues**: ${report.orphanedIssues.length}`);
  lines.push(`- **Missing Issues**: ${report.missingIssues.length}`);
  lines.push('');

  // Duplicate groups
  if (report.duplicateGroups.length > 0) {
    lines.push('## Duplicate Feature Issues');
    lines.push('');

    for (const group of report.duplicateGroups) {
      lines.push(`### ${group.featureId}`);
      lines.push('');
      lines.push(`**Living Docs**: ${group.livingDocsExists ? '✅ Exists' : '❌ Missing'}`);
      lines.push('');
      lines.push('| Issue # | State | Title |');
      lines.push('|---------|-------|-------|');

      for (const issue of group.issues) {
        const keep = issue === group.issues[0];
        const emoji = keep ? '✅ KEEP' : '❌ CLOSE';
        lines.push(`| ${emoji} #${issue.number} | ${issue.state} | ${issue.title} |`);
      }

      lines.push('');
    }
  }

  // Increment duplicates
  if (report.incrementDuplicates.length > 0) {
    lines.push('## Duplicate Increment Issues');
    lines.push('');
    lines.push('| Issue # | State | Title | Action |');
    lines.push('|---------|-------|-------|--------|');

    for (let i = 0; i < report.incrementDuplicates.length; i++) {
      const issue = report.incrementDuplicates[i];
      const action = i === 0 ? '✅ KEEP' : '❌ CLOSE';
      lines.push(`| #${issue.number} | ${issue.state} | ${issue.title} | ${action} |`);
    }

    lines.push('');
  }

  // Orphaned issues
  if (report.orphanedIssues.length > 0) {
    lines.push('## Orphaned Issues (No Living Docs)');
    lines.push('');
    lines.push('⚠️ These issues have no corresponding feature folder in living docs:');
    lines.push('');
    lines.push('| Issue # | State | Title |');
    lines.push('|---------|-------|-------|');

    for (const issue of report.orphanedIssues) {
      lines.push(`| #${issue.number} | ${issue.state} | ${issue.title} |`);
    }

    lines.push('');
  }

  // Missing issues
  if (report.missingIssues.length > 0) {
    lines.push('## Missing GitHub Issues');
    lines.push('');
    lines.push('⚠️ These features have no GitHub issue:');
    lines.push('');

    for (const folder of report.missingIssues) {
      lines.push(`- ${folder}`);
    }

    lines.push('');
  }

  // Cleanup commands
  const commands = generateCleanupCommands(report);
  if (commands.length > 0) {
    lines.push('## Cleanup Commands');
    lines.push('');
    lines.push('```bash');
    lines.push('# Close all duplicate issues (run these commands)');
    lines.push('');

    for (const cmd of commands) {
      lines.push(cmd);
    }

    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

// Main execution
async function main() {
  console.log('🔍 Analyzing GitHub issue duplicates...\n');

  // This is a TypeScript template - actual data will be injected by the analysis script
  const LIVING_DOCS_FOLDERS: string[] = [];
  const FS_ISSUES: GitHubIssue[] = [];
  const INC_ISSUES: GitHubIssue[] = [];

  // Build report
  const report = buildAnalysisReport(LIVING_DOCS_FOLDERS, FS_ISSUES, INC_ISSUES);

  // Generate markdown
  const markdown = generateMarkdownReport(report);

  console.log(markdown);

  return report;
}

// Export for use as module
export { main, buildAnalysisReport, generateMarkdownReport, generateCleanupCommands };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
