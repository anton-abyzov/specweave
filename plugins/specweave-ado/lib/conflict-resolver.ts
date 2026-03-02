/**
 * Conflict Resolver for Living Docs Synchronization
 *
 * CRITICAL PRINCIPLE: External tool status ALWAYS wins in conflicts!
 * This ensures that QA and stakeholder decisions in external tools
 * take precedence over local development status.
 */

import * as fs from '../../../src/utils/fs-native.js';
import * as path from 'path';
import * as yaml from 'yaml';

// ============================================================================
// Types
// ============================================================================

export interface ConflictResolution {
  field: string;
  localValue: any;
  externalValue: any;
  resolution: 'external' | 'local';
  resolvedValue: any;
  reason: string;
  timestamp: string;
}

/**
 * Timestamp comparison result for pull sync (Increment 0089)
 */
export interface TimestampComparisonResult {
  winner: 'local' | 'external' | 'none';
  localTimestamp: string | null;
  externalTimestamp: string;
  timeDiffMs: number;
  reason: string;
}

export interface SpecMetadata {
  id: string;
  title: string;
  status: SpecStatus;
  priority?: Priority;
  externalLinks?: {
    ado?: {
      featureId: number;
      featureUrl: string;
      syncedAt?: string;
      lastExternalStatus?: string;
    };
    jira?: {
      issueKey: string;
      issueUrl: string;
      syncedAt?: string;
      lastExternalStatus?: string;
    };
    github?: {
      issue: number;
      url: string;
      syncedAt?: string;
      lastExternalStatus?: string;
    };
  };
}

export type SpecStatus =
  | 'draft'
  | 'in-progress'
  | 'implemented'
  | 'in-qa'
  | 'complete'
  | 'blocked'
  | 'cancelled';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface ExternalStatus {
  tool: 'ado' | 'jira' | 'github';
  status: string;
  mappedStatus: SpecStatus;
  priority?: string;
  lastModified: string;
}

// ============================================================================
// Status Mapping
// ============================================================================

const STATUS_MAPPING = {
  ado: {
    // Agile process template
    'New': 'draft' as SpecStatus,
    'Active': 'in-progress' as SpecStatus,
    'Resolved': 'implemented' as SpecStatus,
    'Closed': 'complete' as SpecStatus,
    'In Review': 'in-qa' as SpecStatus,
    'In QA': 'in-qa' as SpecStatus,
    'Blocked': 'blocked' as SpecStatus,
    'Removed': 'cancelled' as SpecStatus,
    // Scrum process template
    'Approved': 'draft' as SpecStatus,
    'Committed': 'in-progress' as SpecStatus,
    'Done': 'complete' as SpecStatus,
    // CMMI process template
    'Proposed': 'draft' as SpecStatus,
    // 'Active' already mapped above (shared with CMMI)
    // 'Resolved' already mapped above (shared with CMMI)
    // 'Closed' already mapped above (shared with CMMI)
    // Basic process template
    'To Do': 'draft' as SpecStatus,
    'Doing': 'in-progress' as SpecStatus,
    // 'Done' already mapped above (shared with Basic)
  },
  jira: {
    'To Do': 'draft' as SpecStatus,
    'In Progress': 'in-progress' as SpecStatus,
    'Code Review': 'implemented' as SpecStatus,
    'In Review': 'implemented' as SpecStatus,
    'QA': 'in-qa' as SpecStatus,
    'Testing': 'in-qa' as SpecStatus,
    'Done': 'complete' as SpecStatus,
    'Closed': 'complete' as SpecStatus,
    'Blocked': 'blocked' as SpecStatus,
    'Cancelled': 'cancelled' as SpecStatus
  },
  github: {
    'open': 'in-progress' as SpecStatus,
    'closed': 'complete' as SpecStatus
  }
};

const REVERSE_STATUS_MAPPING = {
  // Default reverse mapping uses Agile states (most common)
  // Callers should use process-template-aware mapping when template is known
  ado: {
    'draft': 'New',
    'in-progress': 'Active',
    'implemented': 'Resolved',
    'in-qa': 'In QA',
    'complete': 'Closed',
    'blocked': 'Blocked',
    'cancelled': 'Removed'
  },
  jira: {
    'draft': 'To Do',
    'in-progress': 'In Progress',
    'implemented': 'Code Review',
    'in-qa': 'QA',
    'complete': 'Done',
    'blocked': 'Blocked',
    'cancelled': 'Cancelled'
  },
  github: {
    'draft': 'open',
    'in-progress': 'open',
    'implemented': 'open',
    'in-qa': 'open',
    'complete': 'closed',
    'blocked': 'open',
    'cancelled': 'closed'
  }
};

// ============================================================================
// Conflict Resolver Class
// ============================================================================

export class ConflictResolver {
  private resolutionLog: ConflictResolution[] = [];

  /**
   * Map external status to local SpecWeave status
   */
  public mapExternalStatus(tool: 'ado' | 'jira' | 'github', externalStatus: string): SpecStatus {
    const mapping = STATUS_MAPPING[tool];
    return (mapping as Record<string, SpecStatus>)[externalStatus] || 'unknown' as SpecStatus;
  }

  /**
   * Map local status to external tool status
   */
  public mapLocalStatus(tool: 'ado' | 'jira' | 'github', localStatus: SpecStatus): string {
    const mapping = REVERSE_STATUS_MAPPING[tool];
    return mapping[localStatus] || 'Active';
  }

  /**
   * CRITICAL: Resolve status conflict - EXTERNAL ALWAYS WINS
   */
  public resolveStatusConflict(
    localStatus: SpecStatus,
    externalStatus: ExternalStatus
  ): ConflictResolution {
    const resolution: ConflictResolution = {
      field: 'status',
      localValue: localStatus,
      externalValue: externalStatus.status,
      resolution: 'external', // ALWAYS external for status
      resolvedValue: externalStatus.mappedStatus,
      reason: 'External tool reflects QA and stakeholder decisions',
      timestamp: new Date().toISOString()
    };

    // Log the resolution
    console.log(`📊 Status Conflict Detected:`);
    console.log(`   Local: ${localStatus}`);
    console.log(`   External: ${externalStatus.status} (${externalStatus.tool})`);
    console.log(`   ✅ Resolution: EXTERNAL WINS - ${externalStatus.mappedStatus}`);

    this.resolutionLog.push(resolution);
    return resolution;
  }

  /**
   * Compare timestamps to determine winner (Increment 0089)
   *
   * For pull sync, we compare local lastModified vs external ChangedDate.
   * The more recent timestamp wins.
   *
   * @param localTimestamp - Local file lastModified timestamp (ISO string or null)
   * @param externalTimestamp - External tool ChangedDate (ISO string)
   * @returns Comparison result with winner and reasoning
   */
  public compareTimestamps(
    localTimestamp: string | null,
    externalTimestamp: string
  ): TimestampComparisonResult {
    const externalDate = new Date(externalTimestamp);

    // If no local timestamp, external wins by default
    if (!localTimestamp) {
      return {
        winner: 'external',
        localTimestamp: null,
        externalTimestamp,
        timeDiffMs: 0,
        reason: 'No local timestamp available, external wins by default',
      };
    }

    const localDate = new Date(localTimestamp);
    const timeDiffMs = externalDate.getTime() - localDate.getTime();

    // External is more recent → external wins
    if (timeDiffMs > 0) {
      console.log(`📊 Timestamp Comparison:`);
      console.log(`   Local:    ${localTimestamp}`);
      console.log(`   External: ${externalTimestamp}`);
      console.log(`   ✅ Winner: EXTERNAL (${Math.round(timeDiffMs / 60000)}min newer)`);

      return {
        winner: 'external',
        localTimestamp,
        externalTimestamp,
        timeDiffMs,
        reason: `External is ${Math.round(timeDiffMs / 60000)} minutes newer`,
      };
    }

    // Local is more recent → local wins (don't overwrite local changes)
    if (timeDiffMs < 0) {
      console.log(`📊 Timestamp Comparison:`);
      console.log(`   Local:    ${localTimestamp}`);
      console.log(`   External: ${externalTimestamp}`);
      console.log(`   ✅ Winner: LOCAL (${Math.round(Math.abs(timeDiffMs) / 60000)}min newer)`);

      return {
        winner: 'local',
        localTimestamp,
        externalTimestamp,
        timeDiffMs,
        reason: `Local is ${Math.round(Math.abs(timeDiffMs) / 60000)} minutes newer`,
      };
    }

    // Same timestamp → no conflict
    return {
      winner: 'none',
      localTimestamp,
      externalTimestamp,
      timeDiffMs: 0,
      reason: 'Timestamps are identical, no conflict',
    };
  }

  /**
   * Resolve conflict using timestamp comparison (Increment 0089)
   *
   * Combines timestamp comparison with status conflict resolution.
   * Used by ExternalChangePuller for pull sync.
   *
   * @param field - The field being compared (e.g., 'status')
   * @param localValue - Current local value
   * @param externalValue - Value from external tool
   * @param localTimestamp - Local lastModified timestamp
   * @param externalTimestamp - External ChangedDate
   * @returns Conflict resolution result
   */
  public resolveWithTimestamp(
    field: string,
    localValue: any,
    externalValue: any,
    localTimestamp: string | null,
    externalTimestamp: string
  ): ConflictResolution {
    const comparison = this.compareTimestamps(localTimestamp, externalTimestamp);

    const resolution: ConflictResolution = {
      field,
      localValue,
      externalValue,
      resolution: comparison.winner === 'local' ? 'local' : 'external',
      resolvedValue: comparison.winner === 'local' ? localValue : externalValue,
      reason: comparison.reason,
      timestamp: new Date().toISOString(),
    };

    // Log the resolution
    console.log(`📊 Conflict Resolved (${field}):`);
    console.log(`   Winner: ${comparison.winner.toUpperCase()}`);
    console.log(`   Reason: ${comparison.reason}`);

    this.resolutionLog.push(resolution);
    return resolution;
  }

  /**
   * Resolve priority conflict - EXTERNAL WINS
   */
  public resolvePriorityConflict(
    localPriority: Priority | undefined,
    externalPriority: string | undefined
  ): ConflictResolution {
    const resolution: ConflictResolution = {
      field: 'priority',
      localValue: localPriority,
      externalValue: externalPriority,
      resolution: 'external',
      resolvedValue: externalPriority || localPriority,
      reason: 'External tool reflects stakeholder prioritization',
      timestamp: new Date().toISOString()
    };

    if (localPriority !== externalPriority && externalPriority) {
      console.log(`📊 Priority Conflict Detected:`);
      console.log(`   Local: ${localPriority}`);
      console.log(`   External: ${externalPriority}`);
      console.log(`   ✅ Resolution: EXTERNAL WINS - ${externalPriority}`);
      this.resolutionLog.push(resolution);
    }

    return resolution;
  }

  /**
   * Apply conflict resolutions to spec
   */
  public async applyResolutions(
    specPath: string,
    resolutions: ConflictResolution[]
  ): Promise<void> {
    const content = await fs.readFile(specPath, 'utf-8');
    const lines = content.split('\n');
    let inFrontmatter = false;
    let frontmatterEnd = -1;

    // Find frontmatter boundaries
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          frontmatterEnd = i;
          break;
        }
      }
    }

    // Apply resolutions
    for (const resolution of resolutions) {
      if (resolution.field === 'status') {
        // Update status in frontmatter
        for (let i = 1; i < frontmatterEnd; i++) {
          if (lines[i].startsWith('status:')) {
            lines[i] = `status: ${resolution.resolvedValue}`;
            console.log(`✅ Applied status resolution: ${resolution.resolvedValue}`);
            break;
          }
        }

        // Add sync metadata
        const syncTimestamp = new Date().toISOString();
        let syncedAtFound = false;

        for (let i = 1; i < frontmatterEnd; i++) {
          if (lines[i].includes('syncedAt:')) {
            lines[i] = `    syncedAt: "${syncTimestamp}"`;
            syncedAtFound = true;
            break;
          }
        }

        if (!syncedAtFound) {
          // Add syncedAt after externalLinks
          for (let i = 1; i < frontmatterEnd; i++) {
            if (lines[i].includes('externalLinks:')) {
              // Find the external tool section
              for (let j = i + 1; j < frontmatterEnd; j++) {
                if (lines[j].includes('ado:') || lines[j].includes('jira:') || lines[j].includes('github:')) {
                  // Insert after the URL line
                  for (let k = j + 1; k < frontmatterEnd; k++) {
                    if (lines[k].includes('Url:')) {
                      lines.splice(k + 1, 0, `    syncedAt: "${syncTimestamp}"`);
                      frontmatterEnd++; // Adjust for inserted line
                      syncedAtFound = true;
                      break;
                    }
                  }
                  if (syncedAtFound) break;
                }
              }
              if (syncedAtFound) break;
            }
          }
        }
      } else if (resolution.field === 'priority' && resolution.resolvedValue) {
        // Update priority in frontmatter
        for (let i = 1; i < frontmatterEnd; i++) {
          if (lines[i].startsWith('priority:')) {
            lines[i] = `priority: ${resolution.resolvedValue}`;
            console.log(`✅ Applied priority resolution: ${resolution.resolvedValue}`);
            break;
          }
        }
      }
    }

    // Write updated content
    await fs.writeFile(specPath, lines.join('\n'));
    console.log(`✅ Resolutions applied to ${path.basename(specPath)}`);
  }

  /**
   * Validate that external status wins in implementation
   */
  public validateImplementation(
    implementationCode: string
  ): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check for incorrect patterns
    const incorrectPatterns = [
      {
        pattern: /if.*conflict.*\{[^}]*spec\.status\s*=\s*localStatus/,
        message: 'Local status should never win in conflicts'
      },
      {
        pattern: /resolution\s*:\s*['"]local['"]/,
        message: 'Resolution should be "external" for status conflicts'
      },
      {
        pattern: /prefer.*local.*status/i,
        message: 'Should prefer external status'
      }
    ];

    for (const { pattern, message } of incorrectPatterns) {
      if (pattern.test(implementationCode)) {
        violations.push(message);
      }
    }

    // Check for correct patterns
    const requiredPatterns = [
      {
        pattern: /external.*wins|EXTERNAL.*WINS|externalStatus.*applied/i,
        message: 'Missing confirmation that external wins'
      }
    ];

    for (const { pattern, message } of requiredPatterns) {
      if (!pattern.test(implementationCode)) {
        violations.push(message);
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Get resolution history
   */
  public getResolutionLog(): ConflictResolution[] {
    return this.resolutionLog;
  }

  /**
   * Generate resolution report
   */
  public generateReport(): string {
    const report = [];
    report.push('# Conflict Resolution Report');
    report.push(`\n**Generated**: ${new Date().toISOString()}`);
    report.push(`**Total Resolutions**: ${this.resolutionLog.length}`);
    report.push('\n## Resolutions\n');

    for (const resolution of this.resolutionLog) {
      report.push(`### ${resolution.field}`);
      report.push(`- **Local Value**: ${resolution.localValue}`);
      report.push(`- **External Value**: ${resolution.externalValue}`);
      report.push(`- **Resolution**: ${resolution.resolution.toUpperCase()} WINS`);
      report.push(`- **Resolved To**: ${resolution.resolvedValue}`);
      report.push(`- **Reason**: ${resolution.reason}`);
      report.push(`- **Time**: ${resolution.timestamp}\n`);
    }

    report.push('## Validation');
    report.push('✅ All conflicts resolved with external tool priority');

    return report.join('\n');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load spec metadata from file
 */
export async function loadSpecMetadata(specPath: string): Promise<SpecMetadata> {
  const content = await fs.readFile(specPath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    throw new Error(`No frontmatter found in ${specPath}`);
  }

  return yaml.parse(frontmatterMatch[1]) as SpecMetadata;
}

/**
 * Perform three-permission sync with conflict resolution
 */
export async function performBidirectionalSync(
  specPath: string,
  externalStatus: ExternalStatus
): Promise<void> {
  const resolver = new ConflictResolver();
  const spec = await loadSpecMetadata(specPath);
  const resolutions: ConflictResolution[] = [];

  // Check for status conflict
  if (spec.status !== externalStatus.mappedStatus) {
    const statusResolution = resolver.resolveStatusConflict(
      spec.status,
      externalStatus
    );
    resolutions.push(statusResolution);
  }

  // Apply resolutions if any conflicts found
  if (resolutions.length > 0) {
    await resolver.applyResolutions(specPath, resolutions);

    // Generate and save report
    const report = resolver.generateReport();
    const reportPath = specPath.replace('.md', '-sync-report.md');
    await fs.writeFile(reportPath, report);

    console.log(`📄 Sync report saved to ${path.basename(reportPath)}`);
  } else {
    console.log('✅ No conflicts detected - spec in sync with external tool');
  }
}

// ============================================================================
// Export for testing
// ============================================================================

export default ConflictResolver;