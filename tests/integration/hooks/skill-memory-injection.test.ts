/**
 * Integration tests for DCI-based Skill Memory Cascade
 *
 * Tests the DCI one-liner that each SKILL.md uses to load memories.
 * Cascade priority (first-match-wins):
 *   1. .specweave/skill-memories/{skill}.md
 *   2. .claude/skill-memories/{skill}.md
 *   3. ~/.claude/skill-memories/{skill}.md
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
  return `s="${skillName}"; for d in "${projectRoot}/.specweave/skill-memories" "${projectRoot}/.claude/skill-memories" "$HOME/.claude/skill-memories"; do p="$d/$s.md"; [ -f "$p" ] && awk '/^## Learnings$/{ok=1;next}/^## /{ok=0}ok' "$p" && break; done 2>/dev/null; true`;
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

      expect(result.status).toBe(0);
      expect((result.stdout || '').trim()).toBe('');
    });

    it('does not throw when no memory files exist', () => {
      const cmd = buildDciCommand('nonexistent', projectRoot);
      expect(() => {
        execSync(cmd, { encoding: 'utf-8', shell: '/bin/bash' });
      }).not.toThrow();
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
    it('exits 0 when skill-memories directories do not exist', () => {
      // projectRoot has no .specweave/ or .claude/ dirs at all
      const cmd = buildDciCommand('any-skill', projectRoot);
      const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf-8' });

      expect(result.status).toBe(0);
      expect((result.stdout || '').trim()).toBe('');
    });

    it('exits 0 when directories exist but skill file is missing', () => {
      // Create directories but no matching skill file
      fs.mkdirSync(path.join(projectRoot, '.specweave', 'skill-memories'), { recursive: true });
      fs.mkdirSync(path.join(projectRoot, '.claude', 'skill-memories'), { recursive: true });

      const cmd = buildDciCommand('missing-skill', projectRoot);
      const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf-8' });

      expect(result.status).toBe(0);
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

describe('Real SKILL.md DCI Blocks', () => {
  const pluginsDir = path.join(process.cwd(), 'plugins/specweave/skills');

  it('all invocable SKILL.md files have ; true guard for exit code safety', () => {
    const skillDirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const missing: string[] = [];
    for (const dir of skillDirs) {
      const skillPath = path.join(pluginsDir, dir, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;

      const content = fs.readFileSync(skillPath, 'utf-8');
      // Only check skills that have DCI blocks
      if (content.includes('## Project Overrides') && content.includes('!`s=')) {
        if (!content.includes('; true`')) {
          missing.push(dir);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('pm SKILL.md has valid DCI block', () => {
    const content = fs.readFileSync(
      path.join(pluginsDir, 'pm', 'SKILL.md'),
      'utf-8'
    );

    expect(content).toContain('## Project Overrides');
    expect(content).toContain('s="pm"');
    expect(content).toContain('.specweave/skill-memories');
    expect(content).toContain('.claude/skill-memories');
    expect(content).toContain('awk');
    expect(content).toContain('; true`');
  });

  it('grill SKILL.md has valid DCI block', () => {
    const content = fs.readFileSync(
      path.join(pluginsDir, 'grill', 'SKILL.md'),
      'utf-8'
    );

    expect(content).toContain('## Project Overrides');
    expect(content).toContain('s="grill"');
    expect(content).toContain('; true`');
  });
});
