/**
 * ConfigManager - Load and save SpecWeave configuration
 *
 * Central manager for .specweave/config.json file operations.
 * Provides type-safe access to configuration with defaults.
 */

import fs from 'fs-extra';
import path from 'path';
import { SpecweaveConfig, DEFAULT_CONFIG } from './types/config.js';

export class ConfigManager {
  private projectRoot: string;
  private configPath: string;
  private cachedConfig: SpecweaveConfig | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, '.specweave', 'config.json');
  }

  /**
   * Load configuration from .specweave/config.json
   * Returns default config if file doesn't exist
   */
  load(): SpecweaveConfig {
    // Return cached config if available
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    // Check if config file exists
    if (!fs.existsSync(this.configPath)) {
      // Return default config
      this.cachedConfig = { ...DEFAULT_CONFIG } as SpecweaveConfig;
      return this.cachedConfig;
    }

    try {
      // Read and parse config file
      const data = fs.readJSONSync(this.configPath);

      // Merge with defaults to ensure all required fields exist
      this.cachedConfig = {
        ...DEFAULT_CONFIG,
        ...data,
      } as SpecweaveConfig;

      return this.cachedConfig;
    } catch (error) {
      console.error(`⚠️  Failed to load config from ${this.configPath}:`, error);
      // Return default config on error
      this.cachedConfig = { ...DEFAULT_CONFIG } as SpecweaveConfig;
      return this.cachedConfig;
    }
  }

  /**
   * Load configuration asynchronously
   */
  async loadAsync(): Promise<SpecweaveConfig> {
    // Return cached config if available
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    // Check if config file exists
    if (!(await fs.pathExists(this.configPath))) {
      // Return default config
      this.cachedConfig = { ...DEFAULT_CONFIG } as SpecweaveConfig;
      return this.cachedConfig;
    }

    try {
      // Read and parse config file
      const data = await fs.readJSON(this.configPath);

      // Merge with defaults to ensure all required fields exist
      this.cachedConfig = {
        ...DEFAULT_CONFIG,
        ...data,
      } as SpecweaveConfig;

      return this.cachedConfig;
    } catch (error) {
      console.error(`⚠️  Failed to load config from ${this.configPath}:`, error);
      // Return default config on error
      this.cachedConfig = { ...DEFAULT_CONFIG } as SpecweaveConfig;
      return this.cachedConfig;
    }
  }

  /**
   * Save configuration to .specweave/config.json
   */
  async save(config: SpecweaveConfig): Promise<void> {
    try {
      // Ensure .specweave directory exists
      await fs.ensureDir(path.dirname(this.configPath));

      // Write config to file
      await fs.writeJSON(this.configPath, config, { spaces: 2 });

      // Update cache
      this.cachedConfig = config;
    } catch (error) {
      throw new Error(`Failed to save config to ${this.configPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save configuration synchronously
   */
  saveSync(config: SpecweaveConfig): void {
    try {
      // Ensure .specweave directory exists
      fs.ensureDirSync(path.dirname(this.configPath));

      // Write config to file
      fs.writeJSONSync(this.configPath, config, { spaces: 2 });

      // Update cache
      this.cachedConfig = config;
    } catch (error) {
      throw new Error(`Failed to save config to ${this.configPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get config path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Clear cached config (force reload on next load())
   */
  clearCache(): void {
    this.cachedConfig = null;
  }

  /**
   * Check if config file exists
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Check if config file exists (async)
   */
  async existsAsync(): Promise<boolean> {
    return fs.pathExists(this.configPath);
  }
}
