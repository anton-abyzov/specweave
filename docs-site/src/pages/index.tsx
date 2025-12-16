import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroTags}>
            <div className={styles.heroTag}>
              100% Free & Open Source
            </div>
            <div className={styles.heroTag}>
              v1.1 Production Ready
            </div>
          </div>
          <Heading as="h1" className={styles.heroTitle}>
            AI That <span className={styles.heroHighlight}>Builds</span> Production Code.<br/>
            Not Just Generates It.
          </Heading>
          <p className={styles.heroSubtitle}>
            Every feature gets a <strong>permanent spec</strong>. Every decision gets <strong>documented</strong>.
            Every change syncs to <strong>JIRA, GitHub, Azure DevOps</strong>.
            <br/><strong>After 6 months, search "OAuth" — find exactly why it was built that way.</strong>
          </p>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>3</div>
              <div className={styles.statLabel}>Commands to Ship</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>140+</div>
              <div className={styles.statLabel}>Self-Built Features</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>60%+</div>
              <div className={styles.statLabel}>Test Coverage Enforced</div>
            </div>
          </div>
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/intro">
              Get Started Free →
            </Link>
            <Link
              className="button button--outline button--lg"
              to="#how-it-works">
              See How It Works
            </Link>
          </div>
        </div>

        <div className={styles.heroCode}>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeTitle}>The 3-Command Workflow</span>
            </div>
            <pre className={styles.codePre}>
              <code>{`# 1. Define what you want
/sw:increment "Add OAuth authentication"
→ Creates spec.md + plan.md + tasks.md (with embedded tests)

# 2. Let AI build it
/sw:do
→ Autonomous execution: code, tests, docs update automatically

# 3. Validate and ship
/sw:done 0001
→ Quality gates: tasks ✓ tests 60%+ ✓ docs synced ✓`}</code>
            </pre>
          </div>
          <div className={styles.codeCaption}>
            <strong>Every feature = permanent documentation.</strong> Searchable. Traceable. Always in sync.
          </div>
        </div>
      </div>
    </header>
  );
}

function FeatureHighlight({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}): ReactNode {
  return (
    <div className={styles.feature}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function DogfoodingBanner(): ReactNode {
  return (
    <section className={styles.dogfoodingSection}>
      <div className="container">
        <div className={styles.dogfoodingContent}>
          <div className={styles.dogfoodingBadge}>PROOF: WE USE IT OURSELVES</div>
          <Heading as="h2">This Framework Builds Itself</Heading>
          <p>
            Not a demo. SpecWeave is 100% built using SpecWeave.
            Every feature, every bug fix, every release — all spec-driven with full traceability.
          </p>
          <div className={styles.dogfoodingStats}>
            <Link to="https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments" className={styles.dogfoodingStat}>
              <span className={styles.dogfoodingNumber}>140+</span>
              <span className={styles.dogfoodingLabel}>Features with Full Specs</span>
            </Link>
            <Link to="https://spec-weave.com/docs/metrics" className={styles.dogfoodingStat}>
              <span className={styles.dogfoodingNumber}>Live</span>
              <span className={styles.dogfoodingLabel}>DORA Metrics</span>
            </Link>
            <Link to="https://github.com/anton-abyzov/specweave" className={styles.dogfoodingStat}>
              <span className={styles.dogfoodingNumber}>0%</span>
              <span className={styles.dogfoodingLabel}>Change Failure Rate</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection(): ReactNode {
  return (
    <section className={styles.featuresSection} id="how-it-works">
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2">Why Not BMAD or SpecKit?</Heading>
          <p>Great tools for simple projects. But when things get real, they break down.</p>
        </div>
        <div className={styles.featuresGrid}>
          <FeatureHighlight
            icon="📂"
            title="Permanent, Not Ephemeral"
            description="Other tools generate code into chat history. SpecWeave creates permanent spec.md + plan.md + tasks.md files. Searchable forever."
          />
          <FeatureHighlight
            icon="🔄"
            title="Full Lifecycle, Not Snapshots"
            description="BMAD and SpecKit are single-use. SpecWeave manages 140+ increments with pause, resume, abandon, reopen, and quality gates."
          />
          <FeatureHighlight
            icon="🔗"
            title="External Sync Built-In"
            description="Bidirectional sync with GitHub Issues, JIRA, Azure DevOps. Other tools require manual updates or custom integrations."
          />
          <FeatureHighlight
            icon="🏢"
            title="Brownfield-Ready"
            description="10-year legacy codebase? SpecWeave analyzes it, detects doc gaps, imports from Notion/Confluence. Others assume greenfield only."
          />
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection(): ReactNode {
  return (
    <section className={styles.integrationsSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2">Works With Your Stack</Heading>
          <p>SpecWeave integrates with the tools your team already uses.</p>
        </div>
        <div className={styles.integrationsGrid}>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIcon}>🐙</div>
            <h3>GitHub</h3>
            <p>Issues, Milestones, Projects. Bidirectional sync keeps everything in sync.</p>
          </div>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIcon}>📋</div>
            <h3>JIRA</h3>
            <p>Epics, Stories, Boards. 1-level and 2-level hierarchy mapping.</p>
          </div>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIcon}>🔷</div>
            <h3>Azure DevOps</h3>
            <p>Work Items, Area Paths, Iterations. Full ADO integration.</p>
          </div>
          <div className={styles.integrationCard}>
            <div className={styles.integrationIcon}>🤖</div>
            <h3>Any AI Tool</h3>
            <p>Claude, Cursor, Copilot, Gemini. Your team picks their favorite.</p>
          </div>
        </div>
        <div className={styles.integrationsCta}>
          <Link to="/docs/guides/integrations/external-tools-overview" className="button button--secondary">
            View Integration Guides →
          </Link>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection(): ReactNode {
  return (
    <section className={styles.comparisonSection}>
      <div className="container">
        <div className={styles.comparison}>
          <div className={styles.comparisonColumn}>
            <h3>The Problem</h3>
            <ul>
              <li>Specs disappear into chat history</li>
              <li>Architecture decisions forgotten</li>
              <li>Tests? "We'll add them later"</li>
              <li>JIRA/GitHub manually updated</li>
              <li>Onboarding: "Ask John, he knows"</li>
              <li>6 months later: no one knows why</li>
            </ul>
            <p className={styles.comparisonResult}>
              <strong>AI generates code, but code without context is technical debt.</strong>
            </p>
          </div>
          <div className={styles.comparisonColumn}>
            <h3>The SpecWeave Solution</h3>
            <ul>
              <li>Every feature = permanent spec.md</li>
              <li>Every decision = documented in plan.md</li>
              <li>Tests embedded in tasks.md (60%+ enforced)</li>
              <li>Sync to JIRA/GitHub/ADO on command</li>
              <li>Onboarding: search the living docs</li>
              <li>6 months later: full traceability</li>
            </ul>
            <p className={styles.comparisonResult}>
              <strong>AI decisions become permanent, searchable documentation.</strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection(): ReactNode {
  return (
    <section className={styles.ctaSection}>
      <div className="container">
        <div className={styles.ctaContent}>
          <Heading as="h2">Start Building With Traceability</Heading>
          <p>5 minutes to install. Your first spec in 60 seconds. <strong>100% free, open-source, forever.</strong></p>
          <div className={styles.ctaButtons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/guides/getting-started/quickstart">
              Get Started →
            </Link>
            <Link
              className="button button--outline button--lg"
              to="https://github.com/anton-abyzov/specweave">
              Star on GitHub
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Autonomous AI Development Framework"
      description="Build production software with autonomous AI agents that just work. Minimal interaction, maximum productivity. Works with Claude, Cursor, Copilot, Gemini, and any AI tool.">
      <HomepageHeader />
      <main>
        <DogfoodingBanner />
        <FeaturesSection />
        <IntegrationsSection />
        <ComparisonSection />
        <CTASection />
      </main>
    </Layout>
  );
}
