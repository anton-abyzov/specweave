/**
 * T-06 integrations (AC-07): Jev-assisted model-tier selection and the completion
 * evaluator's binary checks. No network: the client is stubbed / the module mocked.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { JEV_DEFAULTS } from '../../../src/core/jev/config.js';
import type { JevClient } from '../../../src/core/jev/client.js';
import { selectModelTierForTask, type Task } from '../../../src/utils/model-selection.js';

const jevMocks = vi.hoisted(() => ({
  isJevEnabled: vi.fn(() => true),
  createJevClient: vi.fn(() => ({}) as unknown),
  testOutputPassed: vi.fn(async () => ({ passed: 1, available: true })),
}));

vi.mock('../../../src/core/jev/index.js', () => jevMocks);

const { jevTestOutputVerdict, evaluateCompletion } = await import(
  '../../../src/core/auto/completion-evaluator.js'
);

/** A JevClient stub whose `ask` replies with a fixed complexity answer. */
function stubClient(complexity: string, confidence: number): JevClient {
  return {
    config: JEV_DEFAULTS,
    ask: vi.fn(async () => ({
      provider: 'openrouter' as const,
      model: 'jev-1.13',
      answers: {
        TASK_COMPLEXITY: {
          type: 'choice' as const,
          choice: complexity,
          probabilities: { [complexity]: confidence },
          confidence,
        },
        NEEDS_INCREMENT: { type: 'noul' as const, noul: 0.2 },
      },
      usage: { input_tokens: 100, output_tokens: 10, cost: 0.00002 },
      latencyMs: 250,
    })),
  } as unknown as JevClient;
}

const TASK: Task = {
  id: 'T-01',
  content: 'Rename the config key',
  description: 'Mechanical rename across two files',
  acceptanceCriteria: ['AC-01 renamed'],
};

const ON = { enabled: true, modelRouting: true, routeThreshold: 0.7 };

describe('selectModelTierForTask', () => {
  it('maps a confident trivial task to haiku', async () => {
    const result = await selectModelTierForTask(TASK, {}, { ...ON, client: stubClient('trivial', 0.95) });
    expect(result.model).toBe('haiku');
    expect(result.source).toBe('jev');
    expect(result.reasoning).toBe('jev:trivial');
  });

  it('maps a confident moderate task to sonnet', async () => {
    const result = await selectModelTierForTask(TASK, {}, { ...ON, client: stubClient('moderate', 0.9) });
    expect(result.model).toBe('sonnet');
    expect(result.reasoning).toBe('jev:moderate');
  });

  it('maps a confident complex task to opus', async () => {
    const result = await selectModelTierForTask(TASK, {}, { ...ON, client: stubClient('complex', 0.88) });
    expect(result.model).toBe('opus');
    expect(result.reasoning).toBe('jev:complex');
  });

  it('falls back to opus below the route threshold', async () => {
    const result = await selectModelTierForTask(TASK, {}, { ...ON, client: stubClient('trivial', 0.41) });
    expect(result.model).toBe('opus');
    expect(result.reasoning).toBe('jev:low-confidence');
    expect(result.source).toBe('jev');
  });

  it('uses the keyword heuristic when Jev is disabled', async () => {
    const client = stubClient('trivial', 0.99);
    const result = await selectModelTierForTask(TASK, {}, { ...ON, enabled: false, client });
    expect(result.source).toBe('heuristic');
    expect(result.reasoning).not.toContain('jev');
    expect(client.ask).not.toHaveBeenCalled();
  });

  it('uses the heuristic when modelRouting is off', async () => {
    const result = await selectModelTierForTask(TASK, {}, { ...ON, modelRouting: false, client: stubClient('trivial', 0.99) });
    expect(result.source).toBe('heuristic');
  });

  it('uses the heuristic when no client is available', async () => {
    const result = await selectModelTierForTask(TASK, {}, { ...ON, client: null });
    expect(result.source).toBe('heuristic');
  });

  it('uses the heuristic when the classifier reports unavailable', async () => {
    const result = await selectModelTierForTask(
      TASK,
      {},
      { ...ON, client: stubClient('trivial', 0.99), classify: async () => ({ available: false, reason: 'timeout' }) }
    );
    expect(result.source).toBe('heuristic');
  });

  it('uses the heuristic when the classifier throws', async () => {
    const result = await selectModelTierForTask(
      TASK,
      {},
      {
        ...ON,
        client: stubClient('trivial', 0.99),
        classify: async () => {
          throw new Error('boom');
        },
      }
    );
    expect(result.source).toBe('heuristic');
  });

  it('reads the project config when deps are omitted (disabled by default)', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-tier-'));
    const result = await selectModelTierForTask(TASK, {}, { projectRoot: root });
    expect(result.source).toBe('heuristic');
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe('completion evaluator Jev binary check', () => {
  beforeEach(() => {
    jevMocks.isJevEnabled.mockReset().mockReturnValue(true);
    jevMocks.createJevClient.mockReset().mockReturnValue({} as unknown);
    jevMocks.testOutputPassed.mockReset().mockResolvedValue({ passed: 1, available: true });
  });

  it('returns true for a confident pass', async () => {
    jevMocks.testOutputPassed.mockResolvedValue({ passed: 0.94, available: true });
    await expect(jevTestOutputVerdict('12 passed, 0 failed', 'tests')).resolves.toBe(true);
  });

  it('returns false for a confident fail', async () => {
    jevMocks.testOutputPassed.mockResolvedValue({ passed: 0.03, available: true });
    await expect(jevTestOutputVerdict('3 failed', 'tests')).resolves.toBe(false);
  });

  it('falls through when Jev is uncertain', async () => {
    jevMocks.testOutputPassed.mockResolvedValue({ passed: 0.5, available: true });
    await expect(jevTestOutputVerdict('...', 'build')).resolves.toBeNull();
  });

  it('falls through when Jev is disabled without calling the API', async () => {
    jevMocks.isJevEnabled.mockReturnValue(false);
    await expect(jevTestOutputVerdict('ok', 'tests')).resolves.toBeNull();
    expect(jevMocks.testOutputPassed).not.toHaveBeenCalled();
  });

  it('falls through when there is no client', async () => {
    jevMocks.createJevClient.mockReturnValue(null as unknown);
    await expect(jevTestOutputVerdict('ok', 'tests')).resolves.toBeNull();
    expect(jevMocks.testOutputPassed).not.toHaveBeenCalled();
  });

  it('falls through when the call is unavailable', async () => {
    jevMocks.testOutputPassed.mockResolvedValue({ passed: 0, available: false });
    await expect(jevTestOutputVerdict('ok', 'tests')).resolves.toBeNull();
  });

  it('never throws out', async () => {
    jevMocks.testOutputPassed.mockRejectedValue(new Error('transport'));
    await expect(jevTestOutputVerdict('ok', 'build')).resolves.toBeNull();
  });
});

/**
 * The invariant behind AC-07: Jev may DOWNGRADE a green run, never rescue a red one.
 *
 * The text Jev reads is test/build stdout — fixture- and attacker-controlled, and Jev
 * is documented as literal-reading and injection-susceptible. A `noul` that high on a
 * failing suite is exactly what a poisoned fixture would produce, so the exit code
 * stays the ground truth for "did this run succeed".
 */
describe('completion evaluator: Jev may only downgrade', () => {
  const roots: string[] = [];

  /** A temp project whose single success criterion is `tests_pass` with `command`. */
  function project(command: string): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-eval-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
    fs.mkdirSync(path.join(root, '.specweave', 'increments', '0001-demo'), { recursive: true });
    fs.writeFileSync(
      path.join(root, '.specweave', 'state', 'auto-mode.json'),
      JSON.stringify({
        active: true,
        successCriteria: [{ type: 'tests_pass', description: 'Tests must pass', required: true, command }],
      }),
    );
    return root;
  }

  const PASSES = 'node -e "process.exit(0)"';
  const FAILS = 'node -e "process.exit(1)"';

  async function testsPass(command: string) {
    const root = project(command);
    const result = await evaluateCompletion(root, '0001-demo');
    return result.results.find((r) => r.criterion.type === 'tests_pass')!;
  }

  beforeEach(() => {
    jevMocks.isJevEnabled.mockReset().mockReturnValue(true);
    jevMocks.createJevClient.mockReset().mockReturnValue({} as unknown);
    jevMocks.testOutputPassed.mockReset().mockResolvedValue({ passed: 0.5, available: true });
  });

  afterEach(() => {
    while (roots.length) {
      const dir = roots.pop();
      if (dir) fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('(a) keeps a non-zero exit unsatisfied even when Jev reads the output as a pass', async () => {
    jevMocks.testOutputPassed.mockResolvedValue({ passed: 0.99, available: true });
    const result = await testsPass(FAILS);
    expect(result.satisfied).toBe(false);
    expect(result.reason).toContain('exit 1');
    expect(result.reason).toContain('advisory');
  });

  it('(b) downgrades a green exit when Jev is confident the run failed', async () => {
    jevMocks.testOutputPassed.mockResolvedValue({ passed: 0.1, available: true });
    const result = await testsPass(PASSES);
    expect(result.satisfied).toBe(false);
    expect(result.reason.toLowerCase()).toContain('jev');
    expect(result.reason).toContain('exit 0');
  });

  it('(c) leaves a green exit satisfied when Jev is undecided', async () => {
    jevMocks.testOutputPassed.mockResolvedValue({ passed: 0.5, available: true });
    const result = await testsPass(PASSES);
    expect(result.satisfied).toBe(true);
    expect(result.reason).toBe('Tests passed (exit 0)');
  });

  it('(d) falls back to the exit code in both directions when Jev is unavailable', async () => {
    jevMocks.isJevEnabled.mockReturnValue(false);

    const green = await testsPass(PASSES);
    expect(green.satisfied).toBe(true);
    expect(green.reason).toBe('Tests passed (exit 0)');

    const red = await testsPass(FAILS);
    expect(red.satisfied).toBe(false);
    expect(red.reason).toContain('exit 1');
    expect(red.reason).not.toContain('advisory');

    expect(jevMocks.testOutputPassed).not.toHaveBeenCalled();
  });

  it('threads the project path into the consent check and the client factory', async () => {
    const root = project(PASSES);
    await evaluateCompletion(root, '0001-demo');
    expect(jevMocks.isJevEnabled).toHaveBeenCalledWith(root);
    expect(jevMocks.createJevClient).toHaveBeenCalledWith(root);
  });
});
