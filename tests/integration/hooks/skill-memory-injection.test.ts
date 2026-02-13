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
      // When no files match, the for loop exits with status 1 (no break).
      // Use spawnSync to avoid throwing on non-zero exit.
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
});

describe('Real SKILL.md DCI Blocks', () => {
  const pluginsDir = path.join(process.cwd(), 'plugins/specweave/skills');

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
  });

  it('grill SKILL.md has valid DCI block', () => {
    const content = fs.readFileSync(
      path.join(pluginsDir, 'grill', 'SKILL.md'),
      'utf-8'
    );

    expect(content).toContain('## Project Overrides');
    expect(content).toContain('s="grill"');
  });
});
