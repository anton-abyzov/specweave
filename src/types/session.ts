/**
 * Session types for process lifecycle management
 *
 * Defines the data structures for tracking Claude Code sessions,
 * watchdog daemons, and their child processes.
 */

export type SessionType = 'claude-code' | 'watchdog' | 'heartbeat' | 'processor';

export type SessionStatus = 'active' | 'stale' | 'zombie' | 'completed';

/**
 * Core session information stored in the registry
 */
export interface SessionInfo {
  /** Unique session identifier (e.g., "session-abc123" or "watchdog-xyz789") */
  session_id: string;

  /** Process ID of the session */
  pid: number;

  /** Type of session/process */
  type: SessionType;

  /** ISO-8601 timestamp when session started */
  start_time: string;

  /** ISO-8601 timestamp of last heartbeat update */
  last_heartbeat: string;

  /** Current status of the session */
  status: SessionStatus;

  /** Array of child process PIDs spawned by this session */
  child_pids?: number[];

  /** Parent session ID (for watchdog/heartbeat processes) */
  parent_session?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete session registry structure
 */
export interface SessionRegistry {
  /** Map of session_id to SessionInfo */
  sessions: Record<string, SessionInfo>;

  /** ISO-8601 timestamp of last cleanup run */
  last_cleanup: string;

  /** Registry schema version for future migrations */
  version: string;
}

/**
 * Options for session registration
 */
export interface RegisterSessionOptions {
  /** Session type (defaults to 'claude-code') */
  type?: SessionType;

  /** Parent session ID (for child processes) */
  parent_session?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of staleness detection
 */
export interface StaleSessionInfo {
  /** The stale session info */
  session: SessionInfo;

  /** How long since last heartbeat (seconds) */
  stale_duration_seconds: number;

  /** Whether the PID is still running */
  pid_exists: boolean;
}
