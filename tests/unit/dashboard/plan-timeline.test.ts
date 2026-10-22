import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPlanTimeline, taskWeight, DEFAULT_RATE } from '../../../src/dashboard/server/data/plan-timeline.js';
import { registerPlanRoutes } from '../../../src/dashboard/server/routes/plan-routes.js';

let root: string;
const NOW = new Date('2026-10-22T12:00:00Z');
const at = (minutesBefore: number) => new Date(NOW.getTime() - minutesBefore * 60000).toISOString();

function increment(id: string, status: string, tasks: Array<[string, number, number]>, events: object[], created = at(600)): void {
  const dir = path.join(root, '.specweave/increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ title: id, status, created }));
  const body = tasks
    .map(([t, files, acs]) => {
      const fileList = Array.from({ length: files }, (_, i) => `src/${t}-${i}.ts`).join(', ');
      const acList = Array.from({ length: acs }, (_, i) => `AC-0${i + 1}`).join(', ');
      return `### ${t} Task ${t}\n- AC: ${acList} | Files: ${fileList} | Test: true\n`;
    })
    .join('\n');
  fs.writeFileSync(path.join(dir, 'spec.md'), `# ${id}\n\n## Acceptance Criteria\n\n- [ ] AC-01: one\n\n## Tasks\n\n${body}`);
  fs.writeFileSync(path.join(dir, 'ledger.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

/** Five live tasks by claude, 20 minutes each at weight 1 (one file, one AC). */
function liveHistory(): void {
  const events: object[] = [];
  const tasks: Array<[string, number, number]> = [];
  for (let i = 1; i <= 5; i++) {
    const t = `T-0${i}`;
    tasks.push([t, 1, 1]);
    events.push({ t, e: 'claim', by: 'claude@m4', at: at(300 - (i - 1) * 20), model: 'opus' });
    events.push({ t, e: 'done', by: 'claude@m4', at: at(300 - i * 20), evidence: 'abc', model: 'opus' });
  }
  increment('0001-live', 'completed', tasks, events);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-plan-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('plan timeline (AC-05)', () => {
  it('weights tasks by files and ACs within bounds', () => {
    expect(taskWeight(1, 1)).toBe(1);
    expect(taskWeight(3, 3)).toBe(2.5);
    expect(taskWeight(20, 20)).toBe(4);
    expect(taskWeight(0, 0)).toBe(1);
  });

  it('builds rows, rates, a forecast for open work, throughput and activity', () => {
    liveHistory();
    increment(
      '0002-open',
      'active',
      [['T-01', 1, 1], ['T-02', 3, 3]],
      [{ t: 'T-01', e: 'claim', by: 'claude@m4', at: at(30), model: 'opus' }],
      at(60),
    );

    const plan = buildPlanTimeline(root, NOW);
    expect(plan.rows.map((r) => r.incrementId)).toEqual(['0001-live', '0002-open']);
    const [live, open] = plan.rows;
    expect(live).toMatchObject({ status: 'completed', recordedAfter: false, remaining: null, tools: ['claude'], models: ['opus'] });
    expect(live.start).toBe(at(600));
    expect(live.end).toBe(at(200));

    expect(plan.rates.overall).toMatchObject({ samples: 5, p50: 20, p80: 20 });
    expect(plan.rates.byModel).toEqual([{ key: 'opus', samples: 5, p50: 20, p80: 20 }]);
    expect(plan.rates.fallback).toBe(false);

    // Two open tasks, weights 1 and 2.5, at 20 min per weight unit.
    expect(open.remaining).toEqual({ tasks: 2, weight: 3.5, p50Minutes: 70, p80Minutes: 70 });
    expect(open.lastEvent).toMatchObject({ e: 'claim', t: 'T-01' });
    expect(open.specPath).toBe(path.join(root, '.specweave/increments/0002-open/spec.md'));

    expect(plan.throughput).toHaveLength(30);
    expect(plan.throughput.reduce((n, d) => n + d.total, 0)).toBe(5);
    expect(plan.lanes).toBe(1);
    expect(plan.activity[0]).toMatchObject({ incrementId: '0002-open', event: 'claim', tool: 'claude', model: 'opus' });
    expect(plan.activity).toHaveLength(11);
  });

  it('flags work recorded after the fact and keeps it out of the rates', () => {
    increment(
      '0003-after',
      'completed',
      [['T-01', 1, 1], ['T-02', 1, 1]],
      [
        { t: 'T-01', e: 'skip', by: 'codex@m4', at: at(100), note: 'Implemented in PR #1' },
        { t: 'T-02', e: 'claim', by: 'codex@m4', at: at(99) },
        { t: 'T-02', e: 'done', by: 'codex@m4', at: at(98.9), evidence: 'abc' },
      ],
    );
    increment('0004-planned', 'planned', [['T-01', 1, 1]], []);
    const plan = buildPlanTimeline(root, NOW);
    expect(plan.rows[0].recordedAfter).toBe(true);
    expect(plan.rates.overall.samples).toBe(0);
    expect(plan.rates.fallback).toBe(true);
    // Without history the default rate applies.
    expect(plan.rows[1].remaining).toEqual({ tasks: 1, weight: 1, p50Minutes: DEFAULT_RATE.p50, p80Minutes: DEFAULT_RATE.p80 });
  });

  it('GET /api/plan serves the payload for the selected project', async () => {
    liveHistory();
    let handler: any;
    const router: any = { get: (p: string, h: any) => (p === '/api/plan' ? (handler = h) : undefined) };
    registerPlanRoutes(router, () => root);
    let body = '';
    let status = 0;
    const res: any = {
      writeHead: (s: number) => (status = s),
      setHeader: () => {},
      end: (chunk: string) => (body = chunk),
    };
    await handler({ url: '/api/plan' }, res, {});
    const json = JSON.parse(body);
    expect(status === 0 || status === 200).toBe(true);
    expect(json.ok).toBe(true);
    expect(json.data.rows[0].incrementId).toBe('0001-live');
  });
});
