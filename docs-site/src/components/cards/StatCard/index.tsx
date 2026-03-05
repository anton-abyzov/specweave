import React from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  value: string | number;
  label: string;
  suffix?: string;
  className?: string;
}

export default function StatCard({ value, label, suffix, className }: StatCardProps) {
  const classes = [styles.card, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className={styles.value}>
        {value}
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}
