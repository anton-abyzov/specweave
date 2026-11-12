import React from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import {Check, CircleAlert, CircleCheck, FileText, LoaderCircle, MousePointer2, Search, Star} from 'lucide-react';
import {Brand, Logo, Stage, Toggle, useStep} from './parts';
import {OS_ICON, type Os} from '../osIcons';
import styles from './Benefits.module.css';

/*
  Seven self-running drawings for the /code benefit rows. Each one redraws a real surface of the
  app with illustrative content: labels match the app (Settings > Skills columns, the Designs
  tab, the reply card's Send / Don't send, "When a provider runs out"), names and numbers inside
  are examples. Nothing here is a capture, and nothing claims a measured result.
*/

/* ---------- 1. One window for every agent: the model picker moves a thread between providers ---------- */
const PICKER = [
  {mark: 'claude', agent: 'Claude Code', model: 'Opus 5.5'},
  {mark: 'openai', agent: 'Codex', model: 'GPT-6.1 Sol'},
  {mark: 'copilot', agent: 'GitHub Copilot', model: 'Auto'},
  {mark: 'gemini', agent: 'Gemini CLI', model: 'Gemini 4 Argon'},
];

export function OneWindow() {
  const [ref, step] = useStep<HTMLDivElement>(PICKER.length, 1);
  const cur = PICKER[step];
  return <Stage ref={ref} label={translate({id: 'code.b.window.label', message: 'One thread in SpecWithCode. The model picker lists Claude Code, Codex, GitHub Copilot and Gemini CLI, and the thread continues on the one you pick.', description: 'Benefit diagram on the SpecWithCode page: accessible description of the model picker drawing. Keep product names in English'})}>
    <div className={styles.bar}>
      <span className={styles.barTitle}>{translate({id: 'code.b.window.thread', message: 'Fix checkout rounding', description: 'Benefit diagram on the SpecWithCode page: example thread title'})}</span>
      <span key={cur.agent} className={clsx(styles.pill, styles.swap)}><Logo name={cur.mark} size={14} />{cur.agent} · {cur.model}</span>
    </div>
    <div className={styles.split}>
      <div className={styles.chat}>
        <p className={clsx(styles.msg, styles.you)}>{translate({id: 'code.b.window.ask', message: 'Totals are off by a cent on some orders.', description: 'Benefit diagram on the SpecWithCode page: example message from the person'})}</p>
        <p className={styles.msg}>{translate({id: 'code.b.window.answer', message: 'Found it: the tax line rounds before the discount.', description: 'Benefit diagram on the SpecWithCode page: example answer from the agent'})}</p>
        {step > 0 && <p key={step} className={clsx(styles.note, styles.swap)}><Check size={12} strokeWidth={2.5} />{translate({id: 'code.b.window.continued', message: 'Continued on {agent} with the recent conversation', description: 'Benefit diagram on the SpecWithCode page: line shown when a thread moves to another agent; {agent} is a product name'}, {agent: cur.agent})}</p>}
      </div>
      <div className={styles.picker}>
        <p className={styles.search}><Search size={12} strokeWidth={2} />{translate({id: 'code.b.window.search', message: 'Search models or providers', description: 'Benefit diagram on the SpecWithCode page: placeholder of the model picker search box, as the app labels it'})}</p>
        <p className={styles.chips}><b>{translate({id: 'code.b.window.all', message: 'All', description: 'Benefit diagram on the SpecWithCode page: model picker filter chip'})}</b><span><Star size={10} strokeWidth={2} />{translate({id: 'code.b.window.favorites', message: 'Favorites', description: 'Benefit diagram on the SpecWithCode page: model picker filter chip'})}</span></p>
        <ul className={styles.rows}>
          {PICKER.map((p, i) => <li key={p.agent} className={clsx(styles.opt, i === step && styles.optOn)}>
            <Logo name={p.mark} size={18} /><span><b>{p.agent}</b><small>{p.model}</small></span>{i === step && <Check size={13} strokeWidth={2.5} />}
          </li>)}
        </ul>
      </div>
    </div>
  </Stage>;
}

/* ---------- 2. Threads that share one project ---------- */
type St = 'working' | 'needs' | 'done';
const THREADS: {mark: string; task: string; states: St[]}[] = [
  {mark: 'claude', task: 'Payments API', states: ['working', 'done', 'done']},
  {mark: 'openai', task: 'Checkout screen', states: ['working', 'working', 'done']},
  {mark: 'copilot', task: 'Tests and CI', states: ['working', 'needs', 'needs']},
];
const ST_ICON: Record<St, React.ReactNode> = {
  working: <LoaderCircle size={13} strokeWidth={2.5} className={styles.spin} />,
  needs: <CircleAlert size={13} strokeWidth={2.5} />,
  done: <CircleCheck size={13} strokeWidth={2.5} />,
};

export function ProjectThreads() {
  const [ref, step] = useStep<HTMLDivElement>(3, 1);
  const stLabel: Record<St, string> = {
    working: translate({id: 'code.b.threads.working', message: 'Working', description: 'Benefit diagram on the SpecWithCode page: thread status'}),
    needs: translate({id: 'code.b.threads.needs', message: 'Needs you', description: 'Benefit diagram on the SpecWithCode page: thread status: waiting for the person'}),
    done: translate({id: 'code.b.threads.done', message: 'Resolved', description: 'Benefit diagram on the SpecWithCode page: thread status, as the app labels a finished thread'}),
  };
  const tasks: Record<string, string> = {
    'Payments API': translate({id: 'code.b.threads.task.payments', message: 'Payments API', description: 'Benefit diagram on the SpecWithCode page: example thread name'}),
    'Checkout screen': translate({id: 'code.b.threads.task.checkout', message: 'Checkout screen', description: 'Benefit diagram on the SpecWithCode page: example thread name'}),
    'Tests and CI': translate({id: 'code.b.threads.task.tests', message: 'Tests and CI', description: 'Benefit diagram on the SpecWithCode page: example thread name'}),
  };
  return <Stage ref={ref} label={translate({id: 'code.b.threads.label', message: 'Without a project, a sidebar fills with repeated project context chats. In a SpecWithCode project the goal, instructions and memory are kept once and reach three threads, which show Working, Needs you or Resolved.', description: 'Benefit diagram on the SpecWithCode page: accessible description of the project threads drawing'})}>
    <div className={styles.beforeAfter}>
      <div className={styles.before}>
        <p className={styles.colTitle}>{translate({id: 'code.b.threads.before', message: 'Context kept in chats', description: 'Benefit diagram on the SpecWithCode page: column title: the old way'})}</p>
        <ul>
          {[0, 1, 2, 3, 4, 5].map(i => <li key={i} style={{animationDelay: `${i * 0.35}s`}}>{translate({id: 'code.b.threads.contextChat', message: 'Project context (5848bdc2…)', description: 'Benefit diagram on the SpecWithCode page: a repeated chat title in another tool’s sidebar; keep the id as written'})}</li>)}
        </ul>
      </div>
      <div className={styles.project}>
        <p className={styles.colTitle}>{translate({id: 'code.b.threads.after', message: 'Kept once, in the project', description: 'Benefit diagram on the SpecWithCode page: column title: the SpecWithCode way'})}</p>
        <p className={styles.coordRow}><Logo name="claude" size={18} />{translate({id: 'code.b.machines.coordinator', message: 'Coordinator', description: 'Benefit diagram on the SpecWithCode page: role of the main machine'})}<small>Claude Code</small></p>
        <p className={styles.context}><FileText size={13} strokeWidth={2} /><b>Checkout v2</b><span>{translate({id: 'code.b.threads.context', message: 'Goal · Instructions · Memory', description: 'Benefit diagram on the SpecWithCode page: the three things a project keeps for every thread'})}</span></p>
        <ul className={styles.threadList}>
          {THREADS.map(th => {
            const st = th.states[step];
            return <li key={th.task} className={styles[`st_${st}`]}>
              <Logo name={th.mark} size={18} /><b>{tasks[th.task]}</b>
              <span key={st} className={clsx(styles.status, styles.swap)}>{ST_ICON[st]}{stLabel[st]}</span>
            </li>;
          })}
        </ul>
      </div>
    </div>
  </Stage>;
}

/* ---------- 3. Aide: the morning briefing and its reply card, on the phone ---------- */
export function Aide() {
  const [ref, step] = useStep<HTMLDivElement>(4, 2, 2400);
  const sent = step === 3;
  return <Stage ref={ref} className={styles.aideStage} label={translate({id: 'code.b.aide.label', message: 'Aide on a phone. The 08:00 briefing lists two mails that need a reply and today’s three events, then shows a draft with Send and Don’t send. Nothing is sent until you choose Send.', description: 'Benefit diagram on the SpecWithCode page: accessible description of the personal assistant drawing'})}>
    <div className={styles.phone}>
      <p className={styles.phoneHead}><b>Aide</b><span>08:00</span></p>
      <div className={styles.briefing}>
        <b>{translate({id: 'code.b.aide.briefing', message: 'Proactive briefing', description: 'Benefit diagram on the SpecWithCode page: name of the daily briefing routine, as the app labels it'})}</b>
        <p><Brand name="gmail" size={13} />{translate({id: 'code.b.aide.replies', message: 'Needs your reply · 2', description: 'Benefit diagram on the SpecWithCode page: briefing line: two mails need a reply'})}</p>
        <p><Brand name="calendar" size={13} />{translate({id: 'code.b.aide.today', message: 'Today · 3 events', description: 'Benefit diagram on the SpecWithCode page: briefing line: three calendar events today'})}</p>
      </div>
      {step >= 1 && <div className={clsx(styles.replyCard, styles.swap)}>
        <small>{translate({id: 'code.b.aide.to', message: 'To Dana · Re: October invoice', description: 'Benefit diagram on the SpecWithCode page: recipient and subject of an example reply draft'})}</small>
        <p>{translate({id: 'code.b.aide.draft', message: 'Thanks, Dana. Paid this morning, receipt attached.', description: 'Benefit diagram on the SpecWithCode page: example reply draft text'})}</p>
        <p className={styles.replyActions}>
          {sent
            ? <span key="sent" className={clsx(styles.sent, styles.swap)}><Check size={12} strokeWidth={2.5} />{translate({id: 'code.b.aide.sent', message: 'Sent from your Gmail', description: 'Benefit diagram on the SpecWithCode page: shown after the person chose Send'})}</span>
            : <><span className={clsx(styles.btn, step === 2 && styles.btnPress)}>{translate({id: 'code.b.aide.send', message: 'Send', description: 'Benefit diagram on the SpecWithCode page: reply card button, as the app labels it'})}</span><span className={styles.btnQuiet}>{translate({id: 'code.b.aide.dontSend', message: 'Don’t send', description: 'Benefit diagram on the SpecWithCode page: reply card button, as the app labels it'})}</span></>}
        </p>
      </div>}
    </div>
    <ul className={styles.orbit}>
      <li><Brand name="gmail" />Gmail</li>
      <li><Brand name="calendar" />Calendar</li>
      <li><Brand name="drive" />Drive</li>
      <li><Brand name="telegram" />Telegram</li>
    </ul>
  </Stage>;
}

/* ---------- 4. Designs: an agent draws on the project's canvas ---------- */
const TABS = ['Threads', 'Designs', 'Library', 'PRs', 'Routines'];
const EXPORTS = ['PNG', 'SVG', 'HTML', 'PDF', 'PPTX'];

export function Designs() {
  const [ref, step] = useStep<HTMLDivElement>(4, 3, 2200);
  const tabs: Record<string, string> = {
    Threads: translate({id: 'code.b.designs.tab.threads', message: 'Threads', description: 'Benefit diagram on the SpecWithCode page: project tab, as the app labels it'}),
    Designs: translate({id: 'code.b.designs.tab.designs', message: 'Designs', description: 'Benefit diagram on the SpecWithCode page: project tab, as the app labels it'}),
    Library: translate({id: 'code.b.designs.tab.library', message: 'Library', description: 'Benefit diagram on the SpecWithCode page: project tab, as the app labels it'}),
    PRs: translate({id: 'code.b.designs.tab.prs', message: 'PRs', description: 'Benefit diagram on the SpecWithCode page: project tab, as the app labels it: pull requests'}),
    Routines: translate({id: 'code.b.designs.tab.routines', message: 'Routines', description: 'Benefit diagram on the SpecWithCode page: project tab, as the app labels it'}),
  };
  return <Stage ref={ref} label={translate({id: 'code.b.designs.label', message: 'The Designs tab of a project. An agent adds a header, a form and a button to a 1440 by 1024 frame named Checkout. The file is saved under .specweave/design/ in the repository and exports to PNG, SVG, HTML, PDF or PPTX.', description: 'Benefit diagram on the SpecWithCode page: accessible description of the designs drawing. Keep file paths and formats as written'})}>
    <p className={styles.tabs}>{TABS.map(x => <span key={x} className={clsx(x === 'Designs' && styles.tabOn)}>{tabs[x]}</span>)}</p>
    <div className={styles.canvas}>
      <div className={styles.frame}>
        <small>Checkout · 1440 × 1024</small>
        <i className={clsx(styles.shape, styles.shapeHeader, step >= 1 && styles.shapeIn)} />
        <i className={clsx(styles.shape, styles.shapeForm, step >= 2 && styles.shapeIn)} />
        <i className={clsx(styles.shape, styles.shapeSide, step >= 2 && styles.shapeIn)} />
        <i className={clsx(styles.shape, styles.shapeButton, step >= 3 && styles.shapeIn)} />
        <span className={clsx(styles.cursor, styles[`cursor${step}`])}><MousePointer2 size={16} strokeWidth={2} /><em><Logo name="claude" size={12} />Claude Code</em></span>
      </div>
    </div>
    <p className={styles.fileLine}><code>.specweave/design/</code><span>{EXPORTS.map(x => <b key={x}>{x}</b>)}</span></p>
  </Stage>;
}

/* ---------- 5. Machines: the coordinator places threads in the order you set ---------- */
const FLEET: {os: Os; name: string; access: string}[] = [
  {os: 'mac', name: 'Mac', access: 'Full access'},
  {os: 'linux', name: 'Linux server', access: 'Auto'},
  {os: 'windows', name: 'Windows PC', access: 'Supervised'},
];

export function Machines() {
  const [ref, step] = useStep<HTMLDivElement>(3, 0, 2800);
  // Step 0: the first machine in the order takes a thread. Step 1: it goes offline. Step 2: a new thread skips it and starts on the next machine.
  // A running thread never moves by itself, so the first thread stays where it started.
  const offline = step >= 1;
  const names: Record<string, string> = {
    Mac: 'Mac',
    'Linux server': translate({id: 'code.b.machines.linux', message: 'Linux server', description: 'Benefit diagram on the SpecWithCode page: machine name'}),
    'Windows PC': translate({id: 'code.b.machines.windows', message: 'Windows PC', description: 'Benefit diagram on the SpecWithCode page: machine name'}),
  };
  const access: Record<string, string> = {
    'Full access': translate({id: 'code.b.machines.access.full', message: 'Full access', description: 'Benefit diagram on the SpecWithCode page: permission mode, as the app labels it'}),
    Auto: translate({id: 'code.b.machines.access.auto', message: 'Auto', description: 'Benefit diagram on the SpecWithCode page: permission mode, as the app labels it'}),
    Supervised: translate({id: 'code.b.machines.access.supervised', message: 'Supervised', description: 'Benefit diagram on the SpecWithCode page: permission mode, as the app labels it'}),
  };
  const load = [[translate({id: 'code.b.machines.coordinator', message: 'Coordinator', description: 'Benefit diagram on the SpecWithCode page: role of the main machine'})], ['Tests and CI'], step === 2 ? ['Email templates'] : []];
  const tasks: Record<string, string> = {
    'Tests and CI': translate({id: 'code.b.threads.task.tests', message: 'Tests and CI', description: 'Benefit diagram on the SpecWithCode page: example thread name'}),
    'Email templates': translate({id: 'code.b.machines.task.emails', message: 'Email templates', description: 'Benefit diagram on the SpecWithCode page: example thread name'}),
  };
  return <Stage ref={ref} label={translate({id: 'code.b.machines.label', message: 'Three machines: a Mac that runs the coordinator, a Linux server and a Windows PC that run worker threads. Each has its own access setting. While the Linux server is offline, a new thread skips it and starts on the Windows PC.', description: 'Benefit diagram on the SpecWithCode page: accessible description of the machines drawing'})}>
    <p className={styles.order}>{translate({id: 'code.b.machines.order', message: 'Machines for workers', description: 'Benefit diagram on the SpecWithCode page: project setting, as the app labels it'})}<b>1 · {names['Linux server']}</b><b>2 · {names['Windows PC']}</b></p>
    <ul className={styles.fleet}>
      {FLEET.map((m, i) => {
        const off = i === 1 && offline;
        return <li key={m.name} className={clsx(styles.machine, off && styles.machineOff, i > 0 && !off && styles.machineLive)}>
          <p className={styles.machineHead}><span className={styles.os}>{OS_ICON[m.os]}</span><b>{names[m.name]}</b><span className={clsx(styles.dot, off && styles.dotOff)} /></p>
          <p className={styles.access}>{off ? translate({id: 'code.b.machines.offline', message: 'Offline · skipped', description: 'Benefit diagram on the SpecWithCode page: a machine that is offline is skipped when placing threads'}) : access[m.access]}</p>
          <ul className={styles.load}>{load[i].map(x => <li key={x} className={styles.swap}>{tasks[x] ?? x}</li>)}</ul>
        </li>;
      })}
    </ul>
  </Stage>;
}

/* ---------- 6. Limits: every account on one bar, and what happens when one runs out ---------- */
const ACCOUNTS = [
  {mark: 'claude', plan: 'Claude Max', used: [72, 99, 99]},
  {mark: 'openai', plan: 'ChatGPT Pro', used: [41, 44, 58]},
  {mark: 'copilot', plan: 'GitHub Copilot', used: [18, 20, 23]},
];

export function Limits() {
  const [ref, step] = useStep<HTMLDivElement>(3, 2, 2800);
  const modes = [
    translate({id: 'code.b.limits.switch', message: 'Switch automatically', description: 'Benefit diagram on the SpecWithCode page: choice under "When a provider runs out", as the app labels it'}),
    translate({id: 'code.b.limits.offer', message: 'Offer the fallback', description: 'Benefit diagram on the SpecWithCode page: choice under "When a provider runs out", as the app labels it'}),
    translate({id: 'code.b.limits.wait', message: 'Wait for the reset', description: 'Benefit diagram on the SpecWithCode page: choice under "When a provider runs out", as the app labels it'}),
  ];
  return <Stage ref={ref} label={translate({id: 'code.b.limits.label', message: 'Usage limits for three accounts: Claude Max, ChatGPT Pro and GitHub Copilot. When Claude Max reaches 99% used, the thread continues on Codex. The rule is set to Switch automatically; the other choices are Offer the fallback and Wait for the reset.', description: 'Benefit diagram on the SpecWithCode page: accessible description of the usage limits drawing. Keep product names in English'})}>
    <p className={styles.colTitle}>{translate({id: 'code.b.limits.title', message: 'Usage › Limits', description: 'Benefit diagram on the SpecWithCode page: menu path in the app; translate it as the app labels it'})}</p>
    <ul className={styles.meters}>
      {ACCOUNTS.map(a => {
        const u = a.used[step];
        return <li key={a.plan} className={clsx(u >= 99 && styles.meterFull)}>
          <Logo name={a.mark} size={18} /><b>{a.plan}</b><span className={styles.pct}>{u}%</span>
          <span className={styles.meter}><i style={{width: `${u}%`}} /></span>
        </li>;
      })}
    </ul>
    <p className={clsx(styles.note, styles.fallback, step === 2 && styles.fallbackOn)}><Logo name="openai" size={14} />{translate({id: 'code.b.limits.continued', message: 'Claude Max at 99%. This thread continued on Codex.', description: 'Benefit diagram on the SpecWithCode page: line shown when a thread moves to the fallback agent. Keep product names in English'})}</p>
    <p className={styles.modes}><span>{translate({id: 'code.b.limits.rule', message: 'When a provider runs out', description: 'Benefit diagram on the SpecWithCode page: project setting, as the app labels it'})}</span>{modes.map((m, i) => <b key={m} className={clsx(i === 0 && styles.modeOn)}>{m}</b>)}</p>
  </Stage>;
}

/* ---------- 7. Skills: one table for every agent's skills ---------- */
const SKILLS: {name: string; agents: string[]; off?: string; versions: string[]; tier: boolean}[] = [
  {name: 'frontend-design', agents: ['claude', 'openai', 'gemini'], versions: ['1.4.0', '1.4.0', '1.4.0'], tier: true},
  {name: 'release-notes', agents: ['claude', 'openai', 'copilot'], off: 'openai', versions: ['1.1.0', '1.1.0', '1.2.0'], tier: true},
  {name: 'our-api-style', agents: ['claude', 'openai'], versions: ['local', 'local', 'local'], tier: false},
];

export function Skills() {
  const [ref, step] = useStep<HTMLDivElement>(3, 2, 2800);
  return <Stage ref={ref} label={translate({id: 'code.b.skills.label', message: 'Settings, Skills: a table of three skills with the agents that see each one, its version and its tier. One skill is switched off for Codex only, then updates from version 1.1.0 to 1.2.0 and is installed on three machines.', description: 'Benefit diagram on the SpecWithCode page: accessible description of the skills drawing'})}>
    <p className={styles.colTitle}>{translate({id: 'code.b.skills.title', message: 'Settings › Skills', description: 'Benefit diagram on the SpecWithCode page: menu path in the app; translate it as the app labels it'})}</p>
    <div className={styles.table}>
      <p className={styles.thead}><span>{translate({id: 'code.b.skills.col.skill', message: 'Skill', description: 'Benefit diagram on the SpecWithCode page: table column, as the app labels it'})}</span><span>{translate({id: 'code.b.skills.col.providers', message: 'Providers', description: 'Benefit diagram on the SpecWithCode page: table column, as the app labels it'})}</span><span>{translate({id: 'code.b.skills.col.version', message: 'Version', description: 'Benefit diagram on the SpecWithCode page: table column, as the app labels it'})}</span><span>{translate({id: 'code.b.skills.col.tier', message: 'Tier', description: 'Benefit diagram on the SpecWithCode page: table column, as the app labels it'})}</span></p>
      {SKILLS.map(s => <p key={s.name} className={styles.trow}>
        <code>{s.name}</code>
        <span className={styles.agents}>{s.agents.map(a => {
          const on = !(s.off === a && step >= 1);
          return <span key={a} className={clsx(styles.agentSwitch, !on && styles.agentOff)}><Logo name={a} size={14} /><Toggle on={on} /></span>;
        })}</span>
        <span key={s.versions[step]} className={clsx(styles.version, s.versions[step] !== s.versions[0] && styles.swap, s.versions[step] !== s.versions[0] && styles.versionNew)}>{s.versions[step] === 'local' ? translate({id: 'code.b.skills.local', message: 'local', description: 'Benefit diagram on the SpecWithCode page: version cell of a skill that was not installed from the registry'}) : s.versions[step]}</span>
        <span className={clsx(styles.tier, s.tier && styles.tierOk)}>{s.tier ? <><Check size={11} strokeWidth={3} />VERIFIED</> : '–'}</span>
      </p>)}
    </div>
    <p className={clsx(styles.push, step === 2 && styles.pushDone)}>{translate({id: 'code.b.skills.push', message: 'Install on several…', description: 'Benefit diagram on the SpecWithCode page: button in Settings > Skills, as the app labels it'})}
      {['Mac', translate({id: 'code.b.machines.linux', message: 'Linux server', description: 'Benefit diagram on the SpecWithCode page: machine name'}), translate({id: 'code.b.machines.windows', message: 'Windows PC', description: 'Benefit diagram on the SpecWithCode page: machine name'})].map(m => <b key={m}><Check size={11} strokeWidth={3} />{m}</b>)}
    </p>
  </Stage>;
}
