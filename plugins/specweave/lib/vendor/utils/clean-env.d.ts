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
 * CRITICAL: Removes env vars that can cause child processes to fail:
 *
 * - CLAUDECODE: Nested session guard (Claude Code v2.1.39+) blocks `claude -p`
 *   when running inside a Claude Code session. Unsetting is the official bypass.
 *   See: https://github.com/anthropics/claude-code/issues/25434
 *   Same fix applied in Python Agent SDK PR #594.
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
 * If a variable is not set, delete is a no-op (safe).
 *
 * @returns A copy of process.env with problematic vars removed
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
export declare function getCleanEnv(): NodeJS.ProcessEnv;
//# sourceMappingURL=clean-env.d.ts.map