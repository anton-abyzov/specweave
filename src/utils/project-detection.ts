/**
 * Project ID Auto-Detection Utilities
 *
 * Detects project ID from:
 * 1. Git remote (GitHub repo name)
 * 2. Sync configuration (JIRA project key, ADO project name)
 * 3. User prompt (fallback)
 */

import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { ConfigManager } from '../core/config-manager.js';
import { SyncProfile } from '../core/types/sync-profile.js';

/**
 * Auto-detect project ID from git remote URL
 *
 * Extracts repository name from git remote URL
 *
 * @param projectRoot - Project root directory
 * @returns Project ID (repo name) or null if not detected
 *
 * @example
 * // Git remote: https://github.com/anton-abyzov/specweave.git
 * detectProjectIdFromGit('/path/to/project')
 * // Returns: "specweave"
 *
 * @example
 * // Git remote: git@github.com:my-org/web-app.git
 * detectProjectIdFromGit('/path/to/project')
 * // Returns: "web-app"
 */
export function detectProjectIdFromGit(projectRoot: string): string | null {
  try {
    const gitConfigPath = path.join(projectRoot, '.git', 'config');

    // Check if .git/config exists
    if (!fs.existsSync(gitConfigPath)) {
      return null;
    }

    // Read git config
    const gitConfig = fs.readFileSync(gitConfigPath, 'utf8');

    // Extract remote URL (match both HTTPS and SSH formats)
    // HTTPS: https://github.com/owner/repo.git
    // SSH: git@github.com:owner/repo.git
    const httpsMatch = gitConfig.match(/url = https?:\/\/[^\/]+\/[^\/]+\/([^\/\s]+?)(?:\.git)?$/m);
    const sshMatch = gitConfig.match(/url = git@[^:]+:[^\/]+\/([^\/\s]+?)(?:\.git)?$/m);

    const match = httpsMatch || sshMatch;

    if (match && match[1]) {
      const repoName = match[1].trim();

      // Validate repo name (lowercase, alphanumeric, hyphens, underscores)
      if (/^[a-z0-9_-]+$/i.test(repoName)) {
        return repoName.toLowerCase();
      }
    }

    return null;
  } catch (error) {
    // Silently fail (not in git repo or permission error)
    return null;
  }
}

/**
 * Auto-detect project ID from sync configuration
 *
 * Checks existing sync profiles for JIRA project key or ADO project name
 *
 * @param projectRoot - Project root directory
 * @returns Project ID from sync config or null if not detected
 *
 * @example
 * // Config has JIRA: { projectKey: "WEBAPP" }
 * detectProjectIdFromSync('/path/to/project')
 * // Returns: "webapp"
 */
export function detectProjectIdFromSync(projectRoot: string): string | null {
  try {
    const configManager = new ConfigManager(projectRoot);
    const config = configManager.load();

    // Check sync profiles for project identifiers
    if (config.sync?.profiles) {
      const profiles = Object.values(config.sync.profiles) as SyncProfile[];

      for (const profile of profiles) {
        // GitHub profile (extract repo name)
        if (profile.provider === 'github') {
          const githubConfig = profile.config as any;
          if (githubConfig?.repo) {
            return githubConfig.repo.toLowerCase();
          }
        }

        // JIRA profile (use project key)
        if (profile.provider === 'jira') {
          const jiraConfig = profile.config as any;
          if (jiraConfig?.projectKey) {
            return jiraConfig.projectKey.toLowerCase();
          }
        }

        // Azure DevOps profile (use project name)
        if (profile.provider === 'ado') {
          const adoConfig = profile.config as any;
          if (adoConfig?.project) {
            return adoConfig.project.toLowerCase().replace(/\s+/g, '-');
          }
        }
      }
    }

    // Legacy: Check old sync config format (pre-profiles)
    if (config.sync?.jira?.projectKey) {
      return config.sync.jira.projectKey.toLowerCase();
    }

    if (config.sync?.ado?.project) {
      return config.sync.ado.project.toLowerCase().replace(/\s+/g, '-');
    }

    if (config.sync?.github?.repo) {
      return config.sync.github.repo.toLowerCase();
    }

    return null;
  } catch (error) {
    // Config doesn't exist or is invalid
    return null;
  }
}

/**
 * Prompt user for project ID
 *
 * Interactive prompt with validation and helpful examples
 *
 * @param suggestedId - Optional suggested project ID (from detection)
 * @returns Project ID entered by user
 *
 * @example
 * await promptForProjectId()
 * // User sees:
 * // Project ID (matches GitHub repo, JIRA project, or ADO project): █
 * // User enters: "web-app"
 * // Returns: "web-app"
 */
export async function promptForProjectId(suggestedId?: string): Promise<string> {
  const { projectId } = await inquirer.prompt([{
    type: 'input',
    name: 'projectId',
    message: 'Project ID (matches GitHub repo, JIRA project, or ADO project):',
    default: suggestedId || 'default',
    validate: (input: string) => {
      if (!input) {
        return 'Project ID is required';
      }

      if (!/^[a-z0-9_-]+$/.test(input)) {
        return 'Project ID must be lowercase, alphanumeric, with hyphens or underscores';
      }

      if (input.length < 2) {
        return 'Project ID must be at least 2 characters';
      }

      if (input.length > 64) {
        return 'Project ID must be at most 64 characters';
      }

      return true;
    }
  }]);

  return projectId;
}

/**
 * Auto-detect project ID synchronously (no prompts)
 *
 * Priority:
 * 1. Git remote (GitHub repo name)
 * 2. Sync configuration (JIRA/ADO project)
 * 3. "default" (fallback)
 *
 * @param projectRoot - Project root directory
 * @param options - Detection options
 * @returns Detected project ID or "default"
 *
 * @example
 * // In git repo: https://github.com/anton-abyzov/specweave.git
 * autoDetectProjectIdSync('/path/to/project')
 * // Returns: "specweave"
 *
 * @example
 * // No git, no sync
 * autoDetectProjectIdSync('/path/to/project')
 * // Returns: "default"
 */
export function autoDetectProjectIdSync(
  projectRoot: string,
  options: {
    silent?: boolean;  // Don't print detection messages
  } = {}
): string {
  const { silent = false } = options;

  // 1. Try git remote
  const gitProjectId = detectProjectIdFromGit(projectRoot);
  if (gitProjectId) {
    if (!silent) {
      console.log(`✅ Detected git repository: ${gitProjectId}`);
    }
    return gitProjectId;
  }

  // 2. Try sync config
  const syncProjectId = detectProjectIdFromSync(projectRoot);
  if (syncProjectId) {
    if (!silent) {
      console.log(`✅ Detected sync configuration: ${syncProjectId}`);
    }
    return syncProjectId;
  }

  // 3. Fallback to "default"
  return 'default';
}

/**
 * Auto-detect project ID with fallback chain (async version with prompts)
 *
 * Priority:
 * 1. Git remote (GitHub repo name)
 * 2. Sync configuration (JIRA/ADO project)
 * 3. User prompt (with detected suggestion)
 * 4. "default" (if user accepts default in prompt)
 *
 * @param projectRoot - Project root directory
 * @param options - Detection options
 * @returns Detected or prompted project ID
 *
 * @example
 * // In git repo: https://github.com/anton-abyzov/specweave.git
 * await autoDetectProjectId('/path/to/project')
 * // Output: "✅ Detected git repository: specweave"
 * // Returns: "specweave"
 *
 * @example
 * // No git, no sync, user prompted
 * await autoDetectProjectId('/path/to/project')
 * // Output: "📝 No git repository or sync configuration detected."
 * // Prompts user for project ID
 * // Returns: user input (e.g., "my-project")
 */
export async function autoDetectProjectId(
  projectRoot: string,
  options: {
    silent?: boolean;  // Don't print detection messages
    promptIfNotDetected?: boolean;  // Prompt user if detection fails (default: true)
  } = {}
): Promise<string> {
  const { silent = false, promptIfNotDetected = true } = options;

  // 1. Try git remote
  const gitProjectId = detectProjectIdFromGit(projectRoot);
  if (gitProjectId) {
    if (!silent) {
      console.log(`✅ Detected git repository: ${gitProjectId}`);
    }
    return gitProjectId;
  }

  // 2. Try sync config
  const syncProjectId = detectProjectIdFromSync(projectRoot);
  if (syncProjectId) {
    if (!silent) {
      console.log(`✅ Detected sync configuration: ${syncProjectId}`);
    }
    return syncProjectId;
  }

  // 3. Prompt user (if enabled)
  if (promptIfNotDetected) {
    if (!silent) {
      console.log('\n📝 No git repository or sync configuration detected.');
      console.log('   Please enter your project identifier.\n');
      console.log('   Examples:');
      console.log('   • GitHub repo "web-app" → enter: web-app');
      console.log('   • JIRA project "WEBAPP" → enter: webapp');
      console.log('   • ADO project "Platform" → enter: platform');
      console.log('   • Generic project → enter: default\n');
    }

    return await promptForProjectId();
  }

  // 4. Fallback to "default" (no prompt)
  return 'default';
}

/**
 * Format project ID to display name
 *
 * Converts kebab-case/snake_case to Title Case
 *
 * @param projectId - Project ID (e.g., "web-app", "mobile_app")
 * @returns Formatted name (e.g., "Web App", "Mobile App")
 *
 * @example
 * formatProjectName('web-app')
 * // Returns: "Web App"
 *
 * @example
 * formatProjectName('mobile_app')
 * // Returns: "Mobile App"
 *
 * @example
 * formatProjectName('specweave')
 * // Returns: "SpecWeave"
 */
export function formatProjectName(projectId: string): string {
  // Special cases (known project names)
  const specialCases: Record<string, string> = {
    'specweave': 'SpecWeave',
    'webapp': 'WebApp',
    'default': 'Default Project'
  };

  if (specialCases[projectId.toLowerCase()]) {
    return specialCases[projectId.toLowerCase()];
  }

  // Convert kebab-case or snake_case to Title Case
  return projectId
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Validate project ID format
 *
 * @param projectId - Project ID to validate
 * @returns True if valid, error message if invalid
 */
export function validateProjectId(projectId: string): true | string {
  if (!projectId) {
    return 'Project ID is required';
  }

  if (!/^[a-z0-9_-]+$/.test(projectId)) {
    return 'Project ID must be lowercase, alphanumeric, with hyphens or underscores';
  }

  if (projectId.length < 2) {
    return 'Project ID must be at least 2 characters';
  }

  if (projectId.length > 64) {
    return 'Project ID must be at most 64 characters';
  }

  return true;
}
