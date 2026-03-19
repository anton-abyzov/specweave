import React from 'react';
import Icon from '@site/src/components/ui/Icon';
import Section from '@site/src/components/layout/Section';
import styles from './TrustedBySection.module.css';

const BRANDS = [
  { brand: 'github', label: 'GitHub' },
  { brand: 'jira', label: 'JIRA' },
  { brand: 'claude', label: 'Claude' },
  { brand: 'cursor', label: 'Cursor' },
  { brand: 'azure', label: 'Azure DevOps' },
  { brand: 'copilot', label: 'Copilot' },
  { brand: 'windsurf', label: 'Windsurf' },
  { brand: 'linear', label: 'Linear' },
  { brand: 'discord', label: 'Discord' },
] as const;

export default function TrustedBySection() {
  return (
    <Section>
      <p className={styles.label}>Works with your stack</p>
      <div className={styles.marqueeContainer}>
        <div className={styles.marqueeTrack}>
          {[...BRANDS, ...BRANDS].map((b, i) => (
            <div key={i} className={styles.logoItem}>
              <Icon brand={b.brand} size={32} />
              <span className={styles.logoLabel}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
