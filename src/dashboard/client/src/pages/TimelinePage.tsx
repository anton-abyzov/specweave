import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { useProjectApi } from '../hooks/useProjectApi';
import { useUrlState } from '../hooks/useUrlState';
import { useSSEEvent } from '../contexts/SSEContext';
import type { PlanActivity, PlanRow, PlanTimelinePayload, WorkState } from '../../../work-types';
import './timeline.css';

const DAY = 86400000;
const WINDOWS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, all: 0 };
const STATE_LABEL: Record<WorkState, string> = {
  backlog: 'Backlog',
  active: 'In progress',
  blocked: 'Blocked',
  review: 'Review',
  done: 'Done',
};
const EVENT_LABEL: Record<string, string> = {
  claim: 'claimed',
  done: 'finished',
  skip: 'skipped',
  block: 'blocked',
  release: 'released',
  note: 'noted',
  handoff: 'handed off',
  pickup: 'picked up',
  wait: 'waiting',
};
const ROW_LIMIT = 40;

const when = (ms: number) =>
  new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const day = (ms: number) => new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' });
function hours(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const h = minutes / 60;
  return h < 10 ? `${h.toFixed(1)} h` : `${Math.round(h)} h`;
}
function ago(iso: string, now: number): string {
  const m = (now - Date.parse(iso)) / 60000;
  if (m < 1) return 'now';
  if (m < 60) return `${Math.round(m)}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}
const isOpen = (r: PlanRow) => r.state !== 'done' && r.status !== 'completed' && r.status !== 'abandoned';
const FAMILIES = ['claude', 'codex', 'copilot', 'cursor', 'gemini', 'grok'];
/** `codex-seo-coordinator` → `codex`: custom agent names keep their tool's colour. */
const toolClass = (tool: string) => FAMILIES.find((f) => tool === f || tool.startsWith(`${f}-`)) ?? 'other';
const ZOOMS: Record<string, number> = { '1d': 1, '3d': 3, '7d': 7, window: 0 };

export function TimelinePage() {
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const { data, error, loading, refetch } = useProjectApi<PlanTimelinePayload>('/api/plan');
  const [query, setQuery] = useUrlState('q');
  const [scope, setScope] = useUrlState('scope', 'open');
  const [tool, setTool] = useUrlState('tool', 'all');
  const [windowKey, setWindowKey] = useUrlState('window', '30d');
  const [zoom, setZoom] = useUrlState('zoom', '1d');
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useSSEEvent('increment-update', refetch);
  useEffect(() => {
    const timer = setInterval(() => {
      refetch();
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, [refetch]);
  const projectQuery = activeProject ? `?project=${encodeURIComponent(activeProject.id)}` : '';
  const detail = (id: string) => `/increments/${encodeURIComponent(id)}${projectQuery}`;

  const windowDays = WINDOWS[windowKey] ?? 30;
  const windowStart = windowDays ? now - windowDays * DAY : 0;
  const needle = query.trim().toLowerCase();

  const rows = useMemo(() => {
    const list = (data?.rows ?? []).filter((r) => {
      if (scope === 'open' && !isOpen(r)) return false;
      if (scope === 'done' && isOpen(r)) return false;
      if (tool !== 'all' && !r.tools.includes(tool)) return false;
      if (needle && !`${r.incrementId} ${r.title}`.toLowerCase().includes(needle)) return false;
      // Open work always shows; finished work only when it touched the window.
      if (windowStart && !isOpen(r) && Date.parse(r.end ?? r.start) < windowStart) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;
      return (b.lastEvent?.at ?? b.end ?? b.start).localeCompare(a.lastEvent?.at ?? a.end ?? a.start);
    });
  }, [data, scope, tool, needle, windowStart]);

  // Activity, throughput and the KPI tiles follow the same filters as the Gantt rows.
  const visible = useMemo(() => new Set(rows.map((r) => r.incrementId)), [rows]);
  const activity = useMemo(
    () =>
      (data?.activity ?? []).filter(
        (a) =>
          visible.has(a.incrementId) &&
          (tool === 'all' || a.tool === tool) &&
          (!windowStart || Date.parse(a.at) >= windowStart),
      ),
    [data, visible, tool, windowStart],
  );
  const closes = useMemo(
    () => (data?.closes ?? []).filter((c) => visible.has(c.incrementId) && (tool === 'all' || c.tool === tool)),
    [data, visible, tool],
  );
  const throughput = useMemo(() => dailyCloses(closes, now), [closes, now]);

  const tools = useMemo(() => [...new Set((data?.rows ?? []).flatMap((r) => r.tools))].sort(), [data]);
  const open = rows.filter((r) => r.remaining);
  const p50 = open.reduce((n, r) => n + (r.remaining?.p50Minutes ?? 0), 0);
  const p80 = open.reduce((n, r) => n + (r.remaining?.p80Minutes ?? 0), 0);
  const lanes = Math.max(1, Math.min(data?.lanes ?? 1, open.length || 1));
  const tasksLeft = open.reduce((n, r) => n + (r.remaining?.tasks ?? 0), 0);
  const finished = rows.filter((r) => !isOpen(r) && r.tasks.done + r.tasks.skipped >= 2);
  const live = finished.filter((r) => !r.recordedAfter).length;
  const week = closes.filter((c) => Date.parse(c.at) >= now - 7 * DAY).length;

  return (
    <div className="work-page timeline-page">
      <div className="work-eyebrow">
        <span className="work-live-dot connected" />
        TIMELINE
        <span>FROM THE TASK LEDGER · NO MODEL CALLS</span>
      </div>
      <div className="work-heading">
        <div>
          <h1>Where the work is, and when it lands.</h1>
          <p>Every increment on one timeline, with forecasts from this project's own pace.</p>
        </div>
        <Link className="work-secondary" to={`/${projectQuery}`}>
          Kanban board ↗
        </Link>
      </div>

      <div className="timeline-filters" role="group" aria-label="Timeline filters">
        <div className="timeline-segmented" role="radiogroup" aria-label="Status">
          {[
            ['open', 'Open'],
            ['all', 'All'],
            ['done', 'Done'],
          ].map(([key, label]) => (
            <button key={key} role="radio" aria-checked={scope === key} className={scope === key ? 'on' : ''} onClick={() => setScope(key)}>
              {label}
            </button>
          ))}
        </div>
        <label>
          <span>Agent</span>
          <select aria-label="Agent tool" value={tool} onChange={(e) => setTool(e.target.value)}>
            <option value="all">All agents</option>
            {tools.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Window</span>
          <select aria-label="Time window" value={windowKey} onChange={(e) => setWindowKey(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label>
          <span>Gantt</span>
          <select aria-label="Gantt range" value={zoom} onChange={(e) => setZoom(e.target.value)}>
            <option value="1d">Last day + forecast</option>
            <option value="3d">Last 3 days + forecast</option>
            <option value="7d">Last 7 days + forecast</option>
            <option value="window">Whole window</option>
          </select>
        </label>
        <label className="work-search">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Search increments" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an increment…" />
        </label>
      </div>

      {error && (
        <div role="alert" className="work-error">
          {error}
          <button onClick={refetch}>Retry</button>
        </div>
      )}

      <div className="work-metrics timeline-metrics" data-testid="timeline-kpis">
        <div>
          <span>Open increments</span>
          <strong>{open.length}</strong>
          <small>{tasksLeft} tasks left</small>
        </div>
        <div>
          <span>Forecast, {lanes} {lanes === 1 ? 'agent' : 'agents in parallel'}</span>
          <strong>{open.length ? (p50 / lanes < 1440 ? when(now + (p50 * 60000) / lanes) : day(now + (p50 * 60000) / lanes)) : '—'}</strong>
          <small>
            {open.length
              ? `${hours(p50 / lanes)} at the median pace, ${hours(p80 / lanes)} at p80 (${when(now + (p80 * 60000) / lanes)})`
              : 'nothing open in this view'}
          </small>
        </div>
        <div>
          <span>Closed in the last 7 days</span>
          <strong>{week}</strong>
          <small>tasks done or skipped</small>
        </div>
        <div>
          <span>Planned before the work</span>
          <strong className={finished.length && live / finished.length < 0.5 ? 'timeline-warn' : ''}>
            {finished.length ? `${Math.round((live / finished.length) * 100)}%` : '—'}
          </strong>
          <small>
            {finished.length - live} of {finished.length} recorded after the fact · {data?.smallFixes ?? 0} small fixes
          </small>
        </div>
      </div>

      {loading && !data ? (
        <p className="work-empty">Reading the ledger…</p>
      ) : (
        <>
          <Gantt
            rows={showAll ? rows : rows.slice(0, ROW_LIMIT)}
            now={now}
            rangeStart={ZOOMS[zoom] ? now - ZOOMS[zoom] * DAY : windowStart}
            detail={detail}
            onOpen={(id) => navigate(detail(id))}
          />
          {rows.length > ROW_LIMIT && (
            <button className="work-secondary timeline-more" onClick={() => setShowAll(!showAll)}>
              {showAll ? `Show the first ${ROW_LIMIT}` : `Show all ${rows.length} increments`}
            </button>
          )}
          <div className="timeline-lower">
            <section className="timeline-panel" aria-label="Throughput">
              <h2>
                Throughput <span>tasks closed per day, last 30 days</span>
              </h2>
              <Throughput data={throughput} />
              <Pace payload={data} />
            </section>
            <section className="timeline-panel" aria-label="Latest activity">
              <h2>
                Latest activity <span>{activity.length} events</span>
              </h2>
              <ActivityFeed items={activity.slice(0, 40)} now={now} detail={detail} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Gantt({
  rows,
  now,
  rangeStart,
  detail,
  onOpen,
}: {
  rows: PlanRow[];
  now: number;
  rangeStart: number;
  detail: (id: string) => string;
  onOpen: (id: string) => void;
}) {
  if (!rows.length) return <p className="work-empty">No increments match these filters.</p>;
  const starts = rows.map((r) => Date.parse(r.start));
  const forecastEnd = Math.max(now, ...rows.map((r) => (r.remaining ? now + r.remaining.p80Minutes * 60000 : 0)));
  const from = Math.max(Math.min(...starts), rangeStart || 0);
  // Keep at least a fifth of the chart for the future so forecasts stay readable.
  const past = Math.max(now - from, 3600000);
  const to = Math.min(Math.max(forecastEnd + past * 0.05, now + past / 4), now + 14 * DAY);
  const span = to - from;
  const x = (ms: number) => `${Math.min(100, Math.max(0, ((ms - from) / span) * 100))}%`;
  const w = (a: number, b: number) => `${Math.max(0.35, ((Math.min(b, to) - Math.max(a, from)) / span) * 100)}%`;
  const ticks: number[] = [];
  const step = span > 45 * DAY ? 7 * DAY : span > 12 * DAY ? 2 * DAY : span > 4 * DAY ? DAY : span > 1.5 * DAY ? DAY / 4 : DAY / 8;
  const first = new Date(from);
  first.setHours(0, 0, 0, 0);
  for (let t = first.getTime() + step; t < to - step / 3; t += step) if (t > from + step / 3) ticks.push(t);
  const tickLabel = (t: number) =>
    step >= DAY || new Date(t).getHours() === 0 ? day(t) : new Date(t).toLocaleTimeString([], { hour: 'numeric' });

  return (
    <section className="timeline-gantt" aria-label="Gantt chart" data-testid="gantt">
      <div className="gantt-head">
        <div className="gantt-label">Increment</div>
        <div className="gantt-track">
          {ticks.map((t) => (
            <span key={t} className="gantt-tick" style={{ left: x(t) }}>
              {tickLabel(t)}
            </span>
          ))}
          <span className="gantt-now-label" style={{ left: x(now) }}>
            Now
          </span>
        </div>
      </div>
      {rows.map((r) => {
        const start = Date.parse(r.start);
        const end = isOpen(r) ? now : r.end ? Date.parse(r.end) : start;
        const f50 = r.remaining ? now + r.remaining.p50Minutes * 60000 : 0;
        const f80 = r.remaining ? now + r.remaining.p80Minutes * 60000 : 0;
        const progress = r.tasks.total ? `${r.tasks.done + r.tasks.skipped}/${r.tasks.total} tasks` : 'no tasks';
        return (
          <div className={`gantt-row state-${r.state}`} key={r.incrementId} data-increment={r.incrementId}>
            <div className="gantt-label">
              <Link to={detail(r.incrementId)} title={r.title}>
                <code>{r.incrementId.split('-')[0]}</code> {r.title}
              </Link>
              <small>
                {STATE_LABEL[r.state]} · {progress}
                {r.recordedAfter && <em title="Most tasks were closed with no live claim-to-done span"> · recorded after</em>}
                {' · '}
                <a href={`vscode://file${r.specPath}`} title={r.specPath}>
                  spec.md
                </a>
              </small>
            </div>
            <div className="gantt-track" onClick={() => onOpen(r.incrementId)} role="presentation">
              {ticks.map((t) => (
                <span key={t} className="gantt-grid" style={{ left: x(t) }} />
              ))}
              {r.lastEvent && end >= from && (
              <span
                className="gantt-bar"
                style={{ left: x(start), width: w(start, end) }}
                title={`${r.title}\n${when(start)} → ${isOpen(r) ? 'now' : when(end)}\n${progress}, ${r.acs.done}/${r.acs.total} ACs`}
              />
              )}
              {r.remaining && (
                <>
                  <span
                    className="gantt-forecast"
                    style={{ left: x(now), width: w(now, f50) }}
                    title={`Forecast: ${r.remaining.tasks} tasks, ${hours(r.remaining.p50Minutes)} (p50) to ${hours(r.remaining.p80Minutes)} (p80) of uninterrupted work\nLands ${when(f50)}, by ${when(f80)} at p80`}
                  />
                  <span className="gantt-whisker" style={{ left: x(f50), width: w(f50, f80) }} />
                </>
              )}
              <span className="gantt-now" style={{ left: x(now) }} />
            </div>
          </div>
        );
      })}
      <div className="gantt-legend">
        <span className="legend-live">Worked</span>
        <span className="legend-forecast">Forecast (p50)</span>
        <span className="legend-whisker">to p80</span>
        <span>Forecasts assume uninterrupted work at this project's measured pace.</span>
      </div>
    </section>
  );
}

interface DayCount {
  date: string;
  byFamily: Record<string, number>;
}
/** Closed tasks per local day for the last 30 days, grouped by agent family. */
function dailyCloses(closes: PlanTimelinePayload['closes'], now: number): DayCount[] {
  const key = (ms: number) => new Date(ms).toLocaleDateString('en-CA');
  const days = new Map<string, DayCount>();
  for (let i = 29; i >= 0; i--) {
    const date = key(now - i * DAY);
    days.set(date, { date, byFamily: {} });
  }
  for (const c of closes) {
    const d = days.get(key(Date.parse(c.at)));
    if (d) d.byFamily[toolClass(c.tool)] = (d.byFamily[toolClass(c.tool)] ?? 0) + 1;
  }
  return [...days.values()];
}

function Throughput({ data }: { data: DayCount[] }) {
  const values = data.map((d) => d.byFamily);
  const totals = values.map((v) => Object.values(v).reduce((n, x) => n + x, 0));
  const max = Math.max(1, ...totals);
  const keys = [...new Set(values.flatMap((v) => Object.keys(v)))];
  const H = 120;
  const bw = 100 / Math.max(1, data.length);
  return (
    <figure className="timeline-throughput">
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" role="img" aria-label={`Tasks closed per day; peak ${max}`}>
        {values.map((v, i) => {
          let y = H;
          return keys.map((k) => {
            const h = ((v[k] ?? 0) / max) * (H - 6);
            if (!h) return null;
            y -= h;
            return (
              <rect key={`${i}-${k}`} className={`tool-${toolClass(k)}`} x={i * bw + bw * 0.15} y={y} width={bw * 0.7} height={h}>
                <title>{`${data[i].date}: ${v[k]} by ${k}`}</title>
              </rect>
            );
          });
        })}
      </svg>
      <figcaption>
        <span>{data[0]?.date}</span>
        <span>peak {max}/day</span>
        <span>{data[data.length - 1]?.date}</span>
      </figcaption>
      <div className="timeline-tool-legend">
        {keys.slice(0, 8).map((k) => (
          <span key={k} className={`tool-${toolClass(k)}`}>
            {k}
          </span>
        ))}
      </div>
    </figure>
  );
}

function Pace({ payload }: { payload: PlanTimelinePayload | null }) {
  if (!payload) return null;
  const { overall, byTool, byModel, fallback } = payload.rates;
  const rows = [...byModel.slice(0, 4).map((r) => ({ ...r, kind: 'model' })), ...byTool.slice(0, 5).map((r) => ({ ...r, kind: 'agent' }))];
  return (
    <div className="timeline-pace">
      <h3>
        Pace <span>minutes per task weight unit, from {overall.samples} tasks tracked live</span>
      </h3>
      {fallback && <p className="work-warning">Too little live history; forecasts use 30 min (p50) and 60 min (p80) per unit.</p>}
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Tasks</th>
            <th>p50</th>
            <th>p80</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>All work</td>
            <td>{overall.samples}</td>
            <td>{overall.p50}</td>
            <td>{overall.p80}</td>
          </tr>
          {rows.map((r) => (
            <tr key={`${r.kind}-${r.key}`}>
              <td>
                <small>{r.kind}</small> {r.key}
              </td>
              <td>{r.samples}</td>
              <td>{r.p50}</td>
              <td>{r.p80}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityFeed({ items, now, detail }: { items: PlanActivity[]; now: number; detail: (id: string) => string }) {
  if (!items.length) return <p className="work-empty">No ledger activity in this view.</p>;
  return (
    <ol className="timeline-activity">
      {items.map((a, i) => (
        <li key={`${a.at}-${a.incrementId}-${a.task}-${i}`}>
          <time dateTime={a.at} title={when(Date.parse(a.at))}>
            {ago(a.at, now)}
          </time>
          <span className={`activity-event event-${a.event}`}>{EVENT_LABEL[a.event] ?? a.event}</span>
          <div>
            <Link to={detail(a.incrementId)}>
              <code>{a.incrementId.split('-')[0]}</code> {a.task !== '*' ? `${a.task} · ` : ''}
              {a.title}
            </Link>
            {a.note && <p>{a.note}</p>}
            <small>
              <span className={`tool-dot tool-${toolClass(a.tool)}`} /> {a.by}
              {a.model ? ` · ${a.model}` : ''}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
