import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import CountUp from '@site/src/components/animation/CountUp';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './ShowcaseSection.module.css';

const APP_STORE_APPS = [
  {
    name: 'SketchMate',
    tagline: 'AI Draw Game',
    url: 'https://apps.apple.com/app/sketchmate-ai-draw-game/id6760250072',
    web: 'https://sketchmate.net/',
    favicon: 'sketchmate.net',
  },
  {
    name: 'Lulla',
    tagline: 'Calm Baby Anywhere',
    url: 'https://apps.apple.com/app/lulla-calm-baby-anywhere/id6756977992',
    web: 'https://lulla-app.pages.dev/',
    favicon: 'lulla-app.pages.dev',
  },
  {
    name: 'Football 2026',
    tagline: 'World Cup Travel',
    url: 'https://apps.apple.com/app/football-2026-travel/id6757258711',
    web: 'https://wc-26.net/',
    favicon: 'wc-26.net',
  },
  {
    name: 'SkillUp Football',
    tagline: 'Coach & Train',
    url: 'https://apps.apple.com/app/skillup-football/id6756978002',
    web: 'https://skillup-football.com/',
    favicon: 'skillup-football.com',
  },
  {
    name: 'BizZone',
    tagline: 'Business Events',
    url: 'https://apps.apple.com/app/business-zone/id6756091030',
    favicon: 'apps.apple.com',
  },
] as const;

const WEB_APPS = [
  {
    name: 'EasyChamp',
    tagline: '20+ microservices, 4 years in production',
    url: 'https://easychamp.com',
    favicon: 'easychamp.com',
  },
  {
    name: 'JobWeave',
    tagline: 'AI job search & resume optimization',
    url: 'https://jobweave.ai',
    favicon: 'jobweave.ai',
  },
  {
    name: 'EduFeed',
    tagline: 'AI learning platform',
    url: 'https://edufeed-jet.vercel.app/',
    favicon: 'edufeed-jet.vercel.app',
  },
] as const;

const DEV_TOOLS = [
  {
    name: 'SpecWeave',
    tagline: '600+ increments, built with itself',
    url: 'https://github.com/anton-abyzov/specweave',
    favicon: 'github.com',
  },
  {
    name: 'vskill',
    tagline: 'AI skills package manager',
    url: 'https://github.com/anton-abyzov/vskill',
    favicon: 'github.com',
  },
  {
    name: 'verified-skill.com',
    tagline: '105K+ verified skills marketplace',
    url: 'https://verified-skill.com',
    favicon: 'verified-skill.com',
  },
] as const;

const STATS = [
  { target: 600, suffix: '+', label: 'Increments' },
  { target: 538, suffix: '+', label: 'npm Releases' },
  { target: 12, suffix: '', label: 'Production Projects' },
] as const;

type App = { name: string; tagline: string; url: string; favicon: string; web?: string };

function AppTile({ app, delay }: { app: App; delay: number }) {
  return (
    <AnimateOnScroll animation="fade-up" delay={delay}>
      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.tile}
      >
        <img
          src={`https://www.google.com/s2/favicons?domain=${app.favicon}&sz=64`}
          alt={app.name}
          className={styles.tileFavicon}
          width={32}
          height={32}
          loading="lazy"
        />
        <div className={styles.tileText}>
          <span className={styles.tileName}>{app.name}</span>
          <span className={styles.tileTagline}>{app.tagline}</span>
        </div>
      </a>
    </AnimateOnScroll>
  );
}

export default function ShowcaseSection() {
  return (
    <Section variant="gradient">
      <SectionHeader
        title="Built With SpecWeave"
        subtitle="12 production projects shipped in 3 months. 5 in the App Store."
      />

      <div className={styles.group}>
        <h4 className={styles.groupLabel}>App Store</h4>
        <div className={styles.tiles}>
          {APP_STORE_APPS.map((app, i) => (
            <AppTile key={app.name} app={app} delay={i * 50} />
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <h4 className={styles.groupLabel}>Web Platforms</h4>
        <div className={styles.tiles}>
          {WEB_APPS.map((app, i) => (
            <AppTile key={app.name} app={app} delay={i * 50} />
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <h4 className={styles.groupLabel}>Developer Tools</h4>
        <div className={styles.tiles}>
          {DEV_TOOLS.map((app, i) => (
            <AppTile key={app.name} app={app} delay={i * 50} />
          ))}
        </div>
      </div>

      <AnimateOnScroll animation="fade-up" delay={100}>
        <p className={styles.selfRef}>
          SpecWeave builds SpecWeave — every feature spec'd through increments.{' '}
          <a
            href="https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.browseLink}
          >
            Browse 600+ increments on GitHub &rarr;
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
