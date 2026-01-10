/**
 * Skill Memory Paths - Cross-platform resolution for skill memory locations
 *
 * Handles two distinct flows:
 * 1. Claude Code: Skills are copied to ~/.claude/plugins/marketplaces/specweave/
 * 2. Non-Claude: Skills stay in project's .specweave/plugins/
 *
 * User learnings are stored alongside skills and merged during marketplace refresh.
 */

import * as fs from 'fs';
import * as path from 'path';
import os from 'os';

/**
 * Path segments for the Claude Code marketplace installation.
 * Used consistently across all path construction functions.
 */
export const CLAUDE_MARKETPLACE_PATH = ['plugins', 'marketplaces', 'specweave'] as const;

/**
 * The OLD (broken) path pattern that was incorrectly used before the fix.
 * Used for migration detection.
 */
export const LEGACY_MEMORY_PATH = ['specweave', 'memory'] as const;

export interface SkillPaths {
  /** Base directory where skills are located */
  skillsDir: string;
  /** Memory file for a specific skill */
  memoryFile: string;
  /** Whether this is Claude Code environment */
  isClaudeCode: boolean;
  /** Platform (darwin, win32, linux) */
  platform: NodeJS.Platform;
}

export interface MemoryLocation {
  /** Path to memory file */
  path: string;
  /** Type: 'user' for user learnings, 'default' for bundled defaults */
  type: 'user' | 'default';
  /** Whether this file exists */
  exists: boolean;
}

/**
 * Get Claude Code user data directory (cross-platform)
 * - macOS: ~/.claude/
 * - Windows: %APPDATA%\Claude\ or %USERPROFILE%\.claude\
 * - Linux: ~/.claude/
 */
export function getClaudeUserDir(): string {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: prefer APPDATA, fallback to USERPROFILE
    const appData = process.env.APPDATA;
    if (appData) {
      return path.join(appData, 'Claude');
    }
    const userProfile = process.env.USERPROFILE || os.homedir();
    return path.join(userProfile, '.claude');
  }

  // macOS and Linux: ~/.claude/
  return path.join(os.homedir(), '.claude');
}

/**
 * Check if running inside Claude Code environment
 * Detection methods:
 * 1. CLAUDE_CODE env var
 * 2. Existence of ~/.claude/plugins/marketplaces/specweave/
 * 3. Parent process check (claude binary)
 */
export function isClaudeCodeEnvironment(): boolean {
  // Method 1: Environment variable
  if (process.env.CLAUDE_CODE === '1' || process.env.CLAUDE_CODE === 'true') {
    return true;
  }

  // Method 2: Check for Claude marketplace installation
  const claudeDir = getClaudeUserDir();
  const marketplacePath = path.join(claudeDir, ...CLAUDE_MARKETPLACE_PATH);
  if (fs.existsSync(marketplacePath)) {
    return true;
  }

  // Method 3: Check installed_plugins.json
  const installedPluginsPath = path.join(claudeDir, 'plugins', 'installed_plugins.json');
  if (fs.existsSync(installedPluginsPath)) {
    try {
      const content = fs.readFileSync(installedPluginsPath, 'utf-8');
      if (content.includes('specweave')) {
        return true;
      }
    } catch {
      // ignore read errors
    }
  }

  return false;
}

/**
 * Get the skills directory for the current environment
 *
 * When projectRoot is explicitly provided, use project-local skills directory.
 * Otherwise, detect Claude Code environment and use marketplace location.
 *
 * Claude Code (no projectRoot): ~/.claude/plugins/marketplaces/specweave/plugins/specweave/skills/
 * Project-local: {projectRoot}/.specweave/plugins/specweave/skills/
 */
export function getSkillsDirectory(projectRoot?: string): string {
  // If projectRoot is explicitly provided, always use project-local path
  // This ensures tests work correctly and allows explicit project targeting
  if (projectRoot) {
    return path.join(projectRoot, '.specweave', 'plugins', 'specweave', 'skills');
  }

  // No projectRoot provided - detect environment
  if (isClaudeCodeEnvironment()) {
    const claudeDir = getClaudeUserDir();
    return path.join(claudeDir, ...CLAUDE_MARKETPLACE_PATH, 'plugins', 'specweave', 'skills');
  }

  // Fallback: use current working directory
  return path.join(process.cwd(), '.specweave', 'plugins', 'specweave', 'skills');
}

/**
 * Get all available skill names from the skills directory
 */
export function listSkills(projectRoot?: string): string[] {
  const skillsDir = getSkillsDirectory(projectRoot);

  try {
    if (!fs.existsSync(skillsDir)) {
      return [];
    }

    return fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((dirent) => {
        if (!dirent.isDirectory()) return false;
        const skillFile = path.join(skillsDir, dirent.name, 'SKILL.md');
        return fs.existsSync(skillFile);
      })
      .map((dirent) => dirent.name);
  } catch {
    return [];
  }
}

/**
 * Get memory file path for a specific skill
 *
 * Memory is stored as MEMORY.md inside the skill directory.
 * This file contains user learnings that are merged during updates.
 */
export function getSkillMemoryPath(skillName: string, projectRoot?: string): string {
  const skillsDir = getSkillsDirectory(projectRoot);
  return path.join(skillsDir, skillName, 'MEMORY.md');
}

/**
 * Get all memory locations for a skill (user + default)
 *
 * For merging, we need to know:
 * 1. User memory (in installed location) - has user learnings
 * 2. Default memory (in source/bundle) - shipped defaults
 */
export function getSkillMemoryLocations(
  skillName: string,
  options: {
    projectRoot?: string;
    sourceDir?: string; // For marketplace update: source location of new skills
  } = {}
): MemoryLocation[] {
  const locations: MemoryLocation[] = [];

  // User memory (currently installed)
  const userMemoryPath = getSkillMemoryPath(skillName, options.projectRoot);
  locations.push({
    path: userMemoryPath,
    type: 'user',
    exists: fs.existsSync(userMemoryPath),
  });

  // Default memory (from source, if provided)
  if (options.sourceDir) {
    const defaultMemoryPath = path.join(options.sourceDir, skillName, 'MEMORY.md');
    locations.push({
      path: defaultMemoryPath,
      type: 'default',
      exists: fs.existsSync(defaultMemoryPath),
    });
  }

  return locations;
}

/**
 * Get skill directory path
 */
export function getSkillDirectory(skillName: string, projectRoot?: string): string {
  const skillsDir = getSkillsDirectory(projectRoot);
  return path.join(skillsDir, skillName);
}

/**
 * Check if a skill exists
 */
export function skillExists(skillName: string, projectRoot?: string): boolean {
  const skillDir = getSkillDirectory(skillName, projectRoot);
  const skillFile = path.join(skillDir, 'SKILL.md');
  return fs.existsSync(skillFile);
}

/**
 * Get SKILL.md path for a skill
 */
export function getSkillDefinitionPath(skillName: string, projectRoot?: string): string {
  return path.join(getSkillDirectory(skillName, projectRoot), 'SKILL.md');
}

/**
 * Resolve skill paths for the current environment
 */
export function resolveSkillPaths(skillName: string, projectRoot?: string): SkillPaths {
  const isClaudeCode = isClaudeCodeEnvironment();
  const skillsDir = getSkillsDirectory(projectRoot);
  const memoryFile = getSkillMemoryPath(skillName, projectRoot);

  return {
    skillsDir,
    memoryFile,
    isClaudeCode,
    platform: os.platform(),
  };
}

/**
 * Get global memory directory (for non-skill-specific learnings)
 * These are general learnings that don't map to a specific skill.
 *
 * When projectRoot is explicitly provided, use project-local memory directory.
 * Otherwise, detect Claude Code environment and use marketplace location.
 *
 * Claude Code (no projectRoot): ~/.claude/plugins/marketplaces/specweave/memory/
 * Project-local: {projectRoot}/.specweave/memory/
 */
export function getGlobalMemoryDir(projectRoot?: string): string {
  // If projectRoot is explicitly provided, always use project-local path
  // This ensures tests work correctly and allows explicit project targeting
  if (projectRoot) {
    return path.join(projectRoot, '.specweave', 'memory');
  }

  // No projectRoot provided - detect environment
  if (isClaudeCodeEnvironment()) {
    const claudeDir = getClaudeUserDir();
    // Use shared constant for consistency with getSkillsDirectory
    return path.join(claudeDir, ...CLAUDE_MARKETPLACE_PATH, 'memory');
  }

  // Fallback: use current working directory
  return path.join(process.cwd(), '.specweave', 'memory');
}

/**
 * Ensure memory directory exists for a skill
 */
export function ensureSkillMemoryDir(skillName: string, projectRoot?: string): void {
  const skillDir = getSkillDirectory(skillName, projectRoot);
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }
}

/**
 * Migration result for memory files from legacy location
 */
export interface MemoryMigrationResult {
  /** Whether migration was needed */
  migrationNeeded: boolean;
  /** Whether migration was successful */
  success: boolean;
  /** Number of files migrated */
  filesMigrated: number;
  /** Source path (legacy location) */
  sourcePath: string;
  /** Target path (correct location) */
  targetPath: string;
  /** Files that were migrated */
  migratedFiles: string[];
  /** Any errors encountered */
  errors: string[];
}

/**
 * Get the legacy (incorrect) memory path that was used before the fix.
 * This is ~/.claude/specweave/memory/ instead of the correct
 * ~/.claude/plugins/marketplaces/specweave/memory/
 */
export function getLegacyMemoryDir(): string {
  const claudeDir = getClaudeUserDir();
  return path.join(claudeDir, ...LEGACY_MEMORY_PATH);
}

/**
 * Check if there are memory files at the legacy (incorrect) location
 * that need to be migrated.
 */
export function hasLegacyMemoryFiles(): boolean {
  const legacyPath = getLegacyMemoryDir();

  try {
    return fs.existsSync(legacyPath) && fs.readdirSync(legacyPath).some((f) => f.endsWith('.md'));
  } catch {
    return false;
  }
}

/**
 * Migrate memory files from the legacy location to the correct location.
 *
 * Legacy location: ~/.claude/specweave/memory/
 * Correct location: ~/.claude/plugins/marketplaces/specweave/memory/
 *
 * This function:
 * 1. Checks if legacy files exist
 * 2. Creates the correct directory if needed
 * 3. Copies files (with merge if target exists)
 * 4. Removes legacy files after successful copy
 * 5. Removes empty legacy directories
 *
 * @param dryRun If true, only check what would be migrated without making changes
 * @returns Migration result with details
 */
export function migrateMemoryFiles(dryRun = false): MemoryMigrationResult {
  const legacyPath = getLegacyMemoryDir();
  const correctPath = getGlobalMemoryDir(); // Called without projectRoot to get Claude Code path
  const claudeDir = getClaudeUserDir();

  const result: MemoryMigrationResult = {
    migrationNeeded: false,
    success: true,
    filesMigrated: 0,
    sourcePath: legacyPath,
    targetPath: correctPath,
    migratedFiles: [],
    errors: [],
  };

  // Check if legacy location exists
  if (!fs.existsSync(legacyPath)) {
    return result;
  }

  // Get files to migrate
  let files: string[];
  try {
    files = fs.readdirSync(legacyPath).filter((f) => f.endsWith('.md'));
  } catch (err) {
    result.success = false;
    result.errors.push(`Failed to read legacy directory: ${err}`);
    return result;
  }

  if (files.length === 0) {
    return result;
  }

  result.migrationNeeded = true;

  if (dryRun) {
    result.migratedFiles = files;
    result.filesMigrated = files.length;
    return result;
  }

  // Create target directory if needed
  try {
    if (!fs.existsSync(correctPath)) {
      fs.mkdirSync(correctPath, { recursive: true });
    }
  } catch (err) {
    result.success = false;
    result.errors.push(`Failed to create target directory: ${err}`);
    return result;
  }

  // Migrate each file
  for (const file of files) {
    const sourcePath = path.join(legacyPath, file);
    const targetPath = path.join(correctPath, file);

    try {
      // Read source content
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');

      if (fs.existsSync(targetPath)) {
        // Target exists - append source learnings to target
        // (simple append, assuming both are valid MEMORY.md format)
        const targetContent = fs.readFileSync(targetPath, 'utf-8');
        const mergedContent = mergeMemoryContent(targetContent, sourceContent);
        fs.writeFileSync(targetPath, mergedContent);
      } else {
        // Target doesn't exist - just copy
        fs.writeFileSync(targetPath, sourceContent);
      }

      // Remove source file after successful copy
      fs.unlinkSync(sourcePath);
      result.migratedFiles.push(file);
      result.filesMigrated++;
    } catch (err) {
      result.errors.push(`Failed to migrate ${file}: ${err}`);
      result.success = false;
    }
  }

  // Try to remove empty legacy directories
  try {
    const remainingFiles = fs.readdirSync(legacyPath);
    if (remainingFiles.length === 0) {
      fs.rmdirSync(legacyPath);

      // Also try to remove parent specweave dir if empty
      const parentDir = path.join(claudeDir, 'specweave');
      if (fs.existsSync(parentDir)) {
        const parentFiles = fs.readdirSync(parentDir);
        if (parentFiles.length === 0) {
          fs.rmdirSync(parentDir);
        }
      }
    }
  } catch {
    // Non-critical - directory cleanup failed but migration succeeded
  }

  return result;
}

/**
 * Merge two MEMORY.md contents, avoiding duplicate learnings.
 */
function mergeMemoryContent(targetContent: string, sourceContent: string): string {
  const learningIdPattern = /^####\s+(LRN-[\w-]+)/gm;
  const targetIds = new Set([...targetContent.matchAll(learningIdPattern)].map((m) => m[1]));

  const sourceLearnings = sourceContent
    .split(/(?=^####\s+LRN-)/m)
    .filter((block) => {
      const idMatch = block.match(/^####\s+(LRN-[\w-]+)/);
      return idMatch && !targetIds.has(idMatch[1]);
    })
    .map((block) => block.trim());

  if (sourceLearnings.length === 0) {
    return targetContent;
  }

  return targetContent.trimEnd() + '\n\n' + sourceLearnings.join('\n\n') + '\n';
}
