import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import ContentCard from '@site/src/components/cards/ContentCard';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './AcademyPromoSection.module.css';

const COURSES = [
  {
    title: 'Software Engineering Fundamentals',
    description:
      'Core concepts every developer needs. Backend, frontend, testing, security, and infrastructure foundations.',
    difficulty: 'beginner' as const,
    readingTime: '15 min',
    href: '/docs/academy/fundamentals/',
  },
  {
    title: 'SpecWeave Essentials',
    description:
      '16 hands-on lessons from first command to production workflows. Learn by building real projects.',
    difficulty: 'intermediate' as const,
    readingTime: '25 min',
    href: '/docs/academy/specweave-essentials/',
  },
  {
    title: 'Public Talks & Deep Dives',
    description:
      'Video talks covering skills, plugins, marketplaces, and advanced spec-driven development patterns.',
    difficulty: 'advanced' as const,
    readingTime: '45 min',
    href: '/docs/academy/talks/',
  },
] as const;

export default function AcademyPromoSection() {
  return (
    <Section variant="dark">
      <SectionHeader
        label="Academy"
        title="Learn SpecWeave from Zero to Production"
        subtitle="Structured learning paths for every skill level."
      />
      <div className={styles.grid}>
        {COURSES.map((course, i) => (
          <AnimateOnScroll key={course.title} animation="fade-up" delay={i * 100}>
            <ContentCard
              title={course.title}
              description={course.description}
              difficulty={course.difficulty}
              readingTime={course.readingTime}
              href={course.href}
            />
          </AnimateOnScroll>
        ))}
      </div>
    </Section>
  );
}
