import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

// Professional SVG Icons
const Icons = {
  // Problem icons
  contextLoss: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  repeat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 23l-4-4 4-4"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  docsRot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
    </svg>
  ),
  // Feature icons
  agents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  livingDocs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <path d="M8 7h8M8 11h8M8 15h4"/>
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
  sync: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6"/>
      <path d="M2.5 22v-6h6"/>
      <path d="M2 11.5a10 10 0 0 1 18.8-4.3"/>
      <path d="M22 12.5a10 10 0 0 1-18.8 4.2"/>
    </svg>
  ),
  qualityGates: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  setup: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  extensible: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 2H18a2 2 0 0 1 2 2v2.5"/>
      <path d="M20 13.5V18a2 2 0 0 1-2 2h-2.5"/>
      <path d="M8.5 22H6a2 2 0 0 1-2-2v-2.5"/>
      <path d="M4 10.5V6a2 2 0 0 1 2-2h2.5"/>
      <path d="M12 8v8"/>
      <path d="M8 12h8"/>
    </svg>
  ),
  // Integration icons
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

function HomepageHeader() {
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <div className={styles.heroTags}>
              <span className={styles.heroTagPrimary}>Enterprise Ready</span>
              <span className={styles.heroTagSecondary}>Open Source</span>
            </div>

            <Heading as="h1" className={styles.heroTitle}>
              Ship Features<br/>
              <span className={styles.heroGradient}>While You Sleep</span>
            </Heading>

            <p className={styles.heroSubtitle}>
              The spec-driven skill layer for AI coding agents. First-class support for <strong>Claude Code</strong> — compatible with any LLM-powered coding tool. Persistent memory, autonomous execution, quality gates, and living documentation.
            </p>

            <div className={styles.heroButtons}>
              <Link className={styles.btnPrimary} to="/docs/intro">
                Start Building
              </Link>
              <Link className={styles.btnSecondary} to="https://youtube.com/@antonabyzov">
                See It In Action →
              </Link>
            </div>

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

          <div className={styles.heroVisual}>
            <div className={styles.codeWindow}>
              <div className={styles.codeWindowHeader}>
                <div className={styles.codeWindowDots}>
                  <span className={styles.dotRed}></span>
                  <span className={styles.dotYellow}></span>
                  <span className={styles.dotGreen}></span>
                </div>
                <span className={styles.codeWindowTitle}>Enterprise Workflow</span>
              </div>
              <pre className={styles.codeContent}>
                <code>{`# 1. Define requirements
/sw:increment "OAuth 2.0 with PKCE"
→ Generates spec.md + plan.md + tasks.md

# 2. Autonomous execution
/sw:auto
→ Runs for hours without intervention

# 3. Validate & deploy
/sw:done 0001
→ Quality gates: tasks ✓ tests ✓ docs ✓`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ProblemSection(): ReactNode {
  return (
    <section className={styles.problemSection}>
      <div className="container">
        <div className={styles.problemGrid}>
          <div className={styles.problemCard}>
            <div className={styles.problemIconWrapper}>{Icons.contextLoss}</div>
            <h3>Context Evaporates</h3>
            <p>Chat ends. Decisions vanish. "Why did we choose JWT?" becomes archaeology. Every session starts from zero.</p>
          </div>
          <div className={styles.problemCard}>
            <div className={styles.problemIconWrapper}>{Icons.repeat}</div>
            <h3>9 Hours Per Feature</h3>
            <p>2 hours building, 4 hours fixing bugs (no upfront design), 3 hours explaining to teammates (no docs). Every time.</p>
          </div>
          <div className={styles.problemCard}>
            <div className={styles.problemIconWrapper}>{Icons.docsRot}</div>
            <h3>No Quality Gates</h3>
            <p>Code ships without tests, reviews, or documentation. Bugs reach production. Technical debt compounds silently.</p>
          </div>
        </div>

        <div className={styles.solutionBox}>
          <h3>SpecWeave: AI That Never Forgets</h3>
          <p>
            Every decision, every architecture choice, every line of reasoning — <strong>captured permanently</strong> in spec.md, plan.md, and tasks.md.
            New session? Full context. New teammate? Instant onboarding. Six months later? Search and find exactly why.
          </p>
        </div>
      </div>
    </section>
  );
}

function WhatsNewSection(): ReactNode {
  return (
    <section className={styles.whatsNewSection}>
      <div className="container">
        <div className={styles.whatsNewBadge}>LATEST</div>
        <Heading as="h2" className={styles.sectionTitle}>What's New</Heading>
        <p className={styles.sectionSubtitle}>Recent updates that make SpecWeave even more powerful.</p>

        <div className={styles.whatsNewGrid}>
          <div className={styles.whatsNewCard}>
            <div className={styles.whatsNewIcon}>
              {Icons.qualityGates}
            </div>
            <div>
              <h3>Code Grill</h3>
              <p>A demanding senior engineer reviews your code before every release. Checks correctness, security (OWASP), performance, and maintainability. Run <code>/sw:grill</code> and ship with confidence.</p>
            </div>
          </div>
          <div className={styles.whatsNewCard}>
            <div className={styles.whatsNewIcon}>
              {Icons.sync}
            </div>
            <div>
              <h3>Multi-Repo Sync</h3>
              <p>Redesigned sync architecture for coordinating work across multiple repositories. GitHub, JIRA, and Azure DevOps stay in sync — automatically.</p>
            </div>
          </div>
          <div className={styles.whatsNewCard}>
            <div className={styles.whatsNewIcon}>
              {Icons.setup}
            </div>
            <div>
              <h3>LSP Code Intelligence</h3>
              <p>Language Server Protocol integration for TypeScript, Python, Go, Rust, Java, and C#. Semantic code understanding instead of text search — dramatically faster and more accurate.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection(): ReactNode {
  return (
    <section className={styles.statsSection}>
      <div className="container">
        <div className={styles.statsBadge}>DOGFOODING: BUILT WITH ITSELF</div>
        <Heading as="h2" className={styles.statsTitle}>Production Proven</Heading>
        <p className={styles.statsSubtitle}>
          Not a prototype. SpecWeave is entirely developed using SpecWeave — every feature, every release, every page you're reading right now.
        </p>

        <div className={styles.statsGrid}>
          <Link to="https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments" className={styles.statCard}>
            <div className={styles.statNumber}>Self-Built</div>
            <div className={styles.statLabel}>Every feature spec-driven</div>
          </Link>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>Zero</div>
            <div className={styles.statLabel}>Context Loss</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>Hours</div>
            <div className={styles.statLabel}>Of Autonomous Work</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection(): ReactNode {
  return (
    <section className={styles.featuresSection} id="capabilities">
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>Enterprise Capabilities</Heading>
        <p className={styles.sectionSubtitle}>Purpose-built for teams shipping production software at scale.</p>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>{Icons.extensible}</div>
            <h3>Extensible Skills (SOLID)</h3>
            <p>Customize AI behavior without forking. SKILL.md + skill-memories follow the Open/Closed Principle — extend any skill with your team's rules.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>{Icons.agents}</div>
            <h3>Multi-Agent Orchestration</h3>
            <p>Specialized agents — PM, Architect, QA, Security, DevOps — collaborating on your deliverables. Powered by Claude Opus 4.6.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>{Icons.memory}</div>
            <h3>Persistent Memory</h3>
            <p>AI learns from corrections and retains context. Fix once — remembered permanently.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>{Icons.livingDocs}</div>
            <h3>Living Documentation</h3>
            <p>Specifications, ADRs, and runbooks synchronized automatically after every task completion.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>{Icons.qualityGates}</div>
            <h3>Automated Quality Gates</h3>
            <p>Enforced validation: tests passing, docs current, acceptance criteria satisfied before release.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>{Icons.sync}</div>
            <h3>Bidirectional Sync</h3>
            <p>GitHub Issues, JIRA, Azure DevOps — real-time synchronization across platforms.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection(): ReactNode {
  return (
    <section className={styles.integrationsSection}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>Seamless Integration</Heading>
        <p className={styles.sectionSubtitle}>Native connectivity with enterprise toolchains.</p>

        <div className={styles.integrationsGrid}>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIconWrapper}>{Icons.github}</div>
            <h3>GitHub</h3>
            <p>Issues, Milestones, Projects. Full bidirectional synchronization.</p>
          </div>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIconWrapper}>{Icons.jira}</div>
            <h3>JIRA</h3>
            <p>Epics, Stories, Boards. Complete hierarchy mapping.</p>
          </div>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIconWrapper}>{Icons.azure}</div>
            <h3>Azure DevOps</h3>
            <p>Work Items, Area Paths, Iterations. Enterprise-grade integration.</p>
          </div>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIconWrapper}>{Icons.ai}</div>
            <h3>AI Platforms</h3>
            <p>Claude Opus 4.6 & Sonnet 4.5 native. Also works with Cursor, Copilot, Gemini.</p>
          </div>
        </div>

        <div className={styles.integrationsCta}>
          <Link to="/docs/guides/integrations/external-tools-overview" className={styles.btnOutline}>
            Integration Documentation →
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection(): ReactNode {
  return (
    <section className={styles.ctaSection}>
      <div className="container">
        <Heading as="h2" className={styles.ctaTitle}>Stop Losing Work. Start Shipping.</Heading>
        <p className={styles.ctaSubtitle}>
          Two commands. Permanent memory. Autonomous execution for hours. Your AI coding assistant finally remembers everything.
        </p>

        <div className={styles.ctaCode}>
          <code>npm install -g specweave && specweave init .</code>
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
      description="The spec-driven skill layer for AI coding agents. First-class support for Claude Code — compatible with any LLM-powered coding tool. Ship features while you sleep.">
      <HomepageHeader />
      <main>
        <ProblemSection />
        <WhatsNewSection />
        <StatsSection />
        <FeaturesSection />
        <IntegrationsSection />
        <CTASection />
      </main>
    </Layout>
  );
}
