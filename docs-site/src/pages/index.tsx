import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { tools } from '../data/tools';
import base from './continuity.module.css';
import h from '../components/landing/home.module.css';
import HomeHandoff from '../components/landing/HomeHandoff';
import ExplainerVideo from '../components/ecosystem/ExplainerVideo';
import { SPECWITHCODE_RELEASE as release } from '../data/specwithcodeRelease';

const INSTALL = 'npm install -g specweave';

/** Excerpt of real `specweave pickup` output from a second clone running as Codex (full output on /product). */
const PICKUP = `SpecWeave pickup · you are codex@laptop
Increment 0001-resumable-checkout "Resumable checkout" (active) · tasks 1/2 done
Next: T-02 Restore the draft on return
  AC-01: Returning within 24 hours restores the cart and shipping choice
  AC-02: A paid order is never restored
  Files: src/restore.js | Test: npm test`;

const LOCAL = [
  'Runs where your code, skills and logins already are',
  'Pair a Mac mini, a Linux box or a laptop over SSH or Tailscale',
  'Keeps working while your laptop sleeps, on the machine running it',
  'Your providers’ own sign-in and approvals, no account with us',
];

const BUILT = [
  { name: 'EasyChamp', href: 'https://easychamp.com', body: 'League and club tools, built across Claude Code threads, two subscriptions and Codex.' },
  { name: 'JobWeave', href: 'https://jobweave.ai', body: 'Job search, tailored resumes and interview preparation.' },
  { name: 'Verified Skill', href: 'https://verified-skill.com', body: 'Skill discovery, source inspection and local evaluations.' },
];

const downloadLabel = `Download SpecWithCode ${release.version} for macOS, Apple silicon, ${release.size}`;

/** Lucide shield-check, 1.5 stroke. */
function ShieldIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>;
}

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copyCommand() {
    try { await navigator.clipboard.writeText(INSTALL); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <Layout title="Switch AI tools without losing your place" description="SpecWithCode runs Claude Code, Codex, Cursor and more on your own machines and subscriptions, and hands work to the next agent when a usage limit hits. Free for every developer and team. The open-source SpecWeave CLI keeps the spec, evidence and handoff in git.">
    <main className={clsx(base.page, h.home)}>
      <section className={h.hero}>
        <div className={h.heroText}>
          <h1>Switch AI tools without losing your place.</h1>
          <p className={h.lead}>SpecWithCode runs Claude Code, Codex and Cursor on your own machines and subscriptions. SpecWeave keeps the plan and every finished task in git, so when one agent hits its limit, another picks up the same task.</p>
          <div className={h.actions}>
            <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}>Download for Mac</a>
            <Link className={base.secondary} to="/product">Get the CLI</Link>
          </div>
          <p className={h.requirements}>Free. Apple silicon, macOS 13 or later.</p>
          <div className={clsx('wv-cmd', h.cmd)}>
            <code>{INSTALL}</code>
            <button type="button" className="wv-cmd__copy" onClick={copyCommand} aria-label="Copy installation command">{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <span className={base.copyStatus} role="status">{copyError ? 'Copy unavailable. Select the command above.' : copied ? 'Installation command copied.' : 'The open-source CLI: MIT, local first, no account.'}</span>
        </div>
        <figure className={clsx('wv-window', h.heroShot)}>
          <div className="wv-window__bar"><span>SpecWithCode</span><span>Coordinator</span></div>
          <img src="/img/studio/flow-coord-report-20261015.webp" width={822} height={875} fetchPriority="high" alt="SpecWithCode coordinator reporting back: the README worker ran python3 tip.py 50 18 itself, it printed Tip: $9.00 and Total: $59.00 and exited 0, and only README.md changed" />
          <figcaption>The coordinator reports what a worker ran and what changed. SpecWithCode 1.0.21, 15 October 2026.</figcaption>
        </figure>
      </section>

      <div className={h.tools}>
        <p><span className={h.toolsLabel}>Works with</span>{tools.map((t) => <span key={t}>{t}</span>)}</p>
      </div>

      <section className={h.section} id="watch" aria-labelledby="watch-title">
        <div className={h.head}>
          <h2 id="watch-title">Your machines, your subscriptions, one place to run them</h2>
          <p>A narrated tour in under 3 minutes, with captions.</p>
        </div>
        <div className={h.video}><ExplainerVideo /></div>
      </section>

      <section className={h.section} id="how" aria-labelledby="how-title">
        <div className={h.head}>
          <h2 id="how-title" className={h.howTitle}>Claude runs out, Codex finishes the job</h2>
          <p>Three layers stay in your repository: the plan, the record of what happened and the agents doing the work. When one agent stops, the next reads the same files.</p>
        </div>
        <HomeHandoff />
        <p className={h.note}>Example increment. The file formats and commands are the real ones; see a real pickup in <Link className={base.textLink} to="/product">How SpecWeave works</Link>.</p>
        <p className={h.watchLink}><a className={base.textLink} href="/code/#watch">Watch the 61-second recording of a Claude thread continuing on Codex</a></p>
      </section>

      <section className={h.section} id="stack" aria-labelledby="stack-title">
        <div className={h.head}>
          <h2 id="stack-title">Where you work, what survives the session, and the skills you add</h2>
        </div>
        <div className={h.stack}>
          <article>
            <h3>SpecWithCode</h3>
            <p className={h.kind}>Free app for macOS</p>
            <p>A coordinator and workers on any provider, on machines you own.</p>
            <figure className={clsx('wv-window', h.smallShot)}>
              <div className="wv-window__bar"><span>SpecWithCode</span><span>Coordinator</span></div>
              <img src="/img/studio/flow-dispatch-20261015.webp" width={1064} height={680} loading="eager" decoding="async" alt="SpecWithCode coordinator starting two workers: Write tip.py CLI, with approval requested, and README usage for tip.py, working" />
            </figure>
            <Link className={base.textLink} to="/code/">See SpecWithCode</Link>
          </article>
          <article>
            <h3>SpecWeave CLI</h3>
            <p className={h.kind}>Open source, on npm</p>
            <p>Spec, tasks, evidence and handoff in git. Optional GitHub, Jira and Azure DevOps sync.</p>
            <pre className={clsx('wv-code', h.pickup)} aria-label="Excerpt of real specweave pickup output">{PICKUP}</pre>
            <p className={h.caption}>Real <code>specweave pickup</code> output, from a second clone running as Codex.</p>
            <Link className={base.textLink} to="/docs/getting-started">Start with the CLI</Link>
          </article>
          <article>
            <h3>Verified Skill</h3>
            <p className={h.kind}>Free to browse</p>
            <p>Inspect, evaluate and install tested skills into 50+ agents.</p>
            <div className={h.evidence}>
              <p className={h.caption}>What an example skill page shows</p>
              <ul className="wv-evidence">
                <li><span className="wv-evidence__name">Source verified</span><span className="wv-chip wv-chip--pass">Passed</span><span className="wv-evidence__detail">The repository the skill comes from.</span></li>
                <li><span className="wv-evidence__name">Security scan passed</span><span className="wv-chip wv-chip--pass">Passed</span><span className="wv-evidence__detail">Checked before you install it.</span></li>
                <li><span className="wv-evidence__name">Evaluation</span><span className="wv-chip">Shown</span><span className="wv-evidence__detail">Whether the skill helped on a real task.</span></li>
              </ul>
            </div>
            <a className={base.textLink} href="https://verified-skill.com">Explore skills</a>
          </article>
        </div>
      </section>

      <section className={clsx(h.section, h.local)} id="local" aria-labelledby="local-title">
        <div>
          <h2 id="local-title">Your machines, not a cloud container</h2>
          <p className={h.localLead}>Work runs on your MacBook, a Mac mini or a Linux box you pair privately.</p>
          <Link className={base.textLink} to="/docs/overview/studio/">Read the SpecWithCode overview</Link>
        </div>
        <div className={h.machines}>
          <ul className={h.list}>{LOCAL.map((l) => <li key={l}>{l}</li>)}</ul>
          <div className={clsx('wv-note', h.boundary)}>
            <ShieldIcon />
            <p><strong>Provider boundary.</strong> Each agent uses your provider’s own sign-in and approvals. There is no account with us.</p>
          </div>
        </div>
      </section>

      <section className={clsx(h.section, h.pricing)} aria-labelledby="pricing-title">
        <div>
          <h2 id="pricing-title">Free for every developer and team</h2>
          <p>Companies pay only for hosted skills, rollout and support.</p>
          <Link className={base.secondary} to="/pricing">See pricing</Link>
        </div>
        <dl className={h.facts}>
          <div><dt>SpecWithCode app</dt><dd>Free</dd></div>
          <div><dt>SpecWeave CLI</dt><dd>Free, MIT licensed</dd></div>
          <div><dt>Seats and usage cap</dt><dd>None</dd></div>
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
        <h2>Bring every agent, keep your machines</h2>
        <div className={h.finalActions}>
          <a className={base.primary} href={release.dmgUrl} aria-label={downloadLabel}>Download for Mac</a>
          <Link className={base.textLink} to="/docs/getting-started">Get started with the CLI</Link>
        </div>
      </section>
    </main>
  </Layout>;
}
