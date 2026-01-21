/**
 * Sync Configuration Types
 *
 * Extended sync configuration for the Unified Sync Orchestration feature.
 * Supports job scheduling, permission enforcement, discrepancy detection,
 * and proactive notifications.
 *
 * @module core/types/sync-config
 */

/**
 * Platform types for sync operations
 */
export type SyncPlatform = 'github' | 'jira' | 'ado';

/**
 * Scheduler configuration - controls recurring background jobs
 */
export interface SyncSchedulerConfig {
  /**
   * Master switch for scheduler
   * @default false
   */
  enabled: boolean;

  /**
   * Run sync check on session start
   * @default true (when scheduler enabled)
   */
  runOnStartup: boolean;

  /**
   * Individual job configurations
   */
  jobs: {
    /**
     * External tool sync (GitHub/JIRA/ADO)
     */
    externalSync: {
      enabled: boolean;
      /** Interval in minutes between sync runs */
      intervalMinutes: number;
    };

    /**
     * Code-to-spec discrepancy detection
     */
    discrepancyCheck: {
      enabled: boolean;
      /** Interval in minutes between checks */
      intervalMinutes: number;
    };

    /**
     * Living docs synchronization
     */
    livingDocsSync: {
      enabled: boolean;
      /** Interval in minutes between syncs */
      intervalMinutes: number;
    };

    /**
     * Notification cleanup
     */
    notificationCleanup: {
      enabled: boolean;
      /** Interval in minutes between cleanups */
      intervalMinutes: number;
    };
  };
}

/**
 * Per-platform sync permissions
 */
export interface PlatformSyncPermissions {
  /**
   * Can read/pull changes from external tool
   * @default true
   */
  canRead: boolean;

  /**
   * Can update status field only
   * @default false
   */
  canUpdateStatus: boolean;

  /**
   * Can create/update (upsert) items
   * @default false
   */
  canUpsert: boolean;

  /**
   * Can delete items (dangerous!)
   * @default false
   */
  canDelete: boolean;
}

/**
 * Sync permissions configuration - per-platform permission control
 */
export interface SyncPermissionsConfig {
  /**
   * GitHub permissions
   */
  github: PlatformSyncPermissions;

  /**
   * JIRA permissions
   */
  jira: PlatformSyncPermissions;

  /**
   * Azure DevOps permissions
   */
  ado: PlatformSyncPermissions;
}

/**
 * Discrepancy detection configuration
 */
export interface SyncDiscrepancyConfig {
  /**
   * Enable discrepancy detection
   * @default false
   */
  enabled: boolean;

  /**
   * Automatically update trivial changes (typos, formatting)
   * @default false
   */
  autoUpdateTrivial: boolean;

  /**
   * Severity levels that require manual review
   * @default ['major', 'breaking']
   */
  requireReviewFor: Array<'trivial' | 'minor' | 'major' | 'breaking'>;

  /**
   * Types of checks to run
   * @default ['api-routes', 'types', 'functions']
   */
  checkTypes: Array<'api-routes' | 'types' | 'functions' | 'config'>;

  /**
   * Glob patterns for paths to ignore
   * @default ['node_modules/**', 'dist/**', '*.test.ts']
   */
  ignorePaths: string[];
}

/**
 * Notification type
 */
export type NotificationType =
  | 'import-complete'
  | 'discrepancy'
  | 'sync-failure'
  | 'drift'
  | 'job-complete';

/**
 * Notification preferences configuration
 */
export interface SyncNotificationsConfig {
  /**
   * Enable notification system
   * @default true
   */
  enabled: boolean;

  /**
   * Commands that trigger notification display
   * @default ['next', 'progress', 'status', 'done']
   */
  showOnCommands: string[];

  /**
   * Per-type notification settings
   */
  types: {
    importComplete: boolean;
    discrepancy: boolean;
    syncFailure: boolean;
    drift: boolean;
    jobComplete: boolean;
  };
}

/**
 * Logging verbosity levels
 */
export type SyncLoggingVerbosity = 'minimal' | 'normal' | 'verbose';

/**
 * Sync logging configuration
 */
export interface SyncLoggingConfig {
  /**
   * Logging verbosity level
   * @default 'normal'
   */
  verbosity: SyncLoggingVerbosity;

  /**
   * Days to retain logs before cleanup
   * @default 30
   */
  retentionDays: number;
}

/**
 * Complete sync configuration
 *
 * This is the root configuration under `config.json -> sync.orchestration`
 */
export interface SyncOrchestrationConfig {
  /**
   * Scheduler settings for recurring jobs
   */
  scheduler: SyncSchedulerConfig;

  /**
   * Per-platform permissions
   */
  permissions: SyncPermissionsConfig;

  /**
   * Discrepancy detection settings
   */
  discrepancy: SyncDiscrepancyConfig;

  /**
   * Notification preferences
   */
  notifications: SyncNotificationsConfig;

  /**
   * Logging settings
   */
  logging: SyncLoggingConfig;
}

/**
 * Default platform permissions (safe defaults - read-only)
 */
export const DEFAULT_PLATFORM_PERMISSIONS: PlatformSyncPermissions = {
  canRead: true,
  canUpdateStatus: false,
  canUpsert: false,
  canDelete: false,
};

/**
 * Default scheduler configuration (disabled by default)
 */
export const DEFAULT_SCHEDULER_CONFIG: SyncSchedulerConfig = {
  enabled: false,
  runOnStartup: true,
  jobs: {
    externalSync: {
      enabled: true,
      intervalMinutes: 15,
    },
    discrepancyCheck: {
      enabled: false,
      intervalMinutes: 60,
    },
    livingDocsSync: {
      enabled: false,
      intervalMinutes: 30,
    },
    notificationCleanup: {
      enabled: true,
      intervalMinutes: 1440, // Once per day
    },
  },
};

/**
 * Default permissions configuration (all platforms read-only)
 */
export const DEFAULT_PERMISSIONS_CONFIG: SyncPermissionsConfig = {
  github: { ...DEFAULT_PLATFORM_PERMISSIONS },
  jira: { ...DEFAULT_PLATFORM_PERMISSIONS },
  ado: { ...DEFAULT_PLATFORM_PERMISSIONS },
};

/**
 * Default discrepancy configuration (disabled)
 */
export const DEFAULT_DISCREPANCY_CONFIG: SyncDiscrepancyConfig = {
  enabled: false,
  autoUpdateTrivial: false,
  requireReviewFor: ['major', 'breaking'],
  checkTypes: ['api-routes', 'types', 'functions'],
  ignorePaths: ['node_modules/**', 'dist/**', '*.test.ts', '*.spec.ts'],
};

/**
 * Default notifications configuration (enabled)
 */
export const DEFAULT_NOTIFICATIONS_CONFIG: SyncNotificationsConfig = {
  enabled: true,
  showOnCommands: ['next', 'progress', 'status', 'done'],
  types: {
    importComplete: true,
    discrepancy: true,
    syncFailure: true,
    drift: true,
    jobComplete: false, // Too noisy by default
  },
};

/**
 * Default logging configuration
 */
export const DEFAULT_LOGGING_CONFIG: SyncLoggingConfig = {
  verbosity: 'normal',
  retentionDays: 30,
};

/**
 * Get default sync orchestration configuration
 *
 * All scheduler features disabled by default for safety.
 * Notifications enabled for user awareness.
 */
export function getDefaultSyncOrchestrationConfig(): SyncOrchestrationConfig {
  return {
    scheduler: { ...DEFAULT_SCHEDULER_CONFIG },
    permissions: {
      github: { ...DEFAULT_PLATFORM_PERMISSIONS },
      jira: { ...DEFAULT_PLATFORM_PERMISSIONS },
      ado: { ...DEFAULT_PLATFORM_PERMISSIONS },
    },
    discrepancy: { ...DEFAULT_DISCREPANCY_CONFIG },
    notifications: { ...DEFAULT_NOTIFICATIONS_CONFIG },
    logging: { ...DEFAULT_LOGGING_CONFIG },
  };
}

/**
 * Validation error for sync config
 */
export interface SyncConfigValidationError {
  path: string;
  message: string;
  value?: unknown;
}

/**
 * Validate scheduler configuration
 */
function validateSchedulerConfig(
  config: Partial<SyncSchedulerConfig>,
  errors: SyncConfigValidationError[]
): void {
  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push({ path: 'scheduler.enabled', message: 'Must be a boolean', value: config.enabled });
  }

  if (!config.jobs) return;

  const jobTypes = ['externalSync', 'discrepancyCheck', 'livingDocsSync', 'notificationCleanup'] as const;
  for (const jobType of jobTypes) {
    const job = (config.jobs as Record<string, { intervalMinutes?: number }>)[jobType];
    if (job?.intervalMinutes !== undefined && (typeof job.intervalMinutes !== 'number' || job.intervalMinutes < 1)) {
      errors.push({
        path: `scheduler.jobs.${jobType}.intervalMinutes`,
        message: 'Must be a positive number (minutes)',
        value: job.intervalMinutes,
      });
    }
  }
}

/**
 * Validate permissions configuration
 */
function validatePermissionsConfig(
  config: Partial<SyncPermissionsConfig>,
  errors: SyncConfigValidationError[]
): void {
  const platforms: SyncPlatform[] = ['github', 'jira', 'ado'];
  const permissionFields = ['canRead', 'canUpdateStatus', 'canUpsert', 'canDelete'];

  for (const platform of platforms) {
    const platformConfig = config[platform];
    if (!platformConfig) continue;

    for (const field of permissionFields) {
      const value = (platformConfig as unknown as Record<string, unknown>)[field];
      if (value !== undefined && typeof value !== 'boolean') {
        errors.push({ path: `permissions.${platform}.${field}`, message: 'Must be a boolean', value });
      }
    }
  }
}

/**
 * Validate discrepancy configuration
 */
function validateDiscrepancyConfig(
  config: Partial<SyncDiscrepancyConfig>,
  errors: SyncConfigValidationError[]
): void {
  const validSeverities = ['trivial', 'minor', 'major', 'breaking'];
  const validCheckTypes = ['api-routes', 'types', 'functions', 'config'];

  const invalidSeverities = config.requireReviewFor?.filter((s) => !validSeverities.includes(s)) ?? [];
  for (const severity of invalidSeverities) {
    errors.push({
      path: 'discrepancy.requireReviewFor',
      message: `Invalid severity: ${severity}. Valid: ${validSeverities.join(', ')}`,
      value: severity,
    });
  }

  const invalidCheckTypes = config.checkTypes?.filter((t) => !validCheckTypes.includes(t)) ?? [];
  for (const checkType of invalidCheckTypes) {
    errors.push({
      path: 'discrepancy.checkTypes',
      message: `Invalid check type: ${checkType}. Valid: ${validCheckTypes.join(', ')}`,
      value: checkType,
    });
  }
}

/**
 * Validate notifications configuration
 */
function validateNotificationsConfig(
  config: Partial<SyncNotificationsConfig>,
  errors: SyncConfigValidationError[]
): void {
  if (config.showOnCommands && !Array.isArray(config.showOnCommands)) {
    errors.push({
      path: 'notifications.showOnCommands',
      message: 'Must be an array of command names',
      value: config.showOnCommands,
    });
  }
}

/**
 * Validate logging configuration
 */
function validateLoggingConfig(
  config: Partial<SyncLoggingConfig>,
  errors: SyncConfigValidationError[]
): void {
  const validVerbosities = ['minimal', 'normal', 'verbose'];

  if (config.verbosity && !validVerbosities.includes(config.verbosity)) {
    errors.push({
      path: 'logging.verbosity',
      message: `Invalid verbosity: ${config.verbosity}. Valid: ${validVerbosities.join(', ')}`,
      value: config.verbosity,
    });
  }

  if (config.retentionDays !== undefined) {
    if (typeof config.retentionDays !== 'number' || config.retentionDays < 1) {
      errors.push({
        path: 'logging.retentionDays',
        message: 'Must be a positive number (days)',
        value: config.retentionDays,
      });
    }
  }
}

/**
 * Validate sync orchestration configuration
 *
 * @param config - Partial configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateSyncOrchestrationConfig(
  config: Partial<SyncOrchestrationConfig>
): SyncConfigValidationError[] {
  const errors: SyncConfigValidationError[] = [];

  if (config.scheduler) {
    validateSchedulerConfig(config.scheduler, errors);
  }

  if (config.permissions) {
    validatePermissionsConfig(config.permissions, errors);
  }

  if (config.discrepancy) {
    validateDiscrepancyConfig(config.discrepancy, errors);
  }

  if (config.notifications) {
    validateNotificationsConfig(config.notifications, errors);
  }

  if (config.logging) {
    validateLoggingConfig(config.logging, errors);
  }

  return errors;
}

/**
 * Deep merge sync orchestration configs
 *
 * @param base - Base configuration
 * @param override - Override configuration (partial)
 * @returns Merged configuration
 */
export function mergeSyncOrchestrationConfig(
  base: SyncOrchestrationConfig,
  override: Partial<SyncOrchestrationConfig>
): SyncOrchestrationConfig {
  return {
    scheduler: {
      ...base.scheduler,
      ...override.scheduler,
      jobs: {
        ...base.scheduler.jobs,
        ...override.scheduler?.jobs,
        externalSync: {
          ...base.scheduler.jobs.externalSync,
          ...override.scheduler?.jobs?.externalSync,
        },
        discrepancyCheck: {
          ...base.scheduler.jobs.discrepancyCheck,
          ...override.scheduler?.jobs?.discrepancyCheck,
        },
        livingDocsSync: {
          ...base.scheduler.jobs.livingDocsSync,
          ...override.scheduler?.jobs?.livingDocsSync,
        },
        notificationCleanup: {
          ...base.scheduler.jobs.notificationCleanup,
          ...override.scheduler?.jobs?.notificationCleanup,
        },
      },
    },
    permissions: {
      github: {
        ...base.permissions.github,
        ...override.permissions?.github,
      },
      jira: {
        ...base.permissions.jira,
        ...override.permissions?.jira,
      },
      ado: {
        ...base.permissions.ado,
        ...override.permissions?.ado,
      },
    },
    discrepancy: {
      ...base.discrepancy,
      ...override.discrepancy,
    },
    notifications: {
      ...base.notifications,
      ...override.notifications,
      types: {
        ...base.notifications.types,
        ...override.notifications?.types,
      },
    },
    logging: {
      ...base.logging,
      ...override.logging,
    },
  };
}
