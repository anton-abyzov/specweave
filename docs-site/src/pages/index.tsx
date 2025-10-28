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
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/guides/getting-started/quickstart">
              Get Started →
            </Link>
            <Link
              className="button button--outline button--lg"
              to="/docs/overview/introduction">
              Learn More
            </Link>
          </div>
        </div>

        <div className={styles.heroCode}>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeTitle}>Slash Commands - 100% Reliable Activation</span>
            </div>
            <pre className={styles.codePre}>
              <code>{`# Initialize new project
npx specweave init my-app

# Plan your first feature
/inc "AI-powered customer support chatbot"
# SpecWeave autonomously:
# ✅ Asks clarifying questions (target users? integration needs?)
# ✅ Creates spec.md, plan.md, tasks.md, tests.md
# ✅ Reviews output with you before proceeding

# Execute it (just works!)
/do
# SpecWeave autonomously:
# ✅ Auto-resumes from next incomplete task
# ✅ Asks for validation at key milestones
# ✅ Updates docs and runs tests automatically

# Check progress anytime
/progress
# Shows: 5/12 tasks (42%), next: T006

# Start next feature (seamless!)
/inc "real-time chat dashboard"
# Auto-closes previous if all gates pass ✅`}</code>
            </pre>
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

function FeaturesSection(): ReactNode {
  return (
    <section className={styles.featuresSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2">Why SpecWeave?</Heading>
          <p>Build production software with autonomous AI agents that just work—minimal interaction, maximum productivity.</p>
        </div>
        <div className={styles.featuresGrid}>
          <FeatureHighlight
            icon="📝"
            title="Specification-First"
            description="Define WHAT and WHY before HOW. Specifications are the source of truth, code follows."
          />
          <FeatureHighlight
            icon="⚡"
            title="Autonomous & Smart"
            description="Just works—asks clarifying questions, reviews output, validates quality. Auto-resume, auto-close. Minimal interaction, maximum productivity."
          />
          <FeatureHighlight
            icon="🤖"
            title="10 Agents + 35+ Skills"
            description="PM, Architect, DevOps, QA, Security—work in parallel to minimize context usage. Easily extensible. Pre-installed and ready to use."
          />
          <FeatureHighlight
            icon="🧪"
            title="Complete Test Coverage"
            description="4-level testing strategy with full traceability—from specs to integration tests. Works for APIs, UIs, CLIs, and libraries."
          />
          <FeatureHighlight
            icon="🌐"
            title="Universal Support"
            description="Works with ANY tech stack (TS, Python, Go, Rust, Java, C#) and ANY AI tool (Claude, Cursor, Copilot, Gemini, ChatGPT)."
          />
          <FeatureHighlight
            icon="📚"
            title="Living Documentation"
            description="Specs and docs auto-update after every operation and test. Always in sync with code—no drift, no surprises."
          />
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
              <li>Type <code>/inc "feature"</code></li>
              <li>Autonomous agents ask clarifying questions, create spec/plan/tasks, review with you</li>
              <li>Type <code>/do</code></li>
              <li>Agents work in parallel, auto-resume, validate at milestones, update docs continuously</li>
              <li>Type <code>/progress</code> anytime to see status</li>
              <li>Type <code>/inc "next"</code> to seamlessly move forward</li>
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
          <p>Get started with SpecWeave in less than 5 minutes.</p>
          <div className={styles.ctaButtons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/guides/getting-started/quickstart">
              Quick Start Guide →
            </Link>
            <Link
              className="button button--outline button--lg"
              to="https://github.com/anton-abyzov/specweave">
              View on GitHub
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
        <FeaturesSection />
        <ComparisonSection />
        <HomepageFeatures />
        <CTASection />
      </main>
    </Layout>
  );
}
