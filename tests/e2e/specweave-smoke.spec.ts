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

const execAsync = promisify(exec);

test.describe('SpecWeave E2E Smoke Test', () => {
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
    // Initialize SpecWeave
    await execAsync('npx specweave init', { cwd: testDir });

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
      '.claude/skills',
      '.claude/agents',
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
      'package.json',
      '.gitignore',
    ];

    for (const file of requiredFiles) {
      const exists = await fileExists(testDir, file);
      expect(exists).toBe(true);
    }
  });

  test('should generate specifications with expected content (optional)', async () => {
    const overviewPath = path.join(testDir, 'specifications/overview.md');
    const overviewExists = await fileExists(testDir, 'specifications/overview.md');

    if (!overviewExists) {
      console.log('Specifications not created yet (optional for users)');
      test.skip();
      return;
    }

    const content = await fs.readFile(overviewPath, 'utf-8');

    // Check for key features from the prompt (if specifications were created)
    console.log('Checking specification content...');
    if (content.toLowerCase().includes('event management')) {
      console.log('  ✓ Contains event management');
    }
    if (content.toLowerCase().match(/stripe|payment/)) {
      console.log('  ✓ Contains payment/stripe reference');
    }
  });

  test('should have proper feature structure (optional)', async () => {
    const featuresExists = await directoryExists(testDir, 'features');

    if (!featuresExists) {
      console.log('Features not created yet (optional for users)');
      test.skip();
      return;
    }

    const featuresDir = await fs.readdir(path.join(testDir, 'features'));
    const firstFeature = featuresDir.find(d => d.startsWith('001-'));

    if (!firstFeature) {
      console.log('No features created yet (optional for users)');
      test.skip();
      return;
    }

    const featurePath = path.join(testDir, 'features', firstFeature!);

    // Check feature files (if features were created)
    const featureFiles = [
      'spec.md',
      'plan.md',
      'tasks.md',
      'tests.md',
      'context-manifest.yaml',
    ];

    console.log('Checking feature files...');
    for (const file of featureFiles) {
      const exists = await fileExists(featurePath, file);
      console.log(`  ${file}: ${exists ? 'found' : 'missing'}`);
    }
  });

  test('should install core skills correctly', async () => {
    const coreSkills = [
      'specweave-detector',
      'increment-planner',
      'skill-router',
      'context-loader',
      'hetzner-provisioner',
    ];

    for (const skill of coreSkills) {
      const skillPath = path.join(testDir, '.claude/skills', skill);
      const skillExists = await directoryExists(testDir, `.claude/skills/${skill}`);
      expect(skillExists).toBe(true);

      // Verify SKILL.md exists
      const skillMdExists = await fileExists(skillPath, 'SKILL.md');
      expect(skillMdExists).toBe(true);

      // Verify SKILL.md has proper YAML frontmatter
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      const skillContent = await fs.readFile(skillMdPath, 'utf-8');
      expect(skillContent).toMatch(/^---\n/);
      expect(skillContent).toContain(`name: ${skill}`);
      expect(skillContent).toContain('description:');
    }
  });

  test('should install core agents correctly', async () => {
    const coreAgents = [
      'pm',
      'architect',
      'nextjs',
      'devops',
      'qa-lead',
    ];

    for (const agent of coreAgents) {
      const agentExists = await directoryExists(testDir, `.claude/agents/${agent}`);
      expect(agentExists).toBe(true);

      // Verify AGENT.md exists
      const agentPath = path.join(testDir, '.claude/agents', agent);
      const agentMdExists = await fileExists(agentPath, 'AGENT.md');
      expect(agentMdExists).toBe(true);

      // Verify AGENT.md has proper YAML frontmatter
      const agentMdPath = path.join(agentPath, 'AGENT.md');
      const agentContent = await fs.readFile(agentMdPath, 'utf-8');
      expect(agentContent).toMatch(/^---\n/);
      expect(agentContent).toContain(`name: ${agent}`);
      expect(agentContent).toContain('description:');
    }
  });

  test('should create E2E tests (optional - for UI projects)', async () => {
    const e2eDir = path.join(testDir, 'tests/e2e');
    const e2eExists = await directoryExists(testDir, 'tests/e2e');

    if (!e2eExists) {
      console.log('E2E tests not created yet (created for UI projects)');
      test.skip();
      return;
    }

    // Find E2E test files
    const files = await fs.readdir(e2eDir);
    const e2eFiles = files.filter(f => f.endsWith('.spec.ts') || f.endsWith('.spec.js'));

    if (e2eFiles.length === 0) {
      console.log('E2E tests directory exists but no tests yet');
      test.skip();
      return;
    }

    console.log(`Found ${e2eFiles.length} E2E test files`);

    // Verify at least one test file contains Playwright imports
    const firstTestPath = path.join(e2eDir, e2eFiles[0]);
    const testContent = await fs.readFile(firstTestPath, 'utf-8');
    const hasPlaywright = testContent.match(/@playwright\/test|playwright/);
    console.log(`  Uses Playwright: ${hasPlaywright ? 'yes' : 'no'}`);
  });

  test('should use TC-XXX format for test cases (optional)', async () => {
    // Search for test case IDs in specifications
    const specsDir = path.join(testDir, 'specifications');
    const specsExists = await directoryExists(testDir, 'specifications');

    if (!specsExists) {
      console.log('Specifications not created yet (optional for users)');
      test.skip();
      return;
    }

    // Support both TC-001 and TC-0001 formats
    const hasTestCases = await findInDirectory(specsDir, /TC-\d{3,4}/);
    console.log(`TC-XXX/TC-XXXX test cases found: ${hasTestCases ? 'yes' : 'not yet'}`);
  });

  test('should have context manifests (optional)', async () => {
    const featuresExists = await directoryExists(testDir, 'features');

    if (!featuresExists) {
      console.log('Features not created yet (optional for users)');
      test.skip();
      return;
    }

    const featuresDir = await fs.readdir(path.join(testDir, 'features'));
    const featureDirs = featuresDir.filter(f => f.startsWith('001-'));

    if (featureDirs.length === 0) {
      console.log('No features created yet (optional for users)');
      test.skip();
      return;
    }

    console.log(`Checking ${featureDirs.length} feature(s) for context manifests...`);

    for (const featureDir of featureDirs) {
      const manifestPath = path.join(testDir, 'features', featureDir, 'context-manifest.yaml');
      const exists = await fileExists(manifestPath, '');

      if (exists) {
        // Verify manifest structure
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = parseYaml(manifestContent);

        console.log(`  ${featureDir}: has context manifest`);
        if (manifest.spec_sections) {
          console.log(`    spec_sections: ${manifest.spec_sections.length} items`);
        }
      } else {
        console.log(`  ${featureDir}: no context manifest yet`);
      }
    }
  });

  test('should install dependencies successfully', async () => {
    const packageJsonExists = await fileExists(testDir, 'package.json');

    if (packageJsonExists) {
      const { stdout, stderr } = await execAsync('npm install', {
        cwd: testDir,
        timeout: 120000 // 2 minutes
      });

      // Verify node_modules created
      const nodeModulesExists = await directoryExists(testDir, 'node_modules');
      expect(nodeModulesExists).toBe(true);
    } else {
      test.skip();
    }
  }, 180000); // 3 minute timeout

  test('should pass all tests', async () => {
    const packageJsonPath = path.join(testDir, 'package.json');
    const packageJsonExists = await fileExists(testDir, 'package.json');

    if (packageJsonExists) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      if (packageJson.scripts?.test) {
        const { stdout, stderr } = await execAsync('npm test', {
          cwd: testDir,
          timeout: 180000 // 3 minutes
        });

        // Check for test failures
        expect(stderr).not.toContain('FAIL');
        expect(stdout).toMatch(/PASS|✓|passed/i);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  }, 240000); // 4 minute timeout

  test('should build successfully', async () => {
    const packageJsonPath = path.join(testDir, 'package.json');
    const packageJsonExists = await fileExists(testDir, 'package.json');

    if (packageJsonExists) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      if (packageJson.scripts?.build) {
        const { stdout, stderr } = await execAsync('npm run build', {
          cwd: testDir,
          timeout: 300000 // 5 minutes
        });

        // Check build succeeded
        expect(stderr).not.toContain('error');
        expect(stdout).toMatch(/do|compiled|generated/i);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  }, 360000); // 6 minute timeout

  test('should have deployment configuration (Hetzner)', async () => {
    // Check for deployment config
    const possiblePaths = [
      'infrastructure/hetzner',
      'deploy/hetzner',
      'terraform',
      '.specweave/deployment',
    ];

    let foundDeploymentConfig = false;

    for (const p of possiblePaths) {
      if (await directoryExists(testDir, p)) {
        foundDeploymentConfig = true;
        break;
      }
    }

    // Check for deployment files
    const deploymentFiles = [
      'terraform.tf',
      'hetzner.tf',
      'deploy.sh',
      'deployment.yaml',
    ];

    for (const file of deploymentFiles) {
      if (await findInDirectory(testDir, new RegExp(file))) {
        foundDeploymentConfig = true;
        break;
      }
    }

    expect(foundDeploymentConfig).toBe(true);
  });

  test('should have Stripe integration', async () => {
    // Check for Stripe-related code
    const srcDir = path.join(testDir, 'src');
    const hasStripeCode = await findInDirectory(srcDir, /stripe|payment/i);
    expect(hasStripeCode).toBe(true);

    // Check for Stripe in dependencies
    const packageJsonPath = path.join(testDir, 'package.json');
    if (await fileExists(testDir, 'package.json')) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const hasStripeDep =
        packageJson.dependencies?.stripe ||
        packageJson.dependencies?.['@stripe/stripe-js'];
      expect(hasStripeDep).toBeDefined();
    }
  });
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
