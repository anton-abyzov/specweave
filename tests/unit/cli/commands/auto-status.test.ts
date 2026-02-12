/**
 * Comprehensive tests for Auto Status CLI Command
 *
 * Tests the actual functions in auto-status.ts:
 * - findActiveIncrements (via command --json output)
 * - createAutoStatusCommand (exported, direct testing)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock chalk to strip formatting for easier assertion
vi.mock('chalk', () => {
  const identity = (s: unknown) => String(s);
  const handler: ProxyHandler<typeof identity> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(identity, handler);
      if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') {
        return undefined;
      }
      return new Proxy(identity, handler);
    },
    apply(_target, _thisArg, args) {
      return String(args[0]);
    },
  };
  return { default: new Proxy(identity, handler) };
});

import {
  createAutoStatusCommand,
} from '../../../../src/cli/commands/auto-status.js';

// ============================================================================
// HELPERS
// ============================================================================

let tempDir: string;
let specweaveDir: string;
let incrementsDir: string;
let stateDir: string;
let consoleLogs: string[];
let consoleErrors: string[];
let originalCwd: () => string;
let originalExit: (code?: number) => never;

function createIncrement(name: string, status: string): void {
  const dir = path.join(incrementsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'metadata.json'),
    JSON.stringify({ status, id: name })
  );
}

function writeAutoFlag(data: Record<string, unknown>): void {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    path.join(stateDir, 'auto-mode.json'),
    JSON.stringify(data)
  );
}

/**
 * Run the auto-status command and capture output.
 * Returns parsed JSON when --json flag is used.
 */
async function runCommand(args: string[] = []): Promise<string[]> {
  consoleLogs = [];
  const cmd = createAutoStatusCommand();
  cmd.exitOverride(); // prevent process.exit
  try {
    await cmd.parseAsync(['node', 'auto-status', ...args]);
  } catch {
    // Commander may throw on exitOverride
  }
  return consoleLogs;
}

function getJsonOutput(): Record<string, unknown> | null {
  for (const line of consoleLogs) {
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      // not JSON
    }
  }
  return null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-status-test-'));
  specweaveDir = path.join(tempDir, '.specweave');
  incrementsDir = path.join(specweaveDir, 'increments');
  stateDir = path.join(specweaveDir, 'state');
  fs.mkdirSync(incrementsDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });

  consoleLogs = [];
  consoleErrors = [];

  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    consoleLogs.push(args.map(String).join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(' '));
  });

  originalCwd = process.cwd;
  process.cwd = () => tempDir;

  originalExit = process.exit;
  process.exit = vi.fn() as unknown as (code?: number) => never;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.cwd = originalCwd;
  process.exit = originalExit;
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================================
// findActiveIncrements (tested via --json output)
// ============================================================================

describe('findActiveIncrements', () => {
  it('returns empty array when increments directory does not exist', async () => {
    fs.rmSync(incrementsDir, { recursive: true, force: true });
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json).not.toBeNull();
    expect(json!.activeIncrements).toEqual([]);
    expect(json!.activeCount).toBe(0);
  });

  it('returns empty array when directory is empty', async () => {
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json).not.toBeNull();
    expect(json!.activeIncrements).toEqual([]);
  });

  it('includes increments with status "active"', async () => {
    createIncrement('0001-my-feature', 'active');
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeIncrements).toContain('0001-my-feature');
    expect(json!.activeCount).toBe(1);
  });

  it('includes increments with status "in-progress"', async () => {
    createIncrement('0002-wip', 'in-progress');
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeIncrements).toContain('0002-wip');
    expect(json!.activeCount).toBe(1);
  });

  it('excludes increments with status "completed"', async () => {
    createIncrement('0003-done', 'completed');
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeIncrements).not.toContain('0003-done');
    expect(json!.activeCount).toBe(0);
  });

  it('excludes increments with status "planning"', async () => {
    createIncrement('0004-planning', 'planning');
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeIncrements).not.toContain('0004-planning');
  });

  it('excludes increments with status "backlog"', async () => {
    createIncrement('0005-backlog', 'backlog');
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeIncrements).not.toContain('0005-backlog');
  });

  it('excludes increments with status "abandoned"', async () => {
    createIncrement('0006-abandoned', 'abandoned');
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeIncrements).not.toContain('0006-abandoned');
  });

  it('handles mixed statuses correctly', async () => {
    createIncrement('0001-active-one', 'active');
    createIncrement('0002-in-progress-one', 'in-progress');
    createIncrement('0003-completed-one', 'completed');
    createIncrement('0004-backlog-one', 'backlog');
    createIncrement('0005-active-two', 'active');
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeCount).toBe(3);
    const active = json!.activeIncrements as string[];
    expect(active).toContain('0001-active-one');
    expect(active).toContain('0002-in-progress-one');
    expect(active).toContain('0005-active-two');
    expect(active).not.toContain('0003-completed-one');
    expect(active).not.toContain('0004-backlog-one');
  });

  it('skips directories not matching 4-digit prefix', async () => {
    // Create dirs that don't match the /^[0-9]{4}-/ regex
    const nonMatch1 = path.join(incrementsDir, 'not-an-increment');
    fs.mkdirSync(nonMatch1, { recursive: true });
    fs.writeFileSync(
      path.join(nonMatch1, 'metadata.json'),
      JSON.stringify({ status: 'active' })
    );

    const nonMatch2 = path.join(incrementsDir, '01-short');
    fs.mkdirSync(nonMatch2, { recursive: true });
    fs.writeFileSync(
      path.join(nonMatch2, 'metadata.json'),
      JSON.stringify({ status: 'active' })
    );

    const nonMatch3 = path.join(incrementsDir, 'abc-letters');
    fs.mkdirSync(nonMatch3, { recursive: true });
    fs.writeFileSync(
      path.join(nonMatch3, 'metadata.json'),
      JSON.stringify({ status: 'active' })
    );

    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeCount).toBe(0);
  });

  it('skips directories missing metadata.json', async () => {
    // Dir with correct name pattern but no metadata.json
    const dir = path.join(incrementsDir, '0001-no-metadata');
    fs.mkdirSync(dir, { recursive: true });
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeCount).toBe(0);
  });

  it('skips directories with invalid JSON in metadata.json', async () => {
    const dir = path.join(incrementsDir, '0001-bad-json');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'metadata.json'), '{invalid json!!!');
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeCount).toBe(0);
  });

  it('skips metadata without status field', async () => {
    const dir = path.join(incrementsDir, '0001-no-status');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'metadata.json'),
      JSON.stringify({ id: '0001-no-status' })
    );
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeCount).toBe(0);
  });

  it('handles five-digit increment IDs that start with four digits', async () => {
    // This matches /^[0-9]{4}-/ because it starts with 4+ digits
    createIncrement('00010-extended', 'active');
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    // The regex /^[0-9]{4}-/ requires exactly 4 digits before hyphen.
    // '00010-extended' has 5 digits before hyphen, so the first 4 match then
    // the fifth is also a digit not a hyphen -- regex matches because
    // [0-9]{4} matches first 4 and the '-' is at position 5
    // Wait: '00010-extended' = digits '00010', then '-'.
    // /^[0-9]{4}-/ => match 4 digits then '-'. '0001' then '0' is not '-',
    // so this should NOT match.
    expect(json!.activeCount).toBe(0);
  });
});

// ============================================================================
// Auto mode flag detection (via --json output)
// ============================================================================

describe('auto mode flag detection', () => {
  it('detects active auto mode', async () => {
    writeAutoFlag({
      active: true,
      timestamp: '2024-06-01T10:00:00.000Z',
      incrementIds: ['0001-test'],
    });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.autoModeActive).toBe(true);
    expect(json!.startTime).toBe('2024-06-01T10:00:00.000Z');
    expect(json!.configuredIncrements).toEqual(['0001-test']);
  });

  it('detects inactive auto mode', async () => {
    writeAutoFlag({
      active: false,
      timestamp: '2024-06-01T10:00:00.000Z',
    });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.autoModeActive).toBe(false);
  });

  it('treats missing flag file as inactive', async () => {
    // No auto-mode.json written

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.autoModeActive).toBe(false);
    expect(json!.startTime).toBeNull();
    expect(json!.configuredIncrements).toEqual([]);
  });

  it('treats invalid JSON flag file as inactive', async () => {
    fs.writeFileSync(
      path.join(stateDir, 'auto-mode.json'),
      'not valid json'
    );

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.autoModeActive).toBe(false);
  });

  it('treats missing active field as inactive via nullish coalescing', async () => {
    writeAutoFlag({ timestamp: '2024-01-01T00:00:00Z' });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.autoModeActive).toBe(false);
  });

  it('returns null startTime when no flag exists', async () => {
    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.startTime).toBeNull();
  });

  it('returns configured increment IDs from flag', async () => {
    writeAutoFlag({
      active: true,
      timestamp: new Date().toISOString(),
      incrementIds: ['0001-a', '0002-b', '0003-c'],
    });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.configuredIncrements).toEqual(['0001-a', '0002-b', '0003-c']);
  });
});

// ============================================================================
// Human-readable output (non-JSON mode)
// ============================================================================

describe('human-readable output', () => {
  it('shows ACTIVE status when auto mode is active', async () => {
    writeAutoFlag({ active: true, timestamp: '2024-01-01T00:00:00Z' });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('ACTIVE');
    expect(output).toContain('AUTO MODE STATUS');
  });

  it('shows NOT ACTIVE status when auto mode is inactive', async () => {
    writeAutoFlag({ active: false, timestamp: '2024-01-01T00:00:00Z' });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('NOT ACTIVE');
  });

  it('shows started timestamp when active', async () => {
    writeAutoFlag({ active: true, timestamp: '2024-06-15T14:30:00.000Z' });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('2024-06-15T14:30:00.000Z');
  });

  it('lists active increments by name', async () => {
    createIncrement('0001-auth-module', 'active');
    createIncrement('0002-api-routes', 'in-progress');
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('0001-auth-module');
    expect(output).toContain('0002-api-routes');
  });

  it('shows "No active increments" when none found', async () => {
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('No active increments');
  });

  it('shows next steps with /sw:do when active with increments', async () => {
    createIncrement('0001-feature', 'active');
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('NEXT STEPS');
    expect(output).toContain('/sw:do');
    expect(output).toContain('cancel-auto');
  });

  it('shows warning when active but no increments', async () => {
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('Auto mode is active but no active increments found');
    expect(output).toContain('stop hook');
  });

  it('shows start command when not active', async () => {
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('specweave auto');
  });

  it('shows separator lines', async () => {
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('━'.repeat(50));
  });
});

// ============================================================================
// No .specweave project guard
// ============================================================================

describe('initialization guard', () => {
  it('shows warning when no .specweave directory exists', async () => {
    // Remove the .specweave dir entirely
    fs.rmSync(specweaveDir, { recursive: true, force: true });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('No SpecWeave project found');
    expect(output).toContain('specweave init');
  });

  it('does not output JSON when no .specweave directory exists', async () => {
    fs.rmSync(specweaveDir, { recursive: true, force: true });

    await runCommand(['--json']);
    const json = getJsonOutput();

    // Should not have produced JSON output because it returned early
    expect(json).toBeNull();
  });
});

// ============================================================================
// createAutoStatusCommand (exported function structure)
// ============================================================================

describe('createAutoStatusCommand', () => {
  it('returns a Command instance', () => {
    const cmd = createAutoStatusCommand();
    expect(cmd).toBeDefined();
    expect(cmd.name()).toBe('auto-status');
  });

  it('has --json option', () => {
    const cmd = createAutoStatusCommand();
    const jsonOpt = cmd.options.find((o) => o.long === '--json');
    expect(jsonOpt).toBeDefined();
  });

  it('has description set', () => {
    const cmd = createAutoStatusCommand();
    expect(cmd.description()).toBe('Check auto mode status');
  });
});

// ============================================================================
// Error handling in command action
// ============================================================================

describe('error handling', () => {
  it('handles errors thrown during execution', async () => {
    // Force an error by making the increments dir a file instead of directory
    fs.rmSync(incrementsDir, { recursive: true, force: true });
    fs.writeFileSync(incrementsDir, 'not a directory');
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });

    await runCommand([]);

    // Should have caught and displayed error
    const errorOutput = consoleErrors.join('\n');
    expect(errorOutput).toContain('Error:');
  });
});

// ============================================================================
// JSON output structure
// ============================================================================

describe('JSON output structure', () => {
  it('contains all expected fields', async () => {
    createIncrement('0001-test', 'active');
    writeAutoFlag({
      active: true,
      timestamp: '2024-01-01T00:00:00Z',
      incrementIds: ['0001-test'],
    });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json).toHaveProperty('autoModeActive');
    expect(json).toHaveProperty('startTime');
    expect(json).toHaveProperty('configuredIncrements');
    expect(json).toHaveProperty('activeIncrements');
    expect(json).toHaveProperty('activeCount');
  });

  it('is valid parseable JSON', async () => {
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);

    // Find the JSON line among console.log calls
    let foundJson = false;
    for (const line of consoleLogs) {
      try {
        JSON.parse(line);
        foundJson = true;
      } catch {
        // not JSON
      }
    }
    expect(foundJson).toBe(true);
  });

  it('activeCount matches activeIncrements length', async () => {
    createIncrement('0001-a', 'active');
    createIncrement('0002-b', 'in-progress');
    createIncrement('0003-c', 'active');
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    const increments = json!.activeIncrements as string[];
    expect(json!.activeCount).toBe(increments.length);
    expect(json!.activeCount).toBe(3);
  });
});

// ============================================================================
// RED PHASE: Additional Comprehensive Tests
// ============================================================================

describe('Auto Mode Lifecycle (RED Phase)', () => {
  it('should read auto-mode.json with all expected session fields', async () => {
    const flagData = {
      active: true,
      timestamp: '2024-06-01T10:00:00.000Z',
      incrementIds: ['0001-auth', '0002-api'],
      tddMode: true,
      requireTests: true,
      successCriteria: [
        { type: 'tasks_complete', description: 'All tasks complete', required: true },
        { type: 'tests_pass', description: 'Tests must pass', required: true }
      ],
      successSummary: 'All work complete'
    };
    writeAutoFlag(flagData);

    await runCommand(['--json']);
    const json = getJsonOutput();

    // Session should be detected as active
    expect(json!.autoModeActive).toBe(true);

    // All increment IDs should be preserved
    expect(json!.configuredIncrements).toEqual(['0001-auth', '0002-api']);
  });

  it('should handle auto-mode.json with success criteria', async () => {
    const flagData = {
      active: true,
      timestamp: '2024-06-01T10:00:00.000Z',
      incrementIds: ['0001-test'],
      successCriteria: [
        { type: 'tasks_complete', description: 'All tasks complete', required: true },
        { type: 'acs_satisfied', description: 'All ACs met', required: true },
        { type: 'tests_pass', description: 'Tests pass', required: true }
      ]
    };
    writeAutoFlag(flagData);
    createIncrement('0001-test', 'active');

    await runCommand(['--json']);
    const json = getJsonOutput();

    // Should detect active mode
    expect(json!.autoModeActive).toBe(true);
    // Should have the configured increment
    expect(json!.configuredIncrements).toContain('0001-test');
  });

  it('should track actual active increments separately from configured ones', async () => {
    // Create some increments
    createIncrement('0001-active', 'active');
    createIncrement('0002-active', 'active');
    createIncrement('0003-completed', 'completed');

    // Configure auto mode with different increments
    writeAutoFlag({
      active: true,
      timestamp: '2024-06-01T10:00:00.000Z',
      incrementIds: ['0001-active', '0002-active', '0999-doesnt-exist']
    });

    await runCommand(['--json']);
    const json = getJsonOutput();

    // configuredIncrements = what was set in auto-mode.json
    expect((json!.configuredIncrements as string[]).length).toBe(3);

    // activeIncrements = actually active in metadata (source of truth)
    const active = json!.activeIncrements as string[];
    expect(active).toContain('0001-active');
    expect(active).toContain('0002-active');
    expect(active).not.toContain('0003-completed');
  });

  it('should show session start time in human-readable format', async () => {
    writeAutoFlag({
      active: true,
      timestamp: '2024-06-15T14:30:00.000Z',
      incrementIds: ['0001-test']
    });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    // Should display the timestamp
    expect(output).toContain('2024-06-15T14:30:00.000Z');
  });

  it('should show different UI when auto mode is active vs inactive', async () => {
    // Case 1: Active
    writeAutoFlag({
      active: true,
      timestamp: new Date().toISOString(),
      incrementIds: ['0001-test']
    });
    createIncrement('0001-test', 'active');

    await runCommand([]);
    let output = consoleLogs.join('\n');

    expect(output).toContain('ACTIVE');
    expect(output).not.toContain('NOT ACTIVE');

    // Clear for next test
    consoleLogs = [];

    // Case 2: Inactive
    fs.writeFileSync(
      path.join(stateDir, 'auto-mode.json'),
      JSON.stringify({ active: false, timestamp: new Date().toISOString() })
    );

    await runCommand([]);
    output = consoleLogs.join('\n');

    expect(output).toContain('NOT ACTIVE');
  });
});

describe('Session Marker Persistence', () => {
  it('should preserve session marker when querying status multiple times', async () => {
    const flagData = {
      active: true,
      timestamp: '2024-06-01T10:00:00.000Z',
      incrementIds: ['0001-test']
    };
    writeAutoFlag(flagData);

    // Query once
    await runCommand(['--json']);
    let json = getJsonOutput();
    expect(json!.autoModeActive).toBe(true);

    // Verify file still exists
    const flagPath = path.join(stateDir, 'auto-mode.json');
    expect(fs.existsSync(flagPath)).toBe(true);

    // Query again
    consoleLogs = [];
    await runCommand(['--json']);
    json = getJsonOutput();
    expect(json!.autoModeActive).toBe(true);
  });

  it('should handle concurrent reads of auto-mode.json', async () => {
    writeAutoFlag({
      active: true,
      timestamp: '2024-06-01T10:00:00.000Z',
      incrementIds: ['0001-test', '0002-test']
    });

    // Multiple concurrent reads
    const results = await Promise.all([
      runCommand(['--json']).then(() => getJsonOutput()),
      runCommand(['--json']).then(() => getJsonOutput())
    ]);

    for (const json of results) {
      expect(json!.autoModeActive).toBe(true);
      expect((json!.configuredIncrements as string[]).length).toBe(2);
    }
  });
});

describe('Increment Status Integration', () => {
  it('should count multiple active increments', async () => {
    for (let i = 1; i <= 5; i++) {
      createIncrement(`000${i}-feature`, 'active');
    }
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeCount).toBe(5);
    expect((json!.activeIncrements as string[]).length).toBe(5);
  });

  it('should correctly identify mixed statuses', async () => {
    // Create with various statuses
    createIncrement('0001-active-1', 'active');
    createIncrement('0002-in-progress-1', 'in-progress');
    createIncrement('0003-active-2', 'active');
    createIncrement('0004-completed-1', 'completed');
    createIncrement('0005-backlog-1', 'backlog');
    createIncrement('0006-planning-1', 'planning');

    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    // Should only count active + in-progress
    expect(json!.activeCount).toBe(3);
    const active = json!.activeIncrements as string[];
    expect(active).toEqual(
      expect.arrayContaining(['0001-active-1', '0002-in-progress-1', '0003-active-2'])
    );
  });

  it('should handle special characters in increment IDs', async () => {
    // Create increments with hyphens and numbers
    createIncrement('0001-auth-service-v2', 'active');
    createIncrement('0002-api-routes-refactor', 'in-progress');

    writeAutoFlag({
      active: true,
      timestamp: new Date().toISOString(),
      incrementIds: ['0001-auth-service-v2', '0002-api-routes-refactor']
    });

    await runCommand(['--json']);
    const json = getJsonOutput();

    expect(json!.activeIncrements).toContain('0001-auth-service-v2');
    expect(json!.activeIncrements).toContain('0002-api-routes-refactor');
  });
});

describe('Next Steps Guidance', () => {
  it('should show /sw:do when active with increments', async () => {
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });
    createIncrement('0001-feature', 'active');

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('NEXT STEPS');
    expect(output).toContain('/sw:do');
  });

  it('should show cancel command when active', async () => {
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });
    createIncrement('0001-feature', 'active');

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('cancel-auto');
  });

  it('should show how to start auto mode when not active', async () => {
    writeAutoFlag({ active: false, timestamp: new Date().toISOString() });

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('specweave auto');
  });

  it('should warn when active but no increments', async () => {
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });
    // No active increments

    await runCommand([]);
    const output = consoleLogs.join('\n');

    expect(output).toContain('Auto mode is active but no active increments found');
  });
});

describe('Error Resilience', () => {
  it('should handle corrupted auto-mode.json gracefully', async () => {
    fs.writeFileSync(
      path.join(stateDir, 'auto-mode.json'),
      'corrupted data }{['
    );

    await runCommand([]);
    // Should not crash, treat as inactive

    expect(consoleErrors.length === 0 || consoleLogs.length > 0).toBe(true);
  });

  it('should handle empty auto-mode.json', async () => {
    fs.writeFileSync(
      path.join(stateDir, 'auto-mode.json'),
      ''
    );

    await runCommand([]);
    // Should handle gracefully
    expect(consoleLogs.length > 0 || consoleErrors.length > 0).toBe(true);
  });

  it('should handle missing metadata.json in increment', async () => {
    const dir = path.join(incrementsDir, '0001-no-meta');
    fs.mkdirSync(dir, { recursive: true });
    // No metadata.json

    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });

    await runCommand(['--json']);
    const json = getJsonOutput();

    // Should skip the invalid increment
    expect(json!.activeCount).toBe(0);
  });

  it('should handle null/undefined active field in auto-mode.json', async () => {
    writeAutoFlag({
      timestamp: new Date().toISOString(),
      // No 'active' field
    });

    await runCommand(['--json']);
    const json = getJsonOutput();

    // Should treat as inactive
    expect(json!.autoModeActive).toBe(false);
  });
});
