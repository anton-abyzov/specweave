/**
 * Skill Memory Injector
 *
 * Provides functions to extract and inject skill-specific memories
 * into Claude's context when a skill is detected.
 *
 * Used by user-prompt-submit hook to automatically inject learnings
 * when detect-intent identifies a skill invocation.
 *
 * @module core/reflection/skill-memory-injector
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Extract skill name from full skill identifier
 *
 * @example
 * extractSkillName('sw:pm') // → 'pm'
 * extractSkillName('sw-frontend:frontend-architect') // → 'frontend-architect'
 * extractSkillName('architect') // → 'architect'
 */
export function extractSkillName(fullSkillName: string): string {
  // Format: "plugin:skill" or just "skill"
  const parts = fullSkillName.split(':');
  return parts.length > 1 ? parts[1] : parts[0];
}

/**
 * Build skill memory content for injection into additionalContext
 *
 * Reads the skill memory file and extracts learnings section.
 * Returns formatted context string or null if no memory exists.
 *
 * @param projectRoot - Project root path
 * @param skillName - Skill name (e.g., 'pm', 'frontend-architect')
 * @returns Formatted memory context or null
 */
export function buildSkillMemoryContext(
  projectRoot: string,
  skillName: string
): string | null {
  const memoryPath = path.join(
    projectRoot,
    '.specweave',
    'skill-memories',
    `${skillName}.md`
  );

  if (!fs.existsSync(memoryPath)) {
    return null;
  }

  const content = fs.readFileSync(memoryPath, 'utf-8');

  // Extract just the learnings section (skip the header)
  const learningsMatch = content.match(/## Learnings\n([\s\S]*?)(?:\n## |$)/);
  if (!learningsMatch) {
    return null;
  }

  const learnings = learningsMatch[1].trim();
  if (!learnings) {
    return null;
  }

  return `📚 **Skill Memory for ${skillName}**:\n${learnings}`;
}

/**
 * Build skill memory context from a full skill identifier
 *
 * Convenience function that combines extractSkillName and buildSkillMemoryContext.
 *
 * @param projectRoot - Project root path
 * @param fullSkillName - Full skill name (e.g., 'sw:pm', 'sw-frontend:frontend-architect')
 * @returns Formatted memory context or null
 */
export function getSkillMemoryForInjection(
  projectRoot: string,
  fullSkillName: string
): string | null {
  const skillName = extractSkillName(fullSkillName);
  return buildSkillMemoryContext(projectRoot, skillName);
}
