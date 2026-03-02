import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import styles from './CardGroup.module.css';

interface CardProps {
  title: string;
  href?: string;
  icon?: string;
  children: ReactNode;
}

export function Card({title, href, icon, children}: CardProps) {
  const content = (
    <>
      {icon && <span className={styles.cardIcon}>{icon}</span>}
      <h4 className={styles.cardTitle}>{title}</h4>
      <div className={styles.cardBody}>{children}</div>
      {href && <span className={styles.cardArrow}>&#8594;</span>}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={styles.card}>
        {content}
      </Link>
    );
  }

  return <div className={styles.card}>{content}</div>;
}

interface CardGroupProps {
  cols?: 2 | 3 | 4;
  children: ReactNode;
}

export function CardGroup({cols = 2, children}: CardGroupProps) {
  return (
    <div className={styles.cardGroup} style={{'--card-cols': cols} as React.CSSProperties}>
      {children}
    </div>
  );
}
