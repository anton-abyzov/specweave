/**
 * Memory Manager
 *
 * Handles reading and writing MEMORY.md files for per-skill learning storage.
 * Supports both Claude Code paths (~/.claude/skills/) and SpecWeave paths.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Learning } from './types.js';

export class MemoryManager {
  /**
   * Get the path to a skill's MEMORY.md file
   * Checks Claude Code path first, then SpecWeave path, then falls back to centralized
   */
  static getSkillMemoryPath(skillName: string): string {
    // Claude Code marketplace path
    const claudeCodePath = path.join(
      os.homedir(),
      '.claude',
      'plugins',
      'marketplaces',
      'specweave',
      'plugins',
      'specweave',
      'skills',
      skillName,
      'MEMORY.md'
    );

    if (fs.existsSync(claudeCodePath)) {
      return claudeCodePath;
    }

    // SpecWeave local path (for development or non-Claude environment)
    const specweavePath = path.join(
      process.cwd(),
      '.specweave',
      'plugins',
      'specweave',
      'skills',
      skillName,
      'MEMORY.md'
    );

    if (fs.existsSync(specweavePath)) {
      return specweavePath;
    }

    // Fallback to centralized memory
    const centralizedPath = path.join(
      process.cwd(),
      '.specweave',
      'memory',
      `${skillName}.md`
    );

    return centralizedPath;
  }

  /**
   * Read learnings from a skill's MEMORY.md file
   * Returns empty array if file doesn't exist or is malformed
   */
  static readMemory(skillName: string): Learning[] {
    const memoryPath = this.getSkillMemoryPath(skillName);

    if (!fs.existsSync(memoryPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(memoryPath, 'utf-8');
      return this.parseMemoryContent(content);
    } catch (error) {
      console.warn(`Failed to read memory for skill "${skillName}":`, error);
      return [];
    }
  }

  /**
   * Parse MEMORY.md content into Learning objects
   */
  private static parseMemoryContent(content: string): Learning[] {
    const learnings: Learning[] = [];
    const lines = content.split('\n');

    let currentLearning: Partial<Learning> | null = null;

    for (const line of lines) {
      // Match learning header: ### LRN-20260106-A1B2 (correction, high)
      const headerMatch = line.match(/^###\s+(LRN-\d{8}-[A-Z0-9]{4})\s+\((\w+),\s*(\w+)\)/);
      if (headerMatch) {
        // Save previous learning
        if (currentLearning && this.isValidLearning(currentLearning)) {
          learnings.push(currentLearning as Learning);
        }

        // Start new learning
        currentLearning = {
          id: headerMatch[1],
          type: headerMatch[2] as Learning['type'],
          confidence: headerMatch[3] as Learning['confidence'],
          triggers: [],
        };
        continue;
      }

      if (!currentLearning) continue;

      // Parse fields
      const contentMatch = line.match(/^\*\*Content\*\*:\s*(.+)/);
      if (contentMatch) {
        currentLearning.content = contentMatch[1];
        continue;
      }

      const contextMatch = line.match(/^\*\*Context\*\*:\s*(.+)/);
      if (contextMatch) {
        currentLearning.context = contextMatch[1];
        continue;
      }

      const triggersMatch = line.match(/^\*\*Triggers\*\*:\s*(.+)/);
      if (triggersMatch) {
        currentLearning.triggers = triggersMatch[1].split(',').map(t => t.trim());
        continue;
      }

      const addedMatch = line.match(/^\*\*Added\*\*:\s*(.+)/);
      if (addedMatch) {
        currentLearning.timestamp = addedMatch[1];
        continue;
      }

      const sourceMatch = line.match(/^\*\*Source\*\*:\s*(.+)/);
      if (sourceMatch) {
        currentLearning.source = sourceMatch[1];
        continue;
      }
    }

    // Save last learning
    if (currentLearning && this.isValidLearning(currentLearning)) {
      learnings.push(currentLearning as Learning);
    }

    return learnings;
  }

  /**
   * Check if a partial learning has all required fields
   */
  private static isValidLearning(learning: Partial<Learning>): learning is Learning {
    return !!(
      learning.id &&
      learning.timestamp &&
      learning.type &&
      learning.confidence &&
      learning.content &&
      learning.triggers &&
      learning.source
    );
  }

  /**
   * Write learnings to a skill's MEMORY.md file
   */
  static writeMemory(skillName: string, learnings: Learning[]): void {
    const memoryPath = this.getSkillMemoryPath(skillName);

    // Ensure directory exists
    const dir = path.dirname(memoryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = this.formatMemoryContent(skillName, learnings);
    fs.writeFileSync(memoryPath, content, 'utf-8');
  }

  /**
   * Format learnings into MEMORY.md content
   */
  private static formatMemoryContent(skillName: string, learnings: Learning[]): string {
    const now = new Date().toISOString();

    let content = `# Skill Memory: ${skillName}\n\n`;
    content += `> Auto-generated by SpecWeave Reflect v4.0\n`;
    content += `> Last updated: ${now}\n`;
    content += `> Skill: ${skillName}\n\n`;
    content += `## Learned Patterns\n\n`;

    for (const learning of learnings) {
      content += `### ${learning.id} (${learning.type}, ${learning.confidence})\n`;
      content += `**Content**: ${learning.content}\n`;
      if (learning.context) {
        content += `**Context**: ${learning.context}\n`;
      }
      content += `**Triggers**: ${learning.triggers.join(', ')}\n`;
      content += `**Added**: ${learning.timestamp}\n`;
      content += `**Source**: ${learning.source}\n\n`;
    }

    return content;
  }

  /**
   * Add a single learning to a skill's MEMORY.md
   * Appends to existing learnings
   */
  static addLearning(skillName: string, learning: Learning): void {
    const existingLearnings = this.readMemory(skillName);
    existingLearnings.push(learning);
    this.writeMemory(skillName, existingLearnings);
  }
}
