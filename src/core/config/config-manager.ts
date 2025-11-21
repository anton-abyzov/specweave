/**
 * SpecWeave Configuration Manager
 *
 * Manages .specweave/config.json for non-sensitive configuration
 * (Secrets like API tokens go in .env, NOT in config.json)
 *
 * @module core/config/config-manager
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  SpecWeaveConfig,
  DEFAULT_CONFIG,
  ValidationResult,
  ValidationError
} from './types.js';

/**
 * Configuration file path
 */
const CONFIG_FILE_NAME = 'config.json';

/**
 * Manages SpecWeave configuration
 */
export class ConfigManager {
  private configPath: string;
  private config: SpecWeaveConfig | null = null;

  /**
   * Create a new ConfigManager
   *
   * @param projectRoot - Path to project root (default: process.cwd())
   */
  constructor(projectRoot: string = process.cwd()) {
    this.configPath = path.join(projectRoot, '.specweave', CONFIG_FILE_NAME);
  }

  /**
   * Read configuration from disk
   *
   * @returns Configuration object
   */
  async read(): Promise<SpecWeaveConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Merge with defaults (for backward compatibility)
      this.config = this.mergeWithDefaults(parsed);
      return this.config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist, return defaults
        this.config = { ...DEFAULT_CONFIG };
        return this.config;
      }
      throw new Error(`Failed to read config: ${error.message}`);
    }
  }

  /**
   * Read configuration synchronously
   *
   * @returns Configuration object
   */
  readSync(): SpecWeaveConfig {
    if (this.config) {
      return this.config;
    }

    try {
      const { readFileSync } = require('fs');
      const content = readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Merge with defaults
      this.config = this.mergeWithDefaults(parsed);
      return this.config;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Config file doesn't exist, return defaults
        this.config = { ...DEFAULT_CONFIG };
        return this.config;
      }
      throw new Error(`Failed to read config: ${error.message}`);
    }
  }

  /**
   * Write configuration to disk
   *
   * @param config - Configuration to write
   */
  async write(config: SpecWeaveConfig): Promise<void> {
    // Validate before writing
    const validation = this.validate(config);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`).join('\n');
      throw new Error(`Invalid configuration:\n${errorMessages}`);
    }

    try {
      // Ensure .specweave directory exists
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });

      // Write with pretty formatting
      const content = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, content, 'utf-8');

      // Update cached config
      this.config = config;
    } catch (error: any) {
      throw new Error(`Failed to write config: ${error.message}`);
    }
  }

  /**
   * Update configuration with partial values
   *
   * @param partial - Partial configuration to merge
   */
  async update(partial: Partial<SpecWeaveConfig>): Promise<void> {
    const current = await this.read();
    const updated = this.deepMerge(current, partial);
    await this.write(updated);
  }

  /**
   * Get a specific configuration value by path
   *
   * @param path - Dot-separated path (e.g., "issueTracker.domain")
   * @returns Configuration value
   */
  async get(path: string): Promise<any> {
    const config = await this.read();
    return this.getByPath(config, path);
  }

  /**
   * Set a specific configuration value by path
   *
   * @param path - Dot-separated path (e.g., "issueTracker.domain")
   * @param value - Value to set
   */
  async set(path: string, value: any): Promise<void> {
    const config = await this.read();
    const updated = this.setByPath(config, path, value);
    await this.write(updated);
  }

  /**
   * Check if configuration file exists
   *
   * @returns True if config exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate configuration
   *
   * @param config - Configuration to validate (default: current config)
   * @returns Validation result
   */
  validate(config?: SpecWeaveConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const cfg = config || this.config || DEFAULT_CONFIG;

    // Validate version
    if (!cfg.version) {
      errors.push({
        path: 'version',
        message: 'Version is required',
        value: cfg.version
      });
    }

    // Validate repository provider
    if (cfg.repository?.provider) {
      const validProviders = ['local', 'github', 'bitbucket', 'ado', 'gitlab', 'generic'];
      if (!validProviders.includes(cfg.repository.provider)) {
        errors.push({
          path: 'repository.provider',
          message: `Invalid provider. Must be one of: ${validProviders.join(', ')}`,
          value: cfg.repository.provider
        });
      }
    }

    // Validate issue tracker provider
    if (cfg.issueTracker?.provider) {
      const validTrackers = ['none', 'jira', 'github', 'ado'];
      if (!validTrackers.includes(cfg.issueTracker.provider)) {
        errors.push({
          path: 'issueTracker.provider',
          message: `Invalid tracker. Must be one of: ${validTrackers.join(', ')}`,
          value: cfg.issueTracker.provider
        });
      }
    }

    // Validate Jira configuration
    if (cfg.issueTracker?.provider === 'jira') {
      if (!cfg.issueTracker.domain) {
        errors.push({
          path: 'issueTracker.domain',
          message: 'Domain is required for Jira',
          value: cfg.issueTracker.domain
        });
      }

      if (cfg.issueTracker.strategy) {
        const validStrategies = ['single-project', 'project-per-team', 'component-based', 'board-based'];
        if (!validStrategies.includes(cfg.issueTracker.strategy)) {
          errors.push({
            path: 'issueTracker.strategy',
            message: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`,
            value: cfg.issueTracker.strategy
          });
        }
      }
    }

    // Validate sync direction
    if (cfg.sync?.direction) {
      const validDirections = ['import', 'export', 'bidirectional'];
      if (!validDirections.includes(cfg.sync.direction)) {
        errors.push({
          path: 'sync.direction',
          message: `Invalid direction. Must be one of: ${validDirections.join(', ')}`,
          value: cfg.sync.direction
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge configuration with defaults
   *
   * @param config - User configuration
   * @returns Merged configuration
   */
  private mergeWithDefaults(config: Partial<SpecWeaveConfig>): SpecWeaveConfig {
    return this.deepMerge(DEFAULT_CONFIG, config) as SpecWeaveConfig;
  }

  /**
   * Deep merge two objects
   *
   * @param target - Target object
   * @param source - Source object
   * @returns Merged object
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined && source[key] !== null) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Get value by dot-separated path
   *
   * @param obj - Object to get value from
   * @param path - Dot-separated path
   * @returns Value at path
   */
  private getByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Set value by dot-separated path
   *
   * @param obj - Object to set value in
   * @param path - Dot-separated path
   * @param value - Value to set
   * @returns Updated object
   */
  private setByPath(obj: any, path: string, value: any): any {
    const parts = path.split('.');
    const result = { ...obj };
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      current[part] = { ...(current[part] || {}) };
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
    return result;
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.config = null;
  }
}

/**
 * Global config manager instance
 */
let globalConfigManager: ConfigManager | null = null;

/**
 * Get global config manager instance
 *
 * @param projectRoot - Path to project root (default: process.cwd())
 * @returns ConfigManager instance
 */
export function getConfigManager(projectRoot?: string): ConfigManager {
  if (!globalConfigManager || projectRoot) {
    globalConfigManager = new ConfigManager(projectRoot);
  }
  return globalConfigManager;
}

/**
 * Read configuration
 *
 * Convenience function for reading config
 *
 * @param projectRoot - Path to project root (default: process.cwd())
 * @returns Configuration object
 */
export async function readConfig(projectRoot?: string): Promise<SpecWeaveConfig> {
  const manager = getConfigManager(projectRoot);
  return manager.read();
}

/**
 * Write configuration
 *
 * Convenience function for writing config
 *
 * @param config - Configuration to write
 * @param projectRoot - Path to project root (default: process.cwd())
 */
export async function writeConfig(config: SpecWeaveConfig, projectRoot?: string): Promise<void> {
  const manager = getConfigManager(projectRoot);
  await manager.write(config);
}
