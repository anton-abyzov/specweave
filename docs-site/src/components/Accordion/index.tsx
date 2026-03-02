import type {ReactNode} from 'react';
import styles from './Accordion.module.css';

interface AccordionProps {
  title: string;
  children: ReactNode;
}

export function Accordion({title, children}: AccordionProps) {
  return (
    <details className={styles.accordion}>
      <summary className={styles.summary}>
        <span className={styles.summaryText}>{title}</span>
        <svg className={styles.chevron} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </summary>
      <div className={styles.content}>{children}</div>
    </details>
  );
}

interface AccordionGroupProps {
  children: ReactNode;
}

export function AccordionGroup({children}: AccordionGroupProps) {
  return <div className={styles.group}>{children}</div>;
}
