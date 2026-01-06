/**
 * Skill Reflection Manager Unit Tests
 *
 * Tests skill detection, learning routing, and reflection orchestration.
 * Uses real filesystem operations in temp directories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  detectSkill,
  detectCategory,
  extractTriggers,
  generateLearningId,
  routeLearning,
  processSignals,
  reflectOnSkill,
  getSkillLearnings,
  getCategoryLearnings,
  clearSkillLearnings,
  removeLearningById,
  getReflectionStats,
  type DetectedSignal,
} from '../../../../src/core/reflection/skill-reflection-manager.js';

describe('skill-reflection-manager', () => {
  let testDir: string;
  let skillsDir: string;
  let memoryDir: string;
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save environment
    savedEnv = { ...process.env };
    delete process.env.CLAUDE_CODE;

    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reflection-test-'));
    skillsDir = path.join(testDir, '.specweave', 'plugins', 'specweave', 'skills');
    memoryDir = path.join(testDir, '.specweave', 'memory');

    // Create skill directories with SKILL.md files
    const skills = ['frontend', 'backend', 'testing', 'architect', 'security'];
    for (const skill of skills) {
      const dir = path.join(skillsDir, skill);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${skill}\n---\n# ${skill}`);
    }

    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    process.env = savedEnv;
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('detectSkill', () => {
    it('should detect frontend skill from component keywords', () => {
      expect(detectSkill('Use Button component from design system')).toBe('frontend');
      expect(detectSkill('React hooks should be used correctly')).toBe('frontend');
      expect(detectSkill('The UI needs better styling with Tailwind')).toBe('frontend');
    });

    it('should detect testing skill from test keywords', () => {
      expect(detectSkill('Use vi.fn() instead of jest.fn()')).toBe('testing');
      expect(detectSkill('Playwright tests need storageState')).toBe('testing');
      expect(detectSkill('Mock the database in unit tests')).toBe('testing');
    });

    it('should detect architect skill from architecture keywords', () => {
      expect(detectSkill('The system architecture needs an ADR')).toBe('architect');
      expect(detectSkill('Use microservices pattern for scalability')).toBe('architect');
      expect(detectSkill('Event-driven architecture would be better here')).toBe('architect');
    });

    it('should detect security skill from security keywords', () => {
      expect(detectSkill('OWASP top 10 vulnerabilities to check')).toBe('security');
      expect(detectSkill('Authentication needs better encryption')).toBe('security');
      expect(detectSkill('Prevent XSS attacks in form inputs')).toBe('security');
    });

    it('should return null for unrelated content', () => {
      expect(detectSkill('Hello world')).toBeNull();
      expect(detectSkill('Thanks for the help')).toBeNull();
      expect(detectSkill('')).toBeNull();
    });

    it('should use context for better detection', () => {
      const result = detectSkill('Use the right pattern', 'In React components');
      expect(result).toBe('frontend');
    });
  });

  describe('detectCategory', () => {
    it('should detect component-usage category', () => {
      expect(detectCategory('Button styles need updating')).toBe('component-usage');
      expect(detectCategory('UI component needs work')).toBe('component-usage');
    });

    it('should detect api-patterns category', () => {
      expect(detectCategory('REST API endpoint')).toBe('api-patterns');
      expect(detectCategory('GraphQL fetch pattern')).toBe('api-patterns');
    });

    it('should detect testing category', () => {
      expect(detectCategory('Unit test mock')).toBe('testing');
      expect(detectCategory('Coverage report')).toBe('testing');
    });

    it('should detect deployment category', () => {
      expect(detectCategory('Deploy to Vercel')).toBe('deployment');
      expect(detectCategory('Wrangler configuration')).toBe('deployment');
    });

    it('should detect database category', () => {
      expect(detectCategory('SQL query optimization')).toBe('database');
      expect(detectCategory('Database schema migration')).toBe('database');
    });

    it('should fallback to general category', () => {
      expect(detectCategory('Random unrelated content')).toBe('general');
      expect(detectCategory('')).toBe('general');
    });
  });

  describe('extractTriggers', () => {
    it('should extract meaningful words as triggers', () => {
      const triggers = extractTriggers('Use Button component from design system');
      expect(triggers).toContain('button');
      expect(triggers).toContain('component');
      expect(triggers).toContain('design');
      expect(triggers).toContain('system');
    });

    it('should filter out short words', () => {
      const triggers = extractTriggers('Use the API for data');
      expect(triggers).not.toContain('use');
      expect(triggers).not.toContain('the');
      expect(triggers).not.toContain('for');
    });

    it('should filter out common stop words', () => {
      const triggers = extractTriggers('This should have been working with that');
      expect(triggers).not.toContain('this');
      expect(triggers).not.toContain('should');
      expect(triggers).not.toContain('have');
      expect(triggers).not.toContain('been');
      expect(triggers).not.toContain('with');
      expect(triggers).not.toContain('that');
    });

    it('should deduplicate triggers', () => {
      const triggers = extractTriggers('button button button component component');
      const buttonCount = triggers.filter((t) => t === 'button').length;
      expect(buttonCount).toBe(1);
    });

    it('should limit to 10 triggers', () => {
      const longText = Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ');
      const triggers = extractTriggers(longText);
      expect(triggers.length).toBeLessThanOrEqual(10);
    });
  });

  describe('generateLearningId', () => {
    it('should generate ID with default prefix', () => {
      const id = generateLearningId();
      expect(id).toMatch(/^LRN-\d{8}-[A-Z0-9]{4}$/);
    });

    it('should generate ID with custom prefix', () => {
      const id = generateLearningId('CUSTOM');
      expect(id).toMatch(/^CUSTOM-\d{8}-[A-Z0-9]{4}$/);
    });

    it('should include current date', () => {
      const id = generateLearningId();
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      expect(id).toContain(today);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateLearningId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('routeLearning', () => {
    it('should route to skill when skill is specified and exists', () => {
      const signal: DetectedSignal = {
        type: 'correction',
        confidence: 'high',
        content: 'Use Button from design system',
        skill: 'frontend',
        triggers: ['button', 'component'],
      };

      const result = routeLearning(signal, testDir);

      expect(result.target).toBe('skill:frontend');
      expect(result.added).toBe(true);

      // Verify file was created
      const memoryPath = path.join(skillsDir, 'frontend', 'MEMORY.md');
      expect(fs.existsSync(memoryPath)).toBe(true);
    });

    it('should route to category when no skill detected', () => {
      const signal: DetectedSignal = {
        type: 'correction',
        confidence: 'high',
        content: 'Random learning about stuff xyz',
        skill: null,
        triggers: ['random', 'stuff', 'xyz'],
      };

      const result = routeLearning(signal, testDir);

      expect(result.target).toBe('category:general');
      expect(result.added).toBe(true);
    });
  });

  describe('processSignals', () => {
    it('should process multiple signals', () => {
      const signals: DetectedSignal[] = [
        {
          type: 'correction',
          confidence: 'high',
          content: 'Use Button component properly unique',
          skill: 'frontend',
          triggers: ['button'],
        },
        {
          type: 'rule',
          confidence: 'high',
          content: 'Use vi.fn() for mocks in Vitest tests unique',
          skill: 'testing',
          triggers: ['vitest'],
        },
      ];

      const result = processSignals(signals, testDir);

      expect(result.success).toBe(true);
      expect(result.learningsAdded).toBe(2);
      expect(result.skillsUpdated.length).toBe(2);
    });

    it('should skip duplicate learnings', () => {
      const signal: DetectedSignal = {
        type: 'correction',
        confidence: 'high',
        content: 'Use Button from design system for buttons',
        skill: 'frontend',
        triggers: ['button'],
      };

      // Add first time
      const result1 = processSignals([signal], testDir);
      expect(result1.learningsAdded).toBe(1);

      // Try to add same learning again
      const result2 = processSignals([signal], testDir);
      expect(result2.learningsAdded).toBe(0);
      expect(result2.learningsSkipped).toBe(1);
    });
  });

  describe('reflectOnSkill', () => {
    it('should add learnings to specific skill', () => {
      const learnings = [
        { content: 'Use Button from shadcn unique learning', type: 'correction' as const },
        { content: 'Always use design system components unique', type: 'rule' as const },
      ];

      const result = reflectOnSkill('frontend', learnings, testDir);

      expect(result.success).toBe(true);
      expect(result.learningsAdded).toBe(2);
    });

    it('should fail for non-existent skill', () => {
      const learnings = [{ content: 'Some learning' }];

      const result = reflectOnSkill('nonexistent', learnings, testDir);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('not found');
    });
  });

  describe('getSkillLearnings', () => {
    it('should return empty array for skill without memory', () => {
      const learnings = getSkillLearnings('frontend', testDir);
      expect(learnings).toEqual([]);
    });

    it('should return learnings from skill memory', () => {
      // First add some learnings
      reflectOnSkill('frontend', [{ content: 'Test learning unique content' }], testDir);

      const learnings = getSkillLearnings('frontend', testDir);
      expect(learnings).toHaveLength(1);
      expect(learnings[0].content).toContain('Test learning');
    });
  });

  describe('clearSkillLearnings', () => {
    it('should clear all learnings from skill', () => {
      // Add some learnings
      reflectOnSkill(
        'frontend',
        [{ content: 'Learning 1 unique xyz' }, { content: 'Learning 2 different abc' }],
        testDir
      );

      expect(getSkillLearnings('frontend', testDir).length).toBeGreaterThanOrEqual(1);

      const cleared = clearSkillLearnings('frontend', testDir);

      expect(cleared).toBe(true);
      expect(getSkillLearnings('frontend', testDir)).toHaveLength(0);
    });

    it('should return false for skill without memory', () => {
      const cleared = clearSkillLearnings('backend', testDir);
      expect(cleared).toBe(false);
    });
  });

  describe('removeLearningById', () => {
    it('should remove specific learning from skill', () => {
      reflectOnSkill('frontend', [{ content: 'Test learning to remove unique' }], testDir);

      const learnings = getSkillLearnings('frontend', testDir);
      expect(learnings.length).toBeGreaterThanOrEqual(1);
      const learningId = learnings[0].id;

      const removed = removeLearningById(learningId, testDir);

      expect(removed).toBe(true);
      expect(getSkillLearnings('frontend', testDir)).toHaveLength(0);
    });

    it('should return false for non-existent learning', () => {
      const removed = removeLearningById('LRN-NONEXISTENT-0000', testDir);
      expect(removed).toBe(false);
    });
  });

  describe('getReflectionStats', () => {
    it('should return stats with no learnings', () => {
      // Create a fresh test directory with no learnings
      const freshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-stats-'));
      const freshSkillsDir = path.join(freshDir, '.specweave', 'plugins', 'specweave', 'skills');

      // Create skills without memory
      for (const skill of ['frontend', 'backend']) {
        const dir = path.join(freshSkillsDir, skill);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${skill}\n---\n# ${skill}`);
      }

      try {
        const stats = getReflectionStats(freshDir);
        expect(stats.totalLearnings).toBe(0);
        expect(stats.skills).toHaveLength(0);
      } finally {
        fs.rmSync(freshDir, { recursive: true, force: true });
      }
    });

    it('should return stats with learnings', () => {
      // Create a fresh test directory
      const statsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-test-'));
      const statsSkillsDir = path.join(statsDir, '.specweave', 'plugins', 'specweave', 'skills');

      // Create skills
      for (const skill of ['frontend', 'backend']) {
        const dir = path.join(statsSkillsDir, skill);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${skill}\n---\n# ${skill}`);
      }

      try {
        // Add learnings to different skills
        reflectOnSkill(
          'frontend',
          [{ content: 'Frontend unique learning 1' }, { content: 'Frontend different learning 2' }],
          statsDir
        );
        reflectOnSkill('backend', [{ content: 'Backend unique learning xyz' }], statsDir);

        const stats = getReflectionStats(statsDir);

        expect(stats.totalLearnings).toBeGreaterThanOrEqual(2);
        expect(stats.skills.some((s) => s.name === 'frontend')).toBe(true);
      } finally {
        fs.rmSync(statsDir, { recursive: true, force: true });
      }
    });
  });
});
