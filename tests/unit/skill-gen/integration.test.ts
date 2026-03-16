import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SignalCollector } from '../../../src/core/skill-gen/signal-collector.js';
import { SuggestionEngine } from '../../../src/core/skill-gen/suggestion-engine.js';
import type { SignalStore } from '../../../src/core/skill-gen/types.js';

describe('T-030: Full pipeline integration — signal detection through suggestion', () => {
  let tempDir: string;
  let stateDir: string;
  let docsDir: string;
  let signalsPath: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-integration-'));
    stateDir = join(tempDir, '.specweave', 'state');
    docsDir = join(tempDir, '.specweave', 'docs', 'internal');
    signalsPath = join(stateDir, 'skill-signals.json');
    await mkdir(stateDir, { recursive: true });
    await mkdir(docsDir, { recursive: true });
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('accumulates signals across 3 increments and prints suggestion on third', async () => {
    // Create living docs with detectable error-handling pattern
    const reposDir = join(docsDir, 'repos', 'my-app');
    await mkdir(reposDir, { recursive: true });
    await writeFile(
      join(reposDir, 'overview.md'),
      `# My App\n\nConsistent error-handling with try/catch blocks.\nError boundaries protect React components.\nError middleware handles all API routes.\n`,
    );

    const collector = new SignalCollector(tempDir);
    const engine = new SuggestionEngine(tempDir);

    // Increment 1
    await collector.collect('0001-first');
    await engine.evaluate();
    expect(consoleSpy).not.toHaveBeenCalled(); // Only 1 increment, need 3

    // Increment 2
    await collector.collect('0002-second');
    await engine.evaluate();
    expect(consoleSpy).not.toHaveBeenCalled(); // Only 2

    // Increment 3 — should trigger suggestion
    await collector.collect('0003-third');
    await engine.evaluate();

    // Verify signal state
    const store = JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
    const errorSignal = store.signals.find((s) => s.category === 'error-handling');
    expect(errorSignal).toBeDefined();
    expect(errorSignal!.incrementIds.length).toBe(3);

    // Verify suggestion was printed
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const msg = consoleSpy.mock.calls[0][0] as string;
    expect(msg).toContain('/sw:skill-gen');
    expect(msg).toContain('3');
  });
});
