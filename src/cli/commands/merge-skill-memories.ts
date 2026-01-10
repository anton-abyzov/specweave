/**
 * Merge Skill Memories - Preserves user learnings during marketplace refresh
 *
 * This module handles the merging of skill memories when the marketplace is updated.
 * It ensures that user learnings (stored in MEMORY.md files) are preserved while
 * allowing new default learnings from the updated marketplace to be added.
 *
 * Architecture:
 * - Each skill can have a MEMORY.md file with learnings
 * - User learnings are ALWAYS preserved
 * - Default learnings from new versions are merged in (deduplicated)
 * - This runs during `specweave refresh-marketplace`
 */

import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import {
  readMemoryFile,
  writeMemoryFile,
  mergeMemoryFiles,
  parseMemoryFile,
  type MergeResult,
} from '../../core/reflection/skill-memory-merger.js';
import { getClaudeUserDir, isClaudeCodeEnvironment } from '../../core/reflection/skill-memory-paths.js';

export interface SkillMemoryMergeResult {
  skillsProcessed: number;
  learningsPreserved: number;
  learningsAdded: number;
  learningsDeduped: number;
  errors: string[];
}

/**
 * Get the installed skills directory based on environment
 */
function getInstalledSkillsDir(): string | null {
  if (isClaudeCodeEnvironment()) {
    const claudeDir = getClaudeUserDir();
    const skillsDir = path.join(claudeDir, 'plugins', 'marketplaces', 'specweave', 'plugins', 'specweave', 'skills');
    return fs.existsSync(skillsDir) ? skillsDir : null;
  }

  // Non-Claude: check .specweave/plugins/specweave/skills in current project
  const projectSkillsDir = path.join(process.cwd(), '.specweave', 'plugins', 'specweave', 'skills');
  return fs.existsSync(projectSkillsDir) ? projectSkillsDir : null;
}

/** Get skill names from a skills directory */
function getSkillNames(skillsDir: string): string[] {
  if (!fs.existsSync(skillsDir)) return [];

  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .filter(dirent => fs.existsSync(path.join(skillsDir, dirent.name, 'SKILL.md')))
    .map(dirent => dirent.name);
}

/** Backup existing memory files before merge (keeps last 5) */
function backupMemoryFile(memoryPath: string): void {
  if (!fs.existsSync(memoryPath)) return;

  const backupDir = path.join(path.dirname(memoryPath), '.memory-backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(memoryPath, path.join(backupDir, `MEMORY-${timestamp}.md`));

  // Prune old backups (keep last 5)
  const backups = fs
    .readdirSync(backupDir)
    .filter(f => f.startsWith('MEMORY-'))
    .sort()
    .reverse();

  backups.slice(5).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
}

/**
 * Merge skill memories during marketplace refresh
 *
 * This is called from refresh-marketplace command to preserve user learnings
 * while updating skills from the marketplace.
 *
 * @param marketplacePath - Path to the updated marketplace (source of new skills)
 * @param verbose - Whether to log detailed info
 */
export async function mergeSkillMemoriesOnRefresh(
  marketplacePath: string,
  verbose = false
): Promise<SkillMemoryMergeResult> {
  const result: SkillMemoryMergeResult = {
    skillsProcessed: 0,
    learningsPreserved: 0,
    learningsAdded: 0,
    learningsDeduped: 0,
    errors: [],
  };

  // Get source skills directory (from marketplace)
  const sourceSkillsDir = path.join(marketplacePath, 'plugins', 'specweave', 'skills');
  if (!fs.existsSync(sourceSkillsDir)) {
    if (verbose) {
      console.log(`  No skills directory in marketplace: ${sourceSkillsDir}`);
    }
    return result;
  }

  // Get target skills directory (installed location)
  const targetSkillsDir = getInstalledSkillsDir();
  if (!targetSkillsDir) {
    if (verbose) {
      console.log('  No installed skills directory found');
    }
    return result;
  }

  // Get list of skills from source
  const skillNames = getSkillNames(sourceSkillsDir);
  if (skillNames.length === 0) {
    if (verbose) {
      console.log('  No skills found in marketplace');
    }
    return result;
  }

  // Process each skill
  for (const skillName of skillNames) {
    const sourceMemoryPath = path.join(sourceSkillsDir, skillName, 'MEMORY.md');
    const targetMemoryPath = path.join(targetSkillsDir, skillName, 'MEMORY.md');

    // Skip if neither source nor target has memory
    const sourceHasMemory = fs.existsSync(sourceMemoryPath);
    const targetHasMemory = fs.existsSync(targetMemoryPath);

    if (!sourceHasMemory && !targetHasMemory) {
      continue;
    }

    try {
      // Backup existing memory before merge
      if (targetHasMemory) {
        backupMemoryFile(targetMemoryPath);
      }

      // Read memories
      const sourceMemory = sourceHasMemory ? readMemoryFile(sourceMemoryPath) : null;
      const targetMemory = targetHasMemory ? readMemoryFile(targetMemoryPath) : null;

      // Merge: target (user) takes priority, source (defaults) added
      const mergeResult = mergeMemoryFiles(targetMemory, sourceMemory);

      if (mergeResult.success && mergeResult.content) {
        // Ensure target directory exists
        const targetDir = path.dirname(targetMemoryPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Write merged memory
        fs.writeFileSync(targetMemoryPath, mergeResult.content);

        result.skillsProcessed++;
        result.learningsPreserved += mergeResult.preserved;
        result.learningsAdded += mergeResult.added;
        result.learningsDeduped += mergeResult.deduped;

        if (verbose && (mergeResult.preserved > 0 || mergeResult.added > 0)) {
          console.log(`  ${skillName}: ${mergeResult.preserved} preserved, ${mergeResult.added} added`);
        }
      }
    } catch (error) {
      result.errors.push(`${skillName}: ${error}`);
    }
  }

  return result;
}

/**
 * Merge memories for a single skill (can be called independently)
 */
export async function mergeSkillMemory(
  skillName: string,
  sourcePath?: string,
  targetPath?: string
): Promise<MergeResult> {
  // Default paths based on environment
  if (!sourcePath || !targetPath) {
    const marketplacePath = path.join(
      getClaudeUserDir(),
      'plugins',
      'marketplaces',
      'specweave',
      'plugins',
      'specweave',
      'skills'
    );
    const installedPath = getInstalledSkillsDir();

    if (!installedPath) {
      return {
        success: false,
        content: '',
        added: 0,
        preserved: 0,
        deduped: 0,
        warnings: ['No installed skills directory found'],
      };
    }

    sourcePath = path.join(marketplacePath, skillName, 'MEMORY.md');
    targetPath = path.join(installedPath, skillName, 'MEMORY.md');
  }

  const sourceMemory = fs.existsSync(sourcePath) ? readMemoryFile(sourcePath) : null;
  const targetMemory = fs.existsSync(targetPath) ? readMemoryFile(targetPath) : null;

  const result = mergeMemoryFiles(targetMemory, sourceMemory);

  if (result.success && result.content) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, result.content);
  }

  return result;
}
