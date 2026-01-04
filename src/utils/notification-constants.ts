/**
 * Notification Constants - Explicit, user-friendly notification messages
 *
 * RULE: Every notification MUST clearly identify:
 * 1. WHO sent it (SpecWeave)
 * 2. WHAT happened (specific action)
 * 3. CONTEXT (job ID, count, or status)
 *
 * @module utils/notification-constants
 */

/**
 * Notification sounds - ALL notifications should be non-alarming!
 *
 * macOS sounds ranked by urgency (ALL are gentle):
 * - "Pop" - neutral, short (good for completions)
 * - "Glass" - gentle (good for info)
 * - "Purr" - subtle (good for minor events)
 * - "Submarine" - deep but calm (good for warnings AND errors)
 *
 * NEVER use "Basso" - it shows a red alert icon which scares users!
 * SpecWeave notifications are INFORMATIVE, never require immediate attention.
 */
export const NotificationSounds = {
  /** For successful completions */
  SUCCESS: 'Pop',
  /** For informational messages */
  INFO: 'Glass',
  /** For warnings (not critical) */
  WARNING: 'Submarine',
  /** For errors - still use Submarine (not Basso!) - errors are recoverable */
  CRITICAL: 'Submarine',
} as const;

/**
 * Notification title prefixes - always include "SpecWeave"
 */
export const NotificationTitles = {
  /** Background job completed successfully */
  JOB_COMPLETE: 'SpecWeave: Job Complete',
  /** Background job started */
  JOB_STARTED: 'SpecWeave: Job Started',
  /** Cleanup performed */
  CLEANUP_DONE: 'SpecWeave: Cleanup Done',
  /** Session health warning */
  SESSION_WARNING: 'SpecWeave: Session Warning',
  /** Sync completed */
  SYNC_COMPLETE: 'SpecWeave: Sync Complete',
  /** Import completed */
  IMPORT_COMPLETE: 'SpecWeave: Import Complete',
  /** Error occurred */
  ERROR: 'SpecWeave: Error',
} as const;

/**
 * Build explicit notification message
 *
 * @example
 * buildMessage('cleanup', { count: 5 })
 * // Returns: "Cleaned up 5 zombie processes. No action needed."
 *
 * @example
 * buildMessage('job_complete', { jobType: 'import', items: 12 })
 * // Returns: "Import job finished. Imported 12 items."
 */
export function buildNotificationMessage(
  type: NotificationType,
  context: NotificationContext
): string {
  switch (type) {
    case 'cleanup':
      return `Cleaned up ${context.count ?? 0} zombie processes. No action needed.`;

    case 'job_complete':
      return `${context.jobType ?? 'Background'} job finished. ${context.items ? `Processed ${context.items} items.` : 'Check /sw:jobs for details.'}`;

    case 'job_started':
      return `${context.jobType ?? 'Background'} job started${context.jobId ? ` (${context.jobId})` : ''}. Running in background.`;

    case 'session_stuck':
      return `Session may be stuck: ${context.reason ?? 'Unknown reason'}. Run cleanup-state.sh if unresponsive.`;

    case 'session_recovered':
      return `Session recovered. Normal operation resumed.`;

    case 'sync_complete':
      return `Sync finished. ${context.items ? `Updated ${context.items} items.` : 'All items synced.'}`;

    case 'import_complete':
      return `Import finished. ${context.items ? `Imported ${context.items} items.` : 'Check /sw:external for results.'}`;

    case 'error':
      return `Error: ${context.reason ?? 'Unknown error'}. Check logs for details.`;

    default:
      return context.message ?? 'SpecWeave notification';
  }
}

export type NotificationType =
  | 'cleanup'
  | 'job_complete'
  | 'job_started'
  | 'session_stuck'
  | 'session_recovered'
  | 'sync_complete'
  | 'import_complete'
  | 'error';

export interface NotificationContext {
  /** Number of items (for cleanup, sync, import) */
  count?: number;
  /** Number of processed items */
  items?: number;
  /** Job type (import, sync, analysis) */
  jobType?: string;
  /** Job ID for reference */
  jobId?: string;
  /** Reason for warning/error */
  reason?: string;
  /** Custom message (fallback) */
  message?: string;
}

/**
 * Get appropriate sound for notification type
 *
 * NOTE: Sounds are currently disabled - returns undefined for all types
 * to prevent audio notifications. Remove the early return to re-enable.
 */
export function getSoundForType(type: NotificationType): string | undefined {
  // Sounds disabled - return undefined to suppress all notification sounds
  return undefined;

  switch (type) {
    case 'cleanup':
    case 'job_complete':
    case 'sync_complete':
    case 'import_complete':
    case 'session_recovered':
      return NotificationSounds.SUCCESS;

    case 'job_started':
      return NotificationSounds.INFO;

    case 'session_stuck':
      return NotificationSounds.WARNING;

    case 'error':
      return NotificationSounds.CRITICAL;

    default:
      return NotificationSounds.INFO;
  }
}

/**
 * Get appropriate title for notification type
 */
export function getTitleForType(type: NotificationType): string {
  switch (type) {
    case 'cleanup':
      return NotificationTitles.CLEANUP_DONE;

    case 'job_complete':
      return NotificationTitles.JOB_COMPLETE;

    case 'job_started':
      return NotificationTitles.JOB_STARTED;

    case 'session_stuck':
      return NotificationTitles.SESSION_WARNING;

    case 'session_recovered':
      return NotificationTitles.JOB_COMPLETE;

    case 'sync_complete':
      return NotificationTitles.SYNC_COMPLETE;

    case 'import_complete':
      return NotificationTitles.IMPORT_COMPLETE;

    case 'error':
      return NotificationTitles.ERROR;

    default:
      return 'SpecWeave';
  }
}
