import React from 'react';
import Icon from '@site/src/components/ui/Icon';
import styles from './FeatureCard.module.css';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  className?: string;
}

export default function FeatureCard({ icon, title, description, className }: FeatureCardProps) {
  const classes = [styles.card, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className={styles.iconArea}>
        <Icon name={icon} size={28} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
