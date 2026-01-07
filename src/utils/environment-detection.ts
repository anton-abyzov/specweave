/**
 * Environment Detection Utilities
 *
 * Detects execution context to optimize behavior:
 * - VSCode extension: Simplified locking (extension manages lifecycle)
 * - CLI standalone: Full lock infrastructure (multi-process coordination)
 * - CI/CD: No locks needed (single-process execution)
 */

/**
 * Check if running inside VSCode extension
 *
 * VSCode extension sets these environment variables:
 * - VSCODE_PID: VSCode process ID
 * - TERM_PROGRAM: "vscode"
 * - VSCODE_IPC_HOOK: Socket path for IPC
 */
export function isVSCodeContext(): boolean {
  return !!(
    process.env.VSCODE_PID ||
    process.env.TERM_PROGRAM === 'vscode' ||
    process.env.VSCODE_IPC_HOOK
  );
}

/**
 * Check if running in CI/CD environment
 *
 * CI environments typically set these variables:
 * - CI: "true"
 * - GITHUB_ACTIONS, GITLAB_CI, CIRCLECI, etc.
 */
export function isCIContext(): boolean {
  return !!(
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.GITLAB_CI === 'true' ||
    process.env.CIRCLECI === 'true' ||
    process.env.JENKINS_HOME ||
    process.env.TRAVIS === 'true'
  );
}

/**
 * Check if locks/semaphores should be disabled
 *
 * Locks are unnecessary when:
 * 1. Running in VSCode (extension manages lifecycle)
 * 2. Running in CI (single-process, no concurrency)
 * 3. User explicitly disabled via env var
 *
 * @returns true if locks should be skipped
 */
export function shouldSkipLocks(): boolean {
  // Explicit disable always wins
  if (process.env.SPECWEAVE_DISABLE_LOCKS === '1') {
    return true;
  }

  // Explicit enable forces locks even in VSCode/CI
  if (process.env.SPECWEAVE_FORCE_LOCKS === '1') {
    return false;
  }

  // Auto-detect: skip in VSCode or CI
  return isVSCodeContext() || isCIContext();
}

/**
 * Check if session registry should be disabled
 *
 * Session registry tracks multi-process sessions, which is:
 * - Unnecessary in VSCode (extension handles session lifecycle)
 * - Unnecessary in CI (single session, no orphans)
 *
 * @returns true if session registry should be disabled
 */
export function shouldSkipSessionRegistry(): boolean {
  // Explicit disable always wins
  if (process.env.SPECWEAVE_DISABLE_SESSION_REGISTRY === '1') {
    return true;
  }

  // Explicit enable forces session registry
  if (process.env.SPECWEAVE_FORCE_SESSION_REGISTRY === '1') {
    return false;
  }

  // Auto-detect: skip in VSCode (extension manages sessions)
  return isVSCodeContext();
}

/**
 * Get execution context description for logging
 */
export function getExecutionContext(): string {
  if (isVSCodeContext()) return 'VSCode Extension';
  if (isCIContext()) return 'CI/CD';
  return 'CLI Standalone';
}
