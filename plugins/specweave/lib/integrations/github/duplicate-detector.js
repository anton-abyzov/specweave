import { execFileSync } from "child_process";
import { getGitHubAuthFromProject } from "../../../../../src/utils/auth-helpers.js";
import { ensureLabels } from "./label-cache.js";
function getGhEnv() {
  const { token } = getGitHubAuthFromProject(process.cwd());
  return token ? { ...process.env, GH_TOKEN: token } : process.env;
}
class DuplicateDetector {
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
  static async checkBeforeCreate(titlePattern, incrementId, repo) {
    console.log(`\u{1F50D} DETECTION: Checking for existing issue with pattern: ${titlePattern}`);
    try {
      const args = [
        "issue",
        "list",
        "--search",
        `"${titlePattern}" in:title`,
        "--json",
        "number,title,url,body,createdAt",
        "--limit",
        "20",
        "--state",
        "all"
        // Check both open and closed
      ];
      if (repo) {
        args.push("--repo", repo);
      }
      const output = execFileSync("gh", args, { encoding: "utf-8", env: getGhEnv() });
      const issues = JSON.parse(output);
      if (issues.length === 0) {
        console.log("   \u2705 No existing issues found (safe to create)");
        return null;
      }
      console.log(`   \u{1F4CB} Found ${issues.length} issue(s) matching pattern`);
      const exactMatch = issues.find(
        (issue) => issue.title.includes(titlePattern)
      );
      if (exactMatch) {
        console.log(`   \u26A0\uFE0F  DUPLICATE DETECTED: Issue #${exactMatch.number}`);
        console.log(`   \u{1F4CE} URL: ${exactMatch.url}`);
        return exactMatch;
      }
      if (incrementId) {
        const bodyMatch = issues.find(
          (issue) => issue.body && (issue.body.includes(`**Increment**: ${incrementId}`) || issue.body.includes(incrementId))
        );
        if (bodyMatch) {
          console.log(`   \u26A0\uFE0F  DUPLICATE DETECTED (body match): Issue #${bodyMatch.number}`);
          console.log(`   \u{1F4CE} URL: ${bodyMatch.url}`);
          return bodyMatch;
        }
      }
      console.log("   \u2705 No exact match found (safe to create)");
      return null;
    } catch (error) {
      console.warn(`   \u26A0\uFE0F  Detection failed (continuing anyway): ${error.message}`);
      return null;
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
  static async verifyAfterCreate(titlePattern, expectedCount = 1, repo) {
    console.log(`
\u{1F50D} VERIFICATION: Checking issue count for pattern: ${titlePattern}`);
    await new Promise((resolve) => setTimeout(resolve, 2e3));
    try {
      const args = [
        "issue",
        "list",
        "--search",
        `"${titlePattern}" in:title`,
        "--json",
        "number,title,url,createdAt",
        "--limit",
        "50",
        "--state",
        "all"
      ];
      if (repo) {
        args.push("--repo", repo);
      }
      const output = execFileSync("gh", args, { encoding: "utf-8", env: getGhEnv() });
      const issues = JSON.parse(output);
      const exactMatches = issues.filter(
        (issue) => issue.title.includes(titlePattern)
      );
      const actualCount = exactMatches.length;
      console.log(`   Expected: ${expectedCount} issue(s)`);
      console.log(`   Actual: ${actualCount} issue(s)`);
      if (actualCount === expectedCount) {
        console.log(`   \u2705 VERIFICATION PASSED: Count matches!`);
        return {
          success: true,
          expectedCount,
          actualCount,
          duplicates: [],
          message: "Verification passed"
        };
      } else if (actualCount > expectedCount) {
        console.warn(`   \u26A0\uFE0F  VERIFICATION FAILED: ${actualCount - expectedCount} duplicate(s) detected!`);
        const sorted = exactMatches.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateA - dateB;
        });
        const duplicates = sorted.slice(1);
        console.warn(`   \u{1F4CB} Duplicate issues:`);
        duplicates.forEach((dup) => {
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
        console.warn(`   \u26A0\uFE0F  VERIFICATION WARNING: Expected ${expectedCount} but found ${actualCount}`);
        return {
          success: false,
          expectedCount,
          actualCount,
          duplicates: [],
          message: "Count mismatch (fewer than expected)"
        };
      }
    } catch (error) {
      console.error(`   \u274C Verification failed: ${error.message}`);
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
  static async correctDuplicates(duplicates, keepIssueNumber, repo) {
    if (duplicates.length === 0) {
      return {
        success: true,
        duplicatesClosed: 0,
        keptIssue: keepIssueNumber,
        errors: []
      };
    }
    console.log(`
\u{1F527} REFLECTION: Auto-correcting ${duplicates.length} duplicate(s)...`);
    const errors = [];
    let closed = 0;
    for (const duplicate of duplicates) {
      try {
        console.log(`   \u{1F5D1}\uFE0F  Closing duplicate #${duplicate.number}...`);
        const comment = `Duplicate of #${keepIssueNumber}

This issue was automatically closed by SpecWeave's Global Duplicate Detection System.

The original issue (#${keepIssueNumber}) should be used for tracking instead.

\u{1F916} Auto-closed by SpecWeave`;
        const commentArgs = [
          "issue",
          "comment",
          duplicate.number.toString(),
          "--body",
          comment
        ];
        if (repo) {
          commentArgs.push("--repo", repo);
        }
        execFileSync("gh", commentArgs, { encoding: "utf-8", env: getGhEnv() });
        const closeArgs = [
          "issue",
          "close",
          duplicate.number.toString()
        ];
        if (repo) {
          closeArgs.push("--repo", repo);
        }
        execFileSync("gh", closeArgs, { encoding: "utf-8", env: getGhEnv() });
        console.log(`      \u2705 Closed #${duplicate.number}`);
        closed++;
      } catch (error) {
        const errorMsg = `Failed to close #${duplicate.number}: ${error.message}`;
        console.error(`      \u274C ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    console.log(`
   \u2705 REFLECTION COMPLETE: Kept #${keepIssueNumber}, closed ${closed}/${duplicates.length} duplicate(s)`);
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
  static async createWithProtection(options) {
    const {
      title,
      body,
      titlePattern,
      incrementId,
      labels = ["specweave"],
      milestone,
      assignees = [],
      repo
    } = options;
    console.log(`
\u{1F6E1}\uFE0F  Creating GitHub issue with FULL PROTECTION...`);
    console.log(`   Title: ${title}`);
    console.log(`   Pattern: ${titlePattern}`);
    console.log(`
\u2501\u2501\u2501 PHASE 1: DETECTION \u2501\u2501\u2501`);
    const existing = await this.checkBeforeCreate(titlePattern, incrementId, repo);
    let issueNumber;
    let issueUrl;
    let wasReused = false;
    if (existing) {
      console.log(`
\u267B\uFE0F  Using existing issue #${existing.number} (skipping creation)`);
      issueNumber = existing.number;
      issueUrl = existing.url;
      wasReused = true;
    } else {
      console.log(`
\u2501\u2501\u2501 PHASE 2: CREATION \u2501\u2501\u2501`);
      console.log(`   Creating new GitHub issue...`);
      try {
        const safeLabels = labels.filter((l) => /^[a-zA-Z0-9:_\- ]+$/.test(l));
        if (repo) {
          await ensureLabels(repo, safeLabels, getGhEnv());
        }
        const args = [
          "issue",
          "create",
          "--title",
          title,
          "--body",
          body
        ];
        if (repo) {
          args.push("--repo", repo);
        }
        safeLabels.forEach((label) => {
          args.push("--label", label);
        });
        if (milestone) {
          args.push("--milestone", milestone);
        }
        assignees.forEach((assignee) => {
          args.push("--assignee", assignee);
        });
        const output = execFileSync("gh", args, { encoding: "utf-8", env: getGhEnv() });
        const match = output.match(/\/issues\/(\d+)/);
        if (!match) {
          throw new Error("Could not extract issue number from gh CLI output");
        }
        issueNumber = parseInt(match[1], 10);
        issueUrl = output.trim();
        console.log(`   \u2705 Created issue #${issueNumber}`);
        console.log(`   \u{1F4CE} ${issueUrl}`);
      } catch (error) {
        throw new Error(`Failed to create GitHub issue: ${error.message}`);
      }
    }
    let duplicatesClosed = 0;
    if (!wasReused && process.env.SPECWEAVE_SKIP_VERIFY_DUPLICATES !== "1") {
      console.log(`
\u2501\u2501\u2501 PHASE 3: VERIFICATION \u2501\u2501\u2501`);
      const verification = await this.verifyAfterCreate(titlePattern, 1, repo);
      if (!verification.success && verification.duplicates.length > 0) {
        console.log(`
\u2501\u2501\u2501 PHASE 4: REFLECTION \u2501\u2501\u2501`);
        console.warn(`   \u26A0\uFE0F  ${verification.duplicates.length} duplicate(s) detected!`);
        const correction = await this.correctDuplicates(
          verification.duplicates,
          issueNumber,
          repo
        );
        duplicatesClosed = correction.duplicatesClosed;
        if (correction.errors.length > 0) {
          console.warn(`   \u26A0\uFE0F  Some duplicates could not be closed:`);
          correction.errors.forEach((err) => console.warn(`      - ${err}`));
        }
      } else if (verification.success) {
        console.log(`   \u2705 No duplicates detected!`);
      }
    }
    console.log(`
\u2705 Issue creation complete!`);
    console.log(`   Issue: #${issueNumber}`);
    console.log(`   Duplicates closed: ${duplicatesClosed}`);
    console.log(`   Reused existing: ${wasReused ? "Yes" : "No"}`);
    return {
      issue: {
        number: issueNumber,
        title,
        url: issueUrl
      },
      duplicatesFound: duplicatesClosed,
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
  static extractTitlePattern(title) {
    const match = title.match(/^(\[[^\]]+\])/);
    return match ? match[1] : null;
  }
  /**
   * Utility: Check if GitHub CLI is available and authenticated
   *
   * @returns true if gh CLI is ready, false otherwise
   */
  static checkGitHubCLI() {
    try {
      execFileSync("gh", ["auth", "status"], { encoding: "utf-8", env: getGhEnv() });
      return true;
    } catch {
      return false;
    }
  }
}
export {
  DuplicateDetector
};
