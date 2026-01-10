/**
 * Skill Memory Merger - Smart merge for SKILL.md MEMORY sections
 *
 * Similar to how CLAUDE.md merger preserves user content while updating
 * SpecWeave sections, this merger preserves user learnings while allowing
 * skill definitions to be updated.
 *
 * Architecture:
 * - SKILL.md contains skill definition (updated by SpecWeave)
 * - MEMORY.md contains user learnings (preserved across updates)
 *
 * During marketplace refresh:
 * 1. Read existing MEMORY.md (user learnings)
 * 2. Copy new SKILL.md from source
 * 3. Merge MEMORY.md: keep user learnings, add new defaults, dedup
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Learning {
  id: string;
  timestamp: string;
  type: 'correction' | 'rule' | 'approval';
  confidence: 'high' | 'medium' | 'low';
  content: string;
  context?: string;
  triggers?: string[];
  source?: string;
}

export interface MemoryFile {
  skillName: string;
  version?: string;
  lastUpdated: string;
  learnings: Learning[];
  /** User-added notes that should never be modified */
  userNotes?: string;
}

export interface MergeResult {
  success: boolean;
  content: string;
  added: number;
  preserved: number;
  deduped: number;
  warnings: string[];
}

// Patterns for parsing MEMORY.md
const LEARNING_HEADER_RE = /^####\s+(LRN-[\w-]+)\s*\((\w+)\s+Confidence\)/i;
const CONTEXT_RE = /^\*\*Context\*\*:\s*(.+)$/;
const LEARNING_RE = /^\*\*Learning\*\*:\s*(.+)$/;
const TRIGGERS_RE = /^\*\*Triggers\*\*:\s*(.+)$/;
const ADDED_RE = /^\*\*Added\*\*:\s*(.+)$/;
const SOURCE_RE = /^\*\*Source\*\*:\s*(.+)$/;
const TYPE_RE = /^\*\*Type\*\*:\s*(.+)$/;

/**
 * Parse a MEMORY.md file into structured data
 */
export function parseMemoryFile(content: string): MemoryFile {
  const lines = content.split('\n');
  const learnings: Learning[] = [];
  let skillName = 'unknown';
  let version: string | undefined;
  let lastUpdated = new Date().toISOString();
  let userNotes = '';

  // Extract skill name from header
  const headerMatch = content.match(/^#\s+(.+?)\s+Memory/m);
  if (headerMatch) {
    skillName = headerMatch[1].toLowerCase().replace(/\s+/g, '-');
  }

  // Extract metadata
  const versionMatch = content.match(/Version:\s*([\d.]+)/);
  if (versionMatch) {
    version = versionMatch[1];
  }

  const updatedMatch = content.match(/Last updated:\s*(\S+)/);
  if (updatedMatch) {
    lastUpdated = updatedMatch[1];
  }

  // Parse learnings
  let currentLearning: Partial<Learning> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for learning header
    const headerMatch = line.match(LEARNING_HEADER_RE);
    if (headerMatch) {
      // Save previous learning if exists
      if (currentLearning?.id && currentLearning?.content) {
        learnings.push(currentLearning as Learning);
      }

      currentLearning = {
        id: headerMatch[1],
        confidence: headerMatch[2].toLowerCase() as 'high' | 'medium' | 'low',
        timestamp: new Date().toISOString(),
        type: 'rule',
        content: '',
      };
      continue;
    }

    // Parse learning fields
    if (currentLearning) {
      const contextMatch = line.match(CONTEXT_RE);
      if (contextMatch) {
        currentLearning.context = contextMatch[1];
        continue;
      }

      const learningMatch = line.match(LEARNING_RE);
      if (learningMatch) {
        currentLearning.content = learningMatch[1];
        continue;
      }

      const triggersMatch = line.match(TRIGGERS_RE);
      if (triggersMatch) {
        currentLearning.triggers = triggersMatch[1].split(',').map((t) => t.trim());
        continue;
      }

      const addedMatch = line.match(ADDED_RE);
      if (addedMatch) {
        currentLearning.timestamp = addedMatch[1];
        continue;
      }

      const sourceMatch = line.match(SOURCE_RE);
      if (sourceMatch) {
        currentLearning.source = sourceMatch[1];
        continue;
      }

      const typeMatch = line.match(TYPE_RE);
      if (typeMatch) {
        const typeStr = typeMatch[1].toLowerCase();
        if (typeStr.includes('correction')) {
          currentLearning.type = 'correction';
        } else if (typeStr.includes('approval')) {
          currentLearning.type = 'approval';
        }
        continue;
      }
    }

    // Capture user notes section
    if (line.match(/^##\s+User Notes/i)) {
      const noteLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].match(/^##\s+/)) break;
        noteLines.push(lines[j]);
      }
      userNotes = noteLines.join('\n').trim();
    }
  }

  // Don't forget the last learning
  if (currentLearning?.id && currentLearning?.content) {
    learnings.push(currentLearning as Learning);
  }

  return {
    skillName,
    version,
    lastUpdated,
    learnings,
    userNotes: userNotes || undefined,
  };
}

/**
 * Generate MEMORY.md content from structured data
 */
export function generateMemoryContent(memory: MemoryFile): string {
  const lines: string[] = [];
  const skillTitle = memory.skillName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Header
  lines.push(`# ${skillTitle} Memory`);
  lines.push('');
  lines.push('> Auto-generated by SpecWeave Reflect. User learnings are preserved across updates.');
  lines.push(`> Last updated: ${memory.lastUpdated}`);
  if (memory.version) {
    lines.push(`> Version: ${memory.version}`);
  }
  lines.push('');

  // Learnings section
  if (memory.learnings.length > 0) {
    lines.push('## Learned Patterns');
    lines.push('');

    // Sort by timestamp (newest first)
    const sorted = [...memory.learnings].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const learning of sorted) {
      const confDisplay = learning.confidence.charAt(0).toUpperCase() + learning.confidence.slice(1);
      lines.push(`#### ${learning.id} (${confDisplay} Confidence)`);

      if (learning.context) {
        lines.push(`**Context**: ${learning.context}`);
      }
      lines.push(`**Learning**: ${learning.content}`);

      if (learning.triggers && learning.triggers.length > 0) {
        lines.push(`**Triggers**: ${learning.triggers.join(', ')}`);
      }

      const addedDate = learning.timestamp.split('T')[0];
      lines.push(`**Added**: ${addedDate}`);

      if (learning.source) {
        lines.push(`**Source**: ${learning.source}`);
      }

      if (learning.type !== 'rule') {
        lines.push(`**Type**: ${learning.type}`);
      }

      lines.push('');
    }
  }

  // User notes section (preserved verbatim)
  if (memory.userNotes) {
    lines.push('## User Notes');
    lines.push('');
    lines.push(memory.userNotes);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Check if two learnings are duplicates
 * Uses multiple strategies similar to reflect.sh
 */
export function areLearningsDuplicate(a: Learning, b: Learning): boolean {
  // 1. Same ID
  if (a.id === b.id) return true;

  // 2. Normalize content for comparison
  const normA = a.content.toLowerCase().replace(/\s+/g, ' ').trim();
  const normB = b.content.toLowerCase().replace(/\s+/g, ' ').trim();

  // 3. Exact match
  if (normA === normB) return true;

  // 4. Substring match (one contains the other)
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // 5. Core phrase extraction
  const corePattern = /(use|prefer|always|never|avoid|don't)\s+\w+(\s+\w+)?/gi;
  const coresA = normA.match(corePattern) || [];
  const coresB = normB.match(corePattern) || [];

  for (const coreA of coresA) {
    for (const coreB of coresB) {
      if (coreA.toLowerCase() === coreB.toLowerCase()) return true;
    }
  }

  // 6. Keyword overlap (50%+ of 4+ char keywords)
  const keywordsA = new Set(
    normA
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .map((w) => w.replace(/[^a-z]/g, ''))
  );
  const keywordsB = new Set(
    normB
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .map((w) => w.replace(/[^a-z]/g, ''))
  );

  const intersection = new Set([...keywordsA].filter((x) => keywordsB.has(x)));
  const minSize = Math.min(keywordsA.size, keywordsB.size);

  if (minSize >= 2 && intersection.size / minSize >= 0.5) {
    return true;
  }

  return false;
}

/**
 * Merge two memory files, preserving user learnings
 */
export function mergeMemoryFiles(userMemory: MemoryFile | null, defaultMemory: MemoryFile | null): MergeResult {
  // Handle cases where one or both memories are null
  if (!userMemory && !defaultMemory) {
    return { success: true, content: '', added: 0, preserved: 0, deduped: 0, warnings: [] };
  }

  if (!userMemory) {
    return {
      success: true,
      content: generateMemoryContent(defaultMemory!),
      added: defaultMemory!.learnings.length,
      preserved: 0,
      deduped: 0,
      warnings: [],
    };
  }

  if (!defaultMemory) {
    return {
      success: true,
      content: generateMemoryContent(userMemory),
      added: 0,
      preserved: userMemory.learnings.length,
      deduped: 0,
      warnings: [],
    };
  }

  // Both exist - merge
  const merged: Learning[] = [...userMemory.learnings];
  let added = 0;
  let deduped = 0;

  for (const defaultLearning of defaultMemory.learnings) {
    if (merged.some((existing) => areLearningsDuplicate(existing, defaultLearning))) {
      deduped++;
    } else {
      merged.push(defaultLearning);
      added++;
    }
  }

  const result: MemoryFile = {
    skillName: userMemory.skillName,
    version: defaultMemory.version || userMemory.version,
    lastUpdated: new Date().toISOString(),
    learnings: merged,
    userNotes: userMemory.userNotes,
  };

  return {
    success: true,
    content: generateMemoryContent(result),
    added,
    preserved: userMemory.learnings.length,
    deduped,
    warnings: [],
  };
}

/**
 * Add a learning to a memory file
 * Handles deduplication automatically
 */
export function addLearning(memory: MemoryFile, learning: Learning): { added: boolean; reason?: string } {
  // Check for duplicates
  for (const existing of memory.learnings) {
    if (areLearningsDuplicate(existing, learning)) {
      return { added: false, reason: `Duplicate of ${existing.id}` };
    }
  }

  // Generate ID if not provided
  if (!learning.id) {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = memory.learnings.length + 1;
    learning.id = `LRN-${date}-${String(count).padStart(3, '0')}`;
  }

  memory.learnings.push(learning);
  memory.lastUpdated = new Date().toISOString();

  return { added: true };
}

/**
 * Remove a learning by ID
 */
export function removeLearning(memory: MemoryFile, learningId: string): boolean {
  const index = memory.learnings.findIndex((l) => l.id === learningId);
  if (index === -1) return false;

  memory.learnings.splice(index, 1);
  memory.lastUpdated = new Date().toISOString();
  return true;
}

/**
 * Read and parse memory file from disk
 */
export function readMemoryFile(filePath: string): MemoryFile | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return parseMemoryFile(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Write memory file to disk
 */
export function writeMemoryFile(filePath: string, memory: MemoryFile): void {
  const content = generateMemoryContent(memory);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content);
}

/**
 * Merge memory during skill update (called during marketplace refresh)
 *
 * @param targetDir - Directory where skill will be installed
 * @param sourceDir - Directory with new skill files
 * @param skillName - Name of the skill
 */
export function mergeSkillMemory(targetDir: string, sourceDir: string, skillName: string): MergeResult {
  const userMemoryPath = path.join(targetDir, skillName, 'MEMORY.md');
  const defaultMemoryPath = path.join(sourceDir, skillName, 'MEMORY.md');

  const userMemory = readMemoryFile(userMemoryPath);
  const defaultMemory = readMemoryFile(defaultMemoryPath);

  const result = mergeMemoryFiles(userMemory, defaultMemory);

  if (result.success && result.content) {
    writeMemoryFile(userMemoryPath, parseMemoryFile(result.content));
  }

  return result;
}

/**
 * Create empty memory file for a skill
 */
export function createEmptyMemory(skillName: string): MemoryFile {
  return {
    skillName,
    lastUpdated: new Date().toISOString(),
    learnings: [],
  };
}
