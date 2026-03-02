/**
 * JIRA Duplicate Detector (v0.33.0)
 *
 * Implements 3-phase duplicate protection for JIRA issues:
 * 1. Detection: Check before create
 * 2. Verification: Count check after create
 * 3. Reflection: Auto-close duplicates
 *
 * Mirrors the GitHub DuplicateDetector pattern for consistency.
 */

import { Logger, consoleLogger } from '../../../src/utils/logger.js';
import { getApiBaseUrl } from './jira-deployment-detector.js';
import { toCommentBody } from './content-format-adapter.js';

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  created: string;
  url?: string;
}

export interface DuplicateGroup {
  summary: string;
  issues: JiraIssue[];
  keepIssue: JiraIssue;
  duplicates: JiraIssue[];
}

export interface DetectionResult {
  found: boolean;
  existingIssue?: JiraIssue;
  count: number;
}

export interface VerificationResult {
  success: boolean;
  expectedCount: number;
  actualCount: number;
  duplicates: JiraIssue[];
}

export interface CleanupResult {
  closedCount: number;
  keptCount: number;
  errors: string[];
}

export class JiraDuplicateDetector {
  private domain: string;
  private auth: string;
  private logger: Logger;

  constructor(options: {
    domain?: string;
    email?: string;
    token?: string;
    logger?: Logger;
  } = {}) {
    this.domain = options.domain || process.env.JIRA_DOMAIN || '';
    const email = options.email || process.env.JIRA_EMAIL || '';
    const token = options.token || process.env.JIRA_API_TOKEN || '';
    this.auth = Buffer.from(`${email}:${token}`).toString('base64');
    this.logger = options.logger || consoleLogger;
  }

  /**
   * Phase 1: Check if issue exists before creating
   */
  async checkBeforeCreate(
    summaryPattern: string,
    incrementId?: string
  ): Promise<DetectionResult> {
    try {
      const issues = await this.searchIssues(summaryPattern);

      if (issues.length > 0) {
        return {
          found: true,
          existingIssue: issues[0],
          count: issues.length,
        };
      }

      return { found: false, count: 0 };
    } catch (error: any) {
      this.logger.log(`⚠️  Detection check failed: ${error.message}`);
      // Graceful degradation - continue anyway
      return { found: false, count: 0 };
    }
  }

  /**
   * Phase 2: Verify count after creation
   */
  async verifyAfterCreate(
    summaryPattern: string,
    expectedCount: number = 1
  ): Promise<VerificationResult> {
    try {
      const issues = await this.searchIssues(summaryPattern);

      if (issues.length > expectedCount) {
        // Duplicates detected!
        const sorted = issues.sort(
          (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
        );

        return {
          success: false,
          expectedCount,
          actualCount: issues.length,
          duplicates: sorted.slice(expectedCount), // All issues after expected count
        };
      }

      return {
        success: true,
        expectedCount,
        actualCount: issues.length,
        duplicates: [],
      };
    } catch (error: any) {
      this.logger.log(`⚠️  Verification check failed: ${error.message}`);
      return {
        success: false,
        expectedCount,
        actualCount: -1,
        duplicates: [],
      };
    }
  }

  /**
   * Phase 3: Auto-close duplicates
   */
  async closeDuplicates(
    duplicates: JiraIssue[],
    keepIssueKey: string
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      closedCount: 0,
      keptCount: 1,
      errors: [],
    };

    for (const issue of duplicates) {
      try {
        await this.closeIssue(issue.key, keepIssueKey);
        result.closedCount++;
        this.logger.log(`  ✅ Closed ${issue.key} (duplicate of ${keepIssueKey})`);
      } catch (error: any) {
        result.errors.push(`${issue.key}: ${error.message}`);
        this.logger.log(`  ❌ Failed to close ${issue.key}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Full cleanup: Find and close all duplicates for a feature
   */
  async cleanupFeatureDuplicates(
    featureId: string,
    dryRun: boolean = false
  ): Promise<{
    groups: DuplicateGroup[];
    totalIssues: number;
    duplicateCount: number;
    closedCount: number;
  }> {
    // 1. Search for all issues with feature ID
    const searchPattern = `[${featureId}]`;
    const issues = await this.searchIssues(searchPattern);

    this.logger.log(`\n🔍 Scanning for duplicates in Feature ${featureId}...`);
    this.logger.log(`   Found ${issues.length} total issues`);

    // 2. Group by summary
    const groups = this.groupBySummary(issues);
    const duplicateGroups = groups.filter(g => g.duplicates.length > 0);

    if (duplicateGroups.length === 0) {
      this.logger.log(`   ✅ No duplicates found!`);
      return {
        groups: [],
        totalIssues: issues.length,
        duplicateCount: 0,
        closedCount: 0,
      };
    }

    this.logger.log(`   Detected ${duplicateGroups.length} duplicate groups:\n`);

    // 3. Display groups
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      this.logger.log(`   📋 Group ${i + 1}: "${group.summary.substring(0, 50)}..."`);
      this.logger.log(`      - ${group.keepIssue.key} (KEEP) - Created ${group.keepIssue.created.split('T')[0]}`);
      for (const dup of group.duplicates) {
        this.logger.log(`      - ${dup.key} (CLOSE) - Created ${dup.created.split('T')[0]} - DUPLICATE`);
      }
      this.logger.log('');
    }

    const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0);

    if (dryRun) {
      this.logger.log(`\n✅ Dry run complete!`);
      this.logger.log(`   Total issues: ${issues.length}`);
      this.logger.log(`   Duplicate groups: ${duplicateGroups.length}`);
      this.logger.log(`   Issues to close: ${totalDuplicates}`);
      this.logger.log(`\n⚠️  This was a DRY RUN - no changes made.`);

      return {
        groups: duplicateGroups,
        totalIssues: issues.length,
        duplicateCount: totalDuplicates,
        closedCount: 0,
      };
    }

    // 4. Close duplicates
    let closedCount = 0;
    this.logger.log(`🗑️  Closing duplicates...`);

    for (const group of duplicateGroups) {
      const result = await this.closeDuplicates(group.duplicates, group.keepIssue.key);
      closedCount += result.closedCount;
    }

    this.logger.log(`\n✅ Cleanup complete!`);
    this.logger.log(`   Closed: ${closedCount} duplicates`);
    this.logger.log(`   Kept: ${duplicateGroups.length} original issues`);

    return {
      groups: duplicateGroups,
      totalIssues: issues.length,
      duplicateCount: totalDuplicates,
      closedCount,
    };
  }

  /**
   * Group issues by summary
   */
  private groupBySummary(issues: JiraIssue[]): DuplicateGroup[] {
    const summaryMap = new Map<string, JiraIssue[]>();

    for (const issue of issues) {
      const existing = summaryMap.get(issue.summary) || [];
      existing.push(issue);
      summaryMap.set(issue.summary, existing);
    }

    const groups: DuplicateGroup[] = [];

    for (const [summary, groupIssues] of summaryMap) {
      // Sort by created date (oldest first)
      const sorted = groupIssues.sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      );

      groups.push({
        summary,
        issues: sorted,
        keepIssue: sorted[0],
        duplicates: sorted.slice(1),
      });
    }

    return groups;
  }

  /**
   * Search for issues using JQL
   */
  private async searchIssues(summaryPattern: string): Promise<JiraIssue[]> {
    if (!this.domain || !this.auth) {
      throw new Error('JIRA credentials not configured');
    }

    const jql = encodeURIComponent(`summary ~ "${summaryPattern}" ORDER BY created ASC`);
    const url = `${getApiBaseUrl(this.domain)}/search?jql=${jql}&fields=summary,status,created`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`JQL search failed: ${response.status}`);
    }

    const data = await response.json();
    return (data.issues || []).map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      created: issue.fields.created,
      url: `https://${this.domain}/browse/${issue.key}`,
    }));
  }

  /**
   * Close an issue with duplicate comment
   */
  private async closeIssue(issueKey: string, originalKey: string): Promise<void> {
    // First, add comment
    await this.addComment(issueKey, originalKey);

    // Then, transition to closed
    const transitions = await this.getTransitions(issueKey);

    // Find "Won't Do" or "Done" transition
    const closeTransition = transitions.find(
      (t: any) =>
        t.name === "Won't Do" ||
        t.name === 'Done' ||
        t.name === 'Closed' ||
        t.to?.name === "Won't Do" ||
        t.to?.name === 'Done'
    );

    if (!closeTransition) {
      throw new Error(`No close transition found. Available: ${transitions.map((t: any) => t.name).join(', ')}`);
    }

    const url = `${getApiBaseUrl(this.domain)}/issue/${issueKey}/transitions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transition: { id: closeTransition.id },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to transition issue: ${response.status} - ${error}`);
    }
  }

  /**
   * Get available transitions for an issue
   */
  private async getTransitions(issueKey: string): Promise<any[]> {
    const url = `${getApiBaseUrl(this.domain)}/issue/${issueKey}/transitions`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get transitions: ${response.status}`);
    }

    const data = await response.json();
    return data.transitions || [];
  }

  /**
   * Add duplicate comment to issue
   */
  private async addComment(issueKey: string, originalKey: string): Promise<void> {
    const url = `${getApiBaseUrl(this.domain)}/issue/${issueKey}/comment`;

    const commentText = `h2. Duplicate of ${originalKey}

This issue was automatically closed by SpecWeave cleanup because it is a duplicate.

The original issue (${originalKey}) contains the same content and should be used for tracking instead.`;

    // Use format adapter for correct format (ADF for Cloud, wiki for Server)
    const body = toCommentBody(commentText, this.domain);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      // Non-fatal, just log warning
      this.logger.log(`     ⚠️  Failed to add comment to ${issueKey}`);
    }
  }
}

/**
 * Convenience function for quick duplicate cleanup
 */
export async function cleanupJiraDuplicates(
  featureId: string,
  dryRun: boolean = false
): Promise<{
  groups: DuplicateGroup[];
  totalIssues: number;
  duplicateCount: number;
  closedCount: number;
}> {
  const detector = new JiraDuplicateDetector();
  return detector.cleanupFeatureDuplicates(featureId, dryRun);
}

export default JiraDuplicateDetector;
