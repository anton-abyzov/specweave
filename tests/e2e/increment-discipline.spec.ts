/**
 * E2E Tests for Increment Discipline Enforcement
 *
 * Tests the enforcement of WIP limits (max 1 active, hard cap 2)
 * via user-prompt-submit hook and MetadataManager integration.
 */

import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Increment Discipline Enforcement (E2E)', () => {
  let testDir: string;

  test.beforeEach(async () => {
    // Create temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-discipline-'));

    // Initialize .specweave structure
    await fs.mkdir(path.join(testDir, '.specweave/increments'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave/state'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave/docs/internal/projects/default'), { recursive: true });

    // Create minimal config
    await fs.writeJSON(path.join(testDir, '.specweave/config.json'), {
      limits: {
        maxActiveIncrements: 1,
        hardCap: 2,
        allowEmergencyInterrupt: true,
        typeBehaviors: {
          canInterrupt: ['hotfix', 'bug'],
        },
      },
    });

    // Change to test directory
    process.chdir(testDir);
  });

  test.afterEach(async () => {
    // Clean up
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  /**
   * Helper: Create an increment with metadata
   */
  async function createIncrement(
    id: string,
    status: string = 'active',
    type: string = 'feature'
  ): Promise<void> {
    const incrementDir = path.join(testDir, '.specweave/increments', id);
    await fs.mkdir(incrementDir, { recursive: true });

    const metadata = {
      id,
      status,
      type,
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    await fs.writeJSON(path.join(incrementDir, 'metadata.json'), metadata, { spaces: 2 });

    // Create minimal spec.md
    await fs.writeFile(
      path.join(incrementDir, 'spec.md'),
      `# Increment ${id}\n\nTest increment for discipline enforcement.`
    );
  }

  /**
   * Helper: Count active increments
   */
  async function countActiveIncrements(): Promise<number> {
    const incrementsDir = path.join(testDir, '.specweave/increments');
    const entries = await fs.readdir(incrementsDir);

    let count = 0;
    for (const entry of entries) {
      const metadataPath = path.join(incrementsDir, entry, 'metadata.json');
      if (await fs.pathExists(metadataPath)) {
        const metadata = await fs.readJSON(metadataPath);
        if (metadata.status === 'active') {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Helper: Simulate hook execution
   */
  async function simulateHook(prompt: string): Promise<{ decision: string; reason?: string; systemMessage?: string }> {
    try {
      const hookPath = path.join(__dirname, '../../plugins/specweave/hooks/user-prompt-submit.sh');
      const input = JSON.stringify({ prompt });

      const output = execSync(`echo '${input}' | bash ${hookPath}`, {
        cwd: testDir,
        encoding: 'utf-8',
        env: { ...process.env, PATH: process.env.PATH },
      });

      return JSON.parse(output.trim());
    } catch (error: any) {
      // Hook blocked with exit(0), output is in stdout
      if (error.stdout) {
        return JSON.parse(error.stdout.trim());
      }
      throw error;
    }
  }

  test.describe('Scenario 1: No Active Increments (0→1)', () => {
    test('should allow creating first increment', async () => {
      const result = await simulateHook('/specweave:increment "Add user authentication"');

      expect(result.decision).toBe('approve');
      expect(result.reason).toBeUndefined();
    });

    test('should have clean state with no warnings', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(0);

      const result = await simulateHook('/specweave:increment "New feature"');
      expect(result.decision).toBe('approve');
      expect(result.systemMessage).toBeUndefined();
    });
  });

  test.describe('Scenario 2: One Active Increment (1→2)', () => {
    test.beforeEach(async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');
    });

    test('should show warning when starting 2nd increment', async () => {
      const result = await simulateHook('/specweave:increment "Add payment system"');

      expect(result.decision).toBe('approve'); // Allows but warns
      expect(result.systemMessage).toContain('WIP LIMIT REACHED');
      expect(result.systemMessage).toContain('0001-user-auth');
      expect(result.systemMessage).toContain('ONE active increment = maximum productivity');
    });

    test('should list active increment in warning', async () => {
      const result = await simulateHook('/specweave:increment "Add feature"');

      expect(result.systemMessage).toContain('0001-user-auth [feature]');
    });

    test('should suggest options in warning', async () => {
      const result = await simulateHook('/specweave:increment "Add feature"');

      expect(result.systemMessage).toContain('Complete current work');
      expect(result.systemMessage).toContain('Pause current work');
      expect(result.systemMessage).toContain('Continue anyway');
    });

    test('should mention emergency bypass option', async () => {
      const result = await simulateHook('/specweave:increment "Add feature"');

      expect(result.systemMessage).toContain('hotfix');
      expect(result.systemMessage).toContain('bug');
    });
  });

  test.describe('Scenario 3: Two Active Increments (Hard Cap)', () => {
    test.beforeEach(async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');
      await createIncrement('0002-payments', 'active', 'feature');
    });

    test('should BLOCK when trying to start 3rd increment', async () => {
      const result = await simulateHook('/specweave:increment "Add notifications"');

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('HARD CAP REACHED');
      expect(result.reason).toContain('2 active increments');
    });

    test('should list both active increments in error', async () => {
      const result = await simulateHook('/specweave:increment "Add feature"');

      expect(result.reason).toContain('0001-user-auth');
      expect(result.reason).toContain('0002-payments');
    });

    test('should suggest actions to resolve', async () => {
      const result = await simulateHook('/specweave:increment "Add feature"');

      expect(result.reason).toContain('/specweave:done');
      expect(result.reason).toContain('/specweave:pause');
      expect(result.reason).toContain('/specweave:status');
    });

    test('should mention combining multiple hotfixes', async () => {
      const result = await simulateHook('/specweave:increment "Add feature"');

      expect(result.reason).toContain('Multiple hotfixes? Combine them into ONE increment');
      expect(result.reason).toContain('0009-security-fixes');
    });

    test('should cite productivity research', async () => {
      const result = await simulateHook('/specweave:increment "Add feature"');

      expect(result.reason).toContain('3+ concurrent tasks = 40% slower');
    });
  });

  test.describe('Scenario 4: Completed Increments (Should Allow)', () => {
    test.beforeEach(async () => {
      await createIncrement('0001-user-auth', 'completed', 'feature');
      await createIncrement('0002-payments', 'completed', 'feature');
    });

    test('should allow new increment when previous ones are completed', async () => {
      const result = await simulateHook('/specweave:increment "Add notifications"');

      expect(result.decision).toBe('approve');
      expect(result.reason).toBeUndefined();
    });

    test('should have zero active count', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(0);
    });
  });

  test.describe('Scenario 5: Paused Increments (Should Allow)', () => {
    test.beforeEach(async () => {
      await createIncrement('0001-user-auth', 'paused', 'feature');
      await createIncrement('0002-payments', 'paused', 'feature');
    });

    test('should allow new increment when previous ones are paused', async () => {
      const result = await simulateHook('/specweave:increment "Add notifications"');

      expect(result.decision).toBe('approve');
      expect(result.reason).toBeUndefined();
    });

    test('should have zero active count', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(0);
    });
  });

  test.describe('Scenario 6: Mixed Statuses', () => {
    test.beforeEach(async () => {
      await createIncrement('0001-user-auth', 'completed', 'feature');
      await createIncrement('0002-payments', 'active', 'feature');
      await createIncrement('0003-notifications', 'paused', 'feature');
    });

    test('should count only active increments', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(1);
    });

    test('should show warning for 2nd active (not count completed/paused)', async () => {
      const result = await simulateHook('/specweave:increment "Add messaging"');

      expect(result.decision).toBe('approve');
      expect(result.systemMessage).toContain('WIP LIMIT REACHED');
      expect(result.systemMessage).toContain('1 active increment');
    });

    test('should list only active increment in warning', async () => {
      const result = await simulateHook('/specweave:increment "Add feature"');

      expect(result.systemMessage).toContain('0002-payments');
      expect(result.systemMessage).not.toContain('0001-user-auth'); // completed
      expect(result.systemMessage).not.toContain('0003-notifications'); // paused
    });
  });

  test.describe('Scenario 7: Abandoned Increments (Should Allow)', () => {
    test.beforeEach(async () => {
      await createIncrement('0001-user-auth', 'abandoned', 'experiment');
      await createIncrement('0002-payments', 'abandoned', 'feature');
    });

    test('should allow new increment when previous ones are abandoned', async () => {
      const result = await simulateHook('/specweave:increment "Add notifications"');

      expect(result.decision).toBe('approve');
    });

    test('should have zero active count', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(0);
    });
  });

  test.describe('Scenario 8: Emergency Hotfixes', () => {
    test.beforeEach(async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');
    });

    test('should warn when starting 2nd active (even for hotfix)', async () => {
      // Note: Hook doesn't currently distinguish hotfix type from prompt
      // It just warns with suggestion to use --type=hotfix
      const result = await simulateHook('/specweave:increment "Critical security fix"');

      expect(result.decision).toBe('approve');
      expect(result.systemMessage).toContain('WIP LIMIT REACHED');
      expect(result.systemMessage).toContain('Emergency hotfix/bug');
    });

    test('should still block 3rd increment even if hotfix', async () => {
      await createIncrement('0002-security-fix', 'active', 'hotfix');

      const result = await simulateHook('/specweave:increment "Another hotfix"');

      expect(result.decision).toBe('block');
      expect(result.reason).toContain('HARD CAP REACHED');
    });
  });

  test.describe('Scenario 9: Fallback Mode (No dist/ Available)', () => {
    test.beforeEach(async () => {
      // Simulate environment where dist/cli/index.js doesn't exist
      // The hook will use fallback logic
      await createIncrement('0001-user-auth', 'active', 'feature');
      await createIncrement('0002-payments', 'planning', 'feature');
    });

    test('should use fallback logic to detect incomplete increments', async () => {
      const result = await simulateHook('/specweave:increment "Add notifications"');

      // Fallback logic checks for 'active' or 'planning' status
      // Should block because we have 2 incomplete (active + planning)
      expect(result.decision).toBe('block');
      expect(result.reason).toContain('Cannot create new increment');
      expect(result.reason).toContain('2 incomplete increment');
    });
  });

  test.describe('Scenario 10: Integration with Other Commands', () => {
    test('should NOT block non-increment commands', async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');
      await createIncrement('0002-payments', 'active', 'feature');

      // These commands should not be blocked
      const commands = [
        '/specweave:do',
        '/specweave:progress',
        '/specweave:status',
        '/specweave:done 0001',
        '/specweave:pause 0001',
      ];

      for (const command of commands) {
        const result = await simulateHook(command);
        expect(result.decision).toBe('approve');
      }
    });

    test('should provide context for other commands', async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');

      const result = await simulateHook('How do I implement authentication?');
      expect(result.decision).toBe('approve');
      // May have context about active increment, but shouldn't block
    });
  });
});
