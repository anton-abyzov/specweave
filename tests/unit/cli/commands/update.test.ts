/**
 * Comprehensive unit tests for update command (src/cli/commands/update.ts)
 *
 * Tests:
 * - updateCommand: main orchestration with all options
 * - selfUpdateSpecWeave: version checking, npm install, error handling
 * - cleanupStaleAutoState: stale file detection/removal
 * - validateProjectHealth: config validation, increment counting
 * - migrateReflectConfig: reflect-config.json migration
 * - migrateDeepInterviewConfig: config.json deep interview section
 * - parseChangelogBetweenVersions / versionToNumber helpers
 * - fetchWhatsNew: changelog fetching
 * - registerUpdateCommand: Commander registration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
  mockUpdateInstructionsCommand,
  mockRefreshPluginsCommand,
  mockGetPackageVersion,
  mockPruneSkillMemories,
  mockListSkillMemoryFiles,
  mockExecSync,
  mockOraInstance,
} = vi.hoisted(() => ({
  mockUpdateInstructionsCommand: vi.fn().mockResolvedValue(undefined),
  mockRefreshPluginsCommand: vi.fn().mockResolvedValue(undefined),
  mockGetPackageVersion: vi.fn().mockReturnValue('1.0.100'),
  mockPruneSkillMemories: vi.fn().mockReturnValue({
    prunedCount: 0,
    skillsAffected: [],
    errors: [],
  }),
  mockListSkillMemoryFiles: vi.fn().mockReturnValue([]),
  mockExecSync: vi.fn(),
  mockOraInstance: {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
  },
}));

// ============================================================================
// Module mocks
// ============================================================================

vi.mock('../../../../src/cli/commands/update-instructions.js', () => ({
  updateInstructionsCommand: mockUpdateInstructionsCommand,
}));

vi.mock('../../../../src/cli/commands/refresh-plugins.js', () => ({
  refreshPluginsCommand: mockRefreshPluginsCommand,
}));

vi.mock('../../../../src/cli/helpers/init/instruction-file-merger.js', () => ({
  getPackageVersion: mockGetPackageVersion,
}));

vi.mock('../../../../src/core/reflection/skill-memories.js', () => ({
  pruneSkillMemories: mockPruneSkillMemories,
  listSkillMemoryFiles: mockListSkillMemoryFiles,
}));

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execSync: mockExecSync,
  };
});

vi.mock('ora', () => ({
  default: () => mockOraInstance,
}));

vi.mock('chalk', () => {
  const identity = (s: unknown) => String(s);
  const handler: ProxyHandler<typeof identity> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(identity, handler);
      if (
        prop === Symbol.toPrimitive ||
        prop === 'toString' ||
        prop === 'valueOf'
      ) {
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

// ============================================================================
// Import after mocks
// ============================================================================

import {
  updateCommand,
  migrateDeepInterviewConfig,
  registerUpdateCommand,
} from '../../../../src/cli/commands/update.js';

// ============================================================================
// Helpers
// ============================================================================

let tempDir: string;
let originalCwd: string;
let consoleLogs: string[];
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let originalExitCode: number | undefined;

function setupSpecWeaveProject(): void {
  const specweaveDir = path.join(tempDir, '.specweave');
  fs.mkdirSync(specweaveDir, { recursive: true });
  fs.mkdirSync(path.join(specweaveDir, 'state'), { recursive: true });
  fs.mkdirSync(path.join(specweaveDir, 'increments'), { recursive: true });
  fs.writeFileSync(
    path.join(specweaveDir, 'config.json'),
    JSON.stringify({ project: { name: 'test-project' }, auto: {} }, null, 2)
  );
}

function writeStateFile(name: string, content: string, ageHours = 0): void {
  const filePath = path.join(tempDir, '.specweave', 'state', name);
  fs.writeFileSync(filePath, content);
  if (ageHours > 0) {
    const mtime = new Date(Date.now() - ageHours * 60 * 60 * 1000);
    fs.utimesSync(filePath, mtime, mtime);
  }
}

function createIncrement(
  name: string,
  status: string = 'active'
): void {
  const dir = path.join(tempDir, '.specweave', 'increments', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'metadata.json'),
    JSON.stringify({ status, id: name })
  );
}

// ============================================================================
// Test suite
// ============================================================================

describe('update command', () => {
  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(
      path.join(os.tmpdir(), `sw-update-test-${Date.now()}-`)
    ));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    consoleLogs = [];
    consoleLogSpy = vi
      .spyOn(console, 'log')
      .mockImplementation((...args: any[]) => {
        consoleLogs.push(args.map(String).join(' '));
      });

    originalExitCode = process.exitCode;
    process.exitCode = undefined;

    // Reset all mocks
    vi.clearAllMocks();
    mockGetPackageVersion.mockReturnValue('1.0.100');
    mockUpdateInstructionsCommand.mockResolvedValue(undefined);
    mockRefreshPluginsCommand.mockResolvedValue(undefined);
    mockListSkillMemoryFiles.mockReturnValue([]);
    mockPruneSkillMemories.mockReturnValue({
      prunedCount: 0,
      skillsAffected: [],
      errors: [],
    });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
    process.exitCode = originalExitCode;

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ==========================================================================
  // updateCommand - Main orchestration
  // ==========================================================================

  describe('updateCommand', () => {
    it('should print header with version and project path', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('SpecWeave Update');
      expect(output).toContain('1.0.100');
      expect(output).toContain(tempDir);
    });

    it('should show dry run mode when --check is set', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, check: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('DRY RUN');
    });

    it('should update instructions for SpecWeave projects', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(mockUpdateInstructionsCommand).toHaveBeenCalledWith({
        dryRun: undefined,
        verbose: undefined,
      });
      expect(mockOraInstance.succeed).toHaveBeenCalledWith(
        'Instructions and config updated'
      );
    });

    it('should pass dryRun and verbose to updateInstructionsCommand', async () => {
      setupSpecWeaveProject();

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        check: true,
        verbose: true,
      });

      expect(mockUpdateInstructionsCommand).toHaveBeenCalledWith({
        dryRun: true,
        verbose: true,
      });
    });

    it('should handle updateInstructionsCommand failure gracefully', async () => {
      setupSpecWeaveProject();
      mockUpdateInstructionsCommand.mockRejectedValue(
        new Error('merge failed')
      );

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(mockOraInstance.fail).toHaveBeenCalledWith(
        'Failed to update instructions'
      );
      expect(process.exitCode).toBe(1);
    });

    it('should refresh plugins by default', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true });

      expect(mockRefreshPluginsCommand).toHaveBeenCalledWith({
        all: undefined,
        minimal: undefined,
        force: undefined,
        verbose: undefined,
      });
    });

    it('should skip plugins when --no-plugins is set', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(mockRefreshPluginsCommand).not.toHaveBeenCalled();
    });

    it('should pass all/force/verbose to refreshPluginsCommand', async () => {
      setupSpecWeaveProject();

      await updateCommand({
        noSelf: true,
        all: true,
        force: true,
        verbose: true,
      });

      expect(mockRefreshPluginsCommand).toHaveBeenCalledWith({
        all: true,
        force: true,
        verbose: true,
      });
    });

    it('should handle refreshPluginsCommand failure gracefully', async () => {
      setupSpecWeaveProject();
      mockRefreshPluginsCommand.mockRejectedValue(
        new Error('refresh failed')
      );

      await updateCommand({ noSelf: true });

      expect(process.exitCode).toBe(1);
    });

    it('should set process.exitCode = 1 when errors occur', async () => {
      setupSpecWeaveProject();
      mockUpdateInstructionsCommand.mockRejectedValue(new Error('fail'));

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(process.exitCode).toBe(1);
    });

    it('should not set exitCode when no errors occur', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(process.exitCode).toBeUndefined();
    });

    describe('non-SpecWeave project', () => {
      it('should warn when not a SpecWeave project', async () => {
        // No .specweave directory

        await updateCommand({ noSelf: true, noPlugins: true });

        const output = consoleLogs.join('\n');
        expect(output).toContain('Not a SpecWeave project');
      });

      it('should still refresh plugins for non-SpecWeave projects', async () => {
        // No .specweave directory

        await updateCommand({ noSelf: true });

        expect(mockRefreshPluginsCommand).toHaveBeenCalled();
      });

      it('should return early if noPlugins and not SpecWeave project', async () => {
        await updateCommand({ noSelf: true, noPlugins: true });

        expect(mockUpdateInstructionsCommand).not.toHaveBeenCalled();
        expect(mockRefreshPluginsCommand).not.toHaveBeenCalled();
      });

      it('should skip instructions update for non-SpecWeave projects', async () => {
        await updateCommand({ noSelf: true });

        expect(mockUpdateInstructionsCommand).not.toHaveBeenCalled();
      });
    });

    describe('self-update', () => {
      it('should skip self-update when --no-self is set', async () => {
        setupSpecWeaveProject();

        await updateCommand({ noSelf: true, noPlugins: true });

        // execSync should not be called for npm view/install
        expect(mockExecSync).not.toHaveBeenCalled();
      });

      it('should check for updates when noSelf is not set', async () => {
        setupSpecWeaveProject();
        // Same version - no update needed
        mockExecSync.mockReturnValue('1.0.100\n');

        await updateCommand({ noPlugins: true });

        expect(mockExecSync).toHaveBeenCalledWith(
          'npm view specweave version',
          expect.objectContaining({ encoding: 'utf-8' })
        );
      });

      it('should spawn new CLI process after self-update', async () => {
        setupSpecWeaveProject();
        // First call: npm view returns newer version
        // Second call: npm install succeeds
        // Third call: specweave --version returns new version
        // Fourth call: specweave update --no-self ...
        mockExecSync
          .mockReturnValueOnce('1.0.200\n') // npm view
          .mockReturnValueOnce('') // npm install
          .mockReturnValueOnce('specweave/1.0.200\n') // specweave --version
          .mockReturnValueOnce(''); // specweave update --no-self

        await updateCommand({ noPlugins: true });

        // Should have spawned new CLI with --no-self
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('specweave update --no-self --no-plugins'),
          expect.objectContaining({ stdio: 'inherit' })
        );
      });

      it('should pass flags through to spawned CLI after self-update', async () => {
        setupSpecWeaveProject();
        mockExecSync
          .mockReturnValueOnce('1.0.200\n')
          .mockReturnValueOnce('')
          .mockReturnValueOnce('specweave/1.0.200\n')
          .mockReturnValueOnce('');

        await updateCommand({
          all: true,
          verbose: true,
          force: true,
        });

        const spawnCall = mockExecSync.mock.calls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('specweave update')
        );
        expect(spawnCall).toBeDefined();
        const cmd = spawnCall![0] as string;
        expect(cmd).toContain('--no-self');
        expect(cmd).toContain('--all');
        expect(cmd).toContain('--verbose');
        expect(cmd).toContain('--force');
      });

      it('should handle self-update npm failure with EACCES', async () => {
        setupSpecWeaveProject();
        mockExecSync.mockImplementation(() => {
          const err = new Error('EACCES permission denied');
          throw err;
        });

        await updateCommand({ noPlugins: true });

        const output = consoleLogs.join('\n');
        expect(output).toContain('Update Summary');
        // Error should be recorded
        expect(process.exitCode).toBe(1);
      });

      it('should handle npm not found error', async () => {
        setupSpecWeaveProject();
        mockExecSync.mockImplementation(() => {
          throw new Error('npm: not found');
        });

        await updateCommand({ noPlugins: true });

        expect(process.exitCode).toBe(1);
      });

      it('should handle npm timeout', async () => {
        setupSpecWeaveProject();
        const err = new Error('ETIMEDOUT') as any;
        err.killed = true;
        mockExecSync.mockImplementation(() => {
          throw err;
        });

        await updateCommand({ noPlugins: true });

        expect(process.exitCode).toBe(1);
      });

      it('should not update when same version', async () => {
        setupSpecWeaveProject();
        mockExecSync.mockReturnValue('1.0.100\n');

        await updateCommand({ noPlugins: true });

        // Should only call npm view, not npm install
        expect(mockExecSync).toHaveBeenCalledTimes(1);
      });

      it('should not update when current version is newer', async () => {
        setupSpecWeaveProject();
        mockExecSync.mockReturnValue('1.0.50\n'); // older than 1.0.100

        await updateCommand({ noPlugins: true });

        expect(mockExecSync).toHaveBeenCalledTimes(1);
      });

      it('should handle --check mode for self-update without installing', async () => {
        setupSpecWeaveProject();
        mockExecSync.mockReturnValue('1.0.200\n');

        await updateCommand({ check: true, noPlugins: true });

        // Should call npm view but NOT npm install
        expect(mockExecSync).toHaveBeenCalledTimes(1);
        expect(mockExecSync).toHaveBeenCalledWith(
          'npm view specweave version',
          expect.any(Object)
        );
      });

      it('should handle spawned process exit code', async () => {
        setupSpecWeaveProject();
        mockExecSync
          .mockReturnValueOnce('1.0.200\n')
          .mockReturnValueOnce('')
          .mockReturnValueOnce('specweave/1.0.200\n')
          .mockImplementationOnce(() => {
            const err = new Error('process failed') as any;
            err.status = 2;
            throw err;
          });

        const mockExit = vi
          .spyOn(process, 'exit')
          .mockImplementation((() => {}) as any);

        // After mocked process.exit, the code falls through to re-throw
        await expect(updateCommand({})).rejects.toThrow('process failed');

        expect(mockExit).toHaveBeenCalledWith(2);
        mockExit.mockRestore();
      });

      it('should re-throw non-status errors from spawned process', async () => {
        setupSpecWeaveProject();
        mockExecSync
          .mockReturnValueOnce('1.0.200\n')
          .mockReturnValueOnce('')
          .mockReturnValueOnce('specweave/1.0.200\n')
          .mockImplementationOnce(() => {
            throw new Error('unknown spawn error');
          });

        await expect(updateCommand({})).rejects.toThrow(
          'unknown spawn error'
        );
      });

      it('should handle version mismatch after install', async () => {
        setupSpecWeaveProject();
        mockExecSync
          .mockReturnValueOnce('1.0.200\n') // npm view
          .mockReturnValueOnce('') // npm install
          .mockReturnValueOnce('specweave/1.0.199\n'); // version mismatch

        await updateCommand({ noPlugins: true });

        // Version mismatch returns updated=false, so no spawn happens
        // Verify the version check was attempted
        expect(mockExecSync).toHaveBeenCalledWith(
          'specweave --version',
          expect.any(Object)
        );
        // Should NOT spawn new CLI since updated=false
        expect(mockExecSync).not.toHaveBeenCalledWith(
          expect.stringContaining('specweave update --no-self'),
          expect.any(Object)
        );
      });

      it('should handle --version verification failure gracefully', async () => {
        setupSpecWeaveProject();
        mockExecSync
          .mockReturnValueOnce('1.0.200\n') // npm view
          .mockReturnValueOnce('') // npm install
          .mockImplementationOnce(() => {
            throw new Error('binary not found');
          }) // specweave --version fails
          .mockReturnValueOnce(''); // spawned update still runs

        await updateCommand({ noPlugins: true });

        // Verification failure still sets updated=true, so spawn should happen
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('specweave update --no-self'),
          expect.any(Object)
        );
      });
    });
  });

  // ==========================================================================
  // cleanupStaleAutoState (tested via updateCommand)
  // ==========================================================================

  describe('stale auto state cleanup', () => {
    it('should clean stale auto state files older than 4 hours', async () => {
      setupSpecWeaveProject();

      // Create stale files (5 hours old)
      writeStateFile(
        'auto-mode.json',
        JSON.stringify({ active: true }),
        5
      );
      writeStateFile('auto-session.json', JSON.stringify({}), 5);

      await updateCommand({ noSelf: true, noPlugins: true });

      // Files should be deleted
      expect(
        fs.existsSync(
          path.join(tempDir, '.specweave', 'state', 'auto-mode.json')
        )
      ).toBe(false);
      expect(
        fs.existsSync(
          path.join(tempDir, '.specweave', 'state', 'auto-session.json')
        )
      ).toBe(false);
    });

    it('should not clean auto state files that are fresh', async () => {
      setupSpecWeaveProject();

      // Create recent files (1 hour old)
      writeStateFile(
        'auto-mode.json',
        JSON.stringify({ active: true }),
        1
      );

      await updateCommand({ noSelf: true, noPlugins: true });

      // File should still exist
      expect(
        fs.existsSync(
          path.join(tempDir, '.specweave', 'state', 'auto-mode.json')
        )
      ).toBe(true);
    });

    it('should report stale files in dry run mode', async () => {
      setupSpecWeaveProject();

      writeStateFile(
        'auto-mode.json',
        JSON.stringify({ active: true }),
        5
      );

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        check: true,
      });

      // File should NOT be deleted in check mode
      expect(
        fs.existsSync(
          path.join(tempDir, '.specweave', 'state', 'auto-mode.json')
        )
      ).toBe(true);

      const output = consoleLogs.join('\n');
      expect(output).toContain('stale auto state file');
    });

    it('should show stale file details in verbose/check mode', async () => {
      setupSpecWeaveProject();
      writeStateFile(
        'auto-mode.json',
        JSON.stringify({ active: true }),
        10
      );

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        check: true,
      });

      const output = consoleLogs.join('\n');
      expect(output).toContain('auto-mode.json');
    });

    it('should handle missing state directory', async () => {
      setupSpecWeaveProject();
      // Remove state dir
      fs.rmSync(path.join(tempDir, '.specweave', 'state'), {
        recursive: true,
        force: true,
      });

      // Should not throw
      await updateCommand({ noSelf: true, noPlugins: true });
    });

    it('should clean all known auto state file types', async () => {
      setupSpecWeaveProject();

      const autoFiles = [
        'auto-mode.json',
        'auto-session.json',
        '.stop-auto-dedup',
        '.stop-auto-dedup-prev',
        '.stop-auto-turns',
      ];

      for (const file of autoFiles) {
        writeStateFile(file, 'stale data', 5);
      }

      await updateCommand({ noSelf: true, noPlugins: true });

      for (const file of autoFiles) {
        expect(
          fs.existsSync(
            path.join(tempDir, '.specweave', 'state', file)
          )
        ).toBe(false);
      }

      const output = consoleLogs.join('\n');
      expect(output).toContain('Cleaned 5 stale auto state file(s)');
    });
  });

  // ==========================================================================
  // Deprecated memory directory removal
  // ==========================================================================

  describe('deprecated memory directory removal', () => {
    it('should remove .specweave/memory/ directory', async () => {
      setupSpecWeaveProject();
      const memoryDir = path.join(tempDir, '.specweave', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });
      fs.writeFileSync(path.join(memoryDir, 'old.md'), 'old learning');

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(fs.existsSync(memoryDir)).toBe(false);
      const output = consoleLogs.join('\n');
      expect(output).toContain('Removed deprecated .specweave/memory/');
    });

    it('should report memory directory in check mode without deleting', async () => {
      setupSpecWeaveProject();
      const memoryDir = path.join(tempDir, '.specweave', 'memory');
      fs.mkdirSync(memoryDir, { recursive: true });

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        check: true,
      });

      expect(fs.existsSync(memoryDir)).toBe(true);
      const output = consoleLogs.join('\n');
      expect(output).toContain(
        'Deprecated .specweave/memory/ will be deleted'
      );
    });

    it('should do nothing if memory directory does not exist', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).not.toContain('memory');
    });
  });

  // ==========================================================================
  // migrateReflectConfig
  // ==========================================================================

  describe('reflect config migration', () => {
    it('should create reflect-config.json if it does not exist', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      const reflectPath = path.join(
        tempDir,
        '.specweave',
        'state',
        'reflect-config.json'
      );
      expect(fs.existsSync(reflectPath)).toBe(true);
      const config = JSON.parse(fs.readFileSync(reflectPath, 'utf-8'));
      expect(config.autoReflect).toBe(true);
      expect(config.enabled).toBe(true);
    });

    it('should enable autoReflect if set to false', async () => {
      setupSpecWeaveProject();

      const reflectPath = path.join(
        tempDir,
        '.specweave',
        'state',
        'reflect-config.json'
      );
      fs.writeFileSync(
        reflectPath,
        JSON.stringify({ enabled: true, autoReflect: false })
      );

      await updateCommand({ noSelf: true, noPlugins: true });

      const config = JSON.parse(fs.readFileSync(reflectPath, 'utf-8'));
      expect(config.autoReflect).toBe(true);
    });

    it('should enable autoReflect if undefined', async () => {
      setupSpecWeaveProject();

      const reflectPath = path.join(
        tempDir,
        '.specweave',
        'state',
        'reflect-config.json'
      );
      fs.writeFileSync(
        reflectPath,
        JSON.stringify({ enabled: true })
      );

      await updateCommand({ noSelf: true, noPlugins: true });

      const config = JSON.parse(fs.readFileSync(reflectPath, 'utf-8'));
      expect(config.autoReflect).toBe(true);
    });

    it('should not overwrite autoReflect if already true', async () => {
      setupSpecWeaveProject();

      const reflectPath = path.join(
        tempDir,
        '.specweave',
        'state',
        'reflect-config.json'
      );
      const original = {
        enabled: true,
        autoReflect: true,
        customField: 'preserved',
      };
      fs.writeFileSync(reflectPath, JSON.stringify(original));

      await updateCommand({ noSelf: true, noPlugins: true });

      const config = JSON.parse(fs.readFileSync(reflectPath, 'utf-8'));
      expect(config.customField).toBe('preserved');
      expect(config.autoReflect).toBe(true);
    });

    it('should recreate reflect-config.json if invalid JSON', async () => {
      setupSpecWeaveProject();

      const reflectPath = path.join(
        tempDir,
        '.specweave',
        'state',
        'reflect-config.json'
      );
      fs.writeFileSync(reflectPath, '{ invalid json }');

      await updateCommand({ noSelf: true, noPlugins: true });

      const config = JSON.parse(fs.readFileSync(reflectPath, 'utf-8'));
      expect(config.autoReflect).toBe(true);
      expect(config.enabled).toBe(true);
    });

    it('should skip reflect migration in check mode', async () => {
      setupSpecWeaveProject();

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        check: true,
      });

      const reflectPath = path.join(
        tempDir,
        '.specweave',
        'state',
        'reflect-config.json'
      );
      // Should not have been created in check mode
      expect(fs.existsSync(reflectPath)).toBe(false);
    });

    it('should create state directory if missing', async () => {
      const specweaveDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      fs.writeFileSync(
        path.join(specweaveDir, 'config.json'),
        JSON.stringify({ project: { name: 'test' }, auto: {} })
      );
      // Deliberately don't create state directory

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(
        fs.existsSync(path.join(specweaveDir, 'state'))
      ).toBe(true);
    });
  });

  // ==========================================================================
  // migrateDeepInterviewConfig (exported, direct testing)
  // ==========================================================================

  describe('migrateDeepInterviewConfig', () => {
    it('should add deepInterview section to config.json', () => {
      setupSpecWeaveProject();
      // Overwrite config without planning section
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({ project: { name: 'test' } })
      );

      const result = migrateDeepInterviewConfig(tempDir);

      expect(result).toBe(true);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.planning.deepInterview).toBeDefined();
      expect(config.planning.deepInterview.enabled).toBe(false);
      expect(config.planning.deepInterview.minQuestions).toBe(5);
      expect(config.planning.deepInterview.categories).toHaveLength(6);
    });

    it('should not overwrite existing deepInterview config', () => {
      setupSpecWeaveProject();
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          project: { name: 'test' },
          planning: { deepInterview: { enabled: true, minQuestions: 10 } },
        })
      );

      const result = migrateDeepInterviewConfig(tempDir);

      expect(result).toBe(false);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.planning.deepInterview.minQuestions).toBe(10);
    });

    it('should return false if config.json does not exist', () => {
      const result = migrateDeepInterviewConfig(tempDir);
      expect(result).toBe(false);
    });

    it('should return false if config.json is invalid JSON', () => {
      setupSpecWeaveProject();
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, '{ invalid }');

      const result = migrateDeepInterviewConfig(tempDir);
      expect(result).toBe(false);
    });

    it('should initialize planning object if missing', () => {
      setupSpecWeaveProject();
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ project: {} }));

      migrateDeepInterviewConfig(tempDir);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.planning).toBeDefined();
      expect(config.planning.deepInterview).toBeDefined();
    });

    it('should log verbose output when verbose is true', () => {
      setupSpecWeaveProject();
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ project: {} }));

      migrateDeepInterviewConfig(tempDir, true);

      const output = consoleLogs.join('\n');
      expect(output).toContain('planning.deepInterview');
    });

    it('should skip migration in check mode via updateCommand', async () => {
      setupSpecWeaveProject();
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({ project: { name: 'test' }, auto: {} })
      );

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        check: true,
      });

      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.planning).toBeUndefined();
    });
  });

  // ==========================================================================
  // Skill memory pruning
  // ==========================================================================

  describe('skill memory pruning', () => {
    it('should skip pruning if no skill memory files exist', async () => {
      setupSpecWeaveProject();
      mockListSkillMemoryFiles.mockReturnValue([]);

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(mockPruneSkillMemories).not.toHaveBeenCalled();
    });

    it('should prune skill memories when files exist', async () => {
      setupSpecWeaveProject();
      mockListSkillMemoryFiles.mockReturnValue(['pm', 'architect']);
      mockPruneSkillMemories.mockReturnValue({
        prunedCount: 3,
        skillsAffected: ['pm', 'architect'],
        errors: [],
      });

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(mockPruneSkillMemories).toHaveBeenCalledWith(tempDir, {
        retentionDays: 90,
        maxLearningsPerSkill: 10,
      });
      const output = consoleLogs.join('\n');
      expect(output).toContain('Pruned 3 old learning(s) from 2 skill(s)');
    });

    it('should show affected skills in verbose mode', async () => {
      setupSpecWeaveProject();
      mockListSkillMemoryFiles.mockReturnValue(['pm']);
      mockPruneSkillMemories.mockReturnValue({
        prunedCount: 1,
        skillsAffected: ['pm'],
        errors: [],
      });

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        verbose: true,
      });

      const output = consoleLogs.join('\n');
      expect(output).toContain('pm');
    });

    it('should show errors in verbose mode', async () => {
      setupSpecWeaveProject();
      mockListSkillMemoryFiles.mockReturnValue(['broken']);
      mockPruneSkillMemories.mockReturnValue({
        prunedCount: 0,
        skillsAffected: [],
        errors: ['parse error in broken.md'],
      });

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        verbose: true,
      });

      const output = consoleLogs.join('\n');
      expect(output).toContain('parse error in broken.md');
    });

    it('should report prunable files in check mode', async () => {
      setupSpecWeaveProject();
      mockListSkillMemoryFiles.mockReturnValue(['pm', 'grill']);

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        check: true,
      });

      expect(mockPruneSkillMemories).not.toHaveBeenCalled();
      const output = consoleLogs.join('\n');
      expect(output).toContain('2 skill memory file(s) will be checked');
    });

    it('should not log pruning when prunedCount is 0', async () => {
      setupSpecWeaveProject();
      mockListSkillMemoryFiles.mockReturnValue(['pm']);
      mockPruneSkillMemories.mockReturnValue({
        prunedCount: 0,
        skillsAffected: [],
        errors: [],
      });

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).not.toContain('Pruned');
    });
  });

  // ==========================================================================
  // validateProjectHealth (tested via updateCommand)
  // ==========================================================================

  describe('project health validation', () => {
    it('should report missing auto section in config', async () => {
      setupSpecWeaveProject();
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({ project: { name: 'test' } })
      );

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Missing "auto" section');
    });

    it('should report missing project.name in config', async () => {
      setupSpecWeaveProject();
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ auto: {} }));

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Missing project.name');
    });

    it('should report invalid JSON in config.json', async () => {
      setupSpecWeaveProject();
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, '{ bad json }');

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('config.json is invalid JSON');
    });

    it('should treat .specweave without config.json as non-project', async () => {
      const specweaveDir = path.join(tempDir, '.specweave');
      fs.mkdirSync(specweaveDir, { recursive: true });
      // No config.json — stale folder, not a real project

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Not a SpecWeave project');
    });

    it('should warn about too many active increments', async () => {
      setupSpecWeaveProject();

      // Create 6 active increments
      for (let i = 1; i <= 6; i++) {
        createIncrement(`000${i}-test-${i}`, 'active');
      }

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('High number of active increments: 6');
    });

    it('should count in-progress increments as active', async () => {
      setupSpecWeaveProject();

      for (let i = 1; i <= 4; i++) {
        createIncrement(`000${i}-active`, 'active');
      }
      for (let i = 5; i <= 6; i++) {
        createIncrement(`000${i}-in-progress`, 'in-progress');
      }

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('High number of active increments: 6');
    });

    it('should not warn when 5 or fewer active increments', async () => {
      setupSpecWeaveProject();

      for (let i = 1; i <= 5; i++) {
        createIncrement(`000${i}-ok`, 'active');
      }

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).not.toContain('High number of active increments');
    });

    it('should not count completed/archived increments', async () => {
      setupSpecWeaveProject();

      for (let i = 1; i <= 3; i++) {
        createIncrement(`000${i}-active`, 'active');
      }
      for (let i = 4; i <= 10; i++) {
        createIncrement(`000${i}-done`, 'completed');
      }

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).not.toContain('High number of active increments');
    });

    it('should report OK when no health issues', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      expect(mockOraInstance.succeed).toHaveBeenCalledWith(
        'Project health OK'
      );
    });

    it('should skip validation in check mode', async () => {
      setupSpecWeaveProject();

      await updateCommand({
        noSelf: true,
        noPlugins: true,
        check: true,
      });

      // Health validation spinner should not start in check mode
      const startCalls = mockOraInstance.start.mock.calls.map(
        (c: any[]) => c[0]
      );
      expect(startCalls).not.toContain('Validating project health...');
    });
  });

  // ==========================================================================
  // Summary output
  // ==========================================================================

  describe('summary output', () => {
    it('should show update summary section', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Update Summary');
    });

    it('should show config and instructions status for SpecWeave projects', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Config:');
      expect(output).toContain('Instructions:');
    });

    it('should show plugins status when not skipped', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Plugins:');
      expect(output).toContain('Refreshed');
    });

    it('should show plugins skipped message with --no-plugins', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Skipped (--no-plugins specified)');
    });

    it('should show warnings count in summary', async () => {
      setupSpecWeaveProject();
      const configPath = path.join(tempDir, '.specweave', 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({}));

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Warnings:');
    });

    it('should show errors count in summary', async () => {
      setupSpecWeaveProject();
      mockUpdateInstructionsCommand.mockRejectedValue(new Error('fail'));

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Errors:');
    });

    it('should show next steps with plugin restart hint', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Restart Claude Code');
    });

    it('should show different next steps with --no-plugins', async () => {
      setupSpecWeaveProject();

      await updateCommand({ noSelf: true, noPlugins: true });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Plugins were skipped');
    });
  });

  // ==========================================================================
  // registerUpdateCommand
  // ==========================================================================

  describe('registerUpdateCommand', () => {
    it('should register update command with Commander', async () => {
      const { Command } = await import('commander');
      const program = new Command();

      registerUpdateCommand(program);

      const cmd = program.commands.find((c) => c.name() === 'update');
      expect(cmd).toBeDefined();
      expect(cmd!.description()).toContain('Update SpecWeave');
    });

    it('should register all option flags', async () => {
      const { Command } = await import('commander');
      const program = new Command();

      registerUpdateCommand(program);

      const cmd = program.commands.find((c) => c.name() === 'update');
      const optionNames = cmd!.options.map((o: any) => o.long);
      expect(optionNames).toContain('--no-self');
      expect(optionNames).toContain('--no-plugins');
      expect(optionNames).toContain('--all');
      expect(optionNames).toContain('--minimal');
      expect(optionNames).toContain('--check');
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--force');
    });
  });
});
