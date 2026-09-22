import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { useApi } from '../hooks/useApi';
import { useSSEEvent } from '../contexts/SSEContext';
import type { ProjectHub } from '../../../../core/project-hub/types';
import type { WorkBoardPayload } from '../../../work-types';
import './project-hub.css';

type HubPayload = { hub: ProjectHub; work: WorkBoardPayload };
export function ProjectHubPage() {
  const { activeProject } = useProject();
  if (!activeProject) return <div className="hub-page" role="status">Loading project…</div>;
  return <ProjectHubContent key={activeProject.id} projectId={activeProject.id} />;
}

function ProjectHubContent({ projectId }: { projectId?: string }) {
  const suffix = projectId ? `?project=${encodeURIComponent(projectId)}` : '';
  const { data, loading, error, refetch } = useApi<HubPayload>(`/api/project-hub${suffix}`);
  const [form, setForm] = useState<'profile' | 'work' | 'artifact' | 'routine' | null>(null);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState('');
  const [brief, setBrief] = useState('');
  const [harness, setHarness] = useState('codex');
  const [preparing, setPreparing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const copyArea = useRef<HTMLTextAreaElement>(null);
  useSSEEvent('increment-update', refetch);
  useEffect(() => { const timer = setInterval(refetch, 15000); return () => clearInterval(timer); }, [refetch]);
  useEffect(() => { if (brief) dialog.current?.showModal(); }, [brief]);

  function openForm(next: typeof form) {
    setRevision(data?.hub.revision ?? 0); setForm(next); setFailure(''); setNotice(''); setConflict(false);
  }
  async function mutate(endpoint: string, method: string, body: unknown): Promise<boolean> {
    if (saving) return false;
    setSaving(true); setFailure(''); setNotice('');
    try {
      const response = await fetch(`/api/project-hub${endpoint}${suffix}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if (response.status === 409) { setConflict(true); refetch(); }
        throw new Error(result.error || 'Could not save');
      }
      refetch(); return true;
    } catch (err) { setFailure(err instanceof Error ? err.message : String(err)); return false; }
    finally { setSaving(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const endpoint = form === 'profile' ? '' : form === 'work' ? '/work' : form === 'artifact' ? '/artifacts' : '/routines';
    if (await mutate(endpoint, form === 'profile' ? 'PATCH' : 'POST', { ...fields, revision })) {
      setForm(null); setNotice(form === 'routine' ? 'Routine saved. Configure its schedule in your AI tool when ready.' : 'Saved to this project.');
    }
  }
  async function prepare(intent?: string, routine?: string) {
    if (preparing) return;
    setPreparing(true); setFailure('');
    const query = new URLSearchParams({ harness, ...(projectId ? { project: projectId } : {}), ...(intent ? { intent } : {}), ...(routine ? { routine } : {}) });
    try {
      const response = await fetch(`/api/project-hub/brief?${query}`);
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not prepare brief');
      setBrief(result.data.text);
    } catch (err) { setFailure(err instanceof Error ? err.message : String(err)); }
    finally { setPreparing(false); }
  }
  async function copyBrief() {
    try { await navigator.clipboard.writeText(brief); setNotice('Worker brief copied.'); }
    catch { copyArea.current?.focus(); copyArea.current?.select(); setNotice('Select and copy the brief below.'); }
  }
  const hub = data?.hub;
  const work = data?.work.items ?? [];
  const open = work.filter(item => item.state !== 'done');
  const workLink = `/${suffix}`;
  if (!hub && loading) return <div className="hub-page" role="status">Loading project…</div>;
  if (!hub) return <div className="hub-page"><div role="alert">{error || 'Project unavailable'}</div><button onClick={refetch}>Retry</button></div>;
  return <div className="hub-page">
    <header className="hub-heading">
      <div><p className="hub-eyebrow">PROJECT HUB / SHARED CONTEXT</p><h1>{hub.name}</h1><p className="hub-lede">One goal. Every task starts with the same context.</p></div>
      <div className="hub-actions"><label className="hub-harness">Prepare for<select aria-label="Brief target" value={harness} onChange={e => setHarness(e.target.value)}><option value="codex">Codex</option><option value="claude">Claude Code</option><option value="generic">Any AI tool</option></select></label><button className="hub-primary" disabled={preparing} onClick={() => prepare()}>{preparing ? 'Preparing…' : 'Coordinator brief ↗'}</button></div>
    </header>
    {(error || failure) && <div className="hub-error" role="alert">{failure || error} <button onClick={refetch}>Refresh</button>
      {conflict && form && <p>Review the current project details above before retrying your draft. <button disabled={loading} onClick={() => { setRevision(hub.revision); setConflict(false); setFailure(''); setNotice('Draft retained. Save when ready to apply it to the current revision.'); }}>Use latest revision for draft</button></p>}
    </div>}
    {notice && <p role="status" className="hub-notice">{notice}</p>}
    {data?.work.warnings.map(warning => <p className="hub-error" key={warning}>{warning}</p>)}
    <div className="hub-grid">
      <section className="hub-purpose"><div className="hub-section-head"><h2>Project brief</h2><button onClick={() => openForm('profile')}>{hub.goal ? 'Edit brief' : 'Set project goal'}</button></div>
        <p className="hub-goal">{hub.goal || 'Give this project a clear outcome.'}</p>
        <h3>Shared context</h3><p className="hub-context">{hub.context || 'Keep decisions, working agreements and useful background here. Future tasks can pick up where you left off.'}</p>
        <div className="hub-meta">{hub.updatedAt ? `Updated ${new Date(hub.updatedAt).toLocaleDateString()}` : 'Ready for your first brief'}<span>Revision {hub.revision}</span></div>
      </section>
      <section className="hub-work"><div className="hub-section-head"><h2>Work in motion <span>{open.length}</span></h2><button onClick={() => openForm('work')}>+ Add work</button></div>
        <p className="hub-description">Prepare an assignment, then continue in your preferred AI tool.</p>
        <div className="hub-work-list">{open.slice(0, 8).map(item => <article className="hub-work-row" key={item.id}><div><span className={`hub-state hub-state-${item.state}`}>{item.state === 'active' ? 'In progress' : item.state}</span><h3>{item.title}</h3><p>{item.summary || 'No description yet'}</p></div><button aria-label={`Prepare ${item.title}`} disabled={preparing} onClick={() => prepare(item.id)}>Prepare ↗</button></article>)}</div>
        {!open.length && <p className="hub-empty">No open work. Add a distinct outcome to get started.</p>}
        <Link className="hub-text-link" to={workLink}>Open work board {open.length > 8 ? `· ${open.length} open items` : '→'}</Link>
      </section>
    </div>
    {form && <section className="hub-form-panel" aria-label={`Add or edit ${form}`}><div className="hub-section-head"><h2>{form === 'profile' ? 'Edit project brief' : `Add ${form}`}</h2><button onClick={() => setForm(null)} disabled={saving}>Cancel</button></div>
      <form onSubmit={submit} key={form}>
        {form === 'profile' ? <><label>Project name<input name="name" required maxLength={180} defaultValue={hub.name} autoFocus /></label><label>Goal<textarea aria-label="Goal" name="goal" required maxLength={2000} defaultValue={hub.goal} rows={2} /></label><label>Shared context<textarea aria-label="Shared context" name="context" maxLength={16000} defaultValue={hub.context} rows={5} /></label></>
        : <><label>Title<input name="title" required maxLength={180} autoFocus /></label>
          {form === 'work' && <label>Outcome and scope<textarea name="summary" maxLength={2000} rows={3} /></label>}
          {form === 'artifact' && <><label>File path or HTTPS link<input name="location" required maxLength={2000} placeholder="reports/research.md or https://…" /></label><label>Related work<select name="intentId"><option value="">Shared with the whole project</option>{work.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></>}
          {form === 'routine' && <><label>Requested cadence<input name="cadence" required maxLength={180} placeholder="Mondays at 9am, America/New_York" /></label><label>Instructions<textarea name="instructions" required maxLength={8000} rows={4} /></label><p className="hub-description">This saves a reusable routine. It does not schedule or start an agent.</p></>}
        </>}
        <button className="hub-primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </section>}
    <div className="hub-grid hub-libraries">
      <section><div className="hub-section-head"><h2>Artifact library <span>{hub.artifacts.length}</span></h2><button onClick={() => openForm('artifact')}>+ Add artifact</button></div>
        <p className="hub-description">Documents, designs, code and research. Kept with their work.</p>
        {!hub.artifacts.length && <p className="hub-empty">Add a file or link to keep useful outputs within reach.</p>}
        {hub.artifacts.map(item => <article key={item.id} className="hub-library-row"><div><small>{item.kind === 'file' ? 'FILE' : 'LINK'} · {work.find(w => w.id === item.intentId)?.title || (item.intentId ? 'Linked work unavailable' : 'PROJECT')}</small><h3>{item.title}</h3>
          {item.kind === 'link' && /^https:\/\//i.test(item.location) ? <a href={item.location} target="_blank" rel="noreferrer">{item.location}</a> : <a href={`/api/project-hub/artifacts/${item.id}/download${suffix}`} download>{item.location} ↓</a>}</div>
          <button aria-label={`Remove ${item.title}`} disabled={saving} onClick={() => mutate(`/artifacts/${item.id}`, 'DELETE', { revision: hub.revision })}>Remove</button></article>)}
      </section>
      <section><div className="hub-section-head"><h2>Routines <span>{hub.routines.length}</span></h2><button onClick={() => openForm('routine')}>+ Add routine</button></div>
        <p className="hub-description">Reusable assignments. Scheduling stays in your AI tool.</p>
        {!hub.routines.length && <p className="hub-empty">Capture a repeatable workflow, then prepare it whenever needed.</p>}
        {hub.routines.map(item => <article key={item.id} className="hub-library-row"><div><small>DEFINITION · {item.cadence}</small><h3>{item.title}</h3><p>{item.instructions}</p><span className="hub-schedule-status">No schedule managed here</span></div><div className="hub-row-actions"><button disabled={preparing} onClick={() => prepare(undefined, item.id)}>Prepare ↗</button><button aria-label={`Remove ${item.title}`} disabled={saving} onClick={() => mutate(`/routines/${item.id}`, 'DELETE', { revision: hub.revision })}>Remove</button></div></article>)}
      </section>
    </div>
    <footer className="hub-footer"><span>Shared files stay with your project.</span><Link to={`/sessions${suffix}`}>Sessions & execution history ↗</Link></footer>
    <dialog className="hub-dialog" ref={dialog} onClose={() => setBrief('')} aria-label="Portable worker brief"><div className="hub-section-head"><h2>Portable worker brief</h2><button onClick={() => dialog.current?.close()} aria-label="Close worker brief">Close</button></div><p>Fresh context for your next task. Copy into your chosen AI tool.</p><textarea ref={copyArea} aria-label="Worker brief text" readOnly value={brief} /><button className="hub-primary" onClick={copyBrief}>Copy brief</button></dialog>
  </div>;
}
