import type { HookHandler, HookPayload, HookResponse } from '../hook-event-router.js';

/**
 * Passthrough handler - stores the event and returns 200 with empty body.
 * Used for events that need no special processing: PostToolUseFailure,
 * PermissionRequest, Notification, ConfigChange, PreCompact, TeammateIdle.
 */
export const passthroughHandler: HookHandler = async (_payload: HookPayload): Promise<HookResponse> => {
  return { status: 200, body: {} };
};
