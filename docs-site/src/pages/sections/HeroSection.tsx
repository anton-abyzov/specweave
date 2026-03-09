import React from 'react';
import Button from '@site/src/components/ui/Button';
import Badge from '@site/src/components/ui/Badge';
import WordAnimation from '@site/src/components/animation/WordAnimation';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.glowOrb} aria-hidden="true" />
      <div className={styles.content}>
        <AnimateOnScroll animation="fade-in">
          <div className={styles.pills}>
            <Badge variant="primary">Open Source</Badge>
            <Badge variant="default">Claude Code Native</Badge>
          </div>
        </AnimateOnScroll>

        <h1 className={styles.headline}>
          <span className={styles.headlineStatic}>Ship Features</span>
          <br />
          <WordAnimation
            text="While You Sleep"
            className={styles.gradientText}
            as="span"
          />
        </h1>

        <AnimateOnScroll animation="fade-up" delay={200}>
          <p className={styles.subheading}>
            Weave specs into shipping software. Describe features in plain
            English, AI builds autonomously, ship while you sleep.
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={400}>
          <div className={styles.ctas}>
            <Button
              variant="primary"
              size="lg"
              href="/docs/guides/getting-started/quick-start"
            >
              Get Started
            </Button>
            <Button variant="ghost" size="lg" href="#demo" className={styles.ghostBtn}>
              Watch Demo
            </Button>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
