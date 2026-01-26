/**
 * Session State Tracker
 *
 * Manages session-level state for tracking plugin installations
 * and other session data that needs to persist during a Claude Code session.
 *
 * The state is persisted to `.specweave/state/session-state.json` and is used
 * to detect when plugins were installed during the current session (requiring restart).
 *
 * @module core/session/session-state
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { PluginInstallTrigger } from './plugin-install-detector.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Details about a plugin installation event
 */
export interface PluginInstallationEvent {
  /** ISO-8601 timestamp of the installation */
  timestamp: string;
  /** List of plugins installed in this event */
  plugins: string[];
  /** What triggered the installation */
  trigger: PluginInstallTrigger;
  /** Project path where installation occurred */
  projectPath?: string;
}

/**
 * Current version of the session state schema
 * Increment when making breaking changes to state structure
 */
const STATE_SCHEMA_VERSION = 1;

/**
 * Complete session state structure
 */
export interface SessionState {
  /** Schema version for future migrations */
  version: number;
  /** Unique identifier for this session */
  sessionId: string;
  /** ISO-8601 timestamp when session started */
  startTime: string;
  /** All plugins installed during this session */
  pluginsInstalledDuringSession: string[];
  /** Most recent installation event */
  lastInstallationEvent?: PluginInstallationEvent;
  /** Project path for this session */
  projectPath?: string;
  /** Original user intent (captured from initial prompt) */
  originalIntent?: string;
}

/**
 * Options for recording plugin installation
 */
export interface RecordOptions {
  /** What triggered the installation */
  trigger?: PluginInstallTrigger;
  /** Project path where plugins were installed */
  projectPath?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Name of the state file */
const STATE_FILE_NAME = 'session-state.json';

/** Directory containing state files */
const STATE_DIR_NAME = 'state';

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Get the full path to the session state file
 */
function getStateFilePath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', STATE_DIR_NAME, STATE_FILE_NAME);
}

/**
 * Ensure the state directory exists
 */
function ensureStateDirectory(projectRoot: string): void {
  const stateDir = path.join(projectRoot, '.specweave', STATE_DIR_NAME);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an object is a valid SessionState
 */
function isValidSessionState(obj: unknown): obj is SessionState {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const state = obj as Record<string, unknown>;

  return (
    typeof state.sessionId === 'string' &&
    typeof state.startTime === 'string' &&
    Array.isArray(state.pluginsInstalledDuringSession)
  );
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Initialize a new session state
 *
 * Creates a fresh session state with a unique ID and persists it to disk.
 *
 * @param projectRoot - Root directory of the project
 * @returns The newly created session state
 *
 * @example
 * ```typescript
 * const state = initSessionState('/path/to/project');
 * console.log('Session started:', state.sessionId);
 * ```
 */
export function initSessionState(projectRoot: string): SessionState {
  const state: SessionState = {
    version: STATE_SCHEMA_VERSION,
    sessionId: randomUUID(),
    startTime: new Date().toISOString(),
    pluginsInstalledDuringSession: [],
  };

  // Persist to file
  ensureStateDirectory(projectRoot);
  const stateFile = getStateFilePath(projectRoot);
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');

  return state;
}

/**
 * Record plugin installation in session state
 *
 * Adds the installed plugins to the session state and updates the
 * last installation event. Plugins are deduplicated.
 *
 * @param projectRoot - Root directory of the project
 * @param plugins - List of plugin names that were installed
 * @param options - Additional installation context
 * @returns Updated session state
 *
 * @example
 * ```typescript
 * const state = recordPluginInstallation('/path/to/project', ['sw', 'sw-frontend'], {
 *   trigger: 'specweave-init',
 *   projectPath: '/new/project'
 * });
 * ```
 */
export function recordPluginInstallation(
  projectRoot: string,
  plugins: string[],
  options: RecordOptions = {}
): SessionState {
  // Load existing state or create new one
  let state = loadSessionState(projectRoot);
  if (!state) {
    state = initSessionState(projectRoot);
  }

  // Add new plugins (deduplicate using Set)
  const existingPlugins = new Set(state.pluginsInstalledDuringSession);
  for (const plugin of plugins) {
    existingPlugins.add(plugin);
  }
  state.pluginsInstalledDuringSession = Array.from(existingPlugins);

  // Update last installation event
  state.lastInstallationEvent = {
    timestamp: new Date().toISOString(),
    plugins,
    trigger: options.trigger || 'manual',
    projectPath: options.projectPath,
  };

  // Update project path if provided
  if (options.projectPath) {
    state.projectPath = options.projectPath;
  }

  // Persist updated state
  const stateFile = getStateFilePath(projectRoot);
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');

  return state;
}

/**
 * Load session state from file
 *
 * Reads and parses the session state from disk. Returns null if the file
 * doesn't exist or contains invalid data.
 *
 * @param projectRoot - Root directory of the project
 * @returns Session state or null if not found/invalid
 *
 * @example
 * ```typescript
 * const state = loadSessionState('/path/to/project');
 * if (state && state.pluginsInstalledDuringSession.length > 0) {
 *   console.log('Plugins installed this session:', state.pluginsInstalledDuringSession);
 * }
 * ```
 */
export function loadSessionState(projectRoot: string): SessionState | null {
  const stateFile = getStateFilePath(projectRoot);

  if (!fs.existsSync(stateFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(stateFile, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate the parsed data
    if (!isValidSessionState(parsed)) {
      // Invalid state structure - treat as missing
      return null;
    }

    // Handle schema migration if needed
    if (!parsed.version || parsed.version < STATE_SCHEMA_VERSION) {
      // Future: Add migration logic here
      parsed.version = STATE_SCHEMA_VERSION;
    }

    return parsed;
  } catch {
    // JSON parsing error - treat as missing
    return null;
  }
}

/**
 * Clear session state
 *
 * Removes the session state file from disk. Safe to call even if
 * the file doesn't exist.
 *
 * @param projectRoot - Root directory of the project
 *
 * @example
 * ```typescript
 * clearSessionState('/path/to/project');
 * ```
 */
export function clearSessionState(projectRoot: string): void {
  const stateFile = getStateFilePath(projectRoot);

  try {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Check if plugins were installed during current session
 *
 * Convenience function to quickly check if the session restart warning
 * should be shown.
 *
 * @param projectRoot - Root directory of the project
 * @returns True if plugins were installed this session
 */
export function hasPluginsInstalledThisSession(projectRoot: string): boolean {
  const state = loadSessionState(projectRoot);
  return state !== null && state.pluginsInstalledDuringSession.length > 0;
}
