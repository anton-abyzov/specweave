/**
 * Authentication Helpers for Issue Tracker Integration
 *
 * Provides unified authentication detection for GitHub, Azure DevOps, and Jira
 * Works in both CLI (init flow) and test environments
 *
 * @module utils/auth-helpers
 */
/**
 * Check if a GitHub token is an OAuth token (gho_ prefix)
 *
 * OAuth tokens from `gh auth` typically lack `repo` scope for private repositories.
 * Only PATs (ghp_) or Fine-grained tokens (github_pat_) have explicit repo access.
 *
 * Token prefixes:
 * - gho_ = OAuth App token (from gh auth) - may lack repo scope!
 * - ghp_ = Classic Personal Access Token - has explicit scopes
 * - ghs_ = GitHub App server-to-server token
 * - ghu_ = GitHub App user-to-server token
 * - github_pat_ = Fine-grained Personal Access Token
 */
export declare function isOAuthToken(token: string): boolean;
/**
 * Check if a GitHub token is a Personal Access Token (classic or fine-grained)
 * These tokens have explicit repo scope and work with private repositories.
 */
export declare function isPersonalAccessToken(token: string): boolean;
export interface GitHubAuth {
    token: string;
    source: 'config' | 'GITHUB_TOKEN' | 'GH_TOKEN' | 'gh-cli' | 'none';
    /** Resolution layer the token came from (config → process.env → .env → gh CLI). */
    origin?: GitHubTokenOrigin;
    /**
     * Whether this is an OAuth token (gho_ prefix) which may lack repo scope.
     * OAuth tokens from `gh auth` typically cannot access private repos unless
     * the user explicitly granted repo scope during authentication.
     */
    isOAuthToken?: boolean;
}
export interface AzureDevOpsAuth {
    pat: string;
    org: string;
    project: string;
}
export interface JiraAuth {
    token: string;
    email: string;
    domain: string;
}
/** Where a GitHub token came from, in resolution order. */
export type GitHubTokenOrigin = 'config' | 'process.env' | '.env' | 'gh-cli' | 'none';
export interface ResolveGitHubTokenOptions {
    /** Token from .specweave/config.json (sync.github.token / profile config.token). Highest precedence. */
    configToken?: string;
    /** Environment to consult (defaults to process.env). */
    env?: NodeJS.ProcessEnv;
    /** Override for the gh CLI probe (tests). */
    ghCliToken?: () => string | undefined;
}
/**
 * Resolve a GitHub token with ONE documented precedence:
 *   1. config (explicit token in .specweave/config.json)
 *   2. process.env GITHUB_TOKEN / GH_TOKEN (CI, shell exports)
 *   3. <projectRoot>/.env GITHUB_TOKEN / GH_TOKEN
 *   4. gh CLI (`gh auth token`, then ~/.config/gh/hosts.yml)
 *
 * Every sync entry point should call this once and print `describeGitHubAuth()`
 * so a wrong-account token is visible before the first 404.
 */
export declare function resolveGitHubToken(projectRoot: string, options?: ResolveGitHubTokenOptions): GitHubAuth;
/** One-line, secret-free description of where the active GitHub token came from. */
export declare function describeGitHubAuth(auth: GitHubAuth, login?: string | null): string;
/**
 * Best-effort lookup of the account a token belongs to (`gh api user`).
 * Never throws; returns null when gh is missing or the token is invalid.
 */
export declare function resolveGitHubLogin(token: string, exec?: (cmd: string, env: NodeJS.ProcessEnv) => string): string | null;
/**
 * Get GitHub authentication for a project.
 * Order: config token (when passed) → process.env → <projectRoot>/.env → gh CLI.
 * Thin wrapper over resolveGitHubToken() kept for existing call sites.
 */
export declare function getGitHubAuthFromProject(projectRoot: string, configToken?: string): GitHubAuth;
/**
 * Get GitHub authentication without a project root (process.env → gh CLI only).
 * Prefer getGitHubAuthFromProject()/resolveGitHubToken() when projectRoot is known.
 */
export declare function getGitHubAuth(): GitHubAuth;
/**
 * Get Azure DevOps authentication from project .env file
 * Priority: .env file > process.env
 *
 * CRITICAL (2025-12-04): This function MUST be used when projectRoot is available
 * to properly load tokens from .env file. The original getAzureDevOpsAuth() only
 * reads process.env which is empty unless dotenv is explicitly loaded.
 *
 * @param projectRoot - Path to project root containing .env file
 * @returns Azure DevOps authentication or null if not found
 */
export declare function getAzureDevOpsAuthFromProject(projectRoot: string): AzureDevOpsAuth | null;
/**
 * Get Azure DevOps authentication
 * Requires: AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT
 *
 * WARNING: This function only reads from process.env, NOT from .env files!
 * If you have access to projectRoot, use getAzureDevOpsAuthFromProject() instead.
 */
export declare function getAzureDevOpsAuth(): AzureDevOpsAuth | null;
/**
 * Get Jira authentication
 * Requires: JIRA_API_TOKEN, JIRA_EMAIL, JIRA_DOMAIN
 */
export declare function getJiraAuth(): JiraAuth | null;
/**
 * Check if integration tests should run
 * Returns true if RUN_INTEGRATION_TESTS=true or if in CI environment
 */
export declare function shouldRunIntegrationTests(): boolean;
/**
 * Check if credentials are available for a service
 */
export declare function hasGitHubCredentials(): boolean;
/**
 * Check if GitHub credentials are available (project-aware)
 * Uses getGitHubAuthFromProject() to also check .env file
 *
 * @param projectRoot - Path to project root containing .env file
 * @returns True if credentials are available
 */
export declare function hasGitHubCredentialsFromProject(projectRoot: string): boolean;
export declare function hasAzureDevOpsCredentials(): boolean;
/**
 * Check if Azure DevOps credentials are available (project-aware)
 * Uses getAzureDevOpsAuthFromProject() to also check .env file
 *
 * @param projectRoot - Path to project root containing .env file
 * @returns True if credentials are available
 */
export declare function hasAzureDevOpsCredentialsFromProject(projectRoot: string): boolean;
export declare function hasJiraCredentials(): boolean;
/**
 * Get Jira authentication from project files
 *
 * CRITICAL (2025-12-12): This function MUST be used when projectRoot is available.
 *
 * Configuration sources (ADR-0194 compliant):
 * - Domain: config.json → issueTracker.domain (CONFIGURATION, committed)
 * - Token: .env → JIRA_API_TOKEN (SECRET, gitignored)
 * - Email: .env → JIRA_EMAIL (SECRET, gitignored)
 *
 * @param projectRoot - Path to project root containing .env and .specweave/config.json
 * @returns Jira authentication or null if not found
 */
export declare function getJiraAuthFromProject(projectRoot: string): JiraAuth | null;
/**
 * Check if Jira credentials are available (project-aware)
 * Uses getJiraAuthFromProject() to also check .env file
 *
 * @param projectRoot - Path to project root containing .env file
 * @returns True if credentials are available
 */
export declare function hasJiraCredentialsFromProject(projectRoot: string): boolean;
/**
 * Get credential status summary (for debugging)
 */
export declare function getCredentialStatus(): {
    github: string;
    ado: boolean;
    jira: boolean;
    integrationTestsEnabled: boolean;
};
//# sourceMappingURL=auth-helpers.d.ts.map