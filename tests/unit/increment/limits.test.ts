import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests: Increment Limits
 *
 * Tests for type-based increment limits (T-019)
 * Part of increment 0007: Smart Status Management
 */

import {
  checkIncrementLimits,
  checkAllLimits,
  getContextSwitchWarning,
  canStartIncrement,
  getLimitsSummary
} from '../../../src/core/increment/limits.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';
import { IncrementType, IncrementStatus, createDefaultMetadata } from '../../../src/core/types/increment-metadata.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock MetadataManager
vi.mock('../../../src/core/increment/metadata-manager');

describe('Increment Limits', () => {
  // ✅ SAFE: Use temp directory instead of project root
  const testIncrementsPath = path.join(os.tmpdir(), 'specweave-test-limits', 'increments');

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup test directory
    if (fs.existsSync(testIncrementsPath)) {
      fs.removeSync(testIncrementsPath);
    }
    fs.ensureDirSync(testIncrementsPath);
  });

  afterEach(() => {
    // Cleanup test directory
    if (fs.existsSync(testIncrementsPath)) {
      fs.removeSync(testIncrementsPath);
    }
  });

  describe('checkIncrementLimits()', () => {
    it('testHotfixUnlimited() - Can create many hotfixes', () => {
      // Mock: 5 active hotfixes
      const mockIncrements = [
        { ...createDefaultMetadata('0001-hotfix-1'), type: IncrementType.HOTFIX, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-hotfix-2'), type: IncrementType.HOTFIX, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0003-hotfix-3'), type: IncrementType.HOTFIX, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0004-hotfix-4'), type: IncrementType.HOTFIX, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0005-hotfix-5'), type: IncrementType.HOTFIX, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const result = checkIncrementLimits(IncrementType.HOTFIX);

      expect(result.exceeded).toBe(false);
      expect(result.limit).toBe(null); // Unlimited
      expect(result.severity).toBe('info');
      expect(result.warning).toBeUndefined();
    });

    it('testFeatureLimit() - Warning at 2 features', () => {
      // Mock: 2 active features
      const mockIncrements = [
        { ...createDefaultMetadata('0001-feature-1'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-feature-2'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const result = checkIncrementLimits(IncrementType.FEATURE);

      expect(result.exceeded).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.severity).toBe('warning');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('2 active feature');
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it('testRefactorLimit() - Warning at 1 refactor', () => {
      // Mock: 1 active refactor
      const mockIncrements = [
        { ...createDefaultMetadata('0001-refactor'), type: IncrementType.REFACTOR, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const result = checkIncrementLimits(IncrementType.REFACTOR);

      expect(result.exceeded).toBe(true);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.severity).toBe('warning');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('1 active refactor');
    });

    it('testBugUnlimited() - Can create many bugs', () => {
      // Mock: 3 active bugs
      const mockIncrements = [
        { ...createDefaultMetadata('0001-bug-1'), type: IncrementType.BUG, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-bug-2'), type: IncrementType.BUG, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0003-bug-3'), type: IncrementType.BUG, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const result = checkIncrementLimits(IncrementType.BUG);

      expect(result.exceeded).toBe(false);
      expect(result.limit).toBe(null); // Unlimited
      expect(result.severity).toBe('info');
    });

    it('testExperimentUnlimited() - Can create many experiments', () => {
      // Mock: 4 active experiments
      const mockIncrements = [
        { ...createDefaultMetadata('0001-exp-1'), type: IncrementType.EXPERIMENT, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-exp-2'), type: IncrementType.EXPERIMENT, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0003-exp-3'), type: IncrementType.EXPERIMENT, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0004-exp-4'), type: IncrementType.EXPERIMENT, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const result = checkIncrementLimits(IncrementType.EXPERIMENT);

      expect(result.exceeded).toBe(false);
      expect(result.limit).toBe(null); // Unlimited
    });

    it('testPausedNotCounted() - Paused increments do not count toward limits', () => {
      // Mock: 1 active feature + 1 paused feature
      const mockIncrements = [
        { ...createDefaultMetadata('0001-feature-active'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-feature-paused'), type: IncrementType.FEATURE, status: IncrementStatus.PAUSED }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const result = checkIncrementLimits(IncrementType.FEATURE);

      // Only active ones count
      expect(result.current).toBe(1);
      expect(result.exceeded).toBe(false); // 1 < limit of 2
    });
  });

  describe('checkAllLimits()', () => {
    it('testAllLimitsCheck() - Check all types at once', () => {
      // Mock: Mixed increments
      const mockIncrements = [
        { ...createDefaultMetadata('0001-hotfix'), type: IncrementType.HOTFIX, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-feature-1'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0003-feature-2'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0004-refactor'), type: IncrementType.REFACTOR, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const results = checkAllLimits();

      // Hotfix: not exceeded (unlimited)
      expect(results[IncrementType.HOTFIX].exceeded).toBe(false);

      // Feature: exceeded (2 active, limit 2)
      expect(results[IncrementType.FEATURE].exceeded).toBe(true);
      expect(results[IncrementType.FEATURE].current).toBe(2);

      // Refactor: exceeded (1 active, limit 1)
      expect(results[IncrementType.REFACTOR].exceeded).toBe(true);
      expect(results[IncrementType.REFACTOR].current).toBe(1);

      // Bug: not exceeded (0 active, unlimited)
      expect(results[IncrementType.BUG].exceeded).toBe(false);
    });
  });

  describe('getContextSwitchWarning()', () => {
    it('testNoWarningIfNoActive() - No warning when no active increments', () => {
      (MetadataManager.getActive as any).mockReturnValue([]);

      const warning = getContextSwitchWarning(IncrementType.FEATURE);

      expect(warning.show).toBe(false);
      expect(warning.productivityCost).toBe('0%');
    });

    it('testNoWarningForHotfix() - Hotfixes bypass context switch warning', () => {
      // Mock: 1 active feature
      const mockIncrements = [
        { ...createDefaultMetadata('0001-feature'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getActive as any).mockReturnValue(mockIncrements);

      const warning = getContextSwitchWarning(IncrementType.HOTFIX);

      expect(warning.show).toBe(false); // Hotfixes don't trigger warning
    });

    it('testWarningForSecondFeature() - Warning when starting second feature', () => {
      // Mock: 1 active feature
      const mockIncrements = [
        { ...createDefaultMetadata('0001-feature'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getActive as any).mockReturnValue(mockIncrements);

      const warning = getContextSwitchWarning(IncrementType.FEATURE);

      expect(warning.show).toBe(true);
      expect(warning.productivityCost).toBe('20%');
      expect(warning.message).toContain('1 active increment');
      expect(warning.message).toContain('context switching');
      expect(warning.options).toHaveLength(3);
      expect(warning.options[0].value).toBe('continue');
      expect(warning.options[1].value).toBe('pause');
      expect(warning.options[2].value).toBe('parallel');
    });

    it('testHigherCostForMultipleActive() - Higher cost with more active increments', () => {
      // Mock: 2 active increments
      const mockIncrements = [
        { ...createDefaultMetadata('0001-feature-1'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-feature-2'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getActive as any).mockReturnValue(mockIncrements);

      const warning = getContextSwitchWarning(IncrementType.FEATURE);

      expect(warning.show).toBe(true);
      expect(warning.productivityCost).toBe('30%'); // Higher than 20% with 1 active
    });
  });

  describe('canStartIncrement()', () => {
    it('testCanStartFeature() - Can start first feature', () => {
      // Mock: No active features
      (MetadataManager.getAll as any).mockReturnValue([]);

      const result = canStartIncrement(IncrementType.FEATURE);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('testCannotStartThirdFeature() - Cannot start 3rd feature (limit 2)', () => {
      // Mock: 2 active features
      const mockIncrements = [
        { ...createDefaultMetadata('0001-feature-1'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-feature-2'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const result = canStartIncrement(IncrementType.FEATURE);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('2 active feature');
    });

    it('testCanStartHotfixAlways() - Can always start hotfix', () => {
      // Mock: Many active increments
      const mockIncrements = [
        { ...createDefaultMetadata('0001-feature-1'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-feature-2'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0003-refactor'), type: IncrementType.REFACTOR, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const result = canStartIncrement(IncrementType.HOTFIX);

      expect(result.allowed).toBe(true); // Hotfixes are unlimited
    });
  });

  describe('getLimitsSummary()', () => {
    it('testSummaryFormat() - Format summary correctly', () => {
      // Mock: Mixed increments
      const mockIncrements = [
        { ...createDefaultMetadata('0001-hotfix'), type: IncrementType.HOTFIX, status: IncrementStatus.ACTIVE },
        { ...createDefaultMetadata('0002-feature'), type: IncrementType.FEATURE, status: IncrementStatus.ACTIVE }
      ];

      (MetadataManager.getAll as any).mockReturnValue(mockIncrements);

      const summary = getLimitsSummary();

      expect(summary).toContain('Increment Limits:');
      expect(summary).toContain('hotfix:');
      expect(summary).toContain('feature:');
      expect(summary).toContain('refactor:');
      expect(summary).toContain('unlimited'); // For hotfix
      expect(summary).toContain('✅'); // Status indicators
    });
  });
});
