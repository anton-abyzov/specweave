/**
 * Tests for TimeoutResolver
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-002: Configurable Timeouts
 * @satisfies AC-US2-03, AC-US2-05
 */

import { describe, it, expect } from 'vitest';
import { TimeoutResolver } from '../../../../../src/core/lsp/config/timeout-resolver.js';
import { DEFAULT_TIMEOUT, DEFAULT_WARMUP_TIMEOUT } from '../../../../../src/core/lsp/config/lsp-config.js';

describe('TimeoutResolver', () => {
  describe('getTimeout', () => {
    it('uses perLanguage override when present', () => {
      const resolver = new TimeoutResolver({
        timeout: 120,
        warmupTimeout: 90,
        perLanguage: { csharp: { timeout: 180 } },
      });
      expect(resolver.getTimeout('csharp')).toBe(180);
    });

    it('falls back to global when no perLanguage override', () => {
      const resolver = new TimeoutResolver({
        timeout: 120,
        warmupTimeout: 90,
      });
      expect(resolver.getTimeout('go')).toBe(120);
    });

    it('falls back to global when language has no timeout override', () => {
      const resolver = new TimeoutResolver({
        timeout: 120,
        warmupTimeout: 90,
        perLanguage: { csharp: { warmupTimeout: 100 } },
      });
      expect(resolver.getTimeout('csharp')).toBe(120);
    });

    it('falls back to default when no global timeout', () => {
      const resolver = new TimeoutResolver({
        timeout: DEFAULT_TIMEOUT,
        warmupTimeout: DEFAULT_WARMUP_TIMEOUT,
      });
      expect(resolver.getTimeout('unknown')).toBe(DEFAULT_TIMEOUT);
    });
  });

  describe('getWarmupTimeout', () => {
    it('uses perLanguage warmupTimeout override when present', () => {
      const resolver = new TimeoutResolver({
        timeout: 120,
        warmupTimeout: 90,
        perLanguage: { csharp: { warmupTimeout: 120 } },
      });
      expect(resolver.getWarmupTimeout('csharp')).toBe(120);
    });

    it('falls back to global warmupTimeout when no perLanguage override', () => {
      const resolver = new TimeoutResolver({
        timeout: 120,
        warmupTimeout: 90,
      });
      expect(resolver.getWarmupTimeout('typescript')).toBe(90);
    });

    it('falls back to global when language has no warmupTimeout override', () => {
      const resolver = new TimeoutResolver({
        timeout: 120,
        warmupTimeout: 90,
        perLanguage: { csharp: { timeout: 180 } },
      });
      expect(resolver.getWarmupTimeout('csharp')).toBe(90);
    });
  });

  describe('resolution priority', () => {
    it('perLanguage takes precedence over global', () => {
      const resolver = new TimeoutResolver({
        timeout: 60,
        warmupTimeout: 30,
        perLanguage: {
          csharp: { timeout: 180, warmupTimeout: 120 },
          typescript: { timeout: 45 },
        },
      });

      // C# uses its own overrides
      expect(resolver.getTimeout('csharp')).toBe(180);
      expect(resolver.getWarmupTimeout('csharp')).toBe(120);

      // TypeScript uses its timeout but falls back for warmup
      expect(resolver.getTimeout('typescript')).toBe(45);
      expect(resolver.getWarmupTimeout('typescript')).toBe(30);

      // Python uses global (no overrides)
      expect(resolver.getTimeout('python')).toBe(60);
      expect(resolver.getWarmupTimeout('python')).toBe(30);
    });
  });

  describe('edge cases', () => {
    it('handles empty perLanguage object', () => {
      const resolver = new TimeoutResolver({
        timeout: 120,
        warmupTimeout: 90,
        perLanguage: {},
      });
      expect(resolver.getTimeout('csharp')).toBe(120);
      expect(resolver.getWarmupTimeout('csharp')).toBe(90);
    });

    it('handles undefined perLanguage', () => {
      const resolver = new TimeoutResolver({
        timeout: 120,
        warmupTimeout: 90,
      });
      expect(resolver.getTimeout('csharp')).toBe(120);
      expect(resolver.getWarmupTimeout('csharp')).toBe(90);
    });
  });
});
