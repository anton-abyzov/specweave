/**
 * Tests for lazy loading vskill integration
 *
 * v1.0.535: installPluginViaCli and installPluginsViaCli are now no-ops.
 * All plugins are pre-installed at init time via direct file copy.
 * These tests verify the no-op behavior.
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

const mockGetProjectRoot = vi.hoisted(() => vi.fn(() => '/tmp/test-project'));

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

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  getProjectRoot: mockGetProjectRoot,
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

// ---- tests ----

describe('lazy loading vskill integration (v1.0.535: no-op)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCliCache();
  });

  describe('installPluginViaCli — no-op', () => {
    it('should return success with alreadyInstalled for any plugin', async () => {
      const result = await installPluginViaCli('mobile');

      expect(result.success).toBe(true);
      expect(result.plugin).toBe('mobile');
      expect(result.alreadyInstalled).toBe(true);
    });

    it('should NOT invoke any CLI commands', async () => {
      await installPluginViaCli('mobile');

      expect(mockSpawnSync).not.toHaveBeenCalled();
    });

    it('should handle any plugin name gracefully', async () => {
      const result = await installPluginViaCli('nonexistent-plugin');

      expect(result.success).toBe(true);
      expect(result.alreadyInstalled).toBe(true);
    });
  });

  describe('installPluginsViaCli — no-op', () => {
    it('should return success for all plugins', async () => {
      const results = await installPluginsViaCli(['mobile', 'skills']);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].alreadyInstalled).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[1].alreadyInstalled).toBe(true);
    });

    it('should NOT invoke any CLI commands', async () => {
      await installPluginsViaCli(['mobile', 'skills']);

      expect(mockSpawnSync).not.toHaveBeenCalled();
    });
  });
});
