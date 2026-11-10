/** Execution history: the tools and sessions that carried each intent forward. */
import { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { useApi } from '../hooks/useApi';
import { useProject } from '../hooks/useProject';
import type { WorkItem } from '../../../work-types';
import { DetailPanel, ExecutionHistory, type LocalSession } from './work/DetailPanel';
import { useWork } from './work/useWork';
import './work/work-board.css';

export function SessionsPage() {
  const work = useWork();
  const { activeProject } = useProject();
  const project = activeProject ? `?project=${encodeURIComponent(activeProject.id)}` : '';
  const { data: sessions, loading, refetch } = useApi<LocalSession[]>(`/api/work/sessions${project}`);
  // Native session stores are outside the project watcher: the board's poll reconciles them.
  useEffect(() => {
    if (work.tick) refetch();
  }, [work.tick, refetch]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState('agents');
  const all = work.data?.items ?? [];
  const items = all.filter(
    (item) => item.executions.length && `${item.title} ${item.incrementId ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = all.find((item) => item.id === selectedId);
  return (
    <MotionConfig reducedMotion="user">
      <div className="work-page">
        <div className="work-heading">
          <div>
            <h1>Execution history</h1>
            <p>Follow the tools and people that carried each intent forward.</p>
          </div>
        </div>
        <div className="work-toolbar">
          <div className="work-view-label">
            SETUPS &amp; CONTINUATIONS<span>{items.length} items</span>
          </div>
          <label className="work-search">
            <span aria-hidden="true">⌕</span>
            <input aria-label="Search work" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an intent or increment…" />
          </label>
        </div>
        {(work.failure || work.error) && (
          <div role="alert" className="work-error">
            {work.failure || work.error}
            <button onClick={work.refetch}>Retry</button>
          </div>
        )}
        <span className="work-sr-only" role="status" aria-live="polite">
          {work.notice}
        </span>
        {work.loading && !work.data ? (
          <p className="work-empty">Reading local work…</p>
        ) : (
          <div className="work-session-list">
            <LocalSessions
              sessions={sessions || []}
              loading={loading && !sessions}
              items={all}
              saving={work.saving}
              link={async (sessionRef, item) => {
                if (await work.mutate(`/${encodeURIComponent(item.id)}`, 'PATCH', { revision: item.revision, sessionRef }))
                  work.setNotice('Session linked to intent.');
              }}
            />
            {items.map((item) => (
              <section key={item.id} className="work-session-group">
                <button onClick={() => setSelectedId(item.id)}>
                  {item.title} <span>↗</span>
                </button>
                <ExecutionHistory executions={item.executions} />
              </section>
            ))}
            {!items.length && (
              <p className="work-empty">
                No execution history yet. Claims appear automatically; add a setup to an intent to record its model and
                effort.
              </p>
            )}
          </div>
        )}
        <AnimatePresence>
          {selected && <DetailPanel key="panel" item={selected} work={work} tab={tab} setTab={setTab} onClose={() => setSelectedId(null)} />}
        </AnimatePresence>
      </div>
    </MotionConfig>
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
        Project-scoped Codex and Claude Code metadata. Associate sessions with an intent explicitly. Model changes in
        large logs may be missing between observed windows.
      </p>
      {loading && <p className="work-empty">Reading local metadata…</p>}
      {!loading && !sessions.length && <p className="work-empty">No supported session metadata found for this project.</p>}
      {sessions.map((session) => (
        <article className="work-session-group" key={session.key}>
          <div className="work-local-session-heading">
            <strong>{session.harness}</strong>
            <span>{session.sessionId.slice(0, 8)}</span>
            <small>{session.coverage === 'partial' ? 'Partial log coverage' : 'Full log coverage'}</small>
          </div>
          <ExecutionHistory executions={session.segments} />
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
