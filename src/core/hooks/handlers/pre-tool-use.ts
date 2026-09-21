/**
 * PreToolUse hook handler (tools: Write, Edit, Bash) — two hard rules:
 *
 * 1. Status Completion Guard — no manual `status: completed` in an increment's
 *    metadata.json; closure goes through `/sw:done` / `specweave complete`.
 * 2. Jev Bash guard (opt-in, 0878) — when `.specweave/state/jev-guard.enabled`
 *    exists AND `jev.enabled` AND `jev.guards.bash`, a shell command that
 *    survives the regex prefilter is scored by Jev; a `deny` verdict blocks it,
 *    a `warn` verdict is surfaced as additionalContext.
 *
 * NOT registered by the plugin manifest: 2.1 retired the intrusive default
 * hooks, and `plugins/specweave/hooks/hooks.json` still ships only SessionStart
 * and Stop. The Bash guard reaches this handler through a PROJECT-level entry
 * (matcher `Bash`) that `specweave jev setup --guard-bash` writes into
 * `<projectRoot>/.claude/settings.json`; the Write/Edit rule stays callable for
 * anyone who wires PreToolUse up themselves.
 *
 *    PRIVACY: scoring a command means POSTing its text to a third-party API
 *    (OpenRouter or TypeSafe). The prefilter routes `curl`, `ssh`, `publish`,
 *    `deploy` … toward Jev — exactly the commands that carry credentials — so
 *    every command is run through `redactSecrets` (core/jev/redact) first —
 *    the same single choke point the client uses on request state, so a key
 *    shape only has to be taught once. Redaction is a heuristic, not a
 *    guarantee; the guard stays opt-in for that reason and the docs page states
 *    the export.
 *
 * 2.0 removed the interview-enforcement guard: `planning.deepInterview` is
 * advisory ('off' | 'warn') and enforced by the planning skill, not a hook.
 *
 * Output: `{}` (pass), `hookSpecificOutput.permissionDecision: "deny"`, or
 * `hookSpecificOutput.additionalContext` (warn). Paths are backslash-normalized
 * so the guards fire on Windows too. Everything fails OPEN: any error, timeout,
 * missing key or disabled config returns `{}`.
 *
 * @module core/hooks/handlers/pre-tool-use
 */

import * as fs from 'fs';
import * as path from 'path';
import { redactSecrets } from '../../jev/redact.js';
import type { HandlerFn, HookContext, HookInput, HookResult } from './types.js';
import { deny, pass, warn } from './types.js';
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

/** Opt-in marker: `.specweave/state/jev-guard.enabled` (relative to stateDir). */
const JEV_GUARD_MARKER = 'jev-guard.enabled';

/**
 * Hard ceiling for the whole Jev round trip inside the hook. The launcher's
 * PreToolUse budget is 7.5 s; staying at 3 s keeps the handler path well under
 * it even when the network stalls.
 */
const JEV_GUARD_BUDGET_MS = 3000;

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
// Guard: Jev Bash command guard (opt-in)
// ---------------------------------------------------------------------------

/** The `tool_input.command` string ('' when absent). */
function getCommand(input: HookInput): string {
  const cmd = getToolInput(input).command;
  return typeof cmd === 'string' ? cmd : '';
}

/**
 * `0` / `false` / `off` (case-insensitive) turn the guard off for this process.
 *
 * Read from the *hook process* env, which only the person launching the agent
 * controls. It is deliberately NOT read out of `tool_input.command`: a prefix
 * the agent can type is a self-service bypass of a guard whose whole job is to
 * restrain the agent.
 */
function isGuardOff(value: string | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'off';
}

/** `tool_input.description` when the caller supplied one. */
function getDescription(input: HookInput): string | undefined {
  const d = getToolInput(input).description;
  return typeof d === 'string' && d.trim() ? d : undefined;
}

/** Resolve `promise` or `null` after `ms`, without leaving a live timer behind. */
async function withBudget<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
        if (typeof timer.unref === 'function') timer.unref();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Human-readable probabilities: `read_only 0.02, local_irreversible 0.82`. */
function formatProbabilities(probabilities: Record<string, number>): string {
  const entries = Object.entries(probabilities ?? {})
    .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k} ${v.toFixed(2)}`);
  return entries.join(', ');
}

/**
 * What a blocked agent is told to do next.
 *
 * Deliberately NOT a how-to for disabling the guard: this text lands in the
 * model's context on the exact turn it was blocked, and a control should not
 * hand the party it restrains the procedure for switching it off. Operators
 * turn the guard off from the docs (config flag + marker file), not from here.
 */
const DENY_ADVICE =
  'Do not try to work around this guard (no rewording, no wrapper script, no config edit): ' +
  'stop, tell the user what you were about to run and why, and let them decide.';

async function checkJevBashGuard(input: HookInput, context: HookContext): Promise<HookResult> {
  const command = getCommand(input).trim();
  if (!command) return pass();

  // Escape hatch for the operator (hook-process env), checked before any load.
  if (isGuardOff(process.env.SPECWEAVE_JEV_GUARD)) return pass();

  // Opt-in marker — absent means the guard does not exist for this project.
  if (!fs.existsSync(path.join(context.stateDir, JEV_GUARD_MARKER))) return pass();

  const jev = await import('../../jev/index.js');

  const cfg = jev.loadJevConfig(context.projectRoot);
  if (!cfg.enabled || !cfg.guards.bash) return pass();

  // Plainly read-only commands never reach the API.
  if (jev.prefilterCommand(command) === 'skip') return pass();

  const client = jev.createJevClient(context.projectRoot, { kind: 'guard' });
  if (!client) return pass(); // no key / disabled — fail open

  // Everything below this line leaves the machine — scrub first, always.
  const safe = redactSecrets(command);
  const description = getDescription(input);
  const safeDescription = description ? redactSecrets(description) : undefined;
  const redactions = safe.redactions + (safeDescription?.redactions ?? 0);
  if (redactions > 0) {
    logHook(
      context,
      'jev-bash-guard',
      `masked ${redactions} secret-shaped value(s) before scoring (command text is sent to ${cfg.provider})`,
      'warn',
    );
  }

  const decision = await withBudget(
    jev.guardCommand(client, {
      command: safe.text,
      cwd: typeof input.cwd === 'string' ? input.cwd : context.projectRoot,
      description: safeDescription?.text,
    }),
    JEV_GUARD_BUDGET_MS,
  );

  if (!decision) {
    logHook(context, 'jev-bash-guard', `timeout after ${JEV_GUARD_BUDGET_MS}ms — passing`, 'warn');
    return pass();
  }
  if (decision.available !== true) return pass();
  if (decision.verdict === 'allow') return pass();

  const probabilities = formatProbabilities(decision.probabilities);
  const detail =
    `scope=${decision.scope} (confidence ${decision.scopeConfidence.toFixed(2)}), ` +
    `destructive=${decision.destructive.toFixed(2)}` +
    (probabilities ? `; probabilities: ${probabilities}` : '');

  if (decision.verdict === 'deny') {
    return deny(`Jev command guard blocked this command: ${detail}. ${DENY_ADVICE}`);
  }
  return warn(`Jev command guard warning: ${detail}. Re-read the command before running it.`);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const handle: HandlerFn = async (input, context) => {
  const toolName = getToolName(input);

  if (toolName === 'Bash') {
    try {
      return await checkJevBashGuard(input, context);
    } catch (error) {
      // Fail open, always: a guard that cannot answer must not block work.
      const msg = error instanceof Error ? error.message : String(error);
      logHook(context, 'jev-bash-guard', `[ERROR] ${msg}`, 'error');
      return pass();
    }
  }

  if (toolName !== 'Edit' && toolName !== 'Write') return pass();

  const filePath = getFilePath(input);
  if (!filePath || !isIncrementFile(filePath)) return pass();

  const statusResult = checkStatusCompletionGuard(input, context, filePath);
  if (statusResult.hookSpecificOutput) return statusResult;

  return pass();
};
