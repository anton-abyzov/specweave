/**
 * Skill-Specific Memory Files
 *
 * Writes learnings to both:
 * 1. CLAUDE.md Skill Memories section (existing)
 * 2. .specweave/skill-memories/{skill-name}.md (new)
 *
 * When a skill loads, it can read its specific memory file for context.
 *
 * @module core/reflection/skill-memories
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Directory for skill-specific memory files (relative to project root)
 */
export const SKILL_MEMORY_DIR = '.specweave/skill-memories';

/**
 * A single learning to be written
 */
export interface SkillLearning {
  skill: string;
  learning: string;
}

/**
 * Generate the content for a skill memory file
 */
export function generateSkillMemoryContent(
  skillName: string,
  learnings: string[]
): string {
  const title = skillName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const lines: string[] = [];
  lines.push(`# ${title} Memory`);
  lines.push('');
  lines.push('<!-- Project-specific learnings for this skill -->');
  lines.push('');
  lines.push('## Learnings');
  lines.push('');

  const today = new Date().toISOString().split('T')[0];
  for (const learning of learnings) {
    // Add date prefix if not present
    if (!learning.match(/^\*\*\d{4}-\d{2}-\d{2}\*\*/)) {
      lines.push(`- **${today}**: ${learning}`);
    } else {
      lines.push(`- ${learning}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Read existing learnings from a skill memory file
 */
export function readSkillMemoryFile(
  projectRoot: string,
  skillName: string
): string[] {
  const filePath = path.join(projectRoot, SKILL_MEMORY_DIR, `${skillName}.md`);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const learnings: string[] = [];

  // Parse bullet points with date prefix
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^-\s+\*\*\d{4}-\d{2}-\d{2}\*\*:\s*(.+)$/);
    if (match) {
      learnings.push(match[1].trim());
    }
  }

  return learnings;
}

/**
 * Check if a learning is a duplicate (case-insensitive)
 */
function isDuplicate(existing: string[], newLearning: string): boolean {
  const normalizedNew = newLearning.toLowerCase().trim();

  for (const e of existing) {
    const normalizedExisting = e.toLowerCase().trim();

    // Exact match
    if (normalizedExisting === normalizedNew) return true;

    // Substring match (one contains the other)
    if (
      normalizedExisting.includes(normalizedNew) ||
      normalizedNew.includes(normalizedExisting)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Write a learning to a skill-specific memory file
 *
 * Creates the file if it doesn't exist, appends if it does.
 * Deduplicates learnings.
 */
export function writeSkillMemoryFile(
  projectRoot: string,
  learning: SkillLearning
): { written: boolean; reason?: string } {
  const dirPath = path.join(projectRoot, SKILL_MEMORY_DIR);
  const filePath = path.join(dirPath, `${learning.skill}.md`);

  // Ensure directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // Read existing learnings
  const existingLearnings = readSkillMemoryFile(projectRoot, learning.skill);

  // Check for duplicates
  if (isDuplicate(existingLearnings, learning.learning)) {
    return { written: false, reason: 'Duplicate learning' };
  }

  // Add new learning
  const allLearnings = [...existingLearnings, learning.learning];

  // Generate and write content
  const content = generateSkillMemoryContent(learning.skill, allLearnings);
  fs.writeFileSync(filePath, content);

  return { written: true };
}

/**
 * Write multiple learnings to skill-specific memory files
 *
 * Organizes learnings by skill and writes to appropriate files.
 */
export function writeSkillMemories(
  projectRoot: string,
  learnings: SkillLearning[]
): { written: number; skipped: number } {
  let written = 0;
  let skipped = 0;

  for (const learning of learnings) {
    const result = writeSkillMemoryFile(projectRoot, learning);
    if (result.written) {
      written++;
    } else {
      skipped++;
    }
  }

  return { written, skipped };
}

/**
 * Get all skill memory files in a project
 */
export function listSkillMemoryFiles(projectRoot: string): string[] {
  const dirPath = path.join(projectRoot, SKILL_MEMORY_DIR);

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}
