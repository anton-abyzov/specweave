import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SignalStore } from '../../../src/core/skill-gen/types.js';
import type { LLMPatternResponse } from '../../../src/core/skill-gen/types.js';

// ── Mocks (vi.hoisted + vi.mock for ESM) ────────────────────────────

const mocks = vi.hoisted(() => {
  const mockAnalyzeStructured = vi.fn();
  const mockProvider = {
    name: 'anthropic' as const,
    defaultModel: 'haiku',
    analyze: vi.fn(),
    analyzeStructured: mockAnalyzeStructured,
    estimateCost: vi.fn().mockReturnValue(0),
    isAvailable: vi.fn().mockResolvedValue(true),
    getStatus: vi.fn().mockResolvedValue({ available: true }),
  };

  return {
    mockProvider,
    mockAnalyzeStructured,
    mockLoadLLMConfig: vi.fn().mockReturnValue({ provider: 'anthropic', model: 'haiku' }),
    mockCreateProvider: vi.fn().mockResolvedValue(mockProvider),
    mockHasLLMConfig: vi.fn().mockReturnValue(true),
  };
});

vi.mock('../../../src/core/llm/provider-factory.js', () => ({
  loadLLMConfig: mocks.mockLoadLLMConfig,
  createProvider: mocks.mockCreateProvider,
  hasLLMConfig: mocks.mockHasLLMConfig,
}));

import { SignalCollector } from '../../../src/core/skill-gen/signal-collector.js';

// ── Helpers ──────────────────────────────────────────────────────────

function makeLLMResponse(patterns: LLMPatternResponse['patterns']) {
  return {
    data: { patterns },
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    estimatedCost: 0.001,
  };
}

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

    // Reset mocks
    vi.clearAllMocks();
    mocks.mockLoadLLMConfig.mockReturnValue({ provider: 'anthropic', model: 'haiku' });
    mocks.mockCreateProvider.mockResolvedValue(mocks.mockProvider);
    mocks.mockHasLLMConfig.mockReturnValue(true);
    mocks.mockAnalyzeStructured.mockResolvedValue(
      makeLLMResponse([]),
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ── T-003: Rewrite signal-collector.ts ─────────────────────────────

  describe('T-003: LLM-based detection and updated upsertSignal', () => {
    it('sends <documents> block with file paths and contents to analyzeStructured', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'auth.md'), '# Auth Module\nUses JWT tokens.');

      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'auth', name: 'jwt-pattern', description: 'Uses JWT tokens', evidence: ['ref1'] },
        ]),
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      expect(mocks.mockAnalyzeStructured).toHaveBeenCalledTimes(1);
      const prompt = mocks.mockAnalyzeStructured.mock.calls[0][0] as string;
      expect(prompt).toContain('<documents>');
      expect(prompt).toContain('auth.md');
      expect(prompt).toContain('Uses JWT tokens.');
    });

    it('stores patterns with sanitized strings (control chars stripped, ≤200)', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'test.md'), '# Test');

      const longDesc = 'x'.repeat(300);
      const dirtyName = 'pattern\x00with\x01control';
      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'testing', name: dirtyName, description: longDesc, evidence: ['ev1'] },
        ]),
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      const signal = store.signals.find(s => s.category === 'testing');
      expect(signal).toBeDefined();
      expect(signal!.pattern).toBe('patternwithcontrol');
      expect(signal!.description.length).toBeLessThanOrEqual(200);
      expect(signal!.description).not.toContain('\x00');
    });

    it('updates uniqueSourceFiles using Set semantics (no duplicates)', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'auth.md'), '# Auth');

      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'auth', name: 'jwt', description: 'JWT', evidence: ['auth.md'] },
        ]),
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-a');
      await collector.collect('0001-b'); // Same files, should not duplicate

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      const signal = store.signals.find(s => s.category === 'auth');
      expect(signal).toBeDefined();
      // uniqueSourceFiles should have deduplicated entries
      const unique = signal!.uniqueSourceFiles ?? [];
      const uniqueSet = new Set(unique);
      expect(unique.length).toBe(uniqueSet.size);
    });

    it('confidence = uniqueSourceFiles.length / minSignalCount capped at 1.0', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      // Create 5 files to get 5 unique source files
      for (let i = 0; i < 5; i++) {
        await writeFile(join(specsDir, `doc-${i}.md`), `# Doc ${i}\nContent.`);
      }

      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'arch', name: 'layered', description: 'Layered arch', evidence: ['ev1'] },
        ]),
      );

      const collector = new SignalCollector(tempDir, { minSignalCount: 3 });
      await collector.collect('0001-test');

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      const signal = store.signals.find(s => s.category === 'arch');
      expect(signal).toBeDefined();
      // With 5 source files and minSignalCount=3, confidence should be capped at 1.0
      expect(signal!.confidence).toBeLessThanOrEqual(1.0);
      expect(signal!.confidence).toBeGreaterThan(0);
    });

    it('caps evidence arrays at 20 via capEvidence', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'test.md'), '# Test');

      const manyEvidence = Array.from({ length: 30 }, (_, i) => `evidence-${i}`);
      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'testing', name: 'big', description: 'Lots of evidence', evidence: manyEvidence },
        ]),
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      const signal = store.signals.find(s => s.category === 'testing');
      expect(signal).toBeDefined();
      expect(signal!.evidence.length).toBeLessThanOrEqual(20);
    });

    it('skips with warning when no LLM config found', async () => {
      mocks.mockHasLLMConfig.mockReturnValue(false);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'test.md'), '# Test');

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      expect(mocks.mockAnalyzeStructured).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No LLM config'));

      warnSpy.mockRestore();
    });

    it('catches analyzeStructured rejection, logs warning, no exception', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'test.md'), '# Test');

      mocks.mockAnalyzeStructured.mockRejectedValue(new Error('LLM timeout'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const collector = new SignalCollector(tempDir);
      await expect(collector.collect('0001-test')).resolves.not.toThrow();

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('creates empty store when docs dir has no markdown files', async () => {
      // docsDir exists but is empty
      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      // Should not call LLM when no files found
      expect(mocks.mockAnalyzeStructured).not.toHaveBeenCalled();
    });

    it('prunes lowest-confidence signals when store exceeds maxSignals', async () => {
      const signals = Array.from({ length: 100 }, (_, i) => ({
        id: `sig-${i}`,
        pattern: `pattern-${i}`,
        category: `category-${i}`,
        description: `Pattern ${i}`,
        incrementIds: [`inc-${i}`],
        firstSeen: '2026-03-10T00:00:00.000Z',
        lastSeen: '2026-03-10T00:00:00.000Z',
        confidence: (i + 1) / 100,
        evidence: [`file-${i}.md`],
        suggested: false,
        declined: false,
        generated: false,
      }));
      await writeFile(signalsPath, JSON.stringify({ version: '1.0', signals }));

      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'new.md'), '# New Pattern');

      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'new-cat', name: 'new-pattern', description: 'Brand new', evidence: ['new.md'] },
        ]),
      );

      const collector = new SignalCollector(tempDir, { maxSignals: 100 });
      await collector.collect('0200-new');

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(store.signals.length).toBeLessThanOrEqual(100);
    });
  });

  // ── T-004: Batched LLM chunking ───────────────────────────────────

  describe('T-004: batched LLM chunking for docs exceeding TOKEN_BUDGET', () => {
    it('calls analyzeStructured twice when 3 docs exceed 50K budget', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });

      // Each doc ~20K tokens = ~80K chars (estimateTokenCount = ceil(chars/4))
      const bigContent = 'x'.repeat(80000);
      await writeFile(join(specsDir, 'doc1.md'), bigContent);
      await writeFile(join(specsDir, 'doc2.md'), bigContent);
      await writeFile(join(specsDir, 'doc3.md'), bigContent);

      let callCount = 0;
      mocks.mockAnalyzeStructured.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return makeLLMResponse([
            { category: 'pattern-a', name: 'a', description: 'A', evidence: ['ev-a'] },
          ]);
        }
        return makeLLMResponse([
          { category: 'pattern-b', name: 'b', description: 'B', evidence: ['ev-b'] },
        ]);
      });

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      // 3 docs at ~20K each = 60K > 50K budget → needs at least 2 calls
      expect(mocks.mockAnalyzeStructured).toHaveBeenCalledTimes(2);

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      const categories = store.signals.map(s => s.category);
      expect(categories).toContain('pattern-a');
      expect(categories).toContain('pattern-b');
    });

    it('makes single call when total tokens ≤ TOKEN_BUDGET', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });

      // Small docs well under budget
      await writeFile(join(specsDir, 'small.md'), '# Small doc\nNot much here.');

      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'small-cat', name: 'small', description: 'Small', evidence: ['ev'] },
        ]),
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      expect(mocks.mockAnalyzeStructured).toHaveBeenCalledTimes(1);
    });

    it('deduplicates merged results by category + name', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });

      const bigContent = 'x'.repeat(80000);
      await writeFile(join(specsDir, 'doc1.md'), bigContent);
      await writeFile(join(specsDir, 'doc2.md'), bigContent);
      await writeFile(join(specsDir, 'doc3.md'), bigContent);

      // Both chunks return the same pattern → should deduplicate
      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'shared', name: 'dup-pattern', description: 'Same pattern', evidence: ['ev'] },
        ]),
      );

      const collector = new SignalCollector(tempDir);
      await collector.collect('0001-test');

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      const shared = store.signals.filter(s => s.category === 'shared' && s.pattern === 'dup-pattern');
      expect(shared.length).toBe(1);
    });
  });

  // ── T-007: Instant Seed Mode ──────────────────────────────────────

  describe('T-007: collectSeed()', () => {
    it('scans all living docs via single batched LLM call', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'auth.md'), '# Auth\nJWT pattern.');
      await writeFile(join(specsDir, 'api.md'), '# API\nREST patterns.');

      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'auth', name: 'jwt', description: 'JWT auth', evidence: ['auth.md'] },
          { category: 'api', name: 'rest', description: 'REST API', evidence: ['api.md'] },
        ]),
      );

      const collector = new SignalCollector(tempDir);
      await collector.collectSeed();

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(store.signals.length).toBe(2);
      // Seed signals have no incrementIds
      for (const sig of store.signals) {
        expect(sig.incrementIds).toEqual([]);
      }
    });

    it('deduplicates against existing store by category + name', async () => {
      // Pre-populate store with existing signal
      const existing: SignalStore = {
        version: '1.0',
        signals: [
          {
            id: 'sig-auth-jwt',
            pattern: 'jwt',
            category: 'auth',
            description: 'Existing JWT pattern',
            incrementIds: ['0001-x'],
            firstSeen: '2026-03-10T00:00:00.000Z',
            lastSeen: '2026-03-10T00:00:00.000Z',
            confidence: 0.5,
            evidence: ['old-ev'],
            suggested: false,
            declined: false,
            generated: false,
          },
        ],
      };
      await writeFile(signalsPath, JSON.stringify(existing));

      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'auth.md'), '# Auth');

      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'auth', name: 'jwt', description: 'JWT pattern from seed', evidence: ['auth.md'] },
          { category: 'api', name: 'rest', description: 'New REST', evidence: ['api.md'] },
        ]),
      );

      const collector = new SignalCollector(tempDir);
      await collector.collectSeed();

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      // Existing auth/jwt should NOT be duplicated, only api/rest added
      const authSignals = store.signals.filter(s => s.category === 'auth' && s.pattern === 'jwt');
      expect(authSignals.length).toBe(1);
      // The existing one should be preserved (not overwritten)
      expect(authSignals[0].description).toBe('Existing JWT pattern');

      // New pattern should be added
      const apiSignal = store.signals.find(s => s.category === 'api');
      expect(apiSignal).toBeDefined();
    });

    it('sets firstSeen to current ISO timestamp for new seed signals', async () => {
      const specsDir = join(docsDir, 'specs');
      await mkdir(specsDir, { recursive: true });
      await writeFile(join(specsDir, 'test.md'), '# Test');

      const fakeNow = '2026-03-16T12:00:00.000Z';
      vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(fakeNow);

      mocks.mockAnalyzeStructured.mockResolvedValue(
        makeLLMResponse([
          { category: 'testing', name: 'bdd', description: 'BDD testing', evidence: ['test.md'] },
        ]),
      );

      const collector = new SignalCollector(tempDir);
      await collector.collectSeed();

      const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
      expect(store.signals[0].firstSeen).toBe(fakeNow);

      vi.restoreAllMocks();
    });

    it('makes zero analyzeStructured calls on empty docs directory', async () => {
      // docsDir exists but is empty
      const collector = new SignalCollector(tempDir);
      await collector.collectSeed();

      expect(mocks.mockAnalyzeStructured).not.toHaveBeenCalled();
    });
  });
});
