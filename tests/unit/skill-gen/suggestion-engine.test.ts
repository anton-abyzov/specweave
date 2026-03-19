import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SignalStore } from '../../../src/core/skill-gen/types.js';

// Track calls to shared utils
const mockLoadSignalStore = vi.fn();
const mockSaveSignalStore = vi.fn();

vi.mock('../../../src/core/skill-gen/utils.js', async () => {
  const actual = await vi.importActual<typeof import('../../../src/core/skill-gen/utils.js')>(
    '../../../src/core/skill-gen/utils.js',
  );
  return {
    ...actual,
    loadSignalStore: mockLoadSignalStore,
    saveSignalStore: mockSaveSignalStore,
  };
});

// Must import AFTER vi.mock
const { SuggestionEngine } = await import('../../../src/core/skill-gen/suggestion-engine.js');

describe('SuggestionEngine', () => {
  let tempDir: string;
  let stateDir: string;
  let signalsPath: string;
  let configPath: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-suggest-'));
    stateDir = join(tempDir, '.specweave', 'state');
    signalsPath = join(stateDir, 'skill-signals.json');
    configPath = join(tempDir, '.specweave', 'config.json');
    await mkdir(stateDir, { recursive: true });
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockLoadSignalStore.mockReset();
    mockSaveSignalStore.mockReset();
    mockSaveSignalStore.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  function makeSignal(overrides: Partial<import('../../../src/core/skill-gen/types.js').SignalEntry> = {}) {
    return {
      id: 'sig-test',
      pattern: 'test-pattern',
      category: 'testing-patterns',
      description: 'Test pattern',
      incrementIds: ['0001', '0002', '0003', '0004'],
      firstSeen: '2026-03-10T00:00:00.000Z',
      lastSeen: '2026-03-15T00:00:00.000Z',
      confidence: 0.8,
      evidence: ['file.md'],
      suggested: false,
      declined: false,
      generated: false,
      ...overrides,
    };
  }

  describe('T-006: uses shared loadSignalStore and saveSignalStore', () => {
    it('calls loadSignalStore from utils.ts during evaluate', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [makeSignal()],
      };
      mockLoadSignalStore.mockResolvedValue(store);

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(mockLoadSignalStore).toHaveBeenCalledTimes(1);
      expect(mockLoadSignalStore).toHaveBeenCalledWith(
        expect.stringContaining('skill-signals.json'),
      );
    });

    it('calls saveSignalStore from utils.ts when marking as suggested', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [makeSignal()],
      };
      mockLoadSignalStore.mockResolvedValue(store);

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(mockSaveSignalStore).toHaveBeenCalledTimes(1);
      expect(mockSaveSignalStore).toHaveBeenCalledWith(
        expect.stringContaining('skill-signals.json'),
        expect.objectContaining({
          signals: expect.arrayContaining([
            expect.objectContaining({ suggested: true }),
          ]),
        }),
      );
    });
  });

  describe('T-006: file-based confidence qualifying filter', () => {
    it('qualifies signal with 3 uniqueSourceFiles when minCount is 3', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [
          makeSignal({
            incrementIds: ['0001'], // Only 1 increment — would fail old filter
            uniqueSourceFiles: ['a.md', 'b.md', 'c.md'], // 3 files — qualifies
          }),
        ],
      };
      mockLoadSignalStore.mockResolvedValue(store);

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain('test-pattern');
    });

    it('does not qualify signal with 2 uniqueSourceFiles when minCount is 3', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [
          makeSignal({
            incrementIds: ['0001'],
            uniqueSourceFiles: ['a.md', 'b.md'], // Only 2 — does not qualify
          }),
        ],
      };
      mockLoadSignalStore.mockResolvedValue(store);

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('falls back to incrementIds.length when uniqueSourceFiles is undefined (backward compat)', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [
          makeSignal({
            incrementIds: ['0001', '0002', '0003'], // 3 increments — qualifies via fallback
            // no uniqueSourceFiles — undefined
          }),
        ],
      };
      mockLoadSignalStore.mockResolvedValue(store);

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('does not qualify signal without uniqueSourceFiles and only 2 incrementIds', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [
          makeSignal({
            incrementIds: ['0001', '0002'], // Only 2 — fails fallback too
          }),
        ],
      };
      mockLoadSignalStore.mockResolvedValue(store);

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('T-010: qualifying filter and single suggestion output', () => {
    it('prints exactly one suggestion for the highest-confidence qualifying signal', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [
          makeSignal({ id: 'sig-high', confidence: 0.8, pattern: 'high-pattern' }),
          makeSignal({ id: 'sig-low', confidence: 0.5, pattern: 'low-pattern', category: 'api-patterns' }),
        ],
      };
      mockLoadSignalStore.mockResolvedValue(store);

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const msg = consoleSpy.mock.calls[0][0] as string;
      expect(msg).toContain('high-pattern');
      expect(msg).toContain('sw:skill-gen');
    });
  });

  describe('T-011: suggest=false suppresses output', () => {
    it('produces no output when suggest is false', async () => {
      await writeFile(configPath, JSON.stringify({ skillGen: { suggest: false } }));
      mockLoadSignalStore.mockResolvedValue({
        version: '1.0',
        signals: [makeSignal()],
      });

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('T-012: declinedSuggestions config exclusion', () => {
    it('excludes declined pattern IDs from suggestions', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [
          makeSignal({ id: 'sig-declined', confidence: 0.9, pattern: 'declined-pattern' }),
          makeSignal({ id: 'sig-ok', confidence: 0.7, pattern: 'ok-pattern', category: 'api-patterns' }),
        ],
      };
      mockLoadSignalStore.mockResolvedValue(store);
      await writeFile(
        configPath,
        JSON.stringify({ skillGen: { declinedSuggestions: ['sig-declined'] } }),
      );

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const msg = consoleSpy.mock.calls[0][0] as string;
      expect(msg).toContain('ok-pattern');
    });
  });

  describe('T-013: additional edge cases', () => {
    it('does not suggest declined signals', async () => {
      mockLoadSignalStore.mockResolvedValue({
        version: '1.0',
        signals: [makeSignal({ declined: true })],
      });

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('does not suggest generated signals', async () => {
      mockLoadSignalStore.mockResolvedValue({
        version: '1.0',
        signals: [makeSignal({ generated: true })],
      });

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('handles null store gracefully', async () => {
      mockLoadSignalStore.mockResolvedValue(null);

      const engine = new SuggestionEngine(tempDir);
      await expect(engine.evaluate()).resolves.not.toThrow();
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
