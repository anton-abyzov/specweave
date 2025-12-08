/**
 * JIRA Profile Resolver
 *
 * Resolves the correct JIRA profile to use for sync operations.
 * Priority:
 * 1. Increment's stored profile (metadata.json -> external_sync.jira.profile)
 * 2. Global defaultProfile (config.json -> sync.defaultProfile)
 * 3. Legacy: Global activeProfile (config.json -> sync.activeProfile)
 *
 * This allows each increment to sync to its designated JIRA project
 * without requiring manual profile switching.
 *
 * NOTE (v0.31.0): Renamed from "activeProfile" to "defaultProfile" for clarity.
 * The default profile is a FALLBACK, not a constraint. Bulk operations
 * iterate ALL profiles.
 *
 * Usage:
 * ```typescript
 * const resolver = await createJiraProfileResolver();
 * const profile = await resolver.resolveProfile('0093-my-increment');
 * // profile contains domain, projectKey, etc.
 * ```
 *
 * @module jira-profile-resolver
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * JIRA profile configuration
 */
export interface JiraProfileConfig {
  /**
   * Profile name (for display/logging)
   */
  profileName: string;

  /**
   * JIRA domain (e.g., company.atlassian.net)
   */
  domain: string;

  /**
   * JIRA project key (e.g., PROJ)
   */
  projectKey: string;

  /**
   * Display name (optional)
   */
  displayName?: string;

  /**
   * Board ID (optional, for 2-level structure)
   */
  boardId?: number;

  /**
   * Board name (optional)
   */
  boardName?: string;

  /**
   * Instance type: cloud or server
   */
  instanceType?: 'cloud' | 'server';
}

/**
 * Profile resolution result
 */
export interface ProfileResolutionResult {
  /**
   * Whether resolution succeeded
   */
  success: boolean;

  /**
   * Resolved profile config (if success)
   */
  profile?: JiraProfileConfig;

  /**
   * Source of the profile
   */
  source?: 'increment' | 'global';

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Increment ID that was checked
   */
  incrementId?: string;
}

/**
 * Sync profile from config.json
 */
interface ConfigProfile {
  provider: string;
  displayName?: string;
  config: {
    domain: string;
    projectKey: string;
    boardId?: number;
    boardName?: string;
    instanceType?: 'cloud' | 'server';
  };
}

/**
 * Sync config from config.json
 */
interface SyncConfig {
  /** @since v0.31.0 - preferred */
  defaultProfile?: string;
  /** @deprecated Use defaultProfile */
  activeProfile?: string;
  profiles?: Record<string, ConfigProfile>;
}

/**
 * Config structure
 */
interface SpecWeaveConfig {
  sync?: SyncConfig;
}

/**
 * JIRA Profile Resolver
 */
export class JiraProfileResolver {
  private projectRoot: string;
  private configPath: string;
  private incrementsPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, '.specweave', 'config.json');
    this.incrementsPath = path.join(projectRoot, '.specweave', 'increments');
  }

  /**
   * Resolve the JIRA profile for an increment
   *
   * Priority:
   * 1. Increment's metadata.json -> external_sync.jira.profile
   * 2. Config.json -> sync.defaultProfile (v0.31.0+)
   * 3. Config.json -> sync.activeProfile (legacy fallback)
   *
   * @param incrementId - Increment ID (e.g., "0093-my-feature")
   * @returns Profile resolution result
   */
  async resolveProfile(incrementId: string): Promise<ProfileResolutionResult> {
    // Load global config
    const config = await this.loadConfig();
    if (!config) {
      return {
        success: false,
        error: 'Failed to load .specweave/config.json',
        incrementId,
      };
    }

    // Try to get increment-specific profile first
    const incrementProfile = await this.getIncrementProfile(incrementId);

    // Determine which profile to use (defaultProfile preferred over activeProfile)
    const globalDefaultProfile = config.sync?.defaultProfile ?? config.sync?.activeProfile;
    const profileName = incrementProfile || globalDefaultProfile;

    if (!profileName) {
      return {
        success: false,
        error: 'No JIRA profile configured. Set sync.defaultProfile in config.json or external_sync.jira.profile in increment metadata.',
        incrementId,
      };
    }

    // Check if profile is for JIRA provider
    const profiles = config.sync?.profiles || {};
    const profileConfig = profiles[profileName] as ConfigProfile | undefined;

    if (!profileConfig) {
      return {
        success: false,
        error: `Profile "${profileName}" not found in config.sync.profiles`,
        incrementId,
      };
    }

    if (profileConfig.provider !== 'jira') {
      return {
        success: false,
        error: `Profile "${profileName}" is not a JIRA profile (provider: ${profileConfig.provider})`,
        incrementId,
      };
    }

    // Validate required fields
    if (!profileConfig.config?.domain || !profileConfig.config?.projectKey) {
      return {
        success: false,
        error: `Profile "${profileName}" missing required fields (domain, projectKey)`,
        incrementId,
      };
    }

    return {
      success: true,
      profile: {
        profileName,
        domain: profileConfig.config.domain,
        projectKey: profileConfig.config.projectKey,
        displayName: profileConfig.displayName,
        boardId: profileConfig.config.boardId,
        boardName: profileConfig.config.boardName,
        instanceType: profileConfig.config.instanceType ?? 'cloud',
      },
      source: incrementProfile ? 'increment' : 'global',
      incrementId,
    };
  }

  /**
   * Get increment's stored JIRA profile name
   *
   * @param incrementId - Increment ID
   * @returns Profile name or null if not set
   */
  async getIncrementProfile(incrementId: string): Promise<string | null> {
    const metadataPath = path.join(this.incrementsPath, incrementId, 'metadata.json');

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);

      // Check for profile in external_sync.jira.profile (standardized naming)
      // Also support legacy external_ids.jira for backwards compatibility
      return metadata?.external_sync?.jira?.profile
        || metadata?.external_ids?.jira?.profile
        || null;
    } catch {
      // Metadata not found or invalid - return null
      return null;
    }
  }

  /**
   * Get increment's stored JIRA issue key
   *
   * @param incrementId - Increment ID
   * @returns Issue key (e.g., PROJ-123) or null if not linked
   */
  async getIncrementIssueKey(incrementId: string): Promise<string | null> {
    const metadataPath = path.join(this.incrementsPath, incrementId, 'metadata.json');

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content);

      // Check both standardized and legacy paths
      return metadata?.external_sync?.jira?.issueKey
        || metadata?.external_ids?.jira?.epic
        || metadata?.external_ids?.jira?.issueKey
        || null;
    } catch {
      return null;
    }
  }

  /**
   * Set increment's JIRA profile
   *
   * Stores the profile name in the increment's metadata.json
   *
   * @param incrementId - Increment ID
   * @param profileName - Profile name to set
   */
  async setIncrementProfile(incrementId: string, profileName: string): Promise<void> {
    const metadataPath = path.join(this.incrementsPath, incrementId, 'metadata.json');

    // Load existing metadata
    let metadata: Record<string, unknown> = {};
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(content);
    } catch {
      // Start with empty metadata if not found
    }

    // Set external_sync.jira.profile (standardized naming)
    if (!metadata.external_sync) {
      metadata.external_sync = {};
    }
    if (!(metadata.external_sync as Record<string, unknown>).jira) {
      (metadata.external_sync as Record<string, unknown>).jira = {};
    }
    ((metadata.external_sync as Record<string, unknown>).jira as Record<string, unknown>).profile = profileName;

    // Write back
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
  }

  /**
   * Set increment's JIRA issue key
   *
   * @param incrementId - Increment ID
   * @param issueKey - JIRA issue key (e.g., PROJ-123)
   */
  async setIncrementIssueKey(incrementId: string, issueKey: string): Promise<void> {
    const metadataPath = path.join(this.incrementsPath, incrementId, 'metadata.json');

    // Load existing metadata
    let metadata: Record<string, unknown> = {};
    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(content);
    } catch {
      // Start with empty metadata if not found
    }

    // Set external_sync.jira.issueKey (standardized naming)
    if (!metadata.external_sync) {
      metadata.external_sync = {};
    }
    if (!(metadata.external_sync as Record<string, unknown>).jira) {
      (metadata.external_sync as Record<string, unknown>).jira = {};
    }
    const jiraSync = (metadata.external_sync as Record<string, unknown>).jira as Record<string, unknown>;
    jiraSync.issueKey = issueKey;
    jiraSync.lastSyncedAt = new Date().toISOString();

    // Write back
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
  }

  /**
   * List available JIRA profiles
   *
   * @returns Array of profile names
   */
  async listJiraProfiles(): Promise<string[]> {
    const config = await this.loadConfig();
    if (!config?.sync?.profiles) {
      return [];
    }

    const profiles = config.sync.profiles as Record<string, ConfigProfile>;
    return Object.entries(profiles)
      .filter(([_, p]) => p.provider === 'jira')
      .map(([name]) => name);
  }

  /**
   * Get profile details by name
   *
   * @param profileName - Profile name
   * @returns Profile config or null
   */
  async getProfileByName(profileName: string): Promise<JiraProfileConfig | null> {
    const config = await this.loadConfig();
    if (!config?.sync?.profiles) {
      return null;
    }

    const profileConfig = config.sync.profiles[profileName] as ConfigProfile | undefined;
    if (!profileConfig || profileConfig.provider !== 'jira') {
      return null;
    }

    return {
      profileName,
      domain: profileConfig.config.domain,
      projectKey: profileConfig.config.projectKey,
      displayName: profileConfig.displayName,
      boardId: profileConfig.config.boardId,
      boardName: profileConfig.config.boardName,
      instanceType: profileConfig.config.instanceType ?? 'cloud',
    };
  }

  /**
   * Load config.json
   */
  private async loadConfig(): Promise<SpecWeaveConfig | null> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(content) as SpecWeaveConfig;
    } catch {
      return null;
    }
  }
}

/**
 * Create a JiraProfileResolver instance
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns JiraProfileResolver instance
 */
export async function createJiraProfileResolver(
  projectRoot: string = process.cwd()
): Promise<JiraProfileResolver> {
  return new JiraProfileResolver(projectRoot);
}

/**
 * Quick resolve: Get JIRA profile for an increment
 *
 * @param incrementId - Increment ID
 * @param projectRoot - Project root directory
 * @returns Profile resolution result
 */
export async function resolveJiraProfile(
  incrementId: string,
  projectRoot: string = process.cwd()
): Promise<ProfileResolutionResult> {
  const resolver = new JiraProfileResolver(projectRoot);
  return resolver.resolveProfile(incrementId);
}

export default JiraProfileResolver;
