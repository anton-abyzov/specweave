import React from 'react';
import Icon from '@site/src/components/ui/Icon';
import styles from './IntegrationCard.module.css';

interface IntegrationCardProps {
  brand: string;
  name: string;
  description: string;
  href?: string;
  className?: string;
}

export default function IntegrationCard({
  brand,
  name,
  description,
  href,
  className,
}: IntegrationCardProps) {
  const classes = [styles.card, className].filter(Boolean).join(' ');

  const content = (
    <>
      <div className={styles.logo}>
        <Icon brand={brand} size={56} />
      </div>
      <h3 className={styles.name}>{name}</h3>
      <p className={styles.description}>{description}</p>
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return <div className={classes}>{content}</div>;
}
