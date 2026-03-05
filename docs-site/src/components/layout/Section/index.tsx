import React from 'react';
import styles from './Section.module.css';

interface SectionProps {
  variant?: 'default' | 'dark' | 'gradient' | 'accent';
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export default function Section({
  variant = 'default',
  children,
  className,
  id,
}: SectionProps) {
  const classes = [styles.section, styles[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes} id={id}>
      <div className={styles.container}>{children}</div>
    </section>
  );
}
