import React from 'react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export default function SectionHeader({
  label,
  title,
  subtitle,
  centered = true,
  className,
}: SectionHeaderProps) {
  const classes = [styles.header, centered ? styles.centered : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {label && <span className={styles.label}>{label}</span>}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
