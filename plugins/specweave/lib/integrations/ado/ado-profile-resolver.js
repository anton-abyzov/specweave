import { promises as fs } from "node:fs";
import * as path from "node:path";
class AdoProfileResolver {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, ".specweave", "config.json");
    this.incrementsPath = path.join(projectRoot, ".specweave", "increments");
  }
  /**
   * Resolve the ADO profile for an increment
   *
   * Priority:
   * 1. Increment's metadata.json -> external_sync.ado.profile
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
    const globalDefaultProfile = config.sync?.activeProfile ?? config.sync?.defaultProfile;
    const profileName = incrementProfile || globalDefaultProfile;
    if (!profileName) {
      return {
        success: false,
        error: "No ADO profile configured. Set sync.defaultProfile in config.json or external_sync.ado.profile in increment metadata.",
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
    if (profileConfig.provider !== "ado") {
      return {
        success: false,
        error: `Profile "${profileName}" is not an ADO profile (provider: ${profileConfig.provider})`,
        incrementId
      };
    }
    if (!profileConfig.config?.organization || !profileConfig.config?.project) {
      return {
        success: false,
        error: `Profile "${profileName}" missing required fields (organization, project)`,
        incrementId
      };
    }
    return {
      success: true,
      profile: {
        profileName,
        organization: profileConfig.config.organization,
        project: profileConfig.config.project,
        displayName: profileConfig.displayName,
        areaPath: profileConfig.config.areaPath,
        iterationPath: profileConfig.config.iterationPath
      },
      source: incrementProfile ? "increment" : "global",
      incrementId
    };
  }
  /**
   * Get increment's stored ADO profile name
   *
   * @param incrementId - Increment ID
   * @returns Profile name or null if not set
   */
  async getIncrementProfile(incrementId) {
    const metadataPath = path.join(this.incrementsPath, incrementId, "metadata.json");
    try {
      const content = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(content);
      return metadata?.external_sync?.ado?.profile || null;
    } catch {
      return null;
    }
  }
  /**
   * Set increment's ADO profile
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
    if (!metadata.external_sync.ado) {
      metadata.external_sync.ado = {};
    }
    metadata.external_sync.ado.profile = profileName;
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n", "utf-8");
  }
  /**
   * List available ADO profiles
   *
   * @returns Array of profile names
   */
  async listAdoProfiles() {
    const config = await this.loadConfig();
    if (!config?.sync?.profiles) {
      return [];
    }
    const profiles = config.sync.profiles;
    return Object.entries(profiles).filter(([_, p]) => p.provider === "ado").map(([name]) => name);
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
async function createAdoProfileResolver(projectRoot = process.cwd()) {
  return new AdoProfileResolver(projectRoot);
}
async function resolveAdoProfile(incrementId, projectRoot = process.cwd()) {
  const resolver = new AdoProfileResolver(projectRoot);
  return resolver.resolveProfile(incrementId);
}
var ado_profile_resolver_default = AdoProfileResolver;
export {
  AdoProfileResolver,
  createAdoProfileResolver,
  ado_profile_resolver_default as default,
  resolveAdoProfile
};
