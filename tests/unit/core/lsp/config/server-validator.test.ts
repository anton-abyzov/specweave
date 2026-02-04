/**
 * Tests for ServerValidator
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-004: Custom LSP Registration
 * @satisfies AC-US4-02, AC-US4-03, AC-US4-04
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ServerValidator,
  ValidationResult,
  TrustStore,
  BinaryChecker,
} from '../../../../../src/core/lsp/config/server-validator.js';

/**
 * Mock trust store for testing
 */
function createMockTrustStore(): TrustStore & { trusted: Set<string> } {
  const trusted = new Set<string>();
  return {
    trusted,
    async isTrusted(serverId: string): Promise<boolean> {
      return trusted.has(serverId);
    },
    async trust(serverId: string): Promise<void> {
      trusted.add(serverId);
    },
  };
}

/**
 * Mock binary checker for testing
 */
function createMockBinaryChecker(
  existingBinaries: string[]
): BinaryChecker {
  return {
    async exists(path: string): Promise<boolean> {
      return existingBinaries.includes(path);
    },
    async isExecutable(path: string): Promise<boolean> {
      return existingBinaries.includes(path);
    },
  };
}

describe('ServerValidator', () => {
  let trustStore: ReturnType<typeof createMockTrustStore>;
  let binaryChecker: BinaryChecker;
  let validator: ServerValidator;
  let warnCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    trustStore = createMockTrustStore();
    binaryChecker = createMockBinaryChecker(['/usr/bin/my-lsp']);
    warnCallback = vi.fn();
    validator = new ServerValidator(trustStore, binaryChecker, warnCallback);
  });

  describe('security warning', () => {
    it('shows security warning on first custom server use', async () => {
      await validator.validateCustomServer('myLang', '/usr/bin/my-lsp');

      expect(warnCallback).toHaveBeenCalled();
      const callArg = warnCallback.mock.calls[0][0] as string;
      expect(callArg.toLowerCase()).toContain('security');
    });

    it('does not show warning for already trusted servers', async () => {
      trustStore.trusted.add('myLang');

      await validator.validateCustomServer('myLang', '/usr/bin/my-lsp');

      expect(warnCallback).not.toHaveBeenCalled();
    });
  });

  describe('binary validation', () => {
    it('validates binary exists', async () => {
      const result = await validator.validateBinary('/nonexistent');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('validates binary is executable', async () => {
      const result = await validator.validateBinary('/usr/bin/my-lsp');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('full validation', () => {
    it('returns success when binary valid and trusted', async () => {
      trustStore.trusted.add('myLang');

      const result = await validator.validateCustomServer('myLang', '/usr/bin/my-lsp');

      expect(result.valid).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });

    it('returns requiresConfirmation when not trusted', async () => {
      const result = await validator.validateCustomServer('myLang', '/usr/bin/my-lsp');

      expect(result.requiresConfirmation).toBe(true);
    });

    it('returns invalid when binary not found', async () => {
      const result = await validator.validateCustomServer('myLang', '/nonexistent');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('trust confirmation', () => {
    it('marks server as trusted after confirmation', async () => {
      await validator.confirmTrust('myLang');

      expect(trustStore.trusted.has('myLang')).toBe(true);
    });

    it('does not show warning after trust confirmed', async () => {
      await validator.confirmTrust('myLang');
      warnCallback.mockClear();

      await validator.validateCustomServer('myLang', '/usr/bin/my-lsp');

      expect(warnCallback).not.toHaveBeenCalled();
    });
  });
});
