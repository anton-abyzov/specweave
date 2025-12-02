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

/**
 * Find the dist/hooks directory
 */
function findHooksDir() {
  // Try multiple locations
  const candidates = [
    // Production: node_modules/specweave/dist/hooks
    join(__dirname, '..', '..', '..', '..', 'node_modules', 'specweave', 'dist', 'hooks'),
    // Development: project root dist/hooks
    join(__dirname, '..', '..', '..', '..', 'dist', 'hooks'),
    // Relative to this file
    join(__dirname, '..', '..', '..', '..', 'src', 'hooks'),
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
 * Run a hook script
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

  return new Promise((resolve) => {
    child.on('exit', (code) => resolve(code || 0));
    child.on('error', () => {
      console.log(JSON.stringify({ continue: true }));
      resolve(1);
    });
  });
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
 * Fallback to bash script if TypeScript not built
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
      const child = spawn(bashExe, [scriptPath], {
        stdio: ['inherit', 'inherit', 'inherit'],
        windowsHide: true,
      });
      return new Promise((resolve) => {
        child.on('exit', (code) => resolve(code || 0));
        child.on('error', () => {
          console.log(JSON.stringify({ continue: true }));
          resolve(1);
        });
      });
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
      const child = spawn('wsl', ['bash', wslScriptPath], {
        stdio: ['inherit', 'inherit', 'inherit'],
        windowsHide: true,
      });
      return new Promise((resolve) => {
        child.on('exit', (code) => resolve(code || 0));
        child.on('error', () => {
          console.log(JSON.stringify({ continue: true }));
          resolve(1);
        });
      });
    }

    // Strategy 3: No bash available - output warning and continue
    // Hooks should not block Claude Code operation
    console.log(JSON.stringify({
      continue: true,
      systemMessage: 'SpecWeave hooks require Git Bash on Windows. Install from https://git-scm.com'
    }));
    return;
  }

  // POSIX (macOS, Linux) - run directly
  const child = spawn('bash', [scriptPath], {
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  return new Promise((resolve) => {
    child.on('exit', (code) => resolve(code || 0));
    child.on('error', () => {
      console.log(JSON.stringify({ continue: true }));
      resolve(1);
    });
  });
}

// Main routing
async function main() {
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

      default:
        console.log(JSON.stringify({ continue: true, error: `Unknown hook type: ${hookType}` }));
    }
  } catch (err) {
    console.log(JSON.stringify({ continue: true, error: String(err) }));
  }
}

main();
