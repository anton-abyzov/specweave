import React from 'react';
import Badge from '@site/src/components/ui/Badge';
import styles from './ContentCard.module.css';

interface ContentCardProps {
  title: string;
  description: string;
  tag?: string;
  readingTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  href: string;
  image?: string;
  className?: string;
}

const difficultyVariant: Record<string, 'success' | 'warning' | 'primary'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'primary',
};

export default function ContentCard({
  title,
  description,
  tag,
  readingTime,
  difficulty,
  href,
  image,
  className,
}: ContentCardProps) {
  const classes = [styles.card, className].filter(Boolean).join(' ');

  return (
    <a href={href} className={classes}>
      {image && (
        <div className={styles.imageArea}>
          <img src={image} alt="" className={styles.image} />
        </div>
      )}
      <div className={styles.body}>
        {(readingTime || difficulty) && (
          <div className={styles.meta}>
            {readingTime && <span className={styles.readingTime}>{readingTime}</span>}
            {difficulty && (
              <Badge variant={difficultyVariant[difficulty]}>{difficulty}</Badge>
            )}
          </div>
        )}
        {tag && <span className={styles.tag}>{tag}</span>}
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>
    </a>
  );
}
