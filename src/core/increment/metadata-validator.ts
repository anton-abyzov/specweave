/**
 * Metadata Validator - Validates increment metadata consistency
 *
 * Ensures metadata.json accurately reflects increment reality:
 * - Status matches task completion
 * - Timestamps are present and valid
 * - GitHub sync data is consistent
 */

import * as fs from '../../utils/fs-native.js';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { IncrementStatusDetector } from './increment-status.js';
import { validateIncrementId } from '../../utils/increment-id-validator.js';

/**
 * Validates that a GitHub issue number is a safe positive integer.
 * Prevents command injection via malicious issue numbers in metadata.json.
 */
function validateIssueNumber(issueNumber: unknown): number {
  const num = typeof issueNumber === 'string' ? parseInt(issueNumber, 10) : issueNumber;
  if (!Number.isInteger(num) || (num as number) <= 0) {
    throw new Error(`Invalid GitHub issue number: ${issueNumber}. Must be a positive integer.`);
  }
  return num as number;
}

export interface MetadataValidationResult {
  valid: boolean;
  incrementId: string;
  issues: MetadataIssue[];
}

export interface MetadataIssue {
  type: 'missing_file' | 'invalid_json' | 'status_mismatch' | 'missing_timestamp' | 'github_mismatch';
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export class MetadataValidator {
  private projectRoot: string;
  private detector: IncrementStatusDetector;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.detector = new IncrementStatusDetector(projectRoot);
  }

  /**
   * Validate metadata for a specific increment
   */
  async validate(incrementId: string): Promise<MetadataValidationResult> {
    // SECURITY: Validate increment ID to prevent path traversal
    validateIncrementId(incrementId);

    const issues: MetadataIssue[] = [];
    const metadataPath = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      incrementId,
      'metadata.json'
    );

    // Check file exists
    if (!await fs.pathExists(metadataPath)) {
      issues.push({
        type: 'missing_file',
        message: `metadata.json not found for increment ${incrementId}`,
        severity: 'warning',
        suggestion: 'Metadata file will be created automatically when needed'
      });
      return { valid: false, incrementId, issues };
    }

    // Parse JSON
    let metadata: any;
    try {
      metadata = await fs.readJson(metadataPath);
    } catch (error) {
      issues.push({
        type: 'invalid_json',
        message: `metadata.json is invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        suggestion: 'Fix JSON syntax or delete file to regenerate'
      });
      return { valid: false, incrementId, issues };
    }

    // Get actual status from tasks.md
    const actualStatus = await this.detector.getStatus(incrementId);

    // Validate status field
    if (!metadata.status) {
      issues.push({
        type: 'status_mismatch',
        message: 'Missing status field in metadata.json',
        severity: 'error',
        suggestion: 'Add status field: "active", "paused", "completed", or "abandoned"'
      });
    } else if (metadata.status === 'completed' && !actualStatus.isComplete) {
      issues.push({
        type: 'status_mismatch',
        message: `Status is "completed" but ${actualStatus.pendingTasks.length} tasks remain`,
        severity: 'error',
        suggestion: `Either complete remaining tasks or change status to "active"`
      });
    } else if (metadata.status === 'active' && actualStatus.isComplete) {
      issues.push({
        type: 'status_mismatch',
        message: 'All tasks complete but status is still "active"',
        severity: 'warning',
        suggestion: 'Update status to "completed" or close increment via /sw:done'
      });
    }

    // Validate timestamps
    if (metadata.status === 'completed' && !metadata.completed) {
      issues.push({
        type: 'missing_timestamp',
        message: 'Status is "completed" but no completion timestamp',
        severity: 'warning',
        suggestion: 'Add "completed" field with ISO timestamp'
      });
    }

    if (metadata.status === 'paused' && !metadata.paused) {
      issues.push({
        type: 'missing_timestamp',
        message: 'Status is "paused" but no pause timestamp',
        severity: 'warning',
        suggestion: 'Add "paused" field with ISO timestamp'
      });
    }

    // Validate GitHub sync
    if (metadata.github?.issue) {
      // SECURITY: Validate issue number to prevent command injection
      let issueNumber: number;
      try {
        issueNumber = validateIssueNumber(metadata.github.issue);
      } catch {
        issues.push({
          type: 'github_mismatch',
          message: `Invalid GitHub issue number in metadata: ${metadata.github.issue}`,
          severity: 'error',
          suggestion: 'Fix or remove the invalid github.issue field in metadata.json'
        });
        return { valid: false, incrementId, issues };
      }

      // Check if gh CLI is available
      try {
        execSync('gh --version', { stdio: 'ignore' });

        // SECURITY: Use execFileSync with array args to prevent injection
        const issueOutput = execFileSync('gh', [
          'issue', 'view', String(issueNumber),
          '--json', 'state',
          '--jq', '.state'
        ], {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        const issueState = issueOutput;

        if (issueState === 'CLOSED' && metadata.status !== 'completed' && metadata.status !== 'abandoned') {
          issues.push({
            type: 'github_mismatch',
            message: `GitHub issue #${issueNumber} is closed but increment status is "${metadata.status}"`,
            severity: 'warning',
            suggestion: 'Update increment status to match GitHub issue state'
          });
        } else if (issueState === 'OPEN' && metadata.status === 'completed') {
          issues.push({
            type: 'github_mismatch',
            message: `Increment is completed but GitHub issue #${issueNumber} is still open`,
            severity: 'warning',
            suggestion: `Close GitHub issue manually or run post-increment-completion hook`
          });
        }
      } catch (error) {
        // gh CLI not available or issue not found - skip check
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      incrementId,
      issues
    };
  }

  /**
   * Validate all increments
   */
  async validateAll(): Promise<Map<string, MetadataValidationResult>> {
    const results = new Map<string, MetadataValidationResult>();
    const incrementsDir = path.join(this.projectRoot, '.specweave', 'increments');

    if (!await fs.pathExists(incrementsDir)) {
      return results;
    }

    const entries = await fs.readdir(incrementsDir, { withFileTypes: true });
    const incrementDirs = entries
      .filter(entry => entry.isDirectory())
      .filter(entry => /^\d{3,4}E?-/.test(entry.name));

    for (const dir of incrementDirs) {
      const result = await this.validate(dir.name);
      results.set(dir.name, result);
    }

    return results;
  }
}
