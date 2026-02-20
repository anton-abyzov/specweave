/**
 * Tests for sync-living-docs.js permission resolution logic.
 *
 * Verifies that the hook script correctly resolves permissions from:
 * 1. Explicit settings (highest priority)
 * 2. Preset (if no explicit setting)
 * 3. Default true (if neither)
 *
 * Bug fix: Prior to v1.0.295, the hook defaulted canUpsertInternalItems and
 * canUpdateExternalItems to false, silently blocking all living docs sync
 * even when preset: "bidirectional" was configured.
 */

import { describe, it, expect } from 'vitest';

// Replicate the hook's permission resolution logic for unit testing.
// This must stay in sync with sync-living-docs.js PRESET_PERMISSIONS + resolveFlag.
const PRESET_PERMISSIONS: Record<string, Record<string, boolean>> = {
  'read-only':     { canUpsertInternalItems: false, canUpdateExternalItems: false, canUpdateStatus: false },
  'push-only':     { canUpsertInternalItems: true,  canUpdateExternalItems: true,  canUpdateStatus: true  },
  'bidirectional': { canUpsertInternalItems: true,  canUpdateExternalItems: true,  canUpdateStatus: true  },
  'full-control':  { canUpsertInternalItems: true,  canUpdateExternalItems: true,  canUpdateStatus: true  },
};

function resolveFlag(
  key: string,
  settings: Record<string, boolean | undefined>,
  preset?: string,
): boolean {
  return settings[key] ?? (preset ? PRESET_PERMISSIONS[preset]?.[key] : undefined) ?? true;
}

describe('sync-living-docs permission resolution', () => {
  // =========================================================================
  // Default behavior (no preset, no explicit settings)
  // =========================================================================

  describe('defaults (no preset, no settings)', () => {
    it('should default canUpsertInternalItems to true', () => {
      expect(resolveFlag('canUpsertInternalItems', {})).toBe(true);
    });

    it('should default canUpdateExternalItems to true', () => {
      expect(resolveFlag('canUpdateExternalItems', {})).toBe(true);
    });

    it('should default autoSyncOnCompletion to true', () => {
      expect(resolveFlag('autoSyncOnCompletion', {})).toBe(true);
    });
  });

  // =========================================================================
  // Preset resolution
  // =========================================================================

  describe('preset: bidirectional', () => {
    const preset = 'bidirectional';

    it('should enable canUpsertInternalItems', () => {
      expect(resolveFlag('canUpsertInternalItems', {}, preset)).toBe(true);
    });

    it('should enable canUpdateExternalItems', () => {
      expect(resolveFlag('canUpdateExternalItems', {}, preset)).toBe(true);
    });
  });

  describe('preset: read-only', () => {
    const preset = 'read-only';

    it('should disable canUpsertInternalItems', () => {
      expect(resolveFlag('canUpsertInternalItems', {}, preset)).toBe(false);
    });

    it('should disable canUpdateExternalItems', () => {
      expect(resolveFlag('canUpdateExternalItems', {}, preset)).toBe(false);
    });
  });

  describe('preset: push-only', () => {
    const preset = 'push-only';

    it('should enable canUpsertInternalItems', () => {
      expect(resolveFlag('canUpsertInternalItems', {}, preset)).toBe(true);
    });

    it('should enable canUpdateExternalItems', () => {
      expect(resolveFlag('canUpdateExternalItems', {}, preset)).toBe(true);
    });
  });

  // =========================================================================
  // Explicit settings override preset
  // =========================================================================

  describe('explicit settings override preset', () => {
    it('should respect explicit false even with bidirectional preset', () => {
      const settings = { canUpsertInternalItems: false };
      expect(resolveFlag('canUpsertInternalItems', settings, 'bidirectional')).toBe(false);
    });

    it('should respect explicit true even with read-only preset', () => {
      const settings = { canUpsertInternalItems: true };
      expect(resolveFlag('canUpsertInternalItems', settings, 'read-only')).toBe(true);
    });

    it('should respect explicit false for canUpdateExternalItems', () => {
      const settings = { canUpdateExternalItems: false };
      expect(resolveFlag('canUpdateExternalItems', settings, 'bidirectional')).toBe(false);
    });
  });

  // =========================================================================
  // The original bug scenario
  // =========================================================================

  describe('bug scenario: bidirectional preset with missing canUpsertInternalItems', () => {
    it('should enable sync when preset is bidirectional but canUpsertInternalItems is not set', () => {
      // This was the exact bug: config had preset: "bidirectional" and
      // canUpdateExternalItems: true, but canUpsertInternalItems was missing.
      // Old behavior: ?? false → blocked sync
      // New behavior: checks preset → bidirectional → true
      const settings = { canUpdateExternalItems: true, canUpdateStatus: true };
      expect(resolveFlag('canUpsertInternalItems', settings, 'bidirectional')).toBe(true);
    });

    it('should enable sync when no preset and no settings at all', () => {
      // Even without a preset, the default should be true (matching TypeScript classes)
      expect(resolveFlag('canUpsertInternalItems', {})).toBe(true);
      expect(resolveFlag('canUpdateExternalItems', {})).toBe(true);
    });
  });

  // =========================================================================
  // Unknown preset falls back to default true
  // =========================================================================

  describe('unknown preset', () => {
    it('should default to true for unknown preset name', () => {
      expect(resolveFlag('canUpsertInternalItems', {}, 'nonexistent')).toBe(true);
    });
  });
});
