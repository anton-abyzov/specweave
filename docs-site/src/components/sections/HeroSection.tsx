import React from 'react';
import Button from '@site/src/components/ui/Button';
import Badge from '@site/src/components/ui/Badge';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.glowOrb} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.pills}>
          <Badge variant="primary">Open Source</Badge>
          <Badge variant="default">636+ Increments</Badge>
          <Badge variant="default">10+ Production Apps</Badge>
        </div>

        <h1 className={styles.headline}>
          <span className={styles.headlineStatic}>Stop Prompting.</span>
          <br />
          <span className={styles.gradientText}>Start Specifying.</span>
        </h1>

        <p className={styles.subheading}>
          SpecWeave turns ad-hoc AI prompts into structured, testable,
          autonomous development. 10+ production apps and counting.
        </p>

        <div className={styles.badgeBar}>
          <span className={styles.metric}>636+ Increments</span>
          <span className={styles.metricDot}>&middot;</span>
          <span className={styles.metric}>49 Agent Platforms</span>
          <span className={styles.metricDot}>&middot;</span>
          <span className={styles.metric}>100+ Skills</span>
          <span className={styles.metricDot}>&middot;</span>
          <span className={styles.metric}>MIT License</span>
        </div>

        <div className={styles.ctas}>
          <Button
            variant="primary"
            size="lg"
            href="/docs/getting-started"
          >
            Get Started
          </Button>
          <Button variant="ghost" size="lg" href="#demo" className={styles.ghostBtn}>
            Watch Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
