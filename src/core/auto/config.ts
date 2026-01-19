/**
 * Auto Configuration Loader
 * Loads auto settings from .specweave/config.json with sensible defaults
 */

import * as fs from 'fs';
import * as path from 'path';
import { AutoConfig, DEFAULT_AUTO_CONFIG, DEFAULT_PARALLEL_AUTO_CONFIG, isAgentDomain, type AgentDomain } from './types.js';
import { consoleLogger as logger } from '../../utils/logger.js';

const CONFIG_PATH = '.specweave/config.json';

export interface ConfigLoadResult {
  config: AutoConfig;
  source: 'file' | 'defaults' | 'merged';
  warnings: string[];
}

/**
 * Load auto configuration from project config file
 */
export function loadAutoConfig(projectRoot: string): ConfigLoadResult {
  const configPath = path.join(projectRoot, CONFIG_PATH);
  const warnings: string[] = [];

  // Check if config file exists
  if (!fs.existsSync(configPath)) {
    logger.debug('No config file found, using defaults');
    return {
      config: { ...DEFAULT_AUTO_CONFIG },
      source: 'defaults',
      warnings: [],
    };
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const fullConfig = JSON.parse(configContent);

    // Check if auto section exists
    if (!fullConfig.auto) {
      logger.debug('No auto config section, using defaults');
      return {
        config: { ...DEFAULT_AUTO_CONFIG },
        source: 'defaults',
        warnings: [],
      };
    }

    // Merge with defaults
    const autoConfig = fullConfig.auto;
    const mergedConfig = mergeConfig(autoConfig, warnings);

    return {
      config: mergedConfig,
      source: 'merged',
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load auto config: ${message}`);
  }
}

/**
 * Clamp a number within a range, returning undefined if out of bounds (for warning)
 */
function clampWithWarning(
  value: number,
  min: number,
  max: number,
  fieldName: string,
  warnings: string[]
): number | undefined {
  if (value < min) {
    warnings.push(`${fieldName} must be >= ${min}, using default`);
    return undefined;
  }
  if (value > max) {
    warnings.push(`${fieldName} exceeds ${max}, capping at ${max}`);
    return max;
  }
  return value;
}

/**
 * Merge user config with defaults, validating values
 */
function mergeConfig(userConfig: Partial<AutoConfig>, warnings: string[]): AutoConfig {
  // Deep clone to avoid mutating the default config
  const config: AutoConfig = {
    ...DEFAULT_AUTO_CONFIG,
    humanGated: DEFAULT_AUTO_CONFIG.humanGated ? {
      ...DEFAULT_AUTO_CONFIG.humanGated,
      patterns: [...DEFAULT_AUTO_CONFIG.humanGated.patterns],
      neverAutoApprove: [...DEFAULT_AUTO_CONFIG.humanGated.neverAutoApprove],
    } : undefined,
    circuitBreakers: DEFAULT_AUTO_CONFIG.circuitBreakers ? { ...DEFAULT_AUTO_CONFIG.circuitBreakers } : undefined,
    sync: DEFAULT_AUTO_CONFIG.sync ? { ...DEFAULT_AUTO_CONFIG.sync } : undefined,
    parallel: DEFAULT_AUTO_CONFIG.parallel ? {
      ...DEFAULT_AUTO_CONFIG.parallel,
      defaultDomains: DEFAULT_AUTO_CONFIG.parallel.defaultDomains ? [...DEFAULT_AUTO_CONFIG.parallel.defaultDomains] : [],
    } : undefined,
  };

  // Boolean fields - direct assignment if valid type
  if (typeof userConfig.enabled === 'boolean') config.enabled = userConfig.enabled;
  if (typeof userConfig.enforceTestFirst === 'boolean') config.enforceTestFirst = userConfig.enforceTestFirst;
  if (typeof userConfig.warnOnParallelSession === 'boolean') config.warnOnParallelSession = userConfig.warnOnParallelSession;
  if (typeof userConfig.requireTests === 'boolean') config.requireTests = userConfig.requireTests;
  if (typeof userConfig.requireValidation === 'boolean') config.requireValidation = userConfig.requireValidation;
  if (typeof userConfig.requireJudgeLLM === 'boolean') config.requireJudgeLLM = userConfig.requireJudgeLLM;

  // Numeric fields with validation
  if (typeof userConfig.maxIterations === 'number') {
    const clamped = clampWithWarning(userConfig.maxIterations, 1, 5000, 'maxIterations', warnings);
    if (clamped !== undefined) config.maxIterations = clamped;
  }

  if (typeof userConfig.maxRetries === 'number') {
    const clamped = clampWithWarning(userConfig.maxRetries, 5, 100, 'maxRetries', warnings);
    if (clamped !== undefined) config.maxRetries = clamped;
  }

  if (typeof userConfig.maxHours === 'number') {
    const clamped = clampWithWarning(userConfig.maxHours, 0.5, 720, 'maxHours', warnings);
    if (clamped !== undefined) config.maxHours = clamped;
  }

  if (typeof userConfig.coverageThreshold === 'number') {
    if (userConfig.coverageThreshold < 0 || userConfig.coverageThreshold > 100) {
      warnings.push('coverageThreshold must be 0-100, using default (80)');
    } else {
      config.coverageThreshold = userConfig.coverageThreshold;
    }
  }

  // String fields
  if (typeof userConfig.testCommand === 'string' && userConfig.testCommand.trim()) {
    config.testCommand = userConfig.testCommand.trim();
  }

  // Human gated config
  const hg = userConfig.humanGated;
  if (hg && typeof hg === 'object' && config.humanGated) {
    if (Array.isArray(hg.patterns)) {
      config.humanGated.patterns = hg.patterns.filter((p): p is string => typeof p === 'string');
    }
    if (typeof hg.timeout === 'number' && hg.timeout >= 60) {
      config.humanGated.timeout = Math.min(hg.timeout, 7200);
    }
    if (Array.isArray(hg.neverAutoApprove)) {
      config.humanGated.neverAutoApprove = hg.neverAutoApprove.filter((p): p is string => typeof p === 'string');
    }
  }

  // Circuit breaker config
  const cb = userConfig.circuitBreakers;
  if (cb && typeof cb === 'object' && config.circuitBreakers) {
    if (typeof cb.failureThreshold === 'number' && cb.failureThreshold >= 1) {
      config.circuitBreakers.failureThreshold = Math.min(cb.failureThreshold, 10);
    }
    if (typeof cb.resetTimeout === 'number' && cb.resetTimeout >= 60) {
      config.circuitBreakers.resetTimeout = Math.min(cb.resetTimeout, 3600);
    }
  }

  // Sync config
  const sync = userConfig.sync;
  if (sync && typeof sync === 'object' && config.sync) {
    if (typeof sync.batchInterval === 'number' && sync.batchInterval >= 60) {
      config.sync.batchInterval = Math.min(sync.batchInterval, 1800);
    }
    if (typeof sync.forceOnComplete === 'boolean') {
      config.sync.forceOnComplete = sync.forceOnComplete;
    }
  }

  // Parallel config (NEW)
  const parallel = userConfig.parallel;
  if (parallel && typeof parallel === 'object') {
    // Initialize parallel config if not present
    if (!config.parallel) {
      config.parallel = { ...DEFAULT_PARALLEL_AUTO_CONFIG };
    }

    // Boolean fields
    if (typeof parallel.enabled === 'boolean') {
      config.parallel.enabled = parallel.enabled;
    }
    if (typeof parallel.createPR === 'boolean') {
      config.parallel.createPR = parallel.createPR;
    }
    if (typeof parallel.draftPR === 'boolean') {
      config.parallel.draftPR = parallel.draftPR;
    }

    // Numeric fields with validation
    if (typeof parallel.maxParallel === 'number') {
      const clamped = clampWithWarning(parallel.maxParallel, 1, 10, 'parallel.maxParallel', warnings);
      if (clamped !== undefined) config.parallel.maxParallel = clamped;
    }

    // String fields
    if (typeof parallel.defaultBaseBranch === 'string' && parallel.defaultBaseBranch.trim()) {
      config.parallel.defaultBaseBranch = parallel.defaultBaseBranch.trim();
    }

    // Enum fields
    if (parallel.defaultMergeStrategy && ['auto', 'manual', 'pr'].includes(parallel.defaultMergeStrategy)) {
      config.parallel.defaultMergeStrategy = parallel.defaultMergeStrategy as 'auto' | 'manual' | 'pr';
    }

    // Domain array
    if (Array.isArray(parallel.defaultDomains)) {
      const validDomains = parallel.defaultDomains.filter((d): d is AgentDomain => isAgentDomain(d));
      if (validDomains.length > 0) {
        config.parallel.defaultDomains = validDomains;
      } else if (parallel.defaultDomains.length > 0) {
        warnings.push('parallel.defaultDomains contains invalid domains, using default');
      }
    }
  }

  return config;
}

/**
 * Save auto configuration to project config file
 */
export function saveAutoConfig(
  projectRoot: string,
  autoConfig: Partial<AutoConfig>
): void {
  const configPath = path.join(projectRoot, CONFIG_PATH);
  let fullConfig: Record<string, unknown> = {};

  // Load existing config if present
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      fullConfig = JSON.parse(content);
    } catch {
      logger.warn('Failed to parse existing config, creating new');
    }
  }

  // Merge auto config
  fullConfig.auto = {
    ...(fullConfig.auto as object || {}),
    ...autoConfig,
  };

  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Write config
  fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2), 'utf-8');
  logger.info('Saved auto configuration');
}

/**
 * Check if auto is enabled in config
 */
export function isAutoEnabled(projectRoot: string): boolean {
  try {
    const { config } = loadAutoConfig(projectRoot);
    return config.enabled;
  } catch {
    return DEFAULT_AUTO_CONFIG.enabled;
  }
}

/**
 * Get effective mode based on config and flags
 */
export function getEffectiveMode(
  projectRoot: string,
  flags: { auto?: boolean; manual?: boolean; simple?: boolean }
): { mode: 'auto' | 'manual'; simple: boolean } {
  const { config } = loadAutoConfig(projectRoot);

  // Flags override config
  if (flags.manual) {
    return { mode: 'manual', simple: false };
  }

  if (flags.auto) {
    return { mode: 'auto', simple: flags.simple ?? false };
  }

  // Use config default
  return {
    mode: config.enabled ? 'auto' : 'manual',
    simple: flags.simple ?? false,
  };
}
