/**
 * PreToolUse hook handler (matcher: Write|Edit) — the hard rules:
 * 1. Status Completion Guard — no manual `status: completed` in an increment's
 *    metadata.json; closure goes through `/sw:done` / `specweave complete`.
 * 2. Interview Enforcement Guard — writing spec.md under
 *    `planning.deepInterview.enforcement: strict` requires a finished interview.
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

const TEMPLATE_MARKERS = [
  '[Story Title]',
  '[user type]',
  '[goal]',
  '[benefit]',
  '[Specific, testable criterion]',
  '[Component 1]',
  '[High-level description',
  '{{RESOLVED_PROJECT}}',
  'TEMPLATE FILE',
];

const DEFAULT_INTERVIEW_CATEGORIES = [
  'architecture',
  'integrations',
  'ui-ux',
  'performance',
  'security',
  'edge-cases',
];

const METADATA_RE = /\.specweave\/increments\/[^/]+\/metadata\.json$/;
const SPEC_RE = /\.specweave\/increments\/\d{4}E?-[^/]+\/spec\.md$/;

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
// Guard: Interview Enforcement (Write spec.md with strict interview)
// ---------------------------------------------------------------------------

function checkInterviewGuard(input: HookInput, context: HookContext, filePath: string): HookResult {
  if (!SPEC_RE.test(filePath)) return pass();

  const content = newText(input);
  if (TEMPLATE_MARKERS.some((m) => content.includes(m))) return pass();

  const config = readJsonSafe<{ planning?: { deepInterview?: Record<string, unknown> } }>(context.configPath);
  const di = config?.planning?.deepInterview ?? {};
  const strict = di.enforcement === 'strict' && (di.enabled === true || di.enabled === undefined);
  if (!strict) return pass();

  const id = extractIncrementId(filePath);
  const categories = Array.isArray(di.categories) ? (di.categories as string[]) : DEFAULT_INTERVIEW_CATEGORIES;
  const statePath = path.join(context.stateDir, `interview-${id}.json`);
  if (!fs.existsSync(statePath)) {
    return deny(
      `Strict Interview Enforcement: Interview Required. Deep Interview has not been started for ${id}. ` +
        `Cover all categories (${categories.join(', ')}) before writing spec.md, ` +
        `or set planning.deepInterview.enforcement to "warn" in .specweave/config.json.`,
    );
  }
  const state = readJsonSafe<{ coveredCategories?: Record<string, unknown> }>(statePath);
  const covered = Object.keys(state?.coveredCategories ?? {});
  const missing = categories.filter((c) => !covered.includes(c));
  if (missing.length > 0) {
    return deny(
      `Strict Interview Enforcement: Incomplete Interview for ${id}. Missing categories: ${missing.join(', ')}`,
    );
  }
  return pass();
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

  if (toolName === 'Write') {
    const interviewResult = checkInterviewGuard(input, context, filePath);
    if (interviewResult.hookSpecificOutput) {
      logHook(context, 'pre-tool-use', `interview guard: ${filePath}`, 'warn');
      return interviewResult;
    }
  }
  return pass();
};
