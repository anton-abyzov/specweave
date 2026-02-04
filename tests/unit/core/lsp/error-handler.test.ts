/**
 * Tests for LspErrorHandler
 * TDD Phase: RED - Tests written before implementation
 *
 * @see spec.md US-007: Error Handling
 * @satisfies AC-US7-01, AC-US7-02
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LspErrorHandler,
  ErrorHandlerResult,
  GrepFallback,
} from '../../../../src/core/lsp/error-handler.js';

/**
 * Mock grep fallback for testing
 */
function createMockGrep(): GrepFallback {
  return {
    search: vi.fn().mockResolvedValue([
      { file: 'test.ts', line: 10, match: 'function myFunc' },
    ]),
  };
}

describe('LspErrorHandler', () => {
  let grepFallback: GrepFallback;
  let handler: LspErrorHandler;

  beforeEach(() => {
    grepFallback = createMockGrep();
    handler = new LspErrorHandler(grepFallback);
  });

  describe('fail-fast behavior', () => {
    it('fails fast without retry', async () => {
      const error = new Error('LSP timeout');

      const result = await handler.handle(error);

      expect(result.retried).toBe(false);
    });

    it('returns error message immediately', async () => {
      const error = new Error('Connection refused');

      const result = await handler.handle(error);

      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Connection refused');
    });
  });

  describe('grep fallback', () => {
    it('falls back to grep on crash', async () => {
      const error = new Error('LSP process crashed');

      const result = await handler.handle(error, {
        enableFallback: true,
        searchPattern: 'myFunc',
        searchPath: '/project',
      });

      expect(grepFallback.search).toHaveBeenCalled();
      expect(result.usedFallback).toBe(true);
    });

    it('includes fallback results', async () => {
      const error = new Error('LSP process crashed');

      const result = await handler.handle(error, {
        enableFallback: true,
        searchPattern: 'myFunc',
        searchPath: '/project',
      });

      expect(result.fallbackResults).toBeDefined();
      expect(result.fallbackResults?.length).toBeGreaterThan(0);
    });

    it('does not use fallback when disabled', async () => {
      const error = new Error('LSP timeout');

      const result = await handler.handle(error, {
        enableFallback: false,
      });

      expect(grepFallback.search).not.toHaveBeenCalled();
      expect(result.usedFallback).toBe(false);
    });
  });

  describe('error formatting', () => {
    it('formats timeout errors with user-friendly message', async () => {
      const error = new Error('ETIMEDOUT');

      const result = await handler.handle(error);

      expect(result.errorMessage).toContain('timed out');
    });

    it('formats connection errors with user-friendly message', async () => {
      const error = new Error('ECONNREFUSED');

      const result = await handler.handle(error);

      expect(result.errorMessage).toContain('connect');
    });

    it('formats crash errors with suggestion', async () => {
      const error = new Error('LSP server crashed');

      const result = await handler.handle(error);

      expect(result.suggestion).toBeDefined();
    });
  });

  describe('error types', () => {
    it('identifies timeout errors', async () => {
      const error = new Error('Operation timed out');

      const result = await handler.handle(error);

      expect(result.errorType).toBe('timeout');
    });

    it('identifies crash errors', async () => {
      const error = new Error('Process exited with code 1');

      const result = await handler.handle(error);

      expect(result.errorType).toBe('crash');
    });

    it('identifies connection errors', async () => {
      const error = new Error('ECONNREFUSED');

      const result = await handler.handle(error);

      expect(result.errorType).toBe('connection');
    });
  });
});
