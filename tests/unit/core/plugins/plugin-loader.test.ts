/**
 * Unit tests for PluginLoader
 *
 * Tests plugin discovery, manifest validation, component loading,
 * and error handling for the Claude Code native plugin loader.
 *
 * @module plugin-loader.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Hoisted mocks for ESM compatibility ---
const mockFs = vi.hoisted(() => ({
  pathExists: vi.fn(),
  readJSON: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('../../../../src/utils/fs-native.js', () => mockFs);

import { PluginLoader } from '../../../../src/core/plugins/plugin-loader.js';
import {
  ManifestValidationError,
  PluginNotFoundError,
} from '../../../../src/core/types/plugin.js';

// --- Helpers ---

/** Creates a minimal valid manifest object */
function validManifest(overrides: Record<string, unknown> = {}) {
  return {
    name: 'my-plugin',
    description: 'A test plugin',
    version: '1.0.0',
    author: { name: 'Test Author' },
    ...overrides,
  };
}

/** Creates a fake Dirent-like object for readdir({ withFileTypes: true }) */
function dirent(name: string, isDir: boolean) {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
    path: '',
  };
}

describe('PluginLoader', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    loader = new PluginLoader();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // validateManifest (synchronous, no fs needed)
  // =========================================================================
  describe('validateManifest', () => {
    it('should accept a valid manifest with all required fields', () => {
      const result = loader.validateManifest(validManifest());

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require name field', () => {
      const result = loader.validateManifest(validManifest({ name: undefined }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: name');
    });

    it('should require description field', () => {
      const result = loader.validateManifest(validManifest({ description: undefined }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: description');
    });

    it('should require version field', () => {
      const result = loader.validateManifest(validManifest({ version: undefined }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: version');
    });

    it('should require author field', () => {
      const result = loader.validateManifest(validManifest({ author: undefined }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: author');
    });

    it('should require author.name when author is present', () => {
      const result = loader.validateManifest(validManifest({ author: { email: 'a@b.com' } }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: author.name');
    });

    it('should report multiple missing fields at once', () => {
      const result = loader.validateManifest({});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
      expect(result.errors).toContain('Missing required field: name');
      expect(result.errors).toContain('Missing required field: description');
      expect(result.errors).toContain('Missing required field: version');
      expect(result.errors).toContain('Missing required field: author');
    });

    // --- Name format validation ---
    it('should reject names with uppercase letters', () => {
      const result = loader.validateManifest(validManifest({ name: 'MyPlugin' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid plugin name format/);
    });

    it('should reject names with underscores', () => {
      const result = loader.validateManifest(validManifest({ name: 'my_plugin' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid plugin name format/);
    });

    it('should reject names starting with a hyphen', () => {
      const result = loader.validateManifest(validManifest({ name: '-my-plugin' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid plugin name format/);
    });

    it('should reject names ending with a hyphen', () => {
      const result = loader.validateManifest(validManifest({ name: 'my-plugin-' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid plugin name format/);
    });

    it('should reject names with consecutive hyphens', () => {
      const result = loader.validateManifest(validManifest({ name: 'my--plugin' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid plugin name format/);
    });

    it('should accept names with numbers', () => {
      const result = loader.validateManifest(validManifest({ name: 'plugin-v2' }));

      expect(result.valid).toBe(true);
    });

    it('should accept single-word lowercase names', () => {
      const result = loader.validateManifest(validManifest({ name: 'specweave' }));

      expect(result.valid).toBe(true);
    });

    it('should accept numeric-only names', () => {
      const result = loader.validateManifest(validManifest({ name: '123' }));

      expect(result.valid).toBe(true);
    });

    // --- Deprecation warnings ---
    it('should warn about deprecated specweave_core_version field', () => {
      const result = loader.validateManifest(
        validManifest({ specweave_core_version: '>=1.0.0' })
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Deprecated field: specweave_core_version (no longer used)');
    });

    it('should warn about deprecated provides field', () => {
      const result = loader.validateManifest(
        validManifest({ provides: { skills: ['pm'] } })
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Deprecated field: provides (components discovered by scanning)');
    });

    it('should warn about deprecated auto_detect field', () => {
      const result = loader.validateManifest(
        validManifest({ auto_detect: { files: ['.git/config'] } })
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Deprecated field: auto_detect (no longer used)');
    });

    it('should warn about deprecated triggers field', () => {
      const result = loader.validateManifest(
        validManifest({ triggers: ['kubernetes'] })
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Deprecated field: triggers (use keywords instead)');
    });

    it('should accumulate multiple warnings', () => {
      const result = loader.validateManifest(
        validManifest({
          specweave_core_version: '>=1.0.0',
          provides: { skills: [] },
          triggers: ['k8s'],
        })
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(3);
    });

    it('should return both errors and warnings simultaneously', () => {
      const result = loader.validateManifest({
        name: 'valid-name',
        // missing description, version, author
        specweave_core_version: '>=1.0.0',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // validate (async wrapper)
  // =========================================================================
  describe('validate', () => {
    it('should return the same result as validateManifest', async () => {
      const manifest = validManifest();
      const syncResult = loader.validateManifest(manifest);
      const asyncResult = await loader.validate(manifest);

      expect(asyncResult).toEqual(syncResult);
    });

    it('should detect invalid manifest asynchronously', async () => {
      const result = await loader.validate({});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // loadManifest
  // =========================================================================
  describe('loadManifest', () => {
    const pluginPath = '/plugins/my-plugin';
    const pluginJsonPath = '/plugins/my-plugin/.claude-plugin/plugin.json';

    it('should load and return a valid plugin.json', async () => {
      const manifest = validManifest();
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockResolvedValue(manifest);

      const result = await loader.loadManifest(pluginPath);

      expect(result).toEqual(manifest);
      expect(mockFs.pathExists).toHaveBeenCalledWith(pluginJsonPath);
      expect(mockFs.readJSON).toHaveBeenCalledWith(pluginJsonPath);
    });

    it('should throw ManifestValidationError when plugin.json is missing', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      await expect(loader.loadManifest(pluginPath)).rejects.toThrow(
        ManifestValidationError
      );
      await expect(loader.loadManifest(pluginPath)).rejects.toThrow(
        /plugin\.json not found/
      );
    });

    it('should throw ManifestValidationError for invalid JSON', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockRejectedValue(new Error('Unexpected token'));

      await expect(loader.loadManifest(pluginPath)).rejects.toThrow(
        ManifestValidationError
      );
      await expect(loader.loadManifest(pluginPath)).rejects.toThrow(
        /Invalid JSON in plugin\.json/
      );
    });

    it('should throw ManifestValidationError when required fields are missing', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockResolvedValue({ name: 'test' }); // missing description, version, author

      await expect(loader.loadManifest(pluginPath)).rejects.toThrow(
        ManifestValidationError
      );
      await expect(loader.loadManifest(pluginPath)).rejects.toThrow(
        /validation failed/
      );
    });

    it('should include the plugin name in the error', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      try {
        await loader.loadManifest(pluginPath);
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.pluginName).toBe('my-plugin');
      }
    });
  });

  // =========================================================================
  // loadFromDirectory
  // =========================================================================
  describe('loadFromDirectory', () => {
    const pluginPath = '/plugins/my-plugin';

    it('should throw PluginNotFoundError if directory does not exist', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      await expect(loader.loadFromDirectory(pluginPath)).rejects.toThrow(
        PluginNotFoundError
      );
    });

    it('should include plugin basename in PluginNotFoundError', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      try {
        await loader.loadFromDirectory(pluginPath);
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.pluginName).toBe('my-plugin');
        expect(err.code).toBe('PLUGIN_NOT_FOUND');
      }
    });

    it('should load a plugin with skills, agents, and commands', async () => {
      const manifest = validManifest();

      // pathExists calls: directory check, plugin.json, skills dir, agents dir,
      // commands dir, individual files...
      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        if (p.endsWith('/agents')) return true;
        if (p.endsWith('/commands')) return true;
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('AGENT.md')) return true;
        // test-cases directories don't exist
        if (p.endsWith('test-cases')) return false;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      // skills dir has one skill subdirectory
      mockFs.readdir.mockImplementation(async (dir: string, opts?: any) => {
        if (dir.endsWith('/skills')) {
          return [dirent('pm', true), dirent('README.md', false)];
        }
        if (dir.endsWith('/agents')) {
          return [dirent('reviewer', true), dirent('.DS_Store', false)];
        }
        if (dir.endsWith('/commands')) {
          return ['sync.md', 'deploy.md', 'notes.txt'];
        }
        return [];
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('SKILL.md')) {
          return `---\ndescription: Product Manager\nvisibility: public\n---\n\n# PM`;
        }
        if (filePath.endsWith('AGENT.md')) {
          return `# Code Reviewer\n\n## Capabilities\n\n- Review PRs\n- Check style\n`;
        }
        if (filePath.endsWith('sync.md')) {
          return `---\ndescription: Sync with GitHub\n---\n\nSync command content`;
        }
        if (filePath.endsWith('deploy.md')) {
          return `Deploy to production.\n\nRun the deploy pipeline.`;
        }
        return '';
      });

      const plugin = await loader.loadFromDirectory(pluginPath);

      // Manifest
      expect(plugin.manifest).toEqual(manifest);
      expect(plugin.path).toBe(pluginPath);

      // Skills
      expect(plugin.skills).toHaveLength(1);
      expect(plugin.skills[0].name).toBe('pm');
      expect(plugin.skills[0].description).toBe('Product Manager');
      expect(plugin.skills[0].visibility).toBe('public');

      // Agents
      expect(plugin.agents).toHaveLength(1);
      expect(plugin.agents[0].name).toBe('reviewer');
      expect(plugin.agents[0].capabilities).toContain('Review PRs');
      expect(plugin.agents[0].capabilities).toContain('Check style');

      // Commands (only .md files)
      expect(plugin.commands).toHaveLength(2);
      const commandNames = plugin.commands.map(c => c.name);
      expect(commandNames).toContain('sync');
      expect(commandNames).toContain('deploy');
    });

    it('should return empty arrays when component directories are missing', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        // skills, agents, commands dirs do not exist
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills).toEqual([]);
      expect(plugin.agents).toEqual([]);
      expect(plugin.commands).toEqual([]);
    });

    it('should skip skill directories without SKILL.md', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        // No SKILL.md files exist
        if (p.endsWith('SKILL.md')) return false;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/skills')) {
          return [dirent('orphan-dir', true)];
        }
        return [];
      });

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills).toEqual([]);
    });

    it('should skip agent directories without AGENT.md', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/agents')) return true;
        if (p.endsWith('AGENT.md')) return false;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/agents')) {
          return [dirent('empty-agent', true)];
        }
        return [];
      });

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents).toEqual([]);
    });
  });

  // =========================================================================
  // getMetadata
  // =========================================================================
  describe('getMetadata', () => {
    const pluginPath = '/plugins/test-plugin';

    it('should return metadata with correct counts', async () => {
      const manifest = validManifest({ name: 'test-plugin', version: '2.0.0' });

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        if (p.endsWith('/agents')) return true;
        if (p.endsWith('/commands')) return true;
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('AGENT.md')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      mockFs.readdir.mockImplementation(async (dir: string, opts?: any) => {
        if (dir.endsWith('/skills')) {
          return [dirent('skill-a', true), dirent('skill-b', true)];
        }
        if (dir.endsWith('/agents')) {
          return [dirent('agent-a', true)];
        }
        if (dir.endsWith('/commands')) {
          return ['cmd1.md', 'cmd2.md', 'cmd3.md', 'README.txt'];
        }
        return [];
      });

      const meta = await loader.getMetadata(pluginPath);

      expect(meta.name).toBe('test-plugin');
      expect(meta.version).toBe('2.0.0');
      expect(meta.description).toBe('A test plugin');
      expect(meta.skillCount).toBe(2);
      expect(meta.agentCount).toBe(1);
      expect(meta.commandCount).toBe(3);
    });

    it('should return zero counts when directories are missing', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('plugin.json')) return true;
        // No skills, agents, or commands dirs
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      const meta = await loader.getMetadata(pluginPath);

      expect(meta.skillCount).toBe(0);
      expect(meta.agentCount).toBe(0);
      expect(meta.commandCount).toBe(0);
    });

    it('should not count skill dirs without SKILL.md', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        if (p.endsWith('SKILL.md')) return false;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/skills')) {
          return [dirent('no-skill-md', true)];
        }
        return [];
      });

      const meta = await loader.getMetadata(pluginPath);

      expect(meta.skillCount).toBe(0);
    });

    it('should not count non-directory entries in skills', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/skills')) {
          return [dirent('README.md', false)];
        }
        return [];
      });

      const meta = await loader.getMetadata(pluginPath);

      expect(meta.skillCount).toBe(0);
    });

    it('should only count .md files in commands directory', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/commands')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);
      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/commands')) {
          return ['cmd.md', 'helper.sh', 'another.md', 'config.json'];
        }
        return [];
      });

      const meta = await loader.getMetadata(pluginPath);

      expect(meta.commandCount).toBe(2);
    });
  });

  // =========================================================================
  // Skill discovery details
  // =========================================================================
  describe('skill discovery', () => {
    const pluginPath = '/plugins/test';

    function setupPluginWithSkill(skillContent: string) {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('test-cases')) return false;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/skills')) {
          return [dirent('test-skill', true)];
        }
        return [];
      });

      mockFs.readFile.mockResolvedValue(skillContent);
    }

    it('should extract description from YAML frontmatter', async () => {
      setupPluginWithSkill(
        `---\ndescription: Manages deployment pipelines\n---\n\n# Deploy Skill`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].description).toBe('Manages deployment pipelines');
    });

    it('should fall back to first non-heading non-bullet line when no description in frontmatter', async () => {
      // Note: the fallback scans ALL lines including frontmatter content.
      // "name: test" is not a heading or bullet, so it is picked up first.
      setupPluginWithSkill(
        `---\nname: test\n---\n\nThis is the fallback description.\n\nMore content.`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      // The frontmatter delimiter "---" starts with "-", so it's skipped,
      // but "name: test" is a plain line that matches first.
      expect(plugin.skills[0].description).toBe('name: test');
    });

    it('should fall back to body content when frontmatter is absent', async () => {
      setupPluginWithSkill(
        `This is the actual description.\n\nMore content.`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].description).toBe('This is the actual description.');
    });

    it('should skip lines starting with # or - when falling back', async () => {
      setupPluginWithSkill(
        `# Heading\n- bullet\nActual description line`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].description).toBe('Actual description line');
    });

    it('should return "No description available" when no content matches', async () => {
      setupPluginWithSkill(`# Only Heading\n- Only bullet\n- Another bullet`);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].description).toBe('No description available');
    });

    it('should truncate fallback description to 200 chars', async () => {
      const longLine = 'A'.repeat(300);
      setupPluginWithSkill(longLine);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].description).toHaveLength(200);
    });

    it('should extract visibility: public from frontmatter', async () => {
      setupPluginWithSkill(
        `---\ndescription: Test\nvisibility: public\n---\n\n# Test`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].visibility).toBe('public');
    });

    it('should extract visibility: internal from frontmatter', async () => {
      setupPluginWithSkill(
        `---\ndescription: Test\nvisibility: internal\n---\n\n# Test`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].visibility).toBe('internal');
    });

    it('should return undefined for unknown visibility values', async () => {
      setupPluginWithSkill(
        `---\ndescription: Test\nvisibility: secret\n---\n\n# Test`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].visibility).toBeUndefined();
    });

    it('should return undefined visibility when no frontmatter exists', async () => {
      setupPluginWithSkill(`# No Frontmatter\n\nContent here.`);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].visibility).toBeUndefined();
    });
  });

  // =========================================================================
  // Test case discovery
  // =========================================================================
  describe('test case discovery', () => {
    const pluginPath = '/plugins/test';

    it('should discover YAML test cases from test-cases directory', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('test-cases')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/skills')) {
          return [dirent('my-skill', true)];
        }
        if (dir.endsWith('test-cases')) {
          return ['case-001.yaml', 'case-002.yml', 'readme.txt'];
        }
        return [];
      });

      mockFs.readFile.mockResolvedValue(
        `---\ndescription: A skill\n---\n\n# Skill`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].testCases).toHaveLength(2);
      expect(plugin.skills[0].testCases![0].id).toBe('case-001');
      expect(plugin.skills[0].testCases![1].id).toBe('case-002');
      expect(plugin.skills[0].testCases![0].path).toContain('case-001.yaml');
      expect(plugin.skills[0].testCases![1].path).toContain('case-002.yml');
    });

    it('should return empty test cases when test-cases dir is missing', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('test-cases')) return false;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/skills')) {
          return [dirent('my-skill', true)];
        }
        return [];
      });

      mockFs.readFile.mockResolvedValue(
        `---\ndescription: Skill\n---\n\n# Skill`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].testCases).toEqual([]);
    });

    it('should ignore non-YAML files in test-cases directory', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('test-cases')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/skills')) {
          return [dirent('my-skill', true)];
        }
        if (dir.endsWith('test-cases')) {
          return ['readme.md', 'config.json', 'script.sh'];
        }
        return [];
      });

      mockFs.readFile.mockResolvedValue(
        `---\ndescription: Skill\n---\n\n# Skill`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].testCases).toEqual([]);
    });
  });

  // =========================================================================
  // Agent discovery details
  // =========================================================================
  describe('agent discovery', () => {
    const pluginPath = '/plugins/test';

    function setupPluginWithAgent(agentContent: string) {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/agents')) return true;
        if (p.endsWith('AGENT.md')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/agents')) {
          return [dirent('test-agent', true)];
        }
        return [];
      });

      mockFs.readFile.mockResolvedValue(agentContent);
    }

    it('should extract capabilities from ## Capabilities section', async () => {
      setupPluginWithAgent(
        `# Reviewer\n\n## Capabilities\n\n- Review pull requests\n- Enforce coding standards\n- Suggest improvements\n`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].capabilities).toEqual([
        'Review pull requests',
        'Enforce coding standards',
        'Suggest improvements',
      ]);
    });

    it('should handle capabilities with * bullet points', async () => {
      setupPluginWithAgent(
        `# Agent\n\n## Capabilities\n\n* First cap\n* Second cap\n`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].capabilities).toEqual(['First cap', 'Second cap']);
    });

    it('should return empty capabilities when section is missing', async () => {
      setupPluginWithAgent(`# Agent\n\nNo capabilities section here.`);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].capabilities).toEqual([]);
    });

    it('should stop extracting capabilities at the next ## section', async () => {
      setupPluginWithAgent(
        `# Agent\n\n## Capabilities\n\n- Cap 1\n- Cap 2\n\n## Configuration\n\n- Not a cap\n`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].capabilities).toEqual(['Cap 1', 'Cap 2']);
      expect(plugin.agents[0].capabilities).not.toContain('Not a cap');
    });

    it('should store full content as systemPrompt', async () => {
      const content = `# Full Agent Content\n\nWith all details.\n`;
      setupPluginWithAgent(content);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].systemPrompt).toBe(content);
    });

    it('should set correct path for agent', async () => {
      setupPluginWithAgent(`# Agent\n`);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].path).toContain('/agents/test-agent');
    });
  });

  // =========================================================================
  // Command discovery details
  // =========================================================================
  describe('command discovery', () => {
    const pluginPath = '/plugins/test';

    function setupPluginWithCommands(files: { name: string; content: string }[]) {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/commands')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/commands')) {
          return files.map(f => f.name);
        }
        return [];
      });

      mockFs.readFile.mockImplementation(async (filePath: string) => {
        const file = files.find(f => filePath.endsWith(f.name));
        return file?.content ?? '';
      });
    }

    it('should discover only .md files as commands', async () => {
      setupPluginWithCommands([
        { name: 'sync.md', content: '---\ndescription: Sync\n---\nContent' },
        { name: 'helper.sh', content: '#!/bin/bash' },
        { name: 'deploy.md', content: 'Deploy content' },
      ]);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.commands).toHaveLength(2);
      const names = plugin.commands.map(c => c.name);
      expect(names).toContain('sync');
      expect(names).toContain('deploy');
      expect(names).not.toContain('helper');
    });

    it('should strip .md extension from command name', async () => {
      setupPluginWithCommands([
        { name: 'github-sync.md', content: 'Sync content' },
      ]);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.commands[0].name).toBe('github-sync');
    });

    it('should extract description from command frontmatter', async () => {
      setupPluginWithCommands([
        {
          name: 'check.md',
          content: `---\ndescription: Run health checks\n---\n\n# Check`,
        },
      ]);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.commands[0].description).toBe('Run health checks');
    });

    it('should store full content as prompt', async () => {
      const content = `---\ndescription: Do thing\n---\n\nFull prompt content here.`;
      setupPluginWithCommands([{ name: 'do.md', content }]);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.commands[0].prompt).toBe(content);
    });

    it('should return empty commands when commands directory is missing', async () => {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/commands')) return false;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.commands).toEqual([]);
    });
  });

  // =========================================================================
  // Edge cases and error scenarios
  // =========================================================================
  describe('edge cases', () => {
    it('should handle empty plugin (no skills, agents, or commands dirs)', async () => {
      const pluginPath = '/plugins/empty-plugin';
      const manifest = validManifest({ name: 'empty-plugin' });

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.manifest.name).toBe('empty-plugin');
      expect(plugin.skills).toEqual([]);
      expect(plugin.agents).toEqual([]);
      expect(plugin.commands).toEqual([]);
    });

    it('should handle empty skills directory', async () => {
      const pluginPath = '/plugins/empty-skills';
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);
      mockFs.readdir.mockImplementation(async () => []);

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills).toEqual([]);
    });

    it('should handle manifest with empty string name', () => {
      const result = loader.validateManifest(validManifest({ name: '' }));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: name');
    });

    it('should handle manifest with null values', () => {
      const result = loader.validateManifest({
        name: null,
        description: null,
        version: null,
        author: null,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle readJSON throwing non-standard error', async () => {
      const pluginPath = '/plugins/bad-json';

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readJSON.mockRejectedValue({ message: 'custom error object' });

      await expect(loader.loadManifest(pluginPath)).rejects.toThrow(
        ManifestValidationError
      );
    });

    it('should handle name with spaces', () => {
      const result = loader.validateManifest(validManifest({ name: 'my plugin' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid plugin name format/);
    });

    it('should handle name with special characters', () => {
      const result = loader.validateManifest(validManifest({ name: 'my@plugin!' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid plugin name format/);
    });

    it('should handle name with dots', () => {
      const result = loader.validateManifest(validManifest({ name: 'my.plugin' }));

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid plugin name format/);
    });
  });

  // =========================================================================
  // Description extraction edge cases
  // =========================================================================
  describe('extractDescription edge cases', () => {
    const pluginPath = '/plugins/test';

    function setupSkillWithContent(content: string) {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/skills')) return true;
        if (p.endsWith('SKILL.md')) return true;
        if (p.endsWith('test-cases')) return false;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/skills')) {
          return [dirent('s1', true)];
        }
        return [];
      });

      mockFs.readFile.mockResolvedValue(content);
    }

    it('should handle frontmatter with extra whitespace in description', async () => {
      setupSkillWithContent(
        `---\ndescription:    Trimmed description   \n---\n\n# Skill`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].description).toBe('Trimmed description');
    });

    it('should handle empty file', async () => {
      setupSkillWithContent('');

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].description).toBe('No description available');
    });

    it('should handle file with only whitespace and empty lines', async () => {
      setupSkillWithContent('\n   \n   \n');

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].description).toBe('No description available');
    });

    it('should handle file with only headings and bullets', async () => {
      setupSkillWithContent('# Heading\n## Sub\n- item\n- item');

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.skills[0].description).toBe('No description available');
    });
  });

  // =========================================================================
  // Capabilities extraction edge cases
  // =========================================================================
  describe('extractCapabilities edge cases', () => {
    const pluginPath = '/plugins/test';

    function setupAgentWithContent(content: string) {
      const manifest = validManifest();

      mockFs.pathExists.mockImplementation(async (p: string) => {
        if (p === pluginPath) return true;
        if (p.endsWith('plugin.json')) return true;
        if (p.endsWith('/agents')) return true;
        if (p.endsWith('AGENT.md')) return true;
        return false;
      });

      mockFs.readJSON.mockResolvedValue(manifest);

      mockFs.readdir.mockImplementation(async (dir: string) => {
        if (dir.endsWith('/agents')) {
          return [dirent('a1', true)];
        }
        return [];
      });

      mockFs.readFile.mockResolvedValue(content);
    }

    it('should handle capabilities section with mixed bullet styles', async () => {
      setupAgentWithContent(
        `# Agent\n\n## Capabilities\n\n- Dash item\n* Star item\n`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].capabilities).toEqual(['Dash item', 'Star item']);
    });

    it('should skip non-bullet lines in capabilities section', async () => {
      setupAgentWithContent(
        `# Agent\n\n## Capabilities\n\nSome text\n- Actual cap\nMore text\n`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].capabilities).toEqual(['Actual cap']);
    });

    it('should handle case-insensitive capabilities heading', async () => {
      setupAgentWithContent(
        `# Agent\n\n## capabilities\n\n- lowercase cap\n`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].capabilities).toEqual(['lowercase cap']);
    });

    it('should handle capabilities at end of file without trailing newline', async () => {
      setupAgentWithContent(
        `# Agent\n\n## Capabilities\n\n- Final cap`
      );

      const plugin = await loader.loadFromDirectory(pluginPath);

      expect(plugin.agents[0].capabilities).toEqual(['Final cap']);
    });
  });
});
