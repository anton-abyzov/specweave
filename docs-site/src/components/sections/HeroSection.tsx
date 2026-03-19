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
          <Badge variant="default">Claude Code Native</Badge>
        </div>

        <h1 className={styles.headline}>
          <span className={styles.headlineStatic}>Ship Features</span>
          <br />
          <span className={styles.gradientText}>While You Sleep</span>
        </h1>

        <p className={styles.subheading}>
          Weave specs into shipping software. Describe features in plain
          English, AI builds autonomously, ship while you sleep.
        </p>

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
