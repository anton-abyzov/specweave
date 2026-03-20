import React from 'react';
import Section from '@site/src/components/layout/Section';
import SectionHeader from '@site/src/components/layout/SectionHeader';
import AnimateOnScroll from '@site/src/components/animation/AnimateOnScroll';
import styles from './WhySpecFirstSection.module.css';

const CAPABILITIES = [
  'Structured Specs',
  'Quality Gates',
  'Autonomous Execution',
  'Agent Teams',
  'External Sync',
  'TDD Enforcement',
] as const;

const COMPETITORS = [
  { name: 'Cursor Rules', caps: [false, false, false, false, false, false] },
  { name: 'Copilot Instructions', caps: [false, false, false, false, false, false] },
  { name: 'Windsurf Rules', caps: [false, false, false, false, false, false] },
  { name: 'CLAUDE.md (raw)', caps: [false, false, false, false, false, false] },
  { name: 'Vibe Coding', caps: [false, false, false, false, false, false] },
  { name: 'SpecWeave', caps: [true, true, true, true, true, true] },
] as const;

export default function WhySpecFirstSection() {
  return (
    <Section>
      <SectionHeader
        label="Why Spec-First"
        title="Beyond Instruction Files"
        subtitle="Every competitor is an instruction layer. SpecWeave is a full development lifecycle."
      />

      <AnimateOnScroll animation="fade-up" delay={100}>
        <div className={styles.explainer}>
          <p>
            In May 2025, researchers found that 170 out of 1,645 apps built with vibe coding
            had security vulnerabilities exposing user data. No specs. No tests. No review.
          </p>
          <p>
            SpecWeave takes the opposite approach. Every feature starts as a specification —
            user stories, acceptance criteria, architecture decisions — before a single line
            of code is written. The AI builds autonomously against that spec for hours.
            TDD enforces correctness. Quality gates catch what tests miss.
          </p>
          <p className={styles.proof}>
            This isn't theory. SpecWeave was built with SpecWeave — 636+ structured increments.
            SketchMate and Lulla shipped to the App Store. Structure isn't overhead.
            It's the multiplier that makes autonomous AI development actually work.
          </p>
        </div>
      </AnimateOnScroll>

      <AnimateOnScroll animation="fade-up" delay={200}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.capHeader}>Capability</th>
                {COMPETITORS.map((c) => (
                  <th
                    key={c.name}
                    className={
                      c.name === 'SpecWeave'
                        ? styles.headerHighlight
                        : styles.header
                    }
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap, i) => (
                <tr key={cap}>
                  <td className={styles.capCell}>{cap}</td>
                  {COMPETITORS.map((c) => (
                    <td
                      key={c.name}
                      className={
                        c.name === 'SpecWeave' ? styles.cellHighlight : styles.cell
                      }
                    >
                      {c.caps[i] ? (
                        <span className={styles.check}>&#10003;</span>
                      ) : (
                        <span className={styles.dash}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnimateOnScroll>
    </Section>
  );
}
