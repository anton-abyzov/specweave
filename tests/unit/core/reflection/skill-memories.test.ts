/**
 * Unit tests for skill-specific memory files
 *
 * Tests that learnings are written to both:
 * 1. CLAUDE.md Skill Memories section
 * 2. .specweave/skill-memories/{skill-name}.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import the module under test
import {
  writeSkillMemoryFile,
  readSkillMemoryFile,
  SKILL_MEMORY_DIR,
  generateSkillMemoryContent,
  readAllSkillMemories,
  pruneSkillMemories,
  formatMemoriesForPrompt,
} from '../../../../src/core/reflection/skill-memories.js';

describe('skill-memories', () => {
  let tempDir: string;
  let skillMemoriesDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-mem-test-'));
    skillMemoriesDir = path.join(tempDir, '.specweave', 'skill-memories');
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('writeSkillMemoryFile', () => {
    it('should create skill-memories directory if not exists', () => {
      const learning = {
        skill: 'frontend',
        learning: 'Always use Button from design system',
      };

      writeSkillMemoryFile(tempDir, learning);

      expect(fs.existsSync(skillMemoriesDir)).toBe(true);
    });

    it('should create skill-specific memory file', () => {
      const learning = {
        skill: 'frontend',
        learning: 'Always use Button from design system',
      };

      writeSkillMemoryFile(tempDir, learning);

      const filePath = path.join(skillMemoriesDir, 'frontend.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should include learning with date prefix', () => {
      const learning = {
        skill: 'backend',
        learning: 'Use connection pooling for PostgreSQL',
      };

      writeSkillMemoryFile(tempDir, learning);

      const filePath = path.join(skillMemoriesDir, 'backend.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('## Learnings');
      expect(content).toContain('Use connection pooling for PostgreSQL');
      // Should have date prefix like **2026-01-31**
      expect(content).toMatch(/\*\*\d{4}-\d{2}-\d{2}\*\*/);
    });

    it('should append to existing file without duplicating header', () => {
      const learning1 = { skill: 'testing', learning: 'Use snapshot tests for UI' };
      const learning2 = { skill: 'testing', learning: 'Mock external APIs' };

      writeSkillMemoryFile(tempDir, learning1);
      writeSkillMemoryFile(tempDir, learning2);

      const filePath = path.join(skillMemoriesDir, 'testing.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should have only one header
      const headerCount = (content.match(/# Testing Memory/g) || []).length;
      expect(headerCount).toBe(1);

      // Should have both learnings
      expect(content).toContain('Use snapshot tests for UI');
      expect(content).toContain('Mock external APIs');
    });

    it('should handle hyphenated skill names', () => {
      const learning = {
        skill: 'tech-lead',
        learning: 'Review PRs within 24 hours',
      };

      writeSkillMemoryFile(tempDir, learning);

      const filePath = path.join(skillMemoriesDir, 'tech-lead.md');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Tech Lead Memory');
    });
  });

  describe('readSkillMemoryFile', () => {
    it('should return empty array if file does not exist', () => {
      const learnings = readSkillMemoryFile(tempDir, 'nonexistent');
      expect(learnings).toEqual([]);
    });

    it('should parse existing learnings from file', () => {
      // Create a file with learnings
      fs.mkdirSync(skillMemoriesDir, { recursive: true });
      const content = `# Frontend Memory

<!-- Project-specific learnings -->

## Learnings

- **2026-01-30**: Use Button from design system
- **2026-01-31**: Prefer Tailwind over CSS modules
`;
      fs.writeFileSync(path.join(skillMemoriesDir, 'frontend.md'), content);

      const learnings = readSkillMemoryFile(tempDir, 'frontend');

      expect(learnings).toHaveLength(2);
      expect(learnings).toContain('Use Button from design system');
      expect(learnings).toContain('Prefer Tailwind over CSS modules');
    });
  });

  describe('generateSkillMemoryContent', () => {
    it('should generate valid markdown for new file', () => {
      const content = generateSkillMemoryContent('frontend', [
        'Use Button from design system',
      ]);

      expect(content).toContain('# Frontend Memory');
      expect(content).toContain('<!-- Project-specific learnings');
      expect(content).toContain('## Learnings');
      expect(content).toContain('Use Button from design system');
    });

    it('should capitalize skill name in title', () => {
      const content = generateSkillMemoryContent('qa-lead', ['Test the happy path first']);

      expect(content).toContain('# Qa Lead Memory');
    });
  });

  describe('duplicate detection', () => {
    it('should not add duplicate learnings', () => {
      const learning = { skill: 'frontend', learning: 'Use Button from design system' };

      // Write twice
      writeSkillMemoryFile(tempDir, learning);
      writeSkillMemoryFile(tempDir, learning);

      const filePath = path.join(skillMemoriesDir, 'frontend.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Count occurrences - should be exactly 1
      const matches = content.match(/Use Button from design system/g) || [];
      expect(matches.length).toBe(1);
    });

    it('should detect case-insensitive duplicates', () => {
      writeSkillMemoryFile(tempDir, {
        skill: 'frontend',
        learning: 'Use Button from design system',
      });
      writeSkillMemoryFile(tempDir, {
        skill: 'frontend',
        learning: 'use button from design system', // lowercase
      });

      const filePath = path.join(skillMemoriesDir, 'frontend.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Should only have one learning (case-insensitive dedup)
      const learningLines = content.split('\n').filter((l) => l.startsWith('- **'));
      expect(learningLines.length).toBe(1);
    });
  });

  describe('readAllSkillMemories', () => {
    it('should return empty array when no memory files exist', () => {
      const memories = readAllSkillMemories(tempDir);
      expect(memories).toEqual([]);
    });

    it('should read learnings from multiple skill files', () => {
      // Create multiple skill memory files
      fs.mkdirSync(skillMemoriesDir, { recursive: true });

      fs.writeFileSync(path.join(skillMemoriesDir, 'pm.md'), `# Pm Memory

## Learnings

- **2026-02-01**: Enable interview process
- **2026-02-02**: Use ultrathink for question count
`);

      fs.writeFileSync(path.join(skillMemoriesDir, 'frontend.md'), `# Frontend Memory

## Learnings

- **2026-02-01**: Use Tailwind CSS
`);

      const memories = readAllSkillMemories(tempDir);

      expect(memories).toHaveLength(3);
      expect(memories.find(m => m.skill === 'pm' && m.learning === 'Enable interview process')).toBeTruthy();
      expect(memories.find(m => m.skill === 'pm' && m.learning === 'Use ultrathink for question count')).toBeTruthy();
      expect(memories.find(m => m.skill === 'frontend' && m.learning === 'Use Tailwind CSS')).toBeTruthy();
    });

    it('should include dates in parsed learnings', () => {
      fs.mkdirSync(skillMemoriesDir, { recursive: true });
      fs.writeFileSync(path.join(skillMemoriesDir, 'general.md'), `# General Memory

## Learnings

- **2026-01-15**: Old learning
- **2026-02-04**: New learning
`);

      const memories = readAllSkillMemories(tempDir);

      expect(memories[0].date).toBe('2026-01-15');
      expect(memories[1].date).toBe('2026-02-04');
    });
  });

  describe('formatMemoriesForPrompt', () => {
    it('should return empty string for empty learnings', () => {
      const result = formatMemoriesForPrompt([]);
      expect(result).toBe('');
    });

    it('should group learnings by skill', () => {
      const learnings = [
        { skill: 'pm', learning: 'Learning 1', date: '2026-02-01' },
        { skill: 'frontend', learning: 'Learning 2', date: '2026-02-01' },
        { skill: 'pm', learning: 'Learning 3', date: '2026-02-02' },
      ];

      const result = formatMemoriesForPrompt(learnings);

      expect(result).toContain('[pm]');
      expect(result).toContain('[frontend]');
      expect(result).toContain('Learning 1');
      expect(result).toContain('Learning 2');
      expect(result).toContain('Learning 3');
    });
  });

  describe('pruneSkillMemories', () => {
    it('should return zero pruned when no files exist', () => {
      const result = pruneSkillMemories(tempDir);
      expect(result.prunedCount).toBe(0);
      expect(result.skillsAffected).toHaveLength(0);
    });

    it('should prune learnings exceeding maxLearningsPerSkill', () => {
      fs.mkdirSync(skillMemoriesDir, { recursive: true });

      // Create file with 5 learnings
      const today = new Date().toISOString().split('T')[0];
      fs.writeFileSync(path.join(skillMemoriesDir, 'general.md'), `# General Memory

## Learnings

- **${today}**: Learning 1
- **${today}**: Learning 2
- **${today}**: Learning 3
- **${today}**: Learning 4
- **${today}**: Learning 5
`);

      // Prune to max 3
      const result = pruneSkillMemories(tempDir, { maxLearningsPerSkill: 3 });

      expect(result.prunedCount).toBe(2);
      expect(result.skillsAffected).toContain('general');

      // Verify file now has only 3 learnings
      const learnings = readSkillMemoryFile(tempDir, 'general');
      expect(learnings).toHaveLength(3);
    });

    it('should prune learnings older than retentionDays', () => {
      fs.mkdirSync(skillMemoriesDir, { recursive: true });

      const today = new Date().toISOString().split('T')[0];
      const oldDate = '2020-01-01'; // Very old date

      fs.writeFileSync(path.join(skillMemoriesDir, 'testing.md'), `# Testing Memory

## Learnings

- **${oldDate}**: Old learning 1
- **${oldDate}**: Old learning 2
- **${today}**: Recent learning
`);

      // Prune with 30 day retention
      const result = pruneSkillMemories(tempDir, { retentionDays: 30 });

      expect(result.prunedCount).toBe(2);
      expect(result.skillsAffected).toContain('testing');

      // Verify only recent learning remains
      const learnings = readSkillMemoryFile(tempDir, 'testing');
      expect(learnings).toHaveLength(1);
      expect(learnings[0]).toBe('Recent learning');
    });

    it('should not prune recent learnings within retention period', () => {
      fs.mkdirSync(skillMemoriesDir, { recursive: true });

      const today = new Date().toISOString().split('T')[0];
      fs.writeFileSync(path.join(skillMemoriesDir, 'pm.md'), `# Pm Memory

## Learnings

- **${today}**: Learning 1
- **${today}**: Learning 2
`);

      const result = pruneSkillMemories(tempDir, { retentionDays: 90, maxLearningsPerSkill: 10 });

      expect(result.prunedCount).toBe(0);
      expect(result.skillsAffected).toHaveLength(0);
    });
  });
});
