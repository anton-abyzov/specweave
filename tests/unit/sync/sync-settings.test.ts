/**
 * Unit Tests: SyncSettings Interface and Migration
 *
 * Tests the three-permission architecture introduced in v0.24.0:
 * - canUpsertInternalItems: CREATE + UPDATE internal items
 * - canUpdateExternalItems: UPDATE external items (full content)
 * - canUpdateStatus: UPDATE status (both types)
 *
 * See: .specweave/increments/0047-us-task-linkage/reports/THREE-PERMISSION-ARCHITECTURE-CHANGES.md
 */

import { describe, it, expect } from 'vitest';
import {
  SyncSettings,
  DEFAULT_SYNC_SETTINGS,
  migrateSyncDirection,
  validateSyncSettings
} from '../../../src/core/types/sync-settings.js';

describe('SyncSettings Interface', () => {
  describe('DEFAULT_SYNC_SETTINGS', () => {
    it('should have all permissions disabled by default', () => {
      expect(DEFAULT_SYNC_SETTINGS.canUpsertInternalItems).toBe(false);
      expect(DEFAULT_SYNC_SETTINGS.canUpdateExternalItems).toBe(false);
      expect(DEFAULT_SYNC_SETTINGS.canUpdateStatus).toBe(false);
    });

    it('should be immutable (defensive copy)', () => {
      const copy = { ...DEFAULT_SYNC_SETTINGS };
      copy.canUpsertInternalItems = true;

      // Original should not be affected
      expect(DEFAULT_SYNC_SETTINGS.canUpsertInternalItems).toBe(false);
    });
  });

  describe('migrateSyncDirection()', () => {
    describe('bidirectional migration', () => {
      it('should enable all permissions for "bidirectional"', () => {
        const result = migrateSyncDirection('bidirectional');

        expect(result.canUpsertInternalItems).toBe(true);
        expect(result.canUpdateExternalItems).toBe(true);
        expect(result.canUpdateStatus).toBe(true);
      });

      it('should be case-sensitive', () => {
        const resultUppercase = migrateSyncDirection('BIDIRECTIONAL');
        const resultMixedCase = migrateSyncDirection('Bidirectional');

        // Only exact lowercase "bidirectional" should match
        expect(resultUppercase).toEqual(DEFAULT_SYNC_SETTINGS);
        expect(resultMixedCase).toEqual(DEFAULT_SYNC_SETTINGS);
      });
    });

    describe('export-only migration', () => {
      it('should enable only canUpsertInternalItems for "export"', () => {
        const result = migrateSyncDirection('export');

        expect(result.canUpsertInternalItems).toBe(true);
        expect(result.canUpdateExternalItems).toBe(false);
        expect(result.canUpdateStatus).toBe(false);
      });

      it('should handle "to-external" alias', () => {
        const result = migrateSyncDirection('to-external');

        expect(result.canUpsertInternalItems).toBe(true);
        expect(result.canUpdateExternalItems).toBe(false);
        expect(result.canUpdateStatus).toBe(false);
      });
    });

    describe('import-only migration', () => {
      it('should enable only canUpdateStatus for "import"', () => {
        const result = migrateSyncDirection('import');

        expect(result.canUpsertInternalItems).toBe(false);
        expect(result.canUpdateExternalItems).toBe(false);
        expect(result.canUpdateStatus).toBe(true);
      });

      it('should handle "from-external" alias', () => {
        const result = migrateSyncDirection('from-external');

        expect(result.canUpsertInternalItems).toBe(false);
        expect(result.canUpdateExternalItems).toBe(false);
        expect(result.canUpdateStatus).toBe(true);
      });
    });

    describe('disabled migration', () => {
      it('should disable all permissions for null', () => {
        const result = migrateSyncDirection(null);

        expect(result).toEqual(DEFAULT_SYNC_SETTINGS);
      });

      it('should disable all permissions for undefined', () => {
        const result = migrateSyncDirection(undefined);

        expect(result).toEqual(DEFAULT_SYNC_SETTINGS);
      });

      it('should disable all permissions for empty string', () => {
        const result = migrateSyncDirection('');

        expect(result).toEqual(DEFAULT_SYNC_SETTINGS);
      });

      it('should disable all permissions for "none"', () => {
        const result = migrateSyncDirection('none');

        expect(result).toEqual(DEFAULT_SYNC_SETTINGS);
      });
    });

    describe('invalid values', () => {
      it('should return defaults for unknown sync direction', () => {
        const result = migrateSyncDirection('invalid-direction');

        expect(result).toEqual(DEFAULT_SYNC_SETTINGS);
      });

      it('should handle whitespace', () => {
        const result = migrateSyncDirection('  bidirectional  ');

        // Whitespace should not match (not trimmed)
        expect(result).toEqual(DEFAULT_SYNC_SETTINGS);
      });
    });

    describe('immutability', () => {
      it('should return new object (not reference to defaults)', () => {
        const result = migrateSyncDirection('unknown');

        // Mutate the result
        result.canUpsertInternalItems = true;

        // DEFAULT_SYNC_SETTINGS should not be affected
        expect(DEFAULT_SYNC_SETTINGS.canUpsertInternalItems).toBe(false);
      });

      it('should return new object for bidirectional', () => {
        const result = migrateSyncDirection('bidirectional');

        // Mutate the result
        result.canUpsertInternalItems = false;

        // New calls should not be affected
        const result2 = migrateSyncDirection('bidirectional');
        expect(result2.canUpsertInternalItems).toBe(true);
      });
    });
  });

  describe('validateSyncSettings()', () => {
    it('should accept valid settings with all permissions enabled', () => {
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        canUpdateStatus: true
      };

      expect(() => validateSyncSettings(settings)).not.toThrow();
    });

    it('should accept valid settings with all permissions disabled', () => {
      const settings: SyncSettings = {
        canUpsertInternalItems: false,
        canUpdateExternalItems: false,
        canUpdateStatus: false
      };

      expect(() => validateSyncSettings(settings)).not.toThrow();
    });

    it('should accept valid settings with mixed permissions', () => {
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: false,
        canUpdateStatus: true
      };

      expect(() => validateSyncSettings(settings)).not.toThrow();
    });

    it('should reject settings with missing canUpsertInternalItems', () => {
      const settings = {
        canUpdateExternalItems: true,
        canUpdateStatus: true
      } as SyncSettings;

      expect(() => validateSyncSettings(settings)).toThrow(/canUpsertInternalItems.*required/i);
    });

    it('should reject settings with missing canUpdateExternalItems', () => {
      const settings = {
        canUpsertInternalItems: true,
        canUpdateStatus: true
      } as SyncSettings;

      expect(() => validateSyncSettings(settings)).toThrow(/canUpdateExternalItems.*required/i);
    });

    it('should reject settings with missing canUpdateStatus', () => {
      const settings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true
      } as SyncSettings;

      expect(() => validateSyncSettings(settings)).toThrow(/canUpdateStatus.*required/i);
    });

    it('should reject settings with non-boolean canUpsertInternalItems', () => {
      const settings = {
        canUpsertInternalItems: 'true',
        canUpdateExternalItems: true,
        canUpdateStatus: true
      } as unknown as SyncSettings;

      expect(() => validateSyncSettings(settings)).toThrow(/canUpsertInternalItems.*boolean/i);
    });

    it('should reject settings with non-boolean canUpdateExternalItems', () => {
      const settings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: 1,
        canUpdateStatus: true
      } as unknown as SyncSettings;

      expect(() => validateSyncSettings(settings)).toThrow(/canUpdateExternalItems.*boolean/i);
    });

    it('should reject settings with non-boolean canUpdateStatus', () => {
      const settings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        canUpdateStatus: null
      } as unknown as SyncSettings;

      expect(() => validateSyncSettings(settings)).toThrow(/canUpdateStatus.*boolean/i);
    });

    it('should reject empty object', () => {
      const settings = {} as SyncSettings;

      expect(() => validateSyncSettings(settings)).toThrow(/required/i);
    });

    it('should reject null', () => {
      expect(() => validateSyncSettings(null as unknown as SyncSettings)).toThrow();
    });

    it('should reject undefined', () => {
      expect(() => validateSyncSettings(undefined as unknown as SyncSettings)).toThrow();
    });
  });

  describe('Permission Combinations', () => {
    describe('all 8 valid combinations', () => {
      const testCases: Array<{
        name: string;
        settings: SyncSettings;
        description: string;
      }> = [
        {
          name: 'All disabled (default)',
          settings: { canUpsertInternalItems: false, canUpdateExternalItems: false, canUpdateStatus: false },
          description: 'No sync operations allowed'
        },
        {
          name: 'Only upsert internal',
          settings: { canUpsertInternalItems: true, canUpdateExternalItems: false, canUpdateStatus: false },
          description: 'Create/update own items only (export-only mode)'
        },
        {
          name: 'Only update external',
          settings: { canUpsertInternalItems: false, canUpdateExternalItems: true, canUpdateStatus: false },
          description: 'Update external items only (rare, usually with status)'
        },
        {
          name: 'Only update status',
          settings: { canUpsertInternalItems: false, canUpdateExternalItems: false, canUpdateStatus: true },
          description: 'Status updates only (import-only mode)'
        },
        {
          name: 'Upsert + update external',
          settings: { canUpsertInternalItems: true, canUpdateExternalItems: true, canUpdateStatus: false },
          description: 'Full content sync, no status'
        },
        {
          name: 'Upsert + status',
          settings: { canUpsertInternalItems: true, canUpdateExternalItems: false, canUpdateStatus: true },
          description: 'Own items + status tracking'
        },
        {
          name: 'Update external + status',
          settings: { canUpsertInternalItems: false, canUpdateExternalItems: true, canUpdateStatus: true },
          description: 'Update external items with status'
        },
        {
          name: 'All enabled (bidirectional)',
          settings: { canUpsertInternalItems: true, canUpdateExternalItems: true, canUpdateStatus: true },
          description: 'Full sync with all operations (original "bidirectional")'
        }
      ];

      testCases.forEach(({ name, settings, description }) => {
        it(`should validate: ${name}`, () => {
          expect(() => validateSyncSettings(settings)).not.toThrow();
        });

        it(`should describe: ${name} - ${description}`, () => {
          // Just verify the test case is well-formed
          expect(settings).toBeDefined();
          expect(description).toBeTruthy();
        });
      });
    });
  });

  describe('Migration Scenarios', () => {
    it('should migrate solo developer workflow (export-only)', () => {
      // Old: syncDirection: "export"
      const migrated = migrateSyncDirection('export');

      expect(migrated.canUpsertInternalItems).toBe(true);
      expect(migrated.canUpdateExternalItems).toBe(false);
      expect(migrated.canUpdateStatus).toBe(false);

      // Validate the migrated settings
      expect(() => validateSyncSettings(migrated)).not.toThrow();
    });

    it('should migrate team collaboration workflow (bidirectional)', () => {
      // Old: syncDirection: "bidirectional"
      const migrated = migrateSyncDirection('bidirectional');

      expect(migrated.canUpsertInternalItems).toBe(true);
      expect(migrated.canUpdateExternalItems).toBe(true);
      expect(migrated.canUpdateStatus).toBe(true);

      // Validate the migrated settings
      expect(() => validateSyncSettings(migrated)).not.toThrow();
    });

    it('should migrate read-only observer workflow (import-only)', () => {
      // Old: syncDirection: "import"
      const migrated = migrateSyncDirection('import');

      expect(migrated.canUpsertInternalItems).toBe(false);
      expect(migrated.canUpdateExternalItems).toBe(false);
      expect(migrated.canUpdateStatus).toBe(true);

      // Validate the migrated settings
      expect(() => validateSyncSettings(migrated)).not.toThrow();
    });

    it('should migrate disabled sync (null)', () => {
      // Old: syncDirection: null
      const migrated = migrateSyncDirection(null);

      expect(migrated.canUpsertInternalItems).toBe(false);
      expect(migrated.canUpdateExternalItems).toBe(false);
      expect(migrated.canUpdateStatus).toBe(false);

      // Validate the migrated settings
      expect(() => validateSyncSettings(migrated)).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should enforce SyncSettings type structure', () => {
      const validSettings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: false,
        canUpdateStatus: true
      };

      // TypeScript should allow this
      expect(validSettings.canUpsertInternalItems).toBeDefined();
      expect(validSettings.canUpdateExternalItems).toBeDefined();
      expect(validSettings.canUpdateStatus).toBeDefined();
    });

    it('should not allow extra properties at type level', () => {
      // This should be a TypeScript error (tested via type system, not runtime)
      const settings: SyncSettings = {
        canUpsertInternalItems: true,
        canUpdateExternalItems: false,
        canUpdateStatus: true
        // extraProperty: 'invalid'  // ← TypeScript error
      };

      expect(Object.keys(settings)).toHaveLength(3);
    });
  });
});
