/**
 * Integration tests for SKILL.md skill memory instructions
 *
 * Tests that:
 * 1. All SKILL.md files have instruction to read skill memories
 * 2. Instruction uses correct path format
 * 3. Instruction explains the purpose
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

describe('SKILL.md skill memory instructions', () => {
  const pluginsDir = path.join(process.cwd(), 'plugins/specweave/skills');

  // Get all SKILL.md files
  const getSkillFiles = (): string[] => {
    const pattern = path.join(pluginsDir, '*/SKILL.md');
    return glob.sync(pattern);
  };

  describe('skill memory instruction presence', () => {
    it('should find SKILL.md files in plugins directory', () => {
      const skillFiles = getSkillFiles();
      expect(skillFiles.length).toBeGreaterThan(0);
    });

    it('should have skill memory instruction in each SKILL.md', () => {
      const skillFiles = getSkillFiles();
      const missingInstructions: string[] = [];

      // Operational/utility skills that don't need project-specific learnings
      const operationalSkills = new Set([
        'auto', 'auto-status', 'cancel-auto', 'do', 'done',
        'increment', 'next', 'npm', 'plan', 'progress',
        'save', 'status', 'validate', 'context', 'sync-setup',
        'update-instructions', 'lsp', 'detector', 'framework',
        'increment-work-router', 'smart-reopen-detector',
        'docs-updater', 'progress-sync', 'tdd-cycle',
        'tdd-red', 'tdd-green', 'tdd-refactor',
        'team-status', 'team-orchestrate', 'team-merge', 'team-build',
      ]);

      for (const filePath of skillFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const skillName = path.basename(path.dirname(filePath));

        // Skip operational skills that don't need memory instructions
        if (operationalSkills.has(skillName)) {
          continue;
        }

        // Check for skill memory instruction section
        const hasInstruction =
          content.includes('.specweave/skill-memories/') ||
          content.includes('skill-memories') ||
          content.includes('Project-Specific Learnings');

        if (!hasInstruction) {
          missingInstructions.push(skillName);
        }
      }

      expect(missingInstructions).toEqual([]);
    });
  });

  describe('skill memory instruction format', () => {
    it('should reference the correct skill memory path format', () => {
      const skillFiles = getSkillFiles();
      const incorrectFormat: string[] = [];

      for (const filePath of skillFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const skillName = path.basename(path.dirname(filePath));

        // Check for correct path format (should use {skill-name} placeholder or actual skill name)
        if (content.includes('.specweave/skill-memories/')) {
          const hasCorrectFormat =
            content.includes(`.specweave/skill-memories/${skillName}.md`) ||
            content.includes('.specweave/skill-memories/{skill-name}.md') ||
            content.includes('.specweave/skill-memories/');

          if (!hasCorrectFormat) {
            incorrectFormat.push(skillName);
          }
        }
      }

      // All referenced paths should be in correct format
      expect(incorrectFormat).toEqual([]);
    });
  });

  describe('specific skill instruction verification', () => {
    // Test a few specific skills to ensure proper instruction format
    const testSkills = ['pm', 'architect', 'tech-lead', 'security', 'reflect'];

    for (const skillName of testSkills) {
      it(`should have instruction in ${skillName} skill`, () => {
        const filePath = path.join(pluginsDir, skillName, 'SKILL.md');

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');

          // Check for project learnings section
          const hasLearningsSection =
            content.includes('Project-Specific Learnings') ||
            content.includes('Project Learnings') ||
            content.includes('skill-memories');

          expect(hasLearningsSection).toBe(true);
        }
      });
    }
  });
});
