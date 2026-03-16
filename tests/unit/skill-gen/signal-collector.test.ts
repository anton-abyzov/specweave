import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SignalCollector } from '../../../src/core/skill-gen/signal-collector.js';
import type { SignalStore } from '../../../src/core/skill-gen/types.js';

describe('SignalCollector', () => {
  let tempDir: string;
  let stateDir: string;
  let docsDir: string;
  let signalsPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-signal-'));
    stateDir = join(tempDir, '.specweave', 'state');
    docsDir = join(tempDir, '.specweave', 'docs', 'internal');
    signalsPath = join(stateDir, 'skill-signals.json');
    await mkdir(stateDir, { recursive: true });
    await mkdir(docsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('T-003: initialise signals file on first run', () => {
    it('creates skill-signals.json with empty store when file does not exist', async () => {
      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      const content = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(content.version).toBe('1.0');
      expect(content.signals).toEqual([]);
    });

    it('resolves without throwing when docs dir is empty', async () => {
      const collector = new SignalCollector(tempDir);
      await expect(collector.collect('0001-test')).resolves.not.toThrow();
    });
  });

  describe('T-004: read living docs and extract patterns', () => {
    it('detects patterns from module overview files', async () => {
      const reposDir = join(docsDir, 'repos', 'my-app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(
        join(reposDir, 'overview.md'),
        `# My App\n\n## Patterns\n\nThis module uses consistent error-handling with try/catch boundaries.\nAll API routes follow the same error-handling middleware pattern.\nError boundaries are used extensively in React components.\n`,
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(store.signals.length).toBeGreaterThan(0);
      const errorSignal = store.signals.find((s) => s.category === 'error-handling');
      expect(errorSignal).toBeDefined();
      expect(errorSignal!.evidence.length).toBeGreaterThan(0);
    });
  });

  describe('T-005: create new signal entry', () => {
    it('creates a new signal with correct initial fields', async () => {
      const reposDir = join(docsDir, 'repos', 'my-app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(
        join(reposDir, 'overview.md'),
        `# API Patterns\n\nAll endpoints use consistent validation with Zod schemas.\nZod validation is applied at every API boundary.\nThe API pattern uses Zod for request/response validation.\n`,
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      const signal = store.signals.find((s) => s.category === 'api-patterns');
      expect(signal).toBeDefined();
      expect(signal!.incrementIds).toEqual(['0001-test']);
      expect(signal!.confidence).toBeCloseTo(0.33, 1);
      expect(signal!.suggested).toBe(false);
      expect(signal!.declined).toBe(false);
      expect(signal!.generated).toBe(false);
      expect(signal!.firstSeen).toBeTruthy();
      expect(signal!.lastSeen).toBeTruthy();
    });
  });

  describe('T-006: update existing signal entry', () => {
    it('appends increment ID and refreshes lastSeen on existing signal', async () => {
      // Seed existing signal
      const existingStore: SignalStore = {
        version: '1.0',
        signals: [
          {
            id: 'sig-error-handling',
            pattern: 'error-handling-pattern',
            category: 'error-handling',
            description: 'Consistent error handling',
            incrementIds: ['0001-x'],
            firstSeen: '2026-03-10T00:00:00.000Z',
            lastSeen: '2026-03-10T00:00:00.000Z',
            confidence: 0.33,
            evidence: ['repos/my-app/overview.md'],
            suggested: false,
            declined: false,
            generated: false,
          },
        ],
      };
      await writeFile(signalsPath, JSON.stringify(existingStore));

      // Create docs with error-handling pattern
      const reposDir = join(docsDir, 'repos', 'my-app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(
        join(reposDir, 'overview.md'),
        `# Patterns\n\nError-handling is used consistently with try/catch blocks.\nAll error boundaries follow the same pattern.\nError middleware wraps every route.\n`,
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0002-y');

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(store.signals.length).toBe(1); // No duplicate
      const signal = store.signals[0];
      expect(signal.incrementIds).toEqual(['0001-x', '0002-y']);
      expect(signal.lastSeen).not.toBe('2026-03-10T00:00:00.000Z');
    });

    it('does not add duplicate increment ID', async () => {
      const existingStore: SignalStore = {
        version: '1.0',
        signals: [
          {
            id: 'sig-error-handling',
            pattern: 'error-handling-pattern',
            category: 'error-handling',
            description: 'Consistent error handling',
            incrementIds: ['0001-x'],
            firstSeen: '2026-03-10T00:00:00.000Z',
            lastSeen: '2026-03-10T00:00:00.000Z',
            confidence: 0.33,
            evidence: ['repos/my-app/overview.md'],
            suggested: false,
            declined: false,
            generated: false,
          },
        ],
      };
      await writeFile(signalsPath, JSON.stringify(existingStore));

      const reposDir = join(docsDir, 'repos', 'my-app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(
        join(reposDir, 'overview.md'),
        `# Patterns\n\nError-handling is consistent with try/catch.\nError boundaries wrap components.\nError middleware wraps every route.\n`,
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-x'); // Same increment

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(store.signals[0].incrementIds).toEqual(['0001-x']); // No duplicate
    });
  });

  describe('T-007: error isolation and corrupted file recovery', () => {
    it('recovers from corrupted signals file', async () => {
      await writeFile(signalsPath, '{invalid json!!!');

      const collector = new SignalCollector(tempDir);
      await expect(collector.collect('0001-test')).resolves.not.toThrow();

      // Check backup created
      const backup = await readFile(signalsPath + '.bak', 'utf-8');
      expect(backup).toBe('{invalid json!!!');

      // Check fresh file created
      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(store.version).toBe('1.0');
      expect(store.signals).toEqual([]);
    });

    it('resolves without throwing when living docs are unreadable', async () => {
      // Remove docs dir entirely
      await rm(docsDir, { recursive: true, force: true });

      const collector = new SignalCollector(tempDir);
      await expect(collector.collect('0001-test')).resolves.not.toThrow();
    });
  });

  describe('T-008: cap at maxSignals, prune lowest-confidence', () => {
    it('prunes lowest-confidence signal when at capacity', async () => {
      // Create store with 100 entries
      const signals = Array.from({ length: 100 }, (_, i) => ({
        id: `sig-${i}`,
        pattern: `pattern-${i}`,
        category: `category-${i}`,
        description: `Pattern ${i}`,
        incrementIds: [`inc-${i}`],
        firstSeen: '2026-03-10T00:00:00.000Z',
        lastSeen: '2026-03-10T00:00:00.000Z',
        confidence: (i + 1) / 100, // 0.01 to 1.0
        evidence: [`file-${i}.md`],
        suggested: false,
        declined: false,
        generated: false,
      }));
      const existingStore: SignalStore = { version: '1.0', signals };
      await writeFile(signalsPath, JSON.stringify(existingStore));

      // Create docs that trigger a new pattern
      const reposDir = join(docsDir, 'repos', 'new-app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(
        join(reposDir, 'overview.md'),
        `# New Pattern\n\nAuthentication uses JWT tokens consistently.\nAuth patterns are uniform across all services.\nAuthentication middleware follows the same auth-patterns.\n`,
      );

      const collector = new SignalCollector(tempDir, { maxSignals: 100 });
      await collector.collect('0200-new');

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(store.signals.length).toBeLessThanOrEqual(100);
      // Lowest confidence (sig-0, confidence 0.01) should be pruned
      expect(store.signals.find((s) => s.id === 'sig-0')).toBeUndefined();
    });
  });
});
