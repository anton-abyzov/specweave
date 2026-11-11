import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import Translate, { translate } from '@docusaurus/Translate';
import { tools } from '../data/tools';
import { TUTORIALS, type Tutorial } from '../data/tutorials';
import base from './continuity.module.css';
import h from '../components/landing/home.module.css';
import HomeHandoff from '../components/landing/HomeHandoff';
import HomeHero from '../components/home/HomeHero';
import FamilyCards from '../components/home/FamilyCards';
import Crop, { type CropSpec } from '../components/home/Crop';
import BuiltWithItself from '../components/code/BuiltWithItself';
import MeasuredPlanning from '../components/home/MeasuredPlanning';
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

/** The increment folder: [depth, name, what it holds]. Wide screens align the notes in a column; phones put each note under its file. */
function folder(): Array<[number, string, string?]> {
  return [
    [0, '.specweave/'],
    [1, 'increments/0001-resumable-checkout/'],
    [2, 'spec.md', translate({ id: 'home.proof.folder.spec', message: 'the plan and its acceptance criteria', description: 'Note next to spec.md in the increment folder listing' })],
    [2, 'ledger.jsonl', translate({ id: 'home.proof.folder.ledger', message: 'who claimed and finished each task', description: 'Note next to ledger.jsonl in the increment folder listing' })],
    [2, 'handoff.md', translate({ id: 'home.proof.folder.handoff', message: 'where the last agent stopped', description: 'Note next to handoff.md in the increment folder listing' })],
    [2, 'reports/'],
    [3, 'task-T-02.txt', translate({ id: 'home.proof.folder.taskReport', message: 'test output the ledger cites', description: 'Note next to task-T-02.txt in the increment folder listing' })],
    [3, 'verify.md', translate({ id: 'home.proof.folder.verifyMd', message: 'tests, lint, build and criteria', description: 'Note next to verify.md in the increment folder listing' })],
    [3, 'verify.json', translate({ id: 'home.proof.folder.verifyJson', message: 'the closure gate', description: 'Note next to verify.json in the increment folder listing' })],
    [3, 'review-codex.md', translate({ id: 'home.proof.folder.review', message: 'a review by the other model', description: 'Note next to review-codex.md in the increment folder listing' })],
    [1, 'memory/MEMORY.md', translate({ id: 'home.proof.folder.memory', message: 'facts every tool reads at pickup', description: 'Note next to memory/MEMORY.md in the increment folder listing' })],
  ];
}

/** Real capture: the command approval card in a Codex worker thread (flow-worker-codex-20261015.webp). */
function approvalCrop(): CropSpec {
  return {
    src: '/img/studio/flow-worker-codex-20261015.webp', w: 690, h: 1090, x: 56, y: 940, cw: 580, ch: 150,
    alt: translate({ id: 'home.app.approval.alt', message: 'Crop of a Codex worker thread: Command approval for /bin/zsh -lc "pwd; rg --files -g AGENTS.md", with Decline and Approve buttons', description: 'Alt text of a screenshot crop. Keep Codex and the shell command in English' }),
  };
}

function machines(): string[] {
  return [
    translate({ id: 'home.app.machines.local', message: 'Runs where your code, skills and logins already are.', description: 'List item under "Your machines, not a cloud container"' }),
    translate({ id: 'home.app.machines.sleep', message: 'Workers keep going while your laptop sleeps, on the machine running them.', description: 'List item under "Your machines, not a cloud container"' }),
    translate({ id: 'home.app.machines.signIn', message: 'Each agent uses its provider’s own sign-in and approvals. There is no account with us.', description: 'List item under "Your machines, not a cloud container"' }),
  ];
}

function built(): Array<{ name: string; href: string; body: string }> {
  return [
    { name: 'SpecWithCode', href: '/code/#built-with-itself', body: translate({ id: 'home.builtWith.specwithcode', message: 'The app itself, planned in 302 SpecWeave increments, with 1,393 pull requests merged from 9 October to 7 November 2026.', description: 'Description of SpecWithCode in the Built with SpecWeave list. Keep product names in English' }) },
    { name: 'EasyChamp', href: 'https://easychamp.com', body: translate({ id: 'home.builtWith.easychamp', message: 'League and club tools, built across Claude Code threads, two subscriptions and Codex.', description: 'Description of EasyChamp in the Built with SpecWeave list. Keep product names in English' }) },
    { name: 'JobWeave', href: '/docs/overview/dogfooding/', body: translate({ id: 'home.builtWith.jobweave', message: 'Job search, tailored resumes and interview preparation.', description: 'Description of JobWeave in the Built with SpecWeave list' }) },
    { name: 'Verified Skill', href: 'https://verified-skill.com', body: translate({ id: 'home.builtWith.verifiedSkill', message: 'Skill discovery, source inspection and local evaluations.', description: 'Description of Verified Skill in the Built with SpecWeave list' }) },
  ];
}

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
  return m
    ? (s
      ? translate({ id: 'home.tutorials.length.minSec', message: '{m} min {s} s', description: 'Video length in minutes and seconds' }, { m, s })
      : translate({ id: 'home.tutorials.length.min', message: '{m} min', description: 'Video length in whole minutes' }, { m }))
    : translate({ id: 'home.tutorials.length.sec', message: '{s} s', description: 'Video length in seconds' }, { s });
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
  const FOLDER = folder();
  const APPROVAL = approvalCrop();
  const MACHINES = machines();
  const BUILT = built();
  const downloadLabel = translate({ id: 'home.download.ariaLabel', message: 'Download SpecWithCode {version} for macOS, Apple silicon, {size}', description: 'Accessible label of the Download for Mac button; {version} is the app version, {size} the file size. Keep product names in English' }, { version: release.version, size: release.size });
  const downloadText = <Translate id="home.download.button" description="Primary button that downloads the Mac app">Download for Mac</Translate>;
  return <Layout
    title={translate({ id: 'home.meta.title', message: 'Spec-driven handoff for Claude Code, Codex and Cursor', description: 'Home page <title>. Keep product names in English' })}
    description={translate({ id: 'home.meta.description', message: 'Open-source CLI that keeps the spec, task ledger and handoff in git, so Codex or any agent continues when Claude Code hits its usage limit. Free, MIT.', description: 'Home page meta description. Keep product names in English' })}>
    <main className={clsx(base.page, h.home)}>
      {/* 1. Hero */}
      <HomeHero />

      <div className={h.tools}>
        <p><span className={h.toolsLabel}><Translate id="home.tools.label" description="Label before the list of supported agent tools">Works with</Translate></span>{tools.map((t) => <span key={t} className={h.tool}>{t}</span>)}</p>
      </div>

      {/* 2. The family: one record, three ways in, and where each visitor should start */}
      <section className={h.section} id="family" aria-labelledby="family-title">
        <div className={h.head}>
          <h2 id="family-title"><Translate id="home.family.title" description="Heading of the product family section">One record in git, three ways to work with it</Translate></h2>
          <p><Translate id="home.family.lead" description="Lead of the product family section. Keep product names in English">SpecWeave keeps the plan and the evidence in your repository. SpecWithCode runs agents against that record on your machines. Verified Skill gives those agents skills you can check first.</Translate></p>
        </div>
        <FamilyCards cliVersion={CLI_VERSION} cliDate={CLI_DATE} />
        <nav className={h.guides} aria-label={translate({ id: 'home.guides.ariaLabel', message: 'Guides', description: 'Accessible label of the guide links navigation' })}>
          <span><Translate id="home.guides.label" description="Label before the guide links">Guides</Translate></span>
          <Link className="wv-link" to="/docs/guides/claude-code-usage-limit/"><Translate id="home.guides.usageLimit" description="Guide link. Keep Claude Code in English">Claude Code usage limit</Translate></Link>
          <Link className="wv-link" to="/docs/guides/switch-claude-code-to-codex/"><Translate id="home.guides.switchToCodex" description="Guide link. Keep product names in English">Switch Claude Code to Codex</Translate></Link>
          <Link className="wv-link" to="/docs/guides/cross-tool-handoff/"><Translate id="home.guides.handoff" description="Guide link. Keep Claude Code in English">Claude Code handoff</Translate></Link>
          <Link className="wv-link" to="/docs/compare/spec-driven-development-tools/"><Translate id="home.guides.compare" description="Guide link to the tool comparison">Spec-driven tools compared</Translate></Link>
        </nav>
      </section>

      {/* 2b. Proof that the app builds itself: real thread records and an end-to-end capture */}
      <div className={h.section}><BuiltWithItself /></div>

      {/* 3. The handoff, layer by layer (the main scroll sequence) */}
      <section className={h.section} id="how" aria-labelledby="how-title">
        <HomeHandoff head={<div className={clsx(h.head, h.howHead)}>
          <h2 id="how-title" className={h.howTitle}><Translate id="home.how.title" description="Heading of the handoff section. Keep product names in English">When Claude Code hits its limit, Codex picks up the same task</Translate></h2>
          <p><Translate id="home.how.lead" description="Lead of the handoff section">The handoff carries the spec, the claims and the evidence. Nothing lives only in a chat window.</Translate></p>
        </div>} />
        <p className={h.note}><Translate id="home.how.note" description="Note under the handoff example; {version} is the CLI version, {format} a code sample, {link} a link labelled 'How SpecWeave works'" values={{ version: CLI_VERSION, format: <code>- [ ] AC-01:</code>, link: <Link className={base.textLink} to="/product"><Translate id="home.how.note.link" description="Link text to the product page. Keep SpecWeave in English">How SpecWeave works</Translate></Link> }}>{'Example increment, written in the formats specweave {version} reads: criteria as {format} lines, one JSON object per ledger line. See a real pickup in {link}.'}</Translate></p>
      </section>

      {/* 4. The records and the gate */}
      <section className={clsx(h.section, h.proof, h.lazy)} id="proof" aria-labelledby="proof-title">
        <div className={clsx(h.proofText, h.reveal)}>
          <h2 id="proof-title"><Translate id="home.proof.title" description="Heading of the proof section">Nothing closes without proof</Translate></h2>
          <p className={h.proofLead}><Translate id="home.proof.lead" description="Lead of the proof section">Open the increment folder and you can see what was planned, who did it and what proved it.</Translate></p>
          <pre className={clsx('wv-code', h.folder)} aria-label={translate({ id: 'home.proof.folder.ariaLabel', message: 'Files in an increment folder', description: 'Accessible label of the increment folder listing' })}>{FOLDER.map(([depth, name, note]) => <span key={`${depth}${name}`} className={h.folderLine} style={{'--depth': depth} as React.CSSProperties}><span className={h.folderName}>{'  '.repeat(depth)}{name}</span>{note && <span className={h.folderNote}>{note}</span>}</span>)}</pre>
        </div>
        <div className={clsx(h.proofGate, h.reveal)}>
          <ul className="wv-evidence">
            <li>
              <span className="wv-evidence__name"><code className={h.cmdName}>specweave verify</code></span>
              <span className="wv-chip wv-chip--pass"><Translate id="home.proof.verify.chip" description="Pass chip for specweave verify">Pass</Translate></span>
              <span className="wv-evidence__detail"><Translate id="home.proof.verify.detail" description="Explains specweave verify; {spec} and {report} are file names, keep them" values={{ spec: <code>spec.md</code>, report: <code>reports/verify.json</code> }}>{'Runs your test, lint and build commands, checks that every criterion in {spec} is ticked and writes {report}.'}</Translate></span>
            </li>
            <li>
              <span className="wv-evidence__name"><code className={h.cmdName}>specweave review</code></span>
              <span className="wv-chip wv-chip--warn"><Translate id="home.proof.review.chip" description="Warning chip for specweave review: exit code 3 means fix first">Exit 3, fix first</Translate></span>
              <span className="wv-evidence__detail"><Translate id="home.proof.review.detail" description="Explains specweave review; {report} is a file name, keep it. Keep product names in English" values={{ report: <code>reports/review-codex.md</code> }}>{'Hands the diff to a reviewer from the other model family: Codex reviews code Claude wrote, Claude reviews code Codex wrote. The report lands in {report}; exit 0 means ship.'}</Translate></span>
            </li>
            <li>
              <span className="wv-evidence__name"><code className={h.cmdName}>specweave complete</code></span>
              <span className="wv-chip wv-chip--fail"><Translate id="home.proof.complete.chip" description="Fail chip for specweave complete">Blocked</Translate></span>
              <span className="wv-evidence__detail"><Translate id="home.proof.complete.detail" description="Explains specweave complete; {file} is a file name and {flag} a command flag, keep them" values={{ file: <code>verify.json</code>, flag: <code>--reason</code> }}>{'Refuses to close an increment without a passing {file}. Closing anyway takes {flag}, and the reason is stored with the increment.'}</Translate></span>
            </li>
          </ul>
          <p className={h.caption}><Translate id="home.proof.caption" description="Caption; {version} is the CLI version, {date} its release date" values={{ version: CLI_VERSION, date: CLI_DATE }}>{'Behaviour of specweave {version}, released {date}.'}</Translate></p>
        </div>
      </section>

      {/* 4b. When a spec pays off, measured on our own pull requests */}
      <div className={clsx(h.section, h.lazy)}><MeasuredPlanning /></div>

      {/* 5. The desktop app and your machines */}
      <section className={clsx(h.section, h.app, h.lazy)} id="app" aria-labelledby="app-title">
        <div className={h.head}>
          <h2 id="app-title"><Translate id="home.app.title" description="Heading of the desktop app section">Run the same work from a desktop app</Translate></h2>
          <p><Translate id="home.app.lead" description="Lead of the desktop app section. Keep SpecWithCode in English">SpecWithCode runs these increments as threads on your own machines and subscriptions, with one coordinator per project and workers on any provider you are signed in to.</Translate></p>
        </div>
        <div className={h.appGrid}>
          <div className={h.appShots}>
            <figure className={clsx('wv-window', h.appShot, h.reveal)}>
              <div className="wv-window__bar"><span>SpecWithCode</span><span><Translate id="home.app.usage.window" description="Window title bar label: the app's Usage and limits screen">Usage and limits</Translate></span></div>
              <a href="/img/studio/flow-usage-limits.webp" aria-label={translate({ id: 'home.app.usage.open.ariaLabel', message: 'Open the full-size Usage and limits screenshot', description: 'Accessible label of the screenshot link' })}>
                <img src="/img/studio/flow-usage-limits.webp" width={1040} height={520} loading="lazy" decoding="async" alt={translate({ id: 'home.app.usage.alt', message: 'SpecWithCode Usage and limits screen: Codex weekly 10% left; Claude session 2%, weekly 54% and weekly Fable 84% left, each with its reset time', description: 'Alt text of the usage screenshot. Keep product and model names in English' })} />
              </a>
              <figcaption><Translate id="home.app.usage.caption" description="Caption of the usage screenshot. Keep SpecWithCode in English">Every signed-in account’s session and weekly windows on one screen. From the SpecWithCode recording of 10 October 2026.</Translate> <a className={clsx('wv-link', h.fullSize)} href="/img/studio/flow-usage-limits.webp"><Translate id="studioWindow.viewFullSize" description="Link that opens the full-size screenshot">View full size</Translate></a></figcaption>
            </figure>
            <figure className={clsx('wv-window', h.appShot, h.reveal)}>
              <div className="wv-window__bar"><span>SpecWithCode</span><span><Translate id="home.app.approval.window" description="Window title bar label. Keep Codex in English">Codex worker</Translate></span></div>
              <Crop spec={APPROVAL} />
              <figcaption><Translate id="home.app.approval.caption" description="Caption of the approval screenshot. Keep product names in English">A Codex worker asks before it runs a command, with the provider’s own approval. Cropped from the SpecWithCode recording of 15 October 2026.</Translate></figcaption>
            </figure>
          </div>
          <div className={clsx(h.machines, h.reveal)}>
            <h3><Translate id="home.app.machines.title" description="Heading of the machines list">Your machines, not a cloud container</Translate></h3>
            <ul className={h.list}>
              {MACHINES.map((l) => <li key={l}>{l}</li>)}
              <li><Translate id="home.app.machines.add" description="How to add a machine; {command} is a shell command, keep it. 'Join a main machine', 'Add a machine' and 'Settings, Machines' are app UI labels. Keep product names in English" values={{ command: <code>specwithcode fleet invite</code> }}>{'Add a Mac mini or a Linux machine over SpecWithCode Connect: link Connect on it with your account, choose Join a main machine in its Settings or run {command} there, then paste the line into Add a machine under Settings, Machines on your main Mac.'}</Translate></li>
            </ul>
            <div className={clsx('wv-note', h.boundary)}>
              <MonitorIcon />
              <p><strong><Translate id="home.app.boundary.title" description="Bold lead-in of the one-machine-per-subscription note">One machine per subscription.</Translate></strong> <Translate id="home.app.boundary.body" description="Body of the one-machine-per-subscription note. Keep product names in English">Sign each machine in to one account per provider and leave it there, for example Claude Code on one account and Codex on another. Switching subscriptions by hand on the same machine causes confusion; when you need more capacity, add a machine.</Translate></p>
            </div>
            <div className={h.appActions}>
              <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}>{downloadText}</a>
              <Link className={base.textLink} to="/code/"><Translate id="home.app.link" description="Link to the SpecWithCode page. Keep SpecWithCode in English">See everything SpecWithCode does</Translate></Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Tutorials (the skills detail now lives in the Verified Skill card in #family) */}
      {guides.length > 0 && <section className={clsx(h.section, h.lazy)} id="tutorials" aria-labelledby="tutorials-title">
        <div className={h.head}>
          <h2 id="tutorials-title"><Translate id="home.tutorials.title" description="Heading of the tutorials section">Learn it in a few minutes</Translate></h2>
          <p><Translate id="home.tutorials.lead" description="Lead of the tutorials section">Narrated recordings of the real apps, with captions and chapters.</Translate></p>
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
              <span className={h.guideMeta}>{[length, t.chapters.length > 1 && translate({ id: 'home.tutorials.chapters', message: '{count} chapters', description: 'Number of chapters in a tutorial video (always 2 or more)' }, { count: t.chapters.length }), date && translate({ id: 'home.tutorials.published', message: 'published {date}', description: 'Tutorial publication date; {date} is a formatted date' }, { date })].filter(Boolean).join(', ')}</span>
            </li>;
          })}
        </ul>
        <p className={h.allGuides}><Link className={base.textLink} to="/tutorials"><Translate id="home.tutorials.all" description="Link to the tutorials index">All tutorials</Translate></Link></p>
      </section>}

      {/* 7. Pricing, built with, final call to action */}
      <section className={clsx(h.section, h.pricing, h.lazy)} aria-labelledby="pricing-title">
        <div>
          <h2 id="pricing-title"><Translate id="home.pricing.title" description="Heading of the pricing summary">Free for every developer and team</Translate></h2>
          <p><Translate id="home.pricing.lead" description="Lead of the pricing summary. Pro and Connect are product names; keep them in English">You pay only for Pro (unlimited Connect machines, private skills) or a team contract with setup and support.</Translate></p>
          <Link className={base.secondary} to="/pricing"><Translate id="home.pricing.link" description="Button linking to the pricing page">See pricing</Translate></Link>
        </div>
        <dl className={h.facts}>
          <div><dt><Translate id="home.pricing.fact.app" description="Pricing fact term. Keep SpecWithCode in English">SpecWithCode app</Translate></dt><dd><Translate id="home.pricing.fact.app.value" description="Price of the SpecWithCode app">Free</Translate></dd></div>
          <div><dt><Translate id="home.pricing.fact.cli" description="Pricing fact term. Keep SpecWeave CLI in English">SpecWeave CLI</Translate></dt><dd><Translate id="home.pricing.fact.cli.value" description="Price and license of the CLI; keep MIT">Free, MIT licensed</Translate></dd></div>
          <div><dt><Translate id="home.pricing.fact.seat" description="Pricing fact term: per-seat fee">Seat fee</Translate></dt><dd><Translate id="home.pricing.fact.seat.value" description="Value for Seat fee: there is none">None</Translate></dd></div>
          <div><dt><Translate id="home.pricing.fact.connect" description="Pricing fact term. Connect is a product name; keep it in English">Connect machines</Translate></dt><dd><Translate id="home.pricing.fact.connect.value" description="How many Connect machines each plan includes. Pro is a plan name; keep it in English">3 free, 10 for the first 300 founders, unlimited on Pro</Translate></dd></div>
          <div><dt><Translate id="home.pricing.fact.markup" description="Pricing fact term">Markup on your AI subscriptions</Translate></dt><dd><Translate id="home.pricing.fact.markup.value" description="Value for Markup on your AI subscriptions: there is none">None</Translate></dd></div>
        </dl>
      </section>

      <section className={clsx(h.section, h.lazy)} id="built-with" aria-labelledby="built-with-title">
        <div className={h.head}>
          <h2 id="built-with-title"><Translate id="home.builtWith.title" description="Heading of the list of products built with SpecWeave. Keep SpecWeave in English">Built with SpecWeave</Translate></h2>
        </div>
        <ul className={h.built}>
          {BUILT.map((b) => <li key={b.name} className={h.reveal}>{b.href.startsWith('/') ? <Link className={base.textLink} to={b.href}>{b.name}</Link> : <a className={base.textLink} href={b.href}>{b.name}</a>}<span>{b.body}</span></li>)}
        </ul>
      </section>

      <section className={clsx(base.finalCta, h.final)}>
        <h2><Translate id="home.final.title" description="Final call-to-action heading">Bring every agent, keep your place</Translate></h2>
        <div className={h.finalActions}>
          <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}>{downloadText}</a>
          <Link className={base.textLink} to="/docs/getting-started"><Translate id="home.final.cliLink" description="Link to the CLI getting started guide">Get started with the CLI</Translate></Link>
        </div>
      </section>
    </main>
  </Layout>;
}

