/**
 * Project ID Auto-Detection Utilities
 *
 * Detects project ID from (priority order):
 * 1. sync.defaultProfile (for multi-profile monorepos)
 * 2. Git remote (GitHub repo name)
 * 3. Sync configuration (JIRA project key, ADO project name)
 * 4. User prompt (fallback)
 *
 * NOTE: multiProject.activeProject has been REMOVED!
 * Per-US project targeting replaces global activeProject.
 * See: 0125-cross-project-user-story-targeting
 *
 * Also provides repo name parsing for domain context understanding.
 */
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
export declare function parseRepoName(repoName: string): ParsedRepoName;
/**
 * Detect default project ID from configuration
 *
 * NOTE: multiProject.activeProject has been REMOVED!
 * This function now only uses sync.defaultProfile for legacy umbrella repos.
 *
 * Priority:
 * 1. sync.defaultProfile - for umbrella repos where profile maps to folder
 *
 * @param projectRoot - Project root directory
 * @returns Default project ID or null if not configured
 */
export declare function detectDefaultProfileId(projectRoot: string): string | null;
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
export declare function detectProjectIdFromGit(projectRoot: string): string | null;
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
export declare function detectProjectIdFromSync(projectRoot: string): string | null;
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
export declare function promptForProjectId(suggestedId?: string): Promise<string>;
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
export declare function autoDetectProjectIdSync(projectRoot: string, options?: {
    silent?: boolean;
}): string;
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
export declare function autoDetectProjectId(projectRoot: string, options?: {
    silent?: boolean;
    promptIfNotDetected?: boolean;
}): Promise<string>;
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
export declare function formatProjectName(projectId: string): string;
/**
 * Validate project ID format
 *
 * @param projectId - Project ID to validate
 * @returns True if valid, error message if invalid
 */
export declare function validateProjectId(projectId: string): true | string;
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
export declare function getProjectContext(projectRoot: string): ProjectContext;
//# sourceMappingURL=project-detection.d.ts.map