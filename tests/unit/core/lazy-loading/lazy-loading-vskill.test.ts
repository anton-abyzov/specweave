/**
 * Tests for lazy loading vskill integration
 *
 * TC-020: Detector uses vskill for installation
 * TC-021: Fast-path skip for already-installed plugins
 *
 * @module tests/unit/core/lazy-loading/lazy-loading-vskill
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- hoisted mocks (ESM-safe) ----

const { mockDetectClaudeCli, mockGetCleanEnv } = vi.hoisted(() => ({
  mockDetectClaudeCli: vi.fn(),
  mockGetCleanEnv: vi.fn(() => ({})),
}));

const mockSpawnSync = vi.hoisted(() => vi.fn());

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('../../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mockDetectClaudeCli,
  getCleanEnv: mockGetCleanEnv,
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../../src/core/types/plugin-scope.js', () => ({
  getPluginScope: vi.fn(() => 'project'),
  getScopeArgs: vi.fn(() => ['--scope', 'project']),
}));

vi.mock('child_process', () => ({
  spawnSync: mockSpawnSync,
}));

vi.mock('fs', () => ({
  ...mockFs,
  default: mockFs,
}));

// ---- import under test (AFTER mocks) ----

import {
  installPluginViaCli,
  installPluginsViaCli,
  clearCliCache,
} from '../../../../src/core/lazy-loading/llm-plugin-detector.js';

// ---- helpers ----

function setupCliAvailable() {
  mockDetectClaudeCli.mockReturnValue({
    available: true,
    commandExists: true,
    commandPath: '/usr/local/bin/claude',
    pluginCommandsWork: true,
    version: '2.0.0',
  });
}

function mockVskillLock(skills: Record<string, any>) {
  mockFs.existsSync.mockImplementation((p: any) => {
    if (String(p).includes('vskill.lock')) return true;
    return false;
  });
  mockFs.readFileSync.mockImplementation((p: any) => {
    if (String(p).includes('vskill.lock')) {
      return JSON.stringify({
        version: 1,
        agents: ['claude-code'],
        skills,
        createdAt: '2026-02-17T00:00:00Z',
        updatedAt: '2026-02-17T00:00:00Z',
      });
    }
    return '';
  });
}

// ---- tests ----

describe('lazy loading vskill integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCliCache();
  });

  // ============================================================
  // TC-020: Detector uses vskill for installation
  // ============================================================
  describe('TC-020: Detector uses vskill for installation', () => {
    it('should invoke vskill add instead of claude plugin install', async () => {
      setupCliAvailable();

      // Mock spawnSync to simulate successful vskill execution
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'Installed sw-frontend to 1 agent',
        stderr: '',
        error: null,
      });

      const result = await installPluginViaCli('sw-frontend');

      expect(result.success).toBe(true);
      expect(result.plugin).toBe('sw-frontend');

      // CRITICAL: Verify that vskill was invoked, NOT claude plugin install
      const allCalls = mockSpawnSync.mock.calls;
      const claudePluginCalls = allCalls.filter(
        (call: any[]) => {
          const cmd = String(call[0]);
          const args = call[1] || [];
          return cmd.includes('claude') && args.includes('plugin') && args.includes('install');
        }
      );

      // After migration: ZERO calls to claude plugin install
      expect(claudePluginCalls).toHaveLength(0);

      // Instead, should have calls that reference vskill
      const vskillCalls = allCalls.filter(
        (call: any[]) => {
          const cmd = String(call[0]);
          const args = (call[1] || []).join(' ');
          return cmd.includes('vskill') || args.includes('vskill');
        }
      );
      expect(vskillCalls.length).toBeGreaterThan(0);
    });

    it('should use vskill add with correct plugin name for sw plugins', async () => {
      setupCliAvailable();

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'Installed sw-frontend to 1 agent',
        stderr: '',
        error: null,
      });

      await installPluginViaCli('sw-frontend');

      // Verify vskill add was called with --plugin sw-frontend
      const allCalls = mockSpawnSync.mock.calls;
      const addCalls = allCalls.filter((call: any[]) => {
        const args = (call[1] || []).join(' ');
        return args.includes('add') && args.includes('sw-frontend');
      });
      expect(addCalls.length).toBeGreaterThan(0);
    });

    it('should handle vskill add failure gracefully', async () => {
      setupCliAvailable();

      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: '',
        stderr: 'Plugin "sw-frontend" not found in marketplace.json',
        error: null,
      });

      const result = await installPluginViaCli('sw-frontend');

      expect(result.success).toBe(false);
      expect(result.plugin).toBe('sw-frontend');
      expect(result.error).toBeDefined();
    });

    it('should install multiple plugins via vskill', async () => {
      setupCliAvailable();

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'Installed plugin to 1 agent',
        stderr: '',
        error: null,
      });

      const results = await installPluginsViaCli(['sw-frontend', 'sw-backend']);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      // Verify each plugin triggered a vskill call (not claude plugin install)
      const allCalls = mockSpawnSync.mock.calls;
      const claudePluginCalls = allCalls.filter(
        (call: any[]) => {
          const cmd = String(call[0]);
          const args = call[1] || [];
          return cmd.includes('claude') && args.includes('plugin') && args.includes('install');
        }
      );
      expect(claudePluginCalls).toHaveLength(0);
    });
  });

  // ============================================================
  // TC-021: Fast-path skip for already-installed plugins
  // ============================================================
  describe('TC-021: Fast-path skip for already-installed plugins', () => {
    it('should skip installation when plugin is in vskill.lock with matching hash', async () => {
      setupCliAvailable();

      // Mock vskill.lock with sw-frontend already installed
      mockVskillLock({
        'sw-frontend': {
          version: '1.0.272',
          sha: 'abc123def456',
          tier: 'SCANNED',
          installedAt: '2026-02-17T00:00:00Z',
          source: 'local:specweave',
        },
      });

      const result = await installPluginViaCli('sw-frontend');

      // Should succeed without invoking vskill
      expect(result.success).toBe(true);
      expect(result.alreadyInstalled).toBe(true);

      // CRITICAL: NO vskill invocation when lockfile has matching entry
      expect(mockSpawnSync).not.toHaveBeenCalled();
    });

    it('should install when plugin is NOT in vskill.lock', async () => {
      setupCliAvailable();

      // Mock vskill.lock WITHOUT sw-frontend
      mockVskillLock({});

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'Installed sw-frontend to 1 agent',
        stderr: '',
        error: null,
      });

      const result = await installPluginViaCli('sw-frontend');

      expect(result.success).toBe(true);

      // When NOT in lockfile, vskill SHOULD be invoked
      expect(mockSpawnSync).toHaveBeenCalled();
    });

    it('should install when vskill.lock does not exist', async () => {
      setupCliAvailable();

      // Mock fs: no vskill.lock
      mockFs.existsSync.mockImplementation((p: any) => {
        if (String(p).includes('vskill.lock')) return false;
        return false;
      });

      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'Installed sw-frontend to 1 agent',
        stderr: '',
        error: null,
      });

      const result = await installPluginViaCli('sw-frontend');

      expect(result.success).toBe(true);

      // Without lockfile, vskill should be invoked to install
      expect(mockSpawnSync).toHaveBeenCalled();
    });

    it('should skip entirely for multiple plugins when all are in lockfile', async () => {
      setupCliAvailable();

      // Mock vskill.lock with both plugins
      mockVskillLock({
        'sw-frontend': {
          version: '1.0.272',
          sha: 'abc123',
          tier: 'SCANNED',
          installedAt: '2026-02-17T00:00:00Z',
          source: 'local:specweave',
        },
        'sw-backend': {
          version: '1.0.272',
          sha: 'def456',
          tier: 'SCANNED',
          installedAt: '2026-02-17T00:00:00Z',
          source: 'local:specweave',
        },
      });

      const results = await installPluginsViaCli(['sw-frontend', 'sw-backend']);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].alreadyInstalled).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[1].alreadyInstalled).toBe(true);

      // NO vskill invocation when all plugins are in lockfile
      expect(mockSpawnSync).not.toHaveBeenCalled();
    });
  });
});
