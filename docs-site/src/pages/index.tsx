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
              ✨ 100% Free & Open Source Forever
            </div>
            <div className={styles.heroTag}>
              🚀 v1.0.1 Production Ready
            </div>
          </div>
          <Heading as="h1" className={styles.heroTitle}>
            Stop Fighting AI.<br/>
            Start <span className={styles.heroHighlight}>Shipping</span>.
          </Heading>
          <p className={styles.heroSubtitle}>
            <strong>Three commands. Production code.</strong> SpecWeave turns AI into autonomous agents
            that create specs, write tests, update docs—then build your feature while you review.
            <br/><strong>Works on 10-year-old legacy AND fresh startups. Claude, Cursor, Copilot. Any stack.</strong>
          </p>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>3</div>
              <div className={styles.statLabel}>Commands to Ship</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>90%</div>
              <div className={styles.statLabel}>Less Manual Work</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>60%+</div>
              <div className={styles.statLabel}>Test Coverage Built-In</div>
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
              Watch Demo (2 min)
            </Link>
          </div>
        </div>

        <div className={styles.heroCode}>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeTitle}>✨ Just 3 Commands</span>
            </div>
            <pre className={styles.codePre}>
              <code>{`# 1. Describe what you want
/sw:increment "Add user authentication with OAuth"
→ AI creates spec, plan, and 12 tasks with tests

# 2. Build it
/sw:do
→ Autonomous execution: code, tests, docs update automatically

# 3. Ship it
/sw:done 0001
→ Quality gates verify: tasks ✓ tests ✓ docs ✓`}</code>
            </pre>
          </div>
          <div className={styles.codeCaption}>
            <strong>No back-and-forth.</strong> No manual test writing. No stale docs. <strong>Just working software.</strong>
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
          <div className={styles.dogfoodingBadge}>🔄 REAL-WORLD PROOF</div>
          <Heading as="h2">Built With SpecWeave, For Real</Heading>
          <p>
            Not a demo project. SpecWeave builds itself using SpecWeave.
            <strong> 140+ features shipped</strong>, all with full specs, tests, and living docs.
            Browse our actual codebase—see exactly how it works.
          </p>
          <div className={styles.dogfoodingStats}>
            <Link to="https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments" className={styles.dogfoodingStat}>
              <span className={styles.dogfoodingNumber}>140+</span>
              <span className={styles.dogfoodingLabel}>Features Shipped</span>
            </Link>
            <Link to="https://spec-weave.com/docs/metrics" className={styles.dogfoodingStat}>
              <span className={styles.dogfoodingNumber}>Live</span>
              <span className={styles.dogfoodingLabel}>DORA Metrics</span>
            </Link>
            <Link to="https://github.com/anton-abyzov/specweave" className={styles.dogfoodingStat}>
              <span className={styles.dogfoodingNumber}>24</span>
              <span className={styles.dogfoodingLabel}>Plugins Included</span>
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
          <Heading as="h2">What Makes SpecWeave Different</Heading>
          <p>Not another AI coding assistant. A complete autonomous development framework.</p>
        </div>
        <div className={styles.featuresGrid}>
          <FeatureHighlight
            icon="🚀"
            title="Autonomous Execution"
            description="Type /sw:do and walk away. AI agents write code, tests, and docs—then verify everything passes quality gates before asking for your review."
          />
          <FeatureHighlight
            icon="📚"
            title="Living Documentation"
            description="Specs and docs auto-update after every task. Always in sync with code—no drift, no manual updates, no 'ask John, he knows'."
          />
          <FeatureHighlight
            icon="🔗"
            title="Enterprise Integration"
            description="Sync with GitHub Issues, JIRA, and Azure DevOps out of the box. Your PM sees progress in their tools. No workflow changes required."
          />
          <FeatureHighlight
            icon="🏢"
            title="Legacy-Ready"
            description="Works on 10-year-old codebases. Import existing docs from Notion, Confluence, or wikis. Generate retroactive specs and ADRs automatically."
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
            <h3>❌ Without SpecWeave</h3>
            <ul>
              <li>Tell AI: "Build me a feature"</li>
              <li>Back-and-forth messages for every detail</li>
              <li>Code generated without specs or architecture</li>
              <li>Manually test, manually fix bugs</li>
              <li>Docs drift or don't exist</li>
              <li>Start over for next feature</li>
            </ul>
            <p className={styles.comparisonResult}>
              <strong>Result:</strong> High cognitive load, constant context switching, no documentation = regression risk.
            </p>
          </div>
          <div className={styles.comparisonColumn}>
            <h3>✅ With SpecWeave</h3>
            <ul>
              <li>Type <code>/sw:increment "feature"</code></li>
              <li>Autonomous agents ask clarifying questions, create spec/plan/tasks, review with you</li>
              <li>Type <code>/sw:do</code></li>
              <li>Agents work in parallel, auto-resume, validate at milestones, update docs continuously</li>
              <li>Type <code>/sw:progress</code> anytime to see status</li>
              <li>Type <code>/sw:next</code> to seamlessly move forward</li>
            </ul>
            <p className={styles.comparisonResult}>
              <strong>Result:</strong> Minimal interaction, natural flow. Production-ready software with living documentation and full traceability.
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
          <Heading as="h2">Ready to Build Production Software?</Heading>
          <p>Get started with SpecWeave in less than 5 minutes. <strong>100% free, 100% open-source, forever.</strong></p>
          <div className={styles.ctaButtons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/guides/getting-started/quickstart">
              Quick Start Guide →
            </Link>
            <Link
              className="button button--outline button--lg"
              to="https://github.com/anton-abyzov/specweave">
              View on GitHub ⭐
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
