/**
 * Hook handler types — SpecWeave 2.0 hook contract.
 *
 * Every handler reads the Claude Code hook JSON (HookInput) and returns a
 * schema-valid HookResult (see https://code.claude.com/docs/en/hooks):
 *   - pass                 → `{}`
 *   - PreToolUse deny      → `hookSpecificOutput.permissionDecision = "deny"`
 *   - SessionStart context → `hookSpecificOutput.additionalContext`
 *   - Stop block           → top-level `decision: "block"` + `reason`
 * Handlers never throw — the router turns any failure into `{}`.
 *
 * @module core/hooks/handlers/types
 */

/** Raw JSON input from the Claude Code hook protocol. */
export interface HookInput {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  /** PreToolUse: tool name + parameters. */
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  /** Stop: true when the stop was already triggered by a Stop hook. */
  stop_hook_active?: boolean;
  /** SessionStart: startup | resume | clear | compact | fork. */
  source?: string;
  /** PreCompact: manual | auto. */
  trigger?: string;
  [key: string]: unknown;
}

/** Hook-specific output block (event name is mandatory per the docs). */
export interface HookSpecificOutput {
  hookEventName: 'SessionStart' | 'PreToolUse' | 'Stop' | 'PreCompact';
  permissionDecision?: 'allow' | 'deny' | 'ask';
  permissionDecisionReason?: string;
  additionalContext?: string;
}

/** JSON output to the Claude Code hook protocol. */
export interface HookResult {
  /** Stop / PreCompact only: block the stop (or compaction). */
  decision?: 'block';
  /** Required when `decision` is "block". */
  reason?: string;
  hookSpecificOutput?: HookSpecificOutput;
  /** Universal optional fields. */
  continue?: boolean;
  stopReason?: string;
  systemMessage?: string;
}

/** Context resolved by the router before handler execution. */
export interface HookContext {
  /** Absolute path to the project root (contains .specweave/). */
  projectRoot: string;
  /** .specweave/state */
  stateDir: string;
  /** .specweave/logs */
  logsDir: string;
  /** .specweave/config.json */
  configPath: string;
  /** ISO timestamp of the hook invocation. */
  timestamp: string;
}

export type HandlerFn = (input: HookInput, context: HookContext) => Promise<HookResult>;

/** The four events SpecWeave 2.0 registers in plugins/specweave/hooks/hooks.json. */
export const HOOK_EVENTS = ['session-start', 'pre-tool-use', 'stop', 'pre-compact'] as const;
export type HookEventType = (typeof HOOK_EVENTS)[number];

/** The universal pass-through: `{}` is valid for every event. */
export function pass(): HookResult {
  return {};
}

/** Safe default for any event — always `{}` (no decision, action proceeds). */
export function getSafeDefault(_eventType: string): HookResult {
  return {};
}

/** PreToolUse deny in the documented shape. */
export function deny(reason: string): HookResult {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
}

/** PreToolUse warning: the tool runs, Claude sees `text`. */
export function warn(text: string): HookResult {
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: text } };
}

/** SessionStart context injection. */
export function sessionContext(text: string): HookResult {
  return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } };
}

/** Stop block — Claude keeps working and receives `reason`. */
export function stopBlock(reason: string): HookResult {
  return { decision: 'block', reason };
}

/**
 * Validate a hook output object against the per-event schema. Returns null
 * when valid, otherwise a human-readable problem. Used by doctor, tests and CI.
 */
export function validateHookOutput(eventType: string, output: unknown): string | null {
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return 'output is not a JSON object';
  }
  const o = output as Record<string, unknown>;
  const hso = o.hookSpecificOutput as Record<string, unknown> | undefined;
  const expectedName: Record<string, string> = {
    'session-start': 'SessionStart',
    'pre-tool-use': 'PreToolUse',
    'stop': 'Stop',
    'pre-compact': 'PreCompact',
  };
  if (!(eventType in expectedName)) return `unknown event: ${eventType}`;
  if (hso !== undefined) {
    if (typeof hso !== 'object' || hso === null) return 'hookSpecificOutput is not an object';
    if (hso.hookEventName !== expectedName[eventType]) {
      return `hookSpecificOutput.hookEventName must be ${expectedName[eventType]}`;
    }
  }
  if ('decision' in o && o.decision !== 'block') {
    return `decision must be "block" (got ${JSON.stringify(o.decision)})`;
  }
  if (o.decision === 'block' && typeof o.reason !== 'string') {
    return 'decision "block" requires a string reason';
  }
  switch (eventType) {
    case 'pre-tool-use':
      if ('decision' in o) return 'PreToolUse must not use top-level decision';
      if (hso && !['allow', 'deny', 'ask'].includes(String(hso.permissionDecision))) {
        return 'PreToolUse hookSpecificOutput.permissionDecision must be allow|deny|ask';
      }
      if (hso && hso.permissionDecision === 'deny' && typeof hso.permissionDecisionReason !== 'string') {
        return 'PreToolUse deny requires permissionDecisionReason';
      }
      return null;
    case 'session-start':
      if ('decision' in o) return 'SessionStart cannot block';
      if (hso && typeof hso.additionalContext !== 'string') {
        return 'SessionStart hookSpecificOutput.additionalContext must be a string';
      }
      return null;
    case 'stop':
    case 'pre-compact':
      if (hso && 'permissionDecision' in hso) return `${expectedName[eventType]} has no permissionDecision`;
      return null;
    default:
      return null;
  }
}
