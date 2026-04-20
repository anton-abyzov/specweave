import { describe, it, expect, vi } from 'vitest';
import { runApprovalFlow, type PromptFns } from './approval';

function makeCtx() {
  return {
    targetSkill: 'sw:architect',
    rationale: 'tighten scope defaults',
    diff: '--- a/SKILL.md\n+++ b/SKILL.md\n@@\n-bad\n+good\n',
  };
}

describe('runApprovalFlow', () => {
  it('approve → returns approve with unchanged diff', async () => {
    const prompts: PromptFns = {
      chooseAction: vi.fn(async () => 'approve'),
      askRejectionReason: vi.fn(),
      editDiff: vi.fn(),
    };
    const res = await runApprovalFlow(makeCtx(), prompts);
    expect(res).toEqual({ action: 'approve', diff: makeCtx().diff });
    expect(prompts.askRejectionReason).not.toHaveBeenCalled();
    expect(prompts.editDiff).not.toHaveBeenCalled();
  });

  it('reject → returns reject with user reason', async () => {
    const prompts: PromptFns = {
      chooseAction: vi.fn(async () => 'reject'),
      askRejectionReason: vi.fn(async () => 'violates ADR-0671-04'),
      editDiff: vi.fn(),
    };
    const res = await runApprovalFlow(makeCtx(), prompts);
    expect(res).toEqual({ action: 'reject', reason: 'violates ADR-0671-04' });
  });

  it('reject with empty reason → falls back to generic string', async () => {
    const prompts: PromptFns = {
      chooseAction: vi.fn(async () => 'reject'),
      askRejectionReason: vi.fn(async () => ''),
      editDiff: vi.fn(),
    };
    const res = await runApprovalFlow(makeCtx(), prompts);
    expect(res.action).toBe('reject');
    if (res.action === 'reject') expect(res.reason).toBe('user rejected diff');
  });

  it('edit → then approve returns the edited diff', async () => {
    const choose = vi
      .fn()
      .mockResolvedValueOnce('edit')
      .mockResolvedValueOnce('approve');
    const edit = vi.fn(async () => 'EDITED DIFF');
    const prompts: PromptFns = {
      chooseAction: choose,
      askRejectionReason: vi.fn(),
      editDiff: edit,
    };
    const res = await runApprovalFlow(makeCtx(), prompts);
    expect(res).toEqual({ action: 'approve', diff: 'EDITED DIFF' });
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it('edit → edit → reject path works', async () => {
    const choose = vi
      .fn()
      .mockResolvedValueOnce('edit')
      .mockResolvedValueOnce('edit')
      .mockResolvedValueOnce('reject');
    const edit = vi
      .fn()
      .mockResolvedValueOnce('v1')
      .mockResolvedValueOnce('v2');
    const prompts: PromptFns = {
      chooseAction: choose,
      askRejectionReason: vi.fn(async () => 'changed my mind'),
      editDiff: edit,
    };
    const res = await runApprovalFlow(makeCtx(), prompts);
    expect(res).toEqual({ action: 'reject', reason: 'changed my mind' });
  });

  it('auto-rejects when edit loop exceeds maxEditLoops', async () => {
    const choose = vi.fn(async () => 'edit');
    const edit = vi.fn(async () => 'x');
    const prompts: PromptFns = {
      chooseAction: choose,
      askRejectionReason: vi.fn(),
      editDiff: edit,
    };
    const res = await runApprovalFlow(makeCtx(), prompts, { maxEditLoops: 2 });
    expect(res.action).toBe('reject');
    if (res.action === 'reject') {
      expect(res.reason).toMatch(/edit limit/);
    }
    // 2 successful edits + one final edit-choice that trips the guard
    expect(edit).toHaveBeenCalledTimes(2);
    expect(choose).toHaveBeenCalledTimes(3);
  });
});
