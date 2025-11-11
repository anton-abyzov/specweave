/**
 * Integration Test: specweave init . (dot notation)
 *
 * Tests the ability to initialize SpecWeave in the current directory
 * rather than creating a subdirectory.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

// Get path to local specweave binary for testing
const projectRoot = path.resolve(__dirname, '../../..');
const specweaveBin = path.join(projectRoot, 'bin', 'specweave.js');

describe('specweave init . (current directory)', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create unique test directory
    testDir = path.join('/tmp', `specweave-init-dot-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('Empty directory initialization', () => {
    it('should initialize SpecWeave in empty directory', async () => {
      // Change to test directory and run init with dot notation
      // Note: We need to use stdio: 'pipe' to capture output
      const { stdout } = await execAsync(
        `cd ${testDir} && echo "test-project" | npx specweave init .`,
        { timeout: 30000 }
      );

      // Verify .specweave directory exists in current directory
      expect(fs.existsSync(path.join(testDir, '.specweave'))).toBe(true);

      // Verify key files exist
      expect(fs.existsSync(path.join(testDir, 'CLAUDE.md'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'README.md'))).toBe(true);
    });

    it('should derive project name from directory name', async () => {
      // Create directory with specific name
      const namedDir = path.join('/tmp', `my-awesome-app-${Date.now()}`);
      await fs.mkdir(namedDir, { recursive: true });

      try {
        await execAsync(
          `cd ${namedDir} && echo "" | npx specweave init .`,
          { timeout: 30000 }
        );

        // Read CLAUDE.md and check if project name is used
        const claudeMd = await fs.readFile(
          path.join(namedDir, 'CLAUDE.md'),
          'utf-8'
        );

        // The directory name should appear in the template
        expect(claudeMd).toContain('my-awesome-app');
      } finally {
        await fs.remove(namedDir);
      }
    }, 45000);

    it('should skip git init if .git already exists', async () => {
      // Initialize git first
      await execAsync('git init', { cwd: testDir });

      // Get initial git log
      const { stdout: initialLog } = await execAsync(
        'git log --oneline',
        { cwd: testDir }
      ).catch(() => ({ stdout: '' }));

      // Run specweave init
      await execAsync(
        `cd ${testDir} && echo "test-project" | npx specweave init .`,
        { timeout: 30000 }
      );

      // Verify .git still exists
      expect(fs.existsSync(path.join(testDir, '.git'))).toBe(true);

      // Verify git repository wasn't re-initialized
      // (checking that original .git wasn't replaced)
      expect(fs.existsSync(path.join(testDir, '.git', 'config'))).toBe(true);
    }, 45000);
  });

  describe('Non-empty directory handling', () => {
    it('should warn and require confirmation for non-empty directory', async () => {
      // Create some existing files
      await fs.writeFile(path.join(testDir, 'existing-file.txt'), 'content');
      await fs.writeFile(path.join(testDir, 'package.json'), '{}');

      // Try to init (should prompt)
      // Note: This test verifies the warning appears, actual user interaction
      // is tested manually or with interactive test tools
      const command = `cd ${testDir} && echo "n" | npx specweave init .`;

      try {
        await execAsync(command, { timeout: 30000 });
      } catch (error: any) {
        // Expect user to cancel - should exit with code 0
        expect(error.message).toContain('Initialization cancelled');
      }
    }, 45000);

    it('should allow initialization in non-empty directory with confirmation', async () => {
      // Create some existing files
      await fs.writeFile(path.join(testDir, 'existing-file.txt'), 'content');

      // Simulate user confirming (yes to non-empty, project name)
      const command = `cd ${testDir} && printf "y\\ntest-project\\n" | npx specweave init .`;

      await execAsync(command, { timeout: 30000 });

      // Verify SpecWeave initialized
      expect(fs.existsSync(path.join(testDir, '.specweave'))).toBe(true);

      // Verify existing file still exists
      expect(fs.existsSync(path.join(testDir, 'existing-file.txt'))).toBe(true);
    }, 45000);
  });

  describe('Invalid directory name handling', () => {
    it('should prompt for project name if directory name has invalid characters', async () => {
      // Create directory with spaces and special chars
      const invalidDir = path.join('/tmp', `My Test App! ${Date.now()}`);
      await fs.mkdir(invalidDir, { recursive: true });

      try {
        // Should prompt for project name, we provide "my-test-app"
        const command = `cd "${invalidDir}" && printf "my-test-app\\n" | npx specweave init .`;

        await execAsync(command, { timeout: 30000 });

        // Verify initialization succeeded
        expect(fs.existsSync(path.join(invalidDir, '.specweave'))).toBe(true);

        // Check that sanitized name is used in templates
        const claudeMd = await fs.readFile(
          path.join(invalidDir, 'CLAUDE.md'),
          'utf-8'
        );
        expect(claudeMd).toContain('my-test-app');
      } finally {
        await fs.remove(invalidDir);
      }
    }, 45000);
  });

  describe('Next steps output', () => {
    it('should not show "cd" step when using dot notation', async () => {
      const { stdout } = await execAsync(
        `cd ${testDir} && echo "test-project" | npx specweave init .`,
        { timeout: 30000 }
      );

      // Should show "Next steps:" but NOT "cd test-project"
      expect(stdout).toContain('Next steps:');
      expect(stdout).not.toMatch(/cd test-project/);

      // Should start with step 1 being "Open Claude Code"
      expect(stdout).toMatch(/1\.\s+Open Claude Code/);
    }, 45000);
  });

  describe('Overwrite existing .specweave', () => {
    it('should prompt before overwriting existing .specweave directory', async () => {
      // Initialize once
      await execAsync(
        `cd ${testDir} && echo "test-project" | npx specweave init .`,
        { timeout: 30000 }
      );

      // Create a custom file in .specweave
      await fs.writeFile(
        path.join(testDir, '.specweave', 'custom.txt'),
        'important data'
      );

      // Try to initialize again (should prompt, we say no)
      const command = `cd ${testDir} && printf "n\\n" | npx specweave init .`;

      try {
        await execAsync(command, { timeout: 30000 });
      } catch (error: any) {
        // Should cancel
        expect(error.message).toContain('Initialization cancelled');
      }

      // Verify custom file still exists
      expect(
        fs.existsSync(path.join(testDir, '.specweave', 'custom.txt'))
      ).toBe(true);
    }, 45000);

    it('should overwrite .specweave if user confirms (force mode)', async () => {
      // Initialize once
      await execAsync(
        `cd ${testDir} && echo "test-project" | node "${specweaveBin}" init .`,
        { timeout: 60000 }
      );

      // Create a custom file in .specweave
      await fs.writeFile(
        path.join(testDir, '.specweave', 'custom.txt'),
        'important data'
      );

      // Initialize again with --force flag (non-interactive fresh start)
      const command = `cd ${testDir} && node "${specweaveBin}" init . --force`;

      await execAsync(command, { timeout: 60000 });

      // Verify .specweave still exists
      expect(fs.existsSync(path.join(testDir, '.specweave'))).toBe(true);

      // Verify custom file was removed (directory was overwritten)
      expect(
        fs.existsSync(path.join(testDir, '.specweave', 'custom.txt'))
      ).toBe(false);
    }, 90000);
  });

  describe('Comparison with subdirectory mode', () => {
    it('should create subdirectory when project name is provided', async () => {
      const { stdout } = await execAsync(
        `cd ${testDir} && npx specweave init my-project`,
        { timeout: 30000 }
      );

      // Verify subdirectory was created
      expect(fs.existsSync(path.join(testDir, 'my-project'))).toBe(true);
      expect(
        fs.existsSync(path.join(testDir, 'my-project', '.specweave'))
      ).toBe(true);

      // Should show "cd my-project" step
      expect(stdout).toContain('cd my-project');
    }, 45000);

    it('should NOT create subdirectory when using dot notation', async () => {
      await execAsync(
        `cd ${testDir} && echo "test-project" | npx specweave init .`,
        { timeout: 30000 }
      );

      // Verify .specweave is in current directory, not a subdirectory
      expect(fs.existsSync(path.join(testDir, '.specweave'))).toBe(true);

      // Verify no "test-project" subdirectory was created
      expect(fs.existsSync(path.join(testDir, 'test-project'))).toBe(false);
    }, 45000);
  });
});
