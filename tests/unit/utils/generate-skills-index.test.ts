/**
 * Skills Index Generator Tests
 *
 * Tests for:
 * - parseSkillMetadata (via generateSkillsIndex)
 * - categorizeSkill (via parseSkillMetadata)
 * - generateIndexMarkdown (via generateSkillsIndex)
 * - generateSkillsIndex main function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockExistsSync, mockReaddirSync, mockStatSync, mockReadFileSync, mockWriteFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockStatSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

vi.mock('js-yaml', () => ({
  load: vi.fn((yamlStr: string) => {
    // Simple YAML parser for test scenarios
    const result: Record<string, any> = {};
    const lines = yamlStr.split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value: any = line.substring(colonIndex + 1).trim();
        // Handle arrays (simple inline form)
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
        }
        // Remove quotes
        if (typeof value === 'string') {
          value = value.replace(/^["']|["']$/g, '');
        }
        if (key === 'allowed-tools') {
          result['allowed-tools'] = value;
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }),
}));

import { generateSkillsIndex } from '../../../src/utils/generate-skills-index.js';

describe('generate-skills-index', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('generateSkillsIndex', () => {
    it('should throw if skills directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(generateSkillsIndex('/output/SKILLS-INDEX.md')).rejects.toThrow(
        'Skills directory not found'
      );
    });

    it('should generate index from skills directory', async () => {
      // Skills dir exists
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('SKILL.md')) return true;
        return true; // skills dir exists
      });

      mockReaddirSync.mockReturnValue(['increment-planner', 'grill']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('increment-planner')) {
          return `---
name: increment-planner
description: Plans increments for features. Activates for: feature planning, create increment.
---
# Increment Planner
Full skill content.`;
        }
        if (p.includes('grill')) {
          return `---
name: grill
description: Quality validation. Activates for: quality check, validation.
---
# Grill
Quality validation skill.`;
        }
        return '';
      });

      await generateSkillsIndex('/tmp/SKILLS-INDEX.md');

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;

      expect(writtenContent).toContain('SpecWeave Skills Index');
      expect(writtenContent).toContain('increment-planner');
      expect(writtenContent).toContain('grill');
      expect(writtenContent).toContain('Total Skills**: 2');
    });

    it('should use default output path when none provided', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue([]);

      await generateSkillsIndex();

      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      const outputPath = mockWriteFileSync.mock.calls[0][0] as string;
      expect(outputPath).toContain('SKILLS-INDEX.md');
    });

    it('should skip non-directory entries', async () => {
      mockExistsSync.mockReturnValue(true);

      mockReaddirSync.mockReturnValue(['some-file.txt', 'real-skill']);
      mockStatSync.mockImplementation((p: string) => ({
        isDirectory: () => p.includes('real-skill'),
      }));

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('real-skill')) {
          return `---
name: real-skill
description: A real skill for testing.
---
# Real Skill`;
        }
        return '';
      });

      await generateSkillsIndex('/tmp/output.md');

      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('Total Skills**: 1');
    });

    it('should skip skills without SKILL.md', async () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.includes('empty-dir/SKILL.md')) return false;
        return true;
      });

      mockReaddirSync.mockReturnValue(['empty-dir']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      await generateSkillsIndex('/tmp/output.md');

      const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('Total Skills**: 0');
    });

    it('should skip skills with missing name or description', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['bad-skill']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      mockReadFileSync.mockReturnValue(`---
name: only-name
---
# Skill`);

      await generateSkillsIndex('/tmp/output.md');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing name or description')
      );
    });

    it('should skip skills without frontmatter', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['no-frontmatter']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      mockReadFileSync.mockReturnValue('# No Frontmatter\nJust content.');

      await generateSkillsIndex('/tmp/output.md');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No frontmatter found')
      );
    });
  });

  describe('categorizeSkill (via generated output)', () => {
    function setupSingleSkill(name: string, description: string): void {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['test-skill']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      mockReadFileSync.mockReturnValue(`---
name: ${name}
description: ${description}
---
# Skill`);
    }

    it('should categorize framework skills', async () => {
      setupSingleSkill('sw-increment-planner', 'Plans increments for features.');
      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('Framework Core');
    });

    it('should categorize integration skills', async () => {
      setupSingleSkill('jira-sync', 'Syncs with JIRA.');
      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('External Integrations');
    });

    it('should categorize architecture skills', async () => {
      setupSingleSkill('diagrams-architect', 'Generates architecture diagrams.');
      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('Architecture & Design');
    });

    it('should categorize development skills', async () => {
      setupSingleSkill('frontend-react', 'React frontend development.');
      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('Development');
    });

    it('should categorize quality/testing skills', async () => {
      setupSingleSkill('e2e-playwright', 'End-to-end testing with Playwright.');
      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('Quality & Testing');
    });

    it('should categorize infrastructure skills', async () => {
      setupSingleSkill('hetzner-provisioner', 'Infrastructure provisioning.');
      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('Infrastructure');
    });

    it('should categorize documentation skills', async () => {
      setupSingleSkill('docusaurus-gen', 'Generates documentation site.');
      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('Documentation');
    });

    it('should categorize orchestration skills', async () => {
      setupSingleSkill('role-orchestrator', 'Coordinates multi-agent workflows.');
      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('Orchestration & Planning');
    });

    it('should default to Other for unrecognized skills', async () => {
      setupSingleSkill('random-tool', 'Does something unique.');
      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('Other');
    });
  });

  describe('parseSkillMetadata - activation keywords extraction', () => {
    it('should extract activation keywords from description', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['test-skill']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      mockReadFileSync.mockReturnValue(`---
name: test-skill
description: Manages features. Activates for: feature planning, create increment, roadmap.
---
# Test Skill`);

      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('feature planning');
      expect(content).toContain('create increment');
      expect(content).toContain('roadmap');
    });

    it('should handle descriptions without activation keywords', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['test-skill']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      mockReadFileSync.mockReturnValue(`---
name: simple-skill
description: A simple skill with no keywords.
---
# Simple Skill`);

      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('simple-skill');
      // Should not have "Activates for" if no keywords extracted
      // The skill will be listed but without activation keywords line
      expect(content).not.toContain('Activates for**:');
    });
  });

  describe('generateIndexMarkdown - allowed tools', () => {
    it('should display allowed tools when provided as array', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['test-skill']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      mockReadFileSync.mockReturnValue(`---
name: tool-skill
description: A skill with tools.
allowed-tools: [Read, Write, Bash]
---
# Tool Skill`);

      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      expect(content).toContain('Allowed tools');
    });
  });

  describe('generateIndexMarkdown - structure', () => {
    it('should contain required sections', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['skill-a']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      mockReadFileSync.mockReturnValue(`---
name: skill-a
description: A test skill.
---
# Skill A`);

      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;

      expect(content).toContain('Quick Start');
      expect(content).toContain('Progressive Disclosure');
      expect(content).toContain('All Available Skills');
      expect(content).toContain('How Skills Work');
      expect(content).toContain('Task → Skill Matching Guide');
      expect(content).toContain('Why Skills Matter');
      expect(content).toContain('For AI Tool Developers');
      expect(content).toContain('Last Updated');
    });

    it('should sort skills alphabetically within categories', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['b-skill', 'a-skill']);
      mockStatSync.mockReturnValue({ isDirectory: () => true });

      mockReadFileSync.mockImplementation((p: string) => {
        if (p.includes('b-skill')) {
          return `---
name: z-random-b
description: Second skill, unrecognized category.
---
# B`;
        }
        if (p.includes('a-skill')) {
          return `---
name: a-random-a
description: First skill, unrecognized category.
---
# A`;
        }
        return '';
      });

      await generateSkillsIndex('/tmp/output.md');

      const content = mockWriteFileSync.mock.calls[0][1] as string;
      const aIndex = content.indexOf('a-random-a');
      const bIndex = content.indexOf('z-random-b');
      expect(aIndex).toBeLessThan(bIndex);
    });
  });
});
