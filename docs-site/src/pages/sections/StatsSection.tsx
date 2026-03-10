import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import CountUp from '@site/src/components/animation/CountUp';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './StatsSection.module.css';

const STATS = [
  { target: 100, suffix: '+', label: 'Skills Available' },
  { target: 3200, suffix: '+', label: 'Commits Shipped' },
  { target: 10, suffix: '+', label: 'Active Projects' },
  { target: 12, suffix: '', label: 'Core Plugins' },
] as const;

export default function StatsSection() {
  return (
    <Section variant="gradient">
      <SectionHeader title="Built With Itself. Production Ready." />
      <div className={styles.grid}>
        {STATS.map((stat, i) => (
          <AnimateOnScroll key={stat.label} animation="fade-up" delay={i * 100}>
            <div className={styles.card}>
              <div className={styles.value}>
                <CountUp target={stat.target} suffix={stat.suffix} />
              </div>
              <div className={styles.label}>{stat.label}</div>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </Section>
  );
}
