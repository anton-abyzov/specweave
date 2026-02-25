/**
 * Unit tests for Skill Naming Convention Verification
 *
 * Verifies that:
 * 1. FQN (Fully Qualified Name) is built from directory names, not frontmatter
 * 2. No double-prefixing occurs (sw:sw:pm is WRONG)
 * 3. Skill names follow official Claude Code conventions
 *
 * Official convention (per https://code.claude.com/docs/en/skills):
 * - Plugin name from plugin.json `name` field
 * - Skill name from DIRECTORY name (not frontmatter `name`)
 * - FQN format: `{plugin}:{skill}` e.g., `sw:pm`, `frontend:architect`
 *
 * @see ADR for skill naming standardization
 * @since 1.0.217
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import * as fs from '../../../../src/utils/fs-native.js';
import { SkillTriggerExtractor } from '../../../../src/core/plugins/skill-trigger-extractor.js';

describe('Skill Naming Convention', () => {
  let testDir: string;
  let extractor: SkillTriggerExtractor;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `skill-naming-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.ensureDir(testDir);
    extractor = new SkillTriggerExtractor();
  });

  afterEach(async () => {
    if (testDir && await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('FQN Construction from Directory Names', () => {
    it('should use directory name for skill, not frontmatter name', async () => {
      // Create plugin structure: specweave/skills/pm/SKILL.md
      const pluginDir = path.join(testDir, 'specweave');
      const skillDir = path.join(pluginDir, 'skills', 'pm');
      await fs.ensureDir(skillDir);

      // SKILL.md has WRONG name with prefix (sw:pm), but directory is correct (pm)
      const skillContent = `---
name: sw:pm
description: Product Manager skill
---

# PM Skill
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      // Create plugin.json
      await fs.ensureDir(path.join(pluginDir, '.claude-plugin'));
      await fs.writeJSON(path.join(pluginDir, '.claude-plugin', 'plugin.json'), {
        name: 'sw',
        description: 'SpecWeave core plugin'
      });

      // Extract triggers from the plugin
      const triggers = await extractor.scanAllPlugins(testDir);

      // Should have extracted one skill
      expect(triggers).toHaveLength(1);
      expect(triggers[0].name).toBe('pm'); // Directory name, NOT frontmatter sw:pm
      expect(triggers[0].plugin).toBe('specweave'); // Directory name of plugin

      // Build index and check FQN
      const index = extractor.buildIndex(triggers);
      const fqnKeys = Object.keys(index.skills);

      // FQN should be specweave:pm (directory names)
      // NOT specweave:sw:pm (which would be double-prefixed)
      expect(fqnKeys).toContain('specweave:pm');
      expect(fqnKeys).not.toContain('specweave:sw:pm');
      expect(fqnKeys).not.toContain('sw:sw:pm');
    });

    it('should build correct FQN for domain plugin skills', async () => {
      // Create plugin structure: frontend/skills/architect/SKILL.md
      const pluginDir = path.join(testDir, 'frontend');
      const skillDir = path.join(pluginDir, 'skills', 'architect');
      await fs.ensureDir(skillDir);

      // Correctly formatted skill (no prefix in frontmatter)
      const skillContent = `---
name: architect
description: Frontend architecture skill
---

# Frontend Architect
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      await fs.ensureDir(path.join(pluginDir, '.claude-plugin'));
      await fs.writeJSON(path.join(pluginDir, '.claude-plugin', 'plugin.json'), {
        name: 'frontend',
        description: 'Frontend plugin'
      });

      const triggers = await extractor.scanAllPlugins(testDir);
      const index = extractor.buildIndex(triggers);

      // FQN should be frontend:architect (directory names)
      expect(Object.keys(index.skills)).toContain('frontend:architect');
    });

    it('should NOT double-prefix when frontmatter has prefix', async () => {
      // This tests the BUG scenario: frontmatter has sw: prefix but shouldn't
      const pluginDir = path.join(testDir, 'specweave');
      const skillDir = path.join(pluginDir, 'skills', 'architect');
      await fs.ensureDir(skillDir);

      // BUGGY format: frontmatter has sw:architect but dir is just architect
      const skillContent = `---
name: sw:architect
description: System Architect skill
---

# Architect
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      await fs.ensureDir(path.join(pluginDir, '.claude-plugin'));
      await fs.writeJSON(path.join(pluginDir, '.claude-plugin', 'plugin.json'), {
        name: 'sw',
        description: 'SpecWeave core plugin'
      });

      const triggers = await extractor.scanAllPlugins(testDir);
      const index = extractor.buildIndex(triggers);

      // Our implementation uses directory names, so FQN is specweave:architect
      // NOT specweave:sw:architect (double prefix)
      expect(Object.keys(index.skills)).toContain('specweave:architect');
      expect(Object.keys(index.skills)).not.toContain('specweave:sw:architect');
      expect(Object.keys(index.skills)).not.toContain('sw:sw:architect');
    });
  });

  describe('Official Convention Compliance', () => {
    it('should match official Anthropic skill naming pattern', async () => {
      // Official pattern: skill name = directory name (kebab-case, no prefix)
      const pluginDir = path.join(testDir, 'my-plugin');
      const skillDir = path.join(pluginDir, 'skills', 'code-reviewer');
      await fs.ensureDir(skillDir);

      // Correctly formatted per official docs
      const skillContent = `---
name: code-reviewer
description: Reviews code for best practices
---

# Code Reviewer
`;
      await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillContent);

      await fs.ensureDir(path.join(pluginDir, '.claude-plugin'));
      await fs.writeJSON(path.join(pluginDir, '.claude-plugin', 'plugin.json'), {
        name: 'my-plugin',
        description: 'Test plugin'
      });

      const triggers = await extractor.scanAllPlugins(testDir);

      expect(triggers[0].name).toBe('code-reviewer');
      expect(triggers[0].plugin).toBe('my-plugin');

      const index = extractor.buildIndex(triggers);
      expect(index.skills['my-plugin:code-reviewer']).toBeDefined();
    });
  });

  describe('Multiple Skills Across Plugins', () => {
    it('should correctly namespace skills from different plugins', async () => {
      // Create two plugins with skills
      const plugins = [
        { dir: 'specweave', name: 'sw', skills: ['pm', 'architect'] },
        { dir: 'frontend', name: 'frontend', skills: ['nextjs', 'architect'] }
      ];

      for (const plugin of plugins) {
        const pluginDir = path.join(testDir, plugin.dir);

        for (const skill of plugin.skills) {
          const skillDir = path.join(pluginDir, 'skills', skill);
          await fs.ensureDir(skillDir);

          await fs.writeFile(
            path.join(skillDir, 'SKILL.md'),
            `---
name: ${skill}
description: ${skill} skill
---

# ${skill}
`
          );
        }

        await fs.ensureDir(path.join(pluginDir, '.claude-plugin'));
        await fs.writeJSON(path.join(pluginDir, '.claude-plugin', 'plugin.json'), {
          name: plugin.name,
          description: `${plugin.name} plugin`
        });
      }

      const triggers = await extractor.scanAllPlugins(testDir);
      const index = extractor.buildIndex(triggers);

      // Verify all FQNs are correct (directory-based)
      expect(Object.keys(index.skills)).toEqual(
        expect.arrayContaining([
          'specweave:pm',
          'specweave:architect',
          'frontend:nextjs',
          'frontend:architect'
        ])
      );

      // No double prefixes
      const fqnKeys = Object.keys(index.skills);
      for (const fqn of fqnKeys) {
        const colonCount = (fqn.match(/:/g) || []).length;
        expect(colonCount).toBe(1); // Only one colon separator
      }
    });
  });
});
