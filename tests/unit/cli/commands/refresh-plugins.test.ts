/**
 * Unit tests for refresh-plugins command
 *
 * Tests the direct file copy plugin refresh workflow (v1.0.535):
 * - All plugins installed to .claude/skills/ (no lazy mode)
 * - Hash-based skip via copyPluginSkillsToProject
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockCopyPluginSkillsToProject,
  mockFindSpecweaveRoot,
  mockExistsSync,
  mockReadFileSync,
  mockGetProjectRoot,
} = vi.hoisted(() => ({
  mockCopyPluginSkillsToProject: vi.fn(),
  mockFindSpecweaveRoot: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockGetProjectRoot: vi.fn(),
}));

// Mock plugin-copier
vi.mock('../../../../src/utils/plugin-copier.js', () => ({
  copyPluginSkillsToProject: mockCopyPluginSkillsToProject,
  findSpecweaveRoot: mockFindSpecweaveRoot,
}));

vi.mock('../../../../src/utils/find-project-root.js', () => ({
  getProjectRoot: mockGetProjectRoot,
}));

// Mock ESM helpers
vi.mock('../../../../src/utils/esm-helpers.js', () => ({
  getDirname: () => '/mock/src/cli/commands',
}));

// Mock logger
vi.mock('../../../../src/utils/logger.js', () => ({
  consoleLogger: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock chalk
vi.mock('chalk', () => {
  const identity = (s: unknown) => String(s);
  const handler: ProxyHandler<typeof identity> = {
    get(_target, prop) {
      if (prop === 'default') return new Proxy(identity, handler);
      if (prop === Symbol.toPrimitive || prop === 'toString' || prop === 'valueOf') return undefined;
      return new Proxy(identity, handler);
    },
    apply(_target, _thisArg, args) {
      return String(args[0]);
    },
  };
  return { default: new Proxy(identity, handler) };
});

// Mock fs
vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync,
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { refreshPluginsCommand } from '../../../../src/cli/commands/refresh-plugins.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MARKETPLACE_JSON = JSON.stringify({
  name: 'specweave',
  version: '1.0.0',
  plugins: [
    { name: 'sw', source: './plugins/specweave', version: '1.0.272', description: 'Core framework' },
    { name: 'sw-github', source: './plugins/specweave-github', version: '1.0.30', description: 'GitHub sync' },
    { name: 'sw-jira', source: './plugins/specweave-jira', version: '1.0.0', description: 'JIRA sync' },
  ],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('refresh-plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFindSpecweaveRoot.mockReturnValue('/mock/specweave');
    mockGetProjectRoot.mockReturnValue('/mock/project');

    mockExistsSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.includes('marketplace.json')) return true;
      return false;
    });

    mockReadFileSync.mockImplementation((p: string) => {
      if (typeof p === 'string' && p.includes('marketplace.json')) return MARKETPLACE_JSON;
      return '';
    });

    mockCopyPluginSkillsToProject.mockReturnValue({ success: true, sha: 'abc123def456' });
  });

  describe('installs all plugins by default', () => {
    it('should install all plugins from marketplace.json', async () => {
      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(3);

      const calledPlugins = mockCopyPluginSkillsToProject.mock.calls.map((c: unknown[]) => c[0]);
      expect(calledPlugins).toContain('sw');
      expect(calledPlugins).toContain('sw-github');
      expect(calledPlugins).toContain('sw-jira');
    });

    it('should pass project root to copyPluginSkillsToProject', async () => {
      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledWith(
        'sw',
        '/mock/specweave',
        '/mock/project',
        { force: undefined },
      );
    });
  });

  describe('hash comparison and skip', () => {
    it('should report skipped plugins when copyPluginSkillsToProject returns skipped=true', async () => {
      mockCopyPluginSkillsToProject.mockReturnValue({ success: true, sha: 'abc123', skipped: true });

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(3);
    });

    it('should pass force flag to copyPluginSkillsToProject', async () => {
      await refreshPluginsCommand({ force: true });

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledWith(
        'sw',
        '/mock/specweave',
        '/mock/project',
        { force: true },
      );
    });

    it('should handle plugin failures with error messages', async () => {
      mockCopyPluginSkillsToProject.mockReturnValue({ success: false, sha: '', error: 'Source dir not found' });

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('should handle missing specweave root gracefully', async () => {
      mockFindSpecweaveRoot.mockReturnValue(null);
      mockExistsSync.mockReturnValue(false);

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
    });

    it('should handle empty marketplace.json', async () => {
      mockReadFileSync.mockImplementation((p: string) => {
        if (typeof p === 'string' && p.includes('marketplace.json')) return JSON.stringify({ plugins: [] });
        return '';
      });

      await refreshPluginsCommand({});

      expect(mockCopyPluginSkillsToProject).not.toHaveBeenCalled();
    });
  });
});
