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
    const lines: string[] = [];

    lines.push(`[${event.timestamp}] Skill Activation`);
    lines.push(`Prompt: "${event.prompt}"`);
    lines.push('');

    // Matched skills
    if (event.matchedSkills.length > 0) {
      lines.push('✅ Matched Skills:');
      event.matchedSkills.forEach(skill => {
        lines.push(`  - ${skill.fqn} (score: ${Math.round(skill.score * 100)}%)`);
        lines.push(`    Keywords: ${skill.matchedKeywords.join(', ')}`);
      });
      lines.push('');
    }

    // Rejected skills
    if (event.rejectedSkills.length > 0) {
      lines.push('❌ Rejected Skills:');
      event.rejectedSkills.forEach(skill => {
        lines.push(`  - ${skill.fqn}: ${skill.reason}`);
      });
      lines.push('');
    }

    return lines.join('\n');
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
  if (!globalLogger && projectRoot) {
    globalLogger = new SkillActivationLogger(projectRoot);
  }
  if (!globalLogger) {
    throw new Error('Skill activation logger not initialized');
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
    const logger = getSkillActivationLogger(process.cwd());
    logger.logActivation({
      timestamp: new Date().toISOString(),
      prompt,
      matchedSkills,
      rejectedSkills
    });
  } catch (error) {
    // Silently fail if logger not initialized
  }
}
