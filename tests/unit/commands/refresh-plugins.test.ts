import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Unit Tests: refresh-plugins command
 *
 * Tests core-only default install, --plugin flag, --all flag, --quiet mode,
 * and validation behavior.
 */

// Hoist mocks before imports
const mocks = vi.hoisted(() => ({
  detectClaudeCli: vi.fn(() => ({ available: false, pluginCommandsWork: false })),
  copyPluginSkillsToProject: vi.fn(() => ({ success: true, skipped: false })),
  installPlugin: vi.fn(() => ({ success: true, skipped: false })),
  findSpecweaveRoot: vi.fn(() => '/mock/specweave'),
  getProjectRoot: vi.fn(() => '/mock/project'),
  enablePluginsInSettings: vi.fn(() => true),
  readFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
}));

vi.mock('../../../src/utils/claude-cli-detector.js', () => ({
  detectClaudeCli: mocks.detectClaudeCli,
}));

vi.mock('../../../src/utils/plugin-copier.js', () => ({
  copyPluginSkillsToProject: mocks.copyPluginSkillsToProject,
  installPlugin: mocks.installPlugin,
  findSpecweaveRoot: mocks.findSpecweaveRoot,
}));

vi.mock('../../../src/utils/find-project-root.js', () => ({
  getProjectRoot: mocks.getProjectRoot,
}));

vi.mock('../../../src/cli/helpers/init/claude-plugin-enabler.js', () => ({
  enablePluginsInSettings: mocks.enablePluginsInSettings,
}));

vi.mock('../../../src/utils/esm-helpers.js', () => ({
  getDirname: () => '/mock/dirname',
}));

vi.mock('../../../src/utils/logger.js', () => ({
  consoleLogger: { debug: vi.fn() },
}));

// Mock fs partially — only readFileSync and existsSync
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    readFileSync: mocks.readFileSync,
    existsSync: mocks.existsSync,
  };
});

import { refreshPluginsCommand } from '../../../src/cli/commands/refresh-plugins.js';

const MARKETPLACE_PLUGINS = [
  { name: 'sw', source: './plugins/specweave', version: '1.0.0' },
  { name: 'sw-github', source: './plugins/sw-github', version: '1.0.0' },
  { name: 'sw-jira', source: './plugins/sw-jira', version: '1.0.0' },
  { name: 'sw-ado', source: './plugins/sw-ado', version: '1.0.0' },
  { name: 'sw-release', source: './plugins/sw-release', version: '1.0.0' },
  { name: 'sw-diagrams', source: './plugins/sw-diagrams', version: '1.0.0' },
  { name: 'docs', source: './plugins/docs', version: '1.0.0' },
  { name: 'sw-media', source: './plugins/sw-media', version: '1.0.0' },
];

describe('refreshPluginsCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.exitCode = undefined;

    // Default: marketplace.json returns 8 plugins
    mocks.readFileSync.mockReturnValue(JSON.stringify({ plugins: MARKETPLACE_PLUGINS }));
    mocks.existsSync.mockReturnValue(true);
    mocks.findSpecweaveRoot.mockReturnValue('/mock/specweave');
    mocks.copyPluginSkillsToProject.mockReturnValue({ success: true, skipped: false });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = undefined;
  });

  // TC-001 (AC-US1-01): Default = core only
  it('should install only sw plugin by default (no flags)', async () => {
    await refreshPluginsCommand({});

    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledTimes(1);
    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledWith(
      'sw',
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
  });

  // TC-002 (AC-US1-02): --all = install everything
  it('should install all plugins when --all is passed', async () => {
    await refreshPluginsCommand({ all: true });

    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledTimes(8);
  });

  // TC-003 (AC-US1-03): Existing non-core plugins untouched
  it('should not uninstall existing non-core plugins', async () => {
    await refreshPluginsCommand({});

    // Only sw is installed, no uninstall calls
    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledTimes(1);
    // No rmSync, no uninstall calls — just the one install
  });

  // TC-004 (AC-US2-01): --plugin installs specific plugin
  it('should install only named plugin with --plugin flag', async () => {
    await refreshPluginsCommand({ plugin: 'sw-github' });

    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledTimes(1);
    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledWith(
      'sw-github',
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
  });

  // TC-005 (AC-US2-02): --plugin with nonexistent name errors
  it('should error with exit code 1 for unknown plugin name', async () => {
    await refreshPluginsCommand({ plugin: 'nonexistent' });

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent'),
    );
    expect(mocks.copyPluginSkillsToProject).not.toHaveBeenCalled();
  });

  // TC-006 (AC-US2-03): --plugin takes precedence over --all
  it('should install only named plugin when --plugin and --all are both set', async () => {
    await refreshPluginsCommand({ plugin: 'sw-github', all: true });

    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledTimes(1);
    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledWith(
      'sw-github',
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
  });

  // TC-007: --quiet suppresses console.log
  it('should suppress console.log when --quiet is set', async () => {
    await refreshPluginsCommand({ quiet: true });

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  // Edge: --plugin with marketplace suffix stripped
  it('should strip marketplace suffix from --plugin value', async () => {
    await refreshPluginsCommand({ plugin: 'sw-github@specweave' });

    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledTimes(1);
    expect(mocks.copyPluginSkillsToProject).toHaveBeenCalledWith(
      'sw-github',
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
  });
});
