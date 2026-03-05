import React from 'react';
import { useIntersectionObserver } from '@site/src/hooks/useIntersectionObserver';
import { useReducedMotion } from '@site/src/hooks/useReducedMotion';
import styles from './WordAnimation.module.css';

interface WordAnimationProps {
  text: string;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export default function WordAnimation({
  text,
  className,
  as: Tag = 'span',
}: WordAnimationProps) {
  const [ref, isIntersecting] = useIntersectionObserver(0.1);
  const prefersReducedMotion = useReducedMotion();
  const words = text.split(' ');
  const totalDuration = 2000;
  const delayPerWord = words.length > 1 ? totalDuration / words.length : 0;

  return (
    <Tag ref={ref as React.Ref<never>} className={[styles.container, className].filter(Boolean).join(' ')}>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span
            className={[
              prefersReducedMotion ? styles.noMotion : styles.word,
              isIntersecting && !prefersReducedMotion ? styles.wordVisible : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              !prefersReducedMotion
                ? { transitionDelay: `${Math.round(i * delayPerWord)}ms` }
                : undefined
            }
          >
            {word}
          </span>
          {i < words.length - 1 && <span className={styles.space}> </span>}
        </React.Fragment>
      ))}
    </Tag>
  );
}
