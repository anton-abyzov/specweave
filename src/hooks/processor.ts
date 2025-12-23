#!/usr/bin/env node
/**
 * Background Event Processor (Cross-Platform)
 *
 * Processes queued events asynchronously, routes to specialized handlers.
 * Works on Windows, macOS, and Linux without WSL requirement.
 *
 * Usage: node processor.js [--daemon]
 *
 * Event routing (EDA v2):
 * - increment.created/done/archived/reopened -> living-specs-handler + status-line-handler + project-bridge-handler + github-sync-handler
 * - user-story.completed/reopened -> status-line-handler + project-bridge-handler
 * - spec.updated -> living-docs-handler + ac-validation-handler + github-sync-handler (creates GitHub issues for User Stories)
 * - task.updated -> living-docs-handler + ac-validation-handler (legacy)
 * - metadata.changed -> github-sync-handler
 *
 * The project-bridge-handler connects increment events to project-level EDA,
 * enabling automatic sync to GitHub, ADO, and JIRA via ProjectService.
 *
 * The github-sync-handler creates GitHub issues for User Stories when spec.md is updated.
 *
 * Self-terminates after 60s of idle
 *
 * @module hooks/processor
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import {
  findProjectRoot,
  FileLock,
  appendLog,
  isWindows,
} from './platform.js';

// Configuration
const IDLE_TIMEOUT = 60; // seconds before self-termination
const HANDLER_TIMEOUT = 30000; // ms per handler call
const STALE_LOCK_SECONDS = 300; // 5 minutes

/**
 * Event structure
 */
interface QueuedEvent {
  type: string;
  data: string;
  timestamp?: string;
}

/**
 * Processor state
 */
interface ProcessorState {
  projectRoot: string;
  queueDir: string;
  handlerDir: string;
  logFile: string;
  pidFile: string;
  lock: FileLock;
  daemonMode: boolean;
  idleCount: number;
}

/**
 * Initialize processor state
 */
function initState(projectRoot: string, daemonMode: boolean): ProcessorState {
  const specweavePath = path.join(projectRoot, '.specweave');

  return {
    projectRoot,
    queueDir: path.join(specweavePath, 'state', 'event-queue'),
    handlerDir: path.join(projectRoot, 'plugins', 'specweave', 'hooks', 'v2', 'handlers'),
    logFile: path.join(specweavePath, 'logs', 'processor.log'),
    pidFile: path.join(specweavePath, 'state', '.processor.pid'),
    lock: new FileLock(path.join(specweavePath, 'state', '.processor')),
    daemonMode,
    idleCount: 0,
  };
}

/**
 * Dequeue an event from the queue directory
 */
function dequeue(state: ProcessorState): QueuedEvent | null {
  try {
    if (!fs.existsSync(state.queueDir)) {
      return null;
    }

    // Get oldest event file
    const files = fs.readdirSync(state.queueDir)
      .filter((f) => f.endsWith('.json'))
      .sort(); // Oldest first (timestamp-based naming)

    if (files.length === 0) {
      return null;
    }

    const eventFile = path.join(state.queueDir, files[0]);
    const content = fs.readFileSync(eventFile, 'utf-8');

    // Delete after reading
    fs.unlinkSync(eventFile);

    return JSON.parse(content) as QueuedEvent;
  } catch {
    return null;
  }
}

/**
 * Run a handler script with timeout
 */
async function runHandler(
  handlerPath: string,
  eventType: string,
  eventData: string,
  state: ProcessorState
): Promise<void> {
  if (!fs.existsSync(handlerPath)) {
    return;
  }

  return new Promise((resolve) => {
    let child: ChildProcess;
    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timeoutId);
      try {
        child?.kill();
      } catch {
        // Ignore kill errors
      }
      resolve();
    };

    try {
      if (isWindows()) {
        // On Windows, run bash scripts via Git Bash if available, or skip
        const gitBashPath = findGitBash();
        if (gitBashPath) {
          child = spawn(gitBashPath, [handlerPath, eventType, eventData], {
            cwd: state.projectRoot,
            stdio: 'ignore',
            windowsHide: true,
          });
        } else {
          // No Git Bash - try to run via WSL if available (FALLBACK only)
          const wslPath = path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'System32', 'wsl.exe');
          if (fs.existsSync(wslPath)) {
            // Convert Windows path to WSL path:
            // 1. Backslashes to forward slashes: C:\path\file -> C:/path/file
            // 2. Drive letter to /mnt/: C:/path/file -> /mnt/c/path/file
            // NOTE: Handle BOTH uppercase and lowercase drive letters (C: and c:)
            const wslHandlerPath = handlerPath
              .replace(/\\/g, '/')
              .replace(/^([A-Za-z]):/, (_, drive: string) => `/mnt/${drive.toLowerCase()}`);
            child = spawn('wsl', ['bash', wslHandlerPath, eventType, eventData], {
              cwd: state.projectRoot,
              stdio: 'ignore',
              windowsHide: true,
            });
          } else {
            // No bash available - skip handler
            appendLog(state.logFile, `Skipped handler (no bash): ${path.basename(handlerPath)}`);
            resolve();
            return;
          }
        }
      } else {
        // POSIX - run directly
        child = spawn('bash', [handlerPath, eventType, eventData], {
          cwd: state.projectRoot,
          stdio: 'ignore',
        });
      }

      // Set timeout
      timeoutId = setTimeout(() => {
        appendLog(state.logFile, `Handler timeout: ${path.basename(handlerPath)}`);
        cleanup();
      }, HANDLER_TIMEOUT);

      child.on('exit', cleanup);
      child.on('error', cleanup);
    } catch (err) {
      appendLog(state.logFile, `Handler error: ${err}`);
      resolve();
    }
  });
}

/**
 * Cached Git Bash path (computed once at module load)
 * undefined = not yet checked, null = checked and not found, string = path found
 */
let gitBashPathCache: string | null | undefined = undefined;

/**
 * Find Git Bash on Windows (with caching)
 *
 * Caches the result to avoid repeated filesystem checks.
 * On Windows, checks common Git installation locations.
 */
function findGitBash(): string | null {
  // Return cached result if available
  if (gitBashPathCache !== undefined) {
    return gitBashPathCache;
  }

  if (!isWindows()) {
    gitBashPathCache = null;
    return null;
  }

  const possiblePaths = [
    // Standard Git for Windows installation paths
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Git', 'bin', 'bash.exe'),
    // User-specific installation
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'bash.exe'),
    // Portable Git / custom installation
    'C:\\Git\\bin\\bash.exe',
  ];

  for (const bashPath of possiblePaths) {
    if (bashPath && fs.existsSync(bashPath)) {
      gitBashPathCache = bashPath;
      return bashPath;
    }
  }

  gitBashPathCache = null;
  return null;
}

/**
 * Process a single event
 */
async function processEvent(event: QueuedEvent, state: ProcessorState): Promise<void> {
  const { type, data } = event;
  appendLog(state.logFile, `Processing: ${type} (${data})`);

  const handlers: { pattern: RegExp; handlers: string[] }[] = [
    // EDA Event Routing (new architecture)
    // Lifecycle events -> living-specs + status-line + project-bridge + github-sync
    // Note: github-sync-handler added to ensure GitHub issues are created for User Stories
    {
      pattern: /^increment\.(created|done|archived|reopened)$/,
      handlers: ['living-specs-handler.sh', 'status-line-handler.sh', 'project-bridge-handler.sh', 'github-sync-handler.sh'],
    },
    // User story events -> status-line + project-bridge
    {
      pattern: /^user-story\.(completed|reopened)$/,
      handlers: ['status-line-handler.sh', 'project-bridge-handler.sh'],
    },
    // Spec updated -> sync to living docs + validate ACs + sync to GitHub
    // CRITICAL: spec.updated fires AFTER spec.md has User Stories defined
    // This is the key event that triggers GitHub issue creation for USs
    {
      pattern: /^spec\.updated$/,
      handlers: ['living-docs-handler.sh', 'ac-validation-handler.sh', 'github-sync-handler.sh'],
    },
    // Legacy event routing (backward compat) - task.updated only
    {
      pattern: /^task\.updated$/,
      handlers: ['living-docs-handler.sh', 'ac-validation-handler.sh'],
    },
    {
      pattern: /^metadata\.changed$/,
      handlers: ['github-sync-handler.sh'],
    },
  ];

  for (const route of handlers) {
    if (route.pattern.test(type)) {
      for (const handlerName of route.handlers) {
        const handlerPath = path.join(state.handlerDir, handlerName);
        await runHandler(handlerPath, type, data, state);
      }
      return;
    }
  }

  appendLog(state.logFile, `Unknown event type: ${type}`);
}

/**
 * Main processing loop
 */
async function mainLoop(state: ProcessorState): Promise<void> {
  appendLog(state.logFile, `Processor started (PID: ${process.pid}, timeout: ${IDLE_TIMEOUT}s)`);

  // Write PID file
  fs.mkdirSync(path.dirname(state.pidFile), { recursive: true });
  fs.writeFileSync(state.pidFile, String(process.pid), 'utf-8');

  // Ensure queue directory exists
  fs.mkdirSync(state.queueDir, { recursive: true });

  while (true) {
    const event = dequeue(state);

    if (event) {
      state.idleCount = 0;
      await processEvent(event, state);
    } else {
      state.idleCount++;

      if (state.idleCount >= IDLE_TIMEOUT) {
        appendLog(state.logFile, `Idle timeout (${IDLE_TIMEOUT}s), exiting`);
        break;
      }

      // In non-daemon mode, exit after 3s of idle
      if (!state.daemonMode && state.idleCount >= 3) {
        break;
      }

      // Wait 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Cleanup
  state.lock.release();
  try {
    fs.unlinkSync(state.pidFile);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Check if hooks disabled
  if (process.env.SPECWEAVE_DISABLE_HOOKS === '1') {
    return;
  }

  // Parse arguments
  const daemonMode = process.argv.includes('--daemon');

  // Find project root
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    return;
  }

  // Initialize state
  const state = initState(projectRoot, daemonMode);

  // Try to acquire lock
  if (!state.lock.acquire(STALE_LOCK_SECONDS)) {
    // Another processor is running
    return;
  }

  // Check PID file for extra safety
  if (fs.existsSync(state.pidFile)) {
    try {
      const oldPid = parseInt(fs.readFileSync(state.pidFile, 'utf-8').trim(), 10);
      if (!isNaN(oldPid)) {
        try {
          process.kill(oldPid, 0);
          // Process is running - exit
          state.lock.release();
          return;
        } catch {
          // Process not running - continue
        }
      }
    } catch {
      // Ignore PID file errors
    }
  }

  // Run main loop
  try {
    await mainLoop(state);
  } catch (err) {
    appendLog(state.logFile, `Processor error: ${err}`);
  } finally {
    state.lock.release();
  }
}

// Run if executed directly
main().catch((err) => {
  console.error('Processor fatal error:', err);
  process.exit(1);
});
