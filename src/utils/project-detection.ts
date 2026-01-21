/**
 * Project ID Auto-Detection Utilities
 *
 * Detects project ID from (priority order):
 * 1. sync.defaultProfile (for multi-profile monorepos)
 * 2. Git remote (GitHub repo name)
 * 3. Sync configuration (JIRA project key, ADO project name)
 * 4. User prompt (fallback)
 *
 * NOTE (v0.33.0): multiProject.activeProject has been REMOVED!
 * Per-US project targeting replaces global activeProject.
 * See: 0125-cross-project-user-story-targeting
 *
 * Also provides repo name parsing for domain context understanding.
 */

import * as fs from '../utils/fs-native.js';
import path from 'path';
import { input } from '@inquirer/prompts';
import { ConfigManager } from '../core/config-manager.js';
import { SyncProfile } from '../core/types/sync-profile.js';

/**
 * Parsed repo name structure for domain understanding
 *
 * @example
 * parseRepoName('sw-qr-menu-be')
 * // Returns: { prefix: 'sw', product: 'qr-menu', component: 'be', full: 'sw-qr-menu-be' }
 */
export interface ParsedRepoName {
  /** Short prefix (e.g., 'sw' for company/project abbreviation) */
  prefix: string | null;
  /** Product/domain name (e.g., 'qr-menu') */
  product: string;
  /** Component suffix (e.g., 'be', 'fe', 'shared', 'api', 'web', 'mobile') */
  component: string | null;
  /** Full original repo name */
  full: string;
  /** Detected domain context based on product name */
  domain: string | null;
}

/** Known component suffixes that indicate sub-project type */
const KNOWN_COMPONENTS = ['be', 'fe', 'backend', 'frontend', 'api', 'web', 'mobile', 'shared', 'common', 'core', 'lib', 'ui', 'app', 'service', 'services'];

/** Domain detection patterns */
const DOMAIN_PATTERNS: Array<{ pattern: RegExp; domain: string }> = [
  { pattern: /qr[-_]?menu|menu[-_]?qr|restaurant|food|dining/i, domain: 'hospitality/restaurant' },
  { pattern: /e[-_]?commerce|shop|store|cart|checkout/i, domain: 'retail/ecommerce' },
  { pattern: /health|medical|patient|clinic|hospital/i, domain: 'healthcare' },
  { pattern: /finance|banking|payment|wallet|money/i, domain: 'fintech' },
  { pattern: /edu|learn|school|course|student/i, domain: 'education' },
  { pattern: /social|chat|message|community/i, domain: 'social' },
  { pattern: /iot|sensor|device|smart[-_]?home/i, domain: 'iot' },
  { pattern: /ai|ml|model|predict/i, domain: 'ai/ml' },
  { pattern: /game|play|score/i, domain: 'gaming' },
  { pattern: /travel|booking|hotel|flight/i, domain: 'travel' },
];

/**
 * Parse repo name to extract product, component, and domain context
 *
 * Understands naming conventions like:
 * - `sw-qr-menu-be` → prefix: sw, product: qr-menu, component: be
 * - `my-app-frontend` → prefix: null, product: my-app, component: frontend
 * - `ecommerce-api` → prefix: null, product: ecommerce, component: api
 *
 * @param repoName - Repository name (e.g., "sw-qr-menu-be")
 * @returns Parsed repo name structure
 */
export function parseRepoName(repoName: string): ParsedRepoName {
  const normalized = repoName.toLowerCase().trim();
  const parts = normalized.split(/[-_]+/);

  let prefix: string | null = null;
  let component: string | null = null;
  let productParts: string[] = parts;

  // Check if last part is a known component
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (KNOWN_COMPONENTS.includes(lastPart)) {
      component = lastPart;
      productParts = parts.slice(0, -1);
    }
  }

  // Check if first part is a short prefix (2-3 chars, likely abbreviation)
  if (productParts.length > 1 && productParts[0].length <= 3) {
    prefix = productParts[0];
    productParts = productParts.slice(1);
  }

  const product = productParts.join('-');

  // Detect domain from product name
  let domain: string | null = null;
  for (const { pattern, domain: detectedDomain } of DOMAIN_PATTERNS) {
    if (pattern.test(product) || pattern.test(normalized)) {
      domain = detectedDomain;
      break;
    }
  }

  return {
    prefix,
    product,
    component,
    full: normalized,
    domain,
  };
}

/**
 * Detect default project ID from configuration
 *
 * NOTE (v0.33.0): multiProject.activeProject has been REMOVED!
 * This function now only uses sync.defaultProfile for legacy umbrella repos.
 *
 * Priority:
 * 1. sync.defaultProfile - for umbrella repos where profile maps to folder
 *
 * @param projectRoot - Project root directory
 * @returns Default project ID or null if not configured
 */
export function detectDefaultProfileId(projectRoot: string): string | null {
  try {
    const configManager = new ConfigManager(projectRoot);
    const config = configManager.load();

    // sync.defaultProfile for umbrella repos
    // where profile IS a folder (like "be", "fe", "shared")
    if (config.sync?.defaultProfile && config.sync?.profiles) {
      const defaultProfileId = config.sync.defaultProfile;

      // CRITICAL FIX (2025-11-30, 2026-01-04): Profile IDs are NOT folder names!
      // ProfileIds like "main", "ado-myproject", "jira-webapp" are sync connection identifiers
      // NOT project folders! The actual folder name comes from profile.config.repo/project
      // Bug: "main" was being used as folder name instead of actual repo name
      const profile = config.sync.profiles[defaultProfileId] as SyncProfile | undefined;
      if (profile?.config) {
        const profileConfig = profile.config as Record<string, unknown>;
        // GitHub: use repo name from config (MOST COMMON CASE)
        if (profile.provider === 'github' && profileConfig.repo) {
          return String(profileConfig.repo).toLowerCase();
        }
        // ADO: use project name from config
        if (profile.provider === 'ado' && profileConfig.project) {
          return String(profileConfig.project).toLowerCase().replace(/\s+/g, '-');
        }
        // JIRA: use project key from config
        if (profile.provider === 'jira' && profileConfig.projectKey) {
          return String(profileConfig.projectKey).toLowerCase();
        }
      }

      // Legacy umbrella repos: profile maps to folder (e.g., "be", "fe", "shared")
      // ONLY use profileId as folder name if it's NOT a generic identifier like "main"
      // and it doesn't look like a provider prefix (ado-, jira-, github-)
      const isGenericProfileId = defaultProfileId === 'main' || defaultProfileId === 'default';
      const isProviderPrefixed = /^(ado|jira|github|gitlab)-/.test(defaultProfileId);

      if (!isGenericProfileId && !isProviderPrefixed && config.sync.profiles[defaultProfileId]) {
        return defaultProfileId.toLowerCase();
      }

      // Profile ID is generic ("main") or provider-prefixed - let git detection handle it
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

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
  const projectId = await input({
    message: 'Project ID (matches GitHub repo, JIRA project, or ADO project):',
    default: suggestedId || 'default',
    validate: (value: string) => {
      if (!value) {
        return 'Project ID is required';
      }

      if (!/^[a-z0-9_-]+$/.test(value)) {
        return 'Project ID must be lowercase, alphanumeric, with hyphens or underscores';
      }

      if (value.length < 2) {
        return 'Project ID must be at least 2 characters';
      }

      if (value.length > 64) {
        return 'Project ID must be at most 64 characters';
      }

      return true;
    }
  });

  return projectId;
}

/**
 * Auto-detect project ID synchronously (no prompts)
 *
 * Priority:
 * 1. Active sync profile ID (for multi-profile monorepos like sw-qr-menu)
 * 2. Git remote (GitHub repo name) - for single-repo projects
 * 3. Sync configuration (JIRA/ADO project) - legacy fallback
 * 4. "default" (fallback)
 *
 * @param projectRoot - Project root directory
 * @param options - Detection options
 * @returns Detected project ID or "default"
 *
 * @example
 * // Multi-project setup with activeProject: "be"
 * autoDetectProjectIdSync('/path/to/sw-qr-menu')
 * // Returns: "be" (profile ID, NOT "sw-qr-menu-be")
 *
 * @example
 * // Single repo: https://github.com/anton-abyzov/specweave.git
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

  // 1. Try default profile ID (highest priority for multi-profile monorepos)
  const defaultProfileId = detectDefaultProfileId(projectRoot);
  if (defaultProfileId) {
    if (!silent) {
      console.log(`✅ Detected default profile: ${defaultProfileId}`);
    }
    return defaultProfileId;
  }

  // 2. Try git remote (for single-repo projects)
  const gitProjectId = detectProjectIdFromGit(projectRoot);
  if (gitProjectId) {
    if (!silent) {
      console.log(`✅ Detected git repository: ${gitProjectId}`);
    }
    return gitProjectId;
  }

  // 3. Try sync config (legacy fallback)
  const syncProjectId = detectProjectIdFromSync(projectRoot);
  if (syncProjectId) {
    if (!silent) {
      console.log(`✅ Detected sync configuration: ${syncProjectId}`);
    }
    return syncProjectId;
  }

  // 4. Fallback to "default"
  return 'default';
}

/**
 * Auto-detect project ID with fallback chain (async version with prompts)
 *
 * Priority:
 * 1. Default sync profile ID (for multi-profile monorepos)
 * 2. Git remote (GitHub repo name)
 * 3. Sync configuration (JIRA/ADO project)
 * 4. User prompt (with detected suggestion)
 * 5. "default" (if user accepts default in prompt)
 *
 * @param projectRoot - Project root directory
 * @param options - Detection options
 * @returns Detected or prompted project ID
 *
 * @example
 * // Multi-project setup with defaultProfile: "be"
 * await autoDetectProjectId('/path/to/sw-qr-menu')
 * // Output: "✅ Detected default profile: be"
 * // Returns: "be"
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

  // 1. Try default profile ID (highest priority for multi-profile monorepos)
  const defaultProfileId = detectDefaultProfileId(projectRoot);
  if (defaultProfileId) {
    if (!silent) {
      console.log(`✅ Detected default profile: ${defaultProfileId}`);
    }
    return defaultProfileId;
  }

  // 2. Try git remote
  const gitProjectId = detectProjectIdFromGit(projectRoot);
  if (gitProjectId) {
    if (!silent) {
      console.log(`✅ Detected git repository: ${gitProjectId}`);
    }
    return gitProjectId;
  }

  // 3. Try sync config
  const syncProjectId = detectProjectIdFromSync(projectRoot);
  if (syncProjectId) {
    if (!silent) {
      console.log(`✅ Detected sync configuration: ${syncProjectId}`);
    }
    return syncProjectId;
  }

  // 4. Prompt user (if enabled)
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

  // 5. Fallback to "default" (no prompt)
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

/**
 * Full project context for intelligent user story routing and domain awareness
 */
export interface ProjectContext {
  /** Default project/profile ID (folder name under specs/) */
  projectId: string;
  /** How projectId was detected */
  detectedFrom: 'defaultProfile' | 'gitRemote' | 'syncConfig' | 'fallback';
  /** Parsed repo name with domain context (if git remote detected) */
  repoInfo: ParsedRepoName | null;
  /** All available profiles (for multi-profile monorepos) */
  availableProfiles: string[];
  /** Default profile config (if multi-profile) */
  defaultProfile: {
    id: string;
    displayName: string;
    provider: string;
    repo?: string;
  } | null;
}

/**
 * Get full project context for intelligent routing and domain awareness
 *
 * Use this to understand:
 * - Which project folder to use for specs (projectId)
 * - What domain/product this project is about (repoInfo.domain)
 * - What component type this is (repoInfo.component: be/fe/shared)
 * - What other profiles are available (for cross-project user stories)
 *
 * @param projectRoot - Project root directory
 * @returns Full project context
 *
 * @example
 * // sw-qr-menu monorepo with defaultProfile: "be"
 * getProjectContext('/path/to/sw-qr-menu')
 * // Returns:
 * // {
 * //   projectId: 'be',
 * //   detectedFrom: 'defaultProfile',
 * //   repoInfo: { prefix: 'sw', product: 'qr-menu', component: 'be', domain: 'hospitality/restaurant' },
 * //   availableProfiles: ['be', 'fe', 'shared'],
 * //   defaultProfile: { id: 'be', displayName: 'sw-qr-menu-be service', provider: 'github', repo: 'sw-qr-menu-be' }
 * // }
 */
export function getProjectContext(projectRoot: string): ProjectContext {
  let projectId = 'default';
  let detectedFrom: ProjectContext['detectedFrom'] = 'fallback';
  let repoInfo: ParsedRepoName | null = null;
  let availableProfiles: string[] = [];
  let defaultProfile: ProjectContext['defaultProfile'] = null;

  try {
    const configManager = new ConfigManager(projectRoot);
    const config = configManager.load();

    // Collect available profiles
    if (config.sync?.profiles) {
      availableProfiles = Object.keys(config.sync.profiles);
    }

    // 1. Try default profile ID (highest priority)
    if (config.sync?.defaultProfile && config.sync?.profiles) {
      const profileId = config.sync.defaultProfile;
      const profile = config.sync.profiles[profileId] as SyncProfile;

      if (profile) {
        projectId = profileId.toLowerCase();
        detectedFrom = 'defaultProfile';

        defaultProfile = {
          id: profileId,
          displayName: profile.displayName || profileId,
          provider: profile.provider,
          repo: (profile.config as any)?.repo,
        };

        // Parse repo name for domain context
        if (defaultProfile.repo) {
          repoInfo = parseRepoName(defaultProfile.repo);
        }
      }
    }
  } catch {
    // Config doesn't exist, continue to git detection
  }

  // 2. Try git remote (if no default profile)
  if (detectedFrom === 'fallback') {
    const gitProjectId = detectProjectIdFromGit(projectRoot);
    if (gitProjectId) {
      projectId = gitProjectId;
      detectedFrom = 'gitRemote';
      repoInfo = parseRepoName(gitProjectId);
    }
  }

  // 3. Try sync config (legacy fallback)
  if (detectedFrom === 'fallback') {
    const syncProjectId = detectProjectIdFromSync(projectRoot);
    if (syncProjectId) {
      projectId = syncProjectId;
      detectedFrom = 'syncConfig';
      repoInfo = parseRepoName(syncProjectId);
    }
  }

  return {
    projectId,
    detectedFrom,
    repoInfo,
    availableProfiles,
    defaultProfile,
  };
}
