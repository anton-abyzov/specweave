import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import CountUp from '@site/src/components/animation/CountUp';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './ShowcaseSection.module.css';

const APPS = [
  {
    name: 'SketchMate',
    description: 'Drawing & creativity app',
    platform: 'App Store',
    date: 'Mar 2026',
  },
  {
    name: 'Lulla',
    description: 'Sleep & wellness app',
    platform: 'App Store',
    date: 'Mar 2026',
  },
] as const;

const STATS = [
  { target: 636, suffix: '+', label: 'Increments' },
  { target: 538, suffix: '+', label: 'Releases' },
  { target: 3200, suffix: '+', label: 'Commits' },
] as const;

export default function ShowcaseSection() {
  return (
    <Section variant="gradient">
      <SectionHeader
        title="Built With SpecWeave"
        subtitle="Real apps. Real users. Real stores."
      />

      <div className={styles.apps}>
        {APPS.map((app, i) => (
          <AnimateOnScroll key={app.name} animation="fade-up" delay={i * 100}>
            <div className={styles.appCard}>
              <div className={styles.appIcon}>{app.name[0]}</div>
              <div className={styles.appInfo}>
                <h3 className={styles.appName}>{app.name}</h3>
                <p className={styles.appDesc}>{app.description}</p>
                <span className={styles.appBadge}>
                  {app.platform} &middot; {app.date}
                </span>
              </div>
            </div>
          </AnimateOnScroll>
        ))}
      </div>

      <AnimateOnScroll animation="fade-up" delay={200}>
        <p className={styles.selfRef}>
          SpecWeave builds SpecWeave — 636+ structured increments, every one
          documented.{' '}
          <a
            href="https://github.com/anton-abyzov/specweave"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.browseLink}
          >
            Browse them on GitHub &rarr;
          </a>
        </p>
      </AnimateOnScroll>

      <div className={styles.statsRow}>
        {STATS.map((stat, i) => (
          <AnimateOnScroll key={stat.label} animation="fade-up" delay={i * 80}>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                <CountUp target={stat.target} suffix={stat.suffix} />
              </div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </Section>
  );
}
