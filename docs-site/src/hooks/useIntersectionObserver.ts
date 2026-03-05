import { useState, useCallback, useRef } from 'react';

export function useIntersectionObserver(
  threshold = 0.1,
): [callback: (node: HTMLElement | null) => void, isIntersecting: boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
        return;
      }

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observerRef.current?.unobserve(entry.target);
          }
        },
        { threshold },
      );

      observerRef.current.observe(node);
    },
    [threshold],
  );

  return [ref, isIntersecting];
}
