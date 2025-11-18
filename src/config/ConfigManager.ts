/**
 * SpecWeave Configuration Manager
 *
 * Handles reading, writing, and updating .specweave/config.json
 * with Zod validation.
 */

import fs from 'fs/promises';
import path from 'path';
import { SpecWeaveConfig, SpecWeaveConfigSchema, ResearchConfig } from './types.js';

/**
 * ConfigManager - Manages SpecWeave configuration persistence
 *
 * **Features**:
 * - Zod schema validation on read/write
 * - Atomic updates (read-modify-write)
 * - Automatic timestamp updates
 * - Graceful error handling
 *
 * **Usage**:
 * ```typescript
 * const config = await ConfigManager.load();
 * config.research = { vision: insights };
 * await ConfigManager.save(config);
 * ```
 */
export class ConfigManager {
  /**
   * Default config file path
   */
  private static readonly CONFIG_PATH = '.specweave/config.json';

  /**
   * Load configuration from disk
   *
   * @param configPath - Path to config file (defaults to .specweave/config.json)
   * @returns Parsed and validated config
   * @throws Error if config is invalid or cannot be read
   */
  static async load(configPath: string = ConfigManager.CONFIG_PATH): Promise<SpecWeaveConfig> {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Validate with Zod schema
      const config = SpecWeaveConfigSchema.parse(parsed);

      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Config file not found: ${configPath}`);
      }
      throw error;
    }
  }

  /**
   * Save configuration to disk
   *
   * @param config - Config object to save
   * @param configPath - Path to config file (defaults to .specweave/config.json)
   */
  static async save(config: SpecWeaveConfig, configPath: string = ConfigManager.CONFIG_PATH): Promise<void> {
    // Validate before saving
    const validated = SpecWeaveConfigSchema.parse(config);

    // Update timestamp
    validated.lastUpdated = new Date().toISOString();

    // Ensure .specweave directory exists
    const dir = path.dirname(configPath);
    await fs.mkdir(dir, { recursive: true });

    // Write with pretty formatting
    await fs.writeFile(configPath, JSON.stringify(validated, null, 2), 'utf-8');
  }

  /**
   * Update research insights in config
   *
   * Atomic read-modify-write operation.
   *
   * @param updates - Partial research config to merge
   * @param configPath - Path to config file
   */
  static async updateResearch(
    updates: Partial<ResearchConfig>,
    configPath: string = ConfigManager.CONFIG_PATH
  ): Promise<void> {
    try {
      const config = await ConfigManager.load(configPath);

      // Merge research updates
      config.research = {
        ...config.research,
        ...updates
      };

      await ConfigManager.save(config, configPath);
    } catch (error) {
      const errorMessage = (error as Error).message || '';
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' || errorMessage.includes('Config file not found')) {
        throw new Error(
          `Cannot update research: config file not found. Run 'specweave init' first.`
        );
      }
      throw error;
    }
  }

  /**
   * Check if config file exists
   *
   * @param configPath - Path to config file
   * @returns True if config file exists
   */
  static async exists(configPath: string = ConfigManager.CONFIG_PATH): Promise<boolean> {
    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize a new config file
   *
   * @param projectName - Name of the project
   * @param configPath - Path to config file
   * @returns Initialized config
   */
  static async initialize(
    projectName: string,
    configPath: string = ConfigManager.CONFIG_PATH
  ): Promise<SpecWeaveConfig> {
    const config: SpecWeaveConfig = {
      version: '1.0.0',
      projectName,
      livingDocs: {
        copyBasedSync: { enabled: true },
        threeLayerSync: true
      }
    };

    await ConfigManager.save(config, configPath);
    return config;
  }
}
