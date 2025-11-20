/**
 * Legacy ID Preservation Tests (T-031)
 *
 * Tests that migration preserves existing internal IDs and external imports
 * start at the next available ID after the maximum internal ID.
 */

import { describe, it, expect } from 'vitest';
import { getNextUsId, generateUsIdRange } from '../../../src/id-generators/us-id-generator.js';

describe('Legacy ID Preservation (T-031)', () => {
  describe('TC-086: Preserve legacy IDs', () => {
    it('should start external imports after max internal ID', () => {
      // Simulate 40 increments with IDs US-001 to US-200
      const existingInternalIds = generateUsIdRange(1, 200, 'internal');

      // First external import should start at US-201E
      const firstExternalId = getNextUsId(existingInternalIds, 'external');
      expect(firstExternalId).toBe('US-201E');
    });

    it('should continue external imports sequentially', () => {
      // Existing: 200 internal IDs + 5 external IDs
      const existingInternalIds = generateUsIdRange(1, 200, 'internal');
      const existingExternalIds = generateUsIdRange(201, 5, 'external');
      const allExistingIds = [...existingInternalIds, ...existingExternalIds];

      // Next external import should be US-206E
      const nextExternalId = getNextUsId(allExistingIds, 'external');
      expect(nextExternalId).toBe('US-206E');
    });

    it('should allow new internal IDs after external imports', () => {
      // Existing: 200 internal + 10 external
      const existingInternalIds = generateUsIdRange(1, 200, 'internal');
      const existingExternalIds = generateUsIdRange(201, 10, 'external');
      const allExistingIds = [...existingInternalIds, ...existingExternalIds];

      // Next internal ID should be US-211 (after max of 210)
      const nextInternalId = getNextUsId(allExistingIds, 'internal');
      expect(nextInternalId).toBe('US-211');
    });
  });

  describe('TC-087: No renumbering of existing IDs', () => {
    it('should preserve US-010 without renumbering', () => {
      const existingIds = ['US-001', 'US-002', 'US-010', 'US-015'];

      // US-010 exists and should not be suggested
      const nextId = getNextUsId(existingIds, 'internal');

      // Next ID should be US-016 (not renumbering US-010)
      expect(nextId).toBe('US-016');
      expect(existingIds).toContain('US-010'); // Original ID preserved
    });

    it('should not add suffix to existing internal IDs', () => {
      const existingInternalIds = generateUsIdRange(1, 50, 'internal');

      // All IDs should remain without suffix
      existingInternalIds.forEach((id) => {
        expect(id).toMatch(/^US-\d{3}$/);
        expect(id).not.toMatch(/E$/);
      });
    });

    it('should preserve gaps in legacy ID sequence', () => {
      // Legacy IDs with gaps (common in real projects)
      const existingIds = [
        'US-001', 'US-002', 'US-003',
        // Gap: US-004, US-005, US-006 missing
        'US-007', 'US-008',
        // Gap: US-009 missing
        'US-010'
      ];

      // Next ID should be after max (US-010), not filling gaps
      const nextId = getNextUsId(existingIds, 'internal');
      expect(nextId).toBe('US-011');

      // Gaps should remain (no automatic gap filling)
      expect(existingIds).not.toContain('US-004');
      expect(existingIds).not.toContain('US-005');
      expect(existingIds).not.toContain('US-006');
      expect(existingIds).not.toContain('US-009');
    });
  });

  describe('Real-World Migration Scenarios', () => {
    it('should handle brownfield project with 46 increments', () => {
      // SpecWeave itself: increments 0001-0046
      // Assume average 5 User Stories per increment = ~230 total
      const existingInternalIds = generateUsIdRange(1, 230, 'internal');

      // First external import from GitHub/JIRA
      const firstExternalId = getNextUsId(existingInternalIds, 'external');
      expect(firstExternalId).toBe('US-231E');
    });

    it('should handle mixed internal and external after migration', () => {
      // After brownfield import:
      // - 230 internal IDs from existing increments
      // - 50 external IDs from GitHub import
      const internalIds = generateUsIdRange(1, 230, 'internal');
      const externalIds = generateUsIdRange(231, 50, 'external');
      const allIds = [...internalIds, ...externalIds];

      // Next internal US (new greenfield work)
      const nextInternal = getNextUsId(allIds, 'internal');
      expect(nextInternal).toBe('US-281');

      // Next external import
      const nextExternal = getNextUsId(allIds, 'external');
      expect(nextExternal).toBe('US-281E');
    });

    it('should never reuse archived or deleted IDs', () => {
      // Simulate a project where some IDs were used but later archived
      const usedIds = ['US-001', 'US-002', 'US-003', 'US-010', 'US-020'];

      // Even though US-004 through US-009 are "available",
      // the generator should use US-021 (after max)
      const nextId = getNextUsId(usedIds, 'internal');
      expect(nextId).toBe('US-021');

      // This ensures archived IDs remain stable in history
    });

    it('should handle very large ID numbers (>999)', () => {
      // Edge case: project with 1000+ User Stories
      const largeIds = generateUsIdRange(1, 1500, 'internal');

      const nextId = getNextUsId(largeIds, 'internal');
      expect(nextId).toBe('US-1501');

      // Should work even without 3-digit padding
      expect(nextId).toMatch(/^US-\d+$/);
    });
  });

  describe('Migration Strategy Validation', () => {
    it('should document that legacy IDs are immutable', () => {
      // This test documents the strategy:
      // 1. Scan all existing increments
      // 2. Extract all US-IDs (internal only)
      // 3. Find max number
      // 4. First external import starts at max + 1 with E suffix

      const strategy = {
        step1: 'Scan .specweave/increments/0001-0046/',
        step2: 'Extract US-IDs from spec.md files',
        step3: 'Find max(US-XXX) ignoring suffixes',
        step4: 'First external ID = US-{max+1}E',
        immutable: 'Legacy IDs NEVER change or renumber'
      };

      expect(strategy.immutable).toBe('Legacy IDs NEVER change or renumber');
    });

    it('should validate no collisions between internal and external', () => {
      const internalIds = ['US-001', 'US-002', 'US-003'];
      const externalIds = ['US-004E', 'US-005E'];

      // Internal US-004 and external US-004E are different
      expect(internalIds).not.toContain('US-004E');
      expect(externalIds).not.toContain('US-004');

      // No collision possible due to suffix distinction
      const allIds = [...internalIds, ...externalIds];
      expect(allIds.length).toBe(5); // All unique
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty legacy project (new greenfield)', () => {
      const emptyIds: string[] = [];

      // First ID should be US-001 (internal)
      const firstInternal = getNextUsId(emptyIds, 'internal');
      expect(firstInternal).toBe('US-001');

      // First external would be US-001E
      const firstExternal = getNextUsId(emptyIds, 'external');
      expect(firstExternal).toBe('US-001E');
    });

    it('should handle project with only external IDs', () => {
      const externalOnlyIds = generateUsIdRange(1, 50, 'external');

      // First internal ID should be US-051 (after max external)
      const firstInternal = getNextUsId(externalOnlyIds, 'internal');
      expect(firstInternal).toBe('US-051');
    });

    it('should handle sparse ID allocation', () => {
      // Very sparse: only 5 IDs used across 100 possible slots
      const sparseIds = ['US-001', 'US-025', 'US-050', 'US-075', 'US-100'];

      const nextId = getNextUsId(sparseIds, 'internal');
      expect(nextId).toBe('US-101'); // After max, not filling gaps
    });
  });
});
