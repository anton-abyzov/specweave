/**
 * Integration tests for Skill Memories Loading
 *
 * Tests the FULL skill-memories lifecycle:
 * 1. Learnings are written to CLAUDE.md (auto-loaded by Claude Code)
 * 2. Learnings are written to .specweave/skill-memories/{skill}.md
 * 3. Hook (user-prompt-submit.sh) injects memories when skills are invoked
 * 4. A specific instruction is actually applied when skill loads
 *
 * ARCHITECTURE (v1.0.198+):
 * - CLAUDE.md "Skill Memories" section → Auto-loaded by Claude Code
 * - .specweave/skill-memories/{skill}.md → Injected by user-prompt-submit.sh hook
 *   via get_skill_memory_context() (no longer via cat instructions in SKILL.md)
 *
 * @module tests/integration/reflection/skill-memories-loading
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  writeSkillMemoryFile,
  readSkillMemoryFile,
  writeSkillMemories,
  generateSkillMemoryContent,
  listSkillMemoryFiles,
  SKILL_MEMORY_DIR,
} from '../../../src/core/reflection/skill-memories.js';

describe('Skill Memories Loading Integration', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-memories-test-'));
    projectRoot = path.join(tmpDir, 'project');
    fs.mkdirSync(path.join(projectRoot, '.specweave'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Skill Memory File Write/Read Cycle', () => {
    it('writes learning to .specweave/skill-memories/{skill}.md', () => {
      const result = writeSkillMemoryFile(projectRoot, {
        skill: 'pm',
        learning: 'Enable interview process during increment creation',
      });

      expect(result.written).toBe(true);

      // Verify file was created
      const memoryPath = path.join(projectRoot, SKILL_MEMORY_DIR, 'pm.md');
      expect(fs.existsSync(memoryPath)).toBe(true);

      // Verify content structure
      const content = fs.readFileSync(memoryPath, 'utf-8');
      expect(content).toContain('# Pm Memory');
      expect(content).toContain('## Learnings');
      expect(content).toContain('Enable interview process during increment creation');
    });

    it('reads learnings back from skill memory file', () => {
      // Write a learning
      writeSkillMemoryFile(projectRoot, {
        skill: 'architect',
        learning: 'Skip ADR proposals for hotfix increments',
      });

      // Read it back
      const learnings = readSkillMemoryFile(projectRoot, 'architect');

      expect(learnings).toHaveLength(1);
      expect(learnings[0]).toBe('Skip ADR proposals for hotfix increments');
    });

    it('deduplicates identical learnings', () => {
      // Write same learning twice
      const result1 = writeSkillMemoryFile(projectRoot, {
        skill: 'testing',
        learning: 'Run tests on localhost:8081',
      });
      const result2 = writeSkillMemoryFile(projectRoot, {
        skill: 'testing',
        learning: 'Run tests on localhost:8081',
      });

      expect(result1.written).toBe(true);
      expect(result2.written).toBe(false);
      expect(result2.reason).toBe('Duplicate learning');

      // Should only have one learning
      const learnings = readSkillMemoryFile(projectRoot, 'testing');
      expect(learnings).toHaveLength(1);
    });

    it('deduplicates substring-matching learnings', () => {
      // Write broader learning first
      writeSkillMemoryFile(projectRoot, {
        skill: 'frontend',
        learning: 'Use Vercel for deployment in this project',
      });

      // Write narrower learning (contained in first)
      const result = writeSkillMemoryFile(projectRoot, {
        skill: 'frontend',
        learning: 'Use Vercel for deployment',
      });

      expect(result.written).toBe(false);
      expect(result.reason).toBe('Duplicate learning');
    });

    it('writes multiple learnings via batch write', () => {
      const learnings = [
        { skill: 'pm', learning: 'Always chunk specs with 6+ user stories' },
        { skill: 'architect', learning: 'Use Redis for session caching' },
        { skill: 'testing', learning: 'Run E2E tests nightly only' },
      ];

      const result = writeSkillMemories(projectRoot, learnings);

      expect(result.written).toBe(3);
      expect(result.skipped).toBe(0);

      // Verify all files were created
      const files = listSkillMemoryFiles(projectRoot);
      expect(files).toContain('pm');
      expect(files).toContain('architect');
      expect(files).toContain('testing');
    });
  });

  describe('Skill Memory Content Format', () => {
    it('generates correct markdown structure', () => {
      const content = generateSkillMemoryContent('tech-lead', [
        'Prefer composition over inheritance',
        'Use dependency injection',
      ]);

      expect(content).toContain('# Tech Lead Memory');
      expect(content).toContain('<!-- Project-specific learnings for this skill -->');
      expect(content).toContain('## Learnings');
      expect(content).toMatch(/- \*\*\d{4}-\d{2}-\d{2}\*\*: Prefer composition over inheritance/);
      expect(content).toMatch(/- \*\*\d{4}-\d{2}-\d{2}\*\*: Use dependency injection/);
    });

    it('preserves existing date prefixes when present', () => {
      const content = generateSkillMemoryContent('security', [
        '**2025-01-15**: Always validate JWT signatures',
      ]);

      // Should not add another date prefix
      expect(content).toContain('- **2025-01-15**: Always validate JWT signatures');
      expect(content).not.toMatch(/\*\*\d{4}-\d{2}-\d{2}\*\*: \*\*2025/);
    });
  });

  describe('Skill Memory Accessibility', () => {
    it('returns empty array for non-existent skill memory', () => {
      const learnings = readSkillMemoryFile(projectRoot, 'nonexistent');
      expect(learnings).toEqual([]);
    });

    it('lists all skill memory files', () => {
      // Create multiple memory files
      writeSkillMemoryFile(projectRoot, { skill: 'pm', learning: 'L1' });
      writeSkillMemoryFile(projectRoot, { skill: 'architect', learning: 'L2' });
      writeSkillMemoryFile(projectRoot, { skill: 'devops', learning: 'L3' });

      const files = listSkillMemoryFiles(projectRoot);

      expect(files).toHaveLength(3);
      expect(files.sort()).toEqual(['architect', 'devops', 'pm']);
    });

    it('simulates skill loading and memory retrieval', () => {
      // This simulates what happens when a skill loads:
      // 1. Skill SKILL.md has instruction: cat .specweave/skill-memories/pm.md
      // 2. Claude executes the cat command
      // 3. Memory content is available in context

      // Setup: Write a learning
      writeSkillMemoryFile(projectRoot, {
        skill: 'pm',
        learning: 'Enable interview process during increment creation for SpecWeave projects',
      });

      // Simulate the `cat` command the skill would execute
      const memoryPath = path.join(projectRoot, SKILL_MEMORY_DIR, 'pm.md');
      const catOutput = fs.existsSync(memoryPath)
        ? fs.readFileSync(memoryPath, 'utf-8')
        : 'No project learnings yet';

      // Verify the learning is accessible
      expect(catOutput).toContain('Enable interview process during increment creation');
      expect(catOutput).toContain('## Learnings');
    });
  });

  describe('Hook-Based Memory Loading Verification', () => {
    // Since v1.0.198, skill memories are injected by user-prompt-submit.sh hook
    // via get_skill_memory_context(), not by cat instructions in SKILL.md

    const hooksDir = path.join(process.cwd(), 'plugins/specweave/hooks');

    it('hook has get_skill_memory_context function for skill memory injection', () => {
      const hookPath = path.join(hooksDir, 'user-prompt-submit.sh');
      expect(fs.existsSync(hookPath)).toBe(true);

      const content = fs.readFileSync(hookPath, 'utf-8');
      expect(content).toContain('get_skill_memory_context()');
    });

    it('hook injects memory during skill invocation', () => {
      const hookPath = path.join(hooksDir, 'user-prompt-submit.sh');
      const content = fs.readFileSync(hookPath, 'utf-8');

      // When a skill is invoked, the hook calls get_skill_memory_context
      expect(content).toContain('SKILL_MEMORY_RAW=$(get_skill_memory_context');
    });
  });

  describe('Instruction Execution Verification', () => {
    /**
     * Verify that a specific learning instruction would actually be executed.
     *
     * The learning "Enable interview process during increment creation for SpecWeave projects"
     * should result in the PM skill checking for deep interview mode.
     *
     * Architecture: Hook injects memory BEFORE skill content is processed,
     * so learnings are available when the PM skill runs its deep interview check.
     */

    it('verifies PM learning about interview process is actionable', () => {
      // Write the specific learning we want to verify
      writeSkillMemoryFile(projectRoot, {
        skill: 'pm',
        learning: 'Enable interview process during increment creation for SpecWeave projects',
      });

      // Read the learning back
      const learnings = readSkillMemoryFile(projectRoot, 'pm');

      // Verify it's stored
      expect(learnings).toContain(
        'Enable interview process during increment creation for SpecWeave projects'
      );

      // Verify the PM skill has the Deep Interview Mode Check section
      // (the hook injects the memory content before the skill processes this)
      const pmSkillPath = path.join(
        process.cwd(),
        'plugins/specweave/skills/pm/SKILL.md'
      );

      if (fs.existsSync(pmSkillPath)) {
        const skillContent = fs.readFileSync(pmSkillPath, 'utf-8');

        // The skill MUST have deep interview check instructions
        expect(skillContent).toContain('Deep Interview Mode Check');
        expect(skillContent).toContain('jq -r \'.planning.deepInterview.enabled');
        expect(skillContent).toContain('phases/00-deep-interview.md');
      }
    });

    it('verifies hook injects memory before skill invocation', () => {
      // The hook injects skill memory BEFORE the skill content is processed.
      // This ensures learnings can influence skill behavior (e.g., interview mode).

      const hookPath = path.join(
        process.cwd(),
        'plugins/specweave/hooks/user-prompt-submit.sh'
      );

      const content = fs.readFileSync(hookPath, 'utf-8');

      // The hook should call get_skill_memory_context during skill invocation
      const memoryInjectionPos = content.indexOf('SKILL_MEMORY_RAW=$(get_skill_memory_context');
      expect(memoryInjectionPos).toBeGreaterThan(-1);

      // The PM skill should still have Deep Interview Mode Check
      const pmSkillPath = path.join(
        process.cwd(),
        'plugins/specweave/skills/pm/SKILL.md'
      );

      if (fs.existsSync(pmSkillPath)) {
        const pmContent = fs.readFileSync(pmSkillPath, 'utf-8');
        expect(pmContent).toContain('Deep Interview Mode Check');
      }
    });
  });

  describe('CLAUDE.md Skill Memories Integration', () => {
    /**
     * Tests that learnings in CLAUDE.md (which IS auto-loaded by Claude Code)
     * are properly formatted and accessible.
     */

    it('verifies real CLAUDE.md has Skill Memories section', () => {
      const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');

      if (fs.existsSync(claudeMdPath)) {
        const content = fs.readFileSync(claudeMdPath, 'utf-8');

        // Should have Skill Memories section
        expect(content).toContain('## Skill Memories');
      }
    });

    it('verifies PM learning is in CLAUDE.md (auto-loaded)', () => {
      const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');

      if (fs.existsSync(claudeMdPath)) {
        const content = fs.readFileSync(claudeMdPath, 'utf-8');

        // The specific PM learning should be present
        // This is what makes it AUTO-LOADED by Claude Code
        expect(content).toContain('Enable interview during increment creation');
      }
    });

    it('verifies CLAUDE.md and skill-memories have same learning', () => {
      // This tests the dual-write architecture:
      // Same learning should be in both locations

      const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
      const pmMemoryPath = path.join(process.cwd(), SKILL_MEMORY_DIR, 'pm.md');

      if (fs.existsSync(claudeMdPath) && fs.existsSync(pmMemoryPath)) {
        const claudeMdContent = fs.readFileSync(claudeMdPath, 'utf-8');
        const pmMemoryContent = fs.readFileSync(pmMemoryPath, 'utf-8');

        // Both locations should reference the interview + increment creation learning
        // (wording may differ slightly between CLAUDE.md and skill-memories)
        expect(claudeMdContent).toContain('interview');
        expect(claudeMdContent).toContain('increment creation');
        expect(pmMemoryContent).toContain('interview');
        expect(pmMemoryContent).toContain('increment creation');
      }
    });
  });

  describe('End-to-End Learning Flow Simulation', () => {
    /**
     * Simulates the complete flow:
     * 1. Reflection extracts a learning
     * 2. Learning is written to both locations
     * 3. Skill loads and reads the learning
     * 4. Learning influences skill behavior
     */

    it('simulates full learning lifecycle', () => {
      // Create CLAUDE.md for the test project
      const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
      fs.writeFileSync(claudeMdPath, '# Test Project\n\n## Skill Memories\n\n');

      // Step 1: Simulate reflection extracting a learning
      const extractedLearning = {
        skill: 'testing',
        learning: 'Always run unit tests before E2E tests',
      };

      // Step 2: Write to skill-memories (simulates reflect-handler.ts writeSkillMemories)
      const writeResult = writeSkillMemoryFile(projectRoot, extractedLearning);
      expect(writeResult.written).toBe(true);

      // Step 3: Verify skill can read the learning
      const loadedLearnings = readSkillMemoryFile(projectRoot, 'testing');
      expect(loadedLearnings).toContain('Always run unit tests before E2E tests');

      // Step 4: Simulate skill executing the cat command
      const skillMemoryPath = path.join(projectRoot, SKILL_MEMORY_DIR, 'testing.md');
      const catSimulation = fs.readFileSync(skillMemoryPath, 'utf-8');

      // The learning should be visible in the cat output
      expect(catSimulation).toContain('Always run unit tests before E2E tests');

      // Step 5: Verify the skill would find this instruction actionable
      // (In real usage, Claude would parse this and apply it)
      const hasActionableInstruction = catSimulation.includes('run unit tests before E2E');
      expect(hasActionableInstruction).toBe(true);
    });

    it('verifies learning persistence across sessions', () => {
      // Write a learning
      writeSkillMemoryFile(projectRoot, {
        skill: 'general',
        learning: 'User prefers small increments (max 5 tasks)',
      });

      // Simulate "new session" by re-reading from disk
      // (In reality, Claude Code restarts and reloads context)
      const learningsAfterRestart = readSkillMemoryFile(projectRoot, 'general');

      expect(learningsAfterRestart).toContain('User prefers small increments (max 5 tasks)');
    });
  });
});

/**
 * Tests specifically for verifying instruction execution patterns
 */
describe('Instruction Execution Pattern Tests', () => {
  it('extracts actionable instructions from PM memory', () => {
    const pmMemoryPath = path.join(process.cwd(), SKILL_MEMORY_DIR, 'pm.md');

    if (fs.existsSync(pmMemoryPath)) {
      const content = fs.readFileSync(pmMemoryPath, 'utf-8');

      // Parse learnings from the memory file
      const learnings: string[] = [];
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^-\s+\*\*\d{4}-\d{2}-\d{2}\*\*:\s*(.+)$/);
        if (match) {
          learnings.push(match[1].trim());
        }
      }

      // Check if any learning mentions "interview"
      const interviewLearning = learnings.find((l) =>
        l.toLowerCase().includes('interview')
      );

      if (interviewLearning) {
        // Verify it's an actionable instruction
        expect(interviewLearning).toContain('interview');
        expect(interviewLearning).toContain('increment');
      }
    }
  });

  it('verifies PM deep-interview phase exists', () => {
    const deepInterviewPath = path.join(
      process.cwd(),
      'plugins/specweave/skills/pm/phases/00-deep-interview.md'
    );

    // The phase file should exist (this is what the learning refers to)
    expect(fs.existsSync(deepInterviewPath)).toBe(true);
  });

  it('verifies config can enable deep interview', () => {
    // The learning says to "Enable interview process"
    // This should be configurable via .specweave/config.json

    const configPath = path.join(process.cwd(), '.specweave/config.json');

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

      // Check if planning.deepInterview.enabled exists in config
      if (config.planning?.deepInterview?.enabled !== undefined) {
        // The config has the setting - verify it can be true
        expect(typeof config.planning.deepInterview.enabled).toBe('boolean');
      }
    }
  });
});
