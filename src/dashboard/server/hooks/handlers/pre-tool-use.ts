import type { HookHandler, HookPayload, HookResponse } from '../hook-event-router.js';

/**
 * PreToolUse handler - evaluates blocking rules for tool invocations.
 * Returns permissionDecision allow/deny with reason.
 */
export const preToolUseHandler: HookHandler = async (payload: HookPayload): Promise<HookResponse> => {
  const body = payload.body as Record<string, unknown> | undefined;
  const toolName = (body?.tool_name ?? body?.toolName ?? '') as string;
  const toolInput = body?.tool_input as Record<string, unknown> | undefined;

  // Default: allow
  const allow = () => ({
    status: 200,
    body: {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow' as const,
        permissionDecisionReason: 'OK',
      },
    },
  });

  const deny = (reason: string) => ({
    status: 200,
    body: {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny' as const,
        permissionDecisionReason: reason,
      },
    },
  });

  // Skip non-write tools
  if (!['Write', 'Edit'].includes(toolName)) {
    return allow();
  }

  // Check file path for protected paths
  const filePath = (toolInput?.file_path ?? toolInput?.filePath ?? '') as string;

  // Protect .specweave/config.json from full overwrites (Edit is fine, Write is not)
  if (filePath.endsWith('.specweave/config.json') && toolName === 'Write') {
    return deny('Cannot overwrite .specweave/config.json with Write — use Edit instead');
  }

  return allow();
};
