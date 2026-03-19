import React, { useRef, useEffect } from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import Button from '@site/src/components/ui/Button';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import { useIntersectionObserver } from '@site/src/hooks/useIntersectionObserver';
import styles from './SkillStudioSection.module.css';

const FEATURES = [
  {
    title: 'BDD Assertions',
    desc: 'Define expected behavior with pass/fail assertions per test case.',
  },
  {
    title: 'A/B Benchmarks',
    desc: 'Compare Skill vs Base performance. Measure real impact.',
  },
  {
    title: 'Any LLM',
    desc: 'Claude, GPT, Gemini, Llama, Mistral — test against any model.',
  },
  {
    title: '100% Local',
    desc: 'Runs on your machine. No cloud dependency. Your data stays private.',
  },
] as const;

export default function SkillStudioSection() {
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
    <Section id="skill-studio">
      <SectionHeader
        label="Skill Quality"
        title="Skill Studio"
        subtitle="Test, benchmark, and optimize AI skills locally. Track quality across every iteration."
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
          muted
          loop
          playsInline
          preload="none"
        >
          <source src="https://verified-skill.com/video/skill-studio.mp4" type="video/mp4" />
          <source src="https://verified-skill.com/video/skill-studio.webm" type="video/webm" />
        </video>
      </div>
      <div className={styles.features}>
        {FEATURES.map((f, i) => (
          <AnimateOnScroll key={f.title} animation="fade-up" delay={i * 100}>
            <div className={styles.featureCard}>
              <div className={styles.featureTitle}>{f.title}</div>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
      <div className={styles.cta}>
        <Button variant="outline" href="https://verified-skill.com/studio">
          Try Skill Studio at verified-skill.com
        </Button>
      </div>
    </Section>
  );
}
