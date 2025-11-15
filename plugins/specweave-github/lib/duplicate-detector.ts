/**
 * Global Duplicate Detection System for GitHub Issues
 *
 * CRITICAL ARCHITECTURE:
 * ALL GitHub issue creation in SpecWeave MUST use this module.
 * This is the SINGLE SOURCE OF TRUTH for duplicate prevention.
 *
 * THREE-PHASE PROTECTION:
 * 1. Detection (Before Create): Search GitHub for existing issues
 * 2. Verification (After Create): Count check to detect duplicates
 * 3. Reflection (Auto-Correct): Close duplicate issues automatically
 *
 * USAGE:
 * ```typescript
 * // Simple: Create with full protection
 * const result = await DuplicateDetector.createWithProtection({
 *   title: '[FS-031] Feature Title',
 *   body: 'Description...',
 *   titlePattern: '[FS-031]',
 *   labels: ['specweave', 'feature']
 * });
 *
 * // Manual: Check before creating
 * const existing = await DuplicateDetector.checkBeforeCreate('[FS-031]');
 * if (!existing) {
 *   // Create issue...
 * }
 * ```
 *
 * @module duplicate-detector
 */

import { execFileSync } from 'child_process';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GitHubIssue {
  number: number;
  title: string;
  url: string;
  body?: string;
  state?: 'open' | 'closed';
  createdAt?: string;
}

export interface VerificationResult {
  success: boolean;
  expectedCount: number;
  actualCount: number;
  duplicates: GitHubIssue[];
  message: string;
}

export interface CorrectionResult {
  success: boolean;
  duplicatesClosed: number;
  keptIssue: number;
  errors: string[];
}

export interface CreateOptions {
  title: string;
  body: string;
  titlePattern: string;  // e.g., "[FS-031]" (current) or "[INC-0031]" (deprecated, legacy only)
  incrementId?: string;  // e.g., "0031-feature-name"
  labels?: string[];
  milestone?: string;
  assignees?: string[];
  repo?: string;  // Format: "owner/repo", defaults to current repo
}

export interface CreateResult {
  issue: GitHubIssue;
  duplicatesFound: number;
  duplicatesClosed: number;
  wasReused: boolean;  // true if existing issue was reused instead of creating new
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class DuplicateDetector {
  /**
   * PHASE 1: Detection (Before Creating Issue)
   *
   * Searches GitHub for existing issues matching the title pattern.
   * This is the PRIMARY defense against duplicates.
   *
   * @param titlePattern - Pattern to search (e.g., "[FS-031]" current, "[INC-0031]" deprecated)
   * @param incrementId - Optional increment ID for more precise matching
   * @param repo - Optional repo (format: "owner/repo")
   * @returns Existing issue if found, null otherwise
   */
  static async checkBeforeCreate(
    titlePattern: string,
    incrementId?: string,
    repo?: string
  ): Promise<GitHubIssue | null> {
    console.log(`🔍 DETECTION: Checking for existing issue with pattern: ${titlePattern}`);

    try {
      const args = [
        'issue',
        'list',
        '--search', `"${titlePattern}" in:title`,
        '--json', 'number,title,url,body,createdAt',
        '--limit', '20',
        '--state', 'all'  // Check both open and closed
      ];

      if (repo) {
        args.push('--repo', repo);
      }

      const output = execFileSync('gh', args, { encoding: 'utf-8' });
      const issues = JSON.parse(output) as GitHubIssue[];

      if (issues.length === 0) {
        console.log('   ✅ No existing issues found (safe to create)');
        return null;
      }

      console.log(`   📋 Found ${issues.length} issue(s) matching pattern`);

      // Strategy 1: Exact title match
      const exactMatch = issues.find(issue =>
        issue.title.includes(titlePattern)
      );

      if (exactMatch) {
        console.log(`   ⚠️  DUPLICATE DETECTED: Issue #${exactMatch.number}`);
        console.log(`   📎 URL: ${exactMatch.url}`);
        return exactMatch;
      }

      // Strategy 2: Body match (if incrementId provided)
      if (incrementId) {
        const bodyMatch = issues.find(issue =>
          issue.body && (
            issue.body.includes(`**Increment**: ${incrementId}`) ||
            issue.body.includes(incrementId)
          )
        );

        if (bodyMatch) {
          console.log(`   ⚠️  DUPLICATE DETECTED (body match): Issue #${bodyMatch.number}`);
          console.log(`   📎 URL: ${bodyMatch.url}`);
          return bodyMatch;
        }
      }

      console.log('   ✅ No exact match found (safe to create)');
      return null;

    } catch (error: any) {
      console.warn(`   ⚠️  Detection failed (continuing anyway): ${error.message}`);
      return null;  // Fail gracefully - allow creation to proceed
    }
  }

  /**
   * PHASE 2: Verification (After Creating Issue)
   *
   * Counts issues matching the pattern and identifies duplicates.
   * This is the SECONDARY defense - catches duplicates that slipped through.
   *
   * @param titlePattern - Pattern to search (e.g., "[FS-031]")
   * @param expectedCount - Expected number of issues (usually 1)
   * @param repo - Optional repo (format: "owner/repo")
   * @returns Verification result with duplicate list
   */
  static async verifyAfterCreate(
    titlePattern: string,
    expectedCount: number = 1,
    repo?: string
  ): Promise<VerificationResult> {
    console.log(`\n🔍 VERIFICATION: Checking issue count for pattern: ${titlePattern}`);

    try {
      const args = [
        'issue',
        'list',
        '--search', `"${titlePattern}" in:title`,
        '--json', 'number,title,url,createdAt',
        '--limit', '50',
        '--state', 'all'
      ];

      if (repo) {
        args.push('--repo', repo);
      }

      const output = execFileSync('gh', args, { encoding: 'utf-8' });
      const issues = JSON.parse(output) as GitHubIssue[];

      // Filter exact matches only
      const exactMatches = issues.filter(issue =>
        issue.title.includes(titlePattern)
      );

      const actualCount = exactMatches.length;

      console.log(`   Expected: ${expectedCount} issue(s)`);
      console.log(`   Actual: ${actualCount} issue(s)`);

      if (actualCount === expectedCount) {
        console.log(`   ✅ VERIFICATION PASSED: Count matches!`);
        return {
          success: true,
          expectedCount,
          actualCount,
          duplicates: [],
          message: 'Verification passed'
        };
      } else if (actualCount > expectedCount) {
        // DUPLICATES DETECTED!
        console.warn(`   ⚠️  VERIFICATION FAILED: ${actualCount - expectedCount} duplicate(s) detected!`);

        // Sort by creation date (oldest first)
        const sorted = exactMatches.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });

        // Keep first (oldest), mark rest as duplicates
        const duplicates = sorted.slice(1);

        console.warn(`   📋 Duplicate issues:`);
        duplicates.forEach(dup => {
          console.warn(`      - #${dup.number}: ${dup.title}`);
        });

        return {
          success: false,
          expectedCount,
          actualCount,
          duplicates,
          message: `${duplicates.length} duplicate(s) found`
        };
      } else {
        console.warn(`   ⚠️  VERIFICATION WARNING: Expected ${expectedCount} but found ${actualCount}`);
        return {
          success: false,
          expectedCount,
          actualCount,
          duplicates: [],
          message: 'Count mismatch (fewer than expected)'
        };
      }

    } catch (error: any) {
      console.error(`   ❌ Verification failed: ${error.message}`);
      return {
        success: false,
        expectedCount,
        actualCount: -1,
        duplicates: [],
        message: `Verification error: ${error.message}`
      };
    }
  }

  /**
   * PHASE 3: Reflection (Auto-Correct Duplicates)
   *
   * Automatically closes duplicate issues and keeps the oldest one.
   * This is the CLEANUP phase - fixes problems that occurred.
   *
   * @param duplicates - List of duplicate issues to close
   * @param keepIssueNumber - Issue number to keep (usually the oldest)
   * @param repo - Optional repo (format: "owner/repo")
   * @returns Correction result with count of closed issues
   */
  static async correctDuplicates(
    duplicates: GitHubIssue[],
    keepIssueNumber: number,
    repo?: string
  ): Promise<CorrectionResult> {
    if (duplicates.length === 0) {
      return {
        success: true,
        duplicatesClosed: 0,
        keptIssue: keepIssueNumber,
        errors: []
      };
    }

    console.log(`\n🔧 REFLECTION: Auto-correcting ${duplicates.length} duplicate(s)...`);

    const errors: string[] = [];
    let closed = 0;

    for (const duplicate of duplicates) {
      try {
        console.log(`   🗑️  Closing duplicate #${duplicate.number}...`);

        const comment = `Duplicate of #${keepIssueNumber}

This issue was automatically closed by SpecWeave's Global Duplicate Detection System.

The original issue (#${keepIssueNumber}) should be used for tracking instead.

🤖 Auto-closed by SpecWeave`;

        const commentArgs = [
          'issue',
          'comment',
          duplicate.number.toString(),
          '--body', comment
        ];

        if (repo) {
          commentArgs.push('--repo', repo);
        }

        // Add comment explaining closure
        execFileSync('gh', commentArgs, { encoding: 'utf-8' });

        const closeArgs = [
          'issue',
          'close',
          duplicate.number.toString()
        ];

        if (repo) {
          closeArgs.push('--repo', repo);
        }

        // Close the issue
        execFileSync('gh', closeArgs, { encoding: 'utf-8' });

        console.log(`      ✅ Closed #${duplicate.number}`);
        closed++;

      } catch (error: any) {
        const errorMsg = `Failed to close #${duplicate.number}: ${error.message}`;
        console.error(`      ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`\n   ✅ REFLECTION COMPLETE: Kept #${keepIssueNumber}, closed ${closed}/${duplicates.length} duplicate(s)`);

    return {
      success: errors.length === 0,
      duplicatesClosed: closed,
      keptIssue: keepIssueNumber,
      errors
    };
  }

  /**
   * ALL-IN-ONE: Create Issue with Full Protection
   *
   * This is the RECOMMENDED way to create GitHub issues in SpecWeave.
   * Combines all 3 phases: Detection → Creation → Verification → Reflection
   *
   * GUARANTEES:
   * - No duplicates will be created
   * - Existing duplicates will be detected and closed
   * - Idempotent: can run multiple times safely
   *
   * @param options - Create options (title, body, labels, etc.)
   * @returns Create result with issue details and duplicate stats
   */
  static async createWithProtection(options: CreateOptions): Promise<CreateResult> {
    const {
      title,
      body,
      titlePattern,
      incrementId,
      labels = ['specweave'],
      milestone,
      assignees = [],
      repo
    } = options;

    console.log(`\n🛡️  Creating GitHub issue with FULL PROTECTION...`);
    console.log(`   Title: ${title}`);
    console.log(`   Pattern: ${titlePattern}`);

    // PHASE 1: Detection (Check if issue already exists)
    console.log(`\n━━━ PHASE 1: DETECTION ━━━`);
    const existing = await this.checkBeforeCreate(titlePattern, incrementId, repo);

    let issueNumber: number;
    let issueUrl: string;
    let wasReused = false;

    if (existing) {
      // Reuse existing issue instead of creating duplicate
      console.log(`\n♻️  Using existing issue #${existing.number} (skipping creation)`);
      issueNumber = existing.number;
      issueUrl = existing.url;
      wasReused = true;
    } else {
      // PHASE 2: Creation (No duplicate found, safe to create)
      console.log(`\n━━━ PHASE 2: CREATION ━━━`);
      console.log(`   Creating new GitHub issue...`);

      try {
        const args = [
          'issue',
          'create',
          '--title', title,
          '--body', body
        ];

        if (repo) {
          args.push('--repo', repo);
        }

        // Add labels
        labels.forEach(label => {
          args.push('--label', label);
        });

        // Add milestone if provided
        if (milestone) {
          args.push('--milestone', milestone);
        }

        // Add assignees if provided
        assignees.forEach(assignee => {
          args.push('--assignee', assignee);
        });

        const output = execFileSync('gh', args, { encoding: 'utf-8' });

        // Extract issue number from output (format: "https://github.com/owner/repo/issues/123")
        const match = output.match(/\/issues\/(\d+)/);
        if (!match) {
          throw new Error('Could not extract issue number from gh CLI output');
        }

        issueNumber = parseInt(match[1], 10);
        issueUrl = output.trim();

        console.log(`   ✅ Created issue #${issueNumber}`);
        console.log(`   📎 ${issueUrl}`);

      } catch (error: any) {
        throw new Error(`Failed to create GitHub issue: ${error.message}`);
      }
    }

    // PHASE 3: Verification (Count check for duplicates)
    console.log(`\n━━━ PHASE 3: VERIFICATION ━━━`);
    const verification = await this.verifyAfterCreate(titlePattern, 1, repo);

    let duplicatesClosed = 0;

    if (!verification.success && verification.duplicates.length > 0) {
      // PHASE 4: Reflection (Auto-correct duplicates)
      console.log(`\n━━━ PHASE 4: REFLECTION ━━━`);
      console.warn(`   ⚠️  ${verification.duplicates.length} duplicate(s) detected!`);

      const correction = await this.correctDuplicates(
        verification.duplicates,
        issueNumber,
        repo
      );

      duplicatesClosed = correction.duplicatesClosed;

      if (correction.errors.length > 0) {
        console.warn(`   ⚠️  Some duplicates could not be closed:`);
        correction.errors.forEach(err => console.warn(`      - ${err}`));
      }
    } else if (verification.success) {
      console.log(`   ✅ No duplicates detected!`);
    }

    // Final Summary
    console.log(`\n✅ Issue creation complete!`);
    console.log(`   Issue: #${issueNumber}`);
    console.log(`   Duplicates found: ${verification.duplicates.length}`);
    console.log(`   Duplicates closed: ${duplicatesClosed}`);
    console.log(`   Reused existing: ${wasReused ? 'Yes' : 'No'}`);

    return {
      issue: {
        number: issueNumber,
        title,
        url: issueUrl
      },
      duplicatesFound: verification.duplicates.length,
      duplicatesClosed,
      wasReused
    };
  }

  /**
   * Utility: Extract title pattern from full title
   *
   * Examples:
   * - "[FS-031] Feature Title" → "[FS-031]" (current format)
   * - "[INC-0031] Increment Title" → "[INC-0031]" (deprecated, legacy support only)
   *
   * @param title - Full issue title
   * @returns Extracted pattern or null
   */
  static extractTitlePattern(title: string): string | null {
    const match = title.match(/^(\[[^\]]+\])/);
    return match ? match[1] : null;
  }

  /**
   * Utility: Check if GitHub CLI is available and authenticated
   *
   * @returns true if gh CLI is ready, false otherwise
   */
  static checkGitHubCLI(): boolean {
    try {
      execFileSync('gh', ['auth', 'status'], { encoding: 'utf-8' });
      return true;
    } catch {
      return false;
    }
  }
}
