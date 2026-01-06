/**
 * Skill Memory Paths Unit Tests
 *
 * Tests cross-platform path resolution for skill memory files.
 * Uses real filesystem operations in temp directories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  getSkillsDirectory,
  listSkills,
  getSkillMemoryPath,
  getSkillDirectory,
  skillExists,
  getSkillDefinitionPath,
  getGlobalMemoryDir,
  ensureSkillMemoryDir,
} from '../../../../src/core/reflection/skill-memory-paths.js';

describe('skill-memory-paths', () => {
  let testDir: string;
  let skillsDir: string;
  let memoryDir: string;
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save environment
    savedEnv = { ...process.env };

    // Ensure we're NOT in Claude Code mode for these tests
    delete process.env.CLAUDE_CODE;

    // Create temp directory with skill structure
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-paths-test-'));
    skillsDir = path.join(testDir, '.specweave', 'plugins', 'specweave', 'skills');
    memoryDir = path.join(testDir, '.specweave', 'memory');

    // Create skill directories with SKILL.md files
    const skills = ['frontend', 'backend', 'testing'];
    for (const skill of skills) {
      const dir = path.join(skillsDir, skill);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${skill}\n---\n# ${skill}`);
    }

    // Create an invalid skill (directory without SKILL.md)
    fs.mkdirSync(path.join(skillsDir, 'invalid'), { recursive: true });

    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    // Restore environment
    process.env = savedEnv;

    // Clean up temp directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('getSkillsDirectory', () => {
    it('should return project path when given projectRoot', () => {
      const result = getSkillsDirectory(testDir);
      expect(result).toBe(path.join(testDir, '.specweave', 'plugins', 'specweave', 'skills'));
    });
  });

  describe('listSkills', () => {
    it('should return skill names that have SKILL.md', () => {
      const result = listSkills(testDir);

      expect(result).toContain('frontend');
      expect(result).toContain('backend');
      expect(result).toContain('testing');
      expect(result).not.toContain('invalid'); // No SKILL.md
    });

    it('should return empty array when skills directory does not exist', () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));
      try {
        const result = listSkills(emptyDir);
        expect(result).toEqual([]);
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });

  describe('getSkillMemoryPath', () => {
    it('should return MEMORY.md path inside skill directory', () => {
      const result = getSkillMemoryPath('frontend', testDir);
      expect(result).toBe(path.join(skillsDir, 'frontend', 'MEMORY.md'));
    });
  });

  describe('getSkillDirectory', () => {
    it('should return skill directory path', () => {
      const result = getSkillDirectory('architect', testDir);
      expect(result).toBe(path.join(skillsDir, 'architect'));
    });
  });

  describe('skillExists', () => {
    it('should return true when SKILL.md exists', () => {
      expect(skillExists('frontend', testDir)).toBe(true);
      expect(skillExists('backend', testDir)).toBe(true);
    });

    it('should return false when SKILL.md does not exist', () => {
      expect(skillExists('invalid', testDir)).toBe(false);
      expect(skillExists('nonexistent', testDir)).toBe(false);
    });
  });

  describe('getSkillDefinitionPath', () => {
    it('should return SKILL.md path', () => {
      const result = getSkillDefinitionPath('testing', testDir);
      expect(result).toBe(path.join(skillsDir, 'testing', 'SKILL.md'));
    });
  });

  describe('getGlobalMemoryDir', () => {
    it('should return project memory path when not in Claude environment', () => {
      const result = getGlobalMemoryDir(testDir);
      expect(result).toBe(path.join(testDir, '.specweave', 'memory'));
    });
  });

  describe('ensureSkillMemoryDir', () => {
    it('should create skill directory if it does not exist', () => {
      const newSkillDir = path.join(skillsDir, 'newskill');
      expect(fs.existsSync(newSkillDir)).toBe(false);

      ensureSkillMemoryDir('newskill', testDir);

      expect(fs.existsSync(newSkillDir)).toBe(true);
    });

    it('should not error if directory already exists', () => {
      const existingDir = path.join(skillsDir, 'frontend');
      expect(fs.existsSync(existingDir)).toBe(true);

      // Should not throw
      ensureSkillMemoryDir('frontend', testDir);

      expect(fs.existsSync(existingDir)).toBe(true);
    });
  });
});
