/**
 * ConfigMigrator Unit Tests
 *
 * Tests configuration migration from .env-only to split format
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ConfigMigrator } from '../../../../src/core/config/config-migrator.js';

describe('ConfigMigrator', () => {
  let testDir: string;
  let migrator: ConfigMigrator;
  let envPath: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), 'migrator-test-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave'), { recursive: true });
    envPath = path.join(testDir, '.env');
    migrator = new ConfigMigrator(testDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('classifyVariables()', () => {
    it('should classify tokens as secrets', () => {
      const vars = {
        JIRA_API_TOKEN: 'xyz123',
        GITHUB_TOKEN: 'ghp_abc',
        ADO_PAT: 'pat123'
      };

      const classified = migrator.classifyVariables(vars);

      expect(classified).toHaveLength(3);
      expect(classified.every(c => c.type === 'secret')).toBe(true);
      expect(classified[0].reason).toContain('token');
    });

    it('should classify emails as secrets', () => {
      const vars = {
        JIRA_EMAIL: 'user@example.com',
        GITHUB_EMAIL: 'dev@company.com'
      };

      const classified = migrator.classifyVariables(vars);

      expect(classified).toHaveLength(2);
      expect(classified.every(c => c.type === 'secret')).toBe(true);
      expect(classified[0].reason).toContain('Email');
    });

    it('should classify domains as config', () => {
      const vars = {
        JIRA_DOMAIN: 'company.atlassian.net',
        GITHUB_OWNER: 'my-org',
        ADO_ORGANIZATION: 'my-org'
      };

      const classified = migrator.classifyVariables(vars);

      expect(classified).toHaveLength(3);
      expect(classified.every(c => c.type === 'config')).toBe(true);
    });

    it('should classify strategies as config', () => {
      const vars = {
        JIRA_STRATEGY: 'project-per-team',
        JIRA_PROJECTS: 'PROJ1,PROJ2,PROJ3'
      };

      const classified = migrator.classifyVariables(vars);

      expect(classified).toHaveLength(2);
      expect(classified.every(c => c.type === 'config')).toBe(true);
    });

    it('should handle mixed variables correctly', () => {
      const vars = {
        JIRA_API_TOKEN: 'secret123',
        JIRA_EMAIL: 'user@example.com',
        JIRA_DOMAIN: 'company.atlassian.net',
        JIRA_STRATEGY: 'single-project',
        GITHUB_TOKEN: 'ghp_xyz',
        GITHUB_OWNER: 'my-org'
      };

      const classified = migrator.classifyVariables(vars);
      const secrets = classified.filter(c => c.type === 'secret');
      const configs = classified.filter(c => c.type === 'config');

      expect(secrets).toHaveLength(3); // TOKEN, TOKEN, EMAIL
      expect(configs).toHaveLength(3); // DOMAIN, STRATEGY, OWNER
    });
  });

  describe('needsMigration()', () => {
    it('should return false when .env does not exist', async () => {
      const needed = await migrator.needsMigration();
      expect(needed).toBe(false);
    });

    it('should return true when .env has config variables', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
JIRA_EMAIL=user@example.com
JIRA_DOMAIN=company.atlassian.net
JIRA_STRATEGY=project-per-team
      `.trim();

      await fs.writeFile(envPath, envContent);

      const needed = await migrator.needsMigration();
      expect(needed).toBe(true);
    });

    it('should return false when .env has only secrets', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
JIRA_EMAIL=user@example.com
GITHUB_TOKEN=ghp_abc
      `.trim();

      await fs.writeFile(envPath, envContent);

      const needed = await migrator.needsMigration();
      expect(needed).toBe(false);
    });

    it('should return false when already migrated (config.json exists with config)', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
JIRA_DOMAIN=company.atlassian.net
      `.trim();

      await fs.writeFile(envPath, envContent);

      const configPath = path.join(testDir, '.specweave', 'config.json');
      const config = {
        version: '2.0',
        issueTracker: {
          provider: 'jira',
          domain: 'company.atlassian.net'
        }
      };
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const needed = await migrator.needsMigration();
      expect(needed).toBe(false);
    });
  });

  describe('migrate() - dry run', () => {
    it('should preview migration without making changes', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
JIRA_EMAIL=user@example.com
JIRA_DOMAIN=company.atlassian.net
JIRA_STRATEGY=project-per-team
JIRA_PROJECTS=PROJ1,PROJ2
      `.trim();

      await fs.writeFile(envPath, envContent);

      const result = await migrator.preview();

      expect(result.success).toBe(true);
      expect(result.secretsCount).toBe(2); // TOKEN, EMAIL
      expect(result.configCount).toBe(3); // DOMAIN, STRATEGY, PROJECTS
      expect(result.classified).toHaveLength(5);

      // Verify no files were modified (dry run)
      const envAfter = await fs.readFile(envPath, 'utf-8');
      expect(envAfter).toBe(envContent);
    });
  });

  describe('migrate() - full migration', () => {
    it('should migrate Jira configuration successfully', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123abc456
JIRA_EMAIL=user@example.com
JIRA_DOMAIN=company.atlassian.net
JIRA_STRATEGY=project-per-team
JIRA_PROJECTS=PROJ1,PROJ2,PROJ3
      `.trim();

      await fs.writeFile(envPath, envContent);

      const result = await migrator.migrate({ backup: true });

      expect(result.success).toBe(true);
      expect(result.secretsCount).toBe(2);
      expect(result.configCount).toBe(3);
      expect(result.backupPath).toBeDefined();

      // Verify .env contains only secrets
      const newEnv = await fs.readFile(envPath, 'utf-8');
      expect(newEnv).toContain('JIRA_API_TOKEN=xyz123abc456');
      expect(newEnv).toContain('JIRA_EMAIL=user@example.com');
      expect(newEnv).not.toContain('JIRA_DOMAIN');
      expect(newEnv).not.toContain('JIRA_STRATEGY');

      // Verify config.json contains configuration
      const configPath = path.join(testDir, '.specweave', 'config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.issueTracker.provider).toBe('jira');
      expect(config.issueTracker.domain).toBe('company.atlassian.net');
      expect(config.issueTracker.strategy).toBe('project-per-team');
      expect(config.issueTracker.projects).toHaveLength(3);
      expect(config.issueTracker.projects[0].key).toBe('PROJ1');

      // Verify .env.example was created
      const examplePath = path.join(testDir, '.env.example');
      const exampleContent = await fs.readFile(examplePath, 'utf-8');
      expect(exampleContent).toContain('JIRA_API_TOKEN=your_jira_api_token_here');
      expect(exampleContent).toContain('JIRA_EMAIL=your_email@company.com');
      expect(exampleContent).toContain('config.json');

      // Verify backup was created
      if (result.backupPath) {
        const backupExists = await fs.access(result.backupPath).then(() => true).catch(() => false);
        expect(backupExists).toBe(true);
      }
    });

    it('should migrate GitHub configuration successfully', async () => {
      const envContent = `
GITHUB_TOKEN=ghp_abc123def456
GITHUB_OWNER=my-org
GITHUB_REPO=my-repo
      `.trim();

      await fs.writeFile(envPath, envContent);

      const result = await migrator.migrate({ backup: true });

      expect(result.success).toBe(true);
      expect(result.secretsCount).toBe(1);
      expect(result.configCount).toBe(2);

      const configPath = path.join(testDir, '.specweave', 'config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      expect(config.issueTracker.provider).toBe('github');
      expect(config.issueTracker.owner).toBe('my-org');
      expect(config.issueTracker.repo).toBe('my-repo');
    });

    it('should migrate Azure DevOps configuration successfully', async () => {
      const envContent = `
ADO_PAT=pat123xyz456
ADO_ORGANIZATION=my-org
ADO_PROJECT=my-project
      `.trim();

      await fs.writeFile(envPath, envContent);

      const result = await migrator.migrate({ backup: true });

      expect(result.success).toBe(true);
      expect(result.secretsCount).toBe(1);
      expect(result.configCount).toBe(2);

      const configPath = path.join(testDir, '.specweave', 'config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      expect(config.issueTracker.provider).toBe('ado');
      expect(config.issueTracker.organization_ado).toBe('my-org');
      expect(config.issueTracker.project).toBe('my-project');
    });

    it('should migrate sync configuration successfully', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
JIRA_EMAIL=user@example.com
SYNC_ENABLED=true
SYNC_DIRECTION=bidirectional
SYNC_AUTO=false
      `.trim();

      await fs.writeFile(envPath, envContent);

      const result = await migrator.migrate({ backup: true });

      expect(result.success).toBe(true);

      const configPath = path.join(testDir, '.specweave', 'config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      expect(config.sync.enabled).toBe(true);
      expect(config.sync.direction).toBe('bidirectional');
      expect(config.sync.autoSync).toBe(false);
    });

    it('should handle mixed providers correctly', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
JIRA_EMAIL=user@example.com
JIRA_DOMAIN=company.atlassian.net
GITHUB_TOKEN=ghp_abc
GITHUB_OWNER=my-org
      `.trim();

      await fs.writeFile(envPath, envContent);

      const result = await migrator.migrate({ backup: true });

      expect(result.success).toBe(true);
      expect(result.secretsCount).toBe(3);
      expect(result.configCount).toBe(2);

      // Config should have Jira config (appears first)
      const configPath = path.join(testDir, '.specweave', 'config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      expect(config.issueTracker.provider).toBe('jira');
      expect(config.issueTracker.domain).toBe('company.atlassian.net');
    });

    it('should warn when only secrets found', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
GITHUB_TOKEN=ghp_abc
      `.trim();

      await fs.writeFile(envPath, envContent);

      const result = await migrator.preview();

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('No configuration variables');
    });

    it('should skip migration when not needed', async () => {
      const result = await migrator.migrate({ force: false });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Migration not needed');
    });

    it('should force migration when requested', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
      `.trim();

      await fs.writeFile(envPath, envContent);

      const result = await migrator.migrate({ force: true });

      expect(result.success).toBe(true);
    });
  });

  describe('Placeholder generation', () => {
    it('should generate appropriate placeholders for .env.example', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
JIRA_EMAIL=user@example.com
GITHUB_TOKEN=ghp_abc
ADO_PAT=pat123
CUSTOM_SECRET_KEY=secret456
      `.trim();

      await fs.writeFile(envPath, envContent);

      await migrator.migrate({ backup: false, force: true });

      const examplePath = path.join(testDir, '.env.example');
      const exampleContent = await fs.readFile(examplePath, 'utf-8');

      expect(exampleContent).toContain('your_jira_api_token_here');
      expect(exampleContent).toContain('your_email@company.com');
      expect(exampleContent).toContain('your_github_token_here');
      expect(exampleContent).toContain('your_ado_pat_here');
    });
  });

  describe('Error handling', () => {
    it('should handle missing .env gracefully', async () => {
      const result = await migrator.migrate({ force: true });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle malformed .env gracefully', async () => {
      await fs.writeFile(envPath, 'INVALID ENV FORMAT');

      // parseEnvFile should handle this gracefully
      const result = await migrator.preview();

      // Should not throw, but may have warnings
      expect(result).toBeDefined();
    });
  });

  describe('Idempotency', () => {
    it('should be safe to run migration multiple times', async () => {
      const envContent = `
JIRA_API_TOKEN=xyz123
JIRA_DOMAIN=company.atlassian.net
      `.trim();

      await fs.writeFile(envPath, envContent);

      // First migration
      const result1 = await migrator.migrate({ backup: true, force: true });
      expect(result1.success).toBe(true);

      // Second migration (should detect already migrated)
      const migrator2 = new ConfigMigrator(testDir);
      const needed = await migrator2.needsMigration();
      expect(needed).toBe(false);
    });
  });
});
