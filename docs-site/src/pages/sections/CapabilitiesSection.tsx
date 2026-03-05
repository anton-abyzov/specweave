import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import Icon from '@site/src/components/ui/Icon';
import CodeBlock from '@site/src/components/ui/CodeBlock';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './CapabilitiesSection.module.css';

const CAPABILITIES = [
  {
    icon: 'users',
    title: 'Multi-Agent Teams',
    description:
      'PM, Architect, QA, and DevOps agents collaborate on features. Powered by Claude Opus 4.6.',
    code: '/sw:team-lead "build auth system"',
  },
  {
    icon: 'lightbulb',
    title: 'Persistent Memory',
    description:
      'AI learns from corrections and retains context across sessions. Fix once, remembered permanently.',
  },
  {
    icon: 'zap',
    title: 'Autonomous Execution',
    description:
      'Run /sw:auto and walk away. Implements, tests, fixes, and documents for hours without intervention.',
    code: '/sw:auto',
  },
  {
    icon: 'shield',
    title: 'Quality Gates',
    description:
      'Code Grill reviews every change. Tests passing, docs current, acceptance criteria satisfied.',
  },
  {
    icon: 'file-text',
    title: 'Living Documentation',
    description:
      'Specs, ADRs, and runbooks sync automatically. Documentation that never drifts from code.',
    code: '/sw:docs-updater',
  },
  {
    icon: 'refresh-cw',
    title: 'Bidirectional Sync',
    description:
      'GitHub Issues, JIRA, Azure DevOps -- real-time two-way synchronization across your toolchain.',
  },
] as const;

export default function CapabilitiesSection() {
  return (
    <Section>
      <SectionHeader
        label="Capabilities"
        title="Everything You Need to Ship at Scale"
        subtitle="Purpose-built for teams shipping production software with AI coding agents."
      />
      <div className={styles.list}>
        {CAPABILITIES.map((cap, i) => (
          <AnimateOnScroll
            key={cap.title}
            animation="fade-up"
            delay={i * 100}
          >
            <div
              className={[
                styles.row,
                i % 2 === 1 ? styles.rowReverse : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className={styles.textSide}>
                <div className={styles.iconCircle}>
                  <Icon name={cap.icon} size={28} />
                </div>
                <h3 className={styles.capTitle}>{cap.title}</h3>
                <p className={styles.capDesc}>{cap.description}</p>
              </div>
              {cap.code && (
                <div className={styles.codeSide}>
                  <CodeBlock code={cap.code} showCopy={false} />
                </div>
              )}
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </Section>
  );
}
