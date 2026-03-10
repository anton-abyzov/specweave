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

      // Synchronous viewport check: elements already visible don't need the
      // async observer callback, which can race with hydration and leave
      // above-the-fold content stuck at opacity 0.
      const rect = node.getBoundingClientRect();
      if (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      ) {
        setIsIntersecting(true);
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
