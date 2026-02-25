/**
 * Project-Scope Initialization Guard
 *
 * Prevents SpecWeave skills from running in non-initialized projects.
 * Provides user-friendly prompts to initialize or disable plugins.
 *
 * ## Background
 *
 * Claude Code plugins are globally enabled in `~/.claude/settings.json`,
 * which means SpecWeave skills appear in ALL projects, not just initialized ones.
 * This guard prevents skills from executing in non-initialized projects and
 * provides clear guidance to users.
 *
 * ## Usage
 *
 * ```typescript
 * import { evaluateProjectScopeGuard } from './project-scope-guard.js';
 *
 * const result = evaluateProjectScopeGuard(userPrompt, process.cwd());
 * if (result.shouldBlock) {
 *   console.error(result.userPromptMessage);
 *   process.exit(1);
 * }
 * ```
 *
 * ## Configuration
 *
 * - Environment: `SPECWEAVE_DISABLE_GUARD=1` to bypass guard
 * - Config: `.specweave/config.json` → `guard.enabled: false`
 *
 * @module core/hooks/project-scope-guard
 * @since 1.0.235
 */

import * as fs from 'fs';
import * as path from 'path';
import { findProjectRoot } from '../../utils/find-project-root.js';

/**
 * Guard evaluation result
 */
export interface GuardResult {
  /** Whether to block the skill invocation */
  shouldBlock: boolean;
  /** Reason for blocking (if applicable) */
  reason?: string;
  /** Whether to prompt the user for action */
  promptUser?: boolean;
  /** User-friendly prompt message */
  userPromptMessage?: string;
}

/**
 * Check if a prompt is invoking a SpecWeave skill
 *
 * Detects patterns like:
 * - /sw:increment "feature"
 * - /frontend:architect
 * - /SW:DO (case-insensitive)
 *
 * @param prompt - User's prompt
 * @returns true if it's a SpecWeave skill invocation
 */
export function isSpecWeaveSkillInvocation(prompt: string): boolean {
  if (!prompt) return false;

  // Normalize: trim whitespace and convert to lowercase
  const normalized = prompt.trim().toLowerCase();

  // Check for /sw: or /sw-<plugin>: patterns
  return /^\/sw(-[a-z0-9-]+)?:/.test(normalized);
}

/**
 * Check if SpecWeave is initialized in a project
 *
 * A project is considered initialized if .specweave/config.json exists
 * and is readable.
 *
 * @param projectPath - Path to check (defaults to cwd)
 * @returns true if .specweave/config.json exists
 */
export function isProjectInitialized(projectPath: string = process.cwd()): boolean {
  try {
    // First, try to find project root by walking up the tree
    const projectRoot = findProjectRoot(projectPath);
    if (!projectRoot) {
      // No .specweave found in tree
      return false;
    }

    // Check if config.json exists and is readable
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return false;
    }

    // Try to read the file to ensure it's valid
    try {
      fs.accessSync(configPath, fs.constants.R_OK);
      // Try to parse it to ensure it's valid JSON
      const content = fs.readFileSync(configPath, 'utf8');
      JSON.parse(content);
      return true;
    } catch (error) {
      // File exists but can't read or parse - treat as not initialized
      return false;
    }
  } catch (error) {
    // Any error means not initialized
    return false;
  }
}

/**
 * Check if guard is disabled via environment variable or config
 *
 * @param projectPath - Path to check config (optional)
 * @returns true if guard is disabled
 */
function isGuardDisabled(projectPath?: string): boolean {
  // Check environment variable first
  if (process.env.SPECWEAVE_DISABLE_GUARD === '1') {
    return true;
  }

  // Check config if project is initialized
  if (projectPath) {
    try {
      const projectRoot = findProjectRoot(projectPath);
      if (projectRoot) {
        const configPath = path.join(projectRoot, '.specweave', 'config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (config.guard?.enabled === false) {
            return true;
          }
        }
      }
    } catch (error) {
      // Ignore errors reading config
    }
  }

  return false;
}

/**
 * Generate user-friendly prompt message for non-initialized projects
 *
 * @param skillInvocation - The skill that was invoked (e.g., "/sw:increment")
 * @returns Formatted message for the user
 */
function generateUserPromptMessage(skillInvocation: string): string {
  return `⚠️ **SpecWeave Not Initialized**

You invoked \`${skillInvocation}\`, but this project hasn't been initialized with SpecWeave yet.

**Options:**

1. **Initialize SpecWeave in this project:**
   \`\`\`bash
   specweave init
   # or
   npx specweave init
   \`\`\`

2. **Use SpecWeave in a different directory:**
   Navigate to a SpecWeave project first:
   \`\`\`bash
   cd /path/to/your/specweave-project
   \`\`\`

3. **Disable SpecWeave plugins globally:**
   If you don't need SpecWeave in most projects, disable it in:
   \`~/.claude/settings.json\`
   \`\`\`json
   {
     "enabledPlugins": {
       "sw@specweave": false,
       "sw-frontend@specweave": false
     }
   }
   \`\`\`

4. **Disable this guard (not recommended):**
   \`\`\`bash
   export SPECWEAVE_DISABLE_GUARD=1
   \`\`\`

**Note:** SpecWeave skills are globally installed but require project-specific initialization to work correctly.`;
}

/**
 * Evaluate if skill invocation should be guarded
 *
 * @param prompt - User's prompt
 * @param projectPath - Current working directory
 * @returns Guard decision with reason and user prompt if needed
 */
export function evaluateProjectScopeGuard(
  prompt: string,
  projectPath: string = process.cwd()
): GuardResult {
  // Check if guard is disabled
  if (isGuardDisabled(projectPath)) {
    return { shouldBlock: false };
  }

  // Check if this is a SpecWeave skill invocation
  if (!isSpecWeaveSkillInvocation(prompt)) {
    return { shouldBlock: false };
  }

  // Check if project is initialized
  if (isProjectInitialized(projectPath)) {
    return { shouldBlock: false };
  }

  // Block with user-friendly prompt
  const skillMatch = prompt.trim().match(/^(\/sw(-[a-z0-9-]+)?:[a-z-]+)/i);
  const skillName = skillMatch ? skillMatch[1] : '/sw:<skill>';

  return {
    shouldBlock: true,
    promptUser: true,
    reason: 'Project not initialized with SpecWeave',
    userPromptMessage: generateUserPromptMessage(skillName)
  };
}
