import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import ContinuityBoard from '../components/sections/ContinuityBoard';
import { LayeredHeroArt, LeanStats, ScrollStory, ThreadMap } from '../components/landing/Sections';
import { art, tools } from '../components/landing/content';
import styles from '../components/landing/landing.module.css';
import base from './continuity.module.css';

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copyCommand() {
    try { await navigator.clipboard.writeText('npm install -g specweave'); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <Layout title="Hand off AI coding work between Claude Code and Codex" description="Out of Claude Code or Codex usage mid-task? SpecWeave keeps your spec, tasks and edits in git, so another agent or account picks up where you stopped.">
    <main className={clsx(base.page, styles.landing)}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <Link to="/docs/guides/specweave-3" className={styles.releasePill}><b>3.0</b> One-file specs, handoff and pickup <span aria-hidden="true">↗</span></Link>
          <h1>Switch tools.<br /><em>Keep your place.</em></h1>
          <p className={styles.lead}>Software engineering discipline for AI coding, not vibe coding. SpecWeave keeps the spec, the tasks and the proof of done in your repo, so when one tool or subscription runs out, the next one picks up exactly where it stopped.</p>
          <div className={base.actions}>
            <Link className={base.primary} to="/docs/getting-started">Start with your project <span aria-hidden="true">↗</span></Link>
            <a className={base.textLink} href="#how">See how it works ↓</a>
          </div>
          <div className={base.install}><code>npm install -g specweave</code><button onClick={copyCommand} aria-label="Copy installation command">{copied ? 'Copied' : 'Copy'}</button></div>
          <span className={base.copyStatus} role="status">{copyError ? 'Copy unavailable. Select the command above.' : copied ? 'Installation command copied.' : 'MIT licensed. Local first. No account needed.'}</span>
        </div>
        <LayeredHeroArt />
      </section>

      <div className={styles.tools} aria-label="Works with">
        <span>Works with</span>
        <div className={styles.toolRail}><div>{[...tools, ...tools].map((t, i) => <strong key={i} aria-hidden={i >= tools.length}>{t}</strong>)}</div></div>
        <Link to="/docs/guides/cross-tool-handoff">AGENTS.md, skills and git ↗</Link>
      </div>

      <ScrollStory />

      <section className={clsx(base.section, styles.threads)} id="threads" aria-labelledby="threads-title">
        <div className={styles.split}>
          <div>
            <span className={styles.eyebrow}>02 / Parallel work</span>
            <h2 id="threads-title">One thread.<br /><em>One increment.</em></h2>
            <p className={styles.body}>A Claude Code Projects thread works on one branch and opens one pull request. So does an increment. SpecWeave maps the two, and keeps everything that matters in git, where every tool and every account can read it.</p>
            <Link className={base.textLink} to="/docs/guides/claude-code-projects">How threads map to increments ↗</Link>
          </div>
          <ThreadMap />
        </div>
        {art.threads && <img className={styles.wideArt} src={art.threads} alt="" loading="lazy" />}
      </section>

      <section className={clsx(base.section, styles.lean)} aria-labelledby="lean-title">
        <div className={styles.leanHead}>
          <div>
            <span className={styles.eyebrow}>03 / Leaner by default</span>
            <h2 id="lean-title">Less to read.<br /><em>Every session.</em></h2>
          </div>
          <p className={styles.body}>Every token an agent spends rereading bookkeeping is a token it does not spend on your code. 3.0 removes the duplicates and hands the agent only what the current task needs.</p>
        </div>
        <LeanStats />
        {art.lean && <img className={styles.wideArt} src={art.lean} alt="" loading="lazy" />}
      </section>

      <section className={base.section} id="work">
        <div className={base.sectionHeading}>
          <div><span className={styles.eyebrow}>04 / See the work</span><h2>What matters,<br /><em>at a glance.</em></h2></div>
          <p>See what is moving, what is waiting and what is actually verified. Open an intent to find its spec and the work behind it.</p>
        </div>
        <ContinuityBoard />
        <p className={base.caption}>Example data above. Your dashboard reads your project. Open it with <code>specweave dashboard</code>.</p>
      </section>

      <section className={clsx(base.section, base.connectionSection)}>
        <div>
          <span className={styles.eyebrow}>05 / Fit your team</span>
          <h2>Your tracker.<br /><em>On your terms.</em></h2>
          <p>Keep GitHub, Jira or Azure DevOps where your team plans. In 3.0, changing an increment's status no longer creates or closes issues. SpecWeave touches a tracker only when you push to it.</p>
          <Link className={base.textLink} to="/integrations">Explore optional integrations ↗</Link>
        </div>
        <div className={base.connectionList}>{[['GitHub', 'Issues and pull requests'], ['Jira', 'Opt-in, pushed when you choose'], ['Azure DevOps', 'Opt-in, pushed when you choose']].map(([name, desc]) => <Link to="/integrations" key={name}><strong>{name}</strong><span>{desc}</span><b aria-hidden="true">↗</b></Link>)}</div>
      </section>

      <section className={clsx(base.section, base.showcaseSection)} id="built-with" aria-labelledby="built-with-title">
        <div className={base.showcaseHeading}><div><span className={styles.eyebrow}>06 / In practice</span><h2 id="built-with-title">Built with SpecWeave.</h2></div><p>Products where we use the workflow to plan changes, track delivery and carry work between sessions and subscriptions.</p></div>
        <div className={base.showcaseProjects}>
          <a href="https://easychamp.com"><span className={base.showcaseCategory}>Sports platforms</span><h3>EasyChamp <span aria-hidden="true">↗</span></h3><p>League and club tools, built across Claude Code threads, two subscriptions and Codex.</p></a>
          <a href="https://jobweave.ai"><span className={base.showcaseCategory}>Career tools</span><h3>JobWeave <span aria-hidden="true">↗</span></h3><p>Job search, tailored resumes, recruiter context and interview preparation.</p></a>
          <a href="https://verified-skill.com"><span className={base.showcaseCategory}>Developer tools</span><h3>Verified Skills <span aria-hidden="true">↗</span></h3><p>Skill discovery, source inspection and local evaluations with Skill Studio.</p></a>
        </div>
        <Link className={base.textLink} to="/docs/overview/dogfooding">More projects and how we use SpecWeave ↗</Link>
      </section>

      <section className={base.skillsBanner}><div><span className={styles.eyebrow}>The companion project</span><h3>Better skills. Less baggage.</h3><p>Find focused expertise, inspect its source and evaluate whether it helps your workflow.</p></div><a className={base.secondary} href="https://verified-skill.com">Explore Verified Skills ↗</a></section>

      <section className={base.finalCta}>
        <span className={styles.eyebrow}>Your next session can start here</span>
        <h2>Keep building.<br /><em>Whatever you build with.</em></h2>
        <Link className={base.primary} to="/docs/getting-started">Get started ↗</Link>
        <Link className={base.textLink} to="/docs/guides/specweave-3">What's new in 3.0</Link>
      </section>
    </main>
  </Layout>;
}
