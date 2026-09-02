/**
 * SpecWeave Configuration Manager
 *
 * Manages .specweave/config.json for non-sensitive configuration
 * (Secrets like API tokens go in .env, NOT in config.json)
 *
 * @module core/config/config-manager
 */

import { promises as fs, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import {
  SpecWeaveConfig,
  DEFAULT_CONFIG,
  KNOWN_CONFIG_KEYS,
  ValidationResult,
  ValidationError
} from './types.js';
import { migrateToWorkspace } from './workspace-migrator.js';
import { migrateTo2, buildMigrationNote, unknownKeys, type MigrateResult } from './migrate-to-2.js';
import { consoleLogger, type Logger } from '../../utils/logger.js';
import { getProjectRoot } from '../../utils/find-project-root.js';

/**
 * Configuration file path
 */
const CONFIG_FILE_NAME = 'config.json';

/**
 * Manages SpecWeave configuration
 */
export class ConfigManager {
  private configPath: string;
  private projectRoot: string;
  private config: SpecWeaveConfig | null = null;
  private logger: Logger;

  /**
   * Create a new ConfigManager
   *
   * CRITICAL FIX: Uses getProjectRoot() instead of process.cwd() to prevent
   * creating/accessing .specweave in wrong location when CWD != project root.
   *
   * @param projectRoot - Path to project root (default: auto-detected via getProjectRoot())
   * @param logger - Logger instance (default: consoleLogger)
   */
  constructor(projectRoot: string = getProjectRoot(), logger: Logger = consoleLogger) {
    this.projectRoot = projectRoot;
    this.configPath = path.join(projectRoot, '.specweave', CONFIG_FILE_NAME);
    this.logger = logger;
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
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content);
      } catch (parseError: unknown) {
        const parseMessage = parseError instanceof SyntaxError ? parseError.message : String(parseError);
        throw new Error(`Invalid JSON in config.json: ${parseMessage}`);
      }

      const hadLegacyConfig = this.hasLegacyConfig(parsed);
      const fromVersion = typeof parsed.version === 'string' ? parsed.version : '';

      // One migration pass for the whole file (limits included).
      const migration = migrateTo2(parsed);
      this.warnUnknownKeys(parsed);
      if (migration.changed && !hadLegacyConfig) {
        await this.rewriteRaw(parsed);
      }
      if (migration.changed) {
        await this.writeMigrationNote(migration, fromVersion);
      }

      // Merge with defaults (for backward compatibility)
      let config = this.mergeWithDefaults(parsed);

      // Strip deprecated syncStrategy from umbrella config (removed in v1.0.366)
      if (config.umbrella && 'syncStrategy' in config.umbrella) {
        delete (config.umbrella as Record<string, unknown>).syncStrategy;
      }

      // Auto-migrate legacy umbrella/multiProject/projectMappings → workspace
      config = migrateToWorkspace(config, {
        info: (msg: string) => this.logger.info(msg),
        warn: (msg: string) => this.logger.warn(msg),
      });

      if (hadLegacyConfig && this.isPersistableWorkspaceMigration(config)) {
        await this.persistMigratedConfig(config);
      }

      this.config = config;
      return this.config;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'ENOENT') {
        // Config file doesn't exist, return defaults
        this.config = { ...DEFAULT_CONFIG };
        return this.config;
      }
      // Re-throw JSON parse errors directly
      if (err.message?.includes('Invalid JSON in config.json')) {
        throw error;
      }
      throw new Error(`Failed to read config: ${err.message || String(error)}`);
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
      const content = readFileSync(this.configPath, 'utf-8');
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content);
      } catch (parseError: unknown) {
        const parseMessage = parseError instanceof SyntaxError ? parseError.message : String(parseError);
        throw new Error(`Invalid JSON in config.json: ${parseMessage}`);
      }

      const hadLegacyConfig = this.hasLegacyConfig(parsed);
      const fromVersion = typeof parsed.version === 'string' ? parsed.version : '';

      const migration = migrateTo2(parsed);
      this.warnUnknownKeys(parsed);
      if (migration.changed && !hadLegacyConfig) {
        this.rewriteRawSync(parsed);
      }
      if (migration.changed) {
        this.writeMigrationNoteSync(migration, fromVersion);
      }

      // Merge with defaults
      let config = this.mergeWithDefaults(parsed);

      // Auto-migrate legacy → workspace
      config = migrateToWorkspace(config, {
        info: (msg: string) => this.logger.info(msg),
        warn: (msg: string) => this.logger.warn(msg),
      });

      if (hadLegacyConfig && this.isPersistableWorkspaceMigration(config)) {
        this.persistMigratedConfigSync(config);
      }

      this.config = config;
      return this.config;
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === 'ENOENT') {
        // Config file doesn't exist, return defaults
        this.config = { ...DEFAULT_CONFIG };
        return this.config;
      }
      // Re-throw JSON parse errors directly
      if (err.message?.includes('Invalid JSON in config.json')) {
        throw error;
      }
      throw new Error(`Failed to read config: ${err.message || String(error)}`);
    }
  }

  /**
   * Write configuration to disk
   *
   * @param config - Configuration to write
   */
  async write(config: SpecWeaveConfig): Promise<void> {
    // Strip legacy keys before writing (workspace is the single source of truth)
    const toWrite = { ...config };
    if (toWrite.workspace) {
      delete toWrite.umbrella;
      delete toWrite.multiProject;
      delete toWrite.projectMappings;
    }

    // Validate before writing
    const validation = this.validate(toWrite);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`).join('\n');
      throw new Error(`Invalid configuration:\n${errorMessages}`);
    }

    try {
      // Ensure .specweave directory exists
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });

      // Write with pretty formatting
      const content = JSON.stringify(toWrite, null, 2);
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

    // Validate projectMappings (v0.34.0+)
    if (cfg.projectMappings) {
      for (const [projectId, mapping] of Object.entries(cfg.projectMappings)) {
        // Validate project ID format (kebab-case)
        if (!/^[a-z0-9-]+$/.test(projectId)) {
          errors.push({
            path: `projectMappings.${projectId}`,
            message: 'Project ID must be kebab-case (lowercase letters, numbers, hyphens)',
            value: projectId
          });
        }

        // Validate GitHub mapping
        if (mapping.github) {
          if (!mapping.github.owner || typeof mapping.github.owner !== 'string') {
            errors.push({
              path: `projectMappings.${projectId}.github.owner`,
              message: 'GitHub owner is required and must be a string',
              value: mapping.github.owner
            });
          }
          if (!mapping.github.repo || typeof mapping.github.repo !== 'string') {
            errors.push({
              path: `projectMappings.${projectId}.github.repo`,
              message: 'GitHub repo is required and must be a string',
              value: mapping.github.repo
            });
          }
        }

        // Validate JIRA mapping
        if (mapping.jira) {
          if (!mapping.jira.project || typeof mapping.jira.project !== 'string') {
            errors.push({
              path: `projectMappings.${projectId}.jira.project`,
              message: 'JIRA project is required and must be a string',
              value: mapping.jira.project
            });
          }
        }

        // Validate ADO mapping
        if (mapping.ado) {
          if (!mapping.ado.project || typeof mapping.ado.project !== 'string') {
            errors.push({
              path: `projectMappings.${projectId}.ado.project`,
              message: 'ADO project is required and must be a string',
              value: mapping.ado.project
            });
          }
        }

        // At least one mapping should be defined (warn, not error)
        if (!mapping.github && !mapping.jira && !mapping.ado) {
          errors.push({
            path: `projectMappings.${projectId}`,
            message: 'At least one external mapping (github, jira, or ado) should be defined',
            value: mapping
          });
        }
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

  private hasLegacyConfig(config: Record<string, unknown>): boolean {
    return !!(config.umbrella || config.multiProject || config.projectMappings);
  }

  private isPersistableWorkspaceMigration(config: SpecWeaveConfig): boolean {
    return !!config.workspace && !config.umbrella && !config.multiProject && !config.projectMappings;
  }

  private stripLegacyKeys(config: SpecWeaveConfig): SpecWeaveConfig {
    const toWrite = { ...config };
    if (toWrite.workspace) {
      delete toWrite.umbrella;
      delete toWrite.multiProject;
      delete toWrite.projectMappings;
    }
    return toWrite;
  }

  private async persistMigratedConfig(config: SpecWeaveConfig): Promise<void> {
    const toWrite = this.stripLegacyKeys(config);
    const validation = this.validate(toWrite);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`).join('\n');
      this.logger.warn(`Could not persist migrated config: ${errorMessages}`);
      return;
    }

    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(toWrite, null, 2), 'utf-8');
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.warn(`Could not persist migrated config: ${err.message || String(error)}`);
    }
  }

  /** One warning line naming every top-level key 2.0 does not read. */
  private warnUnknownKeys(parsed: Record<string, unknown>): void {
    const unknown = unknownKeys(parsed, KNOWN_CONFIG_KEYS as readonly string[]);
    if (unknown.length > 0) {
      this.logger.warn(
        `config.json: ignoring unknown key(s): ${unknown.join(', ')} — see \`specweave doctor\``,
      );
    }
  }

  private migrationNotePath(): string {
    return path.join(this.projectRoot, '.specweave', 'state', 'config-migration-2.json');
  }

  private async writeMigrationNote(migration: MigrateResult, fromVersion: string): Promise<void> {
    if (migration.removedKeys.length === 0 && migration.renamedKeys.length === 0) return;
    const notePath = this.migrationNotePath();
    try {
      await fs.mkdir(path.dirname(notePath), { recursive: true });
      await fs.writeFile(notePath, JSON.stringify(buildMigrationNote(migration, fromVersion), null, 2), 'utf-8');
    } catch {
      // The note is informational — never fail a config read over it.
    }
  }

  private writeMigrationNoteSync(migration: MigrateResult, fromVersion: string): void {
    if (migration.removedKeys.length === 0 && migration.renamedKeys.length === 0) return;
    const notePath = this.migrationNotePath();
    try {
      mkdirSync(path.dirname(notePath), { recursive: true });
      writeFileSync(notePath, JSON.stringify(buildMigrationNote(migration, fromVersion), null, 2), 'utf-8');
    } catch {
      // The note is informational — never fail a config read over it.
    }
  }

  /** Write the user's raw config back unchanged except for a one-shot key migration. */
  private async rewriteRaw(parsed: Record<string, unknown>): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(parsed, null, 2), 'utf-8');
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.warn(`Could not persist migrated config: ${err.message || String(error)}`);
    }
  }

  private rewriteRawSync(parsed: Record<string, unknown>): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(parsed, null, 2), 'utf-8');
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.warn(`Could not persist migrated config: ${err.message || String(error)}`);
    }
  }

  private persistMigratedConfigSync(config: SpecWeaveConfig): void {
    const toWrite = this.stripLegacyKeys(config);
    const validation = this.validate(toWrite);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`).join('\n');
      this.logger.warn(`Could not persist migrated config: ${errorMessages}`);
      return;
    }

    try {
      mkdirSync(path.dirname(this.configPath), { recursive: true });
      writeFileSync(this.configPath, JSON.stringify(toWrite, null, 2), 'utf-8');
    } catch (error: unknown) {
      const err = error as { message?: string };
      this.logger.warn(`Could not persist migrated config: ${err.message || String(error)}`);
    }
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

  // ═══════════════════════════════════════════════════════════════════
  // Backward-compat aliases from old ConfigManager API (0188)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * @deprecated Use readSync() instead
   */
  load(): SpecWeaveConfig {
    return this.readSync();
  }

  /**
   * @deprecated Use read() instead
   */
  async loadAsync(): Promise<SpecWeaveConfig> {
    return this.read();
  }

  /**
   * @deprecated Use write() instead
   */
  async save(config: SpecWeaveConfig): Promise<void> {
    return this.write(config);
  }

  /**
   * @deprecated Use write() with await instead
   */
  saveSync(config: SpecWeaveConfig): void {
    const configPath = path.join(this.projectRoot, '.specweave', CONFIG_FILE_NAME);
    const dir = path.dirname(configPath);
    const { mkdirSync, writeFileSync } = require('fs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    this.config = config;
  }

  /**
   * @deprecated Access configPath via constructor
   */
  getConfigPath(): string {
    return path.join(this.projectRoot, '.specweave', CONFIG_FILE_NAME);
  }

  /**
   * @deprecated Use exists() instead
   */
  async existsAsync(): Promise<boolean> {
    return this.exists();
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
