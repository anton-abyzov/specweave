import React, { useState, useEffect } from 'react';
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
  // SSR + initial hydration: render visible (noMotion). After mount, enable
  // animation classes. This prevents content stuck at opacity:0 when the
  // async IntersectionObserver callback races with hydration.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  const shouldAnimate = hasMounted && !prefersReducedMotion;
  const baseClass = animation === 'fade-in' ? styles.wrapperFadeIn : styles.wrapper;

  const wrapperClass = [
    shouldAnimate ? baseClass : styles.noMotion,
    shouldAnimate && isIntersecting ? styles.visible : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={wrapperClass}
      style={delay && shouldAnimate ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
