import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import IntegrationCard from '@site/src/components/cards/IntegrationCard';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './IntegrationsSection.module.css';

const INTEGRATIONS = [
  {
    brand: 'github',
    name: 'GitHub Issues',
    description: 'Bidirectional sync with issues, milestones, and pull requests.',
  },
  {
    brand: 'jira',
    name: 'JIRA',
    description: 'Map stories to issues with real-time status synchronization.',
  },
  {
    brand: 'azure',
    name: 'Azure DevOps',
    description: 'Work items, boards, and pipeline integration out of the box.',
  },
] as const;

export default function IntegrationsSection() {
  return (
    <Section>
      <SectionHeader
        label="Integrations"
        title="Connects to Your Toolchain"
        subtitle="Real-time bidirectional sync across your entire development workflow."
      />
      <div className={styles.grid}>
        {INTEGRATIONS.map((integration, i) => (
          <AnimateOnScroll
            key={integration.name}
            animation="fade-up"
            delay={i * 100}
          >
            <IntegrationCard
              brand={integration.brand}
              name={integration.name}
              description={integration.description}
            />
          </AnimateOnScroll>
        ))}
      </div>
    </Section>
  );
}
