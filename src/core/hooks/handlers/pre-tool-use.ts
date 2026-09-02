/**
 * PreToolUse hook handler (matcher: Write|Edit) — the hard rule:
 * Status Completion Guard — no manual `status: completed` in an increment's
 * metadata.json; closure goes through `/sw:done` / `specweave complete`.
 *
 * 2.0 removed the interview-enforcement guard: `planning.deepInterview` is
 * advisory ('off' | 'warn') and enforced by the planning skill, not a hook.
 *
 * Output: `{}` (pass) or `hookSpecificOutput.permissionDecision: "deny"`.
 * Paths are backslash-normalized so the guards fire on Windows too.
 *
 * @module core/hooks/handlers/pre-tool-use
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HandlerFn, HookContext, HookInput, HookResult } from './types.js';
import { deny, pass } from './types.js';
import {
  extractIncrementId,
  getFilePath,
  getToolInput,
  getToolName,
  isIncrementFile,
  logHook,
  readJsonSafe,
} from './utils.js';

const METADATA_RE = /\.specweave\/increments\/[^/]+\/metadata\.json$/;

/** The text the tool is about to write (Edit: new_string, Write: content). */
function newText(input: HookInput): string {
  const ti = getToolInput(input);
  const s = ti.new_string ?? ti.content ?? '';
  return typeof s === 'string' ? s : '';
}

// ---------------------------------------------------------------------------
// Guard: Status Completion (metadata.json → "completed")
// ---------------------------------------------------------------------------

function checkStatusCompletionGuard(input: HookInput, context: HookContext, filePath: string): HookResult {
  if (!METADATA_RE.test(filePath)) return pass();
  if (!/"status"\s*:\s*"completed"/.test(newText(input))) return pass();

  // Closure in progress (sw:done / specweave complete) — allowed.
  if (fs.existsSync(path.join(context.stateDir, '.sw-done-in-progress'))) return pass();

  // Verified auto session — allowed.
  const session = readJsonSafe<{ status?: string; testsVerified?: boolean }>(
    path.join(context.stateDir, 'auto', 'session.json'),
  );
  if (session?.status === 'active' && session.testsVerified === true) return pass();

  const id = extractIncrementId(filePath);
  return deny(
    `Direct status change to 'completed' is blocked for ${id}. ` +
      `Run /sw:done ${id} (or \`specweave complete ${id}\`) so the closure gates run.`,
  );
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const handle: HandlerFn = async (input, context) => {
  const toolName = getToolName(input);
  if (toolName !== 'Edit' && toolName !== 'Write') return pass();

  const filePath = getFilePath(input);
  if (!filePath || !isIncrementFile(filePath)) return pass();

  const statusResult = checkStatusCompletionGuard(input, context, filePath);
  if (statusResult.hookSpecificOutput) return statusResult;

  return pass();
};
