import React from 'react';
import { useIntersectionObserver } from '@site/src/hooks/useIntersectionObserver';
import { useReducedMotion } from '@site/src/hooks/useReducedMotion';
import styles from './AnimateOnScroll.module.css';

interface AnimateOnScrollProps {
  children: React.ReactNode;
  animation?: 'fade-up' | 'fade-in';
  delay?: number;
  className?: string;
}

export default function AnimateOnScroll({
  children,
  animation = 'fade-up',
  delay,
  className,
}: AnimateOnScrollProps) {
  const [ref, isIntersecting] = useIntersectionObserver(0.1);
  const prefersReducedMotion = useReducedMotion();

  const baseClass = animation === 'fade-in' ? styles.wrapperFadeIn : styles.wrapper;

  const wrapperClass = [
    prefersReducedMotion ? styles.noMotion : baseClass,
    isIntersecting && !prefersReducedMotion ? styles.visible : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={wrapperClass}
      style={delay && !prefersReducedMotion ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
