import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

// SVG Icons — kept minimal
const Icons = {
  agents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  memory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
      <path d="M12 11v6"/>
      <path d="M9 22h6"/>
      <path d="M12 17v5"/>
      <circle cx="12" cy="6" r="1"/>
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  qualityGates: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  livingDocs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <path d="M8 7h8M8 11h8M8 15h4"/>
    </svg>
  ),
  sync: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6"/>
      <path d="M2.5 22v-6h6"/>
      <path d="M2 11.5a10 10 0 0 1 18.8-4.3"/>
      <path d="M22 12.5a10 10 0 0 1-18.8 4.2"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  ),
  jira: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"/>
    </svg>
  ),
  azure: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707zm24-4.45v14.651l-5.753 4.9-9.303-3.057v3.056l-5.978-7.416 15.057 1.798V5.415z"/>
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  ),
};

/* ===================================================================
   Section 1: VideoHero — cinematic dark hero with video centerpiece
   =================================================================== */
function VideoHero(): ReactNode {
  return (
    <section className={styles.videoHero}>
      <div className={styles.videoHeroGlow} />
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroPills}>
            <span className={styles.heroPill}>Open Source</span>
            <span className={styles.heroPill}>Claude Code Native</span>
          </div>

          <Heading as="h1" className={styles.heroTitle}>
            Ship Features<br />
            <span className={styles.heroGradient}>While You Sleep</span>
          </Heading>

          <p className={styles.heroSubtitle}>
            The spec-driven framework for AI coding agents. Persistent memory, autonomous execution, quality gates, and living documentation — all from your terminal.
          </p>

          <div className={styles.heroCtas}>
            <Link className={styles.btnPrimary} to="/docs/intro">
              Get Started
            </Link>
            <a
              className={styles.btnSecondary}
              href="#hero-video"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('hero-video')?.scrollIntoView({behavior: 'smooth'});
              }}
            >
              Watch Demo →
            </a>
          </div>
        </div>

        <div id="hero-video" className={styles.videoWrapper}>
          <video
            className={styles.heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/video/ship-while-you-sleep-poster.jpg"
          >
            <source src="/video/ship-while-you-sleep.mp4" type="video/mp4" />
          </video>
        </div>

        <p className={styles.videoCaption}>
          Full video walkthrough coming soon on{' '}
          <a href="https://youtube.com/@antonabyzov" target="_blank" rel="noopener noreferrer">
            YouTube
          </a>
        </p>

        <div className={styles.heroBadges}>
          <a href="https://www.npmjs.com/package/specweave" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/npm/v/specweave?color=7c3aed&style=for-the-badge" alt="NPM Version" />
          </a>
          <a href="https://www.npmjs.com/package/specweave" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/npm/dm/specweave?color=22c55e&style=for-the-badge" alt="Downloads" />
          </a>
          <a href="https://discord.gg/UYg4BGJ65V" target="_blank" rel="noopener noreferrer">
            <img src="https://img.shields.io/badge/Discord-Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   Section 2: Workflow — three-command horizontal stepper
   =================================================================== */
function WorkflowSection(): ReactNode {
  const steps = [
    {
      num: '01',
      cmd: '/sw:increment',
      title: 'Define',
      desc: 'Describe the feature in plain English. AI generates spec, plan, and tasks.',
    },
    {
      num: '02',
      cmd: '/sw:auto',
      title: 'Execute',
      desc: 'Walk away. Autonomous implementation with tests, docs, and quality gates.',
    },
    {
      num: '03',
      cmd: '/sw:done',
      title: 'Ship',
      desc: 'Validate, sync to GitHub/JIRA, and deploy with confidence.',
    },
  ];

  return (
    <section className={styles.workflowSection}>
      <div className="container">
        <span className={styles.sectionLabel}>HOW IT WORKS</span>
        <Heading as="h2" className={styles.sectionTitle}>
          Three Commands. Zero Babysitting.
        </Heading>

        <div className={styles.workflowTimeline}>
          {steps.map((step, i) => (
            <div key={i} className={styles.workflowStep}>
              <div className={styles.stepNumber}>{step.num}</div>
              <code className={styles.stepCmd}>{step.cmd}</code>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   Section 3: Capabilities — 6-card grid of key features
   =================================================================== */
function CapabilitiesSection(): ReactNode {
  const capabilities = [
    {
      icon: Icons.agents,
      title: 'Multi-Agent Teams',
      desc: 'PM, Architect, QA, Security, and DevOps agents collaborating on your features. Powered by Claude Opus 4.6.',
    },
    {
      icon: Icons.memory,
      title: 'Persistent Memory',
      desc: 'AI learns from corrections and retains full context across sessions. Fix once — remembered permanently.',
    },
    {
      icon: Icons.bolt,
      title: 'Autonomous Execution',
      desc: 'Run /sw:auto and walk away. Implements, tests, fixes, and documents — for hours without intervention.',
    },
    {
      icon: Icons.qualityGates,
      title: 'Quality Gates',
      desc: 'Code Grill reviews every change. Tests passing, docs current, acceptance criteria satisfied before release.',
    },
    {
      icon: Icons.livingDocs,
      title: 'Living Documentation',
      desc: 'Specs, ADRs, and runbooks sync automatically after every task. Documentation that never drifts from code.',
    },
    {
      icon: Icons.sync,
      title: 'Bidirectional Sync',
      desc: 'GitHub Issues, JIRA, Azure DevOps — real-time two-way synchronization across your entire toolchain.',
    },
  ];

  return (
    <section className={styles.capabilitiesSection} id="capabilities">
      <div className="container">
        <span className={styles.sectionLabel}>CAPABILITIES</span>
        <Heading as="h2" className={styles.sectionTitle}>
          Everything You Need to Ship at Scale
        </Heading>
        <p className={styles.sectionSubtitle}>
          Purpose-built for teams shipping production software with AI coding agents.
        </p>

        <div className={styles.capabilitiesGrid}>
          {capabilities.map((cap, i) => (
            <div key={i} className={styles.capabilityCard}>
              <div className={styles.capabilityIcon}>{cap.icon}</div>
              <h3>{cap.title}</h3>
              <p>{cap.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   Section 4: Trust — stats, verified skills callout, integrations
   =================================================================== */
function TrustSection(): ReactNode {
  return (
    <section className={styles.trustSection}>
      <div className="container">
        <span className={styles.sectionLabelLight}>TRUSTED & PROVEN</span>
        <Heading as="h2" className={styles.sectionTitleLight}>
          Built With Itself. Production Ready.
        </Heading>
        <p className={styles.sectionSubtitleLight}>
          SpecWeave is entirely developed using SpecWeave — every feature, every release, every page you're reading.
        </p>

        <div className={styles.trustStats}>
          <Link to="https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments" className={styles.trustStat}>
            <div className={styles.trustStatValue}>Self-Built</div>
            <div className={styles.trustStatLabel}>Dogfooded Daily</div>
          </Link>
          <div className={styles.trustStat}>
            <div className={styles.trustStatValue}>Zero</div>
            <div className={styles.trustStatLabel}>Context Loss</div>
          </div>
          <div className={styles.trustStat}>
            <div className={styles.trustStatValue}>Hours</div>
            <div className={styles.trustStatLabel}>Autonomous Work</div>
          </div>
        </div>

        <div className={styles.verifiedCallout}>
          <div className={styles.verifiedIcon}>{Icons.shield}</div>
          <div className={styles.verifiedContent}>
            <h3>Verified Skills Security</h3>
            <p>
              Three-tier trust ladder: Scanned, Verified, Certified. Every skill is security-audited before installation.{' '}
              <a href="https://verified-skill.com" target="_blank" rel="noopener noreferrer">
                verified-skill.com
              </a>
            </p>
          </div>
          <Link className={styles.verifiedLink} to="/docs/skills/verified/verified-skills">
            Learn More →
          </Link>
        </div>

        <div className={styles.integrationLogos}>
          <span className={styles.integrationLabel}>Works with</span>
          <div className={styles.logoRow}>
            <div className={styles.logoItem}>
              <div className={styles.logoIcon}>{Icons.github}</div>
              <span>GitHub</span>
            </div>
            <div className={styles.logoItem}>
              <div className={styles.logoIcon}>{Icons.jira}</div>
              <span>JIRA</span>
            </div>
            <div className={styles.logoItem}>
              <div className={styles.logoIcon}>{Icons.azure}</div>
              <span>Azure DevOps</span>
            </div>
            <div className={styles.logoItem}>
              <div className={styles.logoIcon}>{Icons.ai}</div>
              <span>Claude, Cursor, Copilot</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===================================================================
   Section 5: CTA — final call-to-action
   =================================================================== */
function CTASection(): ReactNode {
  return (
    <section className={styles.ctaSection}>
      <div className="container">
        <Heading as="h2" className={styles.ctaTitle}>
          Stop Losing Context. Start Shipping.
        </Heading>
        <p className={styles.ctaSubtitle}>
          Two commands. Permanent memory. Autonomous execution for hours. Your AI coding assistant finally remembers everything.
        </p>

        <div className={styles.ctaCode}>
          <code>
            npm install -g specweave && specweave init .
          </code>
        </div>

        <div className={styles.ctaButtons}>
          <Link className={styles.btnPrimaryLarge} to="/docs/guides/getting-started/quickstart">
            Get Started →
          </Link>
          <Link className={styles.btnGhost} to="https://github.com/anton-abyzov/specweave">
            View on GitHub
          </Link>
        </div>

        <div className={styles.ctaLinks}>
          <Link to="https://discord.gg/UYg4BGJ65V">Community</Link>
          <span>·</span>
          <Link to="https://youtube.com/@antonabyzov">Tutorials</Link>
          <span>·</span>
          <Link to="/docs/commands/overview">Documentation</Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Ship Features While You Sleep"
      description="The spec-driven framework for AI coding agents. Persistent memory, autonomous execution, quality gates, and living documentation. First-class Claude Code support.">
      <VideoHero />
      <main>
        <WorkflowSection />
        <CapabilitiesSection />
        <TrustSection />
        <CTASection />
      </main>
    </Layout>
  );
}
