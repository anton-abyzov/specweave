import { ExecFileException } from 'child_process';
/**
 * Result from command execution
 */
export interface ExecResult {
    /** Standard output from command */
    stdout: string;
    /** Standard error from command */
    stderr: string;
    /** Exit code (0 = success) */
    exitCode: number;
    /** Whether command succeeded (exitCode === 0) */
    success: boolean;
    /** Error object if command failed */
    error?: ExecFileException;
}
/**
 * Safely execute a command without throwing errors
 *
 * This utility uses child_process.execFile instead of exec/execSync:
 * - ✅ Prevents command injection vulnerabilities (no shell interpolation)
 * - ✅ Cross-platform compatible (Windows, Mac, Linux)
 * - ✅ Proper error handling (returns result instead of throwing)
 * - ✅ Structured output (stdout, stderr, exitCode)
 *
 * @param command - Command to execute (must be in PATH or absolute path)
 * @param args - Array of arguments (safely escaped automatically)
 * @param options - Additional execution options
 * @returns Promise resolving to execution result
 *
 * @example
 * ```typescript
 * // ✅ Safe: Arguments automatically escaped
 * const result = await execFileNoThrow('git', ['add', userProvidedFilename]);
 * if (result.success) {
 *   console.log('Git add succeeded:', result.stdout);
 * } else {
 *   console.error('Git add failed:', result.stderr);
 * }
 *
 * // ✅ Check if command exists
 * const which = process.platform === 'win32' ? 'where' : 'which';
 * const checkResult = await execFileNoThrow(which, ['claude']);
 * if (checkResult.success) {
 *   console.log('Claude CLI found at:', checkResult.stdout.trim());
 * }
 * ```
 */
export declare function execFileNoThrow(command: string, args?: string[], options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
    maxBuffer?: number;
    shell?: boolean;
}): Promise<ExecResult>;
/**
 * Synchronous version of execFileNoThrow
 *
 * Use sparingly - prefer async version when possible.
 * Useful for initialization code that needs to be synchronous.
 *
 * @example
 * ```typescript
 * const result = execFileNoThrowSync('claude', ['--version']);
 * if (result.success) {
 *   console.log('Claude version:', result.stdout.trim());
 * }
 * ```
 */
export declare function execFileNoThrowSync(command: string, args?: string[], options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
    maxBuffer?: number;
    shell?: boolean;
}): ExecResult;
/**
 * Check if a command is available in PATH
 *
 * Cross-platform helper that uses 'which' (Unix) or 'where' (Windows)
 *
 * @param command - Command name to check (e.g., 'claude', 'git', 'node')
 * @returns Promise resolving to true if command exists, false otherwise
 *
 * @example
 * ```typescript
 * if (await isCommandAvailable('claude')) {
 *   console.log('Claude CLI is installed');
 * } else {
 *   console.log('Claude CLI not found - install from https://claude.com/code');
 * }
 * ```
 */
export declare function isCommandAvailable(command: string): Promise<boolean>;
/**
 * Synchronous version of isCommandAvailable
 */
export declare function isCommandAvailableSync(command: string): boolean;
//# sourceMappingURL=execFileNoThrow.d.ts.map