import type {ReactNode} from 'react';
import styles from './Steps.module.css';

interface StepProps {
  title: string;
  children: ReactNode;
}

export function Step({title, children}: StepProps) {
  return (
    <div className={styles.step}>
      <div className={styles.stepIndicator}>
        <div className={styles.stepCircle} />
        <div className={styles.stepLine} />
      </div>
      <div className={styles.stepContent}>
        <h4 className={styles.stepTitle}>{title}</h4>
        <div className={styles.stepBody}>{children}</div>
      </div>
    </div>
  );
}

interface StepsProps {
  children: ReactNode;
}

export function Steps({children}: StepsProps) {
  return <div className={styles.steps}>{children}</div>;
}
