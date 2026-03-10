import React, { useState, useEffect } from 'react';
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
  // SSR + initial hydration: render visible. After mount, enable word-by-word
  // animation. Prevents text stuck at opacity:0 on uncached machines.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const shouldAnimate = hasMounted && !prefersReducedMotion;
  const words = text.split(' ');
  const totalDuration = 2000;
  const delayPerWord = words.length > 1 ? totalDuration / words.length : 0;

  return (
    <Tag ref={ref as React.Ref<never>} className={[styles.container, className].filter(Boolean).join(' ')}>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span
            className={[
              shouldAnimate ? styles.word : styles.noMotion,
              shouldAnimate && isIntersecting ? styles.wordVisible : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              shouldAnimate
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
