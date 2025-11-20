/**
 * Reflection Configuration Loader
 *
 * Loads and validates reflection configuration from .specweave/config.json
 * Merges user config with defaults, validates against schema
 *
 * @module reflection-config-loader
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { DEFAULT_REFLECTION_CONFIG, ReflectionConfig } from './types/reflection-types';

/**
 * Find .specweave directory by traversing up from current directory
 * @param startDir Starting directory (defaults to cwd)
 * @returns Path to .specweave directory or null if not found
 */
export function findSpecweaveRoot(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const specweavePath = path.join(currentDir, '.specweave');
    if (existsSync(specweavePath)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load reflection configuration from .specweave/config.json
 * Falls back to defaults if config file doesn't exist or reflection section is missing
 *
 * @param projectRoot Path to project root (optional, auto-detected if not provided)
 * @returns Merged reflection configuration
 * @throws Error if config file exists but has invalid JSON
 */
export function loadReflectionConfig(projectRoot?: string): ReflectionConfig {
  // Auto-detect project root if not provided
  const rootDir = projectRoot || findSpecweaveRoot();

  if (!rootDir) {
    // No .specweave directory found, return defaults
    return { ...DEFAULT_REFLECTION_CONFIG };
  }

  const configPath = path.join(rootDir, '.specweave', 'config.json');

  // Config file doesn't exist, return defaults
  if (!existsSync(configPath)) {
    return { ...DEFAULT_REFLECTION_CONFIG };
  }

  try {
    // Read and parse config file
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Extract reflection section (may be undefined)
    const userReflectionConfig = config.reflection || {};

    // Deep merge with defaults (user config overrides defaults)
    const mergedConfig: ReflectionConfig = {
      enabled: userReflectionConfig.enabled ?? DEFAULT_REFLECTION_CONFIG.enabled,
      mode: userReflectionConfig.mode ?? DEFAULT_REFLECTION_CONFIG.mode,
      depth: userReflectionConfig.depth ?? DEFAULT_REFLECTION_CONFIG.depth,
      model: userReflectionConfig.model ?? DEFAULT_REFLECTION_CONFIG.model,
      categories: {
        security: userReflectionConfig.categories?.security ?? DEFAULT_REFLECTION_CONFIG.categories.security,
        quality: userReflectionConfig.categories?.quality ?? DEFAULT_REFLECTION_CONFIG.categories.quality,
        testing: userReflectionConfig.categories?.testing ?? DEFAULT_REFLECTION_CONFIG.categories.testing,
        performance: userReflectionConfig.categories?.performance ?? DEFAULT_REFLECTION_CONFIG.categories.performance,
        technicalDebt: userReflectionConfig.categories?.technicalDebt ?? DEFAULT_REFLECTION_CONFIG.categories.technicalDebt,
      },
      criticalThreshold: userReflectionConfig.criticalThreshold ?? DEFAULT_REFLECTION_CONFIG.criticalThreshold,
      storeReflections: userReflectionConfig.storeReflections ?? DEFAULT_REFLECTION_CONFIG.storeReflections,
      autoCreateFollowUpTasks: userReflectionConfig.autoCreateFollowUpTasks ?? DEFAULT_REFLECTION_CONFIG.autoCreateFollowUpTasks,
      soundNotifications: userReflectionConfig.soundNotifications ?? DEFAULT_REFLECTION_CONFIG.soundNotifications,
    };

    return mergedConfig;
  } catch (error) {
    // Invalid JSON or other error
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${configPath}. ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate reflection configuration against constraints
 * Checks for logical inconsistencies (e.g., all categories disabled)
 *
 * @param config Reflection configuration to validate
 * @returns Validation result with errors array
 */
export function validateReflectionConfig(config: ReflectionConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check: If reflection enabled, at least one category must be enabled
  if (config.enabled && config.mode !== 'disabled') {
    const hasEnabledCategory = Object.values(config.categories).some(enabled => enabled);
    if (!hasEnabledCategory) {
      errors.push('At least one analysis category must be enabled when reflection is active');
    }
  }

  // Check: Mode cannot be 'auto' if reflection is disabled
  if (!config.enabled && config.mode === 'auto') {
    errors.push('Reflection mode cannot be "auto" when reflection is disabled');
  }

  // Check: Sound notifications require reflection to be enabled
  if (config.soundNotifications && !config.enabled) {
    errors.push('Sound notifications require reflection to be enabled');
  }

  // Check: Auto-create follow-up tasks requires storeReflections
  if (config.autoCreateFollowUpTasks && !config.storeReflections) {
    errors.push('Auto-create follow-up tasks requires storeReflections to be enabled');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Load and validate reflection configuration
 * Throws error if configuration is invalid
 *
 * @param projectRoot Path to project root (optional, auto-detected if not provided)
 * @returns Valid reflection configuration
 * @throws Error if configuration is invalid
 */
export function loadAndValidateReflectionConfig(projectRoot?: string): ReflectionConfig {
  const config = loadReflectionConfig(projectRoot);
  const validation = validateReflectionConfig(config);

  if (!validation.valid) {
    throw new Error(
      `Invalid reflection configuration:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`
    );
  }

  return config;
}
