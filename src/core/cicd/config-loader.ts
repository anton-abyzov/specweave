/**
 * CI/CD Monitor Configuration Loader
 *
 * Loads configuration from environment variables, .env files, and
 * .specweave/config.json with validation and defaults.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { MonitorServiceConfig } from './monitor-service';
import { NotificationChannel } from './notifier';

/**
 * Configuration source priority:
 * 1. Environment variables (highest)
 * 2. .env file
 * 3. .specweave/config.json
 * 4. Defaults (lowest)
 */

/**
 * Raw configuration from files
 */
interface RawConfig {
  cicd?: {
    github?: {
      token?: string;
      owner?: string;
      repo?: string;
    };
    monitoring?: {
      pollInterval?: number;
      autoNotify?: boolean;
    };
    notifications?: {
      channels?: string[];
      webhookUrl?: string;
      logFile?: string;
    };
  };
}

/**
 * Load configuration from environment variables
 */
function loadFromEnv(): Partial<MonitorServiceConfig> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const pollInterval = process.env.CICD_POLL_INTERVAL
    ? parseInt(process.env.CICD_POLL_INTERVAL, 10)
    : undefined;
  const channels = process.env.CICD_NOTIFICATION_CHANNELS
    ? process.env.CICD_NOTIFICATION_CHANNELS.split(',').map((c) => c.trim())
    : undefined;
  const webhookUrl = process.env.CICD_WEBHOOK_URL;
  const autoNotify = process.env.CICD_AUTO_NOTIFY === 'true';

  const config: Partial<MonitorServiceConfig> = {};

  if (token || owner || repo || pollInterval) {
    config.monitor = {
      token: token || '',
      owner: owner || '',
      repo: repo || '',
      pollInterval: pollInterval || 60000
    };
  }

  if (channels || webhookUrl) {
    config.notifier = {
      channels: (channels as NotificationChannel[]) || ['console'],
      webhookUrl,
      logFile: undefined
    };
  }

  if (autoNotify !== undefined) {
    config.autoNotify = autoNotify;
  }

  return config;
}

/**
 * Load configuration from .specweave/config.json
 */
async function loadFromConfigFile(
  rootDir: string
): Promise<Partial<MonitorServiceConfig>> {
  const configPath = path.join(rootDir, '.specweave/config.json');

  if (!(await fs.pathExists(configPath))) {
    return {};
  }

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const rawConfig: RawConfig = JSON.parse(content);

    const config: Partial<MonitorServiceConfig> = {};

    if (rawConfig.cicd?.github) {
      config.monitor = {
        token: rawConfig.cicd.github.token || '',
        owner: rawConfig.cicd.github.owner || '',
        repo: rawConfig.cicd.github.repo || '',
        pollInterval: rawConfig.cicd.monitoring?.pollInterval || 60000
      };
    }

    if (rawConfig.cicd?.notifications) {
      config.notifier = {
        channels: (rawConfig.cicd.notifications.channels || ['console']) as NotificationChannel[],
        webhookUrl: rawConfig.cicd.notifications.webhookUrl,
        logFile: rawConfig.cicd.notifications.logFile
      };
    }

    if (rawConfig.cicd?.monitoring?.autoNotify !== undefined) {
      config.autoNotify = rawConfig.cicd.monitoring.autoNotify;
    }

    return config;
  } catch (error) {
    console.warn('Failed to load .specweave/config.json:', error);
    return {};
  }
}

/**
 * Get default configuration
 */
function getDefaults(): MonitorServiceConfig {
  return {
    monitor: {
      token: '',
      owner: '',
      repo: '',
      pollInterval: 60000,
      debug: false
    },
    notifier: {
      channels: ['console', 'file'],
      logFile: '.specweave/logs/cicd-notifications.log',
      webhookUrl: undefined,
      debug: false
    },
    rootDir: process.cwd(),
    autoNotify: true
  };
}

/**
 * Merge configurations with priority:
 * env > configFile > defaults
 */
function mergeConfigs(
  defaults: MonitorServiceConfig,
  configFile: Partial<MonitorServiceConfig>,
  env: Partial<MonitorServiceConfig>
): MonitorServiceConfig {
  return {
    monitor: {
      ...defaults.monitor,
      ...(configFile.monitor || {}),
      ...(env.monitor || {})
    },
    notifier: {
      ...defaults.notifier,
      ...(configFile.notifier || {}),
      ...(env.notifier || {})
    },
    rootDir: env.rootDir || configFile.rootDir || defaults.rootDir,
    autoNotify: env.autoNotify ?? configFile.autoNotify ?? defaults.autoNotify
  };
}

/**
 * Validate configuration
 */
function validateConfig(config: MonitorServiceConfig): void {
  if (!config.monitor.token) {
    throw new Error('GitHub token is required (set GITHUB_TOKEN or add to .specweave/config.json)');
  }

  if (!config.monitor.owner || !config.monitor.repo) {
    throw new Error('GitHub owner and repo are required (set GITHUB_OWNER/GITHUB_REPO or add to .specweave/config.json)');
  }

  if (config.monitor.pollInterval < 10000) {
    throw new Error('Poll interval must be at least 10 seconds (10000ms) to avoid rate limiting');
  }

  if (config.notifier.channels.length === 0) {
    throw new Error('At least one notification channel must be configured');
  }
}

/**
 * Load and validate configuration from all sources
 *
 * Priority: env > .specweave/config.json > defaults
 *
 * @param rootDir - Project root directory (optional)
 * @returns Validated configuration
 */
export async function loadConfig(
  rootDir: string = process.cwd()
): Promise<MonitorServiceConfig> {
  // Load from all sources
  const defaults = getDefaults();
  const configFile = await loadFromConfigFile(rootDir);
  const env = loadFromEnv();

  // Merge with priority
  const config = mergeConfigs(defaults, configFile, env);

  // Update rootDir
  config.rootDir = rootDir;

  // Validate
  validateConfig(config);

  return config;
}

/**
 * Create example configuration file
 */
export async function createExampleConfig(rootDir: string = process.cwd()): Promise<void> {
  const configPath = path.join(rootDir, '.specweave/config.json');

  const exampleConfig: RawConfig = {
    cicd: {
      github: {
        token: '${GITHUB_TOKEN}',
        owner: 'your-github-username',
        repo: 'your-repo-name'
      },
      monitoring: {
        pollInterval: 60000,
        autoNotify: true
      },
      notifications: {
        channels: ['console', 'file'],
        webhookUrl: 'https://your-webhook-url.com/cicd-alerts',
        logFile: '.specweave/logs/cicd-notifications.log'
      }
    }
  };

  await fs.ensureDir(path.dirname(configPath));
  await fs.writeFile(
    configPath,
    JSON.stringify(exampleConfig, null, 2),
    'utf-8'
  );

  console.log(`✅ Created example config at ${configPath}`);
  console.log('   Edit this file and set your GitHub token, owner, and repo');
}
