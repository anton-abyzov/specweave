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
              ⚡ Production-Ready AI Development
            </div>
          </div>
          <Heading as="h1" className={styles.heroTitle}>
            Stop Fighting AI.<br/>
            Start <span className={styles.heroHighlight}>Shipping</span>.
          </Heading>
          <p className={styles.heroSubtitle}>
            SpecWeave gives you <strong>autonomous AI agents that just work</strong>—minimal interaction, maximum productivity.
            Type one command, get production code with specs, tests, and living docs. <strong>Always free, always open-source.</strong>
          </p>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>70%+</div>
              <div className={styles.statLabel}>Token Reduction</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>10+</div>
              <div className={styles.statLabel}>AI Agents</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>2-3x</div>
              <div className={styles.statLabel}>Faster with Opus 4.5</div>
            </div>
          </div>
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/guides/getting-started/quickstart">
              Get Started in 5 Minutes →
            </Link>
            <Link
              className="button button--outline button--lg"
              to="/docs/workflows/overview">
              See How It Works
            </Link>
          </div>
          <div className={styles.heroNote}>
            Works with <strong>any tech stack</strong> (TS, Python, Go, Rust, Java, C#) and <strong>any AI tool</strong> (Claude, Cursor, Copilot)
          </div>
        </div>

        <div className={styles.heroCode}>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeTitle}>✨ The Magic of /do - Just Three Commands (one of thousands of use cases!)</span>
            </div>
            <pre className={styles.codePre}>
              <code>{`# 1. Describe your feature (natural language)
/specweave:increment "Add real-time chat with typing indicators"

🤖 PM Agent asks: "Who will be chatting? Store messages? Scale?"
✅ Creates: spec.md (user stories + AC-IDs)
✅ Creates: plan.md (architecture + test strategy 88%)
✅ Creates: tasks.md (8 tasks, 45 tests embedded)
📊 Estimate: 4-6 hours deterministic work, 88% coverage. Proceed? (Y/n)

# 2. Type one command. That's it.
/specweave:do

⚙️  Working on T-001: ChatService [TDD mode]
    ✅ Tests created (5 tests)
    ✅ Implementation complete
    ✅ Coverage: 92% (target: 90%)
    ✅ Docs auto-updated (hooks)

⚙️  Working on T-002: MessageRepository...
    [continues autonomously through all 8 tasks]

# 3. Check status anytime
/specweave:progress
📊 Progress: 8/8 tasks (100%)
✅ Coverage: 90% (target: 88%)
✅ All tests passing
🎉 Ready to ship!`}</code>
            </pre>
          </div>
          <div className={styles.codeCaption}>
            <strong>That's it.</strong> No back-and-forth messages. No manual test writing. No doc updates. <strong>Just working software.</strong><br/>
            <em>This is just 1 of thousands of use cases—from microservices to ML pipelines to enterprise apps!</em>
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
          <div className={styles.dogfoodingBadge}>🔄 DOGFOODING</div>
          <Heading as="h2">SpecWeave is Built With SpecWeave</Heading>
          <p>
            This isn't just a framework we made — it's the framework we use every day.
            <strong> 70+ completed increments</strong>, full specs, living docs, and real DORA metrics.
            Every feature you see was built spec-first.
          </p>
          <div className={styles.dogfoodingStats}>
            <Link to="https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments" className={styles.dogfoodingStat}>
              <span className={styles.dogfoodingNumber}>70+</span>
              <span className={styles.dogfoodingLabel}>Increments</span>
            </Link>
            <Link to="https://spec-weave.com/docs/metrics" className={styles.dogfoodingStat}>
              <span className={styles.dogfoodingNumber}>Live</span>
              <span className={styles.dogfoodingLabel}>DORA Metrics</span>
            </Link>
            <Link to="https://github.com/anton-abyzov/specweave/tree/develop/.specweave/docs" className={styles.dogfoodingStat}>
              <span className={styles.dogfoodingNumber}>Auto</span>
              <span className={styles.dogfoodingLabel}>Living Docs</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
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
          {/* TIER 1: TRUE DIFFERENTIATORS - What makes SpecWeave unique */}
          <FeatureHighlight
            icon="🔌"
            title="70%+ Token Reduction"
            description="Modular plugin architecture loads only what you need. Active increment + relevant plugin + one agent = ~15K tokens (vs 200K+ monolithic). Measurable AI cost savings."
          />
          <FeatureHighlight
            icon="🏢"
            title="Brownfield Excellence"
            description="The hardest problem solved: import existing docs (Notion, Confluence, Wiki), create retroactive specs, generate ADRs and C4 diagrams. Perfect for legacy codebases."
          />
          <FeatureHighlight
            icon="📚"
            title="Living Documentation (Auto-Sync)"
            description="Specs and docs auto-update after every task via hooks. Always in sync with code—no drift, no manual updates, no surprises. Unique hook-based mechanism."
          />
          {/* TIER 2: STRONG DIFFERENTIATORS */}
          <FeatureHighlight
            icon="🔗"
            title="External Tool Sync (GitHub/JIRA/ADO)"
            description="Push specs to GitHub Issues, JIRA, and Azure DevOps. Read status back automatically. Keep your existing workflow—no tool lock-in."
          />
          <FeatureHighlight
            icon="🧪"
            title="Test Coverage Built-In"
            description="4-level testing strategy with full traceability—unit, integration, E2E, acceptance tests. Embedded in tasks.md. 85-90% coverage targets enforced."
          />
          <FeatureHighlight
            icon="🤖"
            title="15+ Specialized AI Agents"
            description="PM, Architect, DevOps, QA, Security, Tech Lead—work in parallel to minimize context usage. Pre-installed, auto-activating, production-ready."
          />
          {/* TIER 3: SUPPORTING FEATURES */}
          <FeatureHighlight
            icon="📝"
            title="Specification-First (Source of Truth)"
            description="Define WHAT and WHY before HOW. Specifications are the source of truth, code follows. Complete traceability from requirements to tests."
          />
          <FeatureHighlight
            icon="⚡"
            title="Autonomous & Deterministic"
            description="Type one command, get production code in hours (not days). Auto-resume, auto-close. Minimal interaction, maximum velocity."
          />
          <FeatureHighlight
            icon="🌐"
            title="Universal Support (Any Stack, Any AI)"
            description="Works with ANY tech stack (TS, Python, Go, Rust, Java, C#) and ANY AI tool (Claude Code, Cursor, Copilot, Gemini, ChatGPT)."
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
              <li>Type <code>/specweave:increment "feature"</code></li>
              <li>Autonomous agents ask clarifying questions, create spec/plan/tasks, review with you</li>
              <li>Type <code>/specweave:do</code></li>
              <li>Agents work in parallel, auto-resume, validate at milestones, update docs continuously</li>
              <li>Type <code>/specweave:progress</code> anytime to see status</li>
              <li>Type <code>/specweave:increment "next"</code> to seamlessly move forward</li>
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
        <ComparisonSection />
        <HomepageFeatures />
        <CTASection />
      </main>
    </Layout>
  );
}
