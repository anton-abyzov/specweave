/**
 * Sync Configuration Types Tests
 *
 * Tests for sync orchestration configuration schema,
 * validation, defaults, and merging.
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultSyncOrchestrationConfig,
  validateSyncOrchestrationConfig,
  mergeSyncOrchestrationConfig,
  DEFAULT_PLATFORM_PERMISSIONS,
  DEFAULT_SCHEDULER_CONFIG,
  DEFAULT_PERMISSIONS_CONFIG,
  DEFAULT_DISCREPANCY_CONFIG,
  DEFAULT_NOTIFICATIONS_CONFIG,
  DEFAULT_LOGGING_CONFIG,
  SyncOrchestrationConfig,
  SyncSchedulerConfig,
  SyncPermissionsConfig,
  SyncDiscrepancyConfig,
  SyncNotificationsConfig,
  SyncLoggingConfig,
} from '../../../../src/core/types/sync-config.js';

describe('Sync Configuration Types', () => {
  describe('getDefaultSyncOrchestrationConfig', () => {
    it('should return a complete default configuration', () => {
      const config = getDefaultSyncOrchestrationConfig();

      expect(config).toHaveProperty('scheduler');
      expect(config).toHaveProperty('permissions');
      expect(config).toHaveProperty('discrepancy');
      expect(config).toHaveProperty('notifications');
      expect(config).toHaveProperty('logging');
    });

    it('should have scheduler disabled by default', () => {
      const config = getDefaultSyncOrchestrationConfig();

      expect(config.scheduler.enabled).toBe(false);
      expect(config.scheduler.runOnStartup).toBe(true);
    });

    it('should have safe permission defaults (read-only)', () => {
      const config = getDefaultSyncOrchestrationConfig();

      expect(config.permissions.github.canRead).toBe(true);
      expect(config.permissions.github.canUpdateStatus).toBe(false);
      expect(config.permissions.github.canUpsert).toBe(false);
      expect(config.permissions.github.canDelete).toBe(false);

      expect(config.permissions.jira.canRead).toBe(true);
      expect(config.permissions.jira.canUpsert).toBe(false);

      expect(config.permissions.ado.canRead).toBe(true);
      expect(config.permissions.ado.canUpsert).toBe(false);
    });

    it('should have discrepancy detection disabled by default', () => {
      const config = getDefaultSyncOrchestrationConfig();

      expect(config.discrepancy.enabled).toBe(false);
      expect(config.discrepancy.autoUpdateTrivial).toBe(false);
      expect(config.discrepancy.requireReviewFor).toContain('major');
      expect(config.discrepancy.requireReviewFor).toContain('breaking');
    });

    it('should have notifications enabled by default', () => {
      const config = getDefaultSyncOrchestrationConfig();

      expect(config.notifications.enabled).toBe(true);
      expect(config.notifications.showOnCommands).toContain('next');
      expect(config.notifications.showOnCommands).toContain('progress');
      expect(config.notifications.types.importComplete).toBe(true);
      expect(config.notifications.types.syncFailure).toBe(true);
    });

    it('should have sensible logging defaults', () => {
      const config = getDefaultSyncOrchestrationConfig();

      expect(config.logging.verbosity).toBe('normal');
      expect(config.logging.retentionDays).toBe(30);
    });

    it('should return a new object each time (no shared state)', () => {
      const config1 = getDefaultSyncOrchestrationConfig();
      const config2 = getDefaultSyncOrchestrationConfig();

      config1.scheduler.enabled = true;

      expect(config2.scheduler.enabled).toBe(false);
    });
  });

  describe('DEFAULT_SCHEDULER_CONFIG', () => {
    it('should have correct job interval defaults', () => {
      expect(DEFAULT_SCHEDULER_CONFIG.jobs.externalSync.intervalMinutes).toBe(15);
      expect(DEFAULT_SCHEDULER_CONFIG.jobs.discrepancyCheck.intervalMinutes).toBe(60);
      expect(DEFAULT_SCHEDULER_CONFIG.jobs.livingDocsSync.intervalMinutes).toBe(30);
      expect(DEFAULT_SCHEDULER_CONFIG.jobs.notificationCleanup.intervalMinutes).toBe(1440);
    });

    it('should have external sync enabled by default when scheduler is on', () => {
      expect(DEFAULT_SCHEDULER_CONFIG.jobs.externalSync.enabled).toBe(true);
    });

    it('should have discrepancy check disabled by default', () => {
      expect(DEFAULT_SCHEDULER_CONFIG.jobs.discrepancyCheck.enabled).toBe(false);
    });
  });

  describe('DEFAULT_PLATFORM_PERMISSIONS', () => {
    it('should allow read by default', () => {
      expect(DEFAULT_PLATFORM_PERMISSIONS.canRead).toBe(true);
    });

    it('should deny all write operations by default', () => {
      expect(DEFAULT_PLATFORM_PERMISSIONS.canUpdateStatus).toBe(false);
      expect(DEFAULT_PLATFORM_PERMISSIONS.canUpsert).toBe(false);
      expect(DEFAULT_PLATFORM_PERMISSIONS.canDelete).toBe(false);
    });
  });

  describe('validateSyncOrchestrationConfig', () => {
    it('should return no errors for valid config', () => {
      const config = getDefaultSyncOrchestrationConfig();
      const errors = validateSyncOrchestrationConfig(config);

      expect(errors).toHaveLength(0);
    });

    it('should return no errors for empty partial config', () => {
      const errors = validateSyncOrchestrationConfig({});

      expect(errors).toHaveLength(0);
    });

    describe('scheduler validation', () => {
      it('should reject non-boolean enabled', () => {
        const errors = validateSyncOrchestrationConfig({
          scheduler: { enabled: 'yes' as unknown as boolean } as SyncSchedulerConfig,
        });

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].path).toBe('scheduler.enabled');
        expect(errors[0].message).toContain('boolean');
      });

      it('should reject negative intervalMinutes', () => {
        const errors = validateSyncOrchestrationConfig({
          scheduler: {
            enabled: true,
            runOnStartup: true,
            jobs: {
              externalSync: { enabled: true, intervalMinutes: -1 },
              discrepancyCheck: { enabled: false, intervalMinutes: 60 },
              livingDocsSync: { enabled: false, intervalMinutes: 30 },
              notificationCleanup: { enabled: true, intervalMinutes: 1440 },
            },
          },
        });

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].path).toContain('intervalMinutes');
        expect(errors[0].message).toContain('positive');
      });

      it('should reject zero intervalMinutes', () => {
        const errors = validateSyncOrchestrationConfig({
          scheduler: {
            enabled: true,
            runOnStartup: true,
            jobs: {
              externalSync: { enabled: true, intervalMinutes: 0 },
              discrepancyCheck: { enabled: false, intervalMinutes: 60 },
              livingDocsSync: { enabled: false, intervalMinutes: 30 },
              notificationCleanup: { enabled: true, intervalMinutes: 1440 },
            },
          },
        });

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should accept valid intervalMinutes', () => {
        const errors = validateSyncOrchestrationConfig({
          scheduler: {
            enabled: true,
            runOnStartup: true,
            jobs: {
              externalSync: { enabled: true, intervalMinutes: 15 },
              discrepancyCheck: { enabled: true, intervalMinutes: 60 },
              livingDocsSync: { enabled: true, intervalMinutes: 30 },
              notificationCleanup: { enabled: true, intervalMinutes: 1440 },
            },
          },
        });

        expect(errors).toHaveLength(0);
      });
    });

    describe('permissions validation', () => {
      it('should reject non-boolean permission values', () => {
        const errors = validateSyncOrchestrationConfig({
          permissions: {
            github: { canRead: 'true' as unknown as boolean } as any,
            jira: { ...DEFAULT_PLATFORM_PERMISSIONS },
            ado: { ...DEFAULT_PLATFORM_PERMISSIONS },
          },
        });

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].path).toContain('permissions.github');
      });

      it('should accept valid permission config', () => {
        const errors = validateSyncOrchestrationConfig({
          permissions: {
            github: { canRead: true, canUpdateStatus: true, canUpsert: false, canDelete: false },
            jira: { canRead: true, canUpdateStatus: false, canUpsert: true, canDelete: false },
            ado: { canRead: true, canUpdateStatus: true, canUpsert: true, canDelete: false },
          },
        });

        expect(errors).toHaveLength(0);
      });
    });

    describe('discrepancy validation', () => {
      it('should reject invalid severity values', () => {
        const errors = validateSyncOrchestrationConfig({
          discrepancy: {
            enabled: true,
            autoUpdateTrivial: false,
            requireReviewFor: ['major', 'invalid-severity' as any],
            checkTypes: ['api-routes'],
            ignorePaths: [],
          },
        });

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].path).toBe('discrepancy.requireReviewFor');
        expect(errors[0].message).toContain('Invalid severity');
      });

      it('should reject invalid check types', () => {
        const errors = validateSyncOrchestrationConfig({
          discrepancy: {
            enabled: true,
            autoUpdateTrivial: false,
            requireReviewFor: ['major'],
            checkTypes: ['api-routes', 'invalid-type' as any],
            ignorePaths: [],
          },
        });

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].path).toBe('discrepancy.checkTypes');
        expect(errors[0].message).toContain('Invalid check type');
      });

      it('should accept valid discrepancy config', () => {
        const errors = validateSyncOrchestrationConfig({
          discrepancy: {
            enabled: true,
            autoUpdateTrivial: true,
            requireReviewFor: ['trivial', 'minor', 'major', 'breaking'],
            checkTypes: ['api-routes', 'types', 'functions', 'config'],
            ignorePaths: ['node_modules/**', 'dist/**'],
          },
        });

        expect(errors).toHaveLength(0);
      });
    });

    describe('notifications validation', () => {
      it('should reject non-array showOnCommands', () => {
        const errors = validateSyncOrchestrationConfig({
          notifications: {
            enabled: true,
            showOnCommands: 'next' as unknown as string[],
            types: {
              importComplete: true,
              discrepancy: true,
              syncFailure: true,
              drift: true,
              jobComplete: false,
            },
          },
        });

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].path).toBe('notifications.showOnCommands');
      });

      it('should accept valid notifications config', () => {
        const errors = validateSyncOrchestrationConfig({
          notifications: {
            enabled: true,
            showOnCommands: ['next', 'progress', 'custom-command'],
            types: {
              importComplete: true,
              discrepancy: false,
              syncFailure: true,
              drift: false,
              jobComplete: true,
            },
          },
        });

        expect(errors).toHaveLength(0);
      });
    });

    describe('logging validation', () => {
      it('should reject invalid verbosity', () => {
        const errors = validateSyncOrchestrationConfig({
          logging: {
            verbosity: 'debug' as any,
            retentionDays: 30,
          },
        });

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].path).toBe('logging.verbosity');
        expect(errors[0].message).toContain('Invalid verbosity');
      });

      it('should reject negative retentionDays', () => {
        const errors = validateSyncOrchestrationConfig({
          logging: {
            verbosity: 'normal',
            retentionDays: -1,
          },
        });

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].path).toBe('logging.retentionDays');
        expect(errors[0].message).toContain('positive');
      });

      it('should reject zero retentionDays', () => {
        const errors = validateSyncOrchestrationConfig({
          logging: {
            verbosity: 'normal',
            retentionDays: 0,
          },
        });

        expect(errors.length).toBeGreaterThan(0);
      });

      it('should accept valid logging config', () => {
        const errors = validateSyncOrchestrationConfig({
          logging: {
            verbosity: 'verbose',
            retentionDays: 90,
          },
        });

        expect(errors).toHaveLength(0);
      });
    });

    describe('multiple errors', () => {
      it('should collect all validation errors', () => {
        const errors = validateSyncOrchestrationConfig({
          scheduler: {
            enabled: 'yes' as unknown as boolean,
            runOnStartup: true,
            jobs: {
              externalSync: { enabled: true, intervalMinutes: -5 },
              discrepancyCheck: { enabled: false, intervalMinutes: 60 },
              livingDocsSync: { enabled: false, intervalMinutes: 30 },
              notificationCleanup: { enabled: true, intervalMinutes: 1440 },
            },
          },
          logging: {
            verbosity: 'debug' as any,
            retentionDays: -1,
          },
        });

        expect(errors.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('mergeSyncOrchestrationConfig', () => {
    it('should merge empty override with base', () => {
      const base = getDefaultSyncOrchestrationConfig();
      const merged = mergeSyncOrchestrationConfig(base, {});

      expect(merged).toEqual(base);
    });

    it('should override top-level scheduler settings', () => {
      const base = getDefaultSyncOrchestrationConfig();
      const merged = mergeSyncOrchestrationConfig(base, {
        scheduler: {
          enabled: true,
          runOnStartup: false,
          jobs: base.scheduler.jobs,
        },
      });

      expect(merged.scheduler.enabled).toBe(true);
      expect(merged.scheduler.runOnStartup).toBe(false);
    });

    it('should deep merge job settings', () => {
      const base = getDefaultSyncOrchestrationConfig();
      const merged = mergeSyncOrchestrationConfig(base, {
        scheduler: {
          ...base.scheduler,
          jobs: {
            ...base.scheduler.jobs,
            externalSync: {
              enabled: false,
              intervalMinutes: 30,
            },
          },
        },
      });

      expect(merged.scheduler.jobs.externalSync.enabled).toBe(false);
      expect(merged.scheduler.jobs.externalSync.intervalMinutes).toBe(30);
      // Other jobs should remain unchanged
      expect(merged.scheduler.jobs.discrepancyCheck.intervalMinutes).toBe(60);
    });

    it('should deep merge platform permissions', () => {
      const base = getDefaultSyncOrchestrationConfig();
      const merged = mergeSyncOrchestrationConfig(base, {
        permissions: {
          github: {
            canRead: true,
            canUpdateStatus: true,
            canUpsert: true,
            canDelete: false,
          },
        },
      });

      expect(merged.permissions.github.canUpdateStatus).toBe(true);
      expect(merged.permissions.github.canUpsert).toBe(true);
      // Other platforms should remain unchanged
      expect(merged.permissions.jira.canUpsert).toBe(false);
      expect(merged.permissions.ado.canUpsert).toBe(false);
    });

    it('should deep merge notification types', () => {
      const base = getDefaultSyncOrchestrationConfig();
      const merged = mergeSyncOrchestrationConfig(base, {
        notifications: {
          ...base.notifications,
          types: {
            ...base.notifications.types,
            jobComplete: true,
          },
        },
      });

      expect(merged.notifications.types.jobComplete).toBe(true);
      expect(merged.notifications.types.importComplete).toBe(true);
    });

    it('should override discrepancy arrays completely', () => {
      const base = getDefaultSyncOrchestrationConfig();
      const merged = mergeSyncOrchestrationConfig(base, {
        discrepancy: {
          ...base.discrepancy,
          requireReviewFor: ['breaking'],
          checkTypes: ['api-routes'],
        },
      });

      expect(merged.discrepancy.requireReviewFor).toEqual(['breaking']);
      expect(merged.discrepancy.checkTypes).toEqual(['api-routes']);
    });

    it('should preserve base values for unspecified fields', () => {
      const base = getDefaultSyncOrchestrationConfig();
      const merged = mergeSyncOrchestrationConfig(base, {
        logging: {
          verbosity: 'verbose',
          retentionDays: base.logging.retentionDays,
        },
      });

      expect(merged.logging.verbosity).toBe('verbose');
      expect(merged.logging.retentionDays).toBe(30);
      // Other sections should remain unchanged
      expect(merged.scheduler).toEqual(base.scheduler);
      expect(merged.permissions).toEqual(base.permissions);
    });

    it('should not mutate base config', () => {
      const base = getDefaultSyncOrchestrationConfig();
      const originalEnabled = base.scheduler.enabled;

      mergeSyncOrchestrationConfig(base, {
        scheduler: {
          ...base.scheduler,
          enabled: true,
        },
      });

      expect(base.scheduler.enabled).toBe(originalEnabled);
    });
  });
});
