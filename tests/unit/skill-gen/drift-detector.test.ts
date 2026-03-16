import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DriftDetector } from '../../../src/core/skill-gen/drift-detector.js';
import type { DriftResult } from '../../../src/core/skill-gen/types.js';

// Mock shared utils to verify DriftDetector uses them
vi.mock('../../../src/core/skill-gen/utils.js', async () => {
  const actual = await vi.importActual<typeof import('../../../src/core/skill-gen/utils.js')>(
    '../../../src/core/skill-gen/utils.js',
  );
  return {
    ...actual,
    collectMarkdownFiles: vi.fn(actual.collectMarkdownFiles),
  };
});

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
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('T-018: skip silently when no skills present', () => {
    it('returns empty array when .claude/skills/ does not exist', async () => {
      const detector = new DriftDetector(tempDir);
      const results = await detector.check();
      expect(results).toEqual([]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('returns empty array when .claude/skills/ is empty', async () => {
      await mkdir(skillsDir, { recursive: true });
      const detector = new DriftDetector(tempDir);
      const results = await detector.check();
      expect(results).toEqual([]);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('T-005: DriftResult[] return type and PASCAL_CASE_EXCLUSIONS', () => {
    it('returns DriftResult[] with staleRefs and validRefs', async () => {
      await mkdir(skillsDir, { recursive: true });
      await writeFile(
        join(skillsDir, 'my-skill.md'),
        `# My Skill\n\nThis skill handles the OldModule authentication flow.\nUses patterns from OldModule service.\n`,
      );

      const reposDir = join(docsDir, 'repos', 'app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(
        join(reposDir, 'overview.md'),
        `# App\n\n## Modules\n\n- NewModule: handles authentication\n- CoreModule: core utilities\n`,
      );

      const detector = new DriftDetector(tempDir);
      const results = await detector.check();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0]).toMatchObject({
        skillFile: 'my-skill.md',
        staleRefs: expect.arrayContaining(['OldModule']),
        validRefs: expect.any(Array),
      });
      // console.warn should NEVER be called
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('returns validRefs for modules that exist in living docs', async () => {
      await mkdir(skillsDir, { recursive: true });
      await writeFile(
        join(skillsDir, 'my-skill.md'),
        `# My Skill\n\nThis skill handles AuthModule and OldModule.\n`,
      );

      const reposDir = join(docsDir, 'repos', 'app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(
        join(reposDir, 'overview.md'),
        `# App\n\n## Modules\n\n- AuthModule: handles authentication\n`,
      );

      const detector = new DriftDetector(tempDir);
      const results = await detector.check();

      expect(results.length).toBe(1);
      expect(results[0].validRefs).toContain('AuthModule');
      expect(results[0].staleRefs).toContain('OldModule');
    });

    it('excludes PASCAL_CASE_EXCLUSIONS from staleRefs', async () => {
      const exclusions = [
        'TypeScript', 'JavaScript', 'SpecWeave', 'ReactComponent', 'NextJs',
        'NodeModule', 'ErrorBoundary', 'PascalCase', 'CamelCase', 'GraphQL',
        'TypeORM', 'PostgreSQL', 'MongoDB', 'CloudFlare', 'GitHub', 'GitLab',
        'BitBucket', 'WebSocket', 'OpenAPI', 'AsyncIterator', 'EventEmitter',
        'ReadStream', 'WriteStream', 'AbortController', 'RegExp', 'ArrayBuffer',
        'SharedWorker', 'ServiceWorker', 'IndexedDB', 'LocalStorage', 'SessionStorage',
      ];

      await mkdir(skillsDir, { recursive: true });
      // Skill references all exclusion words plus a real stale ref
      await writeFile(
        join(skillsDir, 'my-skill.md'),
        `# My Skill\n\n${exclusions.join(' ')} StaleModule\n`,
      );

      // Docs don't mention any of these
      const reposDir = join(docsDir, 'repos', 'app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(join(reposDir, 'overview.md'), `# App\n\nSome content here.\n`);

      const detector = new DriftDetector(tempDir);
      const results = await detector.check();

      expect(results.length).toBe(1);
      // None of the exclusion words should appear in staleRefs
      for (const word of exclusions) {
        expect(results[0].staleRefs).not.toContain(word);
      }
      // But the real stale reference should still be detected
      expect(results[0].staleRefs).toContain('StaleModule');
    });

    it('never calls console.warn even on stale refs', async () => {
      await mkdir(skillsDir, { recursive: true });
      await writeFile(
        join(skillsDir, 'my-skill.md'),
        `# Skill\n\nOldModule is referenced here.\n`,
      );

      const reposDir = join(docsDir, 'repos', 'app');
      await mkdir(reposDir, { recursive: true });
      await writeFile(join(reposDir, 'overview.md'), `# App\n\nNewModule only.\n`);

      const detector = new DriftDetector(tempDir);
      await detector.check();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('never calls console.warn even on errors', async () => {
      await mkdir(skillsDir, { recursive: true });
      await writeFile(join(skillsDir, 'bad-skill.md'), '# Bad\n\nSomeModule.\n');
      await rm(docsDir, { recursive: true, force: true });

      const detector = new DriftDetector(tempDir);
      const results = await detector.check();
      expect(results).toEqual([]);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('T-005: uses shared collectMarkdownFiles from utils', () => {
    it('calls collectMarkdownFiles from utils.ts', async () => {
      const { collectMarkdownFiles } = await import(
        '../../../src/core/skill-gen/utils.js'
      );

      await mkdir(skillsDir, { recursive: true });
      await writeFile(join(skillsDir, 'skill.md'), '# Skill\n\nSomeModule.\n');

      const reposDir = join(docsDir, 'repos');
      await mkdir(reposDir, { recursive: true });
      await writeFile(join(reposDir, 'doc.md'), '# Doc\n\nSomeModule here.\n');

      const detector = new DriftDetector(tempDir);
      await detector.check();

      expect(collectMarkdownFiles).toHaveBeenCalled();
    });
  });

  describe('T-020: error isolation', () => {
    it('catches errors and returns empty array without rethrowing', async () => {
      await mkdir(skillsDir, { recursive: true });
      await writeFile(join(skillsDir, 'bad-skill.md'), '# Bad Skill\n\nReferences SomeModule.\n');
      await rm(docsDir, { recursive: true, force: true });

      const detector = new DriftDetector(tempDir);
      const results = await detector.check();
      expect(results).toEqual([]);
    });
  });
});
