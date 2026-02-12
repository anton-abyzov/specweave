/**
 * Unit Tests: DocGenerator
 *
 * Tests for skill, agent, and command metadata extraction from markdown files.
 * Target: comprehensive coverage of extractSkills, extractAgents, extractCommands,
 * and the private extractYAMLFrontmatter method.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions so vi.mock factory can reference them
const {
  mockPathExists,
  mockReaddir,
  mockReadFile,
  mockGetDirname,
  mockYAMLParse,
} = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn(),
  mockGetDirname: vi.fn().mockReturnValue('/fake/src/adapters'),
  mockYAMLParse: vi.fn(),
}));

vi.mock('../../../src/utils/fs-native.js', () => ({
  pathExists: mockPathExists,
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

vi.mock('../../../src/utils/esm-helpers.js', () => ({
  getDirname: mockGetDirname,
}));

vi.mock('yaml', () => ({
  parse: mockYAMLParse,
  default: { parse: mockYAMLParse },
}));

import { DocGenerator } from '../../../src/adapters/doc-generator.js';

describe('DocGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDirname.mockReturnValue('/fake/src/adapters');
  });

  // =========================================================================
  // Constructor
  // =========================================================================
  describe('constructor', () => {
    it('should use default paths based on getDirname when no args provided', () => {
      const gen = new DocGenerator();
      // Verifying it constructed without error is sufficient;
      // internal paths are tested indirectly via the extract methods.
      expect(gen).toBeDefined();
    });

    it('should accept custom directory paths', () => {
      const gen = new DocGenerator('/custom/skills', '/custom/agents', '/custom/commands');
      expect(gen).toBeDefined();
    });
  });

  // =========================================================================
  // extractSkills
  // =========================================================================
  describe('extractSkills', () => {
    it('should return empty array when skills directory does not exist', async () => {
      mockPathExists.mockResolvedValue(false);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
    });

    it('should return empty array when skills directory is empty', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue([]);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
    });

    it('should skip folders without SKILL.md', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p === '/skills') return true;
        if (p === '/skills/my-skill/SKILL.md') return false;
        return false;
      });
      mockReaddir.mockResolvedValue(['my-skill']);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
    });

    it('should extract metadata from valid SKILL.md with YAML frontmatter', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['build']);
      mockReadFile.mockResolvedValue(
        '---\nname: build\ndescription: Builds the project\n---\n\n# Build Skill'
      );
      mockYAMLParse.mockReturnValue({ name: 'build', description: 'Builds the project' });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();

      expect(result).toEqual([
        { name: 'build', description: 'Builds the project', location: '.claude/skills/build/SKILL.md' },
      ]);
    });

    it('should skip skills where YAML has no name field', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['broken']);
      mockReadFile.mockResolvedValue('---\ndescription: Missing name\n---\n');
      mockYAMLParse.mockReturnValue({ description: 'Missing name' });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
    });

    it('should skip skills where YAML has no description field', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['nodesc']);
      mockReadFile.mockResolvedValue('---\nname: nodesc\n---\n');
      mockYAMLParse.mockReturnValue({ name: 'nodesc' });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
    });

    it('should skip skills where YAML frontmatter is missing', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['nofm']);
      mockReadFile.mockResolvedValue('# No Frontmatter Here\n\nJust markdown.');
      // extractYAMLFrontmatter returns null for missing frontmatter;
      // YAML.parse is never called in this case.

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
    });

    it('should skip skills where YAML parse throws an error (invalid YAML)', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['invalid-yaml']);
      mockReadFile.mockResolvedValue('---\n: bad: yaml: [[[unterminated\n---\n');
      mockYAMLParse.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
    });

    it('should sort skills alphabetically by name', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['zeta', 'alpha', 'mid']);
      mockReadFile.mockResolvedValue('---\nplaceholder\n---\n');
      mockYAMLParse
        .mockReturnValueOnce({ name: 'zeta', description: 'Z skill' })
        .mockReturnValueOnce({ name: 'alpha', description: 'A skill' })
        .mockReturnValueOnce({ name: 'mid', description: 'M skill' });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();

      expect(result.map((s) => s.name)).toEqual(['alpha', 'mid', 'zeta']);
    });

    it('should handle multiple folders with mix of valid and invalid SKILL.md', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p === '/skills') return true;
        if (p === '/skills/good/SKILL.md') return true;
        if (p === '/skills/bad/SKILL.md') return true;
        if (p === '/skills/nofile/SKILL.md') return false;
        return false;
      });
      mockReaddir.mockResolvedValue(['good', 'bad', 'nofile']);
      mockReadFile.mockImplementation(async (p: string) => {
        if (p === '/skills/good/SKILL.md') return '---\nname: good\ndescription: Valid\n---\n';
        if (p === '/skills/bad/SKILL.md') return '# No frontmatter';
        return '';
      });
      mockYAMLParse.mockReturnValue({ name: 'good', description: 'Valid' });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('good');
    });

    it('should set location using folder name', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['my-great-skill']);
      mockReadFile.mockResolvedValue('---\nname: test\ndescription: desc\n---\n');
      mockYAMLParse.mockReturnValue({ name: 'test', description: 'desc' });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result[0].location).toBe('.claude/skills/my-great-skill/SKILL.md');
    });

    it('should skip skills where YAML returns null', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['nullyaml']);
      mockReadFile.mockResolvedValue('---\n\n---\n');
      mockYAMLParse.mockReturnValue(null);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // extractAgents
  // =========================================================================
  describe('extractAgents', () => {
    it('should return empty array when agents directory does not exist', async () => {
      mockPathExists.mockResolvedValue(false);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();
      expect(result).toEqual([]);
    });

    it('should return empty array when agents directory is empty', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue([]);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();
      expect(result).toEqual([]);
    });

    it('should skip folders without AGENT.md', async () => {
      mockPathExists.mockImplementation(async (p: string) => {
        if (p === '/agents') return true;
        if (p === '/agents/researcher/AGENT.md') return false;
        return false;
      });
      mockReaddir.mockResolvedValue(['researcher']);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();
      expect(result).toEqual([]);
    });

    it('should extract role from H1 heading and description from first line after frontmatter', async () => {
      // The description regex captures the first line/paragraph immediately after ---\n\n
      // which in this case is the H1 heading itself.
      const content = [
        '---',
        'type: agent',
        '---',
        '',
        '# Senior Researcher',
        '',
        'Performs in-depth analysis of topics.',
      ].join('\n');

      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['researcher']);
      mockReadFile.mockResolvedValue(content);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();

      expect(result).toEqual([
        {
          name: 'researcher',
          role: 'Senior Researcher',
          // The regex /---\n[\s\S]*?---\n\n(.+?)(?:\n\n|$)/ captures the first paragraph
          // after the closing frontmatter delimiter, which is the H1 heading line
          description: '# Senior Researcher',
          location: '.claude/agents/researcher/AGENT.md',
        },
      ]);
    });

    it('should extract description as the text right after frontmatter when no heading between', async () => {
      // When description text is the first line after frontmatter (no heading in between)
      const content = [
        '---',
        'type: agent',
        '---',
        '',
        'Performs in-depth analysis of topics.',
        '',
        'More details here.',
      ].join('\n');

      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['researcher']);
      mockReadFile.mockResolvedValue(content);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();

      expect(result[0].description).toBe('Performs in-depth analysis of topics.');
    });

    it('should use folder name as role fallback when H1 heading is missing', async () => {
      const content = [
        '---',
        'type: agent',
        '---',
        '',
        'No heading here, just description.',
      ].join('\n');

      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['fallback-agent']);
      mockReadFile.mockResolvedValue(content);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();

      expect(result[0].role).toBe('fallback-agent');
    });

    it('should use default description when frontmatter description pattern does not match', async () => {
      // Content without frontmatter block (no --- delimiters)
      const content = '# Code Reviewer\n\nSome content here.';

      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['reviewer']);
      mockReadFile.mockResolvedValue(content);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();

      // The regex for description looks for ---\n...\n---\n\n(.+?)
      // Without frontmatter, it won't match, so fallback is used
      expect(result[0].description).toBe('Code Reviewer agent');
    });

    it('should sort agents alphabetically by name', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['zebra', 'alpha', 'mike']);
      mockReadFile.mockImplementation(async (p: string) => {
        const folder = p.split('/').slice(-2, -1)[0];
        return `---\ntype: agent\n---\n\n# ${folder} Agent\n\n${folder} does things.`;
      });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();

      expect(result.map((a) => a.name)).toEqual(['alpha', 'mike', 'zebra']);
    });

    it('should set location using folder name', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['my-agent']);
      mockReadFile.mockResolvedValue('---\ntype: agent\n---\n\n# Agent\n\nDesc.');

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();
      expect(result[0].location).toBe('.claude/agents/my-agent/AGENT.md');
    });

    it('should extract role from H1 with extra spaces around text', async () => {
      const content = '---\ntype: agent\n---\n\n#   Spaced Role   \n\nDesc after frontmatter.';
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['spacey']);
      mockReadFile.mockResolvedValue(content);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();
      expect(result[0].role).toBe('Spaced Role');
    });

    it('should not match H2 or H3 as role heading', async () => {
      // The regex is /^#\s+(.+?)$/m which matches "# " (H1).
      // However, "## Heading" also starts with #, so the regex captures "# Heading" from "## Heading"
      // Actually /^#\s+/ will match ## because # is followed by #\s — let me test the actual behavior.
      // The regex /^#\s+(.+?)$/m: for "## Sub Heading", # matches first #, \s+ matches "# " (second # plus space).
      // So it would capture "Sub Heading". This is how the source code works.
      // But if there is no H1 and only H2, the regex still matches.
      // Let's test with only H2:
      const content = '---\ntype: agent\n---\n\n## Sub Heading\n\nDescription.';
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['h2only']);
      mockReadFile.mockResolvedValue(content);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();

      // The regex /^#\s+(.+?)$/m will match "## Sub Heading" capturing "# Sub Heading"
      // Wait: ^#\s+ means one # followed by one or more whitespace.
      // "## Sub Heading" — the first char is #, then \s+ needs whitespace, but second char is #.
      // So the regex actually does NOT match "## Sub Heading" because after the first #, \s+ expects space.
      // Therefore fallback to folder name.
      expect(result[0].role).toBe('h2only');
    });

    it('should handle agents with both no heading and no frontmatter gracefully', async () => {
      const content = 'Just plain text, no frontmatter, no heading.';
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['plain']);
      mockReadFile.mockResolvedValue(content);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();

      expect(result[0].name).toBe('plain');
      expect(result[0].role).toBe('plain');
      // No frontmatter means description regex won't match; fallback = `${role} agent`
      expect(result[0].description).toBe('plain agent');
    });

    it('should handle description that ends at end of string (no trailing double newline)', async () => {
      const content = '---\ntype: agent\n---\n\nSingle line description';
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['single']);
      mockReadFile.mockResolvedValue(content);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractAgents();
      expect(result[0].description).toBe('Single line description');
    });
  });

  // =========================================================================
  // extractCommands
  // =========================================================================
  describe('extractCommands', () => {
    it('should return empty array when commands directory does not exist', async () => {
      mockPathExists.mockResolvedValue(false);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();
      expect(result).toEqual([]);
    });

    it('should return empty array when commands directory is empty', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue([]);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();
      expect(result).toEqual([]);
    });

    it('should skip README.md', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['README.md']);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();
      expect(result).toEqual([]);
    });

    it('should skip non-.md files', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['script.sh', 'config.json', 'notes.txt']);
      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();
      expect(result).toEqual([]);
    });

    it('should extract command name from filename (without .md extension)', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['deploy.md']);
      mockReadFile.mockResolvedValue('Deploy the application to production.\n\nMore details here.');

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();

      expect(result[0].name).toBe('deploy');
    });

    it('should extract description from first paragraph of content', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['test-cmd.md']);
      mockReadFile.mockResolvedValue('Runs the test suite for the project.\n\nAdditional info here.');

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();

      expect(result[0].description).toBe('Runs the test suite for the project.');
    });

    it('should handle content with single line (no double newline)', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['single-line.md']);
      mockReadFile.mockResolvedValue('Just one line of description.');

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();

      expect(result[0].description).toBe('Just one line of description.');
    });

    it('should handle empty file content', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['empty.md']);
      mockReadFile.mockResolvedValue('');

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();

      expect(result[0].description).toBe('');
    });

    it('should set location correctly for command files', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['build.md']);
      mockReadFile.mockResolvedValue('Build command description.');

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();

      expect(result[0].location).toBe('.claude/commands/build.md');
    });

    it('should sort commands alphabetically by name', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['zebra.md', 'alpha.md', 'mid.md']);
      mockReadFile.mockImplementation(async (p: string) => {
        const name = p.split('/').pop()!.replace('.md', '');
        return `${name} description.`;
      });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();

      expect(result.map((c) => c.name)).toEqual(['alpha', 'mid', 'zebra']);
    });

    it('should process multiple .md files and skip README.md and non-md', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['README.md', 'build.md', 'deploy.md', 'notes.txt']);
      mockReadFile.mockImplementation(async (p: string) => {
        const name = p.split('/').pop()!.replace('.md', '');
        return `${name} command.`;
      });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.name)).toEqual(['build', 'deploy']);
    });

    it('should handle file where first paragraph is a heading', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['heading-first.md']);
      mockReadFile.mockResolvedValue('# Heading First\n\nActual description.');

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractCommands();

      // The regex /^(.+?)(?:\n\n|$)/ captures everything up to first \n\n
      // So it captures "# Heading First"
      expect(result[0].description).toBe('# Heading First');
    });
  });

  // =========================================================================
  // extractYAMLFrontmatter (tested indirectly through extractSkills)
  // =========================================================================
  describe('extractYAMLFrontmatter (via extractSkills)', () => {
    it('should return null for content without frontmatter delimiters', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['no-front']);
      mockReadFile.mockResolvedValue('No frontmatter at all. Just text.');

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
      // YAML.parse should not have been called
      expect(mockYAMLParse).not.toHaveBeenCalled();
    });

    it('should return null for content with only opening delimiter', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['half-front']);
      mockReadFile.mockResolvedValue('---\nname: test\nNo closing delimiter');

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
      expect(mockYAMLParse).not.toHaveBeenCalled();
    });

    it('should parse valid YAML between delimiters', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['valid']);
      mockReadFile.mockResolvedValue('---\nname: test\ndescription: A test\ntags:\n  - a\n  - b\n---\n');
      mockYAMLParse.mockReturnValue({ name: 'test', description: 'A test', tags: ['a', 'b'] });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();

      expect(mockYAMLParse).toHaveBeenCalledWith('name: test\ndescription: A test\ntags:\n  - a\n  - b');
      expect(result).toHaveLength(1);
    });

    it('should return null when YAML.parse throws', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['throws']);
      mockReadFile.mockResolvedValue('---\n{invalid\n---\n');
      mockYAMLParse.mockImplementation(() => {
        throw new SyntaxError('Invalid YAML');
      });

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      expect(result).toEqual([]);
    });

    it('should handle frontmatter with empty content between delimiters', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReaddir.mockResolvedValue(['empty-fm']);
      // The regex is /^---\n([\s\S]*?)\n---/ — there must be at least one \n between --- markers
      // "---\n\n---" has content = "" (empty string)
      mockReadFile.mockResolvedValue('---\n\n---\n');
      mockYAMLParse.mockReturnValue(null);

      const gen = new DocGenerator('/skills', '/agents', '/commands');
      const result = await gen.extractSkills();
      // YAML.parse(empty) returns null, then metadata is null, so skill is skipped
      expect(result).toEqual([]);
    });
  });
});
