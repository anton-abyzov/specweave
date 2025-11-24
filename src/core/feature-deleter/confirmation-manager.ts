/**
 * Confirmation Manager - Multi-gate confirmation UX
 * Increment: 0053-safe-feature-deletion
 * Tasks: T-004, T-015, T-017, T-018, T-026
 */

import { Logger, consoleLogger } from '../../utils/logger.js';
import { ValidationResult, DeletionOptions } from './types.js';
import * as readline from 'readline';

/**
 * Confirmation Manager - 4-tier safety gates
 * Tier 1: Validation Report (auto-show)
 * Tier 2: Primary Confirmation (y/N)
 * Tier 3: Elevated Confirmation (type "delete" - force mode only)
 * Tier 4: GitHub Confirmation (y/N - if GitHub cleanup needed)
 */
export class ConfirmationManager {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || consoleLogger;
  }

  /**
   * T-004, T-015: Get confirmation from user (multi-gate pattern)
   */
  async confirm(validation: ValidationResult, options: DeletionOptions): Promise<boolean> {
    // Tier 1: Validation Report (already shown by validator)

    // Tier 2: Primary Confirmation
    if (!options.yes && !options.dryRun) {
      const primaryConfirmed = await this.primaryConfirmation(validation);
      if (!primaryConfirmed) {
        return false;
      }
    }

    // Tier 3: Elevated Confirmation (force mode only)
    if (options.force && !options.dryRun) {
      const elevatedConfirmed = await this.elevatedConfirmation(validation);
      if (!elevatedConfirmed) {
        return false;
      }
    }

    return true;
  }

  /**
   * T-026: GitHub confirmation (separate gate)
   */
  async confirmGitHub(issueCount: number, options: DeletionOptions): Promise<boolean> {
    if (options.noGithub || options.dryRun) {
      return false;
    }

    if (options.yes) {
      return true;
    }

    const answer = await this.prompt(`Close ${issueCount} GitHub issue(s)? (y/N): `);
    return answer.toLowerCase() === 'y';
  }

  /**
   * T-004: Primary confirmation (y/N)
   */
  private async primaryConfirmation(validation: ValidationResult): Promise<boolean> {
    const filesCount = validation.files.length;
    const answer = await this.prompt(`Delete feature ${validation.featureId} (${filesCount} files)? (y/N): `);
    return answer.toLowerCase() === 'y';
  }

  /**
   * T-017: Elevated confirmation (type "delete" - force mode)
   */
  private async elevatedConfirmation(validation: ValidationResult): Promise<boolean> {
    console.log('');
    console.log('⚠️  WARNING: Force deletion will orphan active increments!');
    console.log(`   Affected increments: ${validation.orphanedIncrements.join(', ')}`);
    console.log(`   Their metadata will be updated (feature_id removed).`);
    console.log('');

    const answer = await this.prompt('Type "delete" to confirm force deletion: ');
    return answer === 'delete'; // Exact match, case-sensitive
  }

  /**
   * Prompt user for input
   */
  private prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}
