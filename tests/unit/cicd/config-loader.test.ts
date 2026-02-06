/**
 * CI/CD Config Loader Tests (0188 T-009)
 *
 * Tests that the cicd config-loader reads from unified config
 * (via ConfigManager) instead of standalone JSON parsing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig } from '../../../src/core/cicd/config-loader.js';

describe('CI/CD Config Loader - Unified Config Integration (0188 T-009)', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `cicd-config-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.specweave'), { recursive: true });

    // Set required env vars so loadConfig doesn't throw on validation
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_OWNER = 'test-owner';
    process.env.GITHUB_REPO = 'test-repo';
  });

  afterEach(async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;
    delete process.env.CICD_POLL_INTERVAL;
    vi.restoreAllMocks();
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should read monitoring.pollInterval from unified cicd config section', async () => {
    const configPath = path.join(testDir, '.specweave', 'config.json');

    // Remove env vars so config file values aren't overridden
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;

    // Write config with legacy cicd.github (credentials) + unified monitoring
    await fs.writeFile(configPath, JSON.stringify({
      version: '2.0',
      cicd: {
        github: {
          token: 'test-token',
          owner: 'test-owner',
          repo: 'test-repo',
        },
        monitoring: {
          pollInterval: 120000,
          autoNotify: false,
        },
        pushStrategy: 'pr-based',
        autoFix: {
          enabled: false,
          maxRetries: 2,
          allowedBranches: ['main'],
        },
      },
    }, null, 2));

    const config = await loadConfig(testDir);

    // Config file monitoring should be used since no env vars override it
    expect(config.monitor.pollInterval).toBe(120000);
    expect(config.autoNotify).toBe(false);
  });

  it('should return unified cicd fields (pushStrategy, autoFix) on config result', async () => {
    const configPath = path.join(testDir, '.specweave', 'config.json');
    await fs.writeFile(configPath, JSON.stringify({
      version: '2.0',
      cicd: {
        pushStrategy: 'pr-based',
        autoFix: {
          enabled: false,
          maxRetries: 2,
          allowedBranches: ['main'],
        },
      },
    }, null, 2));

    const config = await loadConfig(testDir) as any;

    // T-009 RED: loadConfig currently returns MonitorServiceConfig
    // which has no pushStrategy or autoFix fields.
    // After T-010, the returned config should include these from unified config.
    expect(config.pushStrategy).toBe('pr-based');
    expect(config.autoFix).toBeDefined();
    expect(config.autoFix.enabled).toBe(false);
  });
});
