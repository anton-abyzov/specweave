import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { tools } from '../data/tools';
import { TUTORIALS, type Tutorial } from '../data/tutorials';
import base from './continuity.module.css';
import h from '../components/landing/home.module.css';
import HomeHandoff from '../components/landing/HomeHandoff';
import HomeHero from '../components/home/HomeHero';
import FamilyCards from '../components/home/FamilyCards';
import Crop, { type CropSpec } from '../components/home/Crop';
import { SPECWITHCODE_RELEASE as release } from '../data/specwithcodeRelease';

/*
  spec-weave.com home: one story for the family (SpecWeave CLI, SpecWithCode, Verified Skill),
  then the handoff layers, the proof, the app and tutorials.
  Motion: layered hero (components/home/HomeHero), a pinned four-beat stage in #how
  (components/landing/HomeHandoff), and scroll-driven reveals elsewhere. The resting state is the
  final layout, so reduced motion, no-JS, print and captures render complete.
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

/** Real capture: the command approval card in a Codex worker thread (flow-worker-codex-20261015.webp). */
const APPROVAL: CropSpec = {
  src: '/img/studio/flow-worker-codex-20261015.webp', w: 690, h: 1090, x: 56, y: 940, cw: 580, ch: 150,
  alt: 'Crop of a Codex worker thread: Command approval for /bin/zsh -lc "pwd; rg --files -g AGENTS.md", with Decline and Approve buttons',
};

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
const FEATURED_TUTORIALS = ['how-specwithcode-works', 'start-specwithcode', 'specwithcode-tour'];

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
      <HomeHero />

      <div className={h.tools}>
        <p><span className={h.toolsLabel}>Works with</span>{tools.map((t) => <span key={t} className={h.tool}>{t}</span>)}</p>
      </div>

      {/* 2. The family: one record, three ways in, and where each visitor should start */}
      <section className={h.section} id="family" aria-labelledby="family-title">
        <div className={h.head}>
          <h2 id="family-title">One record in git, three ways to work with it</h2>
          <p>SpecWeave keeps the plan and the evidence in your repository. SpecWithCode runs agents against that record on your machines. Verified Skill gives those agents skills you can check first.</p>
        </div>
        <FamilyCards cliVersion={CLI_VERSION} cliDate={CLI_DATE} />
        <nav className={h.guides} aria-label="Guides">
          <span>Guides</span>
          <Link className="wv-link" to="/docs/guides/claude-code-usage-limit/">Claude Code usage limit</Link>
          <Link className="wv-link" to="/docs/guides/switch-claude-code-to-codex/">Switch Claude Code to Codex</Link>
          <Link className="wv-link" to="/docs/guides/cross-tool-handoff/">Claude Code handoff</Link>
          <Link className="wv-link" to="/docs/compare/spec-driven-development-tools/">Spec-driven tools compared</Link>
        </nav>
      </section>

      {/* 3. The handoff, layer by layer (the main scroll sequence) */}
      <section className={h.section} id="how" aria-labelledby="how-title">
        <HomeHandoff head={<div className={clsx(h.head, h.howHead)}>
          <h2 id="how-title" className={h.howTitle}>When Claude Code hits its limit, Codex picks up the same task</h2>
          <p>The handoff carries the spec, the claims and the evidence. Nothing lives only in a chat window.</p>
        </div>} />
        <p className={h.note}>Example increment, written in the formats specweave {CLI_VERSION} reads: criteria as <code>- [ ] AC-01:</code> lines, one JSON object per ledger line. See a real pickup in <Link className={base.textLink} to="/product">How SpecWeave works</Link>.</p>
      </section>

      {/* 4. The records and the gate */}
      <section className={clsx(h.section, h.proof, h.lazy)} id="proof" aria-labelledby="proof-title">
        <div className={clsx(h.proofText, h.reveal)}>
          <h2 id="proof-title">Nothing closes without proof</h2>
          <p className={h.proofLead}>Open the increment folder and you can see what was planned, who did it and what proved it.</p>
          <pre className={clsx('wv-code', h.folder)} aria-label="Files in an increment folder">{FOLDER.map(([depth, name, note]) => <span key={`${depth}${name}`} className={h.folderLine} style={{'--depth': depth} as React.CSSProperties}><span className={h.folderName}>{'  '.repeat(depth)}{name}</span>{note && <span className={h.folderNote}>{note}</span>}</span>)}</pre>
        </div>
        <div className={clsx(h.proofGate, h.reveal)}>
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
      <section className={clsx(h.section, h.app, h.lazy)} id="app" aria-labelledby="app-title">
        <div className={h.head}>
          <h2 id="app-title">Run the same work from a desktop app</h2>
          <p>SpecWithCode runs these increments as threads on your own machines and subscriptions, with one coordinator per project and workers on any provider you are signed in to.</p>
        </div>
        <div className={h.appGrid}>
          <div className={h.appShots}>
            <figure className={clsx('wv-window', h.appShot, h.reveal)}>
              <div className="wv-window__bar"><span>SpecWithCode</span><span>Usage and limits</span></div>
              <a href="/img/studio/flow-usage-limits.webp" aria-label="Open the full-size Usage and limits screenshot">
                <img src="/img/studio/flow-usage-limits.webp" width={1040} height={520} loading="lazy" decoding="async" alt="SpecWithCode Usage and limits screen: Codex weekly 10% left; Claude session 2%, weekly 54% and weekly Fable 84% left, each with its reset time" />
              </a>
              <figcaption>Every signed-in account’s session and weekly windows on one screen. From the SpecWithCode recording of 10 October 2026. <a className={clsx('wv-link', h.fullSize)} href="/img/studio/flow-usage-limits.webp">View full size</a></figcaption>
            </figure>
            <figure className={clsx('wv-window', h.appShot, h.reveal)}>
              <div className="wv-window__bar"><span>SpecWithCode</span><span>Codex worker</span></div>
              <Crop spec={APPROVAL} />
              <figcaption>A Codex worker asks before it runs a command, with the provider’s own approval. Cropped from the SpecWithCode recording of 15 October 2026.</figcaption>
            </figure>
          </div>
          <div className={clsx(h.machines, h.reveal)}>
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

      {/* 6. Tutorials (the skills detail now lives in the Verified Skill card in #family) */}
      {guides.length > 0 && <section className={clsx(h.section, h.lazy)} id="tutorials" aria-labelledby="tutorials-title">
        <div className={h.head}>
          <h2 id="tutorials-title">Learn it in a few minutes</h2>
          <p>Narrated recordings of the real apps, with captions and chapters.</p>
        </div>
        <ul className={h.guides}>
          {guides.map((t) => {
            const length = lengthOf(t.durationSeconds);
            const date = dateOf(t);
            const total = t.durationSeconds || 0;
            return <li key={t.slug} className={h.reveal}>
              {t.poster && <div className={h.guideThumb}>
                <img src={t.poster} alt="" loading="lazy" decoding="async" width={1600} height={900} />
                {length && <span className={h.guideTime}>{length}</span>}
              </div>}
              {total > 0 && t.chapters.length > 1 && <div className={h.guideChapters} aria-hidden="true">
                {t.chapters.map((c, i) => {
                  const end = t.chapters[i + 1]?.start ?? total;
                  return <span key={c.start} style={{ flexGrow: Math.max(1, end - c.start) }} />;
                })}
              </div>}
              <span className={h.guideKind}>{productOf(t)}</span>
              <Link className={h.guideLink} to={`/tutorials/${t.slug}/`}>{t.title}</Link>
              <span className={h.guideMeta}>{[length, t.chapters.length > 1 && `${t.chapters.length} chapters`, date && `published ${date}`].filter(Boolean).join(', ')}</span>
            </li>;
          })}
        </ul>
        <p className={h.allGuides}><Link className={base.textLink} to="/tutorials">All tutorials</Link></p>
      </section>}

      {/* 7. Pricing, built with, final call to action */}
      <section className={clsx(h.section, h.pricing, h.lazy)} aria-labelledby="pricing-title">
        <div>
          <h2 id="pricing-title">Free for every developer and team</h2>
          <p>You pay only for Pro (unlimited Connect machines, private skills) or a team contract with setup and support.</p>
          <Link className={base.secondary} to="/pricing">See pricing</Link>
        </div>
        <dl className={h.facts}>
          <div><dt>SpecWithCode app</dt><dd>Free</dd></div>
          <div><dt>SpecWeave CLI</dt><dd>Free, MIT licensed</dd></div>
          <div><dt>Seat fee</dt><dd>None</dd></div>
          <div><dt>Connect machines</dt><dd>3 free, 10 for the first 1,000 founders, unlimited on Pro</dd></div>
          <div><dt>Markup on your AI subscriptions</dt><dd>None</dd></div>
        </dl>
      </section>

      <section className={clsx(h.section, h.lazy)} id="built-with" aria-labelledby="built-with-title">
        <div className={h.head}>
          <h2 id="built-with-title">Built with SpecWeave</h2>
        </div>
        <ul className={h.built}>
          {BUILT.map((b) => <li key={b.name} className={h.reveal}><a className={base.textLink} href={b.href}>{b.name}</a><span>{b.body}</span></li>)}
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

