/**
 * Timeline projection for the dashboard (`GET /api/plan`): one Gantt row per
 * increment, the latest ledger activity, daily throughput and an
 * uninterrupted-work forecast for open increments. Reads only `.specweave`
 * files; no model or network calls.
 *
 * Forecast model
 * - Active time of a finished task: from the later of its claim and the same
 *   agent's previous finish in that increment, to its `done`. Spans under a
 *   minute are bookkeeping (work recorded after the fact) and spans over
 *   {@link MAX_TASK_MINUTES} include interruptions; both are dropped.
 * - Task weight: `1 + 0.5 x (files - 1) + 0.25 x (ACs - 1)`, clamped to 0.5-4.
 * - Only increments tracked live feed the rates.
 * - Rate: minutes per weight unit at the median (p50) and 80th percentile
 *   (p80), by model when it has {@link MIN_SAMPLES}, else by tool, else overall.
 * - Remaining minutes of an open increment: its open tasks' weight x rate.
 *
 * @module dashboard/server/data/plan-timeline
 */

import fs from 'node:fs';
import path from 'node:path';
import { readLedger, type LedgerEvent } from '../../../core/tasks/ledger.js';
import { readSmallFixes } from '../../../core/tasks/work-session.js';
import { loadDashboardTaskBoard } from './dashboard-task-board.js';
import { projectIncrement, readJson } from './work-projection.js';
import type { PlanActivity, PlanRate, PlanRow, PlanTimelinePayload } from '../../work-types.js';

export const MAX_TASK_MINUTES = 240;
export const MIN_SAMPLES = 5;
/** Minutes per weight unit when the project has no history yet. */
export const DEFAULT_RATE = { p50: 30, p80: 60 };
const ACTIVITY_LIMIT = 300;
const THROUGHPUT_DAYS = 30;
const CLOSED = new Set(['completed', 'abandoned']);
const DAY_MS = 86400000;

export function taskWeight(files: number, acs: number): number {
  const w = 1 + 0.5 * Math.max(0, files - 1) + 0.25 * Math.max(0, acs - 1);
  return Math.min(4, Math.max(0.5, w));
}

export function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

const toolOf = (by: string) => by.split('@')[0] || 'unknown';
const minutes = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 60000;

interface Sample { tool: string; model: string | null; perWeight: number }

/** Active-time samples of the finished tasks in one increment's ledger. */
export function taskSamples(events: LedgerEvent[], weights: Map<string, number>): Sample[] {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const claims = new Map<string, string>();
  const lastFinish = new Map<string, string>();
  const samples: Sample[] = [];
  for (const event of sorted) {
    if (event.e === 'claim') claims.set(`${event.t}|${event.by}`, event.at);
    if (event.e !== 'done' && event.e !== 'skip') continue;
    const claim = claims.get(`${event.t}|${event.by}`);
    const previous = lastFinish.get(event.by);
    lastFinish.set(event.by, event.at);
    if (event.e !== 'done' || !claim) continue;
    const start = previous && previous > claim ? previous : claim;
    const span = minutes(start, event.at);
    if (span < 1 || span > MAX_TASK_MINUTES) continue;
    samples.push({ tool: toolOf(event.by), model: event.model ?? null, perWeight: span / (weights.get(event.t) ?? 1) });
  }
  return samples;
}

function rate(key: string, values: number[]): PlanRate {
  return { key, samples: values.length, p50: round(quantile(values, 0.5)), p80: round(quantile(values, 0.8)) };
}
const round = (n: number) => Math.round(n * 10) / 10;

function groupRates(samples: Sample[], key: (s: Sample) => string | null): PlanRate[] {
  const groups = new Map<string, number[]>();
  for (const s of samples) {
    const k = key(s);
    if (k) groups.set(k, [...(groups.get(k) ?? []), s.perWeight]);
  }
  return [...groups].map(([k, v]) => rate(k, v)).sort((a, b) => b.samples - a.samples);
}

function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildPlanTimeline(root: string, now = new Date()): PlanTimelinePayload {
  const base = path.join(root, '.specweave', 'increments');
  let names: string[] = [];
  try {
    names = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^\d{4,}-/.test(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    // No increments yet.
  }

  interface Loaded {
    row: PlanRow;
    events: LedgerEvent[];
    open: Array<{ weight: number; by: string | null }>;
  }
  const loaded: Loaded[] = [];
  const samples: Sample[] = [];
  const activity: PlanActivity[] = [];

  for (const name of names) {
    const dir = path.join(base, name);
    let item;
    try {
      item = projectIncrement(root, name);
    } catch {
      continue;
    }
    if (!item) continue;
    const metadata = readJson(path.join(dir, 'metadata.json'));
    const board = loadDashboardTaskBoard(dir);
    const events = readLedger(path.join(dir, 'ledger.jsonl')).events.sort((a, b) => a.at.localeCompare(b.at));
    const weights = new Map(
      board.tasks.map((t) => [
        t.id,
        taskWeight((t.filesAffected ?? []).filter((f) => f && f.toLowerCase() !== 'none').length, (t.acs ?? t.satisfiesACs ?? []).length),
      ]),
    );

    const status = String(metadata.status || item.incrementStatus || 'planned');
    const created = typeof metadata.created === 'string' && !Number.isNaN(Date.parse(metadata.created)) ? metadata.created : null;
    const first = events[0]?.at ?? null;
    const last = events[events.length - 1] ?? null;
    const start = [created, first].filter((x): x is string => !!x).sort()[0] ?? item.updatedAt;
    const updated = typeof metadata.updated === 'string' ? metadata.updated : null;
    const end = [last?.at, updated].filter((x): x is string => !!x).sort().pop() ?? null;

    // Closed without a live span: closed by skip, or done within a minute of the claim / with no claim.
    const claims = new Map<string, string>();
    let terminal = 0;
    let afterTheFact = 0;
    for (const e of events) {
      if (e.e === 'claim') claims.set(e.t, e.at);
      if (e.e !== 'done' && e.e !== 'skip') continue;
      terminal++;
      const claim = claims.get(e.t);
      if (e.e === 'skip' || !claim || minutes(claim, e.at) < 1) afterTheFact++;
    }

    // Spans from work recorded after the fact are bookkeeping, not work time.
    const recordedAfter = terminal >= 2 && afterTheFact / terminal >= 0.75;
    if (!recordedAfter) samples.push(...taskSamples(events, weights));

    const open = CLOSED.has(status)
      ? []
      : board.tasks
          .filter((t) => !['done', 'skipped'].includes(t.state.status))
          .map((t) => ({ weight: weights.get(t.id) ?? 1, by: t.state.status === 'open' ? null : t.state.by ?? null }));

    const title = item.title;
    for (const e of events) {
      if (e.e === 'session') continue;
      activity.push({
        at: e.at,
        incrementId: name,
        title,
        task: e.t,
        event: e.e,
        by: e.by,
        tool: toolOf(e.by),
        model: e.model ?? null,
        note: (e.note ?? e.line ?? (e.check ? `${e.check}: ${e.reason ?? ''}` : null))?.slice(0, 160) ?? null,
      });
    }

    loaded.push({
      events,
      open,
      row: {
        incrementId: name,
        title,
        status,
        state: item.state,
        start,
        end,
        tasks: {
          total: item.tasks.total,
          done: item.tasks.done,
          skipped: item.tasks.skipped,
          open: item.tasks.open + item.tasks.stale,
          claimed: item.tasks.claimed,
          blocked: item.tasks.blocked,
        },
        acs: item.acs,
        tools: [...new Set(events.map((e) => toolOf(e.by)))],
        models: [...new Set(events.map((e) => e.model).filter((m): m is string => !!m))],
        recordedAfter,
        remaining: null,
        lastEvent: last ? { at: last.at, e: last.e, t: last.t, by: last.by } : null,
        specPath: path.join(dir, 'spec.md'),
      },
    });
  }

  const overall = samples.length ? rate('all', samples.map((s) => s.perWeight)) : null;
  const byTool = groupRates(samples, (s) => s.tool);
  const byModel = groupRates(samples, (s) => s.model);
  const pick = (by: string | null): { p50: number; p80: number } => {
    if (by) {
      const tool = byTool.find((r) => r.key === toolOf(by) && r.samples >= MIN_SAMPLES);
      if (tool) return tool;
    }
    return overall && overall.samples >= MIN_SAMPLES ? overall : DEFAULT_RATE;
  };

  for (const { row, open, events } of loaded) {
    if (!open.length) continue;
    // A model recorded on this increment's newest event beats the tool rate.
    const model = [...events].reverse().find((e) => e.model)?.model;
    const modelRate = model ? byModel.find((r) => r.key === model && r.samples >= MIN_SAMPLES) : undefined;
    let p50 = 0;
    let p80 = 0;
    for (const task of open) {
      const r = modelRate ?? pick(task.by ?? events[events.length - 1]?.by ?? null);
      p50 += task.weight * r.p50;
      p80 += task.weight * r.p80;
    }
    row.remaining = {
      tasks: open.length,
      weight: round(open.reduce((n, t) => n + t.weight, 0)),
      p50Minutes: Math.round(p50),
      p80Minutes: Math.round(p80),
      finishP50: new Date(now.getTime() + Math.round(p50) * 60000).toISOString(),
      finishP80: new Date(now.getTime() + Math.round(p80) * 60000).toISOString(),
    };
  }

  // Lanes: the median number of agents that finished tasks on each active day of the last week.
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const agentsByDay = new Map<string, Set<string>>();
  for (const { events } of loaded) {
    for (const e of events) {
      if (e.e !== 'done' || Date.parse(e.at) < weekAgo) continue;
      const day = localDay(e.at);
      agentsByDay.set(day, (agentsByDay.get(day) ?? new Set()).add(e.by));
    }
  }
  const lanes = Math.max(1, Math.round(quantile([...agentsByDay.values()].map((set) => set.size), 0.5)));

  const since = now.getTime() - THROUGHPUT_DAYS * DAY_MS;
  const closes = loaded
    .flatMap(({ row, events }) =>
      events
        .filter((e) => (e.e === 'done' || e.e === 'skip') && Date.parse(e.at) >= since)
        .map((e) => ({ at: e.at, incrementId: row.incrementId, tool: toolOf(e.by) })),
    )
    .sort((a, b) => a.at.localeCompare(b.at));

  return {
    generatedAt: now.toISOString(),
    rows: loaded.map((l) => l.row),
    activity: activity.sort((a, b) => b.at.localeCompare(a.at)).slice(0, ACTIVITY_LIMIT),
    closes,
    rates: { overall: overall ?? rate('all', []), byTool, byModel, fallback: !overall || overall.samples < MIN_SAMPLES },
    lanes,
    smallFixes: readSmallFixes(root).length,
  };
}
