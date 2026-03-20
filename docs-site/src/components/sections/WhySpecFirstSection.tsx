import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './WhySpecFirstSection.module.css';

const BEFORE = [
  'Specs live in chat history — lost next session',
  'Tests? Maybe later. Coverage? Who knows.',
  'Architecture decisions in Slack threads',
  'Manual JIRA/GitHub updates after the fact',
  '"Ask John, he knows how this works"',
  'Onboarding a new developer: 2 weeks',
] as const;

const AFTER = [
  'Permanent, searchable spec.md + plan.md + tasks.md',
  'TDD enforced — tests embedded in every task',
  'ADRs captured automatically in every increment',
  'Auto-sync to GitHub, JIRA, Azure DevOps on close',
  'Living docs, always current, never drifts',
  'Onboarding: 1 day — read the specs, start building',
] as const;

export default function WhySpecFirstSection() {
  return (
    <Section>
      <SectionHeader
        label="Why Spec-First"
        title="Structure Is the Multiplier"
        subtitle="170 out of 1,645 vibe-coded apps had security vulnerabilities. SpecWeave takes the opposite approach."
      />

      <div className={styles.columns}>
        <AnimateOnScroll animation="fade-up" delay={100}>
          <div className={styles.column}>
            <h3 className={styles.columnTitle}>
              <span className={styles.beforeDot} />
              Without structure
            </h3>
            <ul className={styles.list}>
              {BEFORE.map((item) => (
                <li key={item} className={styles.beforeItem}>{item}</li>
              ))}
            </ul>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fade-up" delay={200}>
          <div className={`${styles.column} ${styles.columnAfter}`}>
            <h3 className={styles.columnTitle}>
              <span className={styles.afterDot} />
              With SpecWeave
            </h3>
            <ul className={styles.list}>
              {AFTER.map((item) => (
                <li key={item} className={styles.afterItem}>{item}</li>
              ))}
            </ul>
          </div>
        </AnimateOnScroll>
      </div>

      <AnimateOnScroll animation="fade-up" delay={300}>
        <p className={styles.proof}>
          This isn't theory. SpecWeave was built with SpecWeave — 600+ structured
          increments over 4 months. 5 apps shipped to the App Store. 12 production
          projects total. Structure isn't overhead — it's the multiplier that makes
          autonomous AI development actually work.
        </p>
      </AnimateOnScroll>
    </Section>
  );
}
