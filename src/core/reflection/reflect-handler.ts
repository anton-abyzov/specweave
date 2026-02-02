/**
 * Reflect Handler - Simplified reflection system
 *
 * ARCHITECTURE (v3.0):
 * - Learnings go to BOTH:
 *   1. CLAUDE.md Skill Memories section (general visibility)
 *   2. .specweave/skill-memories/{skill}.md (skill-specific context)
 * - Organized by skill name
 * - Always uses LLM for extraction (no quick signal check)
 * - User can disable via config
 *
 * WHAT IT REMEMBERS:
 * - SpecWeave workflow preferences (how user uses SpecWeave)
 * - Skill-specific learnings (how to improve skill behavior)
 * - Project-specific context (tech stack preferences, conventions)
 *
 * WHAT IT DOES NOT REMEMBER:
 * - Generic coding patterns (use Zustand, prefer hooks, etc.)
 * - Implementation details unrelated to SpecWeave
 *
 * @module core/reflection/reflect-handler
 */

import * as fs from 'fs';
import * as path from 'path';
import { runClaudeCli, parseJsonFromOutput, type ClaudeModel } from '../../utils/claude-cli-runner.js';
import { consoleLogger as logger } from '../../utils/logger.js';
import { writeSkillMemories } from './skill-memories.js';

/**
 * Configuration for reflection
 */
export interface ReflectConfig {
  /** Master switch for reflection */
  enabled: boolean;
  /** Model to use for extraction (default: haiku) */
  model: ClaudeModel;
  /** Maximum learnings per session */
  maxLearningsPerSession: number;
}

/**
 * Default configuration
 */
export const DEFAULT_REFLECT_CONFIG: ReflectConfig = {
  enabled: true,
  model: 'haiku',
  maxLearningsPerSession: 3,
};

/**
 * A single learning extracted by LLM
 */
export interface SkillLearning {
  /** Skill this learning applies to (e.g., "mobile", "frontend", "architect") */
  skill: string;
  /** The actual learning content */
  learning: string;
}

/**
 * LLM extraction result
 */
export interface LLMExtractionResult {
  /** Learnings organized by skill */
  skillLearnings: SkillLearning[];
}

/**
 * Result of the reflect operation
 */
export interface ReflectResult {
  /** Whether reflect ran */
  ran: boolean;
  /** Why it didn't run (if !ran) */
  reason?: string;
  /** Model used */
  model?: ClaudeModel;
  /** Input summary */
  inputSummary: {
    transcriptLines: number;
  };
  /** What was extracted */
  extracted: {
    skillLearnings: SkillLearning[];
  };
  /** What was written */
  written: {
    learningsAdded: number;
    learningsSkippedDuplicate: number;
    claudeMdPath?: string;
  };
  /** Duration in ms */
  durationMs: number;
}

/**
 * Known SpecWeave skills/plugins for validation
 */
const KNOWN_SKILLS = [
  'mobile',
  'frontend',
  'backend',
  'testing',
  'infrastructure',
  'kubernetes',
  'architect',
  'tech-lead',
  'qa-lead',
  'security',
  'docs-writer',
  'performance',
  'tdd-orchestrator',
  'pm',
  'devops',
  'payments',
  'ml',
  'kafka',
  'confluent',
  'github',
  'jira',
  'ado',
  'release',
  'diagrams',
  'general', // fallback for general SpecWeave learnings
] as const;

/**
 * Build the LLM prompt for extracting skill learnings
 *
 * v1.0.198: Stricter extraction - only high-signal learnings that will
 * genuinely improve future skill behavior. Prefer fewer, high-quality
 * learnings over many low-quality ones.
 */
function buildExtractionPrompt(transcript: string): string {
  return `You are analyzing a Claude Code session transcript to extract ONLY high-value learnings.

CRITICAL: Be VERY selective. Most sessions have 0-1 learnings worth saving. Only extract if:
1. User EXPLICITLY corrected Claude's behavior ("No, don't X", "Wrong, do Y instead")
2. User stated a PERMANENT preference ("Always X", "Never Y", "For this project...")
3. Learning will CHANGE how a skill behaves in FUTURE sessions

WHAT TO EXTRACT (only if HIGH confidence it's reusable):
1. **User corrections**: Claude did X, user said "No, do Y instead"
   - Example: "pm: Enable interview process during increment creation" (user corrected workflow)
   - Example: "architect: Skip ADR for hotfixes" (user said don't create ADRs for hotfixes)

2. **Explicit project preferences**: User stated how THIS PROJECT differs
   - Example: "testing: Run E2E on port 8081" (project-specific config)
   - Example: "frontend: Use Tailwind, not styled-components" (tech choice for project)

3. **Workflow corrections**: User corrected SpecWeave command usage
   - Example: "general: Run /sw:validate before /sw:done" (workflow preference)

WHAT NOT TO EXTRACT (be strict!):
- Generic coding advice (TypeScript patterns, React hooks, etc.)
- One-time fixes that won't recur
- Implementation details (specific file paths, variable names)
- Things Claude did correctly (no correction = no learning)
- Vague feedback ("good job", "that works") - these are NOT learnings
- Standard best practices that any developer would know

SKILL CATEGORIES (use these exact names):
mobile, frontend, backend, testing, infrastructure, kubernetes, architect,
tech-lead, qa-lead, security, docs-writer, performance, tdd-orchestrator,
pm, devops, payments, ml, kafka, confluent, github, jira, ado, release,
diagrams, general

IMPORTANCE TEST: Before including a learning, ask:
"Will this CHANGE how Claude behaves in a FUTURE session with this skill?"
If NO → don't include it.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "skillLearnings": [
    { "skill": "pm", "learning": "Enable interview process during increment creation" }
  ]
}

If NO high-value learnings found (most sessions), return: {"skillLearnings": []}

=== SESSION TRANSCRIPT ===
${transcript.slice(0, 8000)}
${transcript.length > 8000 ? '\n... (truncated)' : ''}
=== END TRANSCRIPT ===`;
}

/**
 * Extract learnings from transcript using LLM
 */
async function extractLearningsViaLLM(
  transcript: string,
  model: ClaudeModel
): Promise<{ success: boolean; learnings: SkillLearning[]; error?: string; durationMs: number }> {
  const prompt = buildExtractionPrompt(transcript);

  const result = runClaudeCli({
    model,
    prompt,
    timeoutMs: 45000, // 45s timeout for extraction
  });

  if (!result.success) {
    return {
      success: false,
      learnings: [],
      error: result.error,
      durationMs: result.durationMs,
    };
  }

  const parsed = parseJsonFromOutput<LLMExtractionResult>(result.stdout);
  if (!parsed.success || !parsed.data) {
    return {
      success: false,
      learnings: [],
      error: parsed.error || 'Failed to parse LLM response',
      durationMs: result.durationMs,
    };
  }

  // Validate and filter learnings
  const validLearnings = (parsed.data.skillLearnings || [])
    .filter((l) => l.skill && l.learning)
    .filter((l) => KNOWN_SKILLS.includes(l.skill as (typeof KNOWN_SKILLS)[number]) || l.skill === 'general')
    .slice(0, 5); // Max 5 learnings per extraction

  return {
    success: true,
    learnings: validLearnings,
    durationMs: result.durationMs,
  };
}

/**
 * Find CLAUDE.md in project
 */
function findClaudeMd(projectRoot: string): string | null {
  const possiblePaths = [
    path.join(projectRoot, 'CLAUDE.md'),
    path.join(projectRoot, 'claude.md'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Parse existing Skill Memories section from CLAUDE.md
 */
function parseSkillMemories(content: string): Map<string, string[]> {
  const memories = new Map<string, string[]>();

  // Find the Skill Memories section
  const sectionMatch = content.match(/## Skill Memories\s*\n([\s\S]*?)(?=\n## |\n---|\n<!-- SW:|$)/);
  if (!sectionMatch) {
    return memories;
  }

  const sectionContent = sectionMatch[1];

  // Parse each skill subsection
  const skillMatches = sectionContent.matchAll(/### (\w+[-\w]*)\s*\n([\s\S]*?)(?=\n### |\n## |$)/g);
  for (const match of skillMatches) {
    const skillName = match[1].toLowerCase();
    const skillContent = match[2];

    // Extract bullet points
    const bulletPoints = skillContent
      .split('\n')
      .filter((line) => line.trim().startsWith('- '))
      .map((line) => line.trim().replace(/^- \*\*\d{4}-\d{2}-\d{2}\*\*:\s*/, '').trim());

    if (bulletPoints.length > 0) {
      memories.set(skillName, bulletPoints);
    }
  }

  return memories;
}

/**
 * Check if a learning is a duplicate
 */
function isDuplicate(existing: string[], newLearning: string): boolean {
  const normalizedNew = newLearning.toLowerCase().trim();

  for (const e of existing) {
    const normalizedExisting = e.toLowerCase().trim();

    // Exact match
    if (normalizedExisting === normalizedNew) return true;

    // Substring match (one contains the other)
    if (normalizedExisting.includes(normalizedNew) || normalizedNew.includes(normalizedExisting)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate the Skill Memories section content
 */
function generateSkillMemoriesSection(memories: Map<string, string[]>): string {
  if (memories.size === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Skill Memories');
  lines.push('');
  lines.push('<!-- Auto-captured by SpecWeave reflect. Edit or delete as needed. -->');
  lines.push('');

  // Sort skills alphabetically, but put 'general' last
  const sortedSkills = [...memories.keys()].sort((a, b) => {
    if (a === 'general') return 1;
    if (b === 'general') return -1;
    return a.localeCompare(b);
  });

  for (const skill of sortedSkills) {
    const learnings = memories.get(skill) || [];
    if (learnings.length === 0) continue;

    const skillTitle = skill
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    lines.push(`### ${skillTitle}`);

    for (const learning of learnings) {
      // Add date prefix if not present
      if (!learning.match(/^\*\*\d{4}-\d{2}-\d{2}\*\*/)) {
        const today = new Date().toISOString().split('T')[0];
        lines.push(`- **${today}**: ${learning}`);
      } else {
        lines.push(`- ${learning}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Find the USER's Skill Memories section (NOT the template section)
 *
 * Template sections are inside <!-- SW:SECTION:* --> markers and get overwritten
 * by instruction updates. We need to find/create a section OUTSIDE these markers.
 */
function findUserSkillMemoriesSection(content: string): {
  found: boolean;
  startIndex: number;
  endIndex: number;
  sectionContent: string;
} {
  // Find all ## Skill Memories occurrences
  const regex = /## Skill Memories/g;
  let match;
  const positions: number[] = [];

  while ((match = regex.exec(content)) !== null) {
    positions.push(match.index);
  }

  // For each position, check if it's inside a template section
  for (const pos of positions) {
    // Look backwards for <!-- SW:SECTION: marker
    const beforeContent = content.slice(0, pos);
    const lastSectionStart = beforeContent.lastIndexOf('<!-- SW:SECTION:');
    const lastSectionEnd = beforeContent.lastIndexOf('<!-- SW:END:');

    // If there's a section start AFTER the last section end, we're inside a template
    if (lastSectionStart > lastSectionEnd) {
      // This is inside a template section, skip it
      continue;
    }

    // This is a user section (not inside template markers)
    // Find where this section ends
    const afterContent = content.slice(pos);
    const sectionEndMatch = afterContent.match(/\n(?=## |\n---|\n<!-- SW:SECTION:|$)/);
    const endOffset = sectionEndMatch ? sectionEndMatch.index! : afterContent.length;

    return {
      found: true,
      startIndex: pos,
      endIndex: pos + endOffset,
      sectionContent: content.slice(pos, pos + endOffset),
    };
  }

  return { found: false, startIndex: -1, endIndex: -1, sectionContent: '' };
}

/**
 * Update CLAUDE.md with new learnings
 *
 * IMPORTANT: Writes to the USER's section, not the template section.
 * Template sections (inside <!-- SW:SECTION: --> markers) are overwritten
 * by instruction updates, so we must write elsewhere.
 */
function updateClaudeMd(
  claudeMdPath: string,
  newLearnings: SkillLearning[]
): { added: number; skipped: number } {
  let content = fs.readFileSync(claudeMdPath, 'utf-8');

  // Find user's section (not template)
  const userSection = findUserSkillMemoriesSection(content);

  // Parse existing memories from user section only
  const existingMemories = userSection.found
    ? parseSkillMemories(userSection.sectionContent)
    : new Map<string, string[]>();

  let added = 0;
  let skipped = 0;

  // Add new learnings
  for (const learning of newLearnings) {
    const skill = learning.skill.toLowerCase();
    const existing = existingMemories.get(skill) || [];

    if (isDuplicate(existing, learning.learning)) {
      skipped++;
      continue;
    }

    existing.push(learning.learning);
    existingMemories.set(skill, existing);
    added++;
  }

  if (added === 0) {
    return { added: 0, skipped };
  }

  // Generate new section content
  const newSectionContent = generateSkillMemoriesSection(existingMemories);

  if (userSection.found) {
    // Replace user's existing section
    content =
      content.slice(0, userSection.startIndex) +
      newSectionContent.trimEnd() +
      content.slice(userSection.endIndex);
  } else {
    // No user section found - create one after the template section
    // Look for <!-- SW:END:reflect --> marker
    const reflectEndMatch = content.match(/<!-- SW:END:reflect -->\s*\n/);
    if (reflectEndMatch) {
      const insertPos = reflectEndMatch.index! + reflectEndMatch[0].length;
      content =
        content.slice(0, insertPos) +
        '\n' +
        newSectionContent +
        '\n' +
        content.slice(insertPos);
    } else {
      // Fallback: insert before "original" section or append at end
      const insertMatch = content.match(/\n---\s*\n<!-- ↓ ORIGINAL ↓ -->/);
      if (insertMatch) {
        content = content.replace(insertMatch[0], `\n${newSectionContent}\n${insertMatch[0]}`);
      } else {
        content = content.trimEnd() + '\n\n' + newSectionContent;
      }
    }
  }

  fs.writeFileSync(claudeMdPath, content);

  return { added, skipped };
}

/**
 * Read reflect configuration from project config
 */
export function readReflectConfig(projectRoot: string): ReflectConfig {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  const config = { ...DEFAULT_REFLECT_CONFIG };

  if (!fs.existsSync(configPath)) {
    return config;
  }

  try {
    const configContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (configContent.reflect) {
      if (typeof configContent.reflect.enabled === 'boolean') {
        config.enabled = configContent.reflect.enabled;
      }
      if (configContent.reflect.model && ['haiku', 'sonnet', 'opus'].includes(configContent.reflect.model)) {
        config.model = configContent.reflect.model;
      }
      if (typeof configContent.reflect.maxLearningsPerSession === 'number') {
        config.maxLearningsPerSession = configContent.reflect.maxLearningsPerSession;
      }
    }
  } catch {
    // Ignore config read errors
  }

  return config;
}

/**
 * Main reflect handler - called at session end
 *
 * Pipeline:
 * 1. Check config (enabled?)
 * 2. Read transcript
 * 3. Extract learnings via LLM
 * 4. Write to CLAUDE.md
 * 5. Log summary
 */
export async function handleReflectStop(
  transcriptPath: string,
  projectRoot: string
): Promise<ReflectResult> {
  const startTime = performance.now();

  // Initialize result
  const result: ReflectResult = {
    ran: false,
    inputSummary: { transcriptLines: 0 },
    extracted: { skillLearnings: [] },
    written: { learningsAdded: 0, learningsSkippedDuplicate: 0 },
    durationMs: 0,
  };

  // Read config
  const config = readReflectConfig(projectRoot);
  if (!config.enabled) {
    result.reason = 'Reflection disabled in config';
    result.durationMs = performance.now() - startTime;
    return result;
  }

  // Read transcript
  if (!fs.existsSync(transcriptPath)) {
    result.reason = `Transcript not found: ${transcriptPath}`;
    result.durationMs = performance.now() - startTime;
    return result;
  }

  const transcript = fs.readFileSync(transcriptPath, 'utf-8');
  result.inputSummary.transcriptLines = transcript.split('\n').length;

  if (transcript.trim().length < 100) {
    result.reason = 'Transcript too short (< 100 chars)';
    result.durationMs = performance.now() - startTime;
    return result;
  }

  // Find CLAUDE.md
  const claudeMdPath = findClaudeMd(projectRoot);
  if (!claudeMdPath) {
    result.reason = 'CLAUDE.md not found in project';
    result.durationMs = performance.now() - startTime;
    return result;
  }

  // Extract learnings via LLM
  result.model = config.model;
  result.ran = true;

  const extraction = await extractLearningsViaLLM(transcript, config.model);

  if (!extraction.success) {
    result.reason = `LLM extraction failed: ${extraction.error}`;
    result.durationMs = performance.now() - startTime;
    return result;
  }

  result.extracted.skillLearnings = extraction.learnings;

  // Limit to max per session
  const learningsToWrite = extraction.learnings.slice(0, config.maxLearningsPerSession);

  if (learningsToWrite.length === 0) {
    result.reason = 'No SpecWeave-specific learnings found';
    result.durationMs = performance.now() - startTime;
    return result;
  }

  // Write to CLAUDE.md
  const writeResult = updateClaudeMd(claudeMdPath, learningsToWrite);
  result.written.learningsAdded = writeResult.added;
  result.written.learningsSkippedDuplicate = writeResult.skipped;
  result.written.claudeMdPath = claudeMdPath;

  // Also write to skill-specific memory files
  // This ensures learnings are visible when skills load
  try {
    const skillMemoryResult = writeSkillMemories(projectRoot, learningsToWrite);
    logger.debug(
      `[reflect] Wrote ${skillMemoryResult.written} skill memory files, skipped ${skillMemoryResult.skipped} duplicates`
    );
  } catch (err) {
    // Non-fatal - continue even if skill memory write fails
    logger.warn(`[reflect] Failed to write skill memories: ${err}`);
  }

  result.durationMs = performance.now() - startTime;

  return result;
}

/**
 * Format reflect result for console output
 */
export function formatReflectResult(result: ReflectResult): string {
  const lines: string[] = [];

  lines.push('════════════════════════════════════════════════════════════════');
  lines.push('🔍 REFLECT STOP HOOK');
  lines.push('════════════════════════════════════════════════════════════════');

  if (!result.ran) {
    lines.push(`⏭️  Skipped: ${result.reason}`);
    lines.push(`⏱️  Duration: ${result.durationMs.toFixed(0)}ms`);
    lines.push('════════════════════════════════════════════════════════════════');
    return lines.join('\n');
  }

  lines.push(`📄 Transcript: ${result.inputSummary.transcriptLines} lines`);
  lines.push(`🤖 Model: ${result.model}`);
  lines.push('');

  if (result.extracted.skillLearnings.length > 0) {
    lines.push('────────────────────────────────────────────────────────────────');
    lines.push('📝 EXTRACTED LEARNINGS');
    lines.push('────────────────────────────────────────────────────────────────');

    for (const learning of result.extracted.skillLearnings) {
      lines.push(`   [${learning.skill}] ${learning.learning}`);
    }
    lines.push('');
  }

  lines.push('────────────────────────────────────────────────────────────────');
  lines.push('💾 PERSISTENCE');
  lines.push('────────────────────────────────────────────────────────────────');

  if (result.written.learningsAdded > 0) {
    lines.push(`✅ Added: ${result.written.learningsAdded} learning(s)`);
    lines.push(`   → ${result.written.claudeMdPath}`);
  } else {
    lines.push('⏭️  Nothing new to add');
  }

  if (result.written.learningsSkippedDuplicate > 0) {
    lines.push(`⏭️  Skipped: ${result.written.learningsSkippedDuplicate} duplicate(s)`);
  }

  lines.push('');
  lines.push(`⏱️  Duration: ${result.durationMs.toFixed(0)}ms`);
  lines.push('════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Extract learnings from old memory file content (supports multiple formats)
 *
 * Supported formats:
 * 1. LRN format: `**Learning**: content`
 * 2. Arrow format: `- → content` or `- -> content`
 * 3. Simple bullet: `- content` (only if it looks like a learning, not a header)
 */
function extractLearningsFromOldFormat(content: string): string[] {
  const learnings: string[] = [];

  // Format 1: **Learning**: content (LRN-XXXXXXXX format)
  const lrnMatches = content.matchAll(/\*\*Learning\*\*:\s*(.+)/g);
  for (const match of lrnMatches) {
    const learning = match[1].trim();
    if (learning.length > 5) {
      learnings.push(learning);
    }
  }

  // Format 2: - → content or - -> content (arrow format)
  const arrowMatches = content.matchAll(/^-\s*(?:→|->)+\s*(.+)$/gm);
  for (const match of arrowMatches) {
    const learning = match[1].trim();
    if (learning.length > 5) {
      learnings.push(learning);
    }
  }

  // Format 3: Simple bullets (only if content looks like a learning rule)
  // Skip headers, metadata lines, and very short content
  const bulletMatches = content.matchAll(/^-\s+(?!→|->)(.+)$/gm);
  for (const match of bulletMatches) {
    const learning = match[1].trim();
    // Only include if it looks like an actual learning (not metadata)
    if (
      learning.length > 10 &&
      !learning.startsWith('#') &&
      !learning.startsWith('>') &&
      !learning.toLowerCase().includes('project-specific') &&
      !learning.toLowerCase().includes('max ') &&
      !learning.toLowerCase().includes('auto-deduplicated')
    ) {
      learnings.push(learning);
    }
  }

  return learnings;
}

/**
 * Migrate old memory files to CLAUDE.md
 *
 * This migrates content from:
 * - .specweave/memory/*.md
 * - ~/.specweave/memory/*.md
 *
 * Into the CLAUDE.md Skill Memories section.
 *
 * IMPORTANT: Always cleans up the deprecated memory directories,
 * even if no learnings were migrated (best-effort migration).
 */
export function migrateOldMemoryFiles(projectRoot: string): { migrated: number; deleted: string[] } {
  const result = { migrated: 0, deleted: [] as string[] };

  // Directories to check (always clean these up)
  const memoryDirs = [
    path.join(projectRoot, '.specweave', 'memory'),
  ];

  // Add global memory if it exists
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir) {
    memoryDirs.push(path.join(homeDir, '.specweave', 'memory'));
  }

  // Find CLAUDE.md (optional - we still clean up even if not found)
  const claudeMdPath = findClaudeMd(projectRoot);

  const learningsToMigrate: SkillLearning[] = [];

  for (const memoryDir of memoryDirs) {
    if (!fs.existsSync(memoryDir)) continue;

    const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(memoryDir, file);
      const skillName = path.basename(file, '.md');

      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract learnings using multi-format parser
        const extractedLearnings = extractLearningsFromOldFormat(content);

        for (const learning of extractedLearnings) {
          learningsToMigrate.push({
            skill: skillName,
            learning,
          });
        }

        // Always mark for deletion (deprecated directory)
        result.deleted.push(filePath);
      } catch {
        // Still mark for deletion even if read fails
        result.deleted.push(filePath);
      }
    }
  }

  // Migrate learnings to CLAUDE.md if available
  if (learningsToMigrate.length > 0 && claudeMdPath) {
    const writeResult = updateClaudeMd(claudeMdPath, learningsToMigrate);
    result.migrated = writeResult.added;
  }

  // Delete old files (always, regardless of migration success)
  for (const filePath of result.deleted) {
    try {
      fs.unlinkSync(filePath);
      logger.debug(`[reflect] Deleted old memory file: ${filePath}`);
    } catch {
      // Ignore delete errors
    }
  }

  // Remove directories (even if not empty - force cleanup of deprecated location)
  for (const memoryDir of memoryDirs) {
    try {
      if (fs.existsSync(memoryDir)) {
        // Remove any remaining files first
        const remaining = fs.readdirSync(memoryDir);
        for (const file of remaining) {
          try {
            fs.unlinkSync(path.join(memoryDir, file));
          } catch {
            // Ignore individual file delete errors
          }
        }
        // Then remove the directory
        fs.rmdirSync(memoryDir);
        logger.debug(`[reflect] Removed deprecated memory directory: ${memoryDir}`);
      }
    } catch {
      // Ignore directory removal errors
    }
  }

  return result;
}

/**
 * Force cleanup of deprecated .specweave/memory/ directory
 *
 * This is a simpler, more aggressive cleanup that doesn't attempt migration.
 * Use this when you just want to ensure the deprecated directory is gone.
 *
 * @param projectRoot - Project root path
 * @returns Number of files/directories removed
 */
export function cleanupDeprecatedMemoryDirectory(projectRoot: string): number {
  let cleaned = 0;

  const memoryDirs = [
    path.join(projectRoot, '.specweave', 'memory'),
  ];

  // Add global memory if it exists
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir) {
    memoryDirs.push(path.join(homeDir, '.specweave', 'memory'));
  }

  for (const memoryDir of memoryDirs) {
    if (!fs.existsSync(memoryDir)) continue;

    try {
      // Remove all files in the directory
      const files = fs.readdirSync(memoryDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(memoryDir, file));
          cleaned++;
        } catch {
          // Ignore individual file errors
        }
      }

      // Remove the directory itself
      fs.rmdirSync(memoryDir);
      cleaned++;
      logger.debug(`[reflect] Removed deprecated memory directory: ${memoryDir}`);
    } catch {
      // Ignore directory errors
    }
  }

  return cleaned;
}
