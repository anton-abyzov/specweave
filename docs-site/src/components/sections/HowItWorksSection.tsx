import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './HowItWorksSection.module.css';

const STEPS = [
  {
    num: 1,
    title: 'Describe',
    emphasis: 'what you want',
    description:
      'Tell your AI coding tool what to build — in plain English. SpecWeave interviews you, generates spec, plan, and tasks automatically.',
  },
  {
    num: 2,
    title: 'Build',
    emphasis: 'autonomously',
    description:
      'Walk away. The AI implements, writes tests, fixes failures, and documents — for hours, without intervention.',
  },
  {
    num: 3,
    title: 'Ship',
    emphasis: 'with confidence',
    description:
      'Quality gates validate. Tests pass. Docs sync to GitHub, JIRA, or Azure DevOps. Production-grade every time.',
  },
] as const;

export default function HowItWorksSection() {
  return (
    <Section variant="dark">
      <SectionHeader
        label="How It Works"
        title="Describe. Build. Ship."
        subtitle="Works with any AI coding tool — Claude Code, Cursor, Copilot, Codex, Windsurf, and more."
      />
      <div className={styles.timeline}>
        <div className={styles.progressLine} aria-hidden="true" />
        {STEPS.map((step, i) => (
          <AnimateOnScroll key={step.num} animation="fade-up" delay={i * 150}>
            <div className={styles.step}>
              <div className={styles.circle}>{step.num}</div>
              <h3 className={styles.stepTitle}>
                {step.title} <span className={styles.emphasis}>{step.emphasis}</span>
              </h3>
              <p className={styles.stepDesc}>{step.description}</p>
            </div>
          </AnimateOnScroll>
        ))}
      </div>

      <AnimateOnScroll animation="fade-up" delay={500}>
        <div className={styles.videoLink}>
          <a
            href="https://youtu.be/WVwyqsHS8dc"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.videoAnchor}
          >
            Watch the 4-minute demo &rarr;
          </a>
        </div>
      </AnimateOnScroll>
    </Section>
  );
}
