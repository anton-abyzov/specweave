/**
 * Skill Activation Debug Logger
 *
 * Logs skill matching decisions when SPECWEAVE_DEBUG_SKILLS=1
 *
 * @module core/plugins/skill-activation-logger
 */

import * as fs from 'fs';
import * as path from 'path';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface SkillActivationEvent {
  timestamp: string;
  prompt: string;
  matchedSkills: Array<{
    fqn: string;
    score: number;
    matchedKeywords: string[];
  }>;
  rejectedSkills: Array<{
    fqn: string;
    reason: string;
  }>;
}

/**
 * Skill Activation Logger
 */
export class SkillActivationLogger {
  private enabled: boolean;
  private logFilePath: string;

  constructor(projectRoot: string) {
    this.enabled = process.env.SPECWEAVE_DEBUG_SKILLS === '1';
    this.logFilePath = path.join(projectRoot, '.specweave/logs/skill-activation.log');
  }

  /**
   * Log a skill activation event
   */
  logActivation(event: SkillActivationEvent): void {
    if (!this.enabled) return;

    const logEntry = this.formatLogEntry(event);

    // Log to console
    logger.info('Skill Activation Event:');
    logger.info(`  Prompt: "${event.prompt}"`);
    logger.info(`  Matched: ${event.matchedSkills.length} skills`);
    logger.info(`  Rejected: ${event.rejectedSkills.length} skills`);

    // Write to log file
    try {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      fs.appendFileSync(this.logFilePath, logEntry + '\n\n');
    } catch (error) {
      logger.error(`Failed to write skill activation log: ${error}`);
    }
  }

  /**
   * Format log entry
   */
  private formatLogEntry(event: SkillActivationEvent): string {
    const sections: string[] = [
      `[${event.timestamp}] Skill Activation`,
      `Prompt: "${event.prompt}"`
    ];

    if (event.matchedSkills.length > 0) {
      const matchedLines = event.matchedSkills.map(skill =>
        `  - ${skill.fqn} (score: ${Math.round(skill.score * 100)}%)\n    Keywords: ${skill.matchedKeywords.join(', ')}`
      );
      sections.push('', '✅ Matched Skills:', ...matchedLines);
    }

    if (event.rejectedSkills.length > 0) {
      const rejectedLines = event.rejectedSkills.map(skill =>
        `  - ${skill.fqn}: ${skill.reason}`
      );
      sections.push('', '❌ Rejected Skills:', ...rejectedLines);
    }

    return sections.join('\n');
  }

  /**
   * Clear log file
   */
  clearLogs(): void {
    if (fs.existsSync(this.logFilePath)) {
      fs.unlinkSync(this.logFilePath);
      logger.info('Skill activation logs cleared');
    }
  }

  /**
   * Get log file path
   */
  getLogPath(): string {
    return this.logFilePath;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Global logger instance
 */
let globalLogger: SkillActivationLogger | null = null;

/**
 * Get or create global logger
 */
export function getSkillActivationLogger(projectRoot?: string): SkillActivationLogger {
  if (!globalLogger) {
    if (!projectRoot) {
      throw new Error('Skill activation logger not initialized');
    }
    globalLogger = new SkillActivationLogger(projectRoot);
  }
  return globalLogger;
}

/**
 * Log skill activation (convenience function)
 */
export function logSkillActivation(
  prompt: string,
  matchedSkills: Array<{ fqn: string; score: number; matchedKeywords: string[] }>,
  rejectedSkills: Array<{ fqn: string; reason: string }> = []
): void {
  try {
    getSkillActivationLogger(process.cwd()).logActivation({
      timestamp: new Date().toISOString(),
      prompt,
      matchedSkills,
      rejectedSkills
    });
  } catch {
    // Silently fail if logger not initialized
  }
}
