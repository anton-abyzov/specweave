import type {ReactNode} from 'react';
import styles from './Callouts.module.css';

interface CalloutProps {
  title?: string;
  children: ReactNode;
}

function CalloutIcon({type}: {type: 'note' | 'tip' | 'warning' | 'info'}) {
  const icons = {
    note: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    tip: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  };
  return <span className={styles.icon}>{icons[type]}</span>;
}

const defaultTitles = {
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
  info: 'Info',
};

function Callout({type, title, children}: CalloutProps & {type: 'note' | 'tip' | 'warning' | 'info'}) {
  return (
    <div className={`${styles.callout} ${styles[type]}`}>
      <div className={styles.header}>
        <CalloutIcon type={type} />
        <span className={styles.title}>{title || defaultTitles[type]}</span>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

export function Note({title, children}: CalloutProps) {
  return <Callout type="note" title={title}>{children}</Callout>;
}

export function Tip({title, children}: CalloutProps) {
  return <Callout type="tip" title={title}>{children}</Callout>;
}

export function Warning({title, children}: CalloutProps) {
  return <Callout type="warning" title={title}>{children}</Callout>;
}

export function Info({title, children}: CalloutProps) {
  return <Callout type="info" title={title}>{children}</Callout>;
}
