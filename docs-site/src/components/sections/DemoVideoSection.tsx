import React, { useRef, useEffect } from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import { useIntersectionObserver } from '@site/src/hooks/useIntersectionObserver';
import styles from './DemoVideoSection.module.css';

export default function DemoVideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [observerRef, isVisible] = useIntersectionObserver(0.3);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isVisible) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isVisible]);

  return (
    <Section id="demo">
      <SectionHeader
        label="See It in Action"
        title="Ship While You Sleep"
        subtitle="Watch SpecWeave plan, build, test, and ship a feature autonomously."
      />
      <div
        ref={observerRef as React.Ref<HTMLDivElement>}
        className={styles.frame}
      >
        <div className={styles.chromeBar}>
          <span className={styles.dot} data-color="red" />
          <span className={styles.dot} data-color="yellow" />
          <span className={styles.dot} data-color="green" />
        </div>
        <video
          ref={videoRef}
          className={styles.video}
          controls
          muted
          loop
          playsInline
          preload="none"
          poster="/video/ship-while-you-sleep-poster.jpg?v=4"
        >
          <source src="/video/ship-while-you-sleep.mp4?v=4" type="video/mp4" />
        </video>
      </div>
    </Section>
  );
}
