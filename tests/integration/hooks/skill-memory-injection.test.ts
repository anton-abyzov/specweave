/**
 * Integration tests for Skill Memory Hook Injection
 *
 * Tests that skill memories are automatically injected into additionalContext
 * when a skill is detected by the user-prompt-submit hook.
 *
 * TDD RED Phase: These tests define the expected behavior.
 *
 * @module tests/integration/hooks/skill-memory-injection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import from the actual implementation module (TDD RED: this will fail until implemented)
import {
  extractSkillName,
  buildSkillMemoryContext,
} from '../../../src/core/reflection/skill-memory-injector.js';

describe('Skill Memory Hook Injection', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-memory-hook-test-'));
    projectRoot = path.join(tmpDir, 'project');
    fs.mkdirSync(path.join(projectRoot, '.specweave', 'skill-memories'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('extractSkillName', () => {
    it('extracts skill name from sw:pm format', () => {
      expect(extractSkillName('sw:pm')).toBe('pm');
    });

    it('extracts skill name from sw-frontend:frontend-architect format', () => {
      expect(extractSkillName('sw-frontend:frontend-architect')).toBe('frontend-architect');
    });

    it('handles skill name without plugin prefix', () => {
      expect(extractSkillName('architect')).toBe('architect');
    });

    it('extracts skill name from sw:increment-planner format', () => {
      expect(extractSkillName('sw:increment-planner')).toBe('increment-planner');
    });
  });

  describe('buildSkillMemoryContext', () => {
    it('returns null when skill memory file does not exist', () => {
      const result = buildSkillMemoryContext(projectRoot, 'nonexistent');
      expect(result).toBeNull();
    });

    it('returns formatted context when skill memory exists', () => {
      // Create skill memory file
      const memoryContent = `# Pm Memory

<!-- Project-specific learnings for this skill -->

## Learnings

- **2026-02-01**: Enable interview process during increment creation for SpecWeave projects
- **2026-01-15**: Always chunk specs with 6+ user stories
`;
      fs.writeFileSync(
        path.join(projectRoot, '.specweave', 'skill-memories', 'pm.md'),
        memoryContent
      );

      const result = buildSkillMemoryContext(projectRoot, 'pm');

      expect(result).not.toBeNull();
      expect(result).toContain('📚 **Skill Memory for pm**');
      expect(result).toContain('Enable interview process');
      expect(result).toContain('Always chunk specs');
    });

    it('returns null when learnings section is empty', () => {
      const memoryContent = `# Pm Memory

## Learnings

`;
      fs.writeFileSync(
        path.join(projectRoot, '.specweave', 'skill-memories', 'pm.md'),
        memoryContent
      );

      const result = buildSkillMemoryContext(projectRoot, 'pm');
      expect(result).toBeNull();
    });
  });

  describe('Hook Integration Scenarios', () => {
    /**
     * This test verifies the expected behavior when the hook detects a skill.
     * The hook should:
     * 1. Extract skill name from skillInvocation.skill
     * 2. Check for .specweave/skill-memories/{skill}.md
     * 3. If exists, inject content into additionalContext
     */

    it('injects PM skill memory when sw:pm is detected', () => {
      // Setup: Create PM skill memory
      const pmMemory = `# Pm Memory

## Learnings

- **2026-02-01**: Enable interview process during increment creation for SpecWeave projects
`;
      fs.writeFileSync(
        path.join(projectRoot, '.specweave', 'skill-memories', 'pm.md'),
        pmMemory
      );

      // Simulate skill detection
      const detectedSkill = 'sw:pm';
      const skillName = extractSkillName(detectedSkill);
      const memoryContext = buildSkillMemoryContext(projectRoot, skillName);

      // Verify memory would be injected
      expect(memoryContext).not.toBeNull();
      expect(memoryContext).toContain('Enable interview process');
    });

    it('injects frontend skill memory when sw-frontend:frontend-architect is detected', () => {
      // Setup: Create frontend-architect skill memory
      const frontendMemory = `# Frontend Architect Memory

## Learnings

- **2026-01-20**: Use Tailwind CSS for this project
- **2026-01-18**: Prefer server components over client components
`;
      fs.writeFileSync(
        path.join(projectRoot, '.specweave', 'skill-memories', 'frontend-architect.md'),
        frontendMemory
      );

      const detectedSkill = 'sw-frontend:frontend-architect';
      const skillName = extractSkillName(detectedSkill);
      const memoryContext = buildSkillMemoryContext(projectRoot, skillName);

      expect(memoryContext).not.toBeNull();
      expect(memoryContext).toContain('Tailwind CSS');
      expect(memoryContext).toContain('server components');
    });

    it('handles skill without memory file gracefully', () => {
      // No memory file created
      const detectedSkill = 'sw:architect';
      const skillName = extractSkillName(detectedSkill);
      const memoryContext = buildSkillMemoryContext(projectRoot, skillName);

      // Should return null, not throw
      expect(memoryContext).toBeNull();
    });

    it('injects increment-planner skill memory for feature requests', () => {
      // Setup: Create increment-planner skill memory
      const incrementMemory = `# Increment Planner Memory

## Learnings

- **2026-01-25**: Skip deep interview for simple bug fixes
- **2026-01-20**: Always suggest TDD mode for new features
`;
      fs.writeFileSync(
        path.join(projectRoot, '.specweave', 'skill-memories', 'increment-planner.md'),
        incrementMemory
      );

      const detectedSkill = 'sw:increment-planner';
      const skillName = extractSkillName(detectedSkill);
      const memoryContext = buildSkillMemoryContext(projectRoot, skillName);

      expect(memoryContext).not.toBeNull();
      expect(memoryContext).toContain('Skip deep interview');
      expect(memoryContext).toContain('TDD mode');
    });
  });

  describe('Real Project Skill Memories', () => {
    /**
     * Tests against the actual SpecWeave project's skill memories
     * to ensure the injection would work in production.
     */

    it('can load real PM skill memory from current project', () => {
      const realProjectRoot = process.cwd();
      const skillName = 'pm';
      const memoryContext = buildSkillMemoryContext(realProjectRoot, skillName);

      // The real project should have PM skill memory
      if (fs.existsSync(path.join(realProjectRoot, '.specweave', 'skill-memories', 'pm.md'))) {
        expect(memoryContext).not.toBeNull();
        expect(memoryContext).toContain('📚 **Skill Memory for pm**');
      }
    });
  });
});

describe('Hook Output Format Verification', () => {
  /**
   * Tests that verify the additionalContext format is correct
   * for Claude Code to process.
   */

  it('produces valid JSON-escapable skill memory context', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-memory-json-test-'));
    const projectRoot = path.join(tmpDir, 'project');
    fs.mkdirSync(path.join(projectRoot, '.specweave', 'skill-memories'), { recursive: true });

    try {
      const memoryContent = `# Test Memory

## Learnings

- **2026-02-01**: Use "quotes" and 'apostrophes' safely
- **2026-01-15**: Handle special chars: \\ / \n \t
`;
      fs.writeFileSync(
        path.join(projectRoot, '.specweave', 'skill-memories', 'test.md'),
        memoryContent
      );

      const context = buildSkillMemoryContext(projectRoot, 'test');

      // Should be JSON-serializable
      expect(() => JSON.stringify({ context })).not.toThrow();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
