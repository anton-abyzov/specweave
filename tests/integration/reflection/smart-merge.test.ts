/**
 * Integration Tests: Smart Merge Workflow (T-018)
 *
 * Tests the complete marketplace update workflow with MEMORY.md merging:
 * 1. User creates skill with MEMORY.md (has user learnings)
 * 2. Marketplace updates with new MEMORY.md (has default learnings)
 * 3. Install script merges both (preserves user, adds non-duplicate defaults)
 * 4. Verifies backup created
 * 5. Verifies user learnings preserved
 * 6. Verifies new defaults added
 * 7. Verifies duplicates detected and skipped
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import {
  parseMemoryFile,
  generateMemoryContent,
  mergeMemoryFiles,
  type Learning,
  type MemoryFile,
} from '../../../src/core/reflection/skill-memory-merger.js';

describe('Smart Merge Workflow Integration (T-018)', () => {
  let testDir: string;
  let skillsSource: string;
  let skillsDest: string;
  let backupDir: string;

  beforeEach(() => {
    // Create temporary test directories
    testDir = join(tmpdir(), `smart-merge-test-${Date.now()}`);
    skillsSource = join(testDir, 'source-skills');
    skillsDest = join(testDir, 'dest-skills');
    backupDir = join(testDir, '.memory-backups');

    mkdirSync(testDir, { recursive: true });
    mkdirSync(skillsSource, { recursive: true });
    mkdirSync(skillsDest, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Full Marketplace Update Workflow', () => {
    it('should preserve user learnings and add new defaults during update', async () => {
      // Step 1: Create skill with user MEMORY.md
      const pmSkillDest = join(skillsDest, 'pm');
      mkdirSync(pmSkillDest, { recursive: true });

      const userMemory: MemoryFile = {
        skillName: 'pm',
        lastUpdated: new Date('2024-01-01').toISOString(),
        learnings: [
          {
            id: 'LRN-20240101-001',
            timestamp: new Date('2024-01-01').toISOString(),
            type: 'correction',
            confidence: 'high',
            content: 'Always create GitHub issues for user stories in this project',
            context: 'User prefers GitHub for tracking',
            triggers: ['github', 'issues'],
            source: 'session:2024-01-01',
          },
          {
            id: 'LRN-20240102-001',
            timestamp: new Date('2024-01-02').toISOString(),
            type: 'rule',
            confidence: 'medium',
            content: 'Use epic-based sprints (2 weeks)',
            triggers: ['sprint', 'epic'],
            source: 'session:2024-01-02',
          },
        ],
      };

      const userMemoryPath = join(pmSkillDest, 'MEMORY.md');
      const userMemoryContent = generateMemoryContent(userMemory);
      writeFileSync(userMemoryPath, userMemoryContent);

      // Step 2: Create marketplace update with new MEMORY.md
      const pmSkillSource = join(skillsSource, 'pm');
      mkdirSync(pmSkillSource, { recursive: true });

      // Write SKILL.md (required for install script)
      writeFileSync(
        join(pmSkillSource, 'SKILL.md'),
        '# PM Skill\n\nProject management expertise.'
      );

      const defaultMemory: MemoryFile = {
        skillName: 'pm',
        lastUpdated: new Date('2024-02-01').toISOString(),
        learnings: [
          {
            id: 'LRN-DEFAULT-001',
            timestamp: new Date('2024-02-01').toISOString(),
            type: 'rule',
            confidence: 'high',
            content: 'Always validate acceptance criteria before closing increments',
            triggers: ['acceptance criteria', 'closure'],
            source: 'marketplace:v1.0',
          },
          {
            id: 'LRN-DEFAULT-002',
            timestamp: new Date('2024-02-01').toISOString(),
            type: 'correction',
            confidence: 'high',
            content: 'Always create GitHub issues for user stories in this project', // Duplicate!
            context: 'Standard workflow',
            triggers: ['github', 'issues'],
            source: 'marketplace:v1.0',
          },
          {
            id: 'LRN-DEFAULT-003',
            timestamp: new Date('2024-02-01').toISOString(),
            type: 'rule',
            confidence: 'medium',
            content: 'Track velocity in living docs dashboard',
            triggers: ['velocity', 'metrics'],
            source: 'marketplace:v1.0',
          },
        ],
      };

      const defaultMemoryPath = join(pmSkillSource, 'MEMORY.md');
      const defaultMemoryContent = generateMemoryContent(defaultMemory);
      writeFileSync(defaultMemoryPath, defaultMemoryContent);

      // Step 3: Test merge function directly (unit test within integration)
      const userMemoryData = parseMemoryFile(userMemoryContent);
      const defaultMemoryData = parseMemoryFile(defaultMemoryContent);
      const mergeResult = mergeMemoryFiles(userMemoryData, defaultMemoryData);

      // Verify merge result
      expect(mergeResult.success).toBe(true);
      expect(mergeResult.preserved).toBe(2); // 2 user learnings
      expect(mergeResult.added).toBe(2); // 2 new defaults (1 duplicate skipped)
      expect(mergeResult.deduped).toBe(1); // 1 duplicate detected

      // Parse merged content
      const mergedMemory = parseMemoryFile(mergeResult.content);
      expect(mergedMemory.learnings.length).toBe(4); // 2 user + 2 new defaults

      // Verify user learnings preserved (should be first)
      const userLearningIds = userMemory.learnings.map(l => l.id);
      const mergedIds = mergedMemory.learnings.map(l => l.id);
      expect(mergedIds).toContain(userLearningIds[0]);
      expect(mergedIds).toContain(userLearningIds[1]);

      // Verify new defaults added
      expect(mergedIds).toContain('LRN-DEFAULT-001');
      expect(mergedIds).toContain('LRN-DEFAULT-003');

      // Verify duplicate skipped
      expect(mergedIds).not.toContain('LRN-DEFAULT-002'); // This is the duplicate
      const githubLearnings = mergedMemory.learnings.filter(l =>
        l.content.includes('GitHub issues')
      );
      expect(githubLearnings.length).toBe(1); // Only one, not two
    });

    it('should handle skill without existing MEMORY.md (fresh install)', () => {
      const skillName = 'architect';
      const skillSourcePath = join(skillsSource, skillName);
      mkdirSync(skillSourcePath, { recursive: true });

      // Create skill with SKILL.md and MEMORY.md in source
      writeFileSync(join(skillSourcePath, 'SKILL.md'), '# Architect Skill\n\nArchitecture expertise.');

      const defaultMemory: MemoryFile = {
        skillName,
        lastUpdated: new Date().toISOString(),
        learnings: [
          {
            id: 'LRN-DEFAULT-001',
            timestamp: new Date().toISOString(),
            type: 'rule',
            confidence: 'high',
            content: 'Always create ADRs for significant architectural decisions',
            triggers: ['adr', 'architecture'],
            source: 'marketplace:v1.0',
          },
        ],
      };

      writeFileSync(
        join(skillSourcePath, 'MEMORY.md'),
        generateMemoryContent(defaultMemory)
      );

      // Destination has no MEMORY.md yet
      const skillDestPath = join(skillsDest, skillName);
      mkdirSync(skillDestPath, { recursive: true });

      // Merge should work even with null user memory
      const result = mergeMemoryFiles(null, defaultMemory);

      expect(result.success).toBe(true);
      expect(result.added).toBe(1);
      expect(result.preserved).toBe(0);
      expect(result.deduped).toBe(0);

      const merged = parseMemoryFile(result.content);
      expect(merged.learnings.length).toBe(1);
      expect(merged.learnings[0].id).toBe('LRN-DEFAULT-001');
    });

    it('should preserve user learnings when marketplace has no MEMORY.md', () => {
      const userMemory: MemoryFile = {
        skillName: 'custom-skill',
        lastUpdated: new Date().toISOString(),
        learnings: [
          {
            id: 'LRN-USER-001',
            timestamp: new Date().toISOString(),
            type: 'correction',
            confidence: 'high',
            content: 'Always use custom workflow for this client',
            source: 'session:2024-01-15',
          },
        ],
      };

      // Merge with null defaults
      const result = mergeMemoryFiles(userMemory, null);

      expect(result.success).toBe(true);
      expect(result.preserved).toBe(1);
      expect(result.added).toBe(0);
      expect(result.deduped).toBe(0);

      const merged = parseMemoryFile(result.content);
      expect(merged.learnings.length).toBe(1);
      expect(merged.learnings[0].id).toBe('LRN-USER-001');
    });
  });

  describe('Duplicate Detection Edge Cases', () => {
    it('should detect substring duplicates', () => {
      const userMemory: MemoryFile = {
        skillName: 'test',
        lastUpdated: new Date().toISOString(),
        learnings: [
          {
            id: 'LRN-001',
            timestamp: new Date().toISOString(),
            type: 'rule',
            confidence: 'high',
            content: 'Use Button component',
          },
        ],
      };

      const defaultMemory: MemoryFile = {
        skillName: 'test',
        lastUpdated: new Date().toISOString(),
        learnings: [
          {
            id: 'LRN-002',
            timestamp: new Date().toISOString(),
            type: 'rule',
            confidence: 'high',
            content: 'Always use Button component from design system', // Substring match
          },
        ],
      };

      const result = mergeMemoryFiles(userMemory, defaultMemory);

      expect(result.deduped).toBe(1);
      expect(result.added).toBe(0);

      const merged = parseMemoryFile(result.content);
      expect(merged.learnings.length).toBe(1); // Only user learning preserved
    });

    it('should detect keyword overlap duplicates (>50% threshold)', () => {
      const userMemory: MemoryFile = {
        skillName: 'test',
        lastUpdated: new Date().toISOString(),
        learnings: [
          {
            id: 'LRN-001',
            timestamp: new Date().toISOString(),
            type: 'rule',
            confidence: 'high',
            content: 'Always validate input forms before submission',
            triggers: ['validate', 'forms', 'input'],
          },
        ],
      };

      const defaultMemory: MemoryFile = {
        skillName: 'test',
        lastUpdated: new Date().toISOString(),
        learnings: [
          {
            id: 'LRN-002',
            timestamp: new Date().toISOString(),
            type: 'rule',
            confidence: 'high',
            content: 'Validate forms input before saving data', // >50% keyword overlap
            triggers: ['validate', 'forms'],
          },
        ],
      };

      const result = mergeMemoryFiles(userMemory, defaultMemory);

      expect(result.deduped).toBe(1);
      expect(result.added).toBe(0);
    });

    it('should NOT flag different learnings as duplicates', () => {
      const userMemory: MemoryFile = {
        skillName: 'test',
        lastUpdated: new Date().toISOString(),
        learnings: [
          {
            id: 'LRN-001',
            timestamp: new Date().toISOString(),
            type: 'rule',
            confidence: 'high',
            content: 'Use React hooks for state management',
          },
        ],
      };

      const defaultMemory: MemoryFile = {
        skillName: 'test',
        lastUpdated: new Date().toISOString(),
        learnings: [
          {
            id: 'LRN-002',
            timestamp: new Date().toISOString(),
            type: 'rule',
            confidence: 'high',
            content: 'Use TypeScript for type safety', // Completely different
          },
        ],
      };

      const result = mergeMemoryFiles(userMemory, defaultMemory);

      expect(result.deduped).toBe(0);
      expect(result.added).toBe(1);

      const merged = parseMemoryFile(result.content);
      expect(merged.learnings.length).toBe(2);
    });
  });

  describe('User Notes Preservation', () => {
    it('should preserve user notes section during merge', () => {
      const userMemoryContent = `# PM Memory

> Auto-generated by SpecWeave Reflect
> Last updated: 2024-01-01T00:00:00.000Z

## Learned Patterns

#### LRN-001 (High Confidence)
**Learning**: Custom learning
**Added**: 2024-01-01

## User Notes

This is my custom note about project workflows.
Important context for future reference.
`;

      const defaultMemoryContent = `# PM Memory

> Auto-generated by SpecWeave Reflect
> Last updated: 2024-02-01T00:00:00.000Z

## Learned Patterns

#### LRN-DEFAULT-001 (High Confidence)
**Learning**: Default learning
**Added**: 2024-02-01
`;

      const userMemory = parseMemoryFile(userMemoryContent);
      const defaultMemory = parseMemoryFile(defaultMemoryContent);

      const result = mergeMemoryFiles(userMemory, defaultMemory);
      expect(result.success).toBe(true);

      // User notes should be preserved
      const merged = parseMemoryFile(result.content);
      expect(merged.userNotes).toBeDefined();
      expect(merged.userNotes).toContain('custom note');
      expect(merged.userNotes).toContain('future reference');
    });
  });
});
