/**
 * Tests for skill-judge.ts model-version thinking guard (0669 Wave 1)
 *
 * Behavior under test:
 * - Opus 4.7+ models MUST NOT receive the Anthropic `thinking` API parameter
 *   (4.7 uses adaptive thinking triggered by a prompt hint, not a param).
 * - Legacy models still receive `thinking` when the user opts into the legacy
 *   thinkingBudget (`quality.thinkingBudget === "legacy"`).
 */

import { describe, it, expect } from 'vitest';
import {
  isOpus47Family,
  buildJudgeApiRequest,
} from '../../../../src/core/skills/skill-judge.js';

describe('model-version thinking guard', () => {
  it('isOpus47Family returns true for Opus 4.7 model IDs', () => {
    expect(isOpus47Family('claude-opus-4-7')).toBe(true);
    expect(isOpus47Family('claude-opus-4-7-20260101')).toBe(true);
    expect(isOpus47Family('claude-opus-4-8')).toBe(true);
    expect(isOpus47Family('claude-opus-5-0')).toBe(true);
  });

  it('isOpus47Family returns false for legacy model IDs', () => {
    expect(isOpus47Family('claude-opus-4-5')).toBe(false);
    expect(isOpus47Family('claude-opus-4-6-20250801')).toBe(false);
    expect(isOpus47Family('claude-opus-3-5')).toBe(false);
    expect(isOpus47Family('opus')).toBe(false);
  });

  it('omits thinking parameter for opus-4-7 family models', () => {
    const request = buildJudgeApiRequest({
      model: 'claude-opus-4-7-20260101',
      system: 'system-prompt',
      userPrompt: 'user-prompt',
      maxTokens: 2000,
      thinkingBudget: 'adaptive',
    });
    expect(request).not.toHaveProperty('thinking');
    expect(request.model).toBe('claude-opus-4-7-20260101');
  });

  it('includes thinking parameter for legacy models when thinkingBudget is legacy', () => {
    const request = buildJudgeApiRequest({
      model: 'claude-opus-4-6-20250801',
      system: 'system-prompt',
      userPrompt: 'user-prompt',
      maxTokens: 2000,
      thinkingBudget: 'legacy',
    });
    expect(request).toHaveProperty('thinking');
  });

  it('omits thinking parameter for legacy models when thinkingBudget is adaptive', () => {
    const request = buildJudgeApiRequest({
      model: 'claude-opus-4-6-20250801',
      system: 'system-prompt',
      userPrompt: 'user-prompt',
      maxTokens: 2000,
      thinkingBudget: 'adaptive',
    });
    expect(request).not.toHaveProperty('thinking');
  });

  it('omits thinking parameter for 4.7 even if thinkingBudget is legacy', () => {
    const request = buildJudgeApiRequest({
      model: 'claude-opus-4-7-20260101',
      system: 'system-prompt',
      userPrompt: 'user-prompt',
      maxTokens: 2000,
      thinkingBudget: 'legacy',
    });
    expect(request).not.toHaveProperty('thinking');
  });
});
