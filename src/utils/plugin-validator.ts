/**
 * Plugin Validation System
 *
 * Proactively validates SpecWeave plugin installation before workflow commands.
 * Ensures marketplace is registered, core plugin is installed, and context-specific
 * plugins are available.
 *
 * @module plugin-validator
 * @since 0.9.4
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Result of plugin installation attempt
 */
export interface InstallResult {
  success: boolean;
  component: string;
  error?: string;
  details?: string;
}

/**
 * Options for plugin validation
 */
export interface ValidationOptions {
  /** Auto-install missing components (default: false) */
  autoInstall?: boolean;
  /** Increment description for context-aware plugin detection */
  context?: string;
  /** Show what would be installed without installing (default: false) */
  dryRun?: boolean;
  /** Show detailed validation steps (default: false) */
  verbose?: boolean;
}

/**
 * Result of plugin validation
 */
export interface ValidationResult {
  /** True if all required components are installed */
  valid: boolean;
  /** Timestamp of validation */
  timestamp: number;
  /** Missing components */
  missing: {
    marketplace: boolean;
    corePlugin: boolean;
    contextPlugins: string[];
  };
  /** Installed components */
  installed: {
    corePlugin: boolean;
    corePluginVersion?: string;
    contextPlugins: string[];
  };
  /** Recommendations for user */
  recommendations: string[];
  /** Errors encountered during validation */
  errors: string[];
  /** Cache information */
  cache?: {
    hit: boolean;
    age: number; // seconds
  };
}

/**
 * Validation cache entry
 */
interface ValidationCache {
  timestamp: number;
  result: ValidationResult;
}

/**
 * Marketplace configuration structure
 */
interface MarketplaceConfig {
  extraKnownMarketplaces?: {
    specweave?: {
      source: {
        source: 'github' | 'git' | 'local';
        repo?: string;
        path?: string;
        url?: string;
      };
    };
    [key: string]: any;
  };
  [key: string]: any;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Plugin keyword mappings
 * Maps plugin names to keywords that should trigger their suggestion
 * Scoring: 2+ keyword matches = high confidence (plugin suggested)
 */
export const PLUGIN_KEYWORDS: Record<string, string[]> = {
  'specweave-github': [
    'github',
    'git',
    'issues',
    'pull request',
    'pr',
    'repository',
    'commit',
  ],
  'specweave-jira': [
    'jira',
    'epic',
    'story',
    'sprint',
    'backlog',
    'atlassian',
  ],
  'specweave-ado': [
    'azure devops',
    'ado',
    'azure',
    'devops',
    'work item',
    'boards',
  ],
  'specweave-payments': [
    'stripe',
    'billing',
    'payment',
    'subscription',
    'invoice',
    'checkout',
  ],
  'specweave-frontend': [
    'react',
    'nextjs',
    'next.js',
    'vue',
    'angular',
    'svelte',
    'frontend',
    'ui',
  ],
  'specweave-kubernetes': [
    'kubernetes',
    'k8s',
    'helm',
    'pod',
    'deployment',
    'service mesh',
    'kubectl',
  ],
  'specweave-ml': [
    'machine learning',
    'ml',
    'tensorflow',
    'pytorch',
    'model',
    'training',
    'dataset',
  ],
  'specweave-observability': [
    'prometheus',
    'grafana',
    'monitoring',
    'metrics',
    'alerting',
    'observability',
  ],
  'specweave-security': [
    'security',
    'owasp',
    'vulnerability',
    'penetration',
    'audit',
    'csrf',
    'xss',
  ],
  'specweave-diagrams': [
    'diagram',
    'c4',
    'mermaid',
    'architecture',
    'visualization',
    'flowchart',
  ],
  'specweave-backend-nodejs': [
    'nodejs',
    'express',
    'fastify',
    'nestjs',
    'backend',
    'api',
  ],
  'specweave-backend-python': [
    'python',
    'fastapi',
    'django',
    'flask',
    'backend',
    'api',
  ],
  'specweave-backend-dotnet': [
    'dotnet',
    '.net',
    'aspnet',
    'asp.net',
    'c#',
    'csharp',
  ],
  'specweave-e2e-testing': [
    'playwright',
    'e2e',
    'end-to-end',
    'browser',
    'visual regression',
  ],
};

/** Cache TTL in seconds (5 minutes) */
const CACHE_TTL = 300;

/** Confidence threshold for plugin detection (2+ keyword matches) */
const KEYWORD_CONFIDENCE_THRESHOLD = 2;

/** SpecWeave marketplace configuration */
const SPECWEAVE_MARKETPLACE_CONFIG = {
  source: {
    source: 'github' as const,
    repo: 'anton-abyzov/specweave',
    path: '.claude-plugin',
  },
};

// ============================================================================
// Main Validator Class
// ============================================================================

/**
 * Plugin Validator
 *
 * Validates SpecWeave plugin installation and provides auto-installation
 * capabilities. Uses caching to minimize validation overhead.
 */
export class PluginValidator {
  private cacheFile: string;
  private verbose: boolean = false;

  constructor() {
    this.cacheFile = path.join(
      os.homedir(),
      '.specweave',
      'validation-cache.json'
    );
  }

  /**
   * Main validation entry point
   *
   * @param options - Validation options
   * @returns Validation result with missing/installed components
   */
  async validate(options: ValidationOptions = {}): Promise<ValidationResult> {
    this.verbose = options.verbose ?? false;

    // Check cache first (unless verbose mode)
    if (!options.verbose && !options.dryRun) {
      const cached = await this.getCachedValidation();
      if (cached) {
        this.log('Using cached validation result');
        return cached;
      }
    }

    const result: ValidationResult = {
      valid: true,
      timestamp: Date.now(),
      missing: {
        marketplace: false,
        corePlugin: false,
        contextPlugins: [],
      },
      installed: {
        corePlugin: false,
        contextPlugins: [],
      },
      recommendations: [],
      errors: [],
    };

    try {
      // Step 1: Check marketplace
      this.log('Checking marketplace registration...');
      if (!(await this.checkMarketplace())) {
        result.valid = false;
        result.missing.marketplace = true;
        result.recommendations.push(
          'Register SpecWeave marketplace in ~/.claude/settings.json'
        );

        // Auto-install marketplace if requested
        if (options.autoInstall && !options.dryRun) {
          this.log('Auto-installing marketplace...');
          const installResult = await this.installMarketplace();
          if (!installResult.success) {
            result.errors.push(
              `Failed to install marketplace: ${installResult.error}`
            );
          } else {
            result.missing.marketplace = false;
            this.log('Marketplace installed successfully');
          }
        }
      } else {
        this.log('Marketplace registered ✓');
      }

      // Step 2: Check core plugin
      this.log('Checking core plugin (specweave)...');
      const corePluginInfo = await this.checkCorePlugin();
      if (!corePluginInfo.installed) {
        result.valid = false;
        result.missing.corePlugin = true;
        result.recommendations.push(
          'Install core plugin: /plugin install specweave'
        );

        // Auto-install core plugin if requested
        if (options.autoInstall && !options.dryRun) {
          this.log('Auto-installing core plugin...');
          const installResult = await this.installPlugin('specweave');
          if (!installResult.success) {
            result.errors.push(
              `Failed to install core plugin: ${installResult.error}`
            );
          } else {
            result.missing.corePlugin = false;
            result.installed.corePlugin = true;
            this.log('Core plugin installed successfully');
          }
        }
      } else {
        result.installed.corePlugin = true;
        result.installed.corePluginVersion = corePluginInfo.version;
        this.log(`Core plugin installed ✓ (${corePluginInfo.version})`);
      }

      // Step 3: Detect context plugins (if context provided)
      if (options.context) {
        this.log('Detecting context plugins from description...');
        const requiredPlugins = this.detectRequiredPlugins(options.context);

        if (requiredPlugins.length > 0) {
          this.log(`Detected plugins: ${requiredPlugins.join(', ')}`);

          for (const plugin of requiredPlugins) {
            const pluginInfo = await this.checkPlugin(plugin);
            if (!pluginInfo.installed) {
              result.valid = false;
              result.missing.contextPlugins.push(plugin);
              result.recommendations.push(
                `Install context plugin: /plugin install ${plugin}`
              );

              // Auto-install context plugin if requested
              if (options.autoInstall && !options.dryRun) {
                this.log(`Auto-installing context plugin: ${plugin}...`);
                const installResult = await this.installPlugin(plugin);
                if (!installResult.success) {
                  result.errors.push(
                    `Failed to install ${plugin}: ${installResult.error}`
                  );
                } else {
                  result.installed.contextPlugins.push(plugin);
                  this.log(`${plugin} installed successfully`);
                }
              }
            } else {
              result.installed.contextPlugins.push(plugin);
              this.log(`${plugin} already installed ✓`);
            }
          }
        } else {
          this.log('No context plugins detected');
        }
      }

      // Cache result (if not dry-run)
      if (!options.dryRun) {
        await this.setCachedValidation(result);
      }

      return result;
    } catch (error: any) {
      result.valid = false;
      result.errors.push(`Validation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Check if SpecWeave marketplace is registered
   *
   * @returns True if marketplace is registered correctly
   */
  async checkMarketplace(): Promise<boolean> {
    try {
      const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

      // Check if settings.json exists
      if (!(await fs.pathExists(settingsPath))) {
        this.log('settings.json not found');
        return false;
      }

      // Read settings
      const settings: MarketplaceConfig = await fs.readJson(settingsPath);

      // Check if specweave marketplace is registered
      const marketplace = settings.extraKnownMarketplaces?.specweave;
      if (!marketplace) {
        this.log('SpecWeave marketplace not registered');
        return false;
      }

      // Validate marketplace structure
      if (
        marketplace.source.source === 'github' &&
        marketplace.source.repo === 'anton-abyzov/specweave' &&
        marketplace.source.path === '.claude-plugin'
      ) {
        this.log('Marketplace configuration valid');
        return true;
      }

      // Check if it's a local marketplace (dev mode)
      if (marketplace.source.source === 'local') {
        this.log('Development mode detected (local marketplace)');
        return true;
      }

      this.log('Marketplace configuration invalid');
      return false;
    } catch (error: any) {
      this.log(`Error checking marketplace: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if core plugin (specweave) is installed
   *
   * @returns Plugin installation info
   */
  async checkCorePlugin(): Promise<{
    installed: boolean;
    version?: string;
  }> {
    return this.checkPlugin('specweave');
  }

  /**
   * Check if a specific plugin is installed
   *
   * @param pluginName - Name of plugin to check
   * @returns Plugin installation info
   */
  async checkPlugin(
    pluginName: string
  ): Promise<{ installed: boolean; version?: string }> {
    try {
      // Execute: claude plugin list --installed | grep "{pluginName}"
      // Note: This assumes Claude CLI is available
      const { stdout } = await execAsync(
        `claude plugin list --installed 2>/dev/null | grep -i "${pluginName}"`
      );

      if (stdout.trim()) {
        // Parse version from output (format: "name  version  description")
        const match = stdout.match(/(\d+\.\d+\.\d+)/);
        const version = match ? match[1] : undefined;
        this.log(`Plugin ${pluginName} found (version: ${version})`);
        return { installed: true, version };
      }

      this.log(`Plugin ${pluginName} not found`);
      return { installed: false };
    } catch (error: any) {
      // grep returns exit code 1 if no matches (not an error)
      if (error.code === 1) {
        this.log(`Plugin ${pluginName} not found`);
        return { installed: false };
      }

      // Check if Claude CLI is not available
      if (error.message.includes('command not found')) {
        this.log('Claude CLI not available');
        throw new Error(
          'Claude CLI not available. Please ensure Claude Code is installed.'
        );
      }

      this.log(`Error checking plugin ${pluginName}: ${error.message}`);
      return { installed: false };
    }
  }

  /**
   * Detect required plugins based on keywords in description
   *
   * @param description - Increment description or context
   * @returns List of required plugin names
   */
  detectRequiredPlugins(description: string): string[] {
    const scores: Record<string, number> = {};
    const lowerDesc = description.toLowerCase();

    // Score each plugin based on keyword matches
    for (const [plugin, keywords] of Object.entries(PLUGIN_KEYWORDS)) {
      scores[plugin] = keywords.filter((kw) =>
        lowerDesc.includes(kw.toLowerCase())
      ).length;
    }

    // Return plugins with score >= threshold (high confidence)
    const detected = Object.entries(scores)
      .filter(([_, score]) => score >= KEYWORD_CONFIDENCE_THRESHOLD)
      .map(([plugin]) => plugin)
      .sort((a, b) => scores[b] - scores[a]); // Sort by score (highest first)

    return detected;
  }

  /**
   * Install SpecWeave marketplace
   *
   * @returns Installation result
   */
  async installMarketplace(): Promise<InstallResult> {
    try {
      const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

      // Create .claude directory if needed
      await fs.ensureDir(path.dirname(settingsPath));

      // Read existing settings or create new
      let settings: MarketplaceConfig = {};
      if (await fs.pathExists(settingsPath)) {
        settings = await fs.readJson(settingsPath);
      }

      // Add SpecWeave marketplace
      settings.extraKnownMarketplaces =
        settings.extraKnownMarketplaces || {};
      settings.extraKnownMarketplaces.specweave = SPECWEAVE_MARKETPLACE_CONFIG;

      // Write settings
      await fs.writeJson(settingsPath, settings, { spaces: 2 });

      this.log('Marketplace configuration written to settings.json');

      return {
        success: true,
        component: 'marketplace',
        details: settingsPath,
      };
    } catch (error: any) {
      return {
        success: false,
        component: 'marketplace',
        error: error.message,
      };
    }
  }

  /**
   * Install a plugin
   *
   * @param pluginName - Name of plugin to install
   * @returns Installation result
   */
  async installPlugin(pluginName: string): Promise<InstallResult> {
    try {
      // Execute: claude plugin install {pluginName}
      // Note: This requires Claude CLI to be available
      this.log(`Executing: claude plugin install ${pluginName}`);

      const { stdout, stderr } = await execAsync(
        `claude plugin install ${pluginName}`
      );

      // Check if installation succeeded
      const pluginInfo = await this.checkPlugin(pluginName);
      if (pluginInfo.installed) {
        return {
          success: true,
          component: pluginName,
          details: stdout.trim() || stderr.trim(),
        };
      }

      return {
        success: false,
        component: pluginName,
        error: 'Installation completed but plugin not detected',
        details: stdout.trim() || stderr.trim(),
      };
    } catch (error: any) {
      // Check if Claude CLI is not available
      if (error.message.includes('command not found')) {
        return {
          success: false,
          component: pluginName,
          error:
            'Claude CLI not available. Please install manually using /plugin install command.',
        };
      }

      return {
        success: false,
        component: pluginName,
        error: error.message,
      };
    }
  }

  /**
   * Get cached validation result
   *
   * @returns Cached result if valid, null otherwise
   */
  private async getCachedValidation(): Promise<ValidationResult | null> {
    try {
      if (!(await fs.pathExists(this.cacheFile))) {
        return null;
      }

      const cache: ValidationCache = await fs.readJson(this.cacheFile);
      const age = (Date.now() - cache.timestamp) / 1000; // seconds

      if (age > CACHE_TTL) {
        this.log(`Cache expired (age: ${age}s, TTL: ${CACHE_TTL}s)`);
        return null;
      }

      this.log(`Cache hit (age: ${age}s)`);
      return { ...cache.result, cache: { hit: true, age } };
    } catch (error: any) {
      this.log(`Error reading cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Set cached validation result
   *
   * @param result - Validation result to cache
   */
  private async setCachedValidation(
    result: ValidationResult
  ): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.cacheFile));

      const cache: ValidationCache = {
        timestamp: Date.now(),
        result,
      };

      await fs.writeJson(this.cacheFile, cache, { spaces: 2 });
      this.log('Validation result cached');
    } catch (error: any) {
      this.log(`Error writing cache: ${error.message}`);
      // Non-fatal error, continue
    }
  }

  /**
   * Log message if verbose mode enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[PluginValidator] ${message}`);
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate plugins (convenience function)
 *
 * @param options - Validation options
 * @returns Validation result
 */
export async function validatePlugins(
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const validator = new PluginValidator();
  return validator.validate(options);
}

/**
 * Check if SpecWeave is properly installed
 *
 * @returns True if marketplace and core plugin are installed
 */
export async function isSpecWeaveInstalled(): Promise<boolean> {
  const validator = new PluginValidator();
  const result = await validator.validate({ autoInstall: false });
  return result.valid;
}
