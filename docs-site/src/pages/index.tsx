import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { tools } from '../components/landing/content';
import styles from '../components/landing/landing.module.css';
import base from './continuity.module.css';
import h from '../components/landing/home.module.css';
import StudioProjectMock from '../components/ecosystem/StudioProjectMock';
import StudioTutorialVideo from '../components/ecosystem/StudioTutorialVideo';
import ExplainerVideo from '../components/ecosystem/ExplainerVideo';
import { SPECWITHCODE_RELEASE as release } from '../data/specwithcodeRelease';

const STEPS = [
  { n: '1', title: 'Say what you want', body: 'The coordinator turns it into a spec with acceptance criteria and tasks, saved in your repo.' },
  { n: '2', title: 'Agents work in parallel', body: 'Each task goes to the agent and model that fits it, on any machine you own.' },
  { n: '3', title: 'A limit never stops the work', body: 'When one agent runs low, the next one picks up from the record in git.' },
];

const STACK = [
  { img: '/img/home/leanback.webp', tag: 'Free app · macOS', name: 'SpecWithCode', job: 'The workspace', body: 'A coordinator and workers on any provider, on machines you own.', to: '/code/', cta: 'See SpecWithCode' },
  { img: '/img/home/weave.webp', tag: 'Open source · npm', name: 'SpecWeave CLI', job: 'The record', body: 'Spec, tasks, evidence and handoff in git. Optional GitHub, Jira and Azure DevOps sync.', to: '/docs/getting-started', cta: 'Start with the CLI' },
  { img: '/img/home/desk.webp', tag: 'Free to browse', name: 'Verified Skills', job: 'The expertise', body: 'Inspect, evaluate and install tested skills into 50+ agents.', href: 'https://verified-skill.com', cta: 'Explore skills' },
];

const LOCAL = [
  'Runs where your code, skills and logins already are',
  'Pair a Mac mini, a Linux box or a laptop over SSH or Tailscale',
  'Keeps working while your laptop sleeps, on the machine running it',
  'Your providers’ own sign-in and approvals, no account with us',
];

function Flow() {
  return <div className={h.flow} role="img" aria-label="You give the coordinator a goal. SpecWithCode runs Claude Code, Codex and Cursor workers on your machines. When Claude Code nears its limit, Codex picks up its task. SpecWeave keeps the spec, ledger and handoff in your git repo.">
    <div className={clsx(h.node, h.nodeYou)} aria-hidden="true">
      <span className={h.nodeLabel}>You</span>
      <p className={h.bubble}>Make checkout resumable. Never restore a paid order.</p>
    </div>
    <span className={h.arrow} aria-hidden="true" />
    <div className={clsx(h.node, h.nodeApp)} aria-hidden="true">
      <span className={h.nodeLabel}>SpecWithCode <i>on your machines</i></span>
      <div className={h.coord}><b>Coordinator</b><span>plans 3 tasks</span></div>
      <ul className={h.workers}>
        <li><b>Claude Code</b><span>Mac Studio</span><em className={h.warn}>92% of limit</em></li>
        <li className={h.handoff}><span>handoff</span></li>
        <li><b>Codex</b><span>Mac mini</span><em className={h.ok}>picked up T-01</em></li>
        <li><b>Cursor</b><span>laptop</span><em>running T-03</em></li>
      </ul>
    </div>
    <span className={h.arrow} aria-hidden="true" />
    <div className={clsx(h.node, h.nodeGit)} aria-hidden="true">
      <span className={h.nodeLabel}>SpecWeave <i>in your git repo</i></span>
      <ul className={h.files}>
        <li><code>spec.md</code><span>what done means</span></li>
        <li><code>ledger.jsonl</code><span>who did what, with evidence</span></li>
        <li><code>handoff</code><span>where to pick up</span></li>
      </ul>
    </div>
  </div>;
}

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('video[data-ambient]').forEach((v) => (v as HTMLVideoElement).pause());
  }, []);
  async function copyCommand() {
    try { await navigator.clipboard.writeText('npm install -g specweave'); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <Layout title="Every AI agent in one workspace you own" description="SpecWithCode runs Claude Code, Codex, Cursor and more as one project on your machines, and hands work to the next agent when a usage limit hits. Free for every developer and team. The open-source SpecWeave CLI keeps the spec, evidence and handoff in git.">
    <main className={clsx(base.page, styles.landing, h.home)}>
      <section className={h.hero}>
        <div className={h.heroText}>
          <Link to="/pricing" className={styles.releasePill}><b>Free</b> For every developer and team <span aria-hidden="true">→</span></Link>
          <h1>Every AI agent.<br /><em>One workspace.</em></h1>
          <p className={h.lead}>Run Claude Code, Codex, Cursor and more as one project on your own machines. When one hits its usage limit, the next one carries on.</p>
          <div className={h.actions}>
            <a className={base.primary} href={release.dmgUrl} aria-label={`Download SpecWithCode ${release.version} for macOS, Apple silicon, ${release.size}`}>Download for Mac <span aria-hidden="true">↓</span></a>
            <a className={base.textLink} href="#watch">Watch it in 3 minutes</a>
          </div>
          <div className={clsx(base.install, h.install)}><code>npm install -g specweave</code><button onClick={copyCommand} aria-label="Copy installation command">{copied ? 'Copied' : 'Copy'}</button></div>
          <span className={base.copyStatus} role="status">{copyError ? 'Copy unavailable. Select the command above.' : copied ? 'Installation command copied.' : 'Or start with the open-source CLI. MIT, local first, no account.'}</span>
        </div>
        <div className={h.heroVisual}>
          <video className={h.heroVideo} src="/img/home/weave.mp4" poster="/img/home/weave.webp" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" data-ambient />
          <div className={h.heroMock}><StudioProjectMock /></div>
        </div>
      </section>

      <div className={styles.tools} aria-label="Works with">
        <span>Works with</span>
        <div className={styles.toolRail}><div>{[...tools, ...tools].map((t, i) => <strong key={i} aria-hidden={i >= tools.length}>{t}</strong>)}</div></div>
        <Link to="/code/">One workspace, any provider ↗</Link>
      </div>

      <section className={h.section} id="watch" aria-labelledby="watch-title">
        <div className={h.head}>
          <span className={styles.eyebrow}>Watch it in 3 minutes</span>
          <h2 id="watch-title">Your machines. Your subscriptions.<br /><em>One control desk.</em></h2>
        </div>
        <ExplainerVideo />
      </section>

      <section className={h.section} id="how" aria-labelledby="how-title">
        <div className={h.head}>
          <span className={styles.eyebrow}>How it works</span>
          <h2 id="how-title">One goal. Many agents.<br /><em>Nothing lost in between.</em></h2>
        </div>
        <Flow />
        <ol className={h.steps}>
          {STEPS.map((s) => <li key={s.n}><b>{s.n}</b><h3>{s.title}</h3><p>{s.body}</p></li>)}
        </ol>
      </section>

      <section className={h.section} id="limits" aria-labelledby="limits-title">
        <div className={h.head}>
          <span className={styles.eyebrow}>See it in 61 seconds</span>
          <h2 id="limits-title">Claude runs out.<br /><em>Codex finishes the job.</em></h2>
        </div>
        <StudioTutorialVideo />
      </section>

      <section className={h.section} id="stack" aria-labelledby="stack-title">
        <div className={h.head}>
          <span className={styles.eyebrow}>The stack</span>
          <h2 id="stack-title">Where you work.<br /><em>What survives the session.</em></h2>
        </div>
        <div className={h.stack}>
          {STACK.map((s) => {
            const inner = <>
              <img src={s.img} alt="" loading="lazy" width={1600} height={900} />
              <div className={h.stackBody}>
                <span className={h.tag}>{s.tag}</span>
                <h3>{s.name} <i>{s.job}</i></h3>
                <p>{s.body}</p>
                <span className={h.more}>{s.cta} <span aria-hidden="true">{s.to ? '→' : '↗'}</span></span>
              </div>
            </>;
            return s.to
              ? <Link key={s.name} className={h.card} to={s.to}>{inner}</Link>
              : <a key={s.name} className={h.card} href={s.href}>{inner}</a>;
          })}
        </div>
      </section>

      <section className={clsx(h.section, h.local)} id="local" aria-labelledby="local-title">
        <video className={h.localMedia} src="/img/home/network.mp4" poster="/img/home/network.webp" autoPlay muted loop playsInline preload="none" aria-hidden="true" data-ambient />
        <div>
          <span className={styles.eyebrow}>Local first</span>
          <h2 id="local-title">Your machines.<br /><em>Not a cloud container.</em></h2>
          <ul className={h.checks}>{LOCAL.map((l) => <li key={l}>{l}</li>)}</ul>
          <Link className={base.textLink} to="/docs/overview/studio/">Read the SpecWithCode overview ↗</Link>
        </div>
      </section>

      <section className={h.section}>
        <div className={h.priceBand}>
          <div>
            <span className={styles.eyebrow}>Pricing</span>
            <h2>Free. <em>For every developer and team.</em></h2>
            <p>No seats, no usage cap and no markup on your AI subscriptions. Companies pay only for hosted skills, rollout and support.</p>
          </div>
          <Link className={base.secondary} to="/pricing">See pricing <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className={h.section} id="built-with" aria-labelledby="built-with-title">
        <div className={h.head}>
          <span className={styles.eyebrow}>In practice</span>
          <h2 id="built-with-title">Built with SpecWeave.</h2>
        </div>
        <div className={h.built}>
          <a href="https://easychamp.com"><b>EasyChamp <span aria-hidden="true">↗</span></b><span>League and club tools, built across Claude Code threads, two subscriptions and Codex.</span></a>
          <a href="https://jobweave.ai"><b>JobWeave <span aria-hidden="true">↗</span></b><span>Job search, tailored resumes and interview preparation.</span></a>
          <a href="https://verified-skill.com"><b>Verified Skills <span aria-hidden="true">↗</span></b><span>Skill discovery, source inspection and local evaluations.</span></a>
        </div>
      </section>

      <section className={base.finalCta}>
        <h2>Bring every agent.<br /><em>Keep your machines.</em></h2>
        <a className={base.primary} href={release.dmgUrl} aria-label={`Download SpecWithCode ${release.version} for macOS, Apple silicon, ${release.size}`}>Download for macOS (Apple silicon) <span aria-hidden="true">↓</span></a>
        <Link className={base.textLink} to="/docs/getting-started">Get started with the CLI</Link>
      </section>
    </main>
  </Layout>;
}
