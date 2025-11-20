/**
 * Import Configuration Loader
 *
 * Loads import configuration from .specweave/config.json and environment variables.
 * Environment variables override config file settings.
 */

import fs from 'fs-extra';
import path from 'path';

export interface ImportConfig {
  /** Enable/disable external tool import */
  enabled: boolean;

  /** Time range in months for import (default: 1) */
  timeRangeMonths: number;

  /** Page size for pagination (default: 100) */
  pageSize: number;

  /** GitHub-specific configuration */
  github?: {
    labelFilter?: string[];
    stateFilter?: ('open' | 'closed')[];
  };

  /** JIRA-specific configuration */
  jira?: {
    jqlFilter?: string;
    issueTypes?: string[];
  };

  /** Azure DevOps-specific configuration */
  ado?: {
    wiqlFilter?: string;
    workItemTypes?: string[];
  };
}

export interface ProjectConfig {
  project?: {
    name?: string;
    version?: string;
  };
  adapters?: {
    default?: string;
  };
  externalImport?: ImportConfig;
  [key: string]: any;
}

/**
 * Default import configuration
 */
export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  enabled: true,
  timeRangeMonths: 1,
  pageSize: 100
};

/**
 * Load import configuration from project
 * Merges config file with environment variables (env vars take precedence)
 */
export function loadImportConfig(projectRoot: string): ImportConfig {
  // Start with defaults
  let config: ImportConfig = { ...DEFAULT_IMPORT_CONFIG };

  // Load from config file
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const projectConfig: ProjectConfig = fs.readJsonSync(configPath);
      if (projectConfig.externalImport) {
        config = { ...config, ...projectConfig.externalImport };
      }
    } catch (error) {
      // Invalid config file - use defaults
    }
  }

  // Override with environment variables
  const envConfig = loadFromEnvironment();
  config = { ...config, ...envConfig };

  return config;
}

/**
 * Load configuration from environment variables
 * Environment variables take precedence over config file
 */
export function loadFromEnvironment(): Partial<ImportConfig> {
  const config: Partial<ImportConfig> = {};

  // SPECWEAVE_IMPORT_ENABLED
  if (process.env.SPECWEAVE_IMPORT_ENABLED !== undefined) {
    config.enabled = process.env.SPECWEAVE_IMPORT_ENABLED === 'true';
  }

  // SPECWEAVE_IMPORT_TIME_RANGE_MONTHS
  if (process.env.SPECWEAVE_IMPORT_TIME_RANGE_MONTHS !== undefined) {
    const months = parseInt(process.env.SPECWEAVE_IMPORT_TIME_RANGE_MONTHS, 10);
    if (!isNaN(months) && months > 0) {
      config.timeRangeMonths = months;
    }
  }

  // SPECWEAVE_IMPORT_PAGE_SIZE
  if (process.env.SPECWEAVE_IMPORT_PAGE_SIZE !== undefined) {
    const pageSize = parseInt(process.env.SPECWEAVE_IMPORT_PAGE_SIZE, 10);
    if (!isNaN(pageSize) && pageSize > 0 && pageSize <= 1000) {
      config.pageSize = pageSize;
    }
  }

  return config;
}

/**
 * Validate import configuration
 * Throws error if configuration is invalid
 */
export function validateImportConfig(config: ImportConfig): void {
  // Check time range
  if (config.timeRangeMonths < 1 || config.timeRangeMonths > 120) {
    throw new Error(
      `Invalid timeRangeMonths: ${config.timeRangeMonths}. Must be between 1 and 120 months.`
    );
  }

  // Check page size
  if (config.pageSize < 1 || config.pageSize > 1000) {
    throw new Error(
      `Invalid pageSize: ${config.pageSize}. Must be between 1 and 1000.`
    );
  }

  // Validate GitHub config
  if (config.github) {
    if (config.github.stateFilter) {
      const validStates: Array<'open' | 'closed'> = ['open', 'closed'];
      const invalidStates = config.github.stateFilter.filter(
        state => !validStates.includes(state)
      );
      if (invalidStates.length > 0) {
        throw new Error(
          `Invalid GitHub stateFilter: ${invalidStates.join(', ')}. ` +
          `Valid values: ${validStates.join(', ')}`
        );
      }
    }
  }
}

/**
 * Save import configuration to project config file
 */
export function saveImportConfig(projectRoot: string, importConfig: ImportConfig): void {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');

  // Read existing config or create new
  let projectConfig: ProjectConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      projectConfig = fs.readJsonSync(configPath);
    } catch (error) {
      // Invalid config - start fresh
    }
  }

  // Update import config section
  projectConfig.externalImport = importConfig;

  // Write back
  fs.writeJsonSync(configPath, projectConfig, { spaces: 2 });
}

/**
 * Get example import configuration
 * Useful for documentation and init templates
 */
export function getExampleImportConfig(): ImportConfig {
  return {
    enabled: true,
    timeRangeMonths: 3,
    pageSize: 100,
    github: {
      labelFilter: ['enhancement', 'feature'],
      stateFilter: ['open', 'closed']
    },
    jira: {
      jqlFilter: 'project = MYPROJECT AND type IN (Epic, Story)',
      issueTypes: ['Epic', 'Story']
    },
    ado: {
      wiqlFilter: `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] IN ('Epic', 'User Story')`,
      workItemTypes: ['Epic', 'User Story']
    }
  };
}
