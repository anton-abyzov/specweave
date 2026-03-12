import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Mock setupIssueTracker before importing the command
const mockSetupIssueTracker = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock('../../src/cli/helpers/issue-tracker/index.js', () => ({
  setupIssueTracker: mockSetupIssueTracker,
}));

// Import after mocking
const { syncSetupCommand } = await import('../../src/cli/commands/sync-setup.js');

describe('syncSetupCommand', () => {
  let testRoot: string;
  let originalCwd: string;
  let originalExitCode: number | undefined;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-sync-setup-'));
    originalCwd = process.cwd();
    originalExitCode = process.exitCode as number | undefined;
    originalIsTTY = process.stdin.isTTY;
    process.chdir(testRoot);
    process.exitCode = undefined;
    mockSetupIssueTracker.mockClear();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.exitCode = originalExitCode;
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    fs.rmSync(testRoot, { recursive: true, force: true });
  });

  it('exits with error code when .specweave/config.json is missing', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    await syncSetupCommand({});
    expect(process.exitCode).toBe(1);
    expect(mockSetupIssueTracker).not.toHaveBeenCalled();
  });

  it('skips prompts and exits 0 in --quick mode', async () => {
    fs.mkdirSync(path.join(testRoot, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(testRoot, '.specweave', 'config.json'), '{}');
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    await syncSetupCommand({ quick: true });

    expect(process.exitCode).toBeUndefined();
    expect(mockSetupIssueTracker).not.toHaveBeenCalled();
  });

  it('skips prompts when stdin is not a TTY', async () => {
    fs.mkdirSync(path.join(testRoot, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(testRoot, '.specweave', 'config.json'), '{}');
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    await syncSetupCommand({});

    expect(process.exitCode).toBeUndefined();
    expect(mockSetupIssueTracker).not.toHaveBeenCalled();
  });

  it('calls setupIssueTracker with isCI: false in interactive mode', async () => {
    fs.mkdirSync(path.join(testRoot, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(testRoot, '.specweave', 'config.json'), '{}');
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    await syncSetupCommand({});

    expect(mockSetupIssueTracker).toHaveBeenCalledWith(
      expect.objectContaining({ isCI: false })
    );
  });

  it('passes github hosting hint when --provider github is specified', async () => {
    fs.mkdirSync(path.join(testRoot, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(testRoot, '.specweave', 'config.json'), '{}');
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    await syncSetupCommand({ provider: 'github' });

    expect(mockSetupIssueTracker).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryHosting: 'github-single' })
    );
  });

  it('passes ado hosting hint when --provider ado is specified', async () => {
    fs.mkdirSync(path.join(testRoot, '.specweave'), { recursive: true });
    fs.writeFileSync(path.join(testRoot, '.specweave', 'config.json'), '{}');
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    await syncSetupCommand({ provider: 'ado' });

    expect(mockSetupIssueTracker).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryHosting: 'ado-single' })
    );
  });

  it('reads language from config.json when present', async () => {
    fs.mkdirSync(path.join(testRoot, '.specweave'), { recursive: true });
    fs.writeFileSync(
      path.join(testRoot, '.specweave', 'config.json'),
      JSON.stringify({ i18n: { language: 'ru' } })
    );
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    await syncSetupCommand({});

    expect(mockSetupIssueTracker).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'ru' })
    );
  });
});
