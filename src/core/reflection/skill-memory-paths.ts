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
  const marketplacePath = path.join(claudeDir, 'plugins', 'marketplaces', 'specweave');
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
    return path.join(claudeDir, 'plugins', 'marketplaces', 'specweave', 'plugins', 'specweave', 'skills');
  }

  // Fallback: use current working directory
  return path.join(process.cwd(), '.specweave', 'plugins', 'specweave', 'skills');
}

/**
 * Get all available skill names from the skills directory
 */
export function listSkills(projectRoot?: string): string[] {
  const skillsDir = getSkillsDirectory(projectRoot);

  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  try {
    return fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .filter((dirent) => {
        // Check for SKILL.md to validate it's a real skill
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
    // Match the path structure used by getSkillsDirectory: plugins/marketplaces/specweave/
    return path.join(claudeDir, 'plugins', 'marketplaces', 'specweave', 'memory');
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
