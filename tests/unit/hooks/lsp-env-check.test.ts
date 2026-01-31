/**
 * LSP Environment Check Tests
 *
 * Tests the ENABLE_LSP_TOOL environment variable check in lsp-check.sh
 * Verifies that:
 * 1. lspEnvReady is false when ENABLE_LSP_TOOL is not set
 * 2. lspEnvReady is true when ENABLE_LSP_TOOL is set
 *
 * This addresses the Gap #2 fix verification (v1.0.195)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('LSP Environment Check (lsp-check.sh)', () => {
  let testDir: string;
  let scriptPath: string;

  beforeEach(() => {
    // Create a temporary test directory with .specweave structure
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lsp-check-test-'));
    fs.mkdirSync(path.join(testDir, '.specweave'), { recursive: true });
    fs.mkdirSync(path.join(testDir, '.specweave', 'state'), { recursive: true });

    // Path to the actual lsp-check.sh script
    scriptPath = path.join(process.cwd(), 'plugins', 'specweave', 'scripts', 'lsp-check.sh');
  });

  afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should set lspEnvReady to false when ENABLE_LSP_TOOL is not set', () => {
    // Run the script WITHOUT ENABLE_LSP_TOOL
    const env = { ...process.env };
    delete env.ENABLE_LSP_TOOL;

    const result = spawnSync('bash', [scriptPath, testDir], {
      encoding: 'utf8',
      env,
      timeout: 10000,
    });

    // Script should exit successfully
    expect(result.status).toBe(0);

    // Read the output state file
    const stateFile = path.join(testDir, '.specweave', 'state', 'lsp-check.json');
    expect(fs.existsSync(stateFile)).toBe(true);

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    // lspEnvReady should be false when env var not set
    expect(state.lspEnvReady).toBe(false);
    expect(state.lspMarketplace).toBe('claude-code-lsps');
  });

  it('should set lspEnvReady to true when ENABLE_LSP_TOOL is set', () => {
    // Run the script WITH ENABLE_LSP_TOOL=1
    const env = { ...process.env, ENABLE_LSP_TOOL: '1' };

    const result = spawnSync('bash', [scriptPath, testDir], {
      encoding: 'utf8',
      env,
      timeout: 10000,
    });

    // Script should exit successfully
    expect(result.status).toBe(0);

    // Read the output state file
    const stateFile = path.join(testDir, '.specweave', 'state', 'lsp-check.json');
    expect(fs.existsSync(stateFile)).toBe(true);

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    // lspEnvReady should be true when env var is set
    expect(state.lspEnvReady).toBe(true);
    expect(state.lspMarketplace).toBe('claude-code-lsps');
  });

  it('should use boostvolt/claude-code-lsps marketplace (not claude-plugins-official)', () => {
    const result = spawnSync('bash', [scriptPath, testDir], {
      encoding: 'utf8',
      timeout: 10000,
    });

    expect(result.status).toBe(0);

    const stateFile = path.join(testDir, '.specweave', 'state', 'lsp-check.json');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    // Should use the working marketplace, not the broken official one
    expect(state.lspMarketplace).toBe('claude-code-lsps');
    expect(state.lspMarketplace).not.toBe('claude-plugins-official');
  });

  it('should exit cleanly for non-specweave projects', () => {
    // Create a directory without .specweave
    const nonSpecweaveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'non-specweave-'));

    try {
      const result = spawnSync('bash', [scriptPath, nonSpecweaveDir], {
        encoding: 'utf8',
        timeout: 10000,
      });

      // Should exit with 0 (not crash)
      expect(result.status).toBe(0);

      // Should NOT create state file in non-specweave project
      const stateFile = path.join(nonSpecweaveDir, '.specweave', 'state', 'lsp-check.json');
      expect(fs.existsSync(stateFile)).toBe(false);
    } finally {
      fs.rmSync(nonSpecweaveDir, { recursive: true, force: true });
    }
  });
});
