/**
 * What the Timeline page shows for one set of filters: the Gantt rows, the
 * activity feed, the closes behind Throughput and the KPI tiles. Pure, so the
 * counting rules are tested without a browser.
 */
import type { PlanActivity, PlanRow, PlanTimelinePayload } from '../../../work-types';

const DAY = 86400000;

export const isOpen = (r: PlanRow) => r.state !== 'done' && r.status !== 'completed' && r.status !== 'abandoned';

export interface TimelineFilters {
  /** `open`, `all` or `done`: which Gantt rows show. */
  scope: string;
  /** An agent tool, or `all`. */
  tool: string;
  query: string;
  /** Start of the time window in ms, 0 for all time. */
  windowStart: number;
}

export interface TimelineView {
  rows: PlanRow[];
  activity: PlanActivity[];
  closes: PlanTimelinePayload['closes'];
  kpis: {
    /** Open rows in view, with or without tasks left. */
    open: number;
    tasksLeft: number;
    /** Open rows with a forecast (tasks left). */
    forecast: PlanRow[];
    closedThisWeek: number;
    finished: number;
    live: number;
  };
}

export function timelineView(data: PlanTimelinePayload | null | undefined, filters: TimelineFilters, now: number): TimelineView {
  const { scope, tool, windowStart } = filters;
  const needle = filters.query.trim().toLowerCase();
  const all = data?.rows ?? [];

  // Agent, search and window narrow everything on the page.
  const matching = all.filter((r) => {
    if (tool !== 'all' && !r.tools.includes(tool)) return false;
    if (needle && !`${r.incrementId} ${r.title}`.toLowerCase().includes(needle)) return false;
    // Open work always shows; finished work only when it touched the window.
    if (windowStart && !isOpen(r) && Date.parse(r.end ?? r.start) < windowStart) return false;
    return true;
  });

  // Open / Done picks the Gantt rows only: closed work and recent activity are
  // what the Closed tile, Throughput and Latest activity count, so hiding
  // closed increments must not empty them.
  const rows = matching
    .filter((r) => (scope === 'open' ? isOpen(r) : scope === 'done' ? !isOpen(r) : true))
    .sort((a, b) => {
      if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;
      return (b.lastEvent?.at ?? b.end ?? b.start).localeCompare(a.lastEvent?.at ?? a.end ?? a.start);
    });

  const ids = new Set(matching.map((r) => r.incrementId));
  const activity = (data?.activity ?? []).filter(
    (a) => ids.has(a.incrementId) && (tool === 'all' || a.tool === tool) && (!windowStart || Date.parse(a.at) >= windowStart),
  );
  const closes = (data?.closes ?? []).filter((c) => ids.has(c.incrementId) && (tool === 'all' || c.tool === tool));

  const openRows = rows.filter(isOpen);
  const forecast = openRows.filter((r) => r.remaining);
  const finished = matching.filter((r) => !isOpen(r) && r.tasks.done + r.tasks.skipped >= 2);
  return {
    rows,
    activity,
    closes,
    kpis: {
      open: openRows.length,
      tasksLeft: forecast.reduce((n, r) => n + (r.remaining?.tasks ?? 0), 0),
      forecast,
      closedThisWeek: closes.filter((c) => Date.parse(c.at) >= now - 7 * DAY).length,
      finished: finished.length,
      live: finished.filter((r) => !r.recordedAfter).length,
    },
  };
}
