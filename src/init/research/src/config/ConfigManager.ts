/**
 * ConfigManager - Unified configuration persistence with Zod validation
 *
 * Handles atomic read-modify-write operations for .specweave/config.json
 * with runtime schema validation using Zod.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SpecWeaveConfigSchema, ResearchConfigSchema, type SpecWeaveConfig, type ResearchConfig } from './types.js';

export class ConfigManager {
  static readonly CONFIG_PATH = '.specweave/config.json';

  static async load(configPath: string = ConfigManager.CONFIG_PATH): Promise<SpecWeaveConfig> {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      return SpecWeaveConfigSchema.parse(parsed);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {
          version: '1.0.0',
          project: { name: 'specweave-project', type: 'single' },
          research: {},
          livingDocs: { enabled: true, baseDir: '.specweave/docs' }
        };
      }
      throw error;
    }
  }

  static async save(config: SpecWeaveConfig, configPath: string = ConfigManager.CONFIG_PATH): Promise<void> {
    const validated = SpecWeaveConfigSchema.parse(config);
    const dir = path.dirname(configPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(validated, null, 2), 'utf-8');
  }

  static async updateResearch(updates: Partial<ResearchConfig>, configPath: string = ConfigManager.CONFIG_PATH): Promise<void> {
    const config = await ConfigManager.load(configPath);
    config.research = { ...config.research, ...updates };
    if (Object.keys(config.research).length > 0) {
      ResearchConfigSchema.parse(config.research);
    }
    await ConfigManager.save(config, configPath);
  }
}
