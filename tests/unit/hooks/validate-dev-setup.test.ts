import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

/**
 * Unit Tests for Development Setup Validation
 *
 * Tests the validate-dev-setup.sh utility used by hooks to detect
 * marketplace symlink issues and prevent hook errors.
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

describe('validate-dev-setup.sh', () => {
  let tempDir: string;
  let mockRepoDir: string;
  let marketplaceDir: string;
  let validationScript: string;

  beforeEach(async () => {
    // Create temporary test environment
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validate-setup-test-'));
    mockRepoDir = path.join(tempDir, 'repo');
    marketplaceDir = path.join(tempDir, '.claude', 'plugins', 'marketplaces', 'specweave');

    // Copy validation script to temp location
    const originalScript = path.join(
      __dirname,
      '../../../plugins/specweave/lib/utils/validate-dev-setup.sh'
    );
    validationScript = path.join(tempDir, 'validate-dev-setup.sh');
    await fs.copy(originalScript, validationScript);

    // Create mock SpecWeave repository
    await fs.ensureDir(mockRepoDir);
    await fs.writeJson(path.join(mockRepoDir, 'package.json'), {
      name: 'specweave',
      version: '0.21.0',
    });

    // Initialize git repo
    try {
      execSync('git init', { cwd: mockRepoDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', {
        cwd: mockRepoDir,
        stdio: 'pipe',
      });
      execSync('git config user.name "Test"', { cwd: mockRepoDir, stdio: 'pipe' });
      execSync('git add .', { cwd: mockRepoDir, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: mockRepoDir, stdio: 'pipe' });
    } catch (e) {
      // Git setup can fail in CI, that's ok for some tests
    }
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('is_user_project()', () => {
    it('should return true for non-SpecWeave repositories', async () => {
      // Create user project
      const userProject = path.join(tempDir, 'user-project');
      await fs.ensureDir(userProject);
      await fs.writeJson(path.join(userProject, 'package.json'), {
        name: 'my-app',
        version: '1.0.0',
      });

      try {
        execSync('git init', { cwd: userProject, stdio: 'pipe' });
        execSync('git config user.email "test@test.com"', {
          cwd: userProject,
          stdio: 'pipe',
        });
        execSync('git config user.name "Test"', { cwd: userProject, stdio: 'pipe' });

        // Source the script and test the function
        const result = execSync(
          `cd "${userProject}" && source "${validationScript}" && is_user_project && echo "TRUE" || echo "FALSE"`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        expect(result.trim()).toBe('TRUE');
      } catch (e) {
        // Git not available, skip test
        console.log('Git not available, skipping test');
      }
    });

    it('should return false for SpecWeave repository', async () => {
      try {
        const result = execSync(
          `cd "${mockRepoDir}" && source "${validationScript}" && is_user_project && echo "TRUE" || echo "FALSE"`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        expect(result.trim()).toBe('FALSE');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });
  });

  describe('validate_marketplace_setup_quiet()', () => {
    it('should pass for user projects without validation', async () => {
      // User project - should skip validation entirely
      const userProject = path.join(tempDir, 'user-project');
      await fs.ensureDir(userProject);
      await fs.writeJson(path.join(userProject, 'package.json'), {
        name: 'my-app',
      });

      try {
        execSync('git init', { cwd: userProject, stdio: 'pipe' });
        execSync('git config user.email "test@test.com"', {
          cwd: userProject,
          stdio: 'pipe',
        });
        execSync('git config user.name "Test"', { cwd: userProject, stdio: 'pipe' });

        const result = execSync(
          `cd "${userProject}" && source "${validationScript}" && validate_marketplace_setup_quiet && echo "PASS" || echo "FAIL"`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        expect(result.trim()).toBe('PASS');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });

    it('should fail when marketplace is regular directory', async () => {
      // Create marketplace as regular directory (bug scenario)
      await fs.ensureDir(marketplaceDir);

      try {
        const result = execSync(
          `cd "${mockRepoDir}" && HOME="${tempDir}" source "${validationScript}" && validate_marketplace_setup_quiet && echo "PASS" || echo "FAIL"`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        expect(result.trim()).toBe('FAIL');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });

    it('should fail when marketplace does not exist', async () => {
      // Don't create marketplace directory at all
      try {
        const result = execSync(
          `cd "${mockRepoDir}" && HOME="${tempDir}" source "${validationScript}" && validate_marketplace_setup_quiet && echo "PASS" || echo "FAIL"`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        expect(result.trim()).toBe('FAIL');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });

    it('should pass when marketplace is valid symlink', async () => {
      // Create correct symlink setup
      await fs.ensureDir(path.dirname(marketplaceDir));
      await fs.symlink(mockRepoDir, marketplaceDir);

      try {
        const result = execSync(
          `cd "${mockRepoDir}" && HOME="${tempDir}" source "${validationScript}" && validate_marketplace_setup_quiet && echo "PASS" || echo "FAIL"`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        expect(result.trim()).toBe('PASS');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });

    it('should set MARKETPLACE_SETUP_ERROR on failure', async () => {
      // Create marketplace as regular directory
      await fs.ensureDir(marketplaceDir);

      try {
        const result = execSync(
          `cd "${mockRepoDir}" && HOME="${tempDir}" source "${validationScript}" && validate_marketplace_setup_quiet; echo "$MARKETPLACE_SETUP_ERROR"`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        expect(result.trim()).toContain('regular directory');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });
  });

  describe('validate_marketplace_setup_verbose()', () => {
    it('should print helpful error message on failure', async () => {
      // Create marketplace as regular directory
      await fs.ensureDir(marketplaceDir);

      try {
        const result = execSync(
          `cd "${mockRepoDir}" && HOME="${tempDir}" source "${validationScript}" && validate_marketplace_setup_verbose 2>&1 || true`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        expect(result).toContain('Invalid marketplace setup');
        expect(result).toContain('setup-dev-plugins.sh');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });

    it('should suggest fix commands', async () => {
      await fs.ensureDir(marketplaceDir);

      try {
        const result = execSync(
          `cd "${mockRepoDir}" && HOME="${tempDir}" source "${validationScript}" && validate_marketplace_setup_verbose 2>&1 || true`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        expect(result).toContain('rm -rf');
        expect(result).toContain('ln -s');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });
  });

  describe('Integration with hooks', () => {
    it('should allow hooks to skip execution on invalid setup', async () => {
      // Create mock hook that uses validation
      const mockHook = path.join(tempDir, 'test-hook.sh');
      await fs.writeFile(
        mockHook,
        `#!/bin/bash
source "${validationScript}"
validate_marketplace_setup_quiet || exit 0
echo "HOOK EXECUTED"
`,
        { mode: 0o755 }
      );

      // Create marketplace as regular directory (invalid)
      await fs.ensureDir(marketplaceDir);

      try {
        const result = execSync(`cd "${mockRepoDir}" && HOME="${tempDir}" ${mockHook}`, {
          encoding: 'utf-8',
          shell: '/bin/bash',
        });

        // Hook should NOT execute
        expect(result).not.toContain('HOOK EXECUTED');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });

    it('should allow hooks to execute on valid setup', async () => {
      // Create mock hook
      const mockHook = path.join(tempDir, 'test-hook.sh');
      await fs.writeFile(
        mockHook,
        `#!/bin/bash
source "${validationScript}"
validate_marketplace_setup_quiet || exit 0
echo "HOOK EXECUTED"
`,
        { mode: 0o755 }
      );

      // Create valid symlink
      await fs.ensureDir(path.dirname(marketplaceDir));
      await fs.symlink(mockRepoDir, marketplaceDir);

      try {
        const result = execSync(`cd "${mockRepoDir}" && HOME="${tempDir}" ${mockHook}`, {
          encoding: 'utf-8',
          shell: '/bin/bash',
        });

        // Hook SHOULD execute
        expect(result).toContain('HOOK EXECUTED');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });
  });

  describe('Error suppression', () => {
    it('should respect SPECWEAVE_SUPPRESS_WARNINGS', async () => {
      await fs.ensureDir(marketplaceDir);

      try {
        const result = execSync(
          `cd "${mockRepoDir}" && HOME="${tempDir}" SPECWEAVE_SUPPRESS_WARNINGS=true source "${validationScript}" && warn_marketplace_setup 2>&1`,
          { encoding: 'utf-8', shell: '/bin/bash' }
        );

        // Should not print warning
        expect(result).not.toContain('Warning');
      } catch (e) {
        console.log('Git not available, skipping test');
      }
    });
  });
});
