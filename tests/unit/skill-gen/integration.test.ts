import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { SignalStore, LLMPatternResponse } from '../../../src/core/skill-gen/types.js';
import { SignalStoreSchema } from '../../../src/core/skill-gen/utils.js';

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
import { SuggestionEngine } from '../../../src/core/skill-gen/suggestion-engine.js';

// ── Fixture paths ───────────────────────────────────────────────────

const FIXTURES_DIR = join(__dirname, 'fixtures');
const TS_FIXTURE = join(FIXTURES_DIR, 'typescript-project');
const PY_FIXTURE = join(FIXTURES_DIR, 'python-ml-project');

// ── Helpers ─────────────────────────────────────────────────────────

function makeLLMResponse(patterns: LLMPatternResponse['patterns']) {
  return {
    data: { patterns },
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    estimatedCost: 0.001,
  };
}

const TS_PATTERNS: LLMPatternResponse['patterns'] = [
  {
    category: 'error-handling',
    name: 'error-boundary-pattern',
    description: 'React error boundaries with Sentry logging for cascading failure prevention',
    evidence: ['overview.md'],
  },
  {
    category: 'testing',
    name: 'three-tier-testing-pyramid',
    description: 'Vitest unit + Supertest integration + Playwright E2E testing strategy',
    evidence: ['architecture.md'],
  },
  {
    category: 'architecture',
    name: 'layered-module-structure',
    description: 'Domain/infra/api/ui layered architecture with barrel exports',
    evidence: ['architecture.md', 'overview.md'],
  },
];

const PY_PATTERNS: LLMPatternResponse['patterns'] = [
  {
    category: 'data-pipeline',
    name: 'pandas-preprocessing',
    description: 'Pandas-based data preprocessing pipeline with Pandera validation',
    evidence: ['overview.md'],
  },
  {
    category: 'model-training',
    name: 'mlflow-experiment-tracking',
    description: 'MLflow-managed training workflow with hyperparameter tuning and model registry',
    evidence: ['model-training.md'],
  },
];

// ── Tests ───────────────────────────────────────────────────────────

describe('T-008: Integration tests — full pipeline with fixtures', () => {
  let tempDir: string;
  let stateDir: string;
  let docsDir: string;
  let signalsPath: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-integration-'));
    stateDir = join(tempDir, '.specweave', 'state');
    docsDir = join(tempDir, '.specweave', 'docs', 'internal');
    signalsPath = join(stateDir, 'skill-signals.json');
    await mkdir(stateDir, { recursive: true });
    await mkdir(docsDir, { recursive: true });

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset mocks
    vi.clearAllMocks();
    mocks.mockLoadLLMConfig.mockReturnValue({ provider: 'anthropic', model: 'haiku' });
    mocks.mockCreateProvider.mockResolvedValue(mocks.mockProvider);
    mocks.mockHasLLMConfig.mockReturnValue(true);
    mocks.mockAnalyzeStructured.mockResolvedValue(makeLLMResponse([]));

    // Re-apply spies after clearAllMocks
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  // ── Scenario 1: TypeScript project full pipeline ──────────────────

  describe('Scenario 1: TypeScript project full pipeline', () => {
    beforeEach(async () => {
      // Copy TypeScript fixture docs into temp docs dir
      await cp(TS_FIXTURE, docsDir, { recursive: true });

      // Mock LLM to return TypeScript-appropriate patterns
      mocks.mockAnalyzeStructured.mockResolvedValue(makeLLMResponse(TS_PATTERNS));
    });

    it('collects signals with correct categories from TypeScript fixture', async () => {
      const collector = new SignalCollector(tempDir);
      await collector.collect('inc-001');

      const store: SignalStore = JSON.parse(await readFile(signalsPath, 'utf-8'));
      const categories = store.signals.map(s => s.category);

      expect(categories).toContain('error-handling');
      expect(categories).toContain('testing');
      expect(categories).toContain('architecture');
    });

    it('builds confidence across 3 collect calls', async () => {
      const collector = new SignalCollector(tempDir, { minSignalCount: 3 });

      await collector.collect('inc-001');
      await collector.collect('inc-002');
      await collector.collect('inc-003');

      const store: SignalStore = JSON.parse(await readFile(signalsPath, 'utf-8'));

      // Each signal should have 3 increment IDs
      for (const signal of store.signals) {
        expect(signal.incrementIds).toHaveLength(3);
        expect(signal.incrementIds).toEqual(['inc-001', 'inc-002', 'inc-003']);
      }

      // uniqueSourceFiles populated from docs in the temp dir
      for (const signal of store.signals) {
        expect(signal.uniqueSourceFiles).toBeDefined();
        expect(signal.uniqueSourceFiles!.length).toBeGreaterThan(0);
      }
    });

    it('triggers suggestion for highest-confidence signal after 3 collects', async () => {
      const collector = new SignalCollector(tempDir, { minSignalCount: 3 });
      const engine = new SuggestionEngine(tempDir);

      // Write config to enable suggestions with minSignalCount=3
      await writeFile(
        join(tempDir, '.specweave', 'config.json'),
        JSON.stringify({ skillGen: { suggest: true, minSignalCount: 3 } }),
      );

      await collector.collect('inc-001');
      await collector.collect('inc-002');
      await collector.collect('inc-003');

      await engine.evaluate();

      // Suggestion should have been printed
      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls.map(c => String(c[0]));
      const suggestionMsg = logCalls.find(m => m.includes('sw:skill-gen'));
      expect(suggestionMsg).toBeDefined();
    });

    it('persists a valid skill-signals.json that passes SignalStoreSchema', async () => {
      const collector = new SignalCollector(tempDir);
      await collector.collect('inc-001');

      const raw = JSON.parse(await readFile(signalsPath, 'utf-8'));
      const parsed = SignalStoreSchema.parse(raw);

      expect(parsed.version).toBe('1.0');
      expect(parsed.signals.length).toBe(3);
    });

    it('sends <documents> block to analyzeStructured with fixture content', async () => {
      const collector = new SignalCollector(tempDir);
      await collector.collect('inc-001');

      expect(mocks.mockAnalyzeStructured).toHaveBeenCalledTimes(1);
      const prompt = mocks.mockAnalyzeStructured.mock.calls[0][0] as string;
      expect(prompt).toContain('<documents>');
      expect(prompt).toContain('overview.md');
      expect(prompt).toContain('architecture.md');
      expect(prompt).toContain('api-spec.md');
    });
  });

  // ── Scenario 2: Python ML project ────────────────────────────────

  describe('Scenario 2: Python ML project', () => {
    beforeEach(async () => {
      await cp(PY_FIXTURE, docsDir, { recursive: true });
      mocks.mockAnalyzeStructured.mockResolvedValue(makeLLMResponse(PY_PATTERNS));
    });

    it('collects non-web categories (data-pipeline, model-training)', async () => {
      const collector = new SignalCollector(tempDir);
      await collector.collect('inc-001');

      const store: SignalStore = JSON.parse(await readFile(signalsPath, 'utf-8'));
      const categories = store.signals.map(s => s.category);

      expect(categories).toContain('data-pipeline');
      expect(categories).toContain('model-training');
      expect(store.signals).toHaveLength(2);
    });

    it('builds up signals and persists valid store', async () => {
      const collector = new SignalCollector(tempDir, { minSignalCount: 3 });

      await collector.collect('inc-001');
      await collector.collect('inc-002');
      await collector.collect('inc-003');

      const raw = JSON.parse(await readFile(signalsPath, 'utf-8'));
      const parsed = SignalStoreSchema.parse(raw);

      expect(parsed.signals).toHaveLength(2);
      for (const signal of parsed.signals) {
        expect(signal.incrementIds).toHaveLength(3);
      }
    });
  });

  // ── Scenario 3: Empty project ─────────────────────────────────────

  describe('Scenario 3: Empty project', () => {
    it('completes without error and never calls analyzeStructured', async () => {
      // docsDir is empty (no markdown files)
      const collector = new SignalCollector(tempDir);

      await expect(collector.collect('inc-001')).resolves.toBeUndefined();
      expect(mocks.mockAnalyzeStructured).not.toHaveBeenCalled();
    });

    it('produces zero signals in store (no file written)', async () => {
      const collector = new SignalCollector(tempDir);
      await collector.collect('inc-001');

      // No signals file should be written (no docs to process)
      await expect(readFile(signalsPath, 'utf-8')).rejects.toThrow();
    });
  });

  // ── Scenario 4: E2E signal → suggestion flow ─────────────────────

  describe('Scenario 4: E2E signal → suggestion flow', () => {
    it('builds signals across 3 increments and suggestion engine picks the right one', async () => {
      mocks.mockAnalyzeStructured.mockResolvedValue(makeLLMResponse(TS_PATTERNS));

      // Use minSignalCount=3 — confidence is file-based (uniqueSourceFiles.length / minSignalCount)
      // Add one doc per increment so uniqueSourceFiles grows 1 → 2 → 3
      const collector = new SignalCollector(tempDir, { minSignalCount: 3 });
      const engine = new SuggestionEngine(tempDir);

      // Write config
      await writeFile(
        join(tempDir, '.specweave', 'config.json'),
        JSON.stringify({ skillGen: { suggest: true, minSignalCount: 3 } }),
      );

      // Increment 1 — add 1 doc, uniqueSourceFiles=1, confidence=0.33 (below threshold)
      await writeFile(join(docsDir, 'overview.md'), await readFile(join(TS_FIXTURE, 'overview.md'), 'utf-8'));
      await collector.collect('inc-001');
      await engine.evaluate();
      const logAfter1 = consoleSpy.mock.calls.filter(c => String(c[0]).includes('sw:skill-gen'));
      expect(logAfter1).toHaveLength(0);

      // Increment 2 — add 2nd doc, uniqueSourceFiles=2, confidence=0.67 (still below)
      await writeFile(join(docsDir, 'architecture.md'), await readFile(join(TS_FIXTURE, 'architecture.md'), 'utf-8'));
      await collector.collect('inc-002');
      consoleSpy.mockClear();
      await engine.evaluate();
      const logAfter2 = consoleSpy.mock.calls.filter(c => String(c[0]).includes('sw:skill-gen'));
      expect(logAfter2).toHaveLength(0);

      // Increment 3 — add 3rd doc, uniqueSourceFiles=3, confidence=1.0 (qualifies!)
      await writeFile(join(docsDir, 'api-spec.md'), await readFile(join(TS_FIXTURE, 'api-spec.md'), 'utf-8'));
      await collector.collect('inc-003');
      consoleSpy.mockClear();
      await engine.evaluate();
      const logAfter3 = consoleSpy.mock.calls.filter(c => String(c[0]).includes('sw:skill-gen'));
      expect(logAfter3).toHaveLength(1);

      // Verify the store is valid JSON matching Zod schema
      const raw = JSON.parse(await readFile(signalsPath, 'utf-8'));
      const parsed = SignalStoreSchema.parse(raw);

      expect(parsed.signals.length).toBe(3);

      // Verify at least one signal was marked as suggested
      const suggestedSignals = parsed.signals.filter(s => s.suggested);
      expect(suggestedSignals).toHaveLength(1);

      // Verify all signals have 3 increment IDs
      for (const signal of parsed.signals) {
        expect(signal.incrementIds).toEqual(['inc-001', 'inc-002', 'inc-003']);
      }
    });

    it('store passes SignalStoreSchema.parse() at every step', async () => {
      await cp(TS_FIXTURE, docsDir, { recursive: true });
      mocks.mockAnalyzeStructured.mockResolvedValue(makeLLMResponse(TS_PATTERNS));

      const collector = new SignalCollector(tempDir);

      for (const incId of ['inc-001', 'inc-002', 'inc-003']) {
        await collector.collect(incId);
        const raw = JSON.parse(await readFile(signalsPath, 'utf-8'));
        expect(() => SignalStoreSchema.parse(raw)).not.toThrow();
      }
    });
  });
});
