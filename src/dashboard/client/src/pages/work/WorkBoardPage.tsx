/** The Work board: every increment and intent of the project, read live from `.specweave` on disk. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useProject } from '../../hooks/useProject';
import { useSSEStatus } from '../../contexts/SSEContext';
import { WORK_STATES, type WorkItem, type WorkState } from '../../../../work-types';
import {
  COLUMN_PAGE,
  DEFAULT_FILTERS,
  SORTS,
  VERIFICATIONS,
  activeFilterCount,
  aggregate,
  buildView,
  facets,
  itemTools,
  percent,
  progressOf,
  readFilters,
  relativeTime,
  shortId,
  toolName,
  writeFilters,
  type BoardFilters,
  type BoardSort,
} from './board-model';
import { DetailPanel } from './DetailPanel';
import {
  CountUp,
  EmptyArt,
  EmptyLoom,
  ProgressBar,
  Ring,
  SegmentBar,
  SPRING,
  STATE_LABEL,
  StateIcon,
  StatePill,
  ToolAvatars,
  VerifyPill,
  WeaveArt,
} from './parts';
import { useWork, type Work } from './useWork';
import './work-board.css';

const SORT_LABEL: Record<BoardSort, string> = { updated: 'Last updated', id: 'ID', progress: 'Progress', title: 'Title' };
const VERIFY_LABEL: Record<string, string> = { passed: 'Verified', failed: 'Check failed', stale: 'Recheck needed', missing: 'Not verified' };
const DRAG_TYPE = 'application/specweave-intent';
const EMPTY_COLUMN: Record<WorkState, string> = {
  backlog: 'A clear intent is enough to start.',
  active: 'Nothing is being worked on.',
  blocked: 'Nothing is blocked.',
  review: 'Nothing is waiting for review.',
  done: 'Finished work lands here.',
};

/** Filters, view, open item and tab all live in the address, so a link reopens the same screen. */
function useBoardUrl() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);
  // The router hands an updater the parameters of the last render, so two changes in one frame would
  // drop the first. The address bar is already current, so every change starts from it.
  const current = () => new URLSearchParams(window.location.search);
  const setFilters = useCallback(
    (patch: Partial<BoardFilters>, replace = false) => setParams(writeFilters(current(), patch), { replace }),
    [setParams],
  );
  const set = useCallback(
    (patch: Record<string, string>, replace = false) => {
      const next = current();
      for (const [key, value] of Object.entries(patch)) value ? next.set(key, value) : next.delete(key);
      setParams(next, { replace });
    },
    [setParams],
  );
  return {
    filters,
    setFilters,
    set,
    view: params.get('view') === 'list' ? 'list' : 'board',
    itemId: params.get('item'),
    tab: params.get('tab') ?? 'overview',
  } as const;
}

export function WorkBoardPage() {
  const work = useWork();
  const { activeProject } = useProject();
  const sse = useSSEStatus();
  const { filters, setFilters, set, view, itemId, tab } = useBoardUrl();
  const [creating, setCreating] = useState(false);
  const all = work.data?.items ?? [];
  const board = useMemo(() => buildView(all, filters), [all, filters]);
  const totals = useMemo(() => aggregate(board.items), [board.items]);
  const options = useMemo(() => facets(all), [all]);
  const selected = itemId ? all.find((item) => item.id === itemId || item.incrementId === itemId || item.incrementId?.startsWith(`${itemId}-`)) : undefined;
  const filterCount = activeFilterCount(filters);
  const open = useCallback((item: WorkItem) => set({ item: item.incrementId ?? item.id, tab: '' }), [set]);
  const close = useCallback(() => set({ item: '', tab: '' }), [set]);
  const toggleState = (state: WorkState) =>
    setFilters({ states: filters.states.includes(state) ? filters.states.filter((s) => s !== state) : [...filters.states, state] });

  // Typing must not push one history entry per key.
  const [query, setQuery] = useState(filters.query);
  useEffect(() => setQuery(filters.query), [filters.query]);
  useEffect(() => {
    if (query === filters.query) return;
    const timer = setTimeout(() => setFilters({ query }, true), 160);
    return () => clearTimeout(timer);
  }, [query, filters.query, setFilters]);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && !target.isContentEditable) {
        event.preventDefault();
        search.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const linkedOptions = [...new Set(all.map((item) => item.incrementId).filter(Boolean) as string[])];

  return (
    <MotionConfig reducedMotion="user">
      <div className="wb-page">
        <header className="wb-hero">
          <WeaveArt />
          <div className="wb-hero-text">
            <p className="wb-eyebrow">
              <span className={`wb-live ${sse === 'connected' ? 'is-on' : ''}`} />
              {sse === 'connected' ? 'Live' : 'Reconnecting'} · read from{' '}
              <code>{activeProject ? `${activeProject.path}/.specweave` : '.specweave'}</code>
              {work.data && <span> · {relativeTime(work.data.generatedAt)}</span>}
            </p>
            <h1>Work board</h1>
            <p className="wb-lede">Keep the intent. See the progress. Pick up with any tool.</p>
          </div>
          <div className="wb-hero-actions">
            <div className="wb-views" role="group" aria-label="View">
              {(['board', 'list'] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} className={view === v ? 'is-on' : ''} onClick={() => set({ view: v === 'board' ? '' : v })}>
                  {view === v && <motion.span layoutId="wb-view-pill" className="wb-view-pill" transition={SPRING} />}
                  <span>{v === 'board' ? 'Board' : 'List'}</span>
                </button>
              ))}
            </div>
            <button className="work-primary" onClick={() => setCreating(true)}>
              + New intent
            </button>
          </div>
        </header>

        <section className="wb-summary-band" aria-label="Progress of the items shown">
          <div className="wb-summary-ring">
            <Ring value={totals.progress} size={104} stroke={10}>
              <strong>
                <CountUp value={percent(totals.progress)} />%
              </strong>
              <span>complete</span>
            </Ring>
          </div>
          <div className="wb-summary-mix">
            <div className="wb-row-label">
              <span>
                <b>
                  <CountUp value={board.items.length} />
                </b>{' '}
                {board.items.length === 1 ? 'item' : 'items'} shown
                {filterCount > 0 && all.length !== board.items.length ? ` of ${all.length}` : ''}
              </span>
              {filterCount > 0 ? (
                <button type="button" className="wb-clear" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort, ascending: filters.ascending })}>
                  Clear {filterCount} {filterCount === 1 ? 'filter' : 'filters'}
                </button>
              ) : (
                <span>Click a state to filter</span>
              )}
            </div>
            <SegmentBar
              size="lg"
              label="Items by state"
              segments={board.shownStates.map((state) => ({
                key: state,
                value: board.columns[state].length,
                tone: state,
                label: STATE_LABEL[state],
              }))}
            />
            <div className="wb-state-chips" role="group" aria-label="Filter by state">
              {WORK_STATES.map((state) => (
                <button
                  key={state}
                  type="button"
                  className={`wb-state-chip wb-tone-${state} ${filters.states.includes(state) ? 'is-on' : ''}`}
                  aria-pressed={filters.states.includes(state)}
                  onClick={() => toggleState(state)}
                >
                  <StateIcon state={state} />
                  <span>{STATE_LABEL[state]}</span>
                  <b>{board.stateCounts[state]}</b>
                </button>
              ))}
            </div>
          </div>
          <dl className="wb-summary-stats">
            <Stat label="Tasks done" value={totals.tasksDone} total={totals.tasks} tone="success" />
            <Stat label="Criteria met" value={totals.acsDone} total={totals.acs} tone="review" />
            <Stat label="Increments verified" value={totals.verified} total={totals.increments} tone="active" />
          </dl>
        </section>

        <div className="wb-toolbar">
          <label className="wb-search">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10.6 10.6 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              ref={search}
              aria-label="Search work"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, ID or reason"
            />
            <kbd>/</kbd>
          </label>
          <Select label="Agent" value={filters.agent} onChange={(agent) => setFilters({ agent })} all="All agents" options={options.agents.map((a) => [a, toolName(a)])} />
          <Select label="Verification" value={filters.verification} onChange={(verification) => setFilters({ verification })} all="Any verification" options={VERIFICATIONS.map((v) => [v, VERIFY_LABEL[v]])} />
          {options.types.length > 1 && (
            <Select label="Type" value={filters.type} onChange={(type) => setFilters({ type })} all="All types" options={options.types.map((t) => [t, t])} />
          )}
          {options.priorities.length > 1 && (
            <Select label="Priority" value={filters.priority} onChange={(priority) => setFilters({ priority })} all="All priorities" options={options.priorities.map((p) => [p, p])} />
          )}
          <Select
            label="Done window"
            value={filters.doneDays === 0 ? 'all' : String(filters.doneDays)}
            onChange={(value) => setFilters({ doneDays: value === 'all' ? 0 : Number(value) })}
            options={[
              ['7', 'Done: last 7 days'],
              ['14', 'Done: last 14 days'],
              ['30', 'Done: last 30 days'],
              ['all', 'Done: all'],
            ]}
          />
          <span className="wb-toolbar-gap" />
          <Select label="Sort by" value={filters.sort} onChange={(sort) => setFilters({ sort: sort as BoardSort })} options={SORTS.map((s) => [s, `Sort: ${SORT_LABEL[s]}`])} />
          <button
            type="button"
            className="wb-icon-button wb-dir"
            aria-label={filters.ascending ? 'Ascending order; switch to descending' : 'Descending order; switch to ascending'}
            title={filters.ascending ? 'Ascending' : 'Descending'}
            onClick={() => setFilters({ ascending: !filters.ascending })}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: filters.ascending ? 'scaleY(-1)' : undefined }}>
              <path d="M8 3v10m0 0-3.5-3.5M8 13l3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {(work.failure || work.error) && !selected && (
          <div role="alert" className="work-error">
            {work.failure || work.error}
            <button onClick={work.refetch}>Retry</button>
          </div>
        )}
        <span className="work-sr-only" role="status" aria-live="polite">
          {work.notice}
        </span>
        {work.data?.warnings.map((warning) => (
          <p className="work-warning" key={warning}>
            {warning}
          </p>
        ))}

        {work.loading && !work.data ? (
          <BoardSkeleton />
        ) : board.items.length === 0 && filterCount > 0 ? (
          <div className="wb-nothing">
            <EmptyLoom />
            <h2>No work matches these filters</h2>
            <p>{all.length} items are on this board. Loosen a filter or clear them all.</p>
            <button type="button" className="work-secondary" onClick={() => setFilters({ ...DEFAULT_FILTERS })}>
              Clear filters
            </button>
          </div>
        ) : view === 'list' ? (
          <ListView items={board.items} filters={filters} setFilters={setFilters} open={open} selectedId={selected?.id} />
        ) : (
          <Board board={board} work={work} open={open} selectedId={selected?.id} />
        )}

        <p className="wb-footnote">
          Columns come from <code>metadata.json</code> and <code>ledger.jsonl</code> in each increment folder. Moving a card
          changes only its place on this board.
        </p>

        {creating && (
          <CreateIntent work={work} linkedOptions={linkedOptions} onClose={() => setCreating(false)} />
        )}
        <AnimatePresence>
          {selected && <DetailPanel key="panel" item={selected} work={work} tab={tab} setTab={(t) => set({ tab: t === 'overview' ? '' : t }, true)} onClose={close} />}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function Stat({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  return (
    <div className="wb-stat">
      <dt>{label}</dt>
      <dd>
        <strong>
          <CountUp value={value} />
        </strong>
        <span> / {total.toLocaleString()}</span>
      </dd>
      <ProgressBar value={value} max={total} label={`${label}: ${value} of ${total}`} tone={tone} size="sm" />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  all,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<readonly [string, string]>;
  all?: string;
}) {
  const known = value === 'all' || options.some(([v]) => v === value);
  return (
    <select
      className={`wb-select ${all && value !== 'all' ? 'is-set' : ''}`}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {all && <option value="all">{all}</option>}
      {!known && <option value={value}>{value}</option>}
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  );
}

function Board({
  board,
  work,
  open,
  selectedId,
}: {
  board: ReturnType<typeof buildView>;
  work: Work;
  open: (item: WorkItem) => void;
  selectedId?: string;
}) {
  const [dropTarget, setDropTarget] = useState<WorkState | null>(null);
  const [limits, setLimits] = useState<Partial<Record<WorkState, number>>>({});
  return (
    <div className="wb-board-scroll">
      <div className="wb-board" style={{ ['--wb-columns' as string]: board.shownStates.length }}>
        {board.shownStates.map((state) => {
          const items = board.columns[state];
          const limit = limits[state] ?? COLUMN_PAGE;
          const sum = aggregate(items);
          return (
            <section
              key={state}
              className={`wb-column wb-tone-${state} ${dropTarget === state ? 'is-drop-target' : ''}`}
              aria-label={`${STATE_LABEL[state]} column`}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes(DRAG_TYPE)) {
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
                const item = work.data?.items.find((i) => i.id === event.dataTransfer.getData(DRAG_TYPE));
                if (item) void work.move(item, state);
              }}
            >
              <header className="wb-column-head">
                <div className="wb-column-title">
                  <StateIcon state={state} />
                  <h2>{STATE_LABEL[state]}</h2>
                  <span className="wb-count">{items.length}</span>
                  {sum.tasks > 0 && <span className="wb-column-percent">{percent(sum.progress)}%</span>}
                </div>
                <ProgressBar
                  value={sum.tasks ? sum.progress * sum.tasks : 0}
                  max={sum.tasks}
                  label={`${STATE_LABEL[state]}: ${sum.tasksDone} of ${sum.tasks} tasks done`}
                  tone={state}
                  size="sm"
                />
              </header>
              <div className="wb-cards">
                <AnimatePresence initial={false} mode="popLayout">
                  {items.slice(0, limit).map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout="position"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ ...SPRING, delay: Math.min(index, 8) * 0.025 }}
                    >
                      <Card item={item} open={open} selected={item.id === selectedId} draggable={!work.saving} onDragEnd={() => setDropTarget(null)} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {items.length > limit && (
                  <button type="button" className="wb-more" onClick={() => setLimits((l) => ({ ...l, [state]: limit + COLUMN_PAGE }))}>
                    Show {Math.min(COLUMN_PAGE, items.length - limit)} more of {items.length - limit}
                  </button>
                )}
                {!items.length && (
                  <div className="wb-column-empty">
                    <EmptyArt />
                    <p>{EMPTY_COLUMN[state]}</p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  item,
  open,
  selected,
  draggable,
  onDragEnd,
}: {
  item: WorkItem;
  open: (item: WorkItem) => void;
  selected: boolean;
  draggable: boolean;
  onDragEnd: () => void;
}) {
  const tools = itemTools(item);
  const last = item.executions[item.executions.length - 1];
  const share = progressOf(item);
  return (
    <article
      className={`wb-card wb-tone-${item.state} ${selected ? 'is-selected' : ''}`}
      data-intent-id={item.id}
      role="button"
      tabIndex={0}
      aria-label={`${shortId(item)} ${item.title}. ${STATE_LABEL[item.state]}${item.tasks.total ? `, ${item.tasks.done} of ${item.tasks.total} tasks done` : ''}. Open details.`}
      draggable={draggable}
      onClick={() => open(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open(item);
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, item.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={onDragEnd}
    >
      <div className="wb-card-top">
        <span className="wb-id">{shortId(item)}</span>
        {item.type && item.type !== 'feature' && <span className="wb-tag">{item.type}</span>}
        {item.priority && <span className={`wb-tag wb-prio-${item.priority.toLowerCase()}`}>{item.priority}</span>}
        <time dateTime={item.updatedAt}>{relativeTime(item.updatedAt)}</time>
      </div>
      <h3 className="wb-card-title">{item.title}</h3>
      {item.tasks.total === 0 && (
        <p className="wb-card-summary">{item.summary || 'Add a short outcome so the next session starts with context.'}</p>
      )}
      {(item.state === 'blocked' || item.state === 'review') && <p className="wb-card-reason">{item.stateReason}</p>}
      {item.tasks.total > 0 && (
        <div className="wb-card-progress">
          <div className="wb-card-progress-top">
            <ProgressBar
              value={item.tasks.done + item.tasks.skipped}
              max={item.tasks.total}
              label={`${item.title} task progress`}
              tone={share >= 1 ? 'success' : item.state}
            />
            <strong>{percent(share)}%</strong>
          </div>
          <div className="wb-card-counts">
            <span>
              {item.tasks.done}/{item.tasks.total} tasks
            </span>
            <span>
              {item.acs.done}/{item.acs.total} ACs
            </span>
            {item.tasks.skipped > 0 && <span>{item.tasks.skipped} skipped</span>}
          </div>
        </div>
      )}
      <div className="wb-card-foot">
        <VerifyPill item={item} />
        {tools.length > 0 && (
          <span className="wb-card-agent">
            <span className="wb-card-model" title={last?.model ?? undefined}>
              {toolName(tools[0])}
            </span>
            <ToolAvatars item={item} />
          </span>
        )}
      </div>
    </article>
  );
}

const LIST_PAGE = 100;
function ListView({
  items,
  filters,
  setFilters,
  open,
  selectedId,
}: {
  items: WorkItem[];
  filters: BoardFilters;
  setFilters: (patch: Partial<BoardFilters>) => void;
  open: (item: WorkItem) => void;
  selectedId?: string;
}) {
  const [limit, setLimit] = useState(LIST_PAGE);
  const head = (label: string, sort?: BoardSort) => (
    <th scope="col" aria-sort={sort && filters.sort === sort ? (filters.ascending ? 'ascending' : 'descending') : undefined}>
      {sort ? (
        <button type="button" onClick={() => setFilters(filters.sort === sort ? { ascending: !filters.ascending } : { sort, ascending: false })}>
          {label}
          {filters.sort === sort && <span aria-hidden="true">{filters.ascending ? ' ↑' : ' ↓'}</span>}
        </button>
      ) : (
        label
      )}
    </th>
  );
  return (
    <div className="wb-list-wrap">
      <table className="wb-list">
        <thead>
          <tr>
            {head('ID', 'id')}
            {head('Title', 'title')}
            {head('State')}
            {head('Progress', 'progress')}
            {head('Criteria')}
            {head('Verification')}
            {head('Agents')}
            {head('Updated', 'updated')}
          </tr>
        </thead>
        <tbody>
          {items.slice(0, limit).map((item) => (
            <tr
              key={item.id}
              data-intent-id={item.id}
              className={item.id === selectedId ? 'is-selected' : ''}
              tabIndex={0}
              onClick={() => open(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') open(item);
              }}
            >
              <td>
                <span className="wb-id">{shortId(item)}</span>
              </td>
              <td className="wb-list-title">
                <strong>{item.title}</strong>
                {(item.state === 'blocked' || item.state === 'review') && <small>{item.stateReason}</small>}
              </td>
              <td>
                <StatePill state={item.state} />
              </td>
              <td className="wb-list-progress">
                {item.tasks.total > 0 ? (
                  <>
                    <ProgressBar value={item.tasks.done + item.tasks.skipped} max={item.tasks.total} label={`${item.title} task progress`} tone={progressOf(item) >= 1 ? 'success' : item.state} />
                    <span>
                      {percent(progressOf(item))}% · {item.tasks.done}/{item.tasks.total}
                    </span>
                  </>
                ) : (
                  <span className="wb-quiet">No tasks</span>
                )}
              </td>
              <td>
                {item.acs.done}/{item.acs.total}
              </td>
              <td>
                <VerifyPill item={item} />
              </td>
              <td>
                <ToolAvatars item={item} />
              </td>
              <td>
                <time dateTime={item.updatedAt}>{relativeTime(item.updatedAt)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > limit && (
        <button type="button" className="wb-more" onClick={() => setLimit(limit + LIST_PAGE)}>
          Show {Math.min(LIST_PAGE, items.length - limit)} more of {items.length - limit}
        </button>
      )}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="wb-board-scroll" aria-busy="true" aria-label="Reading local work">
      <div className="wb-board" style={{ ['--wb-columns' as string]: 5 }}>
        {WORK_STATES.map((state, c) => (
          <div className="wb-column wb-skeleton" key={state}>
            {[0, 1, 2].slice(0, 3 - (c % 2)).map((n) => (
              <div className="wb-skeleton-card" key={n} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateIntent({ work, linkedOptions, onClose }: { work: Work; linkedOptions: string[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="work-dialog" onCancel={onClose} onClose={onClose} aria-label="Capture an intent">
      <div className="work-dialog-heading">
        <h2>Capture an intent</h2>
        <button type="button" className="work-icon-button" aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
      </div>
      <form
        className="work-form"
        onSubmit={async (event) => {
          event.preventDefault();
          if (await work.mutate('', 'POST', Object.fromEntries(new FormData(event.currentTarget)))) {
            onClose();
            work.setNotice('Intent created.');
          }
        }}
      >
        <p>Describe the outcome. Small work can start without an increment.</p>
        <label>
          Title
          <input name="title" required maxLength={180} autoFocus placeholder="What should be different when this is done?" />
        </label>
        <label>
          Intent
          <textarea name="summary" rows={3} maxLength={2000} placeholder="Why it matters, expected result, or context for the next session." />
        </label>
        <label>
          Linked increment
          <select name="incrementId">
            <option value="">No increment yet</option>
            {linkedOptions.map((id) => (
              <option value={id} key={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        {work.failure && (
          <p role="alert" className="work-error">
            {work.failure}
          </p>
        )}
        <button disabled={work.saving} className="work-primary">
          {work.saving ? 'Saving…' : 'Create intent'}
        </button>
      </form>
    </dialog>
  );
}
