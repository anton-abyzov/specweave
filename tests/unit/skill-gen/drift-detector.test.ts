import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DriftDetector } from '../../../src/core/skill-gen/drift-detector.js';

describe('DriftDetector', () => {
  let tempDir: string;
  let skillsDir: string;
  let docsDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sw-drift-'));
    skillsDir = join(tempDir, '.claude', 'skills');
    docsDir = join(tempDir, '.specweave', 'docs', 'internal');
    await mkdir(docsDir, { recursive: true });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    warnSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('T-018: skip silently when no skills present', () => {
    it('produces no output when .claude/skills/ does not exist', async () => {
      const detector = new DriftDetector(tempDir);
      await detector.check();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('produces no output when .claude/skills/ is empty', async () => {
      await mkdir(skillsDir, { recursive: true });
      const detector = new DriftDetector(tempDir);
      await detector.check();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('T-019: detect stale module references and warn', () => {
    it('warns when a skill references a module not in living docs', async () => {
      await mkdir(skillsDir, { recursive: true });
      await writeFile(
        join(skillsDir, 'my-skill.md'),
        `# My Skill\n\nThis skill handles the OldModule authentication flow.\nUses patterns from OldModule service.\n`,
      );

      // Living docs mention only NewModule
      const reposDir = join(docsDir, 'repos', 'app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(
        join(reposDir, 'overview.md'),
        `# App\n\n## Modules\n\n- NewModule: handles authentication\n- CoreModule: core utilities\n`,
      );

      const detector = new DriftDetector(tempDir);
      await detector.check();

      expect(warnSpy).toHaveBeenCalled();
      const msg = warnSpy.mock.calls[0][0] as string;
      expect(msg).toContain('my-skill.md');
      expect(msg).toContain('OldModule');
    });

    it('does not warn when referenced modules still exist in living docs', async () => {
      await mkdir(skillsDir, { recursive: true });
      await writeFile(
        join(skillsDir, 'my-skill.md'),
        `# My Skill\n\nThis skill handles the AuthModule authentication flow.\n`,
      );

      const reposDir = join(docsDir, 'repos', 'app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(
        join(reposDir, 'overview.md'),
        `# App\n\n## Modules\n\n- AuthModule: handles authentication\n`,
      );

      const detector = new DriftDetector(tempDir);
      await detector.check();

      // No stale-reference warning (there may be an info log but not a stale warning)
      const staleWarns = warnSpy.mock.calls.filter((c) =>
        (c[0] as string).includes('stale'),
      );
      expect(staleWarns.length).toBe(0);
    });
  });

  describe('T-020: error isolation', () => {
    it('catches errors and resolves without rethrowing', async () => {
      await mkdir(skillsDir, { recursive: true });
      await writeFile(join(skillsDir, 'bad-skill.md'), '# Bad Skill\n\nReferences SomeModule.\n');

      // Remove docs dir to trigger read error
      await rm(docsDir, { recursive: true, force: true });

      const detector = new DriftDetector(tempDir);
      await expect(detector.check()).resolves.not.toThrow();
    });
  });
});
