import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { RuleCollector, MAX_RULES_TOKENS, MAX_PER_FILE_TOKENS } from '../../../src/core/skill-gen/rule-collector.js';

describe('RuleCollector', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-rules-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('constants', () => {
    it('exports MAX_RULES_TOKENS as 10000', () => {
      expect(MAX_RULES_TOKENS).toBe(10_000);
    });

    it('exports MAX_PER_FILE_TOKENS as 2000', () => {
      expect(MAX_PER_FILE_TOKENS).toBe(2_000);
    });
  });

  describe('collectExistingRules', () => {
    it('returns empty string when no rule files exist', async () => {
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toBe('');
    });

    it('includes CLAUDE.md when present', async () => {
      await writeFile(join(tempDir, 'CLAUDE.md'), '# Rules\nUse Zod for validation');
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toContain('--- rule: CLAUDE.md ---');
      expect(result).toContain('Use Zod for validation');
    });

    it('includes .cursorrules when present', async () => {
      await writeFile(join(tempDir, '.cursorrules'), 'Always use TypeScript');
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toContain('--- rule: .cursorrules ---');
      expect(result).toContain('Always use TypeScript');
    });

    it('includes .github/copilot-instructions.md when present', async () => {
      await mkdir(join(tempDir, '.github'), { recursive: true });
      await writeFile(
        join(tempDir, '.github', 'copilot-instructions.md'),
        'Copilot rules here',
      );
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toContain('--- rule: .github/copilot-instructions.md ---');
      expect(result).toContain('Copilot rules here');
    });

    it('truncates per-file content at 2K tokens (8K chars)', async () => {
      // 10K chars > 8K char limit (2K tokens * 4 chars/token)
      const content = 'x'.repeat(10_000);
      await writeFile(join(tempDir, 'CLAUDE.md'), content);
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toContain('[...truncated]');
      // The rule header + 8K truncated content + marker, NOT 10K
      const ruleContent = result.replace('--- rule: CLAUDE.md ---\n', '');
      expect(ruleContent.length).toBeLessThan(10_000);
      // Should start with 8000 'x' characters
      expect(ruleContent.startsWith('x'.repeat(8_000))).toBe(true);
    });

    it('enforces total 10K token cap across all files', async () => {
      // Each file: 8000 chars = exactly 2000 tokens (per-file cap, no truncation)
      // 10K token budget / 2000 tokens per file = 5 files fit exactly
      const content = 'a'.repeat(8_000);
      await writeFile(join(tempDir, 'CLAUDE.md'), content);
      await writeFile(join(tempDir, '.cursorrules'), content);
      await mkdir(join(tempDir, '.github'), { recursive: true });
      await writeFile(join(tempDir, '.github', 'copilot-instructions.md'), content);
      // 3 known files + 4 skill files = 7 total, only 5 should fit
      for (const name of ['skill-a', 'skill-b', 'skill-c', 'skill-d']) {
        await mkdir(join(tempDir, '.claude', 'skills', name), { recursive: true });
        await writeFile(join(tempDir, '.claude', 'skills', name, 'SKILL.md'), content);
      }

      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      const fileCount = (result.match(/--- rule:/g) || []).length;
      expect(fileCount).toBe(5);
    });

    it('skips empty files (0 bytes)', async () => {
      await writeFile(join(tempDir, 'CLAUDE.md'), '');
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toBe('');
    });

    it('skips whitespace-only files', async () => {
      await writeFile(join(tempDir, 'CLAUDE.md'), '  \n  \t  ');
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toBe('');
    });

    it('finds .cursor/rules/*.mdc files', async () => {
      await mkdir(join(tempDir, '.cursor', 'rules'), { recursive: true });
      await writeFile(
        join(tempDir, '.cursor', 'rules', 'test.mdc'),
        'Cursor rule content',
      );
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toContain('.cursor/rules/test.mdc');
      expect(result).toContain('Cursor rule content');
    });

    it('finds .claude/skills/**/*.md files recursively', async () => {
      await mkdir(join(tempDir, '.claude', 'skills', 'my-skill'), {
        recursive: true,
      });
      await writeFile(
        join(tempDir, '.claude', 'skills', 'my-skill', 'SKILL.md'),
        'My skill rules',
      );
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toContain('.claude/skills/my-skill/SKILL.md');
      expect(result).toContain('My skill rules');
    });

    it('combines multiple rule sources', async () => {
      await writeFile(join(tempDir, 'CLAUDE.md'), 'Claude rules');
      await writeFile(join(tempDir, '.cursorrules'), 'Cursor rules');
      await mkdir(join(tempDir, '.claude', 'skills', 'foo'), { recursive: true });
      await writeFile(
        join(tempDir, '.claude', 'skills', 'foo', 'SKILL.md'),
        'Foo skill',
      );

      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toContain('--- rule: CLAUDE.md ---');
      expect(result).toContain('--- rule: .cursorrules ---');
      expect(result).toContain('.claude/skills/foo/SKILL.md');
    });

    it('handles missing directories gracefully', async () => {
      // .claude/skills and .cursor/rules don't exist — should not throw
      await writeFile(join(tempDir, 'CLAUDE.md'), 'Some rules');
      const collector = new RuleCollector(tempDir);
      const result = await collector.collectExistingRules();
      expect(result).toContain('CLAUDE.md');
    });
  });
});
