/**
 * Comprehensive tests for Auto Status CLI Command
 *
 * Tests the actual functions in auto-status.ts:
 * - findActiveIncrements (via command --json output)
 * - getStatusIcon (via displayParallelStatus with mocked orchestrator)
 * - formatProgress (via displayParallelStatus with mocked orchestrator)
 * - formatElapsedTime (via displayParallelStatus with mocked orchestrator)
 * - createAutoStatusCommand (exported, direct testing)
 * - displayParallelStatus (exported, direct testing)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Hoist mock functions so they are available to vi.mock factories
const { mockGetSessionStatus, mockGetSession, mockGetAgent } = vi.hoisted(() => ({
  mockGetSessionStatus: vi.fn(),
  mockGetSession: vi.fn(),
  mockGetAgent: vi.fn(),
}));

// Mock ParallelOrchestrator as a class constructor
vi.mock('../../../../src/core/auto/parallel/index.js', () => {
  return {
    ParallelOrchestrator: class MockParallelOrchestrator {
      getSessionStatus = mockGetSessionStatus;
      getSession = mockGetSession;
      getAgent = mockGetAgent;
    },
  };
});

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
  displayParallelStatus,
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

  mockGetSessionStatus.mockReset();
  mockGetSession.mockReset();
  mockGetAgent.mockReset();
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
// displayParallelStatus (exported function)
// ============================================================================

describe('displayParallelStatus', () => {
  it('shows "No active parallel session" when orchestrator returns null', () => {
    mockGetSessionStatus.mockReturnValue(null);

    displayParallelStatus(tempDir, {});
    const output = consoleLogs.join('\n');

    expect(output).toContain('No active parallel session');
    expect(output).toContain('specweave auto --parallel');
  });

  it('outputs JSON null when no session and --json', () => {
    mockGetSessionStatus.mockReturnValue(null);

    displayParallelStatus(tempDir, { json: true });
    const json = getJsonOutput();

    expect(json).toEqual({ parallelSession: null });
  });

  it('outputs session JSON when session exists and --json', () => {
    const sessionStatus = {
      sessionId: 'sess-001',
      incrementId: '0001-test',
      status: 'active',
      agents: [],
      overall: { totalAgents: 0, running: 0, completed: 0, failed: 0, pending: 0 },
      startedAt: '2024-01-01T00:00:00Z',
    };
    mockGetSessionStatus.mockReturnValue(sessionStatus);

    displayParallelStatus(tempDir, { json: true });
    const json = getJsonOutput();

    expect(json).toEqual(sessionStatus);
  });

  it('displays dashboard with session ID', () => {
    const sessionStatus = {
      sessionId: 'parallel-abc-123',
      incrementId: '0001-test',
      status: 'active',
      agents: [
        { id: 'agent-1', domain: 'frontend', status: 'running', progress: { completed: 3, total: 5 }, branch: 'auto/frontend' },
      ],
      overall: { totalAgents: 1, running: 1, completed: 0, failed: 0, pending: 0 },
      startedAt: '2024-01-01T00:00:00Z',
    };
    mockGetSessionStatus.mockReturnValue(sessionStatus);
    mockGetSession.mockReturnValue({
      agents: [
        { id: 'agent-1', domain: 'frontend', status: 'running', progress: { completed: 3, total: 5 }, branch: 'auto/frontend' },
      ],
    });
    mockGetAgent.mockReturnValue({
      id: 'agent-1',
      domain: 'frontend',
      status: 'running',
      progress: { completed: 3, total: 5 },
      worktree: { branch: 'auto/frontend-0001' },
      startedAt: new Date().toISOString(),
    });

    displayParallelStatus(tempDir, {});
    const output = consoleLogs.join('\n');

    expect(output).toContain('parallel-abc-123');
    expect(output).toContain('PARALLEL SESSION');
  });

  it('shows agent domain in dashboard', () => {
    const sessionStatus = {
      sessionId: 'sess-1',
      incrementId: '0001',
      status: 'active',
      agents: [
        { id: 'a1', domain: 'backend', status: 'completed', progress: { completed: 4, total: 4 }, branch: 'auto/backend' },
      ],
      overall: { totalAgents: 1, running: 0, completed: 1, failed: 0, pending: 0 },
      startedAt: '2024-01-01T00:00:00Z',
    };
    mockGetSessionStatus.mockReturnValue(sessionStatus);
    mockGetSession.mockReturnValue({
      agents: [{ id: 'a1' }],
    });
    mockGetAgent.mockReturnValue({
      id: 'a1',
      domain: 'backend',
      status: 'completed',
      progress: { completed: 4, total: 4 },
      worktree: { branch: 'auto/backend-0001' },
      startedAt: '2024-06-01T10:00:00Z',
    });

    displayParallelStatus(tempDir, {});
    const output = consoleLogs.join('\n');

    expect(output).toContain('backend');
  });

  it('shows overall progress percentage', () => {
    const sessionStatus = {
      sessionId: 'sess-1',
      incrementId: '0001',
      status: 'active',
      agents: [],
      overall: { totalAgents: 4, running: 1, completed: 2, failed: 1, pending: 0 },
      startedAt: '2024-01-01T00:00:00Z',
    };
    mockGetSessionStatus.mockReturnValue(sessionStatus);
    mockGetSession.mockReturnValue({ agents: [] });

    displayParallelStatus(tempDir, {});
    const output = consoleLogs.join('\n');

    // (completed + failed) / total = (2+1)/4 = 75%
    expect(output).toContain('75%');
  });

  it('handles null session from getSession gracefully', () => {
    const sessionStatus = {
      sessionId: 'sess-1',
      incrementId: '0001',
      status: 'active',
      agents: [],
      overall: { totalAgents: 0, running: 0, completed: 0, failed: 0, pending: 0 },
      startedAt: '2024-01-01T00:00:00Z',
    };
    mockGetSessionStatus.mockReturnValue(sessionStatus);
    mockGetSession.mockReturnValue(null);

    // Should not throw
    displayParallelStatus(tempDir, {});
  });

  it('handles null agent from getAgent gracefully', () => {
    const sessionStatus = {
      sessionId: 'sess-1',
      incrementId: '0001',
      status: 'active',
      agents: [
        { id: 'a1', domain: 'frontend', status: 'running', progress: { completed: 1, total: 3 }, branch: 'auto/frontend' },
      ],
      overall: { totalAgents: 1, running: 1, completed: 0, failed: 0, pending: 0 },
      startedAt: '2024-01-01T00:00:00Z',
    };
    mockGetSessionStatus.mockReturnValue(sessionStatus);
    mockGetSession.mockReturnValue({
      agents: [{ id: 'a1' }],
    });
    mockGetAgent.mockReturnValue(null);

    // Should not throw -- null agents are skipped with `if (!agent) continue`
    displayParallelStatus(tempDir, {});
  });
});

// ============================================================================
// getStatusIcon (tested via dashboard output for each status value)
// ============================================================================

describe('getStatusIcon', () => {
  function setupDashboardWithAgentStatus(status: string): string {
    const sessionStatus = {
      sessionId: 'icon-test',
      incrementId: '0001',
      status: 'active',
      agents: [
        { id: 'a1', domain: 'frontend', status, progress: { completed: 0, total: 1 }, branch: 'b' },
      ],
      overall: { totalAgents: 1, running: 0, completed: 0, failed: 0, pending: 0 },
      startedAt: '2024-01-01T00:00:00Z',
    };
    mockGetSessionStatus.mockReturnValue(sessionStatus);
    mockGetSession.mockReturnValue({ agents: [{ id: 'a1' }] });
    mockGetAgent.mockReturnValue({
      id: 'a1',
      domain: 'frontend',
      status,
      progress: { completed: 0, total: 1 },
      worktree: { branch: 'auto/frontend' },
      startedAt: undefined,
    });

    consoleLogs = [];
    displayParallelStatus(tempDir, {});
    return consoleLogs.join('\n');
  }

  it('returns hourglass for pending', () => {
    const output = setupDashboardWithAgentStatus('pending');
    expect(output).toContain('\u23F3'); // ⏳
  });

  it('returns cycle arrows for running', () => {
    const output = setupDashboardWithAgentStatus('running');
    expect(output).toContain('\uD83D\uDD04'); // 🔄
  });

  it('returns checkmark for completed', () => {
    const output = setupDashboardWithAgentStatus('completed');
    expect(output).toContain('\u2705'); // ✅
  });

  it('returns X for failed', () => {
    const output = setupDashboardWithAgentStatus('failed');
    expect(output).toContain('\u274C'); // ❌
  });

  it('returns no-entry for cancelled', () => {
    const output = setupDashboardWithAgentStatus('cancelled');
    expect(output).toContain('\uD83D\uDEAB'); // 🚫
  });

  it('returns question mark for unknown status', () => {
    const output = setupDashboardWithAgentStatus('something-unexpected');
    expect(output).toContain('\u2753'); // ❓
  });
});

// ============================================================================
// formatProgress (tested via dashboard output)
// ============================================================================

describe('formatProgress', () => {
  function setupDashboardWithProgress(completed: number, total: number): string {
    const sessionStatus = {
      sessionId: 'prog-test',
      incrementId: '0001',
      status: 'active',
      agents: [
        { id: 'a1', domain: 'frontend', status: 'running', progress: { completed, total }, branch: 'b' },
      ],
      overall: { totalAgents: 1, running: 1, completed: 0, failed: 0, pending: 0 },
      startedAt: '2024-01-01T00:00:00Z',
    };
    mockGetSessionStatus.mockReturnValue(sessionStatus);
    mockGetSession.mockReturnValue({ agents: [{ id: 'a1' }] });
    mockGetAgent.mockReturnValue({
      id: 'a1',
      domain: 'frontend',
      status: 'running',
      progress: { completed, total },
      worktree: { branch: 'auto/frontend' },
      startedAt: undefined,
    });

    consoleLogs = [];
    displayParallelStatus(tempDir, {});
    return consoleLogs.join('\n');
  }

  it('shows all empty blocks for 0/0', () => {
    const output = setupDashboardWithProgress(0, 0);
    // 0 filled, 6 empty: '░░░░░░'
    expect(output).toContain('░░░░░░');
    expect(output).toContain('0/0');
  });

  it('shows half-filled bar for 5/10', () => {
    const output = setupDashboardWithProgress(5, 10);
    // Math.round((5/10)*6) = 3 filled, 3 empty: '███░░░'
    expect(output).toContain('███░░░');
    expect(output).toContain('5/10');
  });

  it('shows fully-filled bar for 10/10', () => {
    const output = setupDashboardWithProgress(10, 10);
    // 6 filled, 0 empty: '██████'
    expect(output).toContain('██████');
    expect(output).toContain('10/10');
  });

  it('shows all empty blocks for 0/5', () => {
    const output = setupDashboardWithProgress(0, 5);
    // 0 filled, 6 empty: '░░░░░░'
    expect(output).toContain('░░░░░░');
    expect(output).toContain('0/5');
  });

  it('shows proportional bar for 1/3', () => {
    const output = setupDashboardWithProgress(1, 3);
    // Math.round((1/3)*6) = Math.round(2) = 2 filled, 4 empty: '██░░░░'
    expect(output).toContain('██░░░░');
    expect(output).toContain('1/3');
  });

  it('shows proportional bar for 2/3', () => {
    const output = setupDashboardWithProgress(2, 3);
    // Math.round((2/3)*6) = Math.round(4) = 4 filled, 2 empty: '████░░'
    expect(output).toContain('████░░');
    expect(output).toContain('2/3');
  });

  it('shows one filled block for 1/6', () => {
    const output = setupDashboardWithProgress(1, 6);
    // Math.round((1/6)*6) = Math.round(1) = 1 filled, 5 empty: '█░░░░░'
    expect(output).toContain('█░░░░░');
    expect(output).toContain('1/6');
  });
});

// ============================================================================
// formatElapsedTime (tested via dashboard output)
// ============================================================================

describe('formatElapsedTime', () => {
  function setupDashboardWithStartedAt(startedAt: string | undefined): string {
    const sessionStatus = {
      sessionId: 'time-test',
      incrementId: '0001',
      status: 'active',
      agents: [
        { id: 'a1', domain: 'frontend', status: 'running', progress: { completed: 0, total: 1 }, branch: 'b' },
      ],
      overall: { totalAgents: 1, running: 1, completed: 0, failed: 0, pending: 0 },
      startedAt: '2024-01-01T00:00:00Z',
    };
    mockGetSessionStatus.mockReturnValue(sessionStatus);
    mockGetSession.mockReturnValue({ agents: [{ id: 'a1' }] });
    mockGetAgent.mockReturnValue({
      id: 'a1',
      domain: 'frontend',
      status: 'running',
      progress: { completed: 0, total: 1 },
      worktree: { branch: 'auto/frontend' },
      startedAt,
    });

    consoleLogs = [];
    displayParallelStatus(tempDir, {});
    return consoleLogs.join('\n');
  }

  it('shows dash for undefined startedAt', () => {
    const output = setupDashboardWithStartedAt(undefined);
    expect(output).toContain('  -  ');
  });

  it('shows minutes format for recent start', () => {
    // 5 minutes ago
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const output = setupDashboardWithStartedAt(fiveMinAgo);
    // Should show '5m' (padded to 5 chars: '   5m')
    expect(output).toMatch(/\d+m/);
  });

  it('shows 0m for just started', () => {
    const justNow = new Date().toISOString();
    const output = setupDashboardWithStartedAt(justNow);
    expect(output).toContain('0m');
  });

  it('shows hours+minutes format for >= 60 minutes', () => {
    // 2h15m = 135 minutes ago
    const twoHoursAgo = new Date(Date.now() - 135 * 60 * 1000).toISOString();
    const output = setupDashboardWithStartedAt(twoHoursAgo);
    expect(output).toContain('2h15m');
  });

  it('shows exact hour boundary correctly', () => {
    // Exactly 60 minutes ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const output = setupDashboardWithStartedAt(oneHourAgo);
    expect(output).toContain('1h0m');
  });

  it('shows 30m for half hour', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const output = setupDashboardWithStartedAt(thirtyMinAgo);
    expect(output).toContain('30m');
    // Should not contain 'h' since under 60min
    expect(output).not.toMatch(/\dh/);
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

  it('has --parallel option', () => {
    const cmd = createAutoStatusCommand();
    const parallelOpt = cmd.options.find((o) => o.long === '--parallel');
    expect(parallelOpt).toBeDefined();
  });

  it('has --watch option', () => {
    const cmd = createAutoStatusCommand();
    const watchOpt = cmd.options.find((o) => o.long === '--watch');
    expect(watchOpt).toBeDefined();
  });

  it('has description set', () => {
    const cmd = createAutoStatusCommand();
    expect(cmd.description()).toBe('Check auto mode status');
  });
});

// ============================================================================
// --parallel flag routing
// ============================================================================

describe('--parallel flag routing', () => {
  it('calls displayParallelStatus when --parallel is passed', async () => {
    mockGetSessionStatus.mockReturnValue(null);

    await runCommand(['--parallel']);
    const output = consoleLogs.join('\n');

    // Should show parallel status (no session)
    expect(output).toContain('No active parallel session');
  });

  it('does not show standard auto mode output when --parallel is passed', async () => {
    mockGetSessionStatus.mockReturnValue(null);
    writeAutoFlag({ active: true, timestamp: new Date().toISOString() });

    await runCommand(['--parallel']);
    const output = consoleLogs.join('\n');

    // Should NOT show auto mode status
    expect(output).not.toContain('AUTO MODE STATUS');
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
