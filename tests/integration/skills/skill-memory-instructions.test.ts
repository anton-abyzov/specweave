/**
 * Integration tests for skill memory loading architecture
 *
 * ARCHITECTURE (v1.0.198+):
 * Skill memories are loaded by the user-prompt-submit.sh hook via
 * get_skill_memory_context(). SKILL.md files no longer contain
 * `cat .specweave/skill-memories/` instructions. The hook injects
 * skill memory content automatically when a skill is invoked.
 *
 * Tests that:
 * 1. The hook-based loading function exists in user-prompt-submit.sh
 * 2. SKILL.md files do NOT contain legacy cat instructions (cleanup verified)
 * 3. CLAUDE.md Skill Memories section exists (auto-loaded by Claude Code)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

describe('Skill memory loading architecture', () => {
  const pluginsDir = path.join(process.cwd(), 'plugins/specweave/skills');
  const hooksDir = path.join(process.cwd(), 'plugins/specweave/hooks');

  // Get all SKILL.md files
  const getSkillFiles = (): string[] => {
    const pattern = path.join(pluginsDir, '*/SKILL.md');
    return glob.sync(pattern);
  };

  describe('hook-based skill memory loading', () => {
    it('should find SKILL.md files in plugins directory', () => {
      const skillFiles = getSkillFiles();
      expect(skillFiles.length).toBeGreaterThan(0);
    });

    it('user-prompt-submit.sh should have get_skill_memory_context function', () => {
      const hookPath = path.join(hooksDir, 'user-prompt-submit.sh');
      expect(fs.existsSync(hookPath)).toBe(true);

      const content = fs.readFileSync(hookPath, 'utf-8');
      expect(content).toContain('get_skill_memory_context()');
    });

    it('hook should inject skill memory during skill invocation', () => {
      const hookPath = path.join(hooksDir, 'user-prompt-submit.sh');
      const content = fs.readFileSync(hookPath, 'utf-8');

      // The hook calls get_skill_memory_context when a skill is invoked
      expect(content).toContain('SKILL_MEMORY_RAW=$(get_skill_memory_context');
    });

    it('hook should read from .specweave/skill-memories/ directory', () => {
      const hookPath = path.join(hooksDir, 'user-prompt-submit.sh');
      const content = fs.readFileSync(hookPath, 'utf-8');

      // The function reads skill memory files from the correct directory
      expect(content).toContain('skill-memories');
    });
  });

  describe('legacy cat instructions removed from SKILL.md files', () => {
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

      // No SKILL.md should have legacy cat instructions (handled by hooks now)
      expect(legacyInstructions).toEqual([]);
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
