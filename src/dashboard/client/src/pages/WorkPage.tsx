import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useProjectApi } from '../hooks/useProjectApi';
import { useProject } from '../hooks/useProject';
import { useSSEEvent, useSSEStatus } from '../contexts/SSEContext';
import {
  WORK_STATES,
  type WorkBoardPayload,
  type WorkItem,
  type WorkState,
  type ExecutionSegment,
} from '../../../work-types';

interface LocalSession {
  key: string;
  sessionId: string;
  harness: string;
  updatedAt: string;
  coverage: string;
  segments: ExecutionSegment[];
}
const LABELS: Record<WorkState, string> = {
  backlog: 'Backlog',
  active: 'In progress',
  blocked: 'Blocked',
  review: 'Review',
  done: 'Done',
};
const date = (value: string) =>
  value
    ? new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';
const fact = (value: string | null) => value || 'Unknown';

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="work-dialog" onCancel={onClose} onClose={onClose} aria-label={title}>
      <div className="work-dialog-heading">
        <h2>{title}</h2>
        <button type="button" className="work-icon-button" aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function WorkPage({ sessionsOnly = false }: { sessionsOnly?: boolean }) {
  const { activeProject } = useProject();
  const { data, error, loading, refetch } = useProjectApi<WorkBoardPayload>('/api/work');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [dropTarget, setDropTarget] = useState<WorkState | null>(null);
  const sessionQuery = activeProject ? `?project=${encodeURIComponent(activeProject.id)}` : '';
  const { data: localSessions, loading: sessionsLoading, refetch: refetchSessions } = useApi<LocalSession[]>(
    sessionsOnly || selectedId ? `/api/work/sessions${sessionQuery}` : '',
  );
  const sse = useSSEStatus();
  useSSEEvent('increment-update', refetch);
  // A reconciliation poll covers missed filesystem notifications and expired claims, without model calls.
  useEffect(() => {
    const timer = setInterval(() => {
      refetch();
      if (sessionsOnly || selectedId) refetchSessions();
    }, 15000);
    return () => clearInterval(timer);
  }, [refetch, refetchSessions, sessionsOnly, selectedId]);
  useEffect(() => {
    setSelectedId(null);
    setCreating(false);
  }, [activeProject?.id]);

  async function mutate(endpoint: string, method: string, body: unknown): Promise<boolean> {
    if (saving) return false;
    setSaving(true);
    setFailure('');
    try {
      const suffix = activeProject ? `?project=${encodeURIComponent(activeProject.id)}` : '';
      const response = await fetch(`/api/work${endpoint}${suffix}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not save work');
      refetch();
      return true;
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Could not save work');
      refetch();
      return false;
    } finally {
      setSaving(false);
    }
  }
  async function move(item: WorkItem, state: WorkState) {
    if (state === item.state) return;
    if (await mutate(`/${encodeURIComponent(item.id)}`, 'PATCH', { revision: item.revision, state }))
      setNotice(`${item.title} moved to ${LABELS[state]}.`);
  }
  const items = (data?.items ?? []).filter((item) =>
    `${item.title} ${item.summary} ${item.incrementId ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = data?.items.find((item) => item.id === selectedId);
  const linkedOptions = [
    ...new Map((data?.items ?? []).filter((i) => i.incrementId).map((i) => [i.incrementId, i])).values(),
  ];
  const projectQuery = activeProject ? `?project=${encodeURIComponent(activeProject.id)}` : '';

  return (
    <div className="work-page">
      <div className="work-eyebrow">
        <span className={`work-live-dot ${sse === 'connected' ? 'connected' : ''}`} />
        {sse === 'connected' ? 'LIVE WORKSPACE' : 'WORKSPACE'}
        <span>LOCAL · NO MODEL CALLS</span>
      </div>
      <div className="work-heading">
        <div>
          <h1>{sessionsOnly ? 'Execution history' : 'Work, without the reset.'}</h1>
          <p>
            {sessionsOnly
              ? 'Follow the tools and people that carried each intent forward.'
              : 'Keep the intent. See the progress. Pick up with any tool.'}
          </p>
        </div>
        {!sessionsOnly && (
          <button className="work-primary" onClick={() => setCreating(true)}>
            + New intent
          </button>
        )}
      </div>
      <div className="work-metrics">
        <div>
          <span>In progress</span>
          <strong>{data?.counts.active ?? '—'}</strong>
          <small>moving forward</small>
        </div>
        <div>
          <span>Needs attention</span>
          <strong className="work-amber">{data?.counts.blocked ?? '—'}</strong>
          <small>blocked or stale claims</small>
        </div>
        <div>
          <span>Tasks complete</span>
          <strong>
            {data?.totals.done ?? '—'}
            <em> / {data?.totals.tasks ?? '—'}</em>
          </strong>
          <small>from the task ledger</small>
        </div>
        <div>
          <span>Verification passed</span>
          <strong>{data?.totals.verified ?? '—'}</strong>
          <small>linked increments with current reports</small>
        </div>
      </div>
      <div className="work-toolbar">
        <div className="work-view-label">
          {sessionsOnly ? 'SETUPS & CONTINUATIONS' : 'INTENT BOARD'}
          <span>{items.length} items</span>
        </div>
        <label className="work-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search work"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find an intent or increment…"
          />
        </label>
      </div>
      {(failure || error) && (
        <div role="alert" className="work-error">
          {failure || error}
          <button onClick={refetch}>Retry</button>
        </div>
      )}
      <span className="work-sr-only" role="status" aria-live="polite">
        {notice}
      </span>
      {data?.warnings.map((warning) => (
        <p className="work-warning" key={warning}>
          {warning}
        </p>
      ))}
      {loading && !data ? (
        <p className="work-empty">Reading local work…</p>
      ) : sessionsOnly ? (
        <div className="work-session-list">
          <LocalSessions
            sessions={localSessions || []}
            loading={sessionsLoading}
            items={data?.items || []}
            saving={saving}
            link={async (sessionRef, item) => {
              if (
                await mutate(`/${encodeURIComponent(item.id)}`, 'PATCH', {
                  revision: item.revision,
                  sessionRef,
                })
              )
                setNotice('Session linked to intent.');
            }}
          />
          {items
            .filter((i) => i.executions.length)
            .map((item) => (
              <section key={item.id} className="work-session-group">
                <button onClick={() => setSelectedId(item.id)}>
                  {item.title} <span>↗</span>
                </button>
                <ExecutionHistory item={item} />
              </section>
            ))}
          {!items.some((i) => i.executions.length) && (
            <p className="work-empty">
              No execution history yet. Claims appear automatically; add a setup to an intent to record its
              model and effort.
            </p>
          )}
        </div>
      ) : (
        <div className="work-board-scroll">
          <div className="work-board">
            {WORK_STATES.map((state) => (
              <section
                className={`work-column state-${state} ${dropTarget === state ? 'is-drop-target' : ''}`}
                key={state}
                aria-label={`${LABELS[state]} column`}
                onDragOver={(event) => {
                  if (event.dataTransfer.types.includes('application/specweave-intent')) {
                    event.preventDefault();
                    setDropTarget(state);
                  }
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropTarget(null);
                  const item = data?.items.find(
                    (i) => i.id === event.dataTransfer.getData('application/specweave-intent'),
                  );
                  if (item) void move(item, state);
                }}
              >
                <div className="work-column-title">
                  <span className="work-state-dot" />
                  <h2>{LABELS[state]}</h2>
                  <span className="work-count">{items.filter((i) => i.state === state).length}</span>
                </div>
                <div className="work-cards">
                  {items
                    .filter((i) => i.state === state)
                    .map((item) => (
                      <article
                        key={item.id}
                        className="work-card"
                        data-intent-id={item.id}
                        draggable={!saving}
                        onDragStart={(event) => {
                          event.dataTransfer.setData('application/specweave-intent', item.id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDropTarget(null)}
                      >
                        <div className="work-card-top">
                          <span>{item.incrementId ? `INC ${item.incrementId.split('-')[0]}` : 'INTENT'}</span>
                          <span className="work-drag" aria-hidden="true">
                            ⠿
                          </span>
                        </div>
                        <button className="work-card-title" onClick={() => setSelectedId(item.id)}>
                          {item.title}
                        </button>
                        <p className="work-card-summary">
                          {item.summary || 'Add a short outcome so the next session starts with context.'}
                        </p>
                        {item.tasks.total > 0 && (
                          <div className="work-progress">
                            <div>
                              <span>
                                {item.tasks.done}/{item.tasks.total} tasks
                              </span>
                              <span>
                                {item.acs.done}/{item.acs.total} ACs
                              </span>
                            </div>
                            <progress
                              aria-label={`${item.title} task progress`}
                              value={item.tasks.done}
                              max={item.tasks.total}
                            />
                            {item.tasks.skipped > 0 && <small>{item.tasks.skipped} skipped</small>}
                          </div>
                        )}
                        <div className="work-card-proof">
                          <span className={`proof-${item.verification.status}`}>
                            {item.verification.status === 'passed'
                              ? '✓ Verified'
                              : item.verification.status === 'failed'
                                ? '× Check failed'
                                : item.verification.status === 'stale'
                                  ? '↻ Recheck needed'
                                  : item.incrementId
                                    ? '○ Not verified'
                                    : '○ No increment'}
                          </span>
                          {item.incrementId && (
                            <Link
                              to={`/increments/${encodeURIComponent(item.incrementId)}${projectQuery}`}
                              aria-label={`Evidence for ${item.title}`}
                            >
                              Evidence ↗
                            </Link>
                          )}
                        </div>
                        {item.executions.length > 0 && (
                          <div className="work-card-actor">
                            <span className="work-avatar">
                              {(item.executions[item.executions.length - 1]?.harness || '?')
                                .slice(0, 1)
                                .toUpperCase()}
                            </span>
                            <span>
                              {fact(item.executions[item.executions.length - 1]!.harness)}
                              <small>
                                {item.executions[item.executions.length - 1]!.model || 'Model unknown'}
                              </small>
                            </span>
                            {item.executions.length > 1 && (
                              <span className="work-setup-count">+{item.executions.length - 1}</span>
                            )}
                          </div>
                        )}
                        <label className="work-state-control">
                          <span className="work-sr-only">State for {item.title}</span>
                          <select
                            value={item.state}
                            disabled={saving}
                            onChange={(event) => void move(item, event.target.value as WorkState)}
                          >
                            {WORK_STATES.map((s) => (
                              <option key={s} value={s}>
                                {LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    ))}
                  {!items.some((i) => i.state === state) && (
                    <div className="work-column-empty">
                      {state === 'backlog'
                        ? 'A clear intent is enough to start.'
                        : state === 'done'
                          ? 'Finished work lands here.'
                          : 'No work here yet.'}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
      <div className="work-footnote">
        <span>Board state organizes work. Verification comes from linked increments.</span>
        <span>{data ? `Updated ${date(data.generatedAt)}` : ''}</span>
      </div>
      {creating && (
        <Dialog title="Capture an intent" onClose={() => setCreating(false)}>
          <form
            className="work-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              if (await mutate('', 'POST', Object.fromEntries(values))) {
                setCreating(false);
                setNotice('Intent created.');
              }
            }}
          >
            <p>Describe the outcome. Small work can start without an increment.</p>
            <label>
              Title
              <input
                name="title"
                required
                maxLength={180}
                autoFocus
                placeholder="What should be different when this is done?"
              />
            </label>
            <label>
              Intent
              <textarea
                name="summary"
                rows={3}
                maxLength={2000}
                placeholder="Why it matters, expected result, or context for the next session."
              />
            </label>
            <label>
              Linked increment
              <select name="incrementId">
                <option value="">No increment yet</option>
                {linkedOptions.map((i) => (
                  <option value={i.incrementId!} key={i.incrementId}>
                    {i.incrementId}
                  </option>
                ))}
              </select>
            </label>
            {failure && (
              <p role="alert" className="work-error">
                {failure}
              </p>
            )}
            <button disabled={saving} className="work-primary">
              {saving ? 'Saving…' : 'Create intent'}
            </button>
          </form>
        </Dialog>
      )}
      {selected && (
        <Dialog title={selected.title} onClose={() => setSelectedId(null)}>
          <div className="work-detail">
            <div className="work-detail-meta">
              <span>{LABELS[selected.state]}</span>
              <span>{selected.incrementId || 'No increment linked'}</span>
            </div>
            <form
              className="work-form"
              key={`${selected.id}-summary`}
              onSubmit={async (event) => {
                event.preventDefault();
                const values = Object.fromEntries(new FormData(event.currentTarget));
                if (
                  await mutate(`/${encodeURIComponent(selected.id)}`, 'PATCH', {
                    ...values,
                    revision: selected.revision,
                  })
                )
                  setNotice('Intent updated.');
              }}
            >
              <label>
                Intent
                <textarea name="summary" defaultValue={selected.summary} rows={3} maxLength={2000} />
              </label>
              <label>
                Linked increment
                <select name="incrementId" defaultValue={selected.incrementId || ''}>
                  <option value="">No increment</option>
                  {linkedOptions.map((i) => (
                    <option value={i.incrementId!} key={i.incrementId}>
                      {i.incrementId}
                    </option>
                  ))}
                </select>
              </label>
              <button className="work-secondary" disabled={saving}>
                Save context
              </button>
            </form>
            <section className="work-evidence">
              <h3>Delivery evidence</h3>
              <div>
                <strong>
                  {selected.tasks.done}/{selected.tasks.total}
                </strong>
                <span>tasks complete · {selected.evidenceCount} with ledger evidence</span>
              </div>
              <p>
                {selected.acs.done}/{selected.acs.total} acceptance criteria · Verification{' '}
                {selected.verification.status}
                {selected.verification.ranAt ? ` · ${date(selected.verification.ranAt)}` : ''}
              </p>
              {selected.incrementId ? (
                <Link to={`/increments/${encodeURIComponent(selected.incrementId)}${projectQuery}`}>
                  Open specification, tasks and verification ↗
                </Link>
              ) : (
                <p>Attach an increment when this work needs a specification and checks.</p>
              )}
            </section>
            <section>
              <h3>Execution history</h3>
              <p className="work-muted">
                A tool change keeps the same intent. Ledger actors are observed; added setups are declared.
                Unknown facts remain unknown.
              </p>
              <ExecutionHistory item={selected} />
            </section>
            <details className="work-add-setup">
              <summary>Link a local Codex or Claude Code session</summary>
              <p className="work-muted">
                Only sessions rooted in this project appear. Linking associates the observed setup with this
                intent; it never imports conversation text.
              </p>
              {sessionsLoading ? (
                <p className="work-muted">Reading metadata…</p>
              ) : (
                <form
                  className="work-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const sessionRef = new FormData(event.currentTarget).get('sessionRef');
                    if (
                      await mutate(`/${encodeURIComponent(selected.id)}`, 'PATCH', {
                        revision: selected.revision,
                        sessionRef,
                      })
                    )
                      setNotice('Session linked.');
                  }}
                >
                  <label>
                    Local session
                    <select aria-label="Local session" name="sessionRef" required defaultValue="">
                      <option value="" disabled>
                        Select a session
                      </option>
                      {(localSessions || []).map((session) => (
                        <option key={session.key} value={session.key}>
                          {session.harness} · {session.sessionId.slice(0, 8)} · {date(session.updatedAt)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="work-secondary" disabled={saving || !localSessions?.length}>
                    Link observed session
                  </button>
                  {!localSessions?.length && (
                    <p>No supported local session metadata found. Record a setup below.</p>
                  )}
                </form>
              )}
            </details>
            <details className="work-add-setup">
              <summary>+ Record a setup or continuation</summary>
              <form
                className="work-form"
                onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const values = Object.fromEntries(new FormData(form));
                  if (
                    await mutate(`/${encodeURIComponent(selected.id)}/executions`, 'POST', {
                      ...values,
                      revision: selected.revision,
                    })
                  ) {
                    form.reset();
                    setNotice('Execution setup recorded.');
                  }
                }}
              >
                <div className="work-form-grid">
                  <label>
                    Harness
                    <input
                      name="harness"
                      required
                      placeholder="Codex, Claude Code, Cursor…"
                      maxLength={120}
                    />
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
                <button className="work-primary" disabled={saving}>
                  Record setup
                </button>
              </form>
            </details>
            {selected.handoff && (
              <details className="work-handoff">
                <summary>Latest handoff</summary>
                <pre>{selected.handoff}</pre>
              </details>
            )}
            {failure && (
              <p role="alert" className="work-error">
                {failure}
              </p>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function ExecutionHistory({ item }: { item: WorkItem }) {
  if (!item.executions.length)
    return (
      <p className="work-empty small">No execution recorded. Task claims will appear here automatically.</p>
    );
  return (
    <ol className="work-timeline">
      {item.executions.map((segment) => (
        <li key={segment.id}>
          <div className="work-timeline-dot" />
          <div>
            <div className="work-timeline-title">
              <strong>{fact(segment.harness)}</strong>
              <span>{fact(segment.model)}</span>
              <small>
                {segment.source === 'ledger'
                  ? 'Ledger'
                  : segment.source === 'session'
                    ? 'Observed'
                    : 'Declared'}
              </small>
            </div>
            <p>
              Effort {fact(segment.effort)} · Provider {fact(segment.provider)} · {fact(segment.surface)}
            </p>
            <p>
              {date(segment.startedAt)} · {segment.actor}
              {segment.sessionId ? ` · ${segment.sessionId}` : ''}
            </p>
            {segment.note && <p className="work-timeline-note">{segment.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function LocalSessions({
  sessions,
  loading,
  items,
  saving,
  link,
}: {
  sessions: LocalSession[];
  loading: boolean;
  items: WorkItem[];
  saving: boolean;
  link: (ref: string, item: WorkItem) => Promise<void>;
}) {
  return (
    <section className="work-local-sessions">
      <h2>Local sessions</h2>
      <p className="work-muted">
        Project-scoped Codex and Claude Code metadata. Associate sessions with an intent explicitly. Model
        changes in large logs may be missing between observed windows.
      </p>
      {loading && <p className="work-empty">Reading local metadata…</p>}
      {!loading && !sessions.length && (
        <p className="work-empty">No supported session metadata found for this project.</p>
      )}
      {sessions.map((session) => (
        <article className="work-session-group" key={session.key}>
          <div className="work-local-session-heading">
            <strong>{session.harness}</strong>
            <span>{session.sessionId.slice(0, 8)}</span>
            <small>{session.coverage === 'partial' ? 'Partial log coverage' : 'Full log coverage'}</small>
          </div>
          <ExecutionHistory item={{ executions: session.segments } as WorkItem} />
          <form
            className="work-session-link"
            onSubmit={async (event) => {
              event.preventDefault();
              const item = items.find((i) => i.id === new FormData(event.currentTarget).get('intent'));
              if (item) await link(session.key, item);
            }}
          >
            <label>
              <span className="work-sr-only">Intent for session {session.sessionId}</span>
              <select name="intent" required defaultValue="">
                <option value="" disabled>
                  Link to an intent…
                </option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="work-secondary" disabled={saving || !items.length}>
              Link session
            </button>
          </form>
        </article>
      ))}
    </section>
  );
}
