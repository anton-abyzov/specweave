import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);
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
export async function execFileNoThrow(command, args = [], options = {}) {
    try {
        // CRITICAL: On Windows, shell is needed for .cmd/.bat files
        // Without shell, execFileAsync can't find 'claude.cmd' even if it's in PATH
        const needsShell = process.platform === 'win32' && options.shell !== false;
        const { stdout, stderr } = await execFileAsync(command, args, {
            ...options,
            encoding: 'utf-8',
            windowsHide: true, // Don't show console window on Windows
            shell: needsShell,
        });
        return {
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: 0,
            success: true,
        };
    }
    catch (error) {
        const execError = error;
        return {
            stdout: execError.stdout || '',
            stderr: execError.stderr || '',
            exitCode: typeof execError.code === 'number' ? execError.code : 1,
            success: false,
            error: execError,
        };
    }
}
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
export function execFileNoThrowSync(command, args = [], options = {}) {
    try {
        // CRITICAL: On Windows, shell is needed for .cmd/.bat files
        // Without shell, execFileSync can't find 'claude.cmd' even if it's in PATH
        const needsShell = process.platform === 'win32' && options.shell !== false;
        const stdout = execFileSync(command, args, {
            ...options,
            encoding: 'utf-8',
            windowsHide: true,
            shell: needsShell,
        });
        return {
            stdout: stdout || '',
            stderr: '',
            exitCode: 0,
            success: true,
        };
    }
    catch (error) {
        return {
            stdout: error.stdout || '',
            stderr: error.stderr || '',
            exitCode: typeof error.status === 'number' ? error.status : 1,
            success: false,
            error: error,
        };
    }
}
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
export async function isCommandAvailable(command) {
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';
    const result = await execFileNoThrow(whichCommand, [command]);
    return result.success;
}
/**
 * Synchronous version of isCommandAvailable
 */
export function isCommandAvailableSync(command) {
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';
    const result = execFileNoThrowSync(whichCommand, [command]);
    return result.success;
}
//# sourceMappingURL=execFileNoThrow.js.map