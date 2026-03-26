/**
 * Hook handler types for CLI delegation model.
 *
 * All hook handlers share this contract:
 * - Read JSON from stdin (HookInput)
 * - Return JSON to stdout (HookResult)
 * - Never throw — errors become safe fallback responses
 *
 * @module core/hooks/handlers/types
 */

/** Raw JSON input from Claude Code hook protocol */
export interface HookInput {
  /** Tool name (PreToolUse/PostToolUse) */
  tool_name?: string;
  toolName?: string;
  /** Tool input parameters */
  tool_input?: Record<string, unknown>;
  toolInput?: Record<string, unknown>;
  /** User prompt text (UserPromptSubmit) */
  prompt?: string;
  /** Session transcript (Stop hooks) */
  transcript?: string;
  /** Catch-all for additional fields */
  [key: string]: unknown;
}

/** JSON output to Claude Code hook protocol */
export interface HookResult {
  /** Decision for guard/prompt/stop hooks */
  decision?: 'approve' | 'block' | 'allow';
  /** Continuation signal for session/compact/post-tool hooks */
  continue?: boolean;
  /** Reason for blocking */
  reason?: string;
  /** Hook-specific output for context injection */
  hookSpecificOutput?: {
    hookEventName?: string;
    additionalContext?: string;
  };
  /** Catch-all for additional fields */
  [key: string]: unknown;
}

/** Context resolved by the router before handler execution */
export interface HookContext {
  /** Absolute path to project root (contains .specweave/) */
  projectRoot: string;
  /** Path to .specweave/state/ directory */
  stateDir: string;
  /** Path to .specweave/logs/ directory */
  logsDir: string;
  /** Path to .specweave/config.json */
  configPath: string;
  /** ISO timestamp of hook invocation */
  timestamp: string;
}

/** Handler function signature — every handler exports a `handle` matching this */
export type HandlerFn = (
  input: HookInput,
  context: HookContext,
) => Promise<HookResult>;

/** Event types supported by the hook router */
export type HookEventType =
  | 'user-prompt-submit'
  | 'pre-tool-use'
  | 'post-tool-use'
  | 'post-tool-use-analytics'
  | 'session-start'
  | 'pre-compact'
  | 'stop-reflect'
  | 'stop-auto'
  | 'stop-sync';

/** Map of event types to their safe fallback responses */
export const SAFE_DEFAULTS: Record<string, HookResult> = {
  'user-prompt-submit': { decision: 'approve' },
  'pre-tool-use': { decision: 'allow' },
  'post-tool-use': { continue: true },
  'post-tool-use-analytics': { continue: true },
  'session-start': { continue: true },
  'pre-compact': { continue: true },
  'stop-reflect': { decision: 'approve' },
  'stop-auto': { decision: 'approve' },
  'stop-sync': { decision: 'approve' },
};

/** Get safe default response for an event type */
export function getSafeDefault(eventType: string): HookResult {
  return SAFE_DEFAULTS[eventType] ?? { continue: true };
}
