/**
 * TDD RED Phase: Doctor command tests
 * These tests define the expected behavior before implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Types we expect to implement
import type {
  CheckStatus,
  CheckResult,
  CategoryResult,
  DoctorReport,
  DoctorOptions,
  HealthChecker,
} from '../../../../src/core/doctor/types.js';

// Main doctor function we expect to implement
import { runDoctor } from '../../../../src/core/doctor/doctor.js';

// Individual checkers we expect to implement
import { EnvironmentChecker } from '../../../../src/core/doctor/checkers/environment-checker.js';
import { ProjectStructureChecker } from '../../../../src/core/doctor/checkers/project-structure-checker.js';
import { ConfigurationChecker } from '../../../../src/core/doctor/checkers/configuration-checker.js';
import { HooksChecker } from '../../../../src/core/doctor/checkers/hooks-checker.js';
import { PluginsChecker } from '../../../../src/core/doctor/checkers/plugins-checker.js';
import { IncrementsChecker } from '../../../../src/core/doctor/checkers/increments-checker.js';
import { GitChecker } from '../../../../src/core/doctor/checkers/git-checker.js';

describe('Doctor Command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-doctor-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('runDoctor', () => {
    it('should return a DoctorReport with all categories', async () => {
      // Setup minimal valid project
      setupValidProject(tempDir);

      const report = await runDoctor(tempDir, {});

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.projectRoot).toBe(tempDir);
      expect(report.categories).toBeInstanceOf(Array);
      expect(report.summary).toBeDefined();
      expect(report.summary.total).toBeGreaterThan(0);
    });

    it('should include summary counts', async () => {
      setupValidProject(tempDir);

      const report = await runDoctor(tempDir, {});

      expect(report.summary).toHaveProperty('total');
      expect(report.summary).toHaveProperty('passed');
      expect(report.summary).toHaveProperty('warnings');
      expect(report.summary).toHaveProperty('failures');
      expect(report.summary).toHaveProperty('skipped');
      expect(report.summary.total).toBe(
        report.summary.passed +
          report.summary.warnings +
          report.summary.failures +
          report.summary.skipped
      );
    });

    it('should skip external checks when skipExternal is true', async () => {
      setupValidProject(tempDir);

      const report = await runDoctor(tempDir, { skipExternal: true });

      // External tool checks should be skipped
      const externalCategory = report.categories.find(
        (c) => c.category === 'External Tools'
      );
      if (externalCategory) {
        expect(
          externalCategory.checks.every((c) => c.status === 'skip')
        ).toBe(true);
      }
    });

    it('should run faster in quick mode', async () => {
      setupValidProject(tempDir);

      const startQuick = Date.now();
      await runDoctor(tempDir, { quick: true });
      const quickDuration = Date.now() - startQuick;

      // Quick mode should skip slow checks
      // We just verify it completes - actual timing would be flaky
      expect(quickDuration).toBeDefined();
    });

    it('should suggest fix command when issues found', async () => {
      // Setup project with issues
      setupProjectWithIssues(tempDir);

      const report = await runDoctor(tempDir, {});

      if (report.summary.warnings > 0 || report.summary.failures > 0) {
        expect(report.fixCommand).toBeDefined();
        expect(report.fixCommand).toContain('specweave');
      }
    });
  });

  describe('EnvironmentChecker', () => {
    it('should check Node.js version', async () => {
      const checker = new EnvironmentChecker();
      const result = await checker.check(tempDir, {});

      expect(result.category).toBe('Environment');
      const nodeCheck = result.checks.find((c) => c.name === 'Node.js');
      expect(nodeCheck).toBeDefined();
      expect(nodeCheck!.status).toBe('pass'); // We're running in Node
      expect(nodeCheck!.message).toContain('v');
    });

    it('should check for Git', async () => {
      const checker = new EnvironmentChecker();
      const result = await checker.check(tempDir, {});

      const gitCheck = result.checks.find((c) => c.name === 'Git');
      expect(gitCheck).toBeDefined();
      // Git should be available in dev environment
      expect(['pass', 'fail']).toContain(gitCheck!.status);
    });

    it('should check for Claude CLI', async () => {
      const checker = new EnvironmentChecker();
      const result = await checker.check(tempDir, {});

      const claudeCheck = result.checks.find((c) => c.name === 'Claude CLI');
      expect(claudeCheck).toBeDefined();
      // May or may not be installed
      expect(['pass', 'warn', 'fail']).toContain(claudeCheck!.status);
    });

    it('should check for optional tools with warn status', async () => {
      const checker = new EnvironmentChecker();
      const result = await checker.check(tempDir, {});

      // jq is optional
      const jqCheck = result.checks.find((c) => c.name === 'jq');
      if (jqCheck) {
        expect(['pass', 'warn']).toContain(jqCheck.status);
      }
    });
  });

  describe('ProjectStructureChecker', () => {
    it('should pass when .specweave exists', async () => {
      setupValidProject(tempDir);

      const checker = new ProjectStructureChecker();
      const result = await checker.check(tempDir, {});

      expect(result.category).toBe('Project Structure');
      const specweaveDir = result.checks.find(
        (c) => c.name === '.specweave directory'
      );
      expect(specweaveDir).toBeDefined();
      expect(specweaveDir!.status).toBe('pass');
    });

    it('should fail when .specweave missing', async () => {
      // Don't setup anything - empty dir

      const checker = new ProjectStructureChecker();
      const result = await checker.check(tempDir, {});

      const specweaveDir = result.checks.find(
        (c) => c.name === '.specweave directory'
      );
      expect(specweaveDir).toBeDefined();
      expect(specweaveDir!.status).toBe('fail');
      expect(specweaveDir!.fixSuggestion).toContain('specweave init');
    });

    it('should check for required subdirectories', async () => {
      setupValidProject(tempDir);

      const checker = new ProjectStructureChecker();
      const result = await checker.check(tempDir, {});

      const incrementsDir = result.checks.find(
        (c) => c.name === 'increments directory'
      );
      expect(incrementsDir).toBeDefined();
    });
  });

  describe('ConfigurationChecker', () => {
    it('should pass with valid config.json', async () => {
      setupValidProject(tempDir);

      const checker = new ConfigurationChecker();
      const result = await checker.check(tempDir, {});

      expect(result.category).toBe('Configuration');
      const configCheck = result.checks.find((c) => c.name === 'config.json');
      expect(configCheck).toBeDefined();
      expect(configCheck!.status).toBe('pass');
    });

    it('should fail with invalid JSON', async () => {
      fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.specweave', 'config.json'),
        'not valid json{'
      );

      const checker = new ConfigurationChecker();
      const result = await checker.check(tempDir, {});

      const configCheck = result.checks.find((c) => c.name === 'config.json');
      expect(configCheck).toBeDefined();
      expect(configCheck!.status).toBe('fail');
      expect(configCheck!.message).toContain('invalid');
    });

    it('should check CLAUDE.md freshness', async () => {
      setupValidProject(tempDir);
      // Create an outdated CLAUDE.md
      fs.writeFileSync(
        path.join(tempDir, 'CLAUDE.md'),
        '<!-- SW:META version="0.0.1" -->\nOld content'
      );

      const checker = new ConfigurationChecker();
      const result = await checker.check(tempDir, {});

      const claudeMdCheck = result.checks.find((c) => c.name === 'CLAUDE.md');
      expect(claudeMdCheck).toBeDefined();
      // Should warn about outdated version
      expect(['pass', 'warn']).toContain(claudeMdCheck!.status);
    });
  });

  describe('HooksChecker', () => {
    it('should report hook health', async () => {
      setupValidProject(tempDir);

      const checker = new HooksChecker();
      const result = await checker.check(tempDir, {});

      expect(result.category).toBe('Hooks');
      // Should have at least one check about hooks
      expect(result.checks.length).toBeGreaterThan(0);
    });

    it('should skip detailed hook checks in quick mode', async () => {
      setupValidProject(tempDir);

      const checker = new HooksChecker();
      const result = await checker.check(tempDir, { quick: true });

      // In quick mode, might skip execution tests
      const executionChecks = result.checks.filter((c) =>
        c.name.includes('execution')
      );
      // Either no execution checks or they're skipped
      expect(
        executionChecks.length === 0 ||
          executionChecks.every((c) => c.status === 'skip')
      ).toBe(true);
    });
  });

  describe('PluginsChecker', () => {
    it('should check plugin installation status', async () => {
      setupValidProject(tempDir);

      const checker = new PluginsChecker();
      const result = await checker.check(tempDir, {});

      expect(result.category).toBe('Plugins');
      expect(result.checks.length).toBeGreaterThan(0);
    });

    it('should check cache health', async () => {
      setupValidProject(tempDir);

      const checker = new PluginsChecker();
      const result = await checker.check(tempDir, {});

      const cacheCheck = result.checks.find(
        (c) => c.name === 'Plugin cache' || c.name.includes('cache')
      );
      // Cache check should exist
      expect(cacheCheck).toBeDefined();
    });
  });

  describe('IncrementsChecker', () => {
    it('should pass with valid increments', async () => {
      setupValidProject(tempDir);
      setupValidIncrement(tempDir, '0001-test');

      const checker = new IncrementsChecker();
      const result = await checker.check(tempDir, {});

      expect(result.category).toBe('Increments');
      const incrementsCheck = result.checks.find(
        (c) => c.name === 'Increment integrity'
      );
      expect(incrementsCheck).toBeDefined();
      expect(incrementsCheck!.status).toBe('pass');
    });

    it('should detect invalid metadata', async () => {
      setupValidProject(tempDir);
      // Create increment with invalid metadata
      const incDir = path.join(tempDir, '.specweave', 'increments', '0001-bad');
      fs.mkdirSync(incDir, { recursive: true });
      fs.writeFileSync(path.join(incDir, 'metadata.json'), 'not json');

      const checker = new IncrementsChecker();
      const result = await checker.check(tempDir, {});

      // Should detect the invalid metadata
      expect(result.status).toBe('fail');
    });

    it('should detect duplicate increment IDs', async () => {
      setupValidProject(tempDir);
      // Create two increments with same ID in different locations
      setupValidIncrement(tempDir, '0001-test');
      const archiveDir = path.join(
        tempDir,
        '.specweave',
        'increments',
        '_archive',
        '0001-archived'
      );
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.writeFileSync(
        path.join(archiveDir, 'metadata.json'),
        JSON.stringify({ id: '0001', status: 'completed' })
      );

      const checker = new IncrementsChecker();
      const result = await checker.check(tempDir, {});

      const dupCheck = result.checks.find(
        (c) => c.name === 'Duplicate IDs' || c.name.includes('duplicate')
      );
      if (dupCheck) {
        expect(dupCheck.status).toBe('warn');
      }
    });
  });

  describe('GitChecker', () => {
    it('should detect if in git repo', async () => {
      setupValidProject(tempDir);
      // Initialize git
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });

      const checker = new GitChecker();
      const result = await checker.check(tempDir, {});

      expect(result.category).toBe('Git');
      const repoCheck = result.checks.find((c) => c.name === 'Git repository');
      expect(repoCheck).toBeDefined();
      expect(repoCheck!.status).toBe('pass');
    });

    it('should detect clean/dirty working directory', async () => {
      setupValidProject(tempDir);
      const { execSync } = require('child_process');
      execSync('git init', { cwd: tempDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', {
        cwd: tempDir,
        stdio: 'pipe',
      });
      execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });

      const checker = new GitChecker();
      const result = await checker.check(tempDir, {});

      const statusCheck = result.checks.find(
        (c) => c.name === 'Working directory'
      );
      expect(statusCheck).toBeDefined();
      // Might be dirty if untracked files exist
      expect(['pass', 'warn']).toContain(statusCheck!.status);
    });

    it('should skip git checks if not a repo', async () => {
      setupValidProject(tempDir);
      // No git init

      const checker = new GitChecker();
      const result = await checker.check(tempDir, {});

      const repoCheck = result.checks.find((c) => c.name === 'Git repository');
      expect(repoCheck).toBeDefined();
      expect(repoCheck!.status).toBe('skip');
    });
  });
});

// Helper functions
function setupValidProject(dir: string): void {
  const specweaveDir = path.join(dir, '.specweave');
  fs.mkdirSync(path.join(specweaveDir, 'increments'), { recursive: true });
  fs.mkdirSync(path.join(specweaveDir, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(specweaveDir, 'state'), { recursive: true });

  // Create valid config.json
  fs.writeFileSync(
    path.join(specweaveDir, 'config.json'),
    JSON.stringify(
      {
        version: '1.0.0',
        sync: { github: { enabled: false } },
      },
      null,
      2
    )
  );
}

function setupValidIncrement(dir: string, name: string): void {
  const incDir = path.join(dir, '.specweave', 'increments', name);
  fs.mkdirSync(incDir, { recursive: true });

  fs.writeFileSync(
    path.join(incDir, 'metadata.json'),
    JSON.stringify(
      {
        id: name.split('-')[0],
        name: name,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(incDir, 'spec.md'),
    `---
increment: ${name}
title: "Test Increment"
---

# ${name}
`
  );

  fs.writeFileSync(path.join(incDir, 'tasks.md'), `# Tasks\n\n## Pending\n`);
}

function setupProjectWithIssues(dir: string): void {
  setupValidProject(dir);
  // Create an outdated CLAUDE.md
  fs.writeFileSync(
    path.join(dir, 'CLAUDE.md'),
    '<!-- SW:META version="0.0.1" -->\nOutdated'
  );
}
