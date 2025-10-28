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

# Plan your first feature (smart workflow!)
/inc "AI-powered customer support chatbot"
# PM-led: market research → spec → plan → auto-generate tasks

# SpecWeave creates:
✅ spec.md (requirements)
✅ plan.md (architecture + C4 diagrams)
✅ tasks.md (auto-generated from plan!)
✅ tests.md (test strategy)

# Build it (smart resume)
/build
# Auto-resumes from next incomplete task

# Check progress anytime
/progress
# Shows: 5/12 tasks (42%), next: T006

# Start next feature (auto-closes previous!)
/inc "real-time chat dashboard"
# Seamless flow: finish → start next`}</code>
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
          <p>Build production software the right way—with specifications, tests, and AI assistance.</p>
        </div>
        <div className={styles.featuresGrid}>
          <FeatureHighlight
            icon="📝"
            title="Specification-First"
            description="Define WHAT and WHY before HOW. Specifications are the source of truth, code follows."
          />
          <FeatureHighlight
            icon="⚡"
            title="Smart Workflow"
            description="Auto-resume, auto-close, progress tracking. /inc, /build, /progress. Natural flow without overhead."
          />
          <FeatureHighlight
            icon="🤖"
            title="10 AI Agents + 35+ Skills"
            description="PM, Architect, DevOps, QA, Security. All pre-installed and ready to use."
          />
          <FeatureHighlight
            icon="🧪"
            title="Test-Validated"
            description="4-level testing strategy with full traceability from specs to E2E tests."
          />
          <FeatureHighlight
            icon="🌐"
            title="Framework-Agnostic"
            description="Works with TypeScript, Python, Go, Rust, Java, C#—any tech stack."
          />
          <FeatureHighlight
            icon="🛡️"
            title="Regression Prevention"
            description="Document existing code before modification. No surprises, no regressions."
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
              <li>AI might not activate correctly</li>
              <li>Code generated without specs</li>
              <li>Test manually, fix bugs</li>
              <li>(Maybe) document later</li>
              <li>Repeat for next feature</li>
            </ul>
            <p className={styles.comparisonResult}>
              <strong>Result:</strong> No docs = regression risk. No specs = unclear requirements. Unreliable activation.
            </p>
          </div>
          <div className={styles.comparisonColumn}>
            <h3>✅ With SpecWeave</h3>
            <ul>
              <li>Type <code>/inc "feature"</code> (smart workflow)</li>
              <li>SpecWeave creates spec + plan + auto-generates tasks</li>
              <li>Type <code>/build</code> (auto-resumes from next task)</li>
              <li>Type <code>/progress</code> anytime (see status)</li>
              <li>Tests validate automatically, docs update via hooks</li>
              <li>Type <code>/inc "next"</code> (auto-closes if ready)</li>
            </ul>
            <p className={styles.comparisonResult}>
              <strong>Result:</strong> Natural flow without overhead. Production-ready software with full traceability.
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
      title="Spec-Driven Development Framework"
      description="Build production software with AI assistance. Specification-first development with 70% token reduction, automated testing, and living documentation.">
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
