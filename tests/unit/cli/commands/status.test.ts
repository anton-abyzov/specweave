/**
 * Comprehensive Unit Tests for Status CLI Command
 *
 * Tests the statusCommand function from src/cli/commands/status.ts
 *
 * Coverage:
 * - Command option parsing (verbose, type filter)
 * - Type validation (ensures only valid increment types accepted)
 * - Error handling (invalid types, process exit)
 * - Integration with showStatus from status-commands.ts
 * - File system interactions and dependency mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock chalk to simplify assertions
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

import { statusCommand } from '../../../../src/cli/commands/status.js';

describe('Status Command', () => {
  let tempDir: string;
  let specweaveDir: string;
  let incrementsDir: string;
  let configPath: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create temporary directory structure
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'status-test-'));
    specweaveDir = path.join(tempDir, '.specweave');
    incrementsDir = path.join(specweaveDir, 'increments');

    // Create basic SpecWeave structure
    fs.mkdirSync(incrementsDir, { recursive: true });

    // Create config.json (required by metadata manager)
    configPath = path.join(specweaveDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        project: { name: 'test-project' },
        testing: { defaultTestMode: 'test-after' }
      })
    );

    // Spy on console output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock process.exit to prevent test from exiting
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Change to temp directory so MetadataManager can find config
    process.chdir(tempDir);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ============================================================================
  // CORE FUNCTIONALITY TESTS
  // ============================================================================

  describe('Basic Status Display', () => {
    it('should display status when no increments exist', async () => {
      await statusCommand({});

      // Should show the header
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📊 Increment Status'));

      // Should show overall progress
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📈 Overall Progress'));
    });

    it('should display all increments when multiple exist', async () => {
      // Create multiple increments with different statuses
      const activeDir = path.join(incrementsDir, '0001-active-feature');
      const pausedDir = path.join(incrementsDir, '0002-paused-feature');
      const completedDir = path.join(incrementsDir, '0003-completed-feature');

      fs.mkdirSync(activeDir, { recursive: true });
      fs.mkdirSync(pausedDir, { recursive: true });
      fs.mkdirSync(completedDir, { recursive: true });

      fs.writeFileSync(
        path.join(activeDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-active-feature',
          status: 'active',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      fs.writeFileSync(
        path.join(pausedDir, 'metadata.json'),
        JSON.stringify({
          id: '0002-paused-feature',
          status: 'paused',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          pausedReason: 'Waiting for design'
        })
      );

      fs.writeFileSync(
        path.join(completedDir, 'metadata.json'),
        JSON.stringify({
          id: '0003-completed-feature',
          status: 'completed',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({});

      // Should show active section
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('▶️  Active'));

      // Should show paused section
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⏸️  Paused'));

      // Should show summary with counts
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Summary'));
    });

    it('should calculate and display correct progress percentage', async () => {
      // Create 5 increments, 3 completed
      for (let i = 1; i <= 5; i++) {
        const dir = path.join(incrementsDir, `000${i}-feature-${i}`);
        fs.mkdirSync(dir, { recursive: true });

        const status = i <= 3 ? 'completed' : 'active';
        fs.writeFileSync(
          path.join(dir, 'metadata.json'),
          JSON.stringify({
            id: `000${i}-feature-${i}`,
            status,
            type: 'feature',
            created: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          })
        );
      }

      await statusCommand({});

      // 3/5 = 60%
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('60%'));
    });
  });

  describe('Verbose Mode', () => {
    it('should display additional details when verbose=true', async () => {
      // Create an active increment
      const incDir = path.join(incrementsDir, '0001-test-feature');
      fs.mkdirSync(incDir, { recursive: true });

      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 5); // 5 days ago

      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-test-feature',
          status: 'active',
          type: 'feature',
          created: createdDate.toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({ verbose: true });

      // In verbose mode, should show progress and age information
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Progress'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Age'));
    });

    it('should display paused reason in verbose mode', async () => {
      const pausedDir = path.join(incrementsDir, '0001-paused-feature');
      fs.mkdirSync(pausedDir, { recursive: true });

      fs.writeFileSync(
        path.join(pausedDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-paused-feature',
          status: 'paused',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          pausedReason: 'Blocked by API redesign'
        })
      );

      await statusCommand({ verbose: true });

      // Should show pause reason
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Reason'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked by API redesign'));
    });
  });

  describe('Type Filtering', () => {
    it('should filter increments by feature type', async () => {
      // Create increments of different types
      const featureDir = path.join(incrementsDir, '0001-feature');
      const hotfixDir = path.join(incrementsDir, '0002-hotfix');

      fs.mkdirSync(featureDir, { recursive: true });
      fs.mkdirSync(hotfixDir, { recursive: true });

      fs.writeFileSync(
        path.join(featureDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-feature',
          status: 'active',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      fs.writeFileSync(
        path.join(hotfixDir, 'metadata.json'),
        JSON.stringify({
          id: '0002-hotfix',
          status: 'active',
          type: 'hotfix',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({ type: 'feature' });

      // Should only show feature increment (should not explicitly show hotfix)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-feature'));
    });

    it('should filter increments by hotfix type', async () => {
      const hotfixDir = path.join(incrementsDir, '0001-critical-fix');
      fs.mkdirSync(hotfixDir, { recursive: true });

      fs.writeFileSync(
        path.join(hotfixDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-critical-fix',
          status: 'active',
          type: 'hotfix',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({ type: 'hotfix' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-critical-fix'));
    });

    it('should filter increments by bug type', async () => {
      const bugDir = path.join(incrementsDir, '0001-bug-fix');
      fs.mkdirSync(bugDir, { recursive: true });

      fs.writeFileSync(
        path.join(bugDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-bug-fix',
          status: 'active',
          type: 'bug',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({ type: 'bug' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-bug-fix'));
    });

    it('should filter increments by change-request type', async () => {
      const crDir = path.join(incrementsDir, '0001-stakeholder-request');
      fs.mkdirSync(crDir, { recursive: true });

      fs.writeFileSync(
        path.join(crDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-stakeholder-request',
          status: 'active',
          type: 'change-request',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({ type: 'change-request' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-stakeholder-request'));
    });

    it('should filter increments by refactor type', async () => {
      const refactorDir = path.join(incrementsDir, '0001-code-cleanup');
      fs.mkdirSync(refactorDir, { recursive: true });

      fs.writeFileSync(
        path.join(refactorDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-code-cleanup',
          status: 'active',
          type: 'refactor',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({ type: 'refactor' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-code-cleanup'));
    });

    it('should filter increments by experiment type', async () => {
      const expDir = path.join(incrementsDir, '0001-spike');
      fs.mkdirSync(expDir, { recursive: true });

      fs.writeFileSync(
        path.join(expDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-spike',
          status: 'active',
          type: 'experiment',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({ type: 'experiment' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-spike'));
    });
  });

  // ============================================================================
  // TYPE VALIDATION TESTS
  // ============================================================================

  describe('Type Validation', () => {
    it('should reject invalid type with error message', async () => {
      await statusCommand({ type: 'invalid-type' });

      // Should print error message
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid type: invalid-type'));

      // Should list valid types
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Valid types'));

      // Should exit with code 1
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should reject type with typo', async () => {
      await statusCommand({ type: 'feeature' });

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid type'));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should validate against exact list of valid types', async () => {
      const validTypes = ['feature', 'hotfix', 'bug', 'change-request', 'refactor', 'experiment'];

      for (const validType of validTypes) {
        exitSpy.mockClear();
        errorSpy.mockClear();
        consoleSpy.mockClear();

        await statusCommand({ type: validType });

        // Should NOT exit with error for valid types
        expect(exitSpy).not.toHaveBeenCalled();
      }
    });

    it('should show all valid types in error message', async () => {
      await statusCommand({ type: 'unknown' });

      const allErrorCalls = errorSpy.mock.calls.flat().join(' ');
      expect(allErrorCalls).toContain('feature');
      expect(allErrorCalls).toContain('hotfix');
      expect(allErrorCalls).toContain('bug');
      expect(allErrorCalls).toContain('change-request');
      expect(allErrorCalls).toContain('refactor');
      expect(allErrorCalls).toContain('experiment');
    });
  });

  // ============================================================================
  // WIP LIMIT DISPLAY TESTS
  // ============================================================================

  describe('WIP Limit Display', () => {
    it('should show WIP limit status section', async () => {
      const incDir = path.join(incrementsDir, '0001-feature');
      fs.mkdirSync(incDir, { recursive: true });

      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-feature',
          status: 'active',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({});

      // Should display WIP limit section
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📈 WIP Limit'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Active increments'));
    });

    it('should count planning, active, and ready_for_review as active for WIP limit', async () => {
      // Create increments in different active statuses
      const planningDir = path.join(incrementsDir, '0001-planning');
      const activeDir = path.join(incrementsDir, '0002-active');
      const readyDir = path.join(incrementsDir, '0003-ready');

      fs.mkdirSync(planningDir, { recursive: true });
      fs.mkdirSync(activeDir, { recursive: true });
      fs.mkdirSync(readyDir, { recursive: true });

      fs.writeFileSync(
        path.join(planningDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-planning',
          status: 'planning',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      fs.writeFileSync(
        path.join(activeDir, 'metadata.json'),
        JSON.stringify({
          id: '0002-active',
          status: 'active',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      fs.writeFileSync(
        path.join(readyDir, 'metadata.json'),
        JSON.stringify({
          id: '0003-ready',
          status: 'ready_for_review',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({});

      // Should show all 3 in the active count for WIP limit purposes
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('3/1'));
    });

    it('should warn when active count exceeds WIP limit', async () => {
      // Create 2 active increments (exceeds limit of 1)
      for (let i = 1; i <= 2; i++) {
        const dir = path.join(incrementsDir, `000${i}-feature-${i}`);
        fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(
          path.join(dir, 'metadata.json'),
          JSON.stringify({
            id: `000${i}-feature-${i}`,
            status: 'active',
            type: 'feature',
            created: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          })
        );
      }

      await statusCommand({});

      // Should show warning about exceeding limit
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('EXCEEDS LIMIT'));
    });

    it('should show hint when WIP limit is exceeded', async () => {
      // Create multiple active increments
      for (let i = 1; i <= 2; i++) {
        const dir = path.join(incrementsDir, `000${i}-feature-${i}`);
        fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(
          path.join(dir, 'metadata.json'),
          JSON.stringify({
            id: `000${i}-feature-${i}`,
            status: 'active',
            type: 'feature',
            created: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          })
        );
      }

      await statusCommand({});

      // Should provide hint to pause
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('pause'));
    });
  });

  // ============================================================================
  // SUMMARY AND NEXT ACTIONS TESTS
  // ============================================================================

  describe('Summary Section', () => {
    it('should display summary with correct counts', async () => {
      // Create increments with various statuses
      const statuses = ['active', 'paused', 'completed', 'abandoned'];
      statuses.forEach((status, index) => {
        const dir = path.join(incrementsDir, `000${index + 1}-${status}-feature`);
        fs.mkdirSync(dir, { recursive: true });

        const metadata: Record<string, any> = {
          id: `000${index + 1}-${status}-feature`,
          status,
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };

        if (status === 'paused') {
          metadata.pausedReason = 'Test reason';
        }
        if (status === 'abandoned') {
          metadata.abandonedReason = 'Test reason';
        }

        fs.writeFileSync(
          path.join(dir, 'metadata.json'),
          JSON.stringify(metadata)
        );
      });

      await statusCommand({});

      // Check summary section shows correct counts
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Summary'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Active: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Paused: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Completed: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Abandoned: 1'));
    });
  });

  describe('Next Actions Hints', () => {
    it('should suggest resume when only paused increments exist', async () => {
      const pausedDir = path.join(incrementsDir, '0001-paused-feature');
      fs.mkdirSync(pausedDir, { recursive: true });

      fs.writeFileSync(
        path.join(pausedDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-paused-feature',
          status: 'paused',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          pausedReason: 'Waiting for design'
        })
      );

      await statusCommand({});

      // Should suggest resuming
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Resume'));
    });

    it('should suggest starting new increment when no active work exists', async () => {
      await statusCommand({});

      // Should suggest creating new increment
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Start new'));
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle empty increments directory gracefully', async () => {
      await statusCommand({});

      // Should not crash, should display status
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📊 Increment Status'));
    });

    it('should handle malformed metadata gracefully', async () => {
      const incDir = path.join(incrementsDir, '0001-broken');
      fs.mkdirSync(incDir, { recursive: true });

      // Write invalid JSON
      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        'invalid json {'
      );

      await statusCommand({});

      // Should display status header even with malformed metadata
      // The MetadataManager silently skips malformed files
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📊 Increment Status'));
    });

    it('should exit with code 1 on invalid type', async () => {
      await statusCommand({ type: 'nonexistent' });

      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ============================================================================
  // OPTION COMBINATION TESTS
  // ============================================================================

  describe('Option Combinations', () => {
    it('should accept both verbose and type options together', async () => {
      const featureDir = path.join(incrementsDir, '0001-feature');
      fs.mkdirSync(featureDir, { recursive: true });

      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 3);

      fs.writeFileSync(
        path.join(featureDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-feature',
          status: 'active',
          type: 'feature',
          created: createdDate.toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({ verbose: true, type: 'feature' });

      // Should successfully show verbose output with type filter
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-feature'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Age'));
    });

    it('should accept verbose=false and type filter', async () => {
      const featureDir = path.join(incrementsDir, '0001-feature');
      fs.mkdirSync(featureDir, { recursive: true });

      fs.writeFileSync(
        path.join(featureDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-feature',
          status: 'active',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      await statusCommand({ verbose: false, type: 'feature' });

      // Should show feature without verbose details
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-feature'));
    });

    it('should accept undefined options (defaults)', async () => {
      await statusCommand({});

      // Should use defaults and display status
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📊 Increment Status'));
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration with showStatus', () => {
    it('should pass options correctly to showStatus', async () => {
      const incDir = path.join(incrementsDir, '0001-test');
      fs.mkdirSync(incDir, { recursive: true });

      fs.writeFileSync(
        path.join(incDir, 'metadata.json'),
        JSON.stringify({
          id: '0001-test',
          status: 'active',
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        })
      );

      // Call with verbose and no type filter
      await statusCommand({ verbose: true });

      // Should execute without error
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display status for all increment statuses', async () => {
      const allStatuses = ['planning', 'active', 'backlog', 'paused', 'ready_for_review', 'completed', 'abandoned'];

      allStatuses.forEach((status, index) => {
        const dir = path.join(incrementsDir, `000${index}-${status}`);
        fs.mkdirSync(dir, { recursive: true });

        const metadata: Record<string, any> = {
          id: `000${index}-${status}`,
          status,
          type: 'feature',
          created: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };

        if (status === 'paused') {
          metadata.pausedReason = 'Test pause';
        }
        if (status === 'abandoned') {
          metadata.abandonedReason = 'Test abandon';
        }
        if (status === 'backlog') {
          metadata.backlogReason = 'Test backlog';
        }

        fs.writeFileSync(
          path.join(dir, 'metadata.json'),
          JSON.stringify(metadata)
        );
      });

      await statusCommand({});

      // Should display without error
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DEFAULT BEHAVIOR TESTS
  // ============================================================================

  describe('Default Behavior (No Options)', () => {
    it('should work with no options provided', async () => {
      await statusCommand();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📊 Increment Status'));
    });

    it('should work with empty options object', async () => {
      await statusCommand({});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📊 Increment Status'));
    });

    it('should show all increments when no type filter specified', async () => {
      for (let i = 1; i <= 3; i++) {
        const dir = path.join(incrementsDir, `000${i}-feature-${i}`);
        fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(
          path.join(dir, 'metadata.json'),
          JSON.stringify({
            id: `000${i}-feature-${i}`,
            status: 'active',
            type: 'feature',
            created: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          })
        );
      }

      await statusCommand({});

      // All three should be shown
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0001-feature-1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0002-feature-2'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0003-feature-3'));
    });
  });
});
