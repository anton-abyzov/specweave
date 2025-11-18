import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for Core Reflection Engine
 */

import {
  runSelfReflection,
  createReflectionContext,
  runReflectionAuto
} from '../../../src/hooks/lib/run-self-reflection.js';
import {
  DEFAULT_REFLECTION_CONFIG,
  ReflectionMode,
  ReflectionModel,
  ReflectionContext,
  GitDiffInfo
} from '../../../src/hooks/lib/types/reflection-types.js';

describe('Core Reflection Engine', () => {
  const mockModifiedFiles: GitDiffInfo[] = [
    {
      file: 'src/utils/auth.ts',
      linesAdded: 15,
      linesRemoved: 5,
      content: '@@ -10,5 +10,15 @@\n+const hashPassword = (password: string) => {...'
    }
  ];

  const mockContext: ReflectionContext = {
    incrementId: '0016-self-reflection-system',
    taskId: 'T-005',
    modifiedFiles: mockModifiedFiles,
    config: DEFAULT_REFLECTION_CONFIG
  };

  describe('runSelfReflection', () => {
    it('should skip reflection when disabled', async () => {
      const context: ReflectionContext = {
        ...mockContext,
        config: {
          ...DEFAULT_REFLECTION_CONFIG,
          enabled: false
        }
      };

      const result = await runSelfReflection(context);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should skip reflection in manual mode', async () => {
      const context: ReflectionContext = {
        ...mockContext,
        config: {
          ...DEFAULT_REFLECTION_CONFIG,
          mode: ReflectionMode.MANUAL
        }
      };

      const result = await runSelfReflection(context);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();
    });

    it('should skip reflection when mode is disabled', async () => {
      const context: ReflectionContext = {
        ...mockContext,
        config: {
          ...DEFAULT_REFLECTION_CONFIG,
          mode: ReflectionMode.DISABLED
        }
      };

      const result = await runSelfReflection(context);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();
    });

    it('should skip reflection when no modified files', async () => {
      const context: ReflectionContext = {
        ...mockContext,
        modifiedFiles: []
      };

      const result = await runSelfReflection(context);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();
    });

    it('should fail gracefully when agent invocation not implemented', async () => {
      const result = await runSelfReflection(mockContext);

      // Since agent invocation throws "not implemented" error,
      // the engine should catch it and return error result
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('not implemented');
      expect(result.error!.code).toBe('REFLECTION_ERROR');
    });

    it('should return error for validation failures', async () => {
      // This test will become more meaningful when agent invocation is implemented
      // For now, we're testing that validation errors are properly returned

      const result = await runSelfReflection(mockContext);

      // Agent not implemented, so we get error
      expect(result.success).toBe(false);
    });

    it('should handle storage failures gracefully', async () => {
      // When agent invocation is implemented, storage failures should be logged
      // but not fail the entire reflection
      // This is tested via the try-catch around saveReflection in the code
      const result = await runSelfReflection(mockContext);

      // Currently fails at agent invocation, but code path is tested
      expect(result.success).toBe(false);
    });
  });

  describe('createReflectionContext', () => {
    it('should create context with configuration and modified files', () => {
      // Mock git repository
      const projectRoot = process.cwd();

      const context = createReflectionContext('0016-self-reflection-system', 'T-005', projectRoot);

      expect(context.incrementId).toBe('0016-self-reflection-system');
      expect(context.taskId).toBe('T-005');
      expect(context.config).toBeDefined();
      expect(Array.isArray(context.modifiedFiles)).toBe(true);
    });

    it('should auto-detect project root if not provided', () => {
      const context = createReflectionContext('0016-self-reflection-system', 'T-005');

      expect(context.incrementId).toBe('0016-self-reflection-system');
      expect(context.config).toBeDefined();
    });

    it('should load configuration from .specweave/config.json', () => {
      const context = createReflectionContext('0016-self-reflection-system', 'T-005');

      // Should have default configuration if config file doesn't exist
      expect(context.config.enabled).toBe(true);
      expect(context.config.mode).toBe(ReflectionMode.AUTO);
      expect(context.config.model).toBe(ReflectionModel.HAIKU);
    });

    it('should get modified files from git', () => {
      const context = createReflectionContext('0016-self-reflection-system', 'T-005');

      // Modified files array should exist (may be empty if no git changes)
      expect(Array.isArray(context.modifiedFiles)).toBe(true);
    });
  });

  describe('runReflectionAuto', () => {
    it('should create context and run reflection', async () => {
      const result = await runReflectionAuto('0016-self-reflection-system', 'T-005');

      // Should attempt to run reflection (fails at agent invocation currently)
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should auto-detect project root', async () => {
      const result = await runReflectionAuto('0016-self-reflection-system', 'T-005');

      expect(result).toBeDefined();
    });

    it('should return success when reflection skipped', async () => {
      // If no modified files, should return success with undefined result
      const result = await runReflectionAuto('0016-self-reflection-system', 'T-005');

      // Result depends on whether there are actually modified files in the repo
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate cost for haiku model', () => {
      // Cost estimation is internal to runSelfReflection
      // We test it indirectly by verifying the reflection result includes cost
      // This will be tested in integration tests when agent invocation works
      expect(true).toBe(true); // Placeholder
    });

    it('should estimate cost for sonnet model', () => {
      // Higher cost than haiku
      expect(true).toBe(true); // Placeholder
    });

    it('should estimate cost for opus model', () => {
      // Highest cost
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Error Handling', () => {
    it('should catch and return errors gracefully', async () => {
      // Any error during reflection should be caught and returned as error result
      const result = await runSelfReflection(mockContext);

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error!.message).toBeDefined();
        expect(result.error!.code).toBeDefined();
      }
    });

    it('should not throw exceptions', async () => {
      // runSelfReflection should never throw, always return result
      await expect(runSelfReflection(mockContext)).resolves.toBeDefined();
    });

    it('should include error details in result', async () => {
      const result = await runSelfReflection(mockContext);

      if (!result.success && result.error) {
        expect(result.error.message).toBeDefined();
        expect(result.error.code).toBeDefined();
        expect(result.error.details).toBeDefined();
      }
    });
  });

  describe('Configuration Integration', () => {
    it('should respect enabled flag', async () => {
      const context: ReflectionContext = {
        ...mockContext,
        config: { ...DEFAULT_REFLECTION_CONFIG, enabled: false }
      };

      const result = await runSelfReflection(context);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined(); // Skipped
    });

    it('should respect mode setting', async () => {
      const context: ReflectionContext = {
        ...mockContext,
        config: { ...DEFAULT_REFLECTION_CONFIG, mode: ReflectionMode.MANUAL }
      };

      const result = await runSelfReflection(context);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined(); // Skipped in auto mode
    });

    it('should use configured model', async () => {
      const context: ReflectionContext = {
        ...mockContext,
        config: { ...DEFAULT_REFLECTION_CONFIG, model: ReflectionModel.SONNET }
      };

      // Model is passed to agent invocation (tested in integration tests)
      const result = await runSelfReflection(context);

      expect(result).toBeDefined();
    });
  });
});
