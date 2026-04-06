/**
 * Integration tests for skill memory loading architecture
 *
 * ARCHITECTURE (instruction-based, post v1.0.254+):
 * Skill memories are loaded via plain LLM instructions in SKILL.md.
 * Each SKILL.md has a `## Project Overrides` section with an instruction:
 *   **Skill Memories**: If `.specweave/skill-memories/{skill}.md` exists, read and apply its learnings.
 *
 * The skill-memories.sh script has been deleted. DCI shell commands (`!` backtick)
 * are no longer used for skill memory loading.
 *
 * Tests that:
 * 1. All invocable SKILL.md files have instruction-based memory references
 * 2. Instruction skill name matches the directory name
 * 3. No SKILL.md files use DCI shell commands for skill-memories
 * 4. Legacy cat instructions are absent
 * 5. CLAUDE.md Skill Memories section exists
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

describe('Skill memory loading architecture', () => {
  const pluginsDir = path.join(process.cwd(), 'plugins/specweave/skills');
  // Skills that should have instruction-based memory loading (user-invocable or referenced by other skills)
  // Note: code-simplifier, security, security-patterns migrated to vskill repo
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

  describe('instruction-based skill memory loading', () => {
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

    it('all invocable skills should have instruction-based skill memory reference', () => {
      const missing: string[] = [];

      for (const { skill, dir } of DCI_SKILLS) {
        const filePath = path.join(dir, skill, 'SKILL.md');
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Must have the instruction format: **Skill Memories**: ... read and apply ...
        if (!content.match(/Skill Memories.*read and apply/)) {
          missing.push(skill);
        }
      }

      expect(missing).toEqual([]);
    });

    it('skill-memories.sh script should not exist (deleted)', () => {
      const scriptPath = path.join(process.cwd(), 'plugins/specweave/scripts/skill-memories.sh');
      expect(fs.existsSync(scriptPath)).toBe(false);
    });

    it('instruction skill name should match the skill directory name', () => {
      const mismatches: string[] = [];

      for (const { skill, dir } of DCI_SKILLS) {
        const filePath = path.join(dir, skill, 'SKILL.md');
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Extract the skill name from the instruction: skill-memories/{name}.md
        const match = content.match(/skill-memories\/(\S+)\.md/);
        if (!match) {
          mismatches.push(`${skill} (no skill-memories reference found)`);
        } else if (match[1] !== skill) {
          mismatches.push(`${skill} (references "${match[1]}" instead of "${skill}")`);
        }
      }

      expect(mismatches).toEqual([]);
    });

    it('no SKILL.md files should use DCI for skill-memories', () => {
      const skillFiles = getSkillFiles();
      const violations: string[] = [];

      for (const filePath of skillFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const skillName = path.basename(path.dirname(filePath));

        // Check for old DCI formats: !`...skill-memories...` or skill-memories.sh
        if (content.match(/^!\`.*skill-memories/m) || content.includes('skill-memories.sh')) {
          violations.push(skillName);
        }
      }

      expect(violations).toEqual([]);
    });

    it('all DCI blocks should use || true for graceful degradation', () => {
      const skillFiles = getSkillFiles();
      const commandsDir = path.join(process.cwd(), 'plugins/specweave/commands');
      const commandFiles = fs.existsSync(commandsDir)
        ? glob.sync(path.join(commandsDir, '*.md'))
        : [];
      const allFiles = [...skillFiles, ...commandFiles];
      const violations: string[] = [];

      for (const filePath of allFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const name = path.basename(filePath, '.md');

        // Find DCI blocks referencing .specweave/scripts/
        const dciMatches = content.match(/!`\.specweave\/scripts\/[^`]+`/g);
        if (dciMatches) {
          for (const dci of dciMatches) {
            if (!dci.includes('|| true')) {
              violations.push(`${name}: ${dci}`);
            }
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('no DCI blocks should use legacy inline format', () => {
      const legacyFormat: string[] = [];

      for (const { skill, dir } of DCI_SKILLS) {
        const filePath = path.join(dir, skill, 'SKILL.md');
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Old format: !`s="skill"; for d in ...`
        if (content.includes('!`s=')) {
          legacyFormat.push(skill);
        }
      }

      expect(legacyFormat).toEqual([]);
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
