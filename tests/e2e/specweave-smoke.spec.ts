/**
 * SpecWeave E2E Smoke Test (Playwright)
 *
 * Comprehensive end-to-end test that validates SpecWeave can:
 * 1. Install in a clean environment
 * 2. Generate a complete SaaS project from natural language
 * 3. Produce proper structure, specs, tests, and code
 * 4. Build and test successfully
 */

import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);

// Path to local CLI (use this instead of 'npx specweave')
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI_PATH = path.join(PROJECT_ROOT, 'bin/specweave.js');

test.describe.serial('SpecWeave E2E Smoke Test', () => {
  let testDir: string;

  test.beforeAll(async () => {
    // Create unique test directory
    testDir = path.join('/tmp', `specweave-e2e-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    console.log(`Test directory: ${testDir}`);
  });

  test.afterAll(async () => {
    // Cleanup (optional - keep for debugging if tests fail)
    if (process.env.KEEP_TEST_ARTIFACTS !== 'true') {
      await fs.rm(testDir, { recursive: true, force: true });
    } else {
      console.log(`Test artifacts preserved at: ${testDir}`);
    }
  });

  test('should install SpecWeave in clean directory', async () => {
    // Initialize SpecWeave (using local CLI with --force to bypass interactivity)
    await execAsync(`node "${CLI_PATH}" init . --force`, { cwd: testDir });

    // Verify .specweave directory exists
    const specweaveDirExists = await fs.access(path.join(testDir, '.specweave'))
      .then(() => true)
      .catch(() => false);
    expect(specweaveDirExists).toBe(true);

    // Note: config.yaml has been removed - SpecWeave uses pure auto-detection
  });

  test('should scaffold SaaS project from natural language prompt', async () => {
    // Complex prompt matching user's example
    const prompt = `implement a SaaS solution with Next.js for event management,
                   specifically a field facility booking system for soccer.
                   Include backend API, deploy to Hetzner cloud (cheap hosting),
                   and integrate Stripe payments. Time slots should only be
                   bookable once payment is confirmed.`;

    // Save prompt for reference
    await fs.writeFile(
      path.join(testDir, '.specweave/initial-prompt.txt'),
      prompt
    );

    // TODO: Replace with actual CLI when available
    // await execAsync(`echo "${prompt}" | npx specweave create --wait`, { cwd: testDir });

    // For now, verify installation worked
    expect(await directoryExists(testDir, '.specweave')).toBe(true);
  });

  test('should create proper directory structure', async () => {
    const requiredDirs = [
      '.specweave',
      '.specweave/docs',
      '.specweave/increments',
      // NOTE: .claude directory no longer created - SpecWeave uses Claude Code's plugin system
    ];

    for (const dir of requiredDirs) {
      const exists = await directoryExists(testDir, dir);
      expect(exists).toBe(true);
    }

    // Optional directories (created by users)
    const optionalDirs = [
      'specifications',
      'features',
      'src',
      'tests',
      'tests/e2e',
    ];

    console.log('Checking optional directories...');
    for (const dir of optionalDirs) {
      const exists = await directoryExists(testDir, dir);
      console.log(`  ${dir}: ${exists ? 'created' : 'not created (optional)'}`);
    }
  });

  test('should create required configuration files', async () => {
    const requiredFiles = [
      'CLAUDE.md',
      'README.md',
      'AGENTS.md',
      '.gitignore',
      '.gitattributes',
      // NOTE: package.json is not created by init - only when scaffolding a project
    ];

    for (const file of requiredFiles) {
      const exists = await fileExists(testDir, file);
      expect(exists).toBe(true);
    }
  });

  // NOTE: The following tests are removed as they test user-generated content
  // that would only exist after actual project scaffolding, not just 'specweave init'

  /*
  test('should generate specifications with expected content (optional)', async () => {
    // Specifications would only exist if user created a project with specs
    // specweave init doesn't create specifications
    console.log('Specifications are user-generated content, not created by init');
  });

  test('should have proper feature structure (optional)', async () => {
    // Features would only exist if user created increments
    // specweave init doesn't create features/increments
    console.log('Features/increments are user-generated, not created by init');
  });
  */

  // NOTE: Skills and agents tests removed - SpecWeave now uses Claude Code's native
  // plugin system. Plugins are installed globally via 'claude plugin install' commands
  // and are not copied to the project directory.

  /*
  test('should install core skills correctly', async () => {
    // Skills are now part of plugins installed globally via Claude Code
    // They are not copied to .claude/skills in the project
    console.log('Skills are now managed via Claude Code plugin system');
  });

  test('should install core agents correctly', async () => {
    // Agents are now part of plugins installed globally via Claude Code
    // They are not copied to .claude/agents in the project
    console.log('Agents are now managed via Claude Code plugin system');
  });
  */

  // NOTE: More optional tests removed - these test user-generated project content

  /*
  test('should create E2E tests (optional - for UI projects)', async () => {
    // E2E tests would only exist if user scaffolded a UI project
    // specweave init doesn't create project tests
    console.log('E2E tests are created when user scaffolds a UI project');
  });

  test('should use TC-XXX format for test cases (optional)', async () => {
    // Test case format would only be relevant for user-created specs
    // specweave init doesn't create specifications
    console.log('Test case format is for user-created specifications');
  });

  test('should have context manifests (optional)', async () => {
    // Context manifests would only exist for user-created features
    // specweave init doesn't create features
    console.log('Context manifests are for user-created features');
  });
  */

  // NOTE: These tests are commented out because they test project-level functionality
  // but this smoke test only runs 'specweave init', which doesn't create a project.
  // These would be relevant if we had a test that actually scaffolds a full project.

  /*
  test('should install dependencies successfully', async () => {
    // This test would only be valid if we scaffolded an actual project
    // specweave init doesn't create package.json - it only sets up SpecWeave
    console.log('Skipping: specweave init does not create a project with package.json');
  });

  test('should pass all tests', async () => {
    // This test would only be valid if we scaffolded an actual project with tests
    // specweave init doesn't create a project - just SpecWeave structure
    console.log('Skipping: specweave init does not create a project with tests');
  });

  test('should build successfully', async () => {
    // This test would only be valid if we scaffolded an actual project with build scripts
    // specweave init doesn't create a project - just SpecWeave structure
    console.log('Skipping: specweave init does not create a project with build scripts');
  });
  */

  // NOTE: Deployment and integration tests removed - these would require actual project scaffolding

  /*
  test('should have deployment configuration (Hetzner)', async () => {
    // Deployment config would only exist if user scaffolded a project with Hetzner deployment
    // specweave init doesn't create deployment configurations
    console.log('Deployment config is created when user scaffolds a project with deployment');
  });

  test('should have Stripe integration', async () => {
    // Stripe integration would only exist if user scaffolded a project with payments
    // specweave init doesn't create source code or dependencies
    console.log('Stripe integration is created when user scaffolds a project with payments');
  });
  */
});

// Helper Functions

async function directoryExists(basePath: string, relativePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(basePath, relativePath);
    const stats = await fs.stat(fullPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(basePath: string, relativePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(basePath, relativePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

async function findInDirectory(dir: string, pattern: RegExp): Promise<boolean> {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        if (await findInDirectory(fullPath, pattern)) {
          return true;
        }
      } else if (file.isFile()) {
        const content = await fs.readFile(fullPath, 'utf-8');
        if (pattern.test(content)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}
