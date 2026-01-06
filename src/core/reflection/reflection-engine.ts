/**
 * Reflection Engine
 *
 * Core engine for detecting skills from learning content,
 * calculating confidence levels, and routing learnings to appropriate storage.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Learning, ConfidenceLevel, Signal } from './types.js';
import { MemoryManager } from './memory-manager.js';

export class ReflectionEngine {
  /**
   * Skill trigger keywords mapped from SKILL.md files
   * Loaded lazily on first use
   */
  private static skillTriggers: Map<string, string[]> | null = null;

  /**
   * Detect which skill a learning belongs to based on content and context
   * Returns skill name if confidence >70%, null otherwise
   */
  static detectSkill(content: string, context?: string): string | null {
    const triggers = this.getSkillTriggers();
    const searchText = `${content} ${context || ''}`.toLowerCase();

    const matches: Array<{ skill: string; score: number }> = [];

    for (const [skill, keywords] of triggers.entries()) {
      let score = 0;
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      if (score > 0) {
        matches.push({ skill, score });
      }
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    // Calculate confidence: score / total_keywords_for_skill
    const topMatch = matches[0];
    const skillKeywords = triggers.get(topMatch.skill) || [];
    const confidence = topMatch.score / skillKeywords.length;

    // Return skill if confidence >70%
    return confidence > 0.7 ? topMatch.skill : null;
  }

  /**
   * Load skill triggers from SKILL.md files
   * Caches result for performance
   */
  private static getSkillTriggers(): Map<string, string[]> {
    if (this.skillTriggers) {
      return this.skillTriggers;
    }

    this.skillTriggers = new Map();

    // Try to load from plugins directory
    const pluginsPath = path.join(
      process.cwd(),
      '.specweave',
      'plugins',
      'specweave',
      'skills'
    );

    if (!fs.existsSync(pluginsPath)) {
      return this.skillTriggers;
    }

    const skillDirs = fs.readdirSync(pluginsPath, { withFileTypes: true });

    for (const dir of skillDirs) {
      if (!dir.isDirectory()) continue;

      const skillPath = path.join(pluginsPath, dir.name, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;

      try {
        const content = fs.readFileSync(skillPath, 'utf-8');
        const triggers = this.extractTriggersFromSkill(content);
        if (triggers.length > 0) {
          this.skillTriggers.set(dir.name, triggers);
        }
      } catch (error) {
        console.warn(`Failed to read skill file for ${dir.name}:`, error);
      }
    }

    return this.skillTriggers;
  }

  /**
   * Extract trigger keywords from SKILL.md content
   * Looks for "Activates for:" section
   */
  private static extractTriggersFromSkill(content: string): string[] {
    const activatesMatch = content.match(/Activates for:([^\n]+)/i);
    if (!activatesMatch) {
      return [];
    }

    const triggersText = activatesMatch[1];
    return triggersText
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  /**
   * Calculate confidence level based on signals
   * HIGH (>80%): Explicit corrections, strong rules
   * MEDIUM (50-80%): Approvals with context
   * LOW (<50%): Observations, weak signals
   */
  static calculateConfidence(signals: Signal[]): ConfidenceLevel {
    if (signals.length === 0) {
      return 'low';
    }

    // Calculate weighted average
    let totalWeight = 0;
    let totalScore = 0;

    for (const signal of signals) {
      totalWeight += signal.weight;
      totalScore += signal.weight;
    }

    const avgScore = totalScore / signals.length;

    if (avgScore > 0.8) {
      return 'high';
    } else if (avgScore >= 0.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Check if running in SpecWeave project itself
   * Returns true if package.json name === "specweave"
   */
  static isSpecWeaveProject(): boolean {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.name === 'specweave';
    } catch (error) {
      return false;
    }
  }

  /**
   * Add a learning to the appropriate location
   * - SpecWeave project: Update SKILL.md directly
   * - User project: Update MEMORY.md
   */
  static addLearning(skill: string, learning: Learning): void {
    if (this.isSpecWeaveProject()) {
      this.updateSkillMd(skill, learning);
    } else {
      MemoryManager.addLearning(skill, learning);
    }
  }

  /**
   * Update SKILL.md with a new learning
   * Appends to "## Learned Patterns" section
   */
  private static updateSkillMd(skill: string, learning: Learning): void {
    const skillPath = path.join(
      process.cwd(),
      'plugins',
      'specweave',
      'skills',
      skill,
      'SKILL.md'
    );

    if (!fs.existsSync(skillPath)) {
      console.warn(`SKILL.md not found for skill "${skill}" at ${skillPath}`);
      return;
    }

    try {
      let content = fs.readFileSync(skillPath, 'utf-8');

      // Format learning entry
      const entry = this.formatLearningEntry(learning);

      // Check if "## Learned Patterns" section exists
      if (content.includes('## Learned Patterns')) {
        // Append to existing section
        content = content.replace(
          /## Learned Patterns\n/,
          `## Learned Patterns\n\n${entry}\n`
        );
      } else {
        // Add new section at the end
        content += `\n\n## Learned Patterns\n\n${entry}\n`;
      }

      fs.writeFileSync(skillPath, content, 'utf-8');
    } catch (error) {
      console.error(`Failed to update SKILL.md for "${skill}":`, error);
    }
  }

  /**
   * Format a learning entry for SKILL.md or MEMORY.md
   */
  private static formatLearningEntry(learning: Learning): string {
    let entry = `### ${learning.id} (${learning.type}, ${learning.confidence})\n`;
    entry += `**Content**: ${learning.content}\n`;
    if (learning.context) {
      entry += `**Context**: ${learning.context}\n`;
    }
    entry += `**Triggers**: ${learning.triggers.join(', ')}\n`;
    entry += `**Added**: ${learning.timestamp}\n`;
    entry += `**Source**: ${learning.source}`;
    return entry;
  }
}
