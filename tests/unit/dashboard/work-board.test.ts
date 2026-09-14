import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DashboardDataAggregator } from '../../../src/dashboard/server/data/dashboard-data-aggregator.js';

let root: string;
let inc: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-work-test-'));
  inc = path.join(root, '.specweave/increments/0001-portable');
  fs.mkdirSync(inc, { recursive: true });
  fs.writeFileSync(
    path.join(inc, 'metadata.json'),
    JSON.stringify({ title: 'Portable work', status: 'active' }),
  );
  fs.writeFileSync(
    path.join(inc, 'spec.md'),
    '# Portable work\n\n## Problem\nKeep progress when changing tools.\n\n## Acceptance Criteria\n- [x] AC-01 Progress persists\n- [ ] **AC-02**: Progress refreshes\n',
  );
  fs.writeFileSync(
    path.join(inc, 'tasks.md'),
    '# Tasks\n\n### T-01 Persist\n- AC: AC-01 | Files: src/a.ts | Test: npm test\n\n### T-02 Refresh\n- AC: AC-02 | Files: src/b.ts | Test: npm test\n',
  );
  fs.writeFileSync(
    path.join(inc, 'ledger.jsonl'),
    JSON.stringify({
      t: 'T-01',
      e: 'done',
      by: 'codex@host',
      at: new Date().toISOString(),
      evidence: 'commit abc1234; test exit 0',
    }) + '\n',
  );
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('authoritative dashboard progress', () => {
  it('reads modern ledger progress and both plain and bold ACs', async () => {
    const data = await new DashboardDataAggregator(root).getIncrements();
    expect(data.increments[0].tasks).toMatchObject({ total: 2, completed: 1 });
    expect(data.increments[0].acs).toEqual({ total: 2, completed: 1 });
  });
});

import { getIncrementDetail, projectIncrement } from '../../../src/dashboard/server/data/work-projection.js';
import { IntentStore } from '../../../src/dashboard/server/data/intent-store.js';
import { localRequestError } from '../../../src/dashboard/server/local-request.js';
import { readLocalSessions } from '../../../src/dashboard/server/data/local-sessions.js';

describe('intent, evidence and continuation', () => {
  it('uses task boundaries and ledger evidence in the modern detail route', async () => {
    const detail: any = await getIncrementDetail(root, '0001');
    expect(detail.tasks).toHaveLength(2);
    expect(detail.tasks[0]).toMatchObject({
      id: 'T-01',
      status: 'completed',
      actor: 'codex@host',
      evidence: 'commit abc1234; test exit 0',
    });
    expect(detail.tasks[1].status).toBe('pending');
    expect(detail.acSummary).toEqual({ total: 2, completed: 1 });
    expect(projectIncrement(root, '../0001')).toBeNull();
  });
  it('persists an intent with no increment, rejects racing edits, and preserves histories', () => {
    const store = new IntentStore(root);
    const item = store.create({ title: 'Small work', summary: 'Fix one label' });
    expect(item.incrementId).toBeNull();
    const active = store.update(item.id, { revision: 1, state: 'active' });
    expect(() => store.update(item.id, { revision: 1, state: 'done' })).toThrow('another window');
    expect(new IntentStore(root).board().items.find((i) => i.id === item.id)?.state).toBe('active');
    const setup = store.addExecution(item.id, {
      revision: active.revision,
      harness: 'Codex',
      model: 'model-test',
      effort: 'high',
      provider: 'OpenRouter',
      surface: 'terminal',
    });
    expect(setup.executions[0]).toMatchObject({
      harness: 'Codex',
      model: 'model-test',
      provider: 'OpenRouter',
      source: 'declared',
    });
    expect(
      fs.readFileSync(path.join(root, '.specweave/intents/board.jsonl'), 'utf8').trim().split('\n'),
    ).toHaveLength(3);
  });
  it('moving to done never changes linked increment completion or verification', () => {
    const store = new IntentStore(root);
    const item = store.board().items[0];
    store.update(item.id, { revision: 0, state: 'done' });
    const board = store.board();
    expect(board.items).toHaveLength(1);
    expect(board.items[0]).toMatchObject({
      state: 'done',
      incrementStatus: 'active',
      verification: { status: 'missing' },
      evidenceCount: 1,
    });
    expect(JSON.parse(fs.readFileSync(path.join(inc, 'metadata.json'), 'utf8')).status).toBe('active');
  });
  it('shows blocked/skipped separately and detects stale verification', () => {
    const store = new IntentStore(root);
    fs.appendFileSync(
      path.join(inc, 'ledger.jsonl'),
      JSON.stringify({
        t: 'T-02',
        e: 'block',
        by: 'claude@host',
        at: new Date().toISOString(),
        note: 'Waiting for data',
      }) + '\n',
    );
    expect(store.board().items[0]).toMatchObject({ state: 'blocked', tasks: { blocked: 1, done: 1 } });
    fs.mkdirSync(path.join(inc, 'reports'));
    fs.writeFileSync(
      path.join(inc, 'reports/verify.json'),
      JSON.stringify({ ok: true, ranAt: new Date().toISOString() }),
    );
    expect(store.board().items[0].verification.status).toBe('passed');
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(path.join(inc, 'spec.md'), future, future);
    expect(store.board().items[0].verification.status).toBe('stale');
    expect(store.board().items[0].executions.map((e) => e.harness)).toEqual(['codex', 'Claude Code']);
    expect(store.board().items[0].executions.every((e) => e.model === null && e.provider === null)).toBe(
      true,
    );
  });
  it('authoritative files override a stale dashboard snapshot', async () => {
    fs.mkdirSync(path.join(root, '.specweave/state'));
    fs.writeFileSync(
      path.join(root, '.specweave/state/dashboard.json'),
      JSON.stringify({
        increments: { '0001-portable': { status: 'completed', tasks: { total: 99, completed: 99 } } },
      }),
    );
    const data = await new DashboardDataAggregator(root).getIncrements();
    expect(data.increments[0].tasks).toEqual({ total: 2, completed: 1 });
    expect(data.summary).toMatchObject({ total: 1, active: 1 });
  });
  it('rejects external origins, DNS rebinding hosts and form writes', () => {
    expect(
      localRequestError(
        {
          method: 'PATCH',
          headers: {
            host: '127.0.0.1:3456',
            origin: 'https://attacker.example',
            'content-type': 'application/json',
          },
        },
        3456,
      ),
    ).toMatch(/Cross-origin/);
    expect(localRequestError({ method: 'GET', headers: { host: 'attacker.example:3456' } }, 3456)).toMatch(
      /loopback/,
    );
    expect(
      localRequestError(
        {
          method: 'POST',
          headers: { host: '127.0.0.1:3456', 'content-length': '10', 'content-type': 'text/plain' },
        },
        3456,
      ),
    ).toMatch(/application\/json/);
    expect(
      localRequestError(
        {
          method: 'PATCH',
          headers: {
            host: '127.0.0.1:3456',
            origin: 'http://127.0.0.1:3456',
            'content-type': 'application/json',
          },
        },
        3456,
      ),
    ).toBeNull();
  });
  it('reads only project-scoped session metadata and keeps model changes distinct', () => {
    const codex = path.join(root, 'native/codex');
    const claude = path.join(root, 'native/claude');
    fs.mkdirSync(codex, { recursive: true });
    fs.mkdirSync(claude, { recursive: true });
    const row = (type: string, payload: any) =>
      JSON.stringify({ type, payload, timestamp: '2026-09-14T01:00:00Z' });
    fs.writeFileSync(
      path.join(codex, 'one.jsonl'),
      [
        row('session_meta', {
          id: 'session-one',
          cwd: root,
          model_provider: 'openai',
          originator: 'Codex Desktop',
        }),
        row('turn_context', { model: 'model-a', effort: 'high' }),
        row('response_item', { text: 'SECRET PROMPT NEVER EXPORTED' }),
        row('turn_context', { model: 'model-b', effort: 'medium' }),
      ].join('\n'),
    );
    fs.writeFileSync(
      path.join(codex, 'other.jsonl'),
      row('session_meta', { id: 'other', cwd: '/different-project' }),
    );
    fs.writeFileSync(
      path.join(claude, 'two.jsonl'),
      [
        JSON.stringify({
          cwd: root,
          sessionId: 'claude-one',
          entrypoint: 'cli',
          type: 'user',
          message: { content: 'SECRET PROMPT NEVER EXPORTED' },
        }),
        JSON.stringify({
          type: 'assistant',
          message: { model: 'claude-model' },
          timestamp: '2026-09-14T02:00:00Z',
        }),
      ].join('\n'),
    );
    const sessions = readLocalSessions(root, { codex, claude });
    expect(sessions).toHaveLength(2);
    expect(sessions.find((s) => s.harness === 'Codex')?.segments.map((s) => [s.model, s.effort])).toEqual([
      ['model-a', 'high'],
      ['model-b', 'medium'],
    ]);
    expect(JSON.stringify(sessions)).not.toContain('SECRET');
    expect(sessions.find((s) => s.harness === 'Claude Code')?.segments[0].provider).toBeNull();
  });
});
