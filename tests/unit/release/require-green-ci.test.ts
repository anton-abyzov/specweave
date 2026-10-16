import { describe, expect, it, vi } from 'vitest';
import { evaluate, requireGreenCi, runOutcome } from '../../../scripts/release/require-green-ci.mjs';

const testedJobs = (conclusion = 'success') => [
  { name: 'smoke', conclusion: 'success', steps: [{ name: 'Run smoke tests', conclusion }] },
  { name: 'unit', conclusion: 'success', steps: [{ name: 'Run unit tests', conclusion }] },
];
const run = (id: number, status: string, conclusion: string | null) => ({ id, status, conclusion, html_url: `https://example.test/runs/${id}` });

// history: newest first; runs and jobs keyed by commit / run id.
function sources({ history, equivalent = {}, runs = {}, jobs = {} }: {
  history: string[];
  equivalent?: Record<string, boolean>;
  runs?: Record<string, ReturnType<typeof run>[]>;
  jobs?: Record<number, ReturnType<typeof testedJobs>>;
}) {
  return {
    revList: () => history,
    isEquivalent: (from: string) => ({ ok: equivalent[from] ?? false, reason: 'src/a.ts changed' }),
    listRuns: vi.fn(async (commit: string) => runs[commit] ?? []),
    listJobs: vi.fn(async (id: number) => jobs[id] ?? []),
  };
}

describe('runOutcome', () => {
  it('counts a run only when the smoke and unit test steps really ran', () => {
    expect(runOutcome(run(1, 'completed', 'success'), testedJobs())).toBe('passed');
    expect(runOutcome(run(1, 'completed', 'success'), testedJobs('skipped'))).toBe('skipped');
    expect(runOutcome(run(1, 'completed', 'failure'))).toBe('failed');
    expect(runOutcome(run(1, 'completed', 'cancelled'))).toBe('ignored');
    expect(runOutcome(run(1, 'in_progress', null))).toBe('pending');
  });
});

describe('release CI gate', () => {
  it('passes on a tested run of the released commit', async () => {
    const s = sources({ history: ['M', 'P'], runs: { M: [run(1, 'completed', 'success')] }, jobs: { 1: testedJobs() } });
    expect(await evaluate('M', s)).toMatchObject({ verdict: 'pass', commit: 'M' });
  });

  it('accepts the tested parent of a bump-only release whose own run skipped the tests', async () => {
    const s = sources({
      history: ['M', 'D', 'P'], equivalent: { D: true, P: true },
      runs: { M: [run(1, 'completed', 'success')], P: [run(2, 'completed', 'success')] },
      jobs: { 1: testedJobs('skipped'), 2: testedJobs() },
    });
    expect(await evaluate('M', s)).toMatchObject({ verdict: 'pass', commit: 'P' });
  });

  it('does not wait for the release commit run when an equivalent parent already passed', async () => {
    const s = sources({
      history: ['M', 'P'], equivalent: { P: true },
      runs: { M: [run(1, 'in_progress', null)], P: [run(2, 'completed', 'success')] },
      jobs: { 2: testedJobs() },
    });
    expect(await evaluate('M', s)).toMatchObject({ verdict: 'pass', commit: 'P' });
  });

  it('never accepts a parent whose difference touches tested files', async () => {
    const s = sources({
      history: ['M', 'P'], equivalent: { P: false },
      runs: { M: [run(1, 'completed', 'success')], P: [run(2, 'completed', 'success')] },
      jobs: { 1: testedJobs('skipped'), 2: testedJobs() },
    });
    await expect(requireGreenCi('M', { sources: s, log: () => {} })).rejects.toThrow(/changes tested files/);
  });

  it('refuses when the newest tested equivalent run failed', async () => {
    const s = sources({ history: ['M', 'P'], equivalent: { P: true }, runs: { M: [run(1, 'completed', 'success')], P: [run(2, 'completed', 'failure')] }, jobs: { 1: testedJobs('skipped') } });
    await expect(requireGreenCi('M', { sources: s, log: () => {} })).rejects.toThrow(/failed on P/);
  });

  it('waits for an in-progress run of a minor release, then passes', async () => {
    const runs: Record<string, ReturnType<typeof run>[]> = { M: [run(1, 'in_progress', null)] };
    const s = sources({ history: ['M', 'P'], equivalent: { P: false }, runs, jobs: { 1: testedJobs() } });
    const sleep = vi.fn(async () => { runs.M = [run(1, 'completed', 'success')]; });
    expect(await requireGreenCi('M', { sources: s, sleep, log: () => {} })).toMatchObject({ verdict: 'pass', commit: 'M' });
    expect(sleep).toHaveBeenCalledOnce();
  });

  it('waits on a newer in-progress run rather than failing on an older failure', async () => {
    const s = sources({ history: ['M', 'P'], equivalent: { P: true }, runs: { M: [run(1, 'queued', null)], P: [run(2, 'completed', 'failure')] } });
    expect(await evaluate('M', s)).toMatchObject({ verdict: 'wait', commit: 'M' });
  });

  it('gives up when the run never finishes', async () => {
    const s = sources({ history: ['M'], runs: { M: [run(1, 'in_progress', null)] } });
    let clock = 0;
    const sleep = vi.fn(async (ms: number) => { clock += ms; });
    await expect(requireGreenCi('M', { sources: s, sleep, now: () => clock, maxWaitMs: 30_000, pollMs: 10_000, log: () => {} })).rejects.toThrow(/gave up/);
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it('allows a short grace for the run of a just-pushed commit to appear, then refuses', async () => {
    const s = sources({ history: ['M'] });
    let clock = 0;
    const sleep = vi.fn(async (ms: number) => { clock += ms; });
    await expect(requireGreenCi('M', { sources: s, sleep, now: () => clock, noRunGraceMs: 20_000, pollMs: 10_000, log: () => {} })).rejects.toThrow(/really ran the tests/);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
