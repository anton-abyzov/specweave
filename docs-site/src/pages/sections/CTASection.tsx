import React from 'react';
import Button from '@site/src/components/ui/Button';
import CodeBlock from '@site/src/components/ui/CodeBlock';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './CTASection.module.css';

export default function CTASection() {
  return (
    <section className={styles.cta}>
      <div className={styles.container}>
        <AnimateOnScroll animation="fade-up">
          <h2 className={styles.headline}>
            Start Shipping Features
            <br />
            While You Sleep
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={100}>
          <div className={styles.codeWrapper}>
            <CodeBlock code="npx specweave init" showCopy />
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={200}>
          <div className={styles.buttons}>
            <Button
              variant="primary"
              size="lg"
              href="/docs/guides/getting-started/quick-start"
            >
              Get Started
            </Button>
            <Button
              variant="ghost"
              size="lg"
              href="/docs/overview/introduction"
            >
              Read the Docs
            </Button>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
