import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { ScrollStory, ThreadMap } from '../components/landing/Sections';
import { art, tools } from '../components/landing/content';
import styles from '../components/landing/landing.module.css';
import base from './continuity.module.css';
import { ProductMap } from '../components/ecosystem/Architecture';
import StudioProjectMock from '../components/ecosystem/StudioProjectMock';
import StudioTutorialVideo from '../components/ecosystem/StudioTutorialVideo';
import { CloudCompare, ProjectFeatures } from '../components/ecosystem/StudioSections';
import studio from '../components/ecosystem/studio.module.css';

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copyCommand() {
    try { await navigator.clipboard.writeText('npm install -g specweave'); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <Layout title="Run every coding agent on your own machines, and hand off between them" description="SpecWeave Studio runs Claude Code, Codex, Grok and other coding agents as one project on machines you own. The open-source SpecWeave CLI keeps the spec, evidence and handoff in git.">
    <main className={clsx(base.page, styles.landing)}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <Link to="/studio" className={styles.releasePill}><b>Studio</b> Projects for every coding agent, on your machines <span aria-hidden="true">↗</span></Link>
          <h1>Every coding agent.<br /><em>One project.</em></h1>
          <p className={styles.lead}>SpecWeave Studio gives a goal one coordinator and as many workers as it needs, each on the provider and model you pick, running on machines you own. The SpecWeave record in git means any agent can pick up where another stopped.</p>
          <div className={base.actions}>
            <Link className={base.primary} to="/studio">See SpecWeave Studio <span aria-hidden="true">↗</span></Link>
            <Link className={base.textLink} to="/docs/getting-started">Start free with the CLI</Link>
          </div>
          <div className={base.install}><code>npm install -g specweave</code><button onClick={copyCommand} aria-label="Copy installation command">{copied ? 'Copied' : 'Copy'}</button></div>
          <span className={base.copyStatus} role="status">{copyError ? 'Copy unavailable. Select the command above.' : copied ? 'Installation command copied.' : 'The open-source CLI Studio builds on. MIT, local first, no account.'}</span>
        </div>
        <div className={styles.heroMock}><StudioProjectMock /></div>
      </section>

      <div className={styles.tools} aria-label="Works with">
        <span>Works with</span>
        <div className={styles.toolRail}><div>{[...tools, ...tools].map((t, i) => <strong key={i} aria-hidden={i >= tools.length}>{t}</strong>)}</div></div>
        <Link to="/studio">One project, any provider ↗</Link>
      </div>

      <section className={base.section} id="projects" aria-labelledby="projects-title">
        <div className={base.sectionHeading}><div><span className={styles.eyebrow}>01 / Studio projects</span><h2 id="projects-title">One goal.<br /><em>Many agents.</em></h2></div><p>A project is a long-running conversation with a coordinator. Give it a goal, add tasks as they come up, and step into any worker to steer it. <span className={studio.badge}>Projects: testing for the next pilot build</span></p></div>
        <ProjectFeatures />
        <StudioTutorialVideo />
      </section>

      <section className={base.section} id="local" aria-labelledby="local-title">
        <div className={base.sectionHeading}><div><span className={styles.eyebrow}>02 / Local first</span><h2 id="local-title">Your machines.<br /><em>Not a cloud container.</em></h2></div><p>Cloud project agents are simple to start and live with one vendor. Studio keeps the work where your code, skills and accounts already are, and lets you mix vendors inside one project.</p></div>
        <CloudCompare />
        <Link className={base.textLink} to="/docs/overview/studio/">Read the Studio overview ↗</Link>
      </section>

      <ScrollStory />

      <section className={base.section} id="ecosystem" aria-labelledby="ecosystem-title">
        <div className={base.sectionHeading}><div><span className={styles.eyebrow}>04 / The stack</span><h2 id="ecosystem-title">One workspace.<br /><em>One record.</em></h2></div><p>Studio is where you work. SpecWeave keeps what survives the session in git. vskill brings tested expertise to every agent.</p></div>
        <ProductMap />
        <Link className={base.textLink} to="/docs/overview/studio-architecture/">See the architecture, including how machines connect ↗</Link>
      </section>

      <section className={clsx(base.section, styles.threads)} id="threads" aria-labelledby="threads-title">
        <div className={styles.split}>
          <div>
            <span className={styles.eyebrow}>05 / Parallel work</span>
            <h2 id="threads-title">One thread.<br /><em>One increment.</em></h2>
            <p className={styles.body}>A Studio worker or a Claude Code Projects thread works on one branch and opens one pull request. So does an increment. SpecWeave maps the two, and keeps everything that matters in git, where every tool and every account can read it.</p>
            <Link className={base.textLink} to="/docs/guides/claude-code-projects">How threads map to increments ↗</Link>
          </div>
          <ThreadMap />
        </div>
        {art.threads && <img className={styles.wideArt} src={art.threads} alt="" loading="lazy" />}
      </section>

      <section className={clsx(base.section, base.connectionSection)}>
        <div>
          <span className={styles.eyebrow}>06 / Fit your team</span>
          <h2>Your tracker.<br /><em>On your terms.</em></h2>
          <p>Keep GitHub, Jira or Azure DevOps where your team plans. In 3.0, changing an increment's status no longer creates or closes issues. SpecWeave touches a tracker only when you push to it.</p>
          <Link className={base.textLink} to="/integrations">Explore optional integrations ↗</Link>
        </div>
        <div className={base.connectionList}>{[['GitHub', 'Issues and pull requests'], ['Jira', 'Opt-in, pushed when you choose'], ['Azure DevOps', 'Opt-in, pushed when you choose']].map(([name, desc]) => <Link to="/integrations" key={name}><strong>{name}</strong><span>{desc}</span><b aria-hidden="true">↗</b></Link>)}</div>
      </section>

      <section className={clsx(base.section, base.showcaseSection)} id="built-with" aria-labelledby="built-with-title">
        <div className={base.showcaseHeading}><div><span className={styles.eyebrow}>07 / In practice</span><h2 id="built-with-title">Built with SpecWeave.</h2></div><p>Products where we use the workflow to plan changes, track delivery and carry work between sessions and subscriptions.</p></div>
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
        <h2>Run every agent.<br /><em>Keep one record.</em></h2>
        <Link className={base.primary} to="/studio">Discuss a Studio pilot ↗</Link>
        <Link className={base.textLink} to="/docs/getting-started">Get started with the CLI</Link>
      </section>
    </main>
  </Layout>;
}
