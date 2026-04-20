/**
 * Tests for prompt-renderer — validates the one-line nudge format
 * (AC-US3-01) and deterministic preference between refinement and
 * learning suggestions.
 */

import { describe, expect, it } from 'vitest';
import { renderNudgePrompt } from './prompt-renderer.js';
import type { SkillSuggestion } from './aggregator.js';

function suggestion(partial: Partial<SkillSuggestion> & { slug: string; totalCount: number }): SkillSuggestion {
  return {
    slug: partial.slug,
    totalCount: partial.totalCount,
    countsBySource: partial.countsBySource ?? { 'judge-llm': partial.totalCount, rubric: 0, 'code-reviewer': 0 },
    highestSeverity: partial.highestSeverity ?? 'medium',
    severityScore: partial.severityScore ?? 2,
    lastDetectedAt: partial.lastDetectedAt ?? '2026-04-20T10:00:00Z',
    sampleEvidence: partial.sampleEvidence ?? 'sample',
  };
}

describe('renderNudgePrompt', () => {
  it('returns null when neither refinement nor learning is present', () => {
    const result = renderNudgePrompt({ topRefinement: null, hasHighConfidenceLearning: false });
    expect(result).toBeNull();
  });

  it('renders refinement suggestion in (y/N) format (AC-US3-01)', () => {
    const result = renderNudgePrompt({
      topRefinement: suggestion({ slug: 'sw:architect', totalCount: 4 }),
      hasHighConfidenceLearning: false,
    });
    expect(result).toBe('Detected: sw:architect (4 signals) — run `sw:skill-refine sw:architect`? (y/N)');
  });

  it('uses singular "signal" for totalCount=1', () => {
    const result = renderNudgePrompt({
      topRefinement: suggestion({ slug: 'sw:pm', totalCount: 1 }),
      hasHighConfidenceLearning: false,
    });
    expect(result).toBe('Detected: sw:pm (1 signal) — run `sw:skill-refine sw:pm`? (y/N)');
  });

  it('prefers refinement over learning when both detected (deterministic)', () => {
    const refinement = renderNudgePrompt({
      topRefinement: suggestion({ slug: 'sw:architect', totalCount: 2 }),
      hasHighConfidenceLearning: true,
    });
    expect(refinement).toContain('sw:skill-refine sw:architect');
    expect(refinement).not.toContain('sw:reflect');
  });

  it('falls through to learning prompt when no refinement present', () => {
    const result = renderNudgePrompt({
      topRefinement: null,
      hasHighConfidenceLearning: true,
    });
    expect(result).toBe('Detected: new learning worth persisting — run `sw:reflect`? (y/N)');
  });

  it('ends with (y/N) — default is No (AC-US3-01, AC-US3-03)', () => {
    const result = renderNudgePrompt({
      topRefinement: suggestion({ slug: 'sw:architect', totalCount: 3 }),
      hasHighConfidenceLearning: false,
    });
    expect(result!.endsWith('(y/N)')).toBe(true);
  });
});
