import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { tools } from '../data/tools';
import { TUTORIALS, type Tutorial } from '../data/tutorials';
import base from './continuity.module.css';
import h from '../components/landing/home.module.css';
import HomeHandoff from '../components/landing/HomeHandoff';
import InstallCommand from '../components/landing/InstallCommand';
import { SPECWITHCODE_RELEASE as release } from '../data/specwithcodeRelease';

/*
  spec-weave.com home: one story for the family (SpecWeave CLI, SpecWithCode, Verified Skill),
  then the handoff layers, the proof, the app, skills and tutorials.
  Facts checked on 18 October 2026: specweave 3.1.0 (package.json, CHANGELOG 17 October 2026);
  `review` exit 0 ship / 3 fix first and the opt-in skills are 3.1.0; `complete` refuses without
  reports/verify.json (src/core/tasks/closure-gate.ts); `specwithcode fleet invite` and
  Settings > Connections > Add a machine are in the SpecWithCode 1.0.43 release notes; Invite this machine and install.sh are in 1.0.44.
*/

const CLI_VERSION = '3.1.0';
const CLI_DATE = '17 October 2026';

const downloadLabel = `Download SpecWithCode ${release.version} for macOS, Apple silicon, ${release.size}`;

/** The increment folder: [depth, name, what it holds]. Wide screens align the notes in a column; phones put each note under its file. */
const FOLDER: Array<[number, string, string?]> = [
  [0, '.specweave/'],
  [1, 'increments/0001-resumable-checkout/'],
  [2, 'spec.md', 'the plan and its acceptance criteria'],
  [2, 'ledger.jsonl', 'who claimed and finished each task'],
  [2, 'handoff.md', 'where the last agent stopped'],
  [2, 'reports/'],
  [3, 'task-T-02.txt', 'test output the ledger cites'],
  [3, 'verify.md', 'tests, lint, build and criteria'],
  [3, 'verify.json', 'the closure gate'],
  [3, 'review-codex.md', 'a review by the other model'],
  [1, 'memory/MEMORY.md', 'facts every tool reads at pickup'],
];

const MACHINES = [
  'Runs where your code, skills and logins already are.',
  'Workers keep going while your laptop sleeps, on the machine running them.',
  'Each agent uses its provider’s own sign-in and approvals. There is no account with us.',
];

const BUILT = [
  { name: 'EasyChamp', href: 'https://easychamp.com', body: 'League and club tools, built across Claude Code threads, two subscriptions and Codex.' },
  { name: 'JobWeave', href: 'https://jobweave.ai', body: 'Job search, tailored resumes and interview preparation.' },
  { name: 'Verified Skill', href: 'https://verified-skill.com', body: 'Skill discovery, source inspection and local evaluations.' },
];

/** Guides shown on the home page, in order; any other published guide fills a gap. */
const FEATURED_TUTORIALS = ['how-specwithcode-works', 'specwithcode-codex', 'specwithcode-tour'];

function featuredTutorials(): Tutorial[] {
  const published = TUTORIALS.filter((t) => t.status === 'published' && t.src);
  const picked = FEATURED_TUTORIALS.map((slug) => published.find((t) => t.slug === slug)).filter((t): t is Tutorial => Boolean(t));
  for (const t of published) if (picked.length < 3 && !picked.includes(t)) picked.push(t);
  return picked.slice(0, 3);
}

/** Product name for a guide; tutorials without a product field are SpecWithCode recordings. */
function productOf(t: Tutorial): string {
  const p = String((t as Tutorial & { product?: string }).product ?? '').toLowerCase();
  if (p.includes('cli') || p === 'specweave') return 'SpecWeave CLI';
  if (p.includes('skill') || p.includes('registry') || p.includes('studio-skill')) return 'Verified Skill';
  return 'SpecWithCode';
}

function lengthOf(seconds: number | null): string | null {
  if (!seconds) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? (s ? `${m} min ${s} s` : `${m} min`) : `${s} s`;
}

function dateOf(t: Tutorial): string | null {
  const iso = t.publishedAt ?? t.uploadDate;
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Lucide monitor, 1.5 stroke. */
function MonitorIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>;
}

export default function Home() {
  const guides = featuredTutorials();
  return <Layout title="Spec-driven handoff for Claude Code, Codex and Cursor" description="Open-source CLI that keeps the spec, task ledger and handoff in git, so Codex or any agent continues when Claude Code hits its usage limit. Free, MIT.">
    <main className={clsx(base.page, h.home)}>
      {/* 1. Hero */}
      <section className={h.hero}>
        <div className={h.heroText}>
          <h1>Switch AI tools without losing your place.</h1>
          <p className={h.lead}>SpecWeave writes the plan and every finished task into git, so Claude Code, Codex or any other agent can pick up the same work. SpecWithCode runs those agents on your own machines and subscriptions.</p>
          <div className={h.actions}>
            <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}>Download for Mac</a>
            <Link className={base.secondary} to="/product">Get the CLI</Link>
          </div>
          <p className={h.requirements}>Both free. The app needs Apple silicon and macOS 13 or later.</p>
          <InstallCommand hint="The open-source CLI: MIT licensed, local first, no account." />
        </div>
        <figure className={clsx('wv-window', h.heroShot, h.crop)}>
          <div className="wv-window__bar"><span>SpecWithCode</span><span>Coordinator</span></div>
          <a className={h.cropFrame} href="/img/studio/flow-dispatch-20261015.webp" aria-label="Open the full-size screenshot of the coordinator starting two workers">
            <img src="/img/studio/flow-dispatch-20261015.webp" width={1064} height={680} fetchPriority="high" alt="SpecWithCode coordinator starting two workers in parallel: Write tip.py CLI on Codex, with approval requested, and README usage for tip.py on Claude Code, working" />
          </a>
          <figcaption>One coordinator starts a Codex worker and a Claude Code worker. SpecWithCode 1.0.21, 15 October 2026. <a className={clsx('wv-link', h.fullSize)} href="/img/studio/flow-dispatch-20261015.webp">View full size</a></figcaption>
        </figure>
      </section>

      <div className={h.tools}>
        <p><span className={h.toolsLabel}>Works with</span>{tools.map((t) => <span key={t}>{t}</span>)}</p>
      </div>

      {/* 2. The family: one record, three ways in, and where each visitor should start */}
      <section className={h.section} id="family" aria-labelledby="family-title">
        <div className={h.head}>
          <h2 id="family-title">One record in git, three ways to work with it</h2>
          <p>SpecWeave keeps the plan and the evidence in your repository. SpecWithCode runs agents against that record on your machines. Verified Skill gives those agents skills you can check first.</p>
        </div>
        <ol className={clsx('wv-thread', h.family)}>
          <li>
            <div className={h.familyName}>
              <h3>SpecWeave CLI</h3>
              <p className={h.kind}>Open source on npm, MIT. Version {CLI_VERSION}, {CLI_DATE}.</p>
            </div>
            <div className={h.familyBody}>
              <p>Writes the spec, the task ledger and the test evidence into your repository, and hands the work to the next tool with <code>specweave handoff</code>. Start here if you work in a terminal with Claude Code, Codex or any agent that reads files.</p>
              <InstallCommand hint="Then run specweave init in your project." className={h.familyCmd} />
              <Link className={base.textLink} to="/product">How the CLI works</Link>
            </div>
          </li>
          <li>
            <div className={h.familyName}>
              <h3>SpecWithCode</h3>
              <p className={h.kind}>Free Mac app. Version {release.version}.</p>
            </div>
            <div className={h.familyBody}>
              <p>A coordinator per project starts worker threads in the agents you already pay for, on your own machines. Each thread shows its SpecWeave increment and task progress, and its reports are saved beside the increment. Start here if you want one window for several agents.</p>
              <div className={h.familyActions}>
                <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}>Download for Mac</a>
                <Link className={base.textLink} to="/code/">See SpecWithCode</Link>
              </div>
            </div>
          </li>
          <li>
            <div className={h.familyName}>
              <h3>Verified Skill</h3>
              <p className={h.kind}>Free to browse at verified-skill.com.</p>
            </div>
            <div className={h.familyBody}>
              <p>A registry of agent skills. Each shows its source and its security scan, and its evaluation when one exists, so you know what you install before your agents use it.</p>
              <a className={base.textLink} href="https://verified-skill.com">Explore skills</a>
            </div>
          </li>
        </ol>
      </section>

      {/* 3. The handoff, layer by layer (the main scroll sequence) */}
      <section className={h.section} id="how" aria-labelledby="how-title">
        <div className={h.head}>
          <h2 id="how-title" className={h.howTitle}>When Claude Code hits its limit, Codex picks up the same task</h2>
          <p>The handoff carries the spec, the claims and the evidence. Nothing lives only in a chat window.</p>
        </div>
        <HomeHandoff />
        <p className={h.note}>Example increment, written in the formats specweave {CLI_VERSION} reads: criteria as <code>- [ ] AC-01:</code> lines, one JSON object per ledger line. See a real pickup in <Link className={base.textLink} to="/product">How SpecWeave works</Link>.</p>
      </section>

      {/* 4. The records and the gate */}
      <section className={clsx(h.section, h.proof)} id="proof" aria-labelledby="proof-title">
        <div className={h.proofText}>
          <h2 id="proof-title">Nothing closes without proof</h2>
          <p className={h.proofLead}>Open the increment folder and you can see what was planned, who did it and what proved it.</p>
          <pre className={clsx('wv-code', h.folder)} aria-label="Files in an increment folder">{FOLDER.map(([depth, name, note]) => <span key={`${depth}${name}`} className={h.folderLine} style={{'--depth': depth} as React.CSSProperties}><span className={h.folderName}>{'  '.repeat(depth)}{name}</span>{note && <span className={h.folderNote}>{note}</span>}</span>)}</pre>
        </div>
        <div className={h.proofGate}>
          <ul className="wv-evidence">
            <li>
              <span className="wv-evidence__name"><code className={h.cmdName}>specweave verify</code></span>
              <span className="wv-chip wv-chip--pass">Pass</span>
              <span className="wv-evidence__detail">Runs your test, lint and build commands, checks that every criterion in <code>spec.md</code> is ticked and writes <code>reports/verify.json</code>.</span>
            </li>
            <li>
              <span className="wv-evidence__name"><code className={h.cmdName}>specweave review</code></span>
              <span className="wv-chip wv-chip--warn">Exit 3, fix first</span>
              <span className="wv-evidence__detail">Hands the diff to a reviewer from the other model family: Codex reviews code Claude wrote, Claude reviews code Codex wrote. The report lands in <code>reports/review-codex.md</code>; exit 0 means ship.</span>
            </li>
            <li>
              <span className="wv-evidence__name"><code className={h.cmdName}>specweave complete</code></span>
              <span className="wv-chip wv-chip--fail">Blocked</span>
              <span className="wv-evidence__detail">Refuses to close an increment without a passing <code>verify.json</code>. Closing anyway takes <code>--reason</code>, and the reason is stored with the increment.</span>
            </li>
          </ul>
          <p className={h.caption}>Behaviour of specweave {CLI_VERSION}, released {CLI_DATE}.</p>
        </div>
      </section>

      {/* 5. The desktop app and your machines */}
      <section className={clsx(h.section, h.app)} id="app" aria-labelledby="app-title">
        <div className={h.head}>
          <h2 id="app-title">Run the same work from a desktop app</h2>
          <p>SpecWithCode runs these increments as threads on your own machines and subscriptions, with one coordinator per project and workers on any provider you are signed in to.</p>
        </div>
        <div className={h.appGrid}>
          <figure className={clsx('wv-window', h.appShot)}>
            <div className="wv-window__bar"><span>SpecWithCode</span><span>Usage and limits</span></div>
            <a href="/img/studio/flow-usage-limits.webp" aria-label="Open the full-size Usage and limits screenshot">
              <img src="/img/studio/flow-usage-limits.webp" width={1040} height={520} loading="lazy" decoding="async" alt="SpecWithCode Usage and limits screen: Codex weekly 10% left; Claude session 2%, weekly 54% and weekly Fable 84% left, each with its reset time" />
            </a>
            <figcaption>Every signed-in account’s session and weekly windows on one screen. From the SpecWithCode recording of 10 October 2026. <a className={clsx('wv-link', h.fullSize)} href="/img/studio/flow-usage-limits.webp">View full size</a></figcaption>
          </figure>
          <div className={h.machines}>
            <h3>Your machines, not a cloud container</h3>
            <ul className={h.list}>
              {MACHINES.map((l) => <li key={l}>{l}</li>)}
              <li>Add a Mac mini or a Linux machine by its Tailscale name: choose Invite this machine in its Settings or run <code>specwithcode fleet invite</code> there, then paste the line into Add a machine under Settings, Connections on your main Mac.</li>
            </ul>
            <div className={clsx('wv-note', h.boundary)}>
              <MonitorIcon />
              <p><strong>One machine per subscription.</strong> Sign each machine in to one account per provider and leave it there, for example Claude Code on one account and Codex on another. Switching subscriptions by hand on the same machine causes confusion; when you need more capacity, add a machine.</p>
            </div>
            <div className={h.appActions}>
              <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}>Download for Mac</a>
              <Link className={base.textLink} to="/code/">See everything SpecWithCode does</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Skills */}
      <section className={clsx(h.section, h.skills)} id="skills" aria-labelledby="skills-title">
        <div>
          <h2 id="skills-title">Add skills that passed a scan</h2>
          <p className={h.skillsLead}>Verified Skill shows where a skill comes from and what its security scan found before you install it into your agents.</p>
          <a className={base.textLink} href="https://verified-skill.com">Explore skills on verified-skill.com</a>
        </div>
        <div className={h.evidence}>
          <p className={h.caption}>What every skill page shows</p>
          <ul className="wv-evidence">
            <li><span className="wv-evidence__name">Source</span><span className="wv-evidence__detail">The repository the skill comes from, so you can read it first.</span></li>
            <li><span className="wv-evidence__name">Security scan</span><span className="wv-evidence__detail">What the scan of every file found, before you install it.</span></li>
            <li><span className="wv-evidence__name">Evaluation, when one exists</span><span className="wv-evidence__detail">Whether the skill helped on a real task. Not every skill has one yet.</span></li>
          </ul>
        </div>
      </section>

      {/* 7. Tutorials strip */}
      {guides.length > 0 && <section className={h.section} id="tutorials" aria-labelledby="tutorials-title">
        <div className={h.head}>
          <h2 id="tutorials-title">Learn it in a few minutes</h2>
          <p>Narrated recordings of the real apps, with captions and chapters.</p>
        </div>
        <ul className={h.guides}>
          {guides.map((t) => {
            const length = lengthOf(t.durationSeconds);
            const date = dateOf(t);
            return <li key={t.slug}>
              <Link className={h.guideLink} to={`/tutorials/${t.slug}/`}>{t.title}</Link>
              <span className={h.guideMeta}>{[productOf(t), length, date && `published ${date}`].filter(Boolean).join(', ')}</span>
            </li>;
          })}
        </ul>
        <p className={h.allGuides}><Link className={base.textLink} to="/tutorials">All tutorials</Link></p>
      </section>}

      {/* 8. Pricing, built with, final call to action */}
      <section className={clsx(h.section, h.pricing)} aria-labelledby="pricing-title">
        <div>
          <h2 id="pricing-title">Free for every developer</h2>
          <p>Companies pay only if they want hosted skills, rollout help or support.</p>
          <Link className={base.secondary} to="/pricing">See pricing</Link>
        </div>
        <dl className={h.facts}>
          <div><dt>SpecWithCode app</dt><dd>Free</dd></div>
          <div><dt>SpecWeave CLI</dt><dd>Free, MIT licensed</dd></div>
          <div><dt>Seat limit / usage cap</dt><dd>None</dd></div>
          <div><dt>Markup on your AI subscriptions</dt><dd>None</dd></div>
        </dl>
      </section>

      <section className={h.section} id="built-with" aria-labelledby="built-with-title">
        <div className={h.head}>
          <h2 id="built-with-title">Built with SpecWeave</h2>
        </div>
        <ul className={h.built}>
          {BUILT.map((b) => <li key={b.name}><a className={base.textLink} href={b.href}>{b.name}</a><span>{b.body}</span></li>)}
        </ul>
      </section>

      <section className={clsx(base.finalCta, h.final)}>
        <h2>Bring every agent, keep your place</h2>
        <div className={h.finalActions}>
          <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}>Download for Mac</a>
          <Link className={base.textLink} to="/docs/getting-started">Get started with the CLI</Link>
        </div>
      </section>
    </main>
  </Layout>;
}

