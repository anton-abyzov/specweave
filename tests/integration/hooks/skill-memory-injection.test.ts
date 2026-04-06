/**
 * Integration tests for Skill Memory loading
 *
 * Tests two mechanisms:
 * 1. DCI cascade (used by skill-context.sh, tested via awk one-liner)
 *    Cascade priority (first-match-wins):
 *      a. .specweave/skill-memories/{skill}.md
 *      b. .claude/skill-memories/{skill}.md
 *      c. ~/.claude/skill-memories/{skill}.md
 * 2. Instruction-based loading (used by SKILL.md for skill memories)
 *    Each SKILL.md has a plain LLM instruction:
 *    **Skill Memories**: If `.specweave/skill-memories/{skill}.md` exists, read and apply its learnings.
 *
 * The skill-memories.sh script has been deleted. Skill memories now use
 * instruction-based loading instead of DCI shell commands.
 *
 * @module tests/integration/hooks/skill-memory-injection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Build the DCI command for a given skill and project root.
 * This mirrors the exact command in each SKILL.md.
 */
function buildDciCommand(skillName: string, projectRoot: string): string {
  // The DCI one-liner from SKILL.md, adapted for testing with explicit paths
  return `s="${skillName}"; for d in "${projectRoot}/.specweave/skill-memories" "${projectRoot}/.claude/skill-memories" "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null`;
}

/**
 * Create a skill memory file with learnings content.
 */
function createMemoryFile(dir: string, skillName: string, learnings: string[]): void {
  fs.mkdirSync(dir, { recursive: true });
  const lines = [
    `# ${skillName} Memory`,
    '',
    '## Learnings',
    '',
    ...learnings.map(l => `- ${l}`),
    '',
  ];
  fs.writeFileSync(path.join(dir, `${skillName}.md`), lines.join('\n'));
}

describe('DCI Skill Memory Cascade', () => {
  let tmpDir: string;
  let projectRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dci-cascade-test-'));
    projectRoot = path.join(tmpDir, 'project');
    fs.mkdirSync(projectRoot, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('cascade priority', () => {
    it('loads from .specweave/skill-memories/ first when present', () => {
      // Create memories at all 3 levels
      createMemoryFile(
        path.join(projectRoot, '.specweave', 'skill-memories'),
        'pm', ['specweave-level learning']
      );
      createMemoryFile(
        path.join(projectRoot, '.claude', 'skill-memories'),
        'pm', ['claude-project-level learning']
      );

      const cmd = buildDciCommand('pm', projectRoot);
      const output = execSync(cmd, { encoding: 'utf-8', shell: '/bin/bash' }).trim();

      expect(output).toContain('specweave-level learning');
      expect(output).not.toContain('claude-project-level learning');
    });

    it('falls back to .claude/skill-memories/ when .specweave/ is absent', () => {
      // Only create at .claude/ level
      createMemoryFile(
        path.join(projectRoot, '.claude', 'skill-memories'),
        'pm', ['claude-project-level learning']
      );

      const cmd = buildDciCommand('pm', projectRoot);
      const output = execSync(cmd, { encoding: 'utf-8', shell: '/bin/bash' }).trim();

      expect(output).toContain('claude-project-level learning');
    });

    it('returns empty when no memory files exist', () => {
      const cmd = buildDciCommand('pm', projectRoot);
      const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf-8' });

      // Inline cascade may return non-zero when no files match (the for loop's
      // last [ -f ] fails). We only care that output is empty.
      expect((result.stdout || '').trim()).toBe('');
    });

    it('produces no output when no memory files exist', () => {
      const cmd = buildDciCommand('nonexistent', projectRoot);
      const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf-8' });

      expect((result.stdout || '').trim()).toBe('');
    });
  });

  describe('awk learnings extraction', () => {
    it('extracts only content between ## Learnings and next heading', () => {
      const memDir = path.join(projectRoot, '.specweave', 'skill-memories');
      fs.mkdirSync(memDir, { recursive: true });

      const content = `# Pm Memory

## Learnings

- Learning one
- Learning two

## Other Section

- Should not appear
`;
      fs.writeFileSync(path.join(memDir, 'pm.md'), content);

      const cmd = buildDciCommand('pm', projectRoot);
      const output = execSync(cmd, { encoding: 'utf-8', shell: '/bin/bash' }).trim();

      expect(output).toContain('Learning one');
      expect(output).toContain('Learning two');
      expect(output).not.toContain('Should not appear');
    });

    it('handles learnings section at end of file (no next heading)', () => {
      const memDir = path.join(projectRoot, '.specweave', 'skill-memories');
      fs.mkdirSync(memDir, { recursive: true });

      const content = `# Test Memory

## Learnings

- Only learning
`;
      fs.writeFileSync(path.join(memDir, 'test.md'), content);

      const cmd = buildDciCommand('test', projectRoot);
      const output = execSync(cmd, { encoding: 'utf-8', shell: '/bin/bash' }).trim();

      expect(output).toContain('Only learning');
    });

    it('handles empty learnings section gracefully', () => {
      const memDir = path.join(projectRoot, '.specweave', 'skill-memories');
      fs.mkdirSync(memDir, { recursive: true });

      const content = `# Test Memory

## Learnings

## Other Section
`;
      fs.writeFileSync(path.join(memDir, 'test.md'), content);

      const cmd = buildDciCommand('test', projectRoot);
      const output = execSync(cmd, { encoding: 'utf-8', shell: '/bin/bash' }).trim();

      expect(output).toBe('');
    });
  });

  describe('cross-platform compatibility', () => {
    it('awk command works without errors', () => {
      const memDir = path.join(projectRoot, '.specweave', 'skill-memories');
      createMemoryFile(memDir, 'test', ['Cross-platform learning']);

      // Should not throw
      const cmd = buildDciCommand('test', projectRoot);
      expect(() => {
        execSync(cmd, { encoding: 'utf-8', shell: '/bin/bash' });
      }).not.toThrow();
    });

    it('handles special characters in learnings', () => {
      const memDir = path.join(projectRoot, '.specweave', 'skill-memories');
      fs.mkdirSync(memDir, { recursive: true });

      const content = `# Test Memory

## Learnings

- Use "quotes" and 'apostrophes' safely
- Handle paths like /usr/local/bin
- Dollar signs $VAR should work
`;
      fs.writeFileSync(path.join(memDir, 'test.md'), content);

      const cmd = buildDciCommand('test', projectRoot);
      const output = execSync(cmd, { encoding: 'utf-8', shell: '/bin/bash' }).trim();

      expect(output).toContain('quotes');
      expect(output).toContain('apostrophes');
    });
  });

  describe('exit code safety', () => {
    it('produces no output when skill-memories directories do not exist', () => {
      // projectRoot has no .specweave/ or .claude/ dirs at all
      const cmd = buildDciCommand('any-skill', projectRoot);
      const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf-8' });

      // Inline cascade may return non-zero when no files match.
      expect((result.stdout || '').trim()).toBe('');
    });

    it('produces no output when directories exist but skill file is missing', () => {
      // Create directories but no matching skill file
      fs.mkdirSync(path.join(projectRoot, '.specweave', 'skill-memories'), { recursive: true });
      fs.mkdirSync(path.join(projectRoot, '.claude', 'skill-memories'), { recursive: true });

      const cmd = buildDciCommand('missing-skill', projectRoot);
      const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf-8' });

      expect((result.stdout || '').trim()).toBe('');
    });

    it('exits 0 when file exists but has no Learnings section', () => {
      const memDir = path.join(projectRoot, '.specweave', 'skill-memories');
      fs.mkdirSync(memDir, { recursive: true });
      fs.writeFileSync(path.join(memDir, 'test.md'), '# Test Memory\n\nNo learnings here.\n');

      const cmd = buildDciCommand('test', projectRoot);
      const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf-8' });

      expect(result.status).toBe(0);
      expect((result.stdout || '').trim()).toBe('');
    });

    it('exits 0 and returns content when file exists with learnings', () => {
      createMemoryFile(
        path.join(projectRoot, '.specweave', 'skill-memories'),
        'test', ['A real learning']
      );

      const cmd = buildDciCommand('test', projectRoot);
      const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf-8' });

      expect(result.status).toBe(0);
      expect((result.stdout || '').trim()).toContain('A real learning');
    });
  });
});

describe('Real SKILL.md Instruction-Based Skill Memories', () => {
  const pluginsDir = path.join(process.cwd(), 'plugins/specweave/skills');

  it('no SKILL.md files reference deleted skill-memories.sh script', () => {
    const skillDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const violations: string[] = [];
    for (const dir of skillDirs) {
      const skillPath = path.join(pluginsDir, dir, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;

      const content = fs.readFileSync(skillPath, 'utf-8');
      if (content.includes('skill-memories.sh')) {
        violations.push(dir);
      }
    }

    expect(violations).toEqual([]);
  });

  it('pm SKILL.md has instruction-based skill memory loading', () => {
    const content = fs.readFileSync(
      path.join(pluginsDir, 'pm', 'SKILL.md'),
      'utf-8'
    );

    expect(content).toContain('## Project Overrides');
    expect(content).toMatch(/Skill Memories.*read and apply/);
    expect(content).toContain('skill-memories/pm.md');
  });

  it('grill SKILL.md has instruction-based skill memory loading', () => {
    const content = fs.readFileSync(
      path.join(pluginsDir, 'grill', 'SKILL.md'),
      'utf-8'
    );

    expect(content).toContain('## Project Overrides');
    expect(content).toMatch(/Skill Memories.*read and apply/);
    expect(content).toContain('skill-memories/grill.md');
  });
});

/**
 * Verify that all SKILL.md files with skill memories use the instruction-based
 * format (not DCI shell commands). The instruction tells the LLM to read the
 * skill-memories file directly rather than executing a shell script.
 */
describe('Instruction-Based Skill Memory Format (E2E from real SKILL.md)', () => {
  const pluginsDir = path.join(process.cwd(), 'plugins/specweave/skills');

  /**
   * Extract the skill memory instruction from a SKILL.md file.
   * Instruction format: **Skill Memories**: If `.specweave/skill-memories/{skill}.md` exists, read and apply its learnings.
   */
  function extractMemoryInstruction(skillDir: string): string | null {
    const skillPath = path.join(pluginsDir, skillDir, 'SKILL.md');
    if (!fs.existsSync(skillPath)) return null;

    const content = fs.readFileSync(skillPath, 'utf-8');
    const match = content.match(/\*\*Skill Memories\*\*:.*read and apply.*learnings/);
    return match ? match[0] : null;
  }

  /**
   * Extract skill name from a memory instruction.
   * Format: skill-memories/{name}.md
   */
  function extractSkillName(instruction: string): string | null {
    const match = instruction.match(/skill-memories\/(\S+)\.md/);
    return match ? match[1] : null;
  }

  it('pm SKILL.md contains instruction-based skill memory reference', () => {
    const instruction = extractMemoryInstruction('pm');
    expect(instruction).not.toBeNull();
    expect(instruction).toContain('skill-memories/pm.md');
  });

  it('grill SKILL.md contains instruction-based skill memory reference', () => {
    const instruction = extractMemoryInstruction('grill');
    expect(instruction).not.toBeNull();
    expect(instruction).toContain('skill-memories/grill.md');
  });

  it('no SKILL.md files use DCI shell commands for skill-memories', () => {
    const skillDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const violations: string[] = [];

    for (const dir of skillDirs) {
      const skillPath = path.join(pluginsDir, dir, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;

      const content = fs.readFileSync(skillPath, 'utf-8');
      // Check for old DCI format: !`...skill-memories...`
      if (content.match(/^!\`.*skill-memories/m)) {
        violations.push(dir);
      }
    }

    expect(violations).toEqual([]);
  });

  it('every skill with memory instruction references the correct skill name', () => {
    const skillDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const mismatches: string[] = [];

    for (const dir of skillDirs) {
      const instruction = extractMemoryInstruction(dir);
      if (!instruction) continue;

      const skillName = extractSkillName(instruction);
      if (!skillName) {
        mismatches.push(`${dir}: no skill name found in instruction`);
      } else if (skillName !== dir) {
        mismatches.push(`${dir}: instruction references "${skillName}" instead of "${dir}"`);
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('every skill with memory instruction uses .specweave/skill-memories/ path', () => {
    const skillDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const violations: string[] = [];

    for (const dir of skillDirs) {
      const instruction = extractMemoryInstruction(dir);
      if (!instruction) continue;

      if (!instruction.includes('.specweave/skill-memories/')) {
        violations.push(dir);
      }
    }

    expect(violations).toEqual([]);
  });
});

/**
 * Verify that priority skills have the ## Project Context DCI block
 * for loading project context via skill-context.sh.
 */
describe('Project Context DCI Blocks', () => {
  const pluginsDir = path.join(process.cwd(), 'plugins/specweave/skills');

  const CONTEXT_SKILLS = ['do', 'auto', 'increment', 'validate'];

  it('priority skills have ## Project Context section', () => {
    const missing: string[] = [];

    for (const skill of CONTEXT_SKILLS) {
      const filePath = path.join(pluginsDir, skill, 'SKILL.md');
      if (!fs.existsSync(filePath)) {
        missing.push(`${skill} (file not found)`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.includes('## Project Context')) {
        missing.push(skill);
      }
    }

    expect(missing).toEqual([]);
  });

  it('Project Context DCI blocks reference skill-context.sh', () => {
    const missing: string[] = [];

    for (const skill of CONTEXT_SKILLS) {
      const filePath = path.join(pluginsDir, skill, 'SKILL.md');
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      if (!content.includes('.specweave/scripts/skill-context.sh')) {
        missing.push(skill);
      }
    }

    expect(missing).toEqual([]);
  });

  it('Project Context DCI blocks do not have ; true (causes permission errors)', () => {
    const violations: string[] = [];

    for (const skill of CONTEXT_SKILLS) {
      const filePath = path.join(pluginsDir, skill, 'SKILL.md');
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const contextLine = content.split('\n').find(l =>
        l.includes('skill-context.sh')
      );
      if (contextLine && contextLine.includes('; true`')) {
        violations.push(skill);
      }
    }

    expect(violations).toEqual([]);
  });

  it('Project Context DCI blocks pass the correct skill name', () => {
    const mismatches: string[] = [];

    for (const skill of CONTEXT_SKILLS) {
      const filePath = path.join(pluginsDir, skill, 'SKILL.md');
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf-8');
      const contextLine = content.split('\n').find(l =>
        l.includes('skill-context.sh')
      );
      if (contextLine && !contextLine.includes(`skill-context.sh ${skill}`)) {
        mismatches.push(`${skill}: DCI block doesn't pass "${skill}" as argument`);
      }
    }

    expect(mismatches).toEqual([]);
  });
});
