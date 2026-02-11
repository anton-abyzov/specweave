/**
 * Temporary Home Directory Isolation for CLI Tests
 *
 * Inspired by OpenClaw's test/helpers/temp-home.ts pattern.
 *
 * Creates a temporary HOME directory so CLI tests never touch
 * the real ~/.specweave/ or ~/.claude/ directories.
 *
 * Usage:
 *   const restore = await withIsolatedHome('my-test');
 *   try {
 *     // HOME is now a temp dir
 *     // All CLI commands will use this isolated home
 *   } finally {
 *     await restore(); // Restores original HOME
 *   }
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

interface EnvSnapshot {
  HOME?: string;
  USERPROFILE?: string;
  SPECWEAVE_STATE_DIR?: string;
  XDG_CONFIG_HOME?: string;
}

/**
 * Creates isolated temp HOME and overrides env vars.
 * Returns a restore function that MUST be called in finally block.
 */
export async function withIsolatedHome(
  testName: string,
  extraEnv?: Record<string, string>
): Promise<{ homePath: string; restore: () => Promise<void> }> {
  // Snapshot current env
  const snapshot: EnvSnapshot = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    SPECWEAVE_STATE_DIR: process.env.SPECWEAVE_STATE_DIR,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  };

  // Create temp home
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const homePath = path.join(
    os.tmpdir(),
    `specweave-home-${testName}-${timestamp}-${random}`
  );
  await fs.mkdir(homePath, { recursive: true });

  // Create common subdirectories that CLI tools expect
  await fs.mkdir(path.join(homePath, '.specweave'), { recursive: true });
  await fs.mkdir(path.join(homePath, '.claude'), { recursive: true });

  // Override env vars
  process.env.HOME = homePath;
  process.env.USERPROFILE = homePath; // Windows compat
  process.env.SPECWEAVE_STATE_DIR = path.join(homePath, '.specweave', 'state');

  // Apply extra env vars
  const extraKeys: string[] = [];
  if (extraEnv) {
    for (const [key, value] of Object.entries(extraEnv)) {
      extraKeys.push(key);
      process.env[key] = value;
    }
  }

  const restore = async () => {
    // Restore original env
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    // Remove extra env vars
    for (const key of extraKeys) {
      if (!(key in snapshot)) {
        delete process.env[key];
      }
    }

    // Clean up temp dir
    try {
      await fs.rm(homePath, { recursive: true, force: true });
    } catch {
      // Cleanup failures shouldn't fail tests
    }
  };

  return { homePath, restore };
}

/**
 * Returns env object for child_process.spawn/exec with isolated home.
 * Use this when spawning CLI subprocesses in tests.
 */
export function getIsolatedEnv(
  homePath: string,
  extra?: Record<string, string>
): Record<string, string> {
  // Import getCleanEnv inline to avoid circular deps
  const cleanEnv = { ...process.env } as Record<string, string>;
  // Remove NODE_OPTIONS to prevent debugger flags breaking child processes
  delete cleanEnv.NODE_OPTIONS;

  return {
    ...cleanEnv,
    HOME: homePath,
    USERPROFILE: homePath,
    SPECWEAVE_STATE_DIR: `${homePath}/.specweave/state`,
    ...extra,
  };
}
