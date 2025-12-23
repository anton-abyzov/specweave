import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit tests for AdapterLoader
 *
 * Tests adapter detection logic with Claude-first priority:
 * 1. Claude Code (FIRST - active indicator)
 * 2. Cursor (only if Claude unavailable - passive indicator)
 * 3. Gemini/Codex (only if Claude unavailable)
 * 4. Generic (only if explicitly requested)
 */

import { AdapterLoader } from '../../src/adapters/adapter-loader.js';
import { CursorAdapter } from '../../src/adapters/cursor/adapter.js';
import { GeminiAdapter } from '../../src/adapters/gemini/adapter.js';
import { CodexAdapter } from '../../src/adapters/codex/adapter.js';
import * as claudeCliDetector from '../../src/utils/claude-cli-detector.js';

describe('AdapterLoader', () => {
  let adapterLoader: AdapterLoader;

  beforeEach(() => {
    adapterLoader = new AdapterLoader();
  });

  describe('detectTool', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should detect Claude FIRST when Claude CLI is available (Claude-first priority)', async () => {
      // Claude CLI is available - should be detected first, regardless of other tools
      vi.spyOn(claudeCliDetector, 'detectClaudeCli').mockReturnValue({
        available: true,
        commandExists: true,
        pluginCommandsWork: true,
        version: '1.0.0',
        platform: 'darwin',
      });

      // Even if Cursor would be detected, Claude wins
      vi.spyOn(CursorAdapter.prototype, 'detect').mockResolvedValue(true);

      const detected = await adapterLoader.detectTool();

      expect(detected).toBe('claude');
    });

    it('should detect cursor only when Claude CLI is NOT available', async () => {
      // Claude CLI NOT available - fall through to other adapters
      vi.spyOn(claudeCliDetector, 'detectClaudeCli').mockReturnValue({
        available: false,
        commandExists: false,
        pluginCommandsWork: false,
        error: 'command_not_found',
        platform: 'darwin',
      });

      // Cursor detection returns true
      vi.spyOn(CursorAdapter.prototype, 'detect').mockResolvedValue(true);

      const detected = await adapterLoader.detectTool();

      expect(detected).toBe('cursor');
    });

    it('should default to claude when no tools detected (even without CLI)', async () => {
      // Claude CLI NOT available
      vi.spyOn(claudeCliDetector, 'detectClaudeCli').mockReturnValue({
        available: false,
        commandExists: false,
        pluginCommandsWork: false,
        error: 'command_not_found',
        platform: 'darwin',
      });

      // No other adapters detected - must mock ALL adapters in detection order
      vi.spyOn(CursorAdapter.prototype, 'detect').mockResolvedValue(false);
      vi.spyOn(GeminiAdapter.prototype, 'detect').mockResolvedValue(false);
      vi.spyOn(CodexAdapter.prototype, 'detect').mockResolvedValue(false);

      const detected = await adapterLoader.detectTool();

      // Claude is still the default/recommended, even without CLI
      expect(detected).toBe('claude');
    });

    it('should return claude as default and never generic unless explicit', async () => {
      // This test ensures that Claude is always the default
      // Generic is only for explicit --adapter generic flag

      const detected = await adapterLoader.detectTool();

      // Should be 'claude' (default) or 'cursor'/'copilot'/etc if detected
      // But NEVER 'generic' from auto-detection
      expect(detected).not.toBe('generic');
    });
  });

  describe('getAdapter', () => {
    it('should return cursor adapter when requested', () => {
      const adapter = adapterLoader.getAdapter('cursor');

      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe('cursor');
    });

    it('should return codex adapter when requested', () => {
      const adapter = adapterLoader.getAdapter('codex');

      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe('codex');
    });

    it('should return generic adapter when explicitly requested', () => {
      const adapter = adapterLoader.getAdapter('generic');

      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe('generic');
    });

    it('should return undefined for non-existent adapter', () => {
      const adapter = adapterLoader.getAdapter('nonexistent');

      expect(adapter).toBeUndefined();
    });
  });

  describe('getRecommendedAdapter', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return null when Claude is detected (native, no adapter needed)', async () => {
      // Mock Claude detection to return available
      vi.spyOn(claudeCliDetector, 'detectClaudeCli').mockReturnValue({
        available: true,
        commandExists: true,
        pluginCommandsWork: true,
        version: '1.0.0',
        platform: 'darwin',
      });

      const adapter = await adapterLoader.getRecommendedAdapter();

      // Claude is native - returns null (no adapter needed)
      expect(adapter).toBeNull();
    });

    it('should return null when claude is explicitly chosen', async () => {
      const adapter = await adapterLoader.getRecommendedAdapter('claude');

      // Explicit 'claude' choice = native experience, no adapter
      expect(adapter).toBeNull();
    });

    it('should return cursor adapter when explicitly chosen', async () => {
      const adapter = await adapterLoader.getRecommendedAdapter('cursor');

      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe('cursor');
    });

    it('should return generic adapter when explicitly chosen', async () => {
      const adapter = await adapterLoader.getRecommendedAdapter('generic');

      expect(adapter).toBeDefined();
      expect(adapter?.name).toBe('generic');
    });

    it('should throw error for invalid adapter name', async () => {
      await expect(
        adapterLoader.getRecommendedAdapter('invalid')
      ).rejects.toThrow('Invalid adapter');
    });
  });

  describe('getAllAdapters', () => {
    it('should return all available adapters', () => {
      const adapters = adapterLoader.getAllAdapters();

      expect(adapters.length).toBeGreaterThan(0);
      expect(adapters.some(a => a.name === 'cursor')).toBe(true);
      expect(adapters.some(a => a.name === 'codex')).toBe(true);
      expect(adapters.some(a => a.name === 'gemini')).toBe(true);
      expect(adapters.some(a => a.name === 'generic')).toBe(true);
    });

    it('should NOT include claude as an adapter', () => {
      const adapters = adapterLoader.getAllAdapters();

      // Claude is native, not an adapter
      expect(adapters.some(a => a.name === 'claude')).toBe(false);
    });
  });
});
