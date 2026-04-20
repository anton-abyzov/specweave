/**
 * Interactive approve/reject/edit prompt for `sw:skill-refine`.
 *
 * The user is shown the proposed diff + rationale and chooses one of:
 * - **approve**: the caller applies the diff verbatim.
 * - **reject**: the caller records a rejection (with reason) in the ledger;
 *   no SKILL.md write happens.
 * - **edit**: the user's `$EDITOR` opens on the diff so they can hand-tune
 *   it before re-prompting for approval. Rejection during edit path is also
 *   honored.
 *
 * The `promptFns` param lets tests inject deterministic behavior; in
 * production we default to `@inquirer/prompts` (already used elsewhere in
 * specweave for wizard UI).
 *
 * @module core/skill-refine/approval
 */

import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';

export type Decision =
  | { action: 'approve'; diff: string }
  | { action: 'reject'; reason: string }
  | { action: 'edit'; diff: string };

export interface ApprovalPromptContext {
  targetSkill: string;
  rationale: string;
  diff: string;
}

export interface PromptFns {
  /** Presents the approve/reject/edit menu. */
  chooseAction: (ctx: ApprovalPromptContext) => Promise<'approve' | 'reject' | 'edit'>;
  /** Prompted only when user picked 'reject'. */
  askRejectionReason: () => Promise<string>;
  /** Prompted only when user picked 'edit'; returns the new diff text. */
  editDiff: (original: string) => Promise<string>;
}

export interface ApprovalOptions {
  /** Max edit→re-ask loops before forcing a final decision. Default 3. */
  maxEditLoops?: number;
}

const DEFAULT_MAX_EDIT_LOOPS = 3;

/**
 * Drive the approval flow. Returns a terminal decision:
 * `{action:'approve', diff}` (the final, possibly-edited diff) OR
 * `{action:'reject', reason}`.
 *
 * If the user loops through edits more than `maxEditLoops` without approving,
 * the loop terminates as a rejection with an auto-reason so we never hang.
 */
export async function runApprovalFlow(
  ctx: ApprovalPromptContext,
  prompts: PromptFns,
  opts: ApprovalOptions = {},
): Promise<{ action: 'approve'; diff: string } | { action: 'reject'; reason: string }> {
  const maxLoops = opts.maxEditLoops ?? DEFAULT_MAX_EDIT_LOOPS;
  let currentDiff = ctx.diff;
  let edits = 0;

  while (true) {
    const action = await prompts.chooseAction({
      targetSkill: ctx.targetSkill,
      rationale: ctx.rationale,
      diff: currentDiff,
    });

    if (action === 'approve') {
      return { action: 'approve', diff: currentDiff };
    }
    if (action === 'reject') {
      const reason = await prompts.askRejectionReason();
      return { action: 'reject', reason: reason || 'user rejected diff' };
    }

    // edit path
    if (edits >= maxLoops) {
      return {
        action: 'reject',
        reason: `auto-rejected: edit limit (${maxLoops}) exceeded without approval`,
      };
    }
    currentDiff = await prompts.editDiff(currentDiff);
    edits += 1;
  }
}

/**
 * Default production prompts backed by `@inquirer/prompts` + `$EDITOR`.
 * Lazy-imported so tests that use stubs don't pay the dep cost.
 */
export async function defaultPromptFns(): Promise<PromptFns> {
  const { select, input } = await import('@inquirer/prompts');

  return {
    chooseAction: async (ctx) => {
      // eslint-disable-next-line no-console
      console.log(`\n── sw:skill-refine — ${ctx.targetSkill} ──`);
      // eslint-disable-next-line no-console
      console.log(`rationale: ${ctx.rationale}\n`);
      // eslint-disable-next-line no-console
      console.log(ctx.diff);
      return (await select({
        message: 'Apply this diff?',
        choices: [
          { name: 'approve — write + commit', value: 'approve' },
          { name: 'reject — discard', value: 'reject' },
          { name: 'edit — open $EDITOR on the diff', value: 'edit' },
        ],
      })) as 'approve' | 'reject' | 'edit';
    },
    askRejectionReason: async () => {
      return input({
        message: 'Reason for rejection (recorded in ledger):',
        default: 'not suitable',
      });
    },
    editDiff: async (original) => openInEditor(original),
  };
}

/**
 * Write `text` to a temp file, launch `$EDITOR` (or `vi` fallback), read the
 * file back. Exposed for tests that want to validate the fallback path
 * without actually spawning an editor.
 */
export function openInEditor(text: string): string {
  const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
  const dir = mkdtempSync(join(tmpdir(), 'skill-refine-edit-'));
  const path = join(dir, 'diff.patch');
  try {
    writeFileSync(path, text, 'utf-8');
    const result = spawnSync(editor, [path], { stdio: 'inherit' });
    if (result.status !== 0) {
      // Editor closed uncleanly — keep original to avoid surprise data loss.
      return text;
    }
    return readFileSync(path, 'utf-8');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
