import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import Icon from '@site/src/components/ui/Icon';
import Button from '@site/src/components/ui/Button';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './TopSkillsSection.module.css';

const SKILLS = [
  {
    icon: 'users',
    name: 'Team Lead',
    description: 'Parallel multi-agent orchestration with contract-first spawning',
    url: 'https://verified-skill.com/docs/reference/skills#team-lead',
  },
  {
    icon: 'search',
    name: 'Code Reviewer',
    description: '6 specialized reviewers running in parallel — logic, security, performance',
    url: 'https://verified-skill.com/docs/reference/skills#code-reviewer',
  },
  {
    icon: 'refresh-cw',
    name: 'TDD Cycle',
    description: 'Strict RED-GREEN-REFACTOR enforcement with coverage gates',
    url: 'https://verified-skill.com/docs/reference/skills#tdd-cycle',
  },
  {
    icon: 'smartphone',
    name: 'App Store Publisher',
    description: 'End-to-end App Store Connect — build, TestFlight, submit, screenshots',
    url: 'https://verified-skill.com/skills/anton-abyzov/vskill/appstore',
  },
  {
    icon: 'film',
    name: 'Remotion',
    description: 'Programmatic video from React components — demos, marketing, data viz',
    url: 'https://verified-skill.com/skills/remotion-dev/skills/remotion-best-practices',
  },
  {
    icon: 'share-2',
    name: 'Social Media',
    description: 'Cross-platform posting across 11 channels with AI image generation',
    url: 'https://verified-skill.com/docs/reference/skills#social-media-posting',
  },
  {
    icon: 'layers',
    name: 'Architect',
    description: 'System design, ADRs, trade-off analysis, component diagrams',
    url: 'https://verified-skill.com/docs/reference/skills#architect',
  },
  {
    icon: 'check-circle',
    name: 'E2E Testing',
    description: 'Playwright tests traced to spec acceptance criteria',
    url: 'https://verified-skill.com/docs/reference/skills#e2e',
  },
] as const;

export default function TopSkillsSection() {
  return (
    <Section>
      <SectionHeader
        label="Skills Ecosystem"
        title="100+ Skills. Every Domain."
        subtitle="From planning to deployment — battle-tested skills for the full development lifecycle."
      />

      <div className={styles.grid}>
        {SKILLS.map((skill, i) => (
          <AnimateOnScroll key={skill.name} animation="fade-up" delay={i * 60}>
            <a
              href={skill.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
            >
              <div className={styles.iconCircle}>
                <Icon name={skill.icon} size={20} />
              </div>
              <h3 className={styles.skillName}>{skill.name}</h3>
              <p className={styles.skillDesc}>{skill.description}</p>
            </a>
          </AnimateOnScroll>
        ))}
      </div>

      <div className={styles.cta}>
        <Button
          variant="outline"
          href="https://verified-skill.com"
        >
          Browse all skills on verified-skill.com
        </Button>
      </div>
    </Section>
  );
}
