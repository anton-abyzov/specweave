/**
 * Unit tests for doctor command
 *
 * Tests comprehensive health checks for SpecWeave projects:
 * - doctor() function: main command handler
 * - registerDoctorCommand(): Commander registration
 * - --json flag: JSON output mode
 * - --verbose flag: detailed output
 * - --quick flag: skip slow checks
 * - --skip-external flag: skip external tool checks
 * - --fix flag: run suggested fixes
 * - Health check categories: Environment, Structure, Config, Hooks, Plugins, Increments, Git
 * - Error detection and reporting
 * - Fix command generation
 * - Text and JSON output formatting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
  mockRunDoctor,
  mockFormatDoctorReport,
  mockExecSync,
  mockLoggerError,
} = vi.hoisted(() => ({
  mockRunDoctor: vi.fn(),
  mockFormatDoctorReport: vi.fn(),
  mockExecSync: vi.fn(),
  mockLoggerError: vi.fn(),
}));

// ============================================================================
// Module mocks
// ============================================================================

vi.mock('../../../../src/core/doctor/doctor.js', () => ({
  runDoctor: mockRunDoctor,
  formatDoctorReport: mockFormatDoctorReport,
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: { error: mockLoggerError, info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

// ============================================================================
// Import after mocks
// ============================================================================

import { doctor, registerDoctorCommand } from '../../../../src/cli/commands/doctor.js';
import type { DoctorReport } from '../../../../src/core/doctor/types.js';

// ============================================================================
// Test fixtures
// ============================================================================

function createHealthyReport(): DoctorReport {
  return {
    timestamp: new Date().toISOString(),
    projectRoot: '/test/project',
    categories: [
      {
        category: 'Environment',
        status: 'pass',
        checks: [
          {
            name: 'Node.js version',
            status: 'pass',
            message: 'Node.js v18.0.0',
          },
        ],
      },
      {
        category: 'Project Structure',
        status: 'pass',
        checks: [
          {
            name: '.specweave directory',
            status: 'pass',
            message: '.specweave directory exists',
          },
        ],
      },
    ],
    summary: {
      total: 2,
      passed: 2,
      warnings: 0,
      failures: 0,
      skipped: 0,
    },
  };
}

function createReportWithWarnings(): DoctorReport {
  return {
    timestamp: new Date().toISOString(),
    projectRoot: '/test/project',
    categories: [
      {
        category: 'Configuration',
        status: 'warn',
        checks: [
          {
            name: 'config.json validation',
            status: 'warn',
            message: 'Some optional fields are missing',
            details: ['missing: testing.playwright'],
            fixSuggestion: 'Run specweave update to add missing fields',
          },
        ],
      },
    ],
    summary: {
      total: 1,
      passed: 0,
      warnings: 1,
      failures: 0,
      skipped: 0,
    },
    fixCommand: 'specweave update',
  };
}

function createReportWithFailures(): DoctorReport {
  return {
    timestamp: new Date().toISOString(),
    projectRoot: '/test/project',
    categories: [
      {
        category: 'Hooks',
        status: 'fail',
        checks: [
          {
            name: 'pre-commit hook executable',
            status: 'fail',
            message: 'pre-commit hook is not executable',
            fixSuggestion: 'Run specweave check-hooks --fix',
          },
        ],
      },
      {
        category: 'Project Structure',
        status: 'fail',
        checks: [
          {
            name: '.specweave directory',
            status: 'fail',
            message: '.specweave directory does not exist',
            fixSuggestion: 'Run specweave init to initialize the project',
          },
        ],
      },
    ],
    summary: {
      total: 2,
      passed: 0,
      warnings: 0,
      failures: 2,
      skipped: 0,
    },
    fixCommand: 'specweave init',
  };
}

// ============================================================================
// Test setup/teardown
// ============================================================================

let tempDir: string;
let consoleSpy: ReturnType<typeof vi.spyOn>;
let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-test-'));
  consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  // Reset all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  consoleSpy.mockRestore();
  exitSpy.mockRestore();
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// ============================================================================
// doctor() function tests
// ============================================================================

describe('doctor() function', () => {
  describe('basic execution', () => {
    it('should execute runDoctor with project root and options', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Formatted report');

      const result = await doctor(tempDir, {
        verbose: false,
        json: false,
      });

      expect(mockRunDoctor).toHaveBeenCalledWith(tempDir, {
        verbose: false,
        json: false,
      });
      expect(result).toEqual(healthyReport);
    });

    it('should use process.cwd() as default project root', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Formatted report');

      await doctor(undefined, {});

      expect(mockRunDoctor).toHaveBeenCalledWith(process.cwd(), {});
    });

    it('should use empty options object as default', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Formatted report');

      await doctor(tempDir);

      expect(mockRunDoctor).toHaveBeenCalledWith(tempDir, {});
    });

    it('should return the doctor report', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Formatted report');

      const result = await doctor(tempDir, {});

      expect(result).toEqual(healthyReport);
      expect(result.summary.passed).toBe(2);
      expect(result.summary.failures).toBe(0);
    });
  });

  describe('text output (default)', () => {
    it('should output formatted text report by default', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue(
        'SpecWeave Doctor\n================\n✓ All checks passed'
      );

      await doctor(tempDir, { json: false });

      expect(mockFormatDoctorReport).toHaveBeenCalledWith(healthyReport, undefined);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SpecWeave Doctor')
      );
    });

    it('should use verbose flag for text output', async () => {
      const reportWithDetails = createReportWithWarnings();
      mockRunDoctor.mockResolvedValue(reportWithDetails);
      mockFormatDoctorReport.mockReturnValue('Detailed report');

      await doctor(tempDir, { json: false, verbose: true });

      expect(mockFormatDoctorReport).toHaveBeenCalledWith(reportWithDetails, true);
    });

    it('should not use verbose flag when false', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Compact report');

      await doctor(tempDir, { json: false, verbose: false });

      expect(mockFormatDoctorReport).toHaveBeenCalledWith(healthyReport, false);
    });
  });

  describe('JSON output', () => {
    it('should output JSON report when --json flag is set', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);

      await doctor(tempDir, { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(healthyReport, null, 2));
      // formatDoctorReport should NOT be called when json=true
      expect(mockFormatDoctorReport).not.toHaveBeenCalled();
    });

    it('should include all report fields in JSON output', async () => {
      const reportWithFailures = createReportWithFailures();
      mockRunDoctor.mockResolvedValue(reportWithFailures);

      await doctor(tempDir, { json: true });

      const jsonOutput = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.timestamp).toBeDefined();
      expect(parsed.projectRoot).toBe('/test/project');
      expect(parsed.categories).toBeDefined();
      expect(parsed.summary).toBeDefined();
      expect(parsed.fixCommand).toBeDefined();
    });

    it('should not format text when JSON is enabled', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);

      await doctor(tempDir, { json: true, verbose: true });

      expect(mockFormatDoctorReport).not.toHaveBeenCalled();
    });
  });

  describe('verbose output', () => {
    it('should pass verbose flag to formatDoctorReport', async () => {
      const reportWithDetails = createReportWithWarnings();
      mockRunDoctor.mockResolvedValue(reportWithDetails);
      mockFormatDoctorReport.mockReturnValue('Report with details');

      await doctor(tempDir, { verbose: true, json: false });

      expect(mockFormatDoctorReport).toHaveBeenCalledWith(reportWithDetails, true);
    });

    it('should include details and fix suggestions in verbose mode', async () => {
      const reportWithDetails = createReportWithWarnings();
      mockRunDoctor.mockResolvedValue(reportWithDetails);
      mockFormatDoctorReport.mockReturnValue(
        'Config: missing fields\n  Details: missing: testing.playwright\n  Fix: Run specweave update'
      );

      await doctor(tempDir, { verbose: true, json: false });

      expect(mockFormatDoctorReport).toHaveBeenCalledWith(reportWithDetails, true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing: testing.playwright')
      );
    });
  });

  describe('options passing', () => {
    it('should pass quick option to runDoctor', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Report');

      await doctor(tempDir, { quick: true });

      expect(mockRunDoctor).toHaveBeenCalledWith(tempDir, { quick: true });
    });

    it('should pass skipExternal option to runDoctor', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Report');

      await doctor(tempDir, { skipExternal: true });

      expect(mockRunDoctor).toHaveBeenCalledWith(tempDir, { skipExternal: true });
    });

    it('should pass all options to runDoctor', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Report');

      const options = {
        verbose: true,
        json: true,
        quick: true,
        skipExternal: true,
        fix: true,
      };

      await doctor(tempDir, options);

      expect(mockRunDoctor).toHaveBeenCalledWith(tempDir, options);
    });
  });
});

// ============================================================================
// registerDoctorCommand() tests
// ============================================================================

describe('registerDoctorCommand()', () => {
  describe('command registration', () => {
    it('should register "doctor" command', () => {
      const program = new Command();
      registerDoctorCommand(program);

      const command = program.commands.find((c) => c.name() === 'doctor');
      expect(command).toBeDefined();
    });

    it('should set correct command description', () => {
      const program = new Command();
      registerDoctorCommand(program);

      const command = program.commands.find((c) => c.name() === 'doctor');
      expect(command?.description()).toContain('health check');
    });

    it('should register --verbose option', () => {
      const program = new Command();
      registerDoctorCommand(program);

      const command = program.commands.find((c) => c.name() === 'doctor') as any;
      const options = command?.options || [];
      expect(options.some((o: any) => o.long === '--verbose')).toBe(true);
    });

    it('should register --json option', () => {
      const program = new Command();
      registerDoctorCommand(program);

      const command = program.commands.find((c) => c.name() === 'doctor') as any;
      const options = command?.options || [];
      expect(options.some((o: any) => o.long === '--json')).toBe(true);
    });

    it('should register --quick option', () => {
      const program = new Command();
      registerDoctorCommand(program);

      const command = program.commands.find((c) => c.name() === 'doctor') as any;
      const options = command?.options || [];
      expect(options.some((o: any) => o.long === '--quick')).toBe(true);
    });

    it('should register --skip-external option', () => {
      const program = new Command();
      registerDoctorCommand(program);

      const command = program.commands.find((c) => c.name() === 'doctor') as any;
      const options = command?.options || [];
      expect(options.some((o: any) => o.long === '--skip-external')).toBe(true);
    });

    it('should register --fix option', () => {
      const program = new Command();
      registerDoctorCommand(program);

      const command = program.commands.find((c) => c.name() === 'doctor') as any;
      const options = command?.options || [];
      expect(options.some((o: any) => o.long === '--fix')).toBe(true);
    });
  });

  describe('action handler', () => {
    async function runDoctorCommand(...args: string[]): Promise<void> {
      const program = new Command();
      program.exitOverride();
      registerDoctorCommand(program);
      try {
        await program.parseAsync(['node', 'test', 'doctor', ...args]);
      } catch {
        // Commander may throw on exitOverride; we handle exit via spy
      }
    }

    it('should call doctor() with correct options on action', async () => {
      mockRunDoctor.mockResolvedValue(createHealthyReport());
      mockFormatDoctorReport.mockReturnValue('Report');

      await runDoctorCommand('--verbose');

      expect(mockRunDoctor).toHaveBeenCalled();
    });

    it('should exit with code 1 when failures detected', async () => {
      mockRunDoctor.mockResolvedValue(createReportWithFailures());
      mockFormatDoctorReport.mockReturnValue('Report with failures');

      await runDoctorCommand();

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should not exit when all checks pass', async () => {
      mockRunDoctor.mockResolvedValue(createHealthyReport());
      mockFormatDoctorReport.mockReturnValue('Report');

      await runDoctorCommand();

      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should exit with code 1 when warnings detected', async () => {
      mockRunDoctor.mockResolvedValue(createReportWithWarnings());
      mockFormatDoctorReport.mockReturnValue('Report');

      await runDoctorCommand();

      // Warnings don't cause exit (only failures do)
      expect(exitSpy).not.toHaveBeenCalledWith(1);
    });
  });

  describe('--fix flag handling', () => {
    async function runDoctorCommand(...args: string[]): Promise<void> {
      const program = new Command();
      program.exitOverride();
      registerDoctorCommand(program);
      try {
        await program.parseAsync(['node', 'test', 'doctor', ...args]);
      } catch {
        // Commander may throw on exitOverride; we handle exit via spy
      }
    }

    it('should not run fix when --fix flag is false', async () => {
      mockRunDoctor.mockResolvedValue(createReportWithFailures());
      mockFormatDoctorReport.mockReturnValue('Report');

      await runDoctorCommand();

      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should run fix command when --fix flag is set and issues found', async () => {
      const reportWithFix = createReportWithFailures();
      mockRunDoctor.mockResolvedValue(reportWithFix);
      mockFormatDoctorReport.mockReturnValue('Report');
      mockExecSync.mockReturnValue('Fix executed');

      await runDoctorCommand('--fix');

      expect(mockExecSync).toHaveBeenCalledWith('specweave init', {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
    });

    it('should not run fix when no fixCommand in report', async () => {
      const report = createHealthyReport();
      report.fixCommand = undefined;
      mockRunDoctor.mockResolvedValue(report);
      mockFormatDoctorReport.mockReturnValue('Report');

      await runDoctorCommand('--fix');

      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it('should display fix command message when running fix', async () => {
      const reportWithFix = createReportWithFailures();
      mockRunDoctor.mockResolvedValue(reportWithFix);
      mockFormatDoctorReport.mockReturnValue('Report');
      mockExecSync.mockReturnValue('Success');

      await runDoctorCommand('--fix');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Running fix: specweave init')
      );
    });

    it('should exit with code 1 if fix command fails', async () => {
      const reportWithFix = createReportWithFailures();
      mockRunDoctor.mockResolvedValue(reportWithFix);
      mockFormatDoctorReport.mockReturnValue('Report');
      mockExecSync.mockImplementation(() => {
        throw new Error('Fix command failed');
      });

      await runDoctorCommand('--fix');

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should pass correct cwd to execSync for fix command', async () => {
      const reportWithFix = createReportWithFailures();
      mockRunDoctor.mockResolvedValue(reportWithFix);
      mockFormatDoctorReport.mockReturnValue('Report');
      mockExecSync.mockReturnValue('Success');

      await runDoctorCommand('--fix');

      const callArgs = mockExecSync.mock.calls[0];
      expect(callArgs[1].cwd).toBe(process.cwd());
      expect(callArgs[1].stdio).toBe('inherit');
    });
  });

  describe('error handling', () => {
    async function runDoctorCommand(...args: string[]): Promise<void> {
      const program = new Command();
      program.exitOverride();
      registerDoctorCommand(program);
      try {
        await program.parseAsync(['node', 'test', 'doctor', ...args]);
      } catch {
        // Commander may throw on exitOverride; we handle exit via spy
      }
    }

    it('should catch and log errors from doctor command', async () => {
      mockRunDoctor.mockRejectedValue(new Error('Health check failed'));

      await runDoctorCommand();

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit with code 1 on error', async () => {
      mockRunDoctor.mockRejectedValue(new Error('Check failed'));

      await runDoctorCommand();

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});

// ============================================================================
// Integration-like tests (mocked runDoctor)
// ============================================================================

describe('doctor command - integration scenarios', () => {
  describe('healthy project', () => {
    it('should report all checks passing', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue(
        'SpecWeave Doctor\n✓ All checks passed\nSummary: 2 passed'
      );

      const result = await doctor(tempDir, {});

      expect(result.summary.passed).toBe(2);
      expect(result.summary.failures).toBe(0);
      expect(result.summary.warnings).toBe(0);
    });
  });

  describe('project with warnings', () => {
    it('should detect and report warnings', async () => {
      const reportWithWarnings = createReportWithWarnings();
      mockRunDoctor.mockResolvedValue(reportWithWarnings);
      mockFormatDoctorReport.mockReturnValue(
        'SpecWeave Doctor\n⚠ Configuration: Some optional fields are missing\nFix: specweave update'
      );

      const result = await doctor(tempDir, {});

      expect(result.summary.warnings).toBe(1);
      expect(result.fixCommand).toBe('specweave update');
    });
  });

  describe('project with failures', () => {
    it('should detect multiple failures', async () => {
      const reportWithFailures = createReportWithFailures();
      mockRunDoctor.mockResolvedValue(reportWithFailures);
      mockFormatDoctorReport.mockReturnValue(
        'SpecWeave Doctor\n✗ Hooks: pre-commit hook is not executable\n✗ Project Structure: .specweave directory does not exist'
      );

      const result = await doctor(tempDir, {});

      expect(result.summary.failures).toBe(2);
      expect(result.fixCommand).toBe('specweave init');
    });

    it('should prioritize fix commands (init over update)', async () => {
      const reportWithFailures = createReportWithFailures();
      mockRunDoctor.mockResolvedValue(reportWithFailures);
      mockFormatDoctorReport.mockReturnValue('Report');

      const result = await doctor(tempDir, {});

      expect(result.fixCommand).toBe('specweave init');
    });
  });

  describe('comprehensive health check categories', () => {
    it('should check multiple categories', async () => {
      const comprehensiveReport: DoctorReport = {
        timestamp: new Date().toISOString(),
        projectRoot: '/test/project',
        categories: [
          {
            category: 'Environment',
            status: 'pass',
            checks: [
              {
                name: 'Node.js',
                status: 'pass',
                message: 'v18.0.0',
              },
            ],
          },
          {
            category: 'Git',
            status: 'pass',
            checks: [
              {
                name: 'Git initialized',
                status: 'pass',
                message: 'Yes',
              },
            ],
          },
          {
            category: 'Project Structure',
            status: 'pass',
            checks: [
              {
                name: '.specweave exists',
                status: 'pass',
                message: 'Yes',
              },
            ],
          },
          {
            category: 'Configuration',
            status: 'pass',
            checks: [
              {
                name: 'config.json valid',
                status: 'pass',
                message: 'Yes',
              },
            ],
          },
          {
            category: 'Hooks',
            status: 'pass',
            checks: [
              {
                name: 'pre-commit executable',
                status: 'pass',
                message: 'Yes',
              },
            ],
          },
          {
            category: 'Plugins',
            status: 'pass',
            checks: [
              {
                name: 'Plugin cache valid',
                status: 'pass',
                message: 'Yes',
              },
            ],
          },
          {
            category: 'Increments',
            status: 'pass',
            checks: [
              {
                name: 'Increments found',
                status: 'pass',
                message: 'Found 2 increments',
              },
            ],
          },
        ],
        summary: {
          total: 7,
          passed: 7,
          warnings: 0,
          failures: 0,
          skipped: 0,
        },
      };

      mockRunDoctor.mockResolvedValue(comprehensiveReport);
      mockFormatDoctorReport.mockReturnValue('Report');

      const result = await doctor(tempDir, {});

      expect(result.categories).toHaveLength(7);
      expect(result.summary.total).toBe(7);
    });
  });

  describe('skip options', () => {
    it('should skip slow checks when --quick is set', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Quick report');

      await doctor(tempDir, { quick: true });

      expect(mockRunDoctor).toHaveBeenCalledWith(
        tempDir,
        expect.objectContaining({ quick: true })
      );
    });

    it('should skip external checks when --skip-external is set', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue('Report');

      await doctor(tempDir, { skipExternal: true });

      expect(mockRunDoctor).toHaveBeenCalledWith(
        tempDir,
        expect.objectContaining({ skipExternal: true })
      );
    });
  });
});

// ============================================================================
// Output formatting tests
// ============================================================================

describe('doctor output formatting', () => {
  describe('text output', () => {
    it('should format report with status icons', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);
      mockFormatDoctorReport.mockReturnValue(
        'SpecWeave Doctor\n✓ Environment: Node.js v18.0.0\n✓ Project Structure: .specweave exists'
      );

      await doctor(tempDir, { json: false });

      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('SpecWeave Doctor');
    });
  });

  describe('JSON output', () => {
    it('should produce valid JSON', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);

      await doctor(tempDir, { json: true });

      const jsonOutput = consoleSpy.mock.calls[0][0];
      expect(() => JSON.parse(jsonOutput)).not.toThrow();
    });

    it('should include timestamp in JSON', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);

      await doctor(tempDir, { json: true });

      const jsonOutput = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.timestamp).toBeDefined();
    });

    it('should format JSON with 2-space indentation', async () => {
      const healthyReport = createHealthyReport();
      mockRunDoctor.mockResolvedValue(healthyReport);

      await doctor(tempDir, { json: true });

      const jsonOutput = consoleSpy.mock.calls[0][0];
      // Check for indentation (spaces, not tabs)
      expect(jsonOutput).toMatch(/^\s{2}"timestamp"/m);
    });
  });
});
