/**
 * Clean Environment Utility
 *
 * CRITICAL: This module MUST have NO imports from modules that spawn child processes
 * to avoid circular dependencies. This is a foundational utility.
 *
 * This utility is used by:
 * - execFileNoThrow.ts (core exec utility)
 * - claude-cli-detector.ts (CLI detection)
 * - Test files (via tests/test-utils/clean-env.ts)
 *
 * @module clean-env
 */

/**
 * Create a clean environment for spawning child processes.
 *
 * CRITICAL: Removes debugger and instrumentation env vars that can cause
 * child processes to fail across different environments:
 *
 * - VSCode Debug: NODE_OPTIONS contains --inspect-brk flags
 * - WebStorm/IntelliJ: NODE_OPTIONS or IDEA-specific vars
 * - CI/CD (GitHub Actions, etc.): May set NODE_OPTIONS for coverage
 * - Jest/Vitest: May set NODE_OPTIONS for debugging
 *
 * This function is safe to use in ALL environments:
 * - Windows, macOS, Linux
 * - Local development, CI/CD pipelines
 * - Debug mode, run mode, production
 *
 * If NODE_OPTIONS is not set, delete is a no-op (safe).
 *
 * @returns A copy of process.env with debugger/instrumentation vars removed
 *
 * @example
 * ```typescript
 * import { getCleanEnv } from './clean-env.js';
 *
 * // Spawn a child process without debugger interference
 * execSync('node script.js', { env: getCleanEnv() });
 * spawnSync('claude', ['--version'], { env: getCleanEnv() });
 * ```
 */
export function getCleanEnv(): NodeJS.ProcessEnv {
  const cleanEnv = { ...process.env };

  // Remove Node.js debugger/inspector flags (VSCode, WebStorm, etc.)
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_INSPECT;
  delete cleanEnv.NODE_INSPECT_RESUME_ON_START;

  // Remove coverage instrumentation that can interfere with spawned processes
  delete cleanEnv.NODE_V8_COVERAGE;

  // Remove test runner debug vars
  delete cleanEnv.VSCODE_INSPECTOR_OPTIONS;

  return cleanEnv;
}
