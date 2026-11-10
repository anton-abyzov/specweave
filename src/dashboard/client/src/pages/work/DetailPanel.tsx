/** The slide-over that opens from a card: everything about one item, read from its folder on disk. */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useApi } from '../../hooks/useApi';
import { useProject } from '../../hooks/useProject';
import {
  WORK_STATES,
  type ExecutionSegment,
  type WorkDetail,
  type WorkItem,
  type WorkState,
} from '../../../../work-types';
import { percent, progressOf, relativeTime, shortId, toolName, toolOf } from './board-model';
import { Markdown } from './Markdown';
import { ProgressBar, Ring, SegmentBar, SPRING, STATE_LABEL, StatePill, ToolAvatar, VerifyPill } from './parts';
import type { Work } from './useWork';

export interface LocalSession {
  key: string;
  sessionId: string;
  harness: string;
  updatedAt: string;
  coverage: string;
  segments: ExecutionSegment[];
}

const when = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Unknown';
const fact = (value: string | null | undefined) => value || 'Unknown';

const TABS = ['overview', 'spec', 'tasks', 'criteria', 'timeline', 'agents'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: 'Overview',
  spec: 'Spec',
  tasks: 'Tasks',
  criteria: 'Criteria',
  timeline: 'Timeline',
  agents: 'Agents',
};
const TASK_TONE: Record<string, string> = {
  completed: 'done',
  skipped: 'backlog',
  claimed: 'active',
  blocked: 'blocked',
  stale: 'blocked',
  pending: 'backlog',
};
const TASK_LABEL: Record<string, string> = {
  completed: 'Done',
  skipped: 'Skipped',
  claimed: 'In progress',
  blocked: 'Blocked',
  stale: 'Stale claim',
  pending: 'Open',
};
const EVENT_TONE: Record<string, string> = { done: 'done', claim: 'active', block: 'blocked', release: 'backlog', skip: 'backlog' };

export function DetailPanel({
  item,
  work,
  tab,
  setTab,
  onClose,
}: {
  item: WorkItem;
  work: Work;
  tab: string;
  setTab: (tab: string) => void;
  onClose: () => void;
}) {
  const { activeProject } = useProject();
  const project = activeProject ? `?project=${encodeURIComponent(activeProject.id)}` : '';
  const hasIncrement = Boolean(item.incrementId);
  const { data: detail, loading, refetch } = useApi<WorkDetail>(
    item.incrementId ? `/api/increments/${encodeURIComponent(item.incrementId)}${project}` : '',
  );
  // The board reloads on every disk change; the open panel follows it.
  useEffect(() => {
    if (work.tick) refetch();
  }, [work.tick, refetch]);
  const tabs = TABS.filter((t) => hasIncrement || t === 'overview' || t === 'agents');
  const active: Tab = tabs.includes(tab as Tab) ? (tab as Tab) : 'overview';
  const panel = useRef<HTMLDivElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closer.current?.focus();
    return () => before?.focus?.();
  }, [item.id]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) onClose();
      if (event.key !== 'Tab' || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href],button:not(:disabled),select:not(:disabled),input,textarea,summary,[tabindex="0"]',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panel.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const counts: Record<Tab, number | null> = {
    overview: null,
    spec: null,
    tasks: detail?.tasks.length ?? item.tasks.total,
    criteria: detail?.acs.length ?? item.acs.total,
    timeline: detail?.timeline.length ?? null,
    agents: item.executions.length,
  };

  return (
    <>
      <motion.div
        className="wb-scrim"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      />
      <motion.aside
        ref={panel}
        className="wb-panel"
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        initial={{ x: 48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 48, opacity: 0 }}
        transition={SPRING}
      >
        <header className="wb-panel-head">
          <div className="wb-panel-top">
            <span className="wb-id">{shortId(item)}</span>
            <StatePill state={item.state} />
            {item.type && <span className="wb-tag">{item.type}</span>}
            {item.priority && <span className={`wb-tag wb-prio-${item.priority.toLowerCase()}`}>{item.priority}</span>}
            <span className="wb-panel-updated">Updated {relativeTime(item.updatedAt)}</span>
            <button ref={closer} type="button" className="wb-icon-button" aria-label="Close details" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="m3.5 3.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <h2>{item.title}</h2>
          {item.tasks.total > 0 && (
            <div className="wb-panel-progress">
              <ProgressBar
                value={item.tasks.done + item.tasks.skipped}
                max={item.tasks.total}
                label={`${item.title} task progress`}
                size="lg"
              />
              <strong>{percent(progressOf(item))}%</strong>
              <span>
                {item.tasks.done}/{item.tasks.total} tasks · {item.acs.done}/{item.acs.total} criteria
              </span>
            </div>
          )}
          <nav className="wb-tabs" role="tablist" aria-label="Item details">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active === t}
                className={active === t ? 'is-active' : ''}
                onClick={() => setTab(t)}
              >
                {TAB_LABEL[t]}
                {counts[t] !== null && <span className="wb-tab-count">{counts[t]}</span>}
                {active === t && <motion.span layoutId="wb-tab-line" className="wb-tab-line" transition={SPRING} />}
              </button>
            ))}
          </nav>
        </header>
        <motion.div
          key={active}
          className="wb-panel-body"
          role="tabpanel"
          aria-label={TAB_LABEL[active]}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {work.failure && (
            <p role="alert" className="work-error">
              {work.failure}
            </p>
          )}
          {active === 'overview' && <Overview item={item} detail={detail} work={work} project={project} />}
          {active === 'agents' && <Agents item={item} work={work} project={project} />}
          {hasIncrement && active !== 'overview' && active !== 'agents' && !detail && (
            <p className="wb-quiet">{loading ? 'Reading the increment folder…' : 'This increment folder could not be read.'}</p>
          )}
          {detail && active === 'spec' && (detail.spec ? <Markdown source={detail.spec} /> : <p className="wb-quiet">No spec.md in this folder.</p>)}
          {detail && active === 'tasks' && <Tasks detail={detail} />}
          {detail && active === 'criteria' && <Criteria detail={detail} />}
          {detail && active === 'timeline' && <Timeline detail={detail} />}
        </motion.div>
      </motion.aside>
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="wb-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function CopyPath({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="wb-path">
      <code>{path}</code>
      <button
        type="button"
        className="wb-link-button"
        onClick={() => {
          void navigator.clipboard?.writeText(path).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}

function Overview({ item, detail, work, project }: { item: WorkItem; detail: WorkDetail | null; work: Work; project: string }) {
  const { activeProject } = useProject();
  const linked = [
    ...new Map((work.data?.items ?? []).filter((i) => i.incrementId).map((i) => [i.incrementId!, i])).keys(),
  ];
  const verify = detail?.verify as
    | { ok?: boolean; commands?: Array<{ cmd?: string; exit?: number }>; acs?: { total?: number; done?: number } }
    | undefined;
  const t = item.tasks;
  return (
    <div className="wb-overview">
      {item.tasks.total > 0 && (
        <section className="wb-progress-card">
          <Ring value={progressOf(item)} size={92} stroke={9}>
            <strong>{percent(progressOf(item))}%</strong>
            <span>tasks</span>
          </Ring>
          <div className="wb-progress-rows">
            <div>
              <div className="wb-row-label">
                <span>Tasks</span>
                <span>
                  {t.done} done · {t.claimed} in progress · {t.blocked + t.stale} blocked or stale · {t.open} open
                  {t.skipped ? ` · ${t.skipped} skipped` : ''}
                </span>
              </div>
              <SegmentBar
                label={`Tasks: ${t.done} of ${t.total} done`}
                size="lg"
                segments={[
                  { key: 'done', value: t.done, tone: 'done', label: 'Done' },
                  { key: 'skipped', value: t.skipped, tone: 'skipped', label: 'Skipped' },
                  { key: 'claimed', value: t.claimed, tone: 'active', label: 'In progress' },
                  { key: 'blocked', value: t.blocked + t.stale, tone: 'blocked', label: 'Blocked or stale' },
                  { key: 'open', value: t.open, tone: 'empty', label: 'Open' },
                ]}
              />
            </div>
            <div>
              <div className="wb-row-label">
                <span>Acceptance criteria</span>
                <span>
                  {item.acs.done} of {item.acs.total} met
                </span>
              </div>
              <ProgressBar value={item.acs.done} max={item.acs.total} label="Acceptance criteria met" size="lg" tone="review" />
            </div>
          </div>
        </section>
      )}
      {item.summary && item.source === 'increment' && (
        <section>
          <h3>Problem</h3>
          <p className="wb-summary">{item.summary}</p>
        </section>
      )}
      <section>
        <h3>Facts</h3>
        <dl className="wb-facts">
          <Fact label="State">
            <StatePill state={item.state} />
            <span className="wb-reason">{item.stateReason}</span>
          </Fact>
          <Fact label="Move to">
            <label className="wb-move">
              <span className="work-sr-only">State for {item.title}</span>
              <select
                value={item.state}
                disabled={work.saving}
                onChange={(event) => void work.move(item, event.target.value as WorkState)}
              >
                {WORK_STATES.map((s) => (
                  <option key={s} value={s}>
                    {STATE_LABEL[s]}
                  </option>
                ))}
              </select>
              <small>Board position only; it never edits the increment.</small>
            </label>
          </Fact>
          {item.incrementStatus && <Fact label="Increment status">{item.incrementStatus}</Fact>}
          <Fact label="Verification">
            <VerifyPill item={item} />
            {item.verification.ranAt && <span className="wb-reason">ran {when(item.verification.ranAt)}</span>}
          </Fact>
          {item.project && <Fact label="Project">{item.project}</Fact>}
          {item.createdAt && <Fact label="Created">{when(item.createdAt)}</Fact>}
          <Fact label="Updated">{when(item.updatedAt)}</Fact>
          {item.path && (
            <Fact label="Folder">
              <CopyPath path={activeProject ? `${activeProject.path}/${item.path}` : item.path} />
            </Fact>
          )}
        </dl>
      </section>
      {verify && typeof verify.ok === 'boolean' && (
        <section>
          <h3>Verification report</h3>
          <ul className="wb-commands">
            {(verify.commands ?? []).map((command, n) => (
              <li key={n} className={command.exit === 0 ? 'is-ok' : 'is-bad'}>
                <code>{command.cmd}</code>
                <span>exit {command.exit ?? '?'}</span>
              </li>
            ))}
            {!verify.commands?.length && <li className={verify.ok ? 'is-ok' : 'is-bad'}>{verify.ok ? 'Passed' : 'Failed'} with no recorded commands</li>}
          </ul>
          <details className="wb-details">
            <summary>Full report (reports/verify.json)</summary>
            <pre>{JSON.stringify(detail?.verify, null, 2)}</pre>
          </details>
        </section>
      )}
      {item.source === 'intent' && (
        <section>
          <h3>Intent</h3>
          <form
            className="work-form wb-form"
            key={`${item.id}-${item.revision}`}
            onSubmit={async (event) => {
              event.preventDefault();
              const values = Object.fromEntries(new FormData(event.currentTarget));
              if (await work.mutate(`/${encodeURIComponent(item.id)}`, 'PATCH', { ...values, revision: item.revision }))
                work.setNotice('Intent updated.');
            }}
          >
            <label>
              Intent
              <textarea name="summary" defaultValue={item.summary} rows={3} maxLength={2000} />
            </label>
            <label>
              Linked increment
              <select name="incrementId" defaultValue={item.incrementId || ''}>
                <option value="">No increment</option>
                {linked.map((id) => (
                  <option value={id} key={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <button className="work-secondary" disabled={work.saving}>
              Save context
            </button>
          </form>
        </section>
      )}
      {item.handoff && (
        <section>
          <h3>Latest handoff</h3>
          <details className="wb-details" open={item.state !== 'done'}>
            <summary>handoff.md</summary>
            <Markdown source={item.handoff} />
          </details>
        </section>
      )}
      {item.incrementId && (
        <Link className="wb-open-page" to={`/increments/${encodeURIComponent(item.incrementId)}${project}`}>
          Open the evidence page for {shortId(item)} ↗
        </Link>
      )}
      {detail?.warnings.map((warning) => (
        <p className="work-warning" key={warning}>
          {warning}
        </p>
      ))}
    </div>
  );
}

function Tasks({ detail }: { detail: WorkDetail }) {
  const [only, setOnly] = useState<'all' | 'open' | 'done'>('all');
  const isDone = (status: string) => status === 'completed' || status === 'skipped';
  const tasks = detail.tasks.filter((task) => only === 'all' || (only === 'done') === isDone(task.status));
  if (!detail.tasks.length) return <p className="wb-quiet">No tasks are defined in this increment.</p>;
  return (
    <div>
      <div className="wb-chiprow" role="group" aria-label="Show tasks">
        {(['all', 'open', 'done'] as const).map((value) => (
          <button key={value} type="button" className={`wb-chip ${only === value ? 'is-on' : ''}`} aria-pressed={only === value} onClick={() => setOnly(value)}>
            {value === 'all' ? `All ${detail.tasks.length}` : value === 'open' ? `Open ${detail.tasks.filter((t) => !isDone(t.status)).length}` : `Done ${detail.tasks.filter((t) => isDone(t.status)).length}`}
          </button>
        ))}
      </div>
      <ol className="wb-tasks">
        {tasks.map((task) => (
          <li key={task.id} className={`wb-task wb-tone-${TASK_TONE[task.status] ?? 'backlog'}`}>
            <div className="wb-task-head">
              <span className="wb-task-mark" aria-hidden="true" />
              <span className="wb-id">{task.id}</span>
              <strong>{task.title}</strong>
              <span className="wb-task-status">{TASK_LABEL[task.status] ?? task.status}</span>
            </div>
            <div className="wb-task-meta">
              {task.actor && (
                <span>
                  <ToolAvatar tool={toolOf(task.actor)} /> {task.actor}
                </span>
              )}
              {task.since && <span>{when(task.since)}</span>}
              {task.acs?.map((ac) => (
                <span className="wb-tag" key={ac}>
                  {ac}
                </span>
              ))}
            </div>
            {task.files?.some((file) => file !== 'none') ? <p className="wb-task-files">{task.files.filter((file) => file !== 'none').join(' · ')}</p> : null}
            {(task.evidence || task.note) && (
              <details className="wb-details" open={task.status !== 'completed'}>
                <summary>{task.evidence ? 'Evidence' : 'Note'}</summary>
                <pre>{task.evidence || task.note}</pre>
              </details>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Criteria({ detail }: { detail: WorkDetail }) {
  if (!detail.acs.length) return <p className="wb-quiet">spec.md lists no acceptance criteria.</p>;
  return (
    <ol className="wb-criteria">
      {detail.acs.map((ac) => (
        <li key={ac.id} className={ac.completed ? 'is-met' : ''}>
          <span className="wb-ac-mark" aria-hidden="true">
            {ac.completed && (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 8.3 6.6 11.4 12.6 4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <div>
            <p>
              <span className="wb-id">{ac.id}</span> {ac.text}
            </p>
            <div className="wb-task-meta">
              <span>{ac.completed ? (ac.via === 'ledger' ? 'Met: every covering task is done in the ledger' : 'Met: ticked in spec.md') : 'Not met'}</span>
              {ac.tasks.map((task) => (
                <span className={`wb-tag wb-tone-${TASK_TONE[task.status === 'done' ? 'completed' : task.status === 'open' ? 'pending' : task.status] ?? 'backlog'}`} key={task.id}>
                  {task.id} {task.status}
                </span>
              ))}
              {!ac.tasks.length && <span>No task covers it</span>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Timeline({ detail }: { detail: WorkDetail }) {
  if (!detail.timeline.length) return <p className="wb-quiet">ledger.jsonl has no events yet.</p>;
  return (
    <ol className="wb-timeline">
      {[...detail.timeline].reverse().map((event, n) => (
        <li key={`${event.at}-${n}`} className={`wb-tone-${EVENT_TONE[event.event] ?? 'review'}`}>
          <span className="wb-timeline-dot" aria-hidden="true" />
          <div>
            <p className="wb-timeline-title">
              <strong>{event.event}</strong>
              {event.task !== '*' && <span className="wb-id">{event.task}</span>}
              <span>{toolName(toolOf(event.by))}</span>
              {event.model && <span className="wb-model">{event.model}</span>}
              <time dateTime={event.at} title={when(event.at)}>
                {relativeTime(event.at)}
              </time>
            </p>
            {event.text && <pre>{event.text}</pre>}
            {event.link && /^https?:\/\//.test(event.link) && (
              <a href={event.link} target="_blank" rel="noreferrer noopener">
                {event.link}
              </a>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ExecutionHistory({ executions }: { executions: ExecutionSegment[] }) {
  if (!executions.length)
    return <p className="work-empty small">No execution recorded. Task claims will appear here automatically.</p>;
  return (
    <ol className="work-timeline">
      {executions.map((segment) => (
        <li key={segment.id}>
          <div className="work-timeline-dot" />
          <div>
            <div className="work-timeline-title">
              <strong>{fact(segment.harness)}</strong>
              <span>{fact(segment.model)}</span>
              <small>{segment.source === 'ledger' ? 'Ledger' : segment.source === 'session' ? 'Observed' : 'Declared'}</small>
            </div>
            <p>
              Effort {fact(segment.effort)} · Provider {fact(segment.provider)} · {fact(segment.surface)}
            </p>
            <p>
              {when(segment.startedAt)} · {segment.actor}
              {segment.sessionId ? ` · ${segment.sessionId}` : ''}
            </p>
            {segment.note && <p className="work-timeline-note">{segment.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Agents({ item, work, project }: { item: WorkItem; work: Work; project: string }) {
  const { data: sessions, loading } = useApi<LocalSession[]>(`/api/work/sessions${project}`);
  const patch = (body: Record<string, unknown>) =>
    work.mutate(`/${encodeURIComponent(item.id)}`, 'PATCH', { ...body, revision: item.revision });
  return (
    <div className="wb-agents">
      <p className="work-muted">
        A tool change keeps the same intent. Ledger actors are observed; added setups are declared. Unknown facts
        remain unknown.
      </p>
      <ExecutionHistory executions={item.executions} />
      <details className="work-add-setup">
        <summary>Link a local Codex or Claude Code session</summary>
        <p className="work-muted">
          Only sessions rooted in this project appear. Linking associates the observed setup with this intent; it
          never imports conversation text.
        </p>
        {loading ? (
          <p className="work-muted">Reading metadata…</p>
        ) : (
          <form
            className="work-form wb-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const sessionRef = new FormData(event.currentTarget).get('sessionRef');
              if (await patch({ sessionRef })) work.setNotice('Session linked.');
            }}
          >
            <label>
              Local session
              <select aria-label="Local session" name="sessionRef" required defaultValue="">
                <option value="" disabled>
                  Select a session
                </option>
                {(sessions || []).map((session) => (
                  <option key={session.key} value={session.key}>
                    {session.harness} · {session.sessionId.slice(0, 8)} · {when(session.updatedAt)}
                  </option>
                ))}
              </select>
            </label>
            <button className="work-secondary" disabled={work.saving || !sessions?.length}>
              Link observed session
            </button>
            {!sessions?.length && <p>No supported local session metadata found. Record a setup below.</p>}
          </form>
        )}
      </details>
      <details className="work-add-setup">
        <summary>+ Record a setup or continuation</summary>
        <form
          className="work-form wb-form"
          onSubmit={async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = Object.fromEntries(new FormData(form));
            if (
              await work.mutate(`/${encodeURIComponent(item.id)}/executions`, 'POST', {
                ...values,
                revision: item.revision,
              })
            ) {
              form.reset();
              work.setNotice('Execution setup recorded.');
            }
          }}
        >
          <div className="work-form-grid">
            <label>
              Harness
              <input name="harness" required placeholder="Codex, Claude Code, Cursor…" maxLength={120} />
            </label>
            <label>
              Model
              <input name="model" placeholder="Exact model ID, if known" maxLength={120} />
            </label>
            <label>
              Effort
              <input name="effort" placeholder="e.g. high" maxLength={80} />
            </label>
            <label>
              Provider
              <input name="provider" placeholder="e.g. OpenAI, OpenRouter" maxLength={120} />
            </label>
            <label>
              Surface
              <input name="surface" placeholder="Desktop, terminal, VS Code…" maxLength={120} />
            </label>
            <label>
              Session ID
              <input name="sessionId" placeholder="Optional source session" maxLength={200} />
            </label>
          </div>
          <label>
            Continuation note
            <input name="note" placeholder="What changed or where to continue" maxLength={500} />
          </label>
          <button className="work-primary" disabled={work.saving}>
            Record setup
          </button>
        </form>
      </details>
    </div>
  );
}
