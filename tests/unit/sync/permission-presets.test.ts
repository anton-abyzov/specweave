import { describe, it, expect } from 'vitest';
import {
  resolvePermissions,
  PRESET_DEFAULTS,
  type SyncPreset,
  type SyncPermissions,
} from '../../../src/sync/config.js';

describe('Permission Preset System', () => {
  describe('PRESET_DEFAULTS', () => {
    it('should define read-only preset', () => {
      expect(PRESET_DEFAULTS['read-only']).toEqual({
        canRead: true,
        canUpdateStatus: false,
        canUpsert: false,
        canDelete: false,
      });
    });

    it('should define push-only preset', () => {
      expect(PRESET_DEFAULTS['push-only']).toEqual({
        canRead: false,
        canUpdateStatus: true,
        canUpsert: true,
        canDelete: false,
      });
    });

    it('should define bidirectional preset', () => {
      expect(PRESET_DEFAULTS['bidirectional']).toEqual({
        canRead: true,
        canUpdateStatus: true,
        canUpsert: true,
        canDelete: false,
      });
    });

    it('should define full-control preset', () => {
      expect(PRESET_DEFAULTS['full-control']).toEqual({
        canRead: true,
        canUpdateStatus: true,
        canUpsert: true,
        canDelete: true,
      });
    });
  });

  describe('resolvePermissions', () => {
    it('should return preset defaults when no overrides', () => {
      const result = resolvePermissions('read-only');
      expect(result).toEqual(PRESET_DEFAULTS['read-only']);
    });

    it('should apply overrides on top of preset', () => {
      const result = resolvePermissions('bidirectional', { canDelete: true });
      expect(result.canRead).toBe(true);
      expect(result.canUpdateStatus).toBe(true);
      expect(result.canUpsert).toBe(true);
      expect(result.canDelete).toBe(true); // overridden
    });

    it('should allow disabling specific permissions', () => {
      const result = resolvePermissions('full-control', { canDelete: false });
      expect(result.canRead).toBe(true);
      expect(result.canDelete).toBe(false); // overridden
    });

    it('should handle all presets', () => {
      const presets: SyncPreset[] = ['read-only', 'push-only', 'bidirectional', 'full-control'];
      for (const preset of presets) {
        const result = resolvePermissions(preset);
        expect(result).toBeDefined();
        expect(typeof result.canRead).toBe('boolean');
        expect(typeof result.canUpdateStatus).toBe('boolean');
        expect(typeof result.canUpsert).toBe('boolean');
        expect(typeof result.canDelete).toBe('boolean');
      }
    });
  });

  describe('Backward compatibility with old booleans', () => {
    it('should resolve from legacy settings when no preset', () => {
      const result = resolvePermissions(undefined, undefined, {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        canUpdateStatus: true,
      });

      expect(result.canUpsert).toBe(true);
      expect(result.canRead).toBe(true); // canUpdateExternalItems implies read
      expect(result.canUpdateStatus).toBe(true);
      expect(result.canDelete).toBe(false); // not in legacy
    });

    it('should prefer preset over legacy settings', () => {
      const result = resolvePermissions('read-only', undefined, {
        canUpsertInternalItems: true,
        canUpdateExternalItems: true,
        canUpdateStatus: true,
      });

      expect(result.canUpsert).toBe(false); // preset wins
      expect(result.canUpdateStatus).toBe(false); // preset wins
    });
  });
});
