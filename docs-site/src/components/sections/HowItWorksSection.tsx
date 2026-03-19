import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import CodeBlock from '@site/src/components/ui/CodeBlock';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './HowItWorksSection.module.css';

const STEPS = [
  {
    num: 1,
    command: '/sw:increment',
    title: 'Plan with AI',
    description:
      'Describe features in plain English. AI interviews you, generates spec, plan, and tasks.',
  },
  {
    num: 2,
    command: '/sw:auto',
    title: 'Build Autonomously',
    description:
      'Walk away. Autonomous implementation with tests, docs, and quality gates for hours.',
  },
  {
    num: 3,
    command: '/sw:done',
    title: 'Ship with Confidence',
    description:
      'Validate, sync to GitHub/JIRA, and deploy. Production-grade every time.',
  },
] as const;

export default function HowItWorksSection() {
  return (
    <Section variant="dark">
      <SectionHeader
        label="How It Works"
        title="Three Commands. One Workflow."
        subtitle="From idea to production in three steps."
      />
      <div className={styles.timeline}>
        <div className={styles.progressLine} aria-hidden="true" />
        {STEPS.map((step, i) => (
          <AnimateOnScroll key={step.num} animation="fade-up" delay={i * 150}>
            <div className={styles.step}>
              <div className={styles.circle}>{step.num}</div>
              <CodeBlock code={step.command} showCopy={false} />
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.description}</p>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </Section>
  );
}
