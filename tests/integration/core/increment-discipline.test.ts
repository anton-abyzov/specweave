/**
 * E2E Tests for Increment Discipline Enforcement
 *
 * Tests the enforcement of WIP limits (max 1 active, hard cap 2)
 * via user-prompt-submit hook and MetadataManager integration.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as fs from '../../../src/utils/fs-native.js';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
// CRITICAL: Import getCleanEnv to prevent NODE_OPTIONS debug flags from breaking child processes
import { getCleanEnv } from '../../../src/utils/clean-env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Increment Discipline Enforcement (E2E)', () => {
  let testDir: string;
  // ✅ FIX: Save original cwd to restore after tests (prevents Claude Code crashes)
  let originalCwd: string;

  beforeEach(async () => {
    // Save original cwd BEFORE changing directory
    originalCwd = process.cwd();

    // Create temp directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'specweave-discipline-'));

    // Initialize .specweave structure
    await fs.mkdir(path.join(testDir, '.specweave/increments'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave/state'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave/docs/internal/specs/default'), { recursive: true });

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

    // Create dist directory and symlink to actual build output
    // This allows the hook to find MetadataManager
    await fs.mkdir(path.join(testDir, 'dist'), { recursive: true });
    const sourceDistPath = path.join(__dirname, '../../dist');
    if (await fs.pathExists(sourceDistPath)) {
      await fs.copy(sourceDistPath, path.join(testDir, 'dist'));
    }

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // ✅ FIX: Restore original cwd BEFORE cleanup (critical!)
    if (originalCwd) {
      process.chdir(originalCwd);
    }

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
      const hookPath = path.join(__dirname, '../../../plugins/specweave/hooks/user-prompt-submit.sh');
      const input = JSON.stringify({ prompt });

      // Write input to a temp file to avoid shell escaping issues
      const tempInput = path.join(testDir, 'hook-input.json');
      await fs.writeFile(tempInput, input, 'utf-8');

      // Execute hook with input from file
      const output = execSync(`cat ${tempInput} | bash ${hookPath}`, {
        cwd: testDir,
        encoding: 'utf-8',
        env: getCleanEnv(),
      });

      // Clean up temp file
      await fs.remove(tempInput);

      return JSON.parse(output.trim());
    } catch (error: any) {
      // Hook blocked with exit(0), output is in stdout
      if (error.stdout) {
        return JSON.parse(error.stdout.trim());
      }
      throw error;
    }
  }

  describe('Scenario 1: No Active Increments (0→1)', () => {
    it('should allow creating first increment', async () => {
      const result = await simulateHook('/sw:increment "Add user authentication"');

      expect(result.decision).toBe('approve');
      expect(result.reason).toBeUndefined();
    });

    it('should have clean state with no WIP warnings', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(0);

      const result = await simulateHook('/sw:increment "New feature"');
      expect(result.decision).toBe('approve');
      // v1.0.106+: Hook may inject project context (not a warning)
      // The key assertion is that there's NO WIP limit warning
      if (result.systemMessage) {
        expect(result.systemMessage).not.toContain('WIP LIMIT');
        // May have project context which is fine
        expect(result.systemMessage).toMatch(/PROJECT CONTEXT|undefined/);
      }
    });
  });

  describe('Scenario 2: One Active Increment (1→2)', () => {
    beforeEach(async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');
    });

    it('should show warning when starting 2nd increment', async () => {
      const result = await simulateHook('/sw:increment "Add payment system"');

      expect(result.decision).toBe('approve'); // Allows but warns
      expect(result.systemMessage).toContain('WIP LIMIT REACHED');
      expect(result.systemMessage).toContain('0001-user-auth');
      // v1.0.106+: Message text updated
      expect(result.systemMessage).toContain('maximum productivity');
    });

    it('should list active increment in warning', async () => {
      const result = await simulateHook('/sw:increment "Add feature"');

      expect(result.systemMessage).toContain('0001-user-auth [feature]');
    });

    it('should suggest options in warning', async () => {
      const result = await simulateHook('/sw:increment "Add feature"');

      expect(result.systemMessage).toContain('Complete current work');
      expect(result.systemMessage).toContain('Pause current work');
      expect(result.systemMessage).toContain('Continue anyway');
    });

    it('should mention emergency bypass option', async () => {
      const result = await simulateHook('/sw:increment "Add feature"');

      expect(result.systemMessage).toContain('hotfix');
      expect(result.systemMessage).toContain('bug');
    });
  });

  describe('Scenario 3: Two Active Increments (Hard Cap)', () => {
    beforeEach(async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');
      await createIncrement('0002-payments', 'active', 'feature');
    });

    it('should WARN (approve with systemMessage) when trying to start 3rd increment', async () => {
      const result = await simulateHook('/sw:increment "Add notifications"');

      // v1.0.106+: Hook now uses approve + systemMessage (not block + reason)
      // WIP limits are warnings, not hard blocks - user decides!
      expect(result.decision).toBe('approve');
      expect(result.systemMessage).toContain('WIP LIMIT EXCEEDED');
      expect(result.systemMessage).toContain('2 active increments');
    });

    it('should list both active increments in warning', async () => {
      const result = await simulateHook('/sw:increment "Add feature"');

      expect(result.systemMessage).toContain('0001-user-auth');
      expect(result.systemMessage).toContain('0002-payments');
    });

    it('should suggest actions to resolve', async () => {
      const result = await simulateHook('/sw:increment "Add feature"');

      expect(result.systemMessage).toContain('/sw:done');
      expect(result.systemMessage).toContain('/sw:pause');
    });

    it('should mention options to proceed', async () => {
      const result = await simulateHook('/sw:increment "Add feature"');

      // v1.0.106+: Message now provides options (not hard blocks)
      expect(result.systemMessage).toContain('Continue anyway');
      expect(result.systemMessage).toContain('Increase limit');
    });

    it('should cite productivity research', async () => {
      const result = await simulateHook('/sw:increment "Add feature"');

      expect(result.systemMessage).toContain('3+ concurrent tasks = 40%');
    });
  });

  describe('Scenario 4: Completed Increments (Should Allow)', () => {
    beforeEach(async () => {
      await createIncrement('0001-user-auth', 'completed', 'feature');
      await createIncrement('0002-payments', 'completed', 'feature');
    });

    it('should allow new increment when previous ones are completed', async () => {
      const result = await simulateHook('/sw:increment "Add notifications"');

      expect(result.decision).toBe('approve');
      expect(result.reason).toBeUndefined();
    });

    it('should have zero active count', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(0);
    });
  });

  describe('Scenario 5: Paused Increments (Should Allow)', () => {
    beforeEach(async () => {
      await createIncrement('0001-user-auth', 'paused', 'feature');
      await createIncrement('0002-payments', 'paused', 'feature');
    });

    it('should allow new increment when previous ones are paused', async () => {
      const result = await simulateHook('/sw:increment "Add notifications"');

      expect(result.decision).toBe('approve');
      expect(result.reason).toBeUndefined();
    });

    it('should have zero active count', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(0);
    });
  });

  describe('Scenario 6: Mixed Statuses', () => {
    beforeEach(async () => {
      await createIncrement('0001-user-auth', 'completed', 'feature');
      await createIncrement('0002-payments', 'active', 'feature');
      await createIncrement('0003-notifications', 'paused', 'feature');
    });

    it('should count only active increments', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(1);
    });

    it('should show warning for 2nd active (not count completed/paused)', async () => {
      const result = await simulateHook('/sw:increment "Add messaging"');

      expect(result.decision).toBe('approve');
      expect(result.systemMessage).toContain('WIP LIMIT REACHED');
      expect(result.systemMessage).toContain('1 active increment');
    });

    it('should list only active increment in warning', async () => {
      const result = await simulateHook('/sw:increment "Add feature"');

      expect(result.systemMessage).toContain('0002-payments');
      expect(result.systemMessage).not.toContain('0001-user-auth'); // completed
      expect(result.systemMessage).not.toContain('0003-notifications'); // paused
    });
  });

  describe('Scenario 7: Abandoned Increments (Should Allow)', () => {
    beforeEach(async () => {
      await createIncrement('0001-user-auth', 'abandoned', 'experiment');
      await createIncrement('0002-payments', 'abandoned', 'feature');
    });

    it('should allow new increment when previous ones are abandoned', async () => {
      const result = await simulateHook('/sw:increment "Add notifications"');

      expect(result.decision).toBe('approve');
    });

    it('should have zero active count', async () => {
      const count = await countActiveIncrements();
      expect(count).toBe(0);
    });
  });

  describe('Scenario 8: Emergency Hotfixes', () => {
    beforeEach(async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');
    });

    it('should warn when starting 2nd active (even for hotfix)', async () => {
      // Note: Hook doesn't currently distinguish hotfix type from prompt
      // It just warns with suggestion to use --type=hotfix
      const result = await simulateHook('/sw:increment "Critical security fix"');

      expect(result.decision).toBe('approve');
      expect(result.systemMessage).toContain('WIP LIMIT REACHED');
      expect(result.systemMessage).toContain('Emergency hotfix/bug');
    });

    it('should still warn for 3rd increment even if hotfix', async () => {
      await createIncrement('0002-security-fix', 'active', 'hotfix');

      const result = await simulateHook('/sw:increment "Another hotfix"');

      // v1.0.106+: Hook now uses approve + systemMessage (not block)
      // Even at hard cap, user can proceed with confirmation
      expect(result.decision).toBe('approve');
      expect(result.systemMessage).toContain('WIP LIMIT EXCEEDED');
    });
  });

  describe('Scenario 9: Fallback Mode (No dist/ Available)', () => {
    beforeEach(async () => {
      // Simulate environment where dist/cli/index.js doesn't exist
      // The hook will use fallback logic (same as normal mode now)
      await createIncrement('0001-user-auth', 'active', 'feature');
      await createIncrement('0002-payments', 'planning', 'feature');
    });

    it('should use fallback logic to detect incomplete increments', async () => {
      const result = await simulateHook('/sw:increment "Add notifications"');

      // v1.0.106+: Hook counts 'active', 'planning', 'backlog', 'ready_for_review' as active
      // 2 increments (active + planning) = WIP LIMIT EXCEEDED warning (not block)
      expect(result.decision).toBe('approve');
      expect(result.systemMessage).toContain('WIP LIMIT EXCEEDED');
      expect(result.systemMessage).toContain('2 active increments');
    });
  });

  describe('Scenario 10: Integration with Other Commands', () => {
    it('should NOT block non-increment commands', async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');
      await createIncrement('0002-payments', 'active', 'feature');

      // These commands should not be blocked
      const commands = [
        '/sw:do',
        '/sw:progress',
        '/sw:status',
        '/sw:done 0001',
        '/sw:pause 0001',
      ];

      for (const command of commands) {
        const result = await simulateHook(command);
        expect(result.decision).toBe('approve');
      }
    });

    it('should provide context for other commands', async () => {
      await createIncrement('0001-user-auth', 'active', 'feature');

      const result = await simulateHook('How do I implement authentication?');
      expect(result.decision).toBe('approve');
      // May have context about active increment, but shouldn't block
    });
  });
});
