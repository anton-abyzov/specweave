import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPlanTimeline } from '../../../src/dashboard/server/data/plan-timeline.js';
import { timelineView } from '../../../src/dashboard/client/src/pages/timeline-view.js';

let root: string;
const NOW = new Date('2026-10-31T08:00:00Z');
const at = (minutesBefore: number) => new Date(NOW.getTime() - minutesBefore * 60000).toISOString();
const DAYS_13 = 13 * 24 * 60;

function increment(id: string, status: string, tasks: string[], events: object[], created: string): void {
  const dir = path.join(root, '.specweave/increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ title: id, status, created }));
  const body = tasks.map((t) => `### ${t} Task ${t}\n- AC: AC-01 | Files: src/${t}.ts | Test: true\n`).join('\n');
  fs.writeFileSync(path.join(dir, 'spec.md'), `# ${id}\n\n## Acceptance Criteria\n\n- [ ] AC-01: one\n\n## Tasks\n\n${body}`);
  fs.writeFileSync(path.join(dir, 'ledger.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

/** The greet-fleet demo: two increments in Review from 13 days ago, one closed today. */
function demoProject(): void {
  for (const [id, offset] of [['0001-personal-greeting', 0], ['0002-greet-a-team', 60]] as const) {
    increment(
      id,
      'active',
      ['T-01'],
      [
        { t: 'T-01', e: 'claim', by: 'codex@demo', at: at(DAYS_13 - offset) },
        { t: 'T-01', e: 'done', by: 'codex@demo', at: at(DAYS_13 - offset - 30), evidence: 'abc' },
      ],
      at(DAYS_13 - offset + 5),
    );
  }
  const events: object[] = [];
  ['T-01', 'T-02', 'T-03'].forEach((t, i) => {
    events.push({ t, e: 'claim', by: 'claude@m4', at: at(30 - i * 8) });
    events.push({ t, e: 'done', by: 'claude@m4', at: at(25 - i * 8), evidence: 'abc' });
  });
  increment('0003-greet-in-three-languages', 'completed', ['T-01', 'T-02', 'T-03'], events, at(35));
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-timeline-view-'));
  demoProject();
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const filters = { scope: 'open', tool: 'all', query: '', windowStart: NOW.getTime() - 30 * 86400000 };

describe('timelineView', () => {
  it('counts work closed today under the default Open filter', () => {
    const view = timelineView(buildPlanTimeline(root, NOW), filters, NOW.getTime());

    // The Gantt shows only the open rows...
    expect(view.rows.map((r) => r.incrementId)).toEqual(['0002-greet-a-team', '0001-personal-greeting']);
    // ...but closed work still feeds the Closed tile, Throughput and Latest activity.
    expect(view.kpis.closedThisWeek).toBe(3);
    expect(view.closes.filter((c) => c.incrementId === '0003-greet-in-three-languages')).toHaveLength(3);
    expect(view.activity[0]).toMatchObject({ incrementId: '0003-greet-in-three-languages', event: 'done', by: 'claude@m4' });
    expect(view.kpis.finished).toBe(1);
  });

  it('counts Review increments as open, matching the listed rows', () => {
    const view = timelineView(buildPlanTimeline(root, NOW), filters, NOW.getTime());

    expect(view.rows.every((r) => r.state === 'review')).toBe(true);
    expect(view.kpis.open).toBe(view.rows.length);
    expect(view.kpis.tasksLeft).toBe(0);
    expect(view.kpis.forecast).toEqual([]);
  });

  it('still narrows the counts by agent and search', () => {
    const data = buildPlanTimeline(root, NOW);

    expect(timelineView(data, { ...filters, tool: 'codex' }, NOW.getTime()).kpis.closedThisWeek).toBe(0);
    expect(timelineView(data, { ...filters, query: 'team' }, NOW.getTime()).activity.every((a) => a.incrementId === '0002-greet-a-team')).toBe(true);
  });
});
