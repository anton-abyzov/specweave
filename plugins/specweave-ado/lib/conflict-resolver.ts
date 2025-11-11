/**
 * Conflict Resolver for Living Docs Synchronization
 *
 * CRITICAL PRINCIPLE: External tool status ALWAYS wins in conflicts!
 * This ensures that QA and stakeholder decisions in external tools
 * take precedence over local development status.
 */

import * as fs from 'fs-extra';
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
    'New': 'draft' as SpecStatus,
    'Active': 'in-progress' as SpecStatus,
    'Resolved': 'implemented' as SpecStatus,
    'Closed': 'complete' as SpecStatus,
    'In Review': 'in-qa' as SpecStatus,
    'In QA': 'in-qa' as SpecStatus,
    'Blocked': 'blocked' as SpecStatus,
    'Removed': 'cancelled' as SpecStatus
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
    return mapping[externalStatus] || 'unknown' as SpecStatus;
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
 * Perform bidirectional sync with conflict resolution
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