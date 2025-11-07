/**
 * Environment Multi-Project Parser
 *
 * Parses comma-separated project lists from .env:
 * - JIRA_PROJECT_KEYS=BACKEND,FRONTEND,MOBILE (multiple projects)
 * - GITHUB_REPOS=owner/backend-api,owner/frontend-web (multiple repos)
 * - AZURE_DEVOPS_PROJECT=myproject (single project only)
 * - AZURE_DEVOPS_TEAMS=Frontend,Backend,Mobile (multiple teams within project)
 *
 * Auto-creates sync profiles for each project/repo.
 *
 * NOTE: Azure DevOps uses ONE project per organization with multiple teams.
 * Multi-project support is for Jira and GitHub only.
 */

import { SyncProfile } from '../core/types/sync-profile.js';

// ============================================================================
// Types
// ============================================================================

export interface JiraProjectConfig {
  projectKey: string;
  domain: string;
  email: string;
  apiToken: string;
}

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  token: string;
}

export interface AdoProjectConfig {
  organization: string;
  project: string;
  pat: string;
}

export interface MultiProjectEnvConfig {
  jira: JiraProjectConfig[];
  github: GitHubRepoConfig[];
  ado: AdoProjectConfig[];
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse comma-separated list from environment variable
 *
 * Handles:
 * - Comma separation
 * - Whitespace trimming
 * - Empty values filtering
 *
 * @example
 * parseCommaSeparated("BACKEND, FRONTEND, MOBILE")
 * // Returns: ["BACKEND", "FRONTEND", "MOBILE"]
 */
export function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Parse JIRA project keys from .env
 *
 * Reads:
 * - JIRA_PROJECT_KEYS (comma-separated, NEW format)
 * - JIRA_PROJECT_KEY (single, legacy format)
 * - JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN (shared credentials)
 *
 * @returns Array of JIRA project configurations
 *
 * @example
 * // .env:
 * // JIRA_PROJECT_KEYS=BACKEND,FRONTEND,MOBILE
 * // JIRA_DOMAIN=mycompany.atlassian.net
 * // JIRA_EMAIL=user@example.com
 * // JIRA_API_TOKEN=abc123
 *
 * parseJiraProjects()
 * // Returns: [
 * //   { projectKey: "BACKEND", domain: "...", email: "...", apiToken: "..." },
 * //   { projectKey: "FRONTEND", ... },
 * //   { projectKey: "MOBILE", ... }
 * // ]
 */
export function parseJiraProjects(): JiraProjectConfig[] {
  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  // Missing credentials → return empty array
  if (!domain || !email || !apiToken) {
    return [];
  }

  // Try new format (JIRA_PROJECT_KEYS - plural)
  const projectKeysStr = process.env.JIRA_PROJECT_KEYS;
  if (projectKeysStr) {
    const projectKeys = parseCommaSeparated(projectKeysStr);
    return projectKeys.map((projectKey) => ({
      projectKey,
      domain,
      email,
      apiToken,
    }));
  }

  // Fallback to legacy format (JIRA_PROJECT_KEY - singular)
  const legacyProjectKey = process.env.JIRA_PROJECT_KEY;
  if (legacyProjectKey) {
    return [
      {
        projectKey: legacyProjectKey.trim(),
        domain,
        email,
        apiToken,
      },
    ];
  }

  return [];
}

/**
 * Parse GitHub repositories from .env
 *
 * Reads:
 * - GITHUB_REPOS (comma-separated, format: "owner/repo,owner2/repo2")
 * - GITHUB_TOKEN (shared credential)
 *
 * @returns Array of GitHub repository configurations
 *
 * @example
 * // .env:
 * // GITHUB_REPOS=myorg/backend-api,myorg/frontend-web
 * // GITHUB_TOKEN=ghp_abc123
 *
 * parseGitHubRepos()
 * // Returns: [
 * //   { owner: "myorg", repo: "backend-api", token: "..." },
 * //   { owner: "myorg", repo: "frontend-web", token: "..." }
 * // ]
 */
export function parseGitHubRepos(): GitHubRepoConfig[] {
  const token = process.env.GITHUB_TOKEN;

  // Missing token → return empty array
  if (!token) {
    return [];
  }

  // Parse GITHUB_REPOS (comma-separated "owner/repo" format)
  const reposStr = process.env.GITHUB_REPOS;
  if (!reposStr) {
    return [];
  }

  const repos = parseCommaSeparated(reposStr);
  const configs: GitHubRepoConfig[] = [];

  for (const repo of repos) {
    // Format: "owner/repo"
    const parts = repo.split('/');
    if (parts.length === 2) {
      configs.push({
        owner: parts[0].trim(),
        repo: parts[1].trim(),
        token,
      });
    }
  }

  return configs;
}

/**
 * Parse Azure DevOps project from .env
 *
 * NOTE: Azure DevOps supports ONE project per organization with multiple teams.
 * For multi-team support, use AZURE_DEVOPS_TEAMS (comma-separated).
 *
 * Reads:
 * - AZURE_DEVOPS_PROJECT (single project, required)
 * - AZURE_DEVOPS_ORG (organization)
 * - AZURE_DEVOPS_PAT (credential)
 * - AZURE_DEVOPS_TEAMS (comma-separated teams, optional)
 *
 * @returns Array with single ADO project configuration
 *
 * @example
 * // .env:
 * // AZURE_DEVOPS_PROJECT=myproject
 * // AZURE_DEVOPS_ORG=easychamp
 * // AZURE_DEVOPS_PAT=xyz789
 * // AZURE_DEVOPS_TEAMS=Frontend,Backend,Mobile
 *
 * parseAdoProjects()
 * // Returns: [
 * //   { organization: "easychamp", project: "myproject", pat: "..." }
 * // ]
 */
export function parseAdoProjects(): AdoProjectConfig[] {
  const organization = process.env.AZURE_DEVOPS_ORG;
  const pat = process.env.AZURE_DEVOPS_PAT;
  const project = process.env.AZURE_DEVOPS_PROJECT;

  // Missing credentials → return empty array
  if (!organization || !pat || !project) {
    return [];
  }

  // ADO only supports ONE project per organization
  return [
    {
      organization,
      project: project.trim(),
      pat,
    },
  ];
}

/**
 * Parse all multi-project configurations from .env
 *
 * @returns All detected project configurations
 */
export function parseMultiProjectEnv(): MultiProjectEnvConfig {
  return {
    jira: parseJiraProjects(),
    github: parseGitHubRepos(),
    ado: parseAdoProjects(),
  };
}

// ============================================================================
// Sync Profile Generation
// ============================================================================

/**
 * Generate sync profile ID from project identifier
 *
 * Format: "{provider}-{project-id}"
 *
 * @example
 * generateProfileId("jira", "BACKEND")
 * // Returns: "jira-backend"
 *
 * @example
 * generateProfileId("github", "backend-api")
 * // Returns: "github-backend-api"
 */
export function generateProfileId(provider: string, projectId: string): string {
  return `${provider}-${projectId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
}

/**
 * Create JIRA sync profile from project configuration
 */
export function createJiraSyncProfile(config: JiraProjectConfig): {
  id: string;
  profile: Omit<SyncProfile, 'id'>;
} {
  const profileId = generateProfileId('jira', config.projectKey);

  return {
    id: profileId,
    profile: {
      provider: 'jira',
      displayName: `JIRA ${config.projectKey}`,
      description: `Auto-created from JIRA_PROJECT_KEYS (project: ${config.projectKey})`,
      config: {
        domain: config.domain,
        projectKey: config.projectKey,
        issueType: 'Epic',
      },
      timeRange: {
        default: '1M',
        max: '3M',
      },
      rateLimits: {
        maxItemsPerSync: 200,
        warnThreshold: 50,
      },
    },
  };
}

/**
 * Create GitHub sync profile from repository configuration
 */
export function createGitHubSyncProfile(config: GitHubRepoConfig): {
  id: string;
  profile: Omit<SyncProfile, 'id'>;
} {
  const profileId = generateProfileId('github', config.repo);

  return {
    id: profileId,
    profile: {
      provider: 'github',
      displayName: `${config.owner}/${config.repo}`,
      description: `Auto-created from GITHUB_REPOS`,
      config: {
        owner: config.owner,
        repo: config.repo,
      },
      timeRange: {
        default: '1M',
        max: '6M',
      },
      rateLimits: {
        maxItemsPerSync: 500,
        warnThreshold: 100,
      },
    },
  };
}

/**
 * Create Azure DevOps sync profile from project configuration
 *
 * NOTE: Creates ONE profile per organization. Teams are managed within the project.
 */
export function createAdoSyncProfile(config: AdoProjectConfig): {
  id: string;
  profile: Omit<SyncProfile, 'id'>;
} {
  const profileId = generateProfileId('ado', config.project);

  return {
    id: profileId,
    profile: {
      provider: 'ado',
      displayName: `${config.organization}/${config.project}`,
      description: `Auto-created from AZURE_DEVOPS_PROJECT (single project with teams)`,
      config: {
        organization: config.organization,
        project: config.project,
        workItemType: 'Epic',
      },
      timeRange: {
        default: '1M',
        max: '1Y',
      },
      rateLimits: {
        maxItemsPerSync: 500,
        warnThreshold: 100,
      },
    },
  };
}

/**
 * Generate all sync profiles from environment variables
 *
 * @returns Array of { id, profile } objects ready to be created
 *
 * @example
 * // .env:
 * // JIRA_PROJECT_KEYS=BACKEND,FRONTEND
 * // GITHUB_REPOS=myorg/backend-api
 *
 * const profiles = generateSyncProfilesFromEnv();
 * // Returns: [
 * //   { id: "jira-backend", profile: { ... } },
 * //   { id: "jira-frontend", profile: { ... } },
 * //   { id: "github-backend-api", profile: { ... } }
 * // ]
 */
export function generateSyncProfilesFromEnv(): Array<{
  id: string;
  profile: Omit<SyncProfile, 'id'>;
}> {
  const envConfig = parseMultiProjectEnv();
  const profiles: Array<{ id: string; profile: Omit<SyncProfile, 'id'> }> = [];

  // JIRA profiles
  for (const jiraConfig of envConfig.jira) {
    profiles.push(createJiraSyncProfile(jiraConfig));
  }

  // GitHub profiles
  for (const githubConfig of envConfig.github) {
    profiles.push(createGitHubSyncProfile(githubConfig));
  }

  // Azure DevOps profiles
  for (const adoConfig of envConfig.ado) {
    profiles.push(createAdoSyncProfile(adoConfig));
  }

  return profiles;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate JIRA project key format
 *
 * Rules:
 * - 2-10 characters
 * - Uppercase letters only
 * - No special characters
 *
 * @example
 * validateJiraProjectKey("BACKEND")  // → true
 * validateJiraProjectKey("backend")  // → "Must be uppercase"
 * validateJiraProjectKey("BACK")     // → true
 * validateJiraProjectKey("B")        // → "Must be 2-10 characters"
 */
export function validateJiraProjectKey(key: string): true | string {
  if (!key) {
    return 'Project key is required';
  }

  if (!/^[A-Z0-9]+$/.test(key)) {
    return 'Project key must be uppercase letters and numbers only (e.g., BACKEND, PROJ1)';
  }

  if (key.length < 2 || key.length > 10) {
    return 'Project key must be 2-10 characters';
  }

  return true;
}

/**
 * Validate GitHub repo format
 *
 * Format: "owner/repo"
 *
 * @example
 * validateGitHubRepo("myorg/backend-api")  // → true
 * validateGitHubRepo("backend-api")        // → "Must be owner/repo format"
 */
export function validateGitHubRepo(repo: string): true | string {
  if (!repo) {
    return 'Repository is required';
  }

  const parts = repo.split('/');
  if (parts.length !== 2) {
    return 'Repository must be in "owner/repo" format (e.g., myorg/backend-api)';
  }

  const [owner, repoName] = parts;

  if (!owner || !repoName) {
    return 'Both owner and repo name are required';
  }

  if (!/^[a-zA-Z0-9-_.]+$/.test(owner) || !/^[a-zA-Z0-9-_.]+$/.test(repoName)) {
    return 'Owner and repo name can only contain letters, numbers, hyphens, underscores, and dots';
  }

  return true;
}

/**
 * Validate Azure DevOps project name
 *
 * @example
 * validateAdoProject("backend-api")  // → true
 * validateAdoProject("")             // → "Project name is required"
 */
export function validateAdoProject(project: string): true | string {
  if (!project) {
    return 'Project name is required';
  }

  if (project.length < 2 || project.length > 64) {
    return 'Project name must be 2-64 characters';
  }

  return true;
}
