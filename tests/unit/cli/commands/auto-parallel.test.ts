/**
 * Auto Command Parallel Mode Tests
 *
 * Tests for the parallel execution flags in the auto CLI command.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isParallelModeRequested,
  getSelectedDomains,
  buildParallelConfig,
  type AutoCommandOptions,
} from '../../../../src/cli/commands/auto.js';

describe('Auto Command Parallel Mode', () => {
  // ============================================================================
  // isParallelModeRequested
  // ============================================================================

  describe('isParallelModeRequested', () => {
    it('should return true when --parallel flag is set', () => {
      const options: AutoCommandOptions = { parallel: true };
      expect(isParallelModeRequested(options)).toBe(true);
    });

    it('should return true when --frontend flag is set', () => {
      const options: AutoCommandOptions = { frontend: true };
      expect(isParallelModeRequested(options)).toBe(true);
    });

    it('should return true when --backend flag is set', () => {
      const options: AutoCommandOptions = { backend: true };
      expect(isParallelModeRequested(options)).toBe(true);
    });

    it('should return true when --database flag is set', () => {
      const options: AutoCommandOptions = { database: true };
      expect(isParallelModeRequested(options)).toBe(true);
    });

    it('should return true when --devops flag is set', () => {
      const options: AutoCommandOptions = { devops: true };
      expect(isParallelModeRequested(options)).toBe(true);
    });

    it('should return true when --qa flag is set', () => {
      const options: AutoCommandOptions = { qa: true };
      expect(isParallelModeRequested(options)).toBe(true);
    });

    it('should return true when multiple domain flags are set', () => {
      const options: AutoCommandOptions = { frontend: true, backend: true, database: true };
      expect(isParallelModeRequested(options)).toBe(true);
    });

    it('should return false when no parallel flags are set', () => {
      const options: AutoCommandOptions = { dryRun: true };
      expect(isParallelModeRequested(options)).toBe(false);
    });

    it('should return false for empty options', () => {
      const options: AutoCommandOptions = {};
      expect(isParallelModeRequested(options)).toBe(false);
    });

    it('should return false when only non-parallel flags are set', () => {
      const options: AutoCommandOptions = {
        dryRun: true,
        allBacklog: true,
        reset: true,
      };
      expect(isParallelModeRequested(options)).toBe(false);
    });
  });

  // ============================================================================
  // getSelectedDomains
  // ============================================================================

  describe('getSelectedDomains', () => {
    it('should return empty array when no domains selected', () => {
      const options: AutoCommandOptions = { parallel: true };
      expect(getSelectedDomains(options)).toEqual([]);
    });

    it('should return frontend domain', () => {
      const options: AutoCommandOptions = { frontend: true };
      expect(getSelectedDomains(options)).toEqual(['frontend']);
    });

    it('should return backend domain', () => {
      const options: AutoCommandOptions = { backend: true };
      expect(getSelectedDomains(options)).toEqual(['backend']);
    });

    it('should return database domain', () => {
      const options: AutoCommandOptions = { database: true };
      expect(getSelectedDomains(options)).toEqual(['database']);
    });

    it('should return devops domain', () => {
      const options: AutoCommandOptions = { devops: true };
      expect(getSelectedDomains(options)).toEqual(['devops']);
    });

    it('should return qa domain', () => {
      const options: AutoCommandOptions = { qa: true };
      expect(getSelectedDomains(options)).toEqual(['qa']);
    });

    it('should return multiple domains in correct order', () => {
      const options: AutoCommandOptions = {
        frontend: true,
        backend: true,
        database: true,
      };
      expect(getSelectedDomains(options)).toEqual(['frontend', 'backend', 'database']);
    });

    it('should return all domains when all are selected', () => {
      const options: AutoCommandOptions = {
        frontend: true,
        backend: true,
        database: true,
        devops: true,
        qa: true,
      };
      expect(getSelectedDomains(options)).toEqual(['frontend', 'backend', 'database', 'devops', 'qa']);
    });

    it('should not include domains when flag is false', () => {
      const options: AutoCommandOptions = {
        frontend: true,
        backend: false,
        database: true,
      };
      expect(getSelectedDomains(options)).toEqual(['frontend', 'database']);
    });
  });

  // ============================================================================
  // buildParallelConfig
  // ============================================================================

  describe('buildParallelConfig', () => {
    it('should build config with default values', () => {
      const options: AutoCommandOptions = { frontend: true };
      const config = buildParallelConfig(options);

      expect(config.enabled).toBe(true);
      expect(config.maxParallel).toBe(3);
      expect(config.createPR).toBe(false);
      expect(config.draftPR).toBe(false);
      expect(config.mergeStrategy).toBe('auto');
      expect(config.baseBranch).toBe('main');
    });

    it('should use selected domains', () => {
      const options: AutoCommandOptions = { frontend: true, backend: true };
      const config = buildParallelConfig(options);

      expect(config.domains).toEqual(['frontend', 'backend']);
    });

    it('should use all domains when none selected', () => {
      const options: AutoCommandOptions = { parallel: true };
      const config = buildParallelConfig(options);

      expect(config.domains).toEqual(['frontend', 'backend', 'database', 'devops', 'qa']);
    });

    it('should use custom maxParallel', () => {
      const options: AutoCommandOptions = { parallel: true, maxParallel: 5 };
      const config = buildParallelConfig(options);

      expect(config.maxParallel).toBe(5);
    });

    it('should enable PR creation', () => {
      const options: AutoCommandOptions = { parallel: true, pr: true };
      const config = buildParallelConfig(options);

      expect(config.createPR).toBe(true);
    });

    it('should enable draft PR mode', () => {
      const options: AutoCommandOptions = { parallel: true, pr: true, draftPr: true };
      const config = buildParallelConfig(options);

      expect(config.draftPR).toBe(true);
    });

    it('should use custom merge strategy', () => {
      const options: AutoCommandOptions = { parallel: true, mergeStrategy: 'manual' };
      const config = buildParallelConfig(options);

      expect(config.mergeStrategy).toBe('manual');
    });

    it('should use custom base branch', () => {
      const options: AutoCommandOptions = { parallel: true, baseBranch: 'develop' };
      const config = buildParallelConfig(options);

      expect(config.baseBranch).toBe('develop');
    });

    it('should combine all custom options', () => {
      const options: AutoCommandOptions = {
        frontend: true,
        backend: true,
        maxParallel: 4,
        pr: true,
        draftPr: true,
        mergeStrategy: 'pr',
        baseBranch: 'develop',
      };
      const config = buildParallelConfig(options);

      expect(config).toEqual({
        enabled: true,
        maxParallel: 4,
        domains: ['frontend', 'backend'],
        createPR: true,
        draftPR: true,
        mergeStrategy: 'pr',
        baseBranch: 'develop',
      });
    });
  });

  // ============================================================================
  // FLAG PARSING EDGE CASES
  // ============================================================================

  describe('Flag Parsing Edge Cases', () => {
    it('should handle undefined options gracefully', () => {
      const options: AutoCommandOptions = {};
      expect(() => isParallelModeRequested(options)).not.toThrow();
      expect(() => getSelectedDomains(options)).not.toThrow();
      expect(() => buildParallelConfig(options)).not.toThrow();
    });

    it('should handle maxParallel of 0', () => {
      const options: AutoCommandOptions = { parallel: true, maxParallel: 0 };
      const config = buildParallelConfig(options);
      // 0 is falsy, so should use default
      expect(config.maxParallel).toBe(3);
    });

    it('should handle maxParallel of 1', () => {
      const options: AutoCommandOptions = { parallel: true, maxParallel: 1 };
      const config = buildParallelConfig(options);
      expect(config.maxParallel).toBe(1);
    });

    it('should handle large maxParallel value', () => {
      const options: AutoCommandOptions = { parallel: true, maxParallel: 100 };
      const config = buildParallelConfig(options);
      expect(config.maxParallel).toBe(100);
    });
  });
});
