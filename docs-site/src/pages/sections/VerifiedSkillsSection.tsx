import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import Badge from '@site/src/components/ui/Badge';
import Icon from '@site/src/components/ui/Icon';
import Button from '@site/src/components/ui/Button';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './VerifiedSkillsSection.module.css';

const TIERS = [
  {
    icon: 'search',
    badge: 'default' as const,
    name: 'Scanned',
    description: 'Automated security scan. Basic safety checks and dependency analysis.',
  },
  {
    icon: 'shield',
    badge: 'warning' as const,
    name: 'Verified',
    description: 'Manual code review by the SpecWeave team. Tested for safety and quality.',
  },
  {
    icon: 'check',
    badge: 'success' as const,
    name: 'Certified',
    description: 'Full audit, compliance checks, and ongoing monitoring. Enterprise-ready.',
  },
] as const;

export default function VerifiedSkillsSection() {
  return (
    <Section variant="dark">
      <SectionHeader
        label="Trust & Security"
        title="Three-Tier Skill Verification"
        subtitle="Every skill passes through a trust ladder before reaching your codebase."
      />
      <div className={styles.tiers}>
        {TIERS.map((tier, i) => (
          <AnimateOnScroll key={tier.name} animation="fade-up" delay={i * 150}>
            <div className={styles.tierCard}>
              <div className={styles.tierIcon}>
                <Icon name={tier.icon} size={32} />
              </div>
              <Badge variant={tier.badge}>{tier.name}</Badge>
              <p className={styles.tierDesc}>{tier.description}</p>
            </div>
            {i < TIERS.length - 1 && (
              <div className={styles.arrow} aria-hidden="true">
                <Icon name="chevron-right" size={20} />
              </div>
            )}
          </AnimateOnScroll>
        ))}
      </div>
      <div className={styles.cta}>
        <Button variant="outline" href="https://verified-skill.com">
          Learn more at verified-skill.com
        </Button>
      </div>
    </Section>
  );
}
