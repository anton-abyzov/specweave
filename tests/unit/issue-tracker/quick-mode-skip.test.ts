/**
 * Unit Tests for --quick mode skipping issue tracker prompt
 *
 * When `specweave init --quick` is used, the issue tracker setup should be
 * skipped entirely without prompting the user.
 *
 * BUG: setupIssueTrackerWrapper() receives isCI=true but doesn't pass it
 * to setupIssueTracker(), which re-detects CI from env vars only and misses
 * the --quick flag.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Mock @inquirer/prompts
const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn()
}));

vi.mock('@inquirer/prompts', () => ({
  select: mockSelect,
  input: vi.fn(),
  confirm: vi.fn(),
  password: vi.fn()
}));

// Mock chalk
vi.mock('chalk', () => {
  const identity = (x: string) => x;
  return {
    default: {
      cyan: Object.assign(identity, { bold: identity }),
      gray: identity,
      green: identity,
      yellow: identity,
      red: identity,
      white: identity,
      bold: identity
    }
  };
});

// Mock github-multi-repo module
vi.mock('../../../src/cli/helpers/issue-tracker/github-multi-repo.js', () => ({
  promptGitHubSetupType: vi.fn(),
  configureNoRepository: vi.fn(),
  configureSingleRepository: vi.fn(),
  configureMultipleRepositories: vi.fn(),
  configureMonorepo: vi.fn(),
  autoDetectRepositories: vi.fn()
}));

describe('--quick mode skips issue tracker setup', () => {
  let tempDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  const originalIsTTY = process.stdin.isTTY;
  const originalCI = process.env.CI;
  const originalGHA = process.env.GITHUB_ACTIONS;
  const originalGLC = process.env.GITLAB_CI;
  const originalCCI = process.env.CIRCLECI;
  const originalJenkins = process.env.JENKINS_URL;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-quick-test-'));
    fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Simulate a real TTY terminal (not CI) — this is where --quick matters
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.CIRCLECI;
    delete process.env.JENKINS_URL;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    // Restore original values
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    if (originalCI !== undefined) process.env.CI = originalCI; else delete process.env.CI;
    if (originalGHA !== undefined) process.env.GITHUB_ACTIONS = originalGHA; else delete process.env.GITHUB_ACTIONS;
    if (originalGLC !== undefined) process.env.GITLAB_CI = originalGLC; else delete process.env.GITLAB_CI;
    if (originalCCI !== undefined) process.env.CIRCLECI = originalCCI; else delete process.env.CIRCLECI;
    if (originalJenkins !== undefined) process.env.JENKINS_URL = originalJenkins; else delete process.env.JENKINS_URL;
  });

  it('should skip issue tracker prompt when isCI is passed as true (quick mode)', async () => {
    const { setupIssueTracker } = await import('../../../src/cli/helpers/issue-tracker/index.js');

    const result = await setupIssueTracker({
      projectPath: tempDir,
      language: 'en',
      maxRetries: 3,
      isCI: true
    });

    expect(result).toBe(true);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('should show "Quick mode" message, not "CI environment detected"', async () => {
    const { setupIssueTracker } = await import('../../../src/cli/helpers/issue-tracker/index.js');

    await setupIssueTracker({
      projectPath: tempDir,
      language: 'en',
      isCI: true
    });

    const allOutput = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).toContain('Quick mode');
    expect(allOutput).not.toContain('CI environment detected');
  });

  it('should skip when JENKINS_URL is set (env-based CI detection)', async () => {
    process.env.JENKINS_URL = 'http://jenkins.local:8080';

    const { setupIssueTracker } = await import('../../../src/cli/helpers/issue-tracker/index.js');

    const result = await setupIssueTracker({
      projectPath: tempDir,
      language: 'en'
    });

    expect(result).toBe(true);
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
