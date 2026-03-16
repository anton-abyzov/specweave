import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SuggestionEngine } from '../../../src/core/skill-gen/suggestion-engine.js';
import type { SignalStore } from '../../../src/core/skill-gen/types.js';

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

  describe('T-010: qualifying filter and single suggestion output', () => {
    it('prints exactly one suggestion for the highest-confidence qualifying signal', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [
          makeSignal({ id: 'sig-high', confidence: 0.8, pattern: 'high-pattern' }),
          makeSignal({ id: 'sig-low', confidence: 0.5, pattern: 'low-pattern', category: 'api-patterns' }),
        ],
      };
      await writeFile(signalsPath, JSON.stringify(store));

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const msg = consoleSpy.mock.calls[0][0] as string;
      expect(msg).toContain('high-pattern');
      expect(msg).toContain('/sw:skill-gen');
      expect(msg).toContain('4'); // increment count

      // Check only the high-confidence signal was marked
      const updated = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      const high = updated.signals.find((s) => s.id === 'sig-high');
      const low = updated.signals.find((s) => s.id === 'sig-low');
      expect(high!.suggested).toBe(true);
      expect(low!.suggested).toBe(false);
    });

    it('does not suggest signals below minSignalCount', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [
          makeSignal({ incrementIds: ['0001', '0002'] }), // Only 2, need 3
        ],
      };
      await writeFile(signalsPath, JSON.stringify(store));

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('T-011: suggest=false suppresses output', () => {
    it('produces no output when suggest is false', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [makeSignal()],
      };
      await writeFile(signalsPath, JSON.stringify(store));
      await writeFile(configPath, JSON.stringify({ skillGen: { suggest: false } }));

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).not.toHaveBeenCalled();

      // Signal should not be mutated
      const updated = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(updated.signals[0].suggested).toBe(false);
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
      await writeFile(signalsPath, JSON.stringify(store));
      await writeFile(
        configPath,
        JSON.stringify({ skillGen: { declinedSuggestions: ['sig-declined'] } }),
      );

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const msg = consoleSpy.mock.calls[0][0] as string;
      expect(msg).toContain('ok-pattern');
      expect(msg).not.toContain('declined-pattern');
    });
  });

  describe('T-013: additional edge cases', () => {
    it('does not suggest declined signals', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [makeSignal({ declined: true })],
      };
      await writeFile(signalsPath, JSON.stringify(store));

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('does not suggest generated signals', async () => {
      const store: SignalStore = {
        version: '1.0',
        signals: [makeSignal({ generated: true })],
      };
      await writeFile(signalsPath, JSON.stringify(store));

      const engine = new SuggestionEngine(tempDir);
      await engine.evaluate();

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('handles missing signals file gracefully', async () => {
      const engine = new SuggestionEngine(tempDir);
      await expect(engine.evaluate()).resolves.not.toThrow();
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
