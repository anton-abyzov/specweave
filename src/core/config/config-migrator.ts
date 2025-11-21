/**
 * Configuration Migration Tool
 *
 * Migrates old .env-only format to split secrets/config format
 *
 * @module core/config/config-migrator
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ConfigManager } from './config-manager.js';
import { parseEnvFile } from '../../utils/env-file.js';
import type { SpecWeaveConfig } from './types.js';

/**
 * Classification result for an environment variable
 */
export interface EnvVarClassification {
  key: string;
  value: string;
  type: 'secret' | 'config';
  reason: string;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  secretsCount: number;
  configCount: number;
  backupPath?: string;
  errors: string[];
  warnings: string[];
  classified: EnvVarClassification[];
}

/**
 * Migration options
 */
export interface MigrationOptions {
  dryRun?: boolean;
  backup?: boolean;
  force?: boolean;
}

/**
 * Migrates .env-only configuration to split format
 */
export class ConfigMigrator {
  private projectRoot: string;
  private envPath: string;
  private configManager: ConfigManager;

  /**
   * Secret keywords (case-insensitive)
   */
  private static SECRET_KEYWORDS = [
    'token',
    'api_token',
    'pat',
    'secret',
    'key',
    'password',
    'credential',
    'auth'
  ];

  /**
   * Email patterns (for auth purposes, considered secrets)
   */
  private static EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.envPath = path.join(projectRoot, '.env');
    this.configManager = new ConfigManager(projectRoot);
  }

  /**
   * Check if migration is needed
   *
   * @returns True if project needs migration
   */
  async needsMigration(): Promise<boolean> {
    try {
      // Check if .env exists
      await fs.access(this.envPath);

      // Check if config.json already has full config (already migrated)
      const hasConfig = await this.configManager.exists();
      if (hasConfig) {
        const config = await this.configManager.read();
        // If config has issue tracker or sync settings, likely already migrated
        if (config.issueTracker?.domain || config.sync?.enabled) {
          return false;
        }
      }

      // Check if .env has config variables (not just secrets)
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      const parsed = parseEnvFile(envContent);
      const classified = this.classifyVariables(parsed);

      // Needs migration if there are config variables in .env
      return classified.some(c => c.type === 'config');
    } catch {
      return false;
    }
  }

  /**
   * Classify environment variables as secrets or config
   *
   * @param envVars - Parsed environment variables
   * @returns Classification results
   */
  classifyVariables(envVars: Record<string, string>): EnvVarClassification[] {
    const results: EnvVarClassification[] = [];

    for (const [key, value] of Object.entries(envVars)) {
      const classification = this.classifyVariable(key, value);
      results.push(classification);
    }

    return results;
  }

  /**
   * Classify a single variable
   *
   * @param key - Environment variable key
   * @param value - Environment variable value
   * @returns Classification result
   */
  private classifyVariable(key: string, value: string): EnvVarClassification {
    const lowerKey = key.toLowerCase();

    // Check for secret keywords
    for (const keyword of ConfigMigrator.SECRET_KEYWORDS) {
      if (lowerKey.includes(keyword)) {
        return {
          key,
          value,
          type: 'secret',
          reason: `Contains keyword: ${keyword}`
        };
      }
    }

    // Check for email pattern (used for auth)
    if (ConfigMigrator.EMAIL_PATTERN.test(value)) {
      return {
        key,
        value,
        type: 'secret',
        reason: 'Email address (used for authentication)'
      };
    }

    // Everything else is configuration
    return {
      key,
      value,
      type: 'config',
      reason: 'Non-sensitive configuration data'
    };
  }

  /**
   * Build config object from classified variables
   *
   * @param classified - Classified variables
   * @returns Configuration object
   */
  private buildConfigFromVars(classified: EnvVarClassification[]): Partial<SpecWeaveConfig> {
    const config: Partial<SpecWeaveConfig> = {
      version: '2.0'
    };

    const configVars = classified.filter(c => c.type === 'config');

    for (const { key, value } of configVars) {
      // Jira configuration
      if (key.startsWith('JIRA_')) {
        if (!config.issueTracker) {
          config.issueTracker = { provider: 'jira' };
        }

        if (key === 'JIRA_DOMAIN') {
          config.issueTracker.domain = value;
        } else if (key === 'JIRA_INSTANCE_TYPE') {
          config.issueTracker.instanceType = value as any;
        } else if (key === 'JIRA_STRATEGY') {
          config.issueTracker.strategy = value as any;
        } else if (key === 'JIRA_PROJECT' || key === 'JIRA_PROJECT_KEY') {
          config.issueTracker.project = value;
        } else if (key === 'JIRA_PROJECTS') {
          // Comma-separated list
          config.issueTracker.projects = value.split(',').map(k => ({ key: k.trim() }));
        } else if (key === 'JIRA_COMPONENTS') {
          config.issueTracker.components = value.split(',').map(c => c.trim());
        }
      }

      // GitHub configuration
      if (key.startsWith('GITHUB_')) {
        if (key === 'GITHUB_OWNER') {
          // Only set provider if not already set (prioritize first provider)
          if (!config.issueTracker) {
            config.issueTracker = { provider: 'github' };
          } else if (config.issueTracker.provider === 'jira') {
            // Skip GitHub config if Jira provider already set
            continue;
          }
          config.issueTracker.owner = value;
        } else if (key === 'GITHUB_REPO') {
          if (!config.issueTracker) {
            config.issueTracker = { provider: 'github' };
          } else if (config.issueTracker.provider === 'jira') {
            // Skip GitHub config if Jira provider already set
            continue;
          }
          config.issueTracker.repo = value;
        }
      }

      // Azure DevOps configuration
      if (key.startsWith('ADO_')) {
        if (key === 'ADO_ORGANIZATION') {
          // Only set provider if not already set (prioritize first provider)
          if (!config.issueTracker) {
            config.issueTracker = { provider: 'ado' };
          } else if (config.issueTracker.provider !== 'ado') {
            // Skip ADO config if different provider already set
            continue;
          }
          config.issueTracker.organization_ado = value;
        } else if (key === 'ADO_PROJECT') {
          if (!config.issueTracker) {
            config.issueTracker = { provider: 'ado' };
          } else if (config.issueTracker.provider !== 'ado') {
            // Skip ADO config if different provider already set
            continue;
          }
          config.issueTracker.project = value;
        }
      }

      // Sync configuration
      if (key.startsWith('SYNC_')) {
        if (!config.sync) {
          config.sync = {
            enabled: false,
            direction: 'bidirectional',
            autoSync: false,
            includeStatus: true,
            autoApplyLabels: true
          };
        }

        if (key === 'SYNC_ENABLED') {
          config.sync.enabled = value.toLowerCase() === 'true';
        } else if (key === 'SYNC_DIRECTION') {
          config.sync.direction = value as any;
        } else if (key === 'SYNC_AUTO') {
          config.sync.autoSync = value.toLowerCase() === 'true';
        }
      }
    }

    return config;
  }

  /**
   * Migrate configuration
   *
   * @param options - Migration options
   * @returns Migration result
   */
  async migrate(options: MigrationOptions = {}): Promise<MigrationResult> {
    const { dryRun = false, backup = true, force = false } = options;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if migration is needed
      if (!force) {
        const needed = await this.needsMigration();
        if (!needed) {
          return {
            success: false,
            secretsCount: 0,
            configCount: 0,
            errors: ['Migration not needed - project already uses split format or no .env found'],
            warnings: [],
            classified: []
          };
        }
      }

      // Read .env file
      const envContent = await fs.readFile(this.envPath, 'utf-8');
      const parsed = parseEnvFile(envContent);

      // Classify variables
      const classified = this.classifyVariables(parsed);
      const secrets = classified.filter(c => c.type === 'secret');
      const configs = classified.filter(c => c.type === 'config');

      if (configs.length === 0) {
        warnings.push('No configuration variables found in .env - only secrets detected');
      }

      if (dryRun) {
        return {
          success: true,
          secretsCount: secrets.length,
          configCount: configs.length,
          errors: [],
          warnings,
          classified
        };
      }

      // Backup original .env if requested
      let backupPath: string | undefined;
      if (backup) {
        backupPath = `${this.envPath}.backup.${Date.now()}`;
        await fs.copyFile(this.envPath, backupPath);
      }

      // Build new config.json content
      const newConfig = this.buildConfigFromVars(classified);

      // Write config.json
      await this.configManager.update(newConfig);

      // Create new .env with only secrets
      const newEnvLines = [
        '# SpecWeave Environment Variables',
        '#',
        '# IMPORTANT: This file contains ONLY secrets (tokens, passwords)',
        '# Configuration is now in .specweave/config.json (committed to git)',
        '#',
        '# NEVER commit .env to git! It\'s already in .gitignore',
        '',
        ...secrets.map(s => `${s.key}=${s.value}`)
      ];

      await fs.writeFile(this.envPath, newEnvLines.join('\n'), 'utf-8');

      // Generate .env.example
      const exampleLines = [
        '# SpecWeave Environment Variables',
        '#',
        '# IMPORTANT: Copy this file to .env and replace placeholder values',
        '# NEVER commit .env to git!',
        '#',
        '# Setup: cp .env.example .env',
        '',
        ...secrets.map(s => {
          const placeholder = this.generatePlaceholder(s.key);
          return `${s.key}=${placeholder}`;
        }),
        '',
        '# NOTE: Configuration (domain, strategy, projects) is now in .specweave/config.json',
        '# (This makes it shareable across the team via git)'
      ];

      const examplePath = path.join(this.projectRoot, '.env.example');
      await fs.writeFile(examplePath, exampleLines.join('\n'), 'utf-8');

      return {
        success: true,
        secretsCount: secrets.length,
        configCount: configs.length,
        backupPath,
        errors: [],
        warnings,
        classified
      };
    } catch (error: any) {
      errors.push(`Migration failed: ${error.message}`);
      return {
        success: false,
        secretsCount: 0,
        configCount: 0,
        errors,
        warnings,
        classified: []
      };
    }
  }

  /**
   * Generate placeholder value for .env.example
   *
   * @param key - Environment variable key
   * @returns Placeholder value
   */
  private generatePlaceholder(key: string): string {
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('email')) {
      return 'your_email@company.com';
    }

    if (lowerKey.includes('jira') && lowerKey.includes('token')) {
      return 'your_jira_api_token_here';
    }

    if (lowerKey.includes('github') && lowerKey.includes('token')) {
      return 'your_github_token_here';
    }

    if (lowerKey.includes('ado') && lowerKey.includes('pat')) {
      return 'your_ado_pat_here';
    }

    // Generic placeholder
    return `your_${key.toLowerCase()}_here`;
  }

  /**
   * Preview migration (dry run)
   *
   * @returns Migration preview
   */
  async preview(): Promise<MigrationResult> {
    return this.migrate({ dryRun: true, force: true });
  }
}
