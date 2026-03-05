import React, { useState, useEffect, useRef } from 'react';
import { useIntersectionObserver } from '@site/src/hooks/useIntersectionObserver';
import { useReducedMotion } from '@site/src/hooks/useReducedMotion';

interface CountUpProps {
  target: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export default function CountUp({
  target,
  duration = 2000,
  suffix = '',
  prefix = '',
  className,
}: CountUpProps) {
  const [ref, isIntersecting] = useIntersectionObserver(0.1);
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isIntersecting || hasAnimated.current || prefersReducedMotion) return;
    hasAnimated.current = true;

    let start: number | null = null;
    let rafId: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isIntersecting, target, duration, prefersReducedMotion]);

  const displayValue = prefersReducedMotion ? target : value;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
