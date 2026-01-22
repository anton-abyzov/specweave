/**
 * Reflect Handler - Simplified reflection system
 *
 * ARCHITECTURE SIMPLIFICATION (v2.0):
 * - All learnings go to CLAUDE.md (single source of truth)
 * - Organized by skill name under "## Skill Memories" section
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
 */
function buildExtractionPrompt(transcript: string): string {
  return `You are analyzing a Claude Code session transcript to extract SpecWeave-specific learnings.

WHAT TO EXTRACT:
1. **Skill-specific learnings**: How to improve a SpecWeave skill's behavior for this user/project
   - Examples: "mobile: Run expo tests on localhost:8081 for this project"
   - Examples: "frontend: Prefer Vercel over Cloudflare even with Remix"
   - Examples: "architect: Skip ADR proposals for hotfix increments"

2. **Workflow preferences**: How the user prefers to use SpecWeave
   - Examples: "general: User prefers /sw:auto to run tests first"
   - Examples: "general: Always use small increments (max 5 tasks)"

WHAT NOT TO EXTRACT:
- Generic coding advice ("use TypeScript strict mode", "prefer hooks")
- Implementation details unrelated to SpecWeave workflow
- One-time fixes that won't recur

SKILL CATEGORIES (use these exact names):
mobile, frontend, backend, testing, infrastructure, kubernetes, architect,
tech-lead, qa-lead, security, docs-writer, performance, tdd-orchestrator,
pm, devops, payments, ml, kafka, confluent, github, jira, ado, release,
diagrams, general

SIGNALS TO LOOK FOR:
- User corrections: "No, don't do X", "Wrong, use Y instead"
- Explicit preferences: "Always do X", "Never do Y"
- Workflow feedback: "That's exactly right", "Perfect!"
- Technical preferences: "For this project, prefer X"

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "skillLearnings": [
    { "skill": "mobile", "learning": "Run expo tests on localhost:8081" },
    { "skill": "general", "learning": "User prefers small increments (max 5 tasks)" }
  ]
}

If no SpecWeave-specific learnings found, return: {"skillLearnings": []}

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
 * Update CLAUDE.md with new learnings
 */
function updateClaudeMd(
  claudeMdPath: string,
  newLearnings: SkillLearning[]
): { added: number; skipped: number } {
  let content = fs.readFileSync(claudeMdPath, 'utf-8');

  // Parse existing memories
  const existingMemories = parseSkillMemories(content);

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

  // Find and replace existing section, or add new section
  const existingSectionMatch = content.match(/## Skill Memories\s*\n[\s\S]*?(?=\n## |\n---|\n<!-- SW:|$)/);

  if (existingSectionMatch) {
    // Replace existing section
    content = content.replace(existingSectionMatch[0], newSectionContent.trimEnd());
  } else {
    // Add new section before the first <!-- SW: section marker or at the end
    const insertMatch = content.match(/\n---\s*\n<!-- ↓ ORIGINAL ↓ -->/);
    if (insertMatch) {
      // Insert before the "original" section divider
      content = content.replace(insertMatch[0], `\n${newSectionContent}\n${insertMatch[0]}`);
    } else {
      // Append at end
      content = content.trimEnd() + '\n\n' + newSectionContent;
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
 * Migrate old memory files to CLAUDE.md
 *
 * This migrates content from:
 * - .specweave/memory/*.md
 * - ~/.specweave/memory/*.md
 *
 * Into the CLAUDE.md Skill Memories section.
 */
export function migrateOldMemoryFiles(projectRoot: string): { migrated: number; deleted: string[] } {
  const result = { migrated: 0, deleted: [] as string[] };

  // Find CLAUDE.md
  const claudeMdPath = findClaudeMd(projectRoot);
  if (!claudeMdPath) {
    logger.warn('[reflect] CLAUDE.md not found, skipping migration');
    return result;
  }

  // Directories to check
  const memoryDirs = [
    path.join(projectRoot, '.specweave', 'memory'),
  ];

  // Add global memory if it exists
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  if (homeDir) {
    memoryDirs.push(path.join(homeDir, '.specweave', 'memory'));
  }

  const learningsToMigrate: SkillLearning[] = [];

  for (const memoryDir of memoryDirs) {
    if (!fs.existsSync(memoryDir)) continue;

    const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(memoryDir, file);
      const skillName = path.basename(file, '.md');

      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract learnings from old format
        // Pattern: #### LRN-XXXXXXXX-XXXX (Confidence)
        // **Learning**: content
        const learningMatches = content.matchAll(/\*\*Learning\*\*:\s*(.+)/g);

        for (const match of learningMatches) {
          learningsToMigrate.push({
            skill: skillName,
            learning: match[1].trim(),
          });
        }

        // Mark for deletion
        result.deleted.push(filePath);
      } catch {
        // Ignore read errors
      }
    }
  }

  if (learningsToMigrate.length > 0) {
    const writeResult = updateClaudeMd(claudeMdPath, learningsToMigrate);
    result.migrated = writeResult.added;
  }

  // Delete old files
  for (const filePath of result.deleted) {
    try {
      fs.unlinkSync(filePath);
      logger.debug(`[reflect] Deleted old memory file: ${filePath}`);
    } catch {
      // Ignore delete errors
    }
  }

  // Try to remove empty directories
  for (const memoryDir of memoryDirs) {
    try {
      const remaining = fs.readdirSync(memoryDir);
      if (remaining.length === 0) {
        fs.rmdirSync(memoryDir);
        logger.debug(`[reflect] Removed empty memory directory: ${memoryDir}`);
      }
    } catch {
      // Ignore errors
    }
  }

  return result;
}
