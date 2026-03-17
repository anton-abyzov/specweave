import { promises as fs } from "node:fs";
import * as path from "node:path";
class JiraProfileResolver {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, ".specweave", "config.json");
    this.incrementsPath = path.join(projectRoot, ".specweave", "increments");
  }
  /**
   * Resolve the JIRA profile for an increment
   *
   * Priority:
   * 1. Increment's metadata.json -> external_sync.jira.profile
   * 2. Config.json -> sync.defaultProfile
   *
   * @param incrementId - Increment ID (e.g., "0093-my-feature")
   * @returns Profile resolution result
   */
  async resolveProfile(incrementId) {
    const config = await this.loadConfig();
    if (!config) {
      return {
        success: false,
        error: "Failed to load .specweave/config.json",
        incrementId
      };
    }
    const incrementProfile = await this.getIncrementProfile(incrementId);
    const globalDefaultProfile = config.sync?.defaultProfile;
    const profileName = incrementProfile || globalDefaultProfile;
    if (!profileName) {
      return {
        success: false,
        error: "No JIRA profile configured. Set sync.defaultProfile in config.json or external_sync.jira.profile in increment metadata.",
        incrementId
      };
    }
    const profiles = config.sync?.profiles || {};
    const profileConfig = profiles[profileName];
    if (!profileConfig) {
      return {
        success: false,
        error: `Profile "${profileName}" not found in config.sync.profiles`,
        incrementId
      };
    }
    if (profileConfig.provider !== "jira") {
      return {
        success: false,
        error: `Profile "${profileName}" is not a JIRA profile (provider: ${profileConfig.provider})`,
        incrementId
      };
    }
    if (!profileConfig.config?.domain || !profileConfig.config?.projectKey) {
      return {
        success: false,
        error: `Profile "${profileName}" missing required fields (domain, projectKey)`,
        incrementId
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
        instanceType: profileConfig.config.instanceType ?? "cloud"
      },
      source: incrementProfile ? "increment" : "global",
      incrementId
    };
  }
  /**
   * Get increment's stored JIRA profile name
   *
   * @param incrementId - Increment ID
   * @returns Profile name or null if not set
   */
  async getIncrementProfile(incrementId) {
    const metadataPath = path.join(this.incrementsPath, incrementId, "metadata.json");
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(content);
      return metadata?.external_sync?.jira?.profile || metadata?.external_ids?.jira?.profile || null;
    } catch {
      return null;
    }
  }
  /**
   * Get increment's stored JIRA issue key
   *
   * @param incrementId - Increment ID
   * @returns Issue key (e.g., PROJ-123) or null if not linked
   */
  async getIncrementIssueKey(incrementId) {
    const metadataPath = path.join(this.incrementsPath, incrementId, "metadata.json");
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(content);
      return metadata?.external_sync?.jira?.issueKey || metadata?.external_ids?.jira?.epic || metadata?.external_ids?.jira?.issueKey || null;
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
  async setIncrementProfile(incrementId, profileName) {
    const metadataPath = path.join(this.incrementsPath, incrementId, "metadata.json");
    let metadata = {};
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      metadata = JSON.parse(content);
    } catch {
    }
    if (!metadata.external_sync) {
      metadata.external_sync = {};
    }
    if (!metadata.external_sync.jira) {
      metadata.external_sync.jira = {};
    }
    metadata.external_sync.jira.profile = profileName;
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n", "utf-8");
  }
  /**
   * Set increment's JIRA issue key
   *
   * @param incrementId - Increment ID
   * @param issueKey - JIRA issue key (e.g., PROJ-123)
   */
  async setIncrementIssueKey(incrementId, issueKey) {
    const metadataPath = path.join(this.incrementsPath, incrementId, "metadata.json");
    let metadata = {};
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      metadata = JSON.parse(content);
    } catch {
    }
    if (!metadata.external_sync) {
      metadata.external_sync = {};
    }
    if (!metadata.external_sync.jira) {
      metadata.external_sync.jira = {};
    }
    const jiraSync = metadata.external_sync.jira;
    jiraSync.issueKey = issueKey;
    jiraSync.lastSyncedAt = (/* @__PURE__ */ new Date()).toISOString();
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n", "utf-8");
  }
  /**
   * List available JIRA profiles
   *
   * @returns Array of profile names
   */
  async listJiraProfiles() {
    const config = await this.loadConfig();
    if (!config?.sync?.profiles) {
      return [];
    }
    const profiles = config.sync.profiles;
    return Object.entries(profiles).filter(([_, p]) => p.provider === "jira").map(([name]) => name);
  }
  /**
   * Get profile details by name
   *
   * @param profileName - Profile name
   * @returns Profile config or null
   */
  async getProfileByName(profileName) {
    const config = await this.loadConfig();
    if (!config?.sync?.profiles) {
      return null;
    }
    const profileConfig = config.sync.profiles[profileName];
    if (!profileConfig || profileConfig.provider !== "jira") {
      return null;
    }
    return {
      profileName,
      domain: profileConfig.config.domain,
      projectKey: profileConfig.config.projectKey,
      displayName: profileConfig.displayName,
      boardId: profileConfig.config.boardId,
      boardName: profileConfig.config.boardName,
      instanceType: profileConfig.config.instanceType ?? "cloud"
    };
  }
  /**
   * Load config.json
   */
  async loadConfig() {
    try {
      const content = await fs.readFile(this.configPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
async function createJiraProfileResolver(projectRoot = process.cwd()) {
  return new JiraProfileResolver(projectRoot);
}
async function resolveJiraProfile(incrementId, projectRoot = process.cwd()) {
  const resolver = new JiraProfileResolver(projectRoot);
  return resolver.resolveProfile(incrementId);
}
var jira_profile_resolver_default = JiraProfileResolver;
export {
  JiraProfileResolver,
  createJiraProfileResolver,
  jira_profile_resolver_default as default,
  resolveJiraProfile
};
