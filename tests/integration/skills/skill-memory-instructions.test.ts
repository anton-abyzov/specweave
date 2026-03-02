/**
 * Integration tests for skill memory loading architecture
 *
 * ARCHITECTURE (DCI-based, v1.0.254+):
 * Skill memories are loaded via Dynamic Context Injection (DCI) in SKILL.md.
 * Each SKILL.md has a `## Project Overrides` section with a `!`command`` one-liner
 * that cascades through 3 directories (first-match-wins):
 *   1. .specweave/skill-memories/{skill}.md
 *   2. .claude/skill-memories/{skill}.md
 *   3. ~/.claude/skill-memories/{skill}.md
 *
 * Tests that:
 * 1. All invocable SKILL.md files have DCI blocks
 * 2. DCI skill name matches the directory name
 * 3. Legacy cat instructions are absent
 * 4. CLAUDE.md Skill Memories section exists
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

describe('Skill memory loading architecture', () => {
  const pluginsDir = path.join(process.cwd(), 'plugins/specweave/skills');
  // Skills that should have DCI blocks (user-invocable or referenced by other skills)
  // Note: code-simplifier, security, security-patterns migrated to vskill repo
  // and no longer use the specweave DCI pattern
  // Note: cancel-auto, docs, docs-updater, framework, lsp, progress, save
  // were moved to other repos or renamed and no longer exist in this plugins dir.
  const DCI_SKILLS = [
    'architect', 'auto', 'do', 'done', 'grill', 'increment',
    'pm', 'tdd-cycle', 'tdd-green', 'tdd-red', 'validate',
  ].map(s => ({ skill: s, dir: pluginsDir }));

  // Get all SKILL.md files
  const getSkillFiles = (): string[] => {
    const pattern = path.join(pluginsDir, '*/SKILL.md');
    return glob.sync(pattern);
  };

  describe('DCI-based skill memory loading', () => {
    it('should find SKILL.md files in plugins directory', () => {
      const skillFiles = getSkillFiles();
      expect(skillFiles.length).toBeGreaterThan(0);
    });

    it('all invocable skills should have ## Project Overrides section', () => {
      const missing: string[] = [];

      for (const { skill, dir } of DCI_SKILLS) {
        const filePath = path.join(dir, skill, 'SKILL.md');
        if (!fs.existsSync(filePath)) {
          missing.push(`${skill} (file not found)`);
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        if (!content.includes('## Project Overrides')) {
          missing.push(skill);
        }
      }

      expect(missing).toEqual([]);
    });

    it('all DCI blocks should have the cascading lookup pattern', () => {
      const missing: string[] = [];

      for (const { skill, dir } of DCI_SKILLS) {
        const filePath = path.join(dir, skill, 'SKILL.md');
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Must have the DCI inline command with cascade
        if (!content.includes('.specweave/skill-memories') ||
            !content.includes('.claude/skill-memories') ||
            !content.includes('$HOME/.claude/skill-memories')) {
          missing.push(skill);
        }
      }

      expect(missing).toEqual([]);
    });

    it('DCI s= value should match the skill directory name', () => {
      const mismatches: string[] = [];

      for (const { skill, dir } of DCI_SKILLS) {
        const filePath = path.join(dir, skill, 'SKILL.md');
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract the s= value from the DCI one-liner
        const match = content.match(/s="([^"]+)"/);
        if (!match) {
          mismatches.push(`${skill} (no s= found)`);
        } else if (match[1] !== skill) {
          mismatches.push(`${skill} (s="${match[1]}" != "${skill}")`);
        }
      }

      expect(mismatches).toEqual([]);
    });

    it('DCI blocks should use awk for cross-platform compatibility', () => {
      const usingSed: string[] = [];

      for (const { skill, dir } of DCI_SKILLS) {
        const filePath = path.join(dir, skill, 'SKILL.md');
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract the DCI line
        const dciLine = content.split('\n').find(l => l.includes('!`s='));
        if (dciLine && !dciLine.includes('awk')) {
          usingSed.push(skill);
        }
      }

      expect(usingSed).toEqual([]);
    });
  });

  describe('legacy instructions removed', () => {
    it('no SKILL.md should contain cat .specweave/skill-memories/ instructions', () => {
      const skillFiles = getSkillFiles();
      const legacyInstructions: string[] = [];

      for (const filePath of skillFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const skillName = path.basename(path.dirname(filePath));

        if (content.includes('cat .specweave/skill-memories/')) {
          legacyInstructions.push(skillName);
        }
      }

      expect(legacyInstructions).toEqual([]);
    });
  });

  describe('hook should NOT contain memory injection', () => {
    it('user-prompt-submit.sh should not have get_skill_memory_context', () => {
      const hookPath = path.join(process.cwd(), 'plugins/specweave/hooks/user-prompt-submit.sh');
      if (!fs.existsSync(hookPath)) return;

      const content = fs.readFileSync(hookPath, 'utf-8');
      expect(content).not.toContain('get_skill_memory_context');
    });

    it('user-prompt-submit.sh should not have SKILL_MEMORY_RAW', () => {
      const hookPath = path.join(process.cwd(), 'plugins/specweave/hooks/user-prompt-submit.sh');
      if (!fs.existsSync(hookPath)) return;

      const content = fs.readFileSync(hookPath, 'utf-8');
      expect(content).not.toContain('SKILL_MEMORY_RAW');
    });
  });

  describe('CLAUDE.md skill memories section', () => {
    it('CLAUDE.md should have Skill Memories section for auto-loading', () => {
      const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');

      if (fs.existsSync(claudeMdPath)) {
        const content = fs.readFileSync(claudeMdPath, 'utf-8');
        expect(content).toContain('Skill Memories');
      }
    });
  });
});
