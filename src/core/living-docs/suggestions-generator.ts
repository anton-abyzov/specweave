/**
 * Suggestions Generator - Final Phase of Living Docs Builder
 *
 * Produces actionable SUGGESTIONS.md with:
 * 1. Summary statistics of documentation status
 * 2. Priority zones based on work item density
 * 3. Immediate actions with specific file paths
 * 4. Gap analysis between modules and documentation
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import type { DiscoveryResult, ModuleInfo } from './discovery.js';
import type { ModuleAnalysis } from './module-analyzer.js';
import type { PriorityQueueEntry, WorkItemMatchResult } from './workitem-matcher.js';
import type { LivingDocsUserInputs } from '../background/types.js';

/**
 * Documentation status per module
 */
export interface ModuleDocStatus {
  /** Module name */
  moduleName: string;
  /** Module path */
  modulePath: string;
  /** Has README */
  hasReadme: boolean;
  /** Has generated analysis */
  hasAnalysis: boolean;
  /** Doc coverage estimate (0-100) */
  coverage: number;
  /** Work item count */
  workItemCount: number;
  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Status */
  status: 'complete' | 'partial' | 'none';
}

/**
 * Priority zone for focused documentation
 */
export interface PriorityZone {
  /** Zone name (module name) */
  name: string;
  /** Zone path */
  path: string;
  /** Work item count */
  workItems: number;
  /** Documentation status */
  docStatus: 'complete' | 'partial' | 'none';
  /** Suggested action */
  action: string;
  /** Files to focus on */
  focusFiles: string[];
}

/**
 * Immediate action item
 */
export interface ImmediateAction {
  /** Priority (1 = highest) */
  priority: number;
  /** Module name */
  module: string;
  /** Action description */
  action: string;
  /** Specific file paths */
  files: string[];
  /** Reason */
  reason: string;
}

/**
 * Suggestions report
 */
export interface SuggestionsReport {
  /** Generation timestamp */
  generatedAt: string;

  /** Summary statistics */
  summary: {
    totalModules: number;
    modulesDocumented: number;
    modulesPartial: number;
    modulesUndocumented: number;
    totalWorkItems: number;
    matchedWorkItems: number;
    coveragePercent: number;
  };

  /** Priority zones */
  priorityZones: PriorityZone[];

  /** Immediate actions */
  immediateActions: ImmediateAction[];

  /** Module status details */
  moduleStatuses: ModuleDocStatus[];

  /** Additional sources processed */
  additionalSources: string[];

  /** Directories not fully analyzed */
  notAnalyzed: Array<{
    path: string;
    reason: string;
    filesSkipped: number;
  }>;

  /** User pain points addressed */
  painPointsAddressed: string[];
}

/**
 * Generate suggestions from all analysis data
 */
export async function generateSuggestions(
  projectPath: string,
  discovery: DiscoveryResult,
  moduleAnalyses: Map<string, ModuleAnalysis>,
  matchResult: WorkItemMatchResult,
  userInputs: LivingDocsUserInputs
): Promise<SuggestionsReport> {
  // Build module statuses
  const moduleStatuses = buildModuleStatuses(discovery, moduleAnalyses, matchResult);

  // Calculate summary
  const summary = calculateSummary(moduleStatuses, matchResult);

  // Build priority zones
  const priorityZones = buildPriorityZones(moduleStatuses, matchResult.priorityQueue);

  // Generate immediate actions
  const immediateActions = generateImmediateActions(moduleStatuses, priorityZones, userInputs);

  // Track what wasn't analyzed
  const notAnalyzed = trackNotAnalyzed(discovery, moduleAnalyses);

  // Match pain points
  const painPointsAddressed = matchPainPoints(userInputs.knownPainPoints, moduleStatuses);

  return {
    generatedAt: new Date().toISOString(),
    summary,
    priorityZones,
    immediateActions,
    moduleStatuses,
    additionalSources: userInputs.additionalSources,
    notAnalyzed,
    painPointsAddressed
  };
}

/**
 * Build documentation status for each module
 */
function buildModuleStatuses(
  discovery: DiscoveryResult,
  analyses: Map<string, ModuleAnalysis>,
  matchResult: WorkItemMatchResult
): ModuleDocStatus[] {
  const statuses: ModuleDocStatus[] = [];

  for (const module of discovery.modules) {
    const analysis = analyses.get(module.name);
    const mapping = matchResult.moduleMap.get(module.name);

    const hasAnalysis = analysis?.docStatus === 'generated';
    const hasReadme = module.hasReadme;
    const workItemCount = mapping?.workItemCount || 0;

    // Calculate coverage
    let coverage = 0;
    if (hasReadme) coverage += 40;
    if (hasAnalysis) coverage += 40;
    if (module.hasTests) coverage += 20;

    // Determine status
    let status: 'complete' | 'partial' | 'none';
    if (coverage >= 80) status = 'complete';
    else if (coverage > 0) status = 'partial';
    else status = 'none';

    statuses.push({
      moduleName: module.name,
      modulePath: module.path,
      hasReadme,
      hasAnalysis,
      coverage,
      workItemCount,
      priority: mapping?.priority || 'low',
      status
    });
  }

  return statuses;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(
  statuses: ModuleDocStatus[],
  matchResult: WorkItemMatchResult
): SuggestionsReport['summary'] {
  const documented = statuses.filter(s => s.status === 'complete').length;
  const partial = statuses.filter(s => s.status === 'partial').length;
  const undocumented = statuses.filter(s => s.status === 'none').length;

  const totalCoverage = statuses.reduce((sum, s) => sum + s.coverage, 0);
  const avgCoverage = statuses.length > 0 ? Math.round(totalCoverage / statuses.length) : 0;

  return {
    totalModules: statuses.length,
    modulesDocumented: documented,
    modulesPartial: partial,
    modulesUndocumented: undocumented,
    totalWorkItems: matchResult.stats.totalWorkItems,
    matchedWorkItems: matchResult.stats.matchedWorkItems,
    coveragePercent: avgCoverage
  };
}

/**
 * Build priority zones from module statuses and queue
 */
function buildPriorityZones(
  statuses: ModuleDocStatus[],
  priorityQueue: PriorityQueueEntry[]
): PriorityZone[] {
  const zones: PriorityZone[] = [];

  // Focus on top 10 by work item count
  for (const entry of priorityQueue.slice(0, 10)) {
    if (entry.workItemCount === 0) continue;

    const status = statuses.find(s => s.moduleName === entry.moduleName);
    if (!status) continue;

    let action: string;
    if (status.status === 'none') {
      action = 'START HERE - Create comprehensive module documentation';
    } else if (status.status === 'partial') {
      action = 'ENHANCE - Add detailed API docs and usage examples';
    } else {
      action = 'REVIEW - Ensure docs match current work items';
    }

    zones.push({
      name: entry.moduleName,
      path: entry.modulePath,
      workItems: entry.workItemCount,
      docStatus: status.status,
      action,
      focusFiles: entry.topWorkItems.slice(0, 3)
    });
  }

  return zones;
}

/**
 * Generate immediate action items
 */
function generateImmediateActions(
  statuses: ModuleDocStatus[],
  zones: PriorityZone[],
  userInputs: LivingDocsUserInputs
): ImmediateAction[] {
  const actions: ImmediateAction[] = [];
  let priority = 1;

  // Action 1: Undocumented critical/high priority modules
  const criticalUndoc = statuses
    .filter(s => s.status === 'none' && (s.priority === 'critical' || s.priority === 'high'))
    .slice(0, 3);

  for (const status of criticalUndoc) {
    actions.push({
      priority: priority++,
      module: status.moduleName,
      action: 'Create README.md with module overview and key exports',
      files: [`${status.modulePath}/README.md`],
      reason: `${status.workItemCount} work items reference this undocumented module`
    });
  }

  // Action 2: User priority areas without docs
  for (const area of userInputs.priorityAreas) {
    const matchingModule = statuses.find(s =>
      s.moduleName.toLowerCase().includes(area.toLowerCase()) ||
      s.modulePath.toLowerCase().includes(area.toLowerCase())
    );

    if (matchingModule && matchingModule.status !== 'complete') {
      actions.push({
        priority: priority++,
        module: matchingModule.moduleName,
        action: `Document ${area} (user priority area)`,
        files: [`${matchingModule.modulePath}/README.md`],
        reason: `User identified "${area}" as priority area`
      });
    }
  }

  // Action 3: Top zones from priority queue
  for (const zone of zones.slice(0, 3)) {
    if (zone.docStatus === 'none') {
      actions.push({
        priority: priority++,
        module: zone.name,
        action: 'Create foundational documentation',
        files: [
          `${zone.path}/README.md`,
          `${zone.path}/API.md`
        ],
        reason: `High activity module with ${zone.workItems} related work items`
      });
    }
  }

  // Action 4: Modules with tests but no docs
  const testedNoDoc = statuses
    .filter(s => !s.hasReadme && s.coverage > 0)
    .slice(0, 2);

  for (const status of testedNoDoc) {
    actions.push({
      priority: priority++,
      module: status.moduleName,
      action: 'Add README based on existing test cases',
      files: [`${status.modulePath}/README.md`],
      reason: 'Has test coverage but lacks documentation'
    });
  }

  // Limit to 10 actions
  return actions.slice(0, 10);
}

/**
 * Track directories not fully analyzed
 */
function trackNotAnalyzed(
  discovery: DiscoveryResult,
  analyses: Map<string, ModuleAnalysis>
): SuggestionsReport['notAnalyzed'] {
  const notAnalyzed: SuggestionsReport['notAnalyzed'] = [];

  // Check for sampled modules
  for (const module of discovery.modules) {
    const analysis = analyses.get(module.name);

    if (!analysis) {
      notAnalyzed.push({
        path: module.path,
        reason: 'Analysis skipped',
        filesSkipped: module.fileCount
      });
    } else if (analysis.filesSkipped > 0) {
      notAnalyzed.push({
        path: module.path,
        reason: `Sampled (tier: ${discovery.tier})`,
        filesSkipped: analysis.filesSkipped
      });
    }
  }

  return notAnalyzed;
}

/**
 * Match user pain points to modules
 */
function matchPainPoints(
  painPoints: string[],
  statuses: ModuleDocStatus[]
): string[] {
  const addressed: string[] = [];

  for (const painPoint of painPoints) {
    const lowerPain = painPoint.toLowerCase();

    for (const status of statuses) {
      if (
        status.moduleName.toLowerCase().includes(lowerPain) ||
        status.modulePath.toLowerCase().includes(lowerPain)
      ) {
        addressed.push(`"${painPoint}" → Documented in ${status.moduleName} (${status.status})`);
        break;
      }
    }
  }

  return addressed;
}

/**
 * Format suggestions report as markdown
 */
export function formatSuggestionsMarkdown(report: SuggestionsReport): string {
  const lines: string[] = [];

  lines.push('# Living Docs Suggestions');
  lines.push('');
  lines.push(`*Generated: ${new Date(report.generatedAt).toLocaleString()}*`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Modules | ${report.summary.totalModules} |`);
  lines.push(`| Fully Documented | ${report.summary.modulesDocumented} |`);
  lines.push(`| Partially Documented | ${report.summary.modulesPartial} |`);
  lines.push(`| Undocumented | ${report.summary.modulesUndocumented} |`);
  lines.push(`| Documentation Coverage | ${report.summary.coveragePercent}% |`);
  lines.push(`| Work Items Matched | ${report.summary.matchedWorkItems}/${report.summary.totalWorkItems} |`);
  lines.push('');

  // Priority Zones
  if (report.priorityZones.length > 0) {
    lines.push('## Priority Zones');
    lines.push('');
    lines.push('These modules have the most work items and need attention:');
    lines.push('');
    lines.push('| Module | Path | Work Items | Status | Action |');
    lines.push('|--------|------|------------|--------|--------|');

    for (const zone of report.priorityZones) {
      const statusIcon = zone.docStatus === 'complete' ? '✅' : zone.docStatus === 'partial' ? '⚠️' : '❌';
      lines.push(`| ${zone.name} | \`${zone.path}\` | ${zone.workItems} | ${statusIcon} | ${zone.action} |`);
    }
    lines.push('');
  }

  // Immediate Actions
  if (report.immediateActions.length > 0) {
    lines.push('## Immediate Actions');
    lines.push('');

    for (const action of report.immediateActions) {
      lines.push(`### ${action.priority}. ${action.module}`);
      lines.push('');
      lines.push(`**Action**: ${action.action}`);
      lines.push('');
      lines.push(`**Reason**: ${action.reason}`);
      lines.push('');
      lines.push('**Files**:');
      for (const file of action.files) {
        lines.push(`- \`${file}\``);
      }
      lines.push('');
    }
  }

  // Additional Sources
  if (report.additionalSources.length > 0) {
    lines.push('## Additional Sources Processed');
    lines.push('');
    for (const source of report.additionalSources) {
      lines.push(`- \`${source}\``);
    }
    lines.push('');
  }

  // Pain Points
  if (report.painPointsAddressed.length > 0) {
    lines.push('## Known Pain Points Addressed');
    lines.push('');
    for (const pp of report.painPointsAddressed) {
      lines.push(`- ${pp}`);
    }
    lines.push('');
  }

  // Not Analyzed
  if (report.notAnalyzed.length > 0) {
    lines.push('## Directories Not Fully Analyzed');
    lines.push('');
    lines.push('Due to codebase size, these directories were sampled:');
    lines.push('');
    lines.push('| Path | Reason | Files Skipped |');
    lines.push('|------|--------|---------------|');

    for (const item of report.notAnalyzed.slice(0, 20)) {
      lines.push(`| \`${item.path}\` | ${item.reason} | ${item.filesSkipped} |`);
    }

    if (report.notAnalyzed.length > 20) {
      lines.push(`| ... | ${report.notAnalyzed.length - 20} more | - |`);
    }
    lines.push('');
  }

  // Module Status Table
  lines.push('## Module Documentation Status');
  lines.push('');
  lines.push('<details>');
  lines.push('<summary>Click to expand full module list</summary>');
  lines.push('');
  lines.push('| Module | Path | README | Analysis | Coverage | Work Items | Priority |');
  lines.push('|--------|------|--------|----------|----------|------------|----------|');

  for (const status of report.moduleStatuses) {
    const readme = status.hasReadme ? '✅' : '❌';
    const analysis = status.hasAnalysis ? '✅' : '❌';
    lines.push(
      `| ${status.moduleName} | \`${status.modulePath}\` | ${readme} | ${analysis} | ${status.coverage}% | ${status.workItemCount} | ${status.priority} |`
    );
  }

  lines.push('');
  lines.push('</details>');
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Generated by SpecWeave Living Docs Builder*');
  lines.push('');
  lines.push('To regenerate this report, run `/specweave:jobs` and restart the living-docs job.');

  return lines.join('\n');
}

/**
 * Save suggestions report to disk
 */
export async function saveSuggestionsReport(
  projectPath: string,
  report: SuggestionsReport
): Promise<string> {
  const outputDir = path.join(projectPath, '.specweave', 'docs');
  fs.ensureDirSync(outputDir);

  const markdown = formatSuggestionsMarkdown(report);
  const outputPath = path.join(outputDir, 'SUGGESTIONS.md');

  fs.writeFileSync(outputPath, markdown);

  // Also save JSON for programmatic access
  const jsonPath = path.join(outputDir, 'suggestions.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  return outputPath;
}
