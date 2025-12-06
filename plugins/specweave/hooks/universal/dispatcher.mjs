#!/usr/bin/env node
/**
 * Universal Hook Dispatcher (Cross-Platform)
 *
 * Routes hook calls to the appropriate TypeScript implementation.
 * Works on Windows, macOS, and Linux.
 *
 * Usage:
 *   node dispatcher.mjs <hook-type>
 *
 * Where hook-type is one of:
 *   - session-start
 *   - post-tool-use
 *   - completion-guard
 *   - bash-file-guard
 *
 * @module hooks/universal/dispatcher
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hook type from arguments
const hookType = process.argv[2] || 'unknown';

// Global timeout for hook execution (30 seconds max)
const HOOK_TIMEOUT_MS = 30000;

/**
 * Detect if we're in a development environment with duplicate hooks
 *
 * Problem: When working IN the specweave project AND having the marketplace
 * plugin installed, Claude Code loads hooks from BOTH sources, causing:
 * - Duplicate hook execution
 * - Potential race conditions
 * - Confusing output
 *
 * Solution: If we detect we're running from the marketplace copy while
 * the CWD is the specweave project itself, skip execution (let local hooks handle it).
 *
 * @returns {boolean} true if we should skip this hook execution
 */
function shouldSkipDueToDevEnvironment() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || '';
  const cwd = process.cwd();

  // Check if running from marketplace (installed plugin)
  const isFromMarketplace = pluginRoot.includes('.claude/plugins/marketplaces/');

  // Check if CWD is the specweave project itself
  const isInSpecweaveProject = existsSync(join(cwd, 'plugins', 'specweave', 'hooks', 'hooks.json'));

  // Skip marketplace hooks when developing specweave locally
  if (isFromMarketplace && isInSpecweaveProject) {
    // Output diagnostic only for session-start (once per session)
    if (hookType === 'session-start') {
      console.log(JSON.stringify({
        continue: true,
        systemMessage: 'SpecWeave dev environment: Using local hooks (marketplace hooks skipped)'
      }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
    return true;
  }

  return false;
}

/**
 * Wrap a promise with a timeout
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param cleanup - Optional cleanup function (e.g., to kill child process)
 */
function withTimeout(promise, timeoutMs, cleanup) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      if (cleanup) cleanup();
      reject(new Error(`Hook timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Find the dist/src/hooks directory (TypeScript compiled hooks)
 */
function findHooksDir() {
  // Try multiple locations
  const candidates = [
    // Production: node_modules/specweave/dist/src/hooks
    join(__dirname, '..', '..', '..', '..', 'node_modules', 'specweave', 'dist', 'src', 'hooks'),
    // Development: project root dist/src/hooks
    join(__dirname, '..', '..', '..', '..', 'dist', 'src', 'hooks'),
    // Fallback: older path without src/ (backward compatibility)
    join(__dirname, '..', '..', '..', '..', 'dist', 'hooks'),
  ];

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    if (existsSync(resolved)) {
      return resolved;
    }
  }

  return null;
}

/**
 * Run a hook script with timeout protection
 */
async function runHook(scriptName) {
  const hooksDir = findHooksDir();
  if (!hooksDir) {
    // No hooks directory - just continue
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const scriptPath = join(hooksDir, scriptName);
  if (!existsSync(scriptPath) && !existsSync(scriptPath + '.js')) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Spawn node to run the script
  const child = spawn(process.execPath, [scriptPath], {
    stdio: ['inherit', 'inherit', 'inherit'],
    windowsHide: true,
  });

  const execPromise = new Promise((resolve) => {
    child.on('exit', (code) => resolve(code || 0));
    child.on('error', () => {
      console.log(JSON.stringify({ continue: true }));
      resolve(1);
    });
  });

  try {
    return await withTimeout(execPromise, HOOK_TIMEOUT_MS, () => {
      // Kill the child process on timeout
      try {
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 1000);
      } catch { /* ignore */ }
    });
  } catch (err) {
    console.log(JSON.stringify({ continue: true, error: err.message }));
    return 1;
  }
}

/**
 * Cached Git Bash path (computed once per session)
 * undefined = not yet checked, null = checked and not found, string = path found
 */
let gitBashCache = undefined;

/**
 * Find Git Bash on Windows (with caching)
 *
 * Checks common Git for Windows installation paths.
 * Caches result to avoid repeated filesystem checks.
 */
function findGitBash() {
  // Return cached result if available
  if (gitBashCache !== undefined) {
    return gitBashCache;
  }

  const gitBashPaths = [
    // Environment variable paths with proper fallbacks
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Git', 'bin', 'bash.exe'),
    join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'bash.exe'),
    // Hardcoded fallbacks for edge cases where env vars are missing
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    'C:\\Git\\bin\\bash.exe',
  ];

  for (const p of gitBashPaths) {
    if (p && existsSync(p)) {
      gitBashCache = p;
      return p;
    }
  }

  gitBashCache = null;
  return null;
}

/**
 * Helper to spawn a bash script with timeout protection
 */
async function spawnBashWithTimeout(bashExe, args, options = {}) {
  const child = spawn(bashExe, args, {
    stdio: ['inherit', 'inherit', 'inherit'],
    windowsHide: true,
    ...options,
  });

  const execPromise = new Promise((resolve) => {
    child.on('exit', (code) => resolve(code || 0));
    child.on('error', () => {
      console.log(JSON.stringify({ continue: true }));
      resolve(1);
    });
  });

  try {
    return await withTimeout(execPromise, HOOK_TIMEOUT_MS, () => {
      // Kill the child process on timeout
      try {
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 1000);
      } catch { /* ignore */ }
    });
  } catch (err) {
    console.log(JSON.stringify({ continue: true, error: err.message }));
    return 1;
  }
}

/**
 * Fallback to bash script if TypeScript not built (with timeout protection)
 *
 * @param bashScript - Name of the bash script (e.g., 'post-tool-use.sh')
 * @param subdir - Subdirectory under v2 (e.g., 'dispatchers', 'guards')
 */
async function fallbackToBash(bashScript, subdir = 'dispatchers') {
  const isWindows = process.platform === 'win32';
  const bashDir = join(__dirname, '..', 'v2', subdir);
  const scriptPath = join(bashDir, bashScript);

  if (!existsSync(scriptPath)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  if (isWindows) {
    // Strategy 1: Git Bash (preferred - most common)
    const bashExe = findGitBash();
    if (bashExe) {
      return spawnBashWithTimeout(bashExe, [scriptPath]);
    }

    // Strategy 2: WSL (if Git Bash not available) - FALLBACK only
    const wslPath = join(process.env.SYSTEMROOT || 'C:\\Windows', 'System32', 'wsl.exe');
    if (existsSync(wslPath)) {
      // Convert Windows path to WSL path:
      // 1. Backslashes to forward slashes: C:\path\file -> C:/path/file
      // 2. Drive letter to /mnt/: C:/path/file -> /mnt/c/path/file
      // NOTE: Handle BOTH uppercase and lowercase drive letters (C: and c:)
      const wslScriptPath = scriptPath
        .replace(/\\/g, '/')
        .replace(/^([A-Za-z]):/, (_, d) => `/mnt/${d.toLowerCase()}`);
      return spawnBashWithTimeout('wsl', ['bash', wslScriptPath]);
    }

    // Strategy 3: No bash available - output warning and continue
    // Hooks should not block Claude Code operation
    console.log(JSON.stringify({
      continue: true,
      systemMessage: 'SpecWeave hooks require Git Bash on Windows. Install from https://git-scm.com'
    }));
    return;
  }

  // POSIX (macOS, Linux) - run directly with timeout
  return spawnBashWithTimeout('bash', [scriptPath]);
}

// Main routing
async function main() {
  // CRITICAL: Skip if we're in dev environment with duplicate hooks
  // This prevents marketplace hooks from running when local hooks are available
  if (shouldSkipDueToDevEnvironment()) {
    return;
  }

  const isWindows = process.platform === 'win32';

  try {
    switch (hookType) {
      case 'session-start':
        // CRITICAL: On Windows, ALWAYS use TypeScript implementation
        // Bash nohup/disown is unreliable in Git Bash (process may terminate early)
        // TypeScript uses proper Windows detached spawn with windowsHide
        if (isWindows) {
          await runHook('session-start.js');
        } else {
          // POSIX: try TypeScript first (preferred), fallback to bash for compatibility
          try {
            await runHook('session-start.js');
          } catch {
            await fallbackToBash('session-start.sh', 'dispatchers');
          }
        }
        break;

      case 'post-tool-use':
        // Currently only bash implementation
        // On Windows without Git Bash, will gracefully skip
        await fallbackToBash('post-tool-use.sh', 'dispatchers');
        break;

      case 'completion-guard':
        // Guards are in a different subdirectory
        // On Windows without Git Bash, will gracefully skip
        await fallbackToBash('completion-guard.sh', 'guards');
        break;

      case 'bash-file-guard':
        // CRITICAL: Prevents infinite hangs from heredoc/echo file creation
        // See CLAUDE.md Rule 9 for why this is essential
        await fallbackToBash('bash-file-guard.sh', 'guards');
        break;

      default:
        console.log(JSON.stringify({ continue: true, error: `Unknown hook type: ${hookType}` }));
    }
  } catch (err) {
    console.log(JSON.stringify({ continue: true, error: String(err) }));
  }
}

main();
