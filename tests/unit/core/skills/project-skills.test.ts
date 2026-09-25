import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  SPECWEAVE_SKILLS,
  installProjectSkills,
  removeLegacySkillCopies,
  toProjectSkill,
} from '../../../../src/core/skills/project-skills.js';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-project-skills-'));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const write = (rel: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
};

describe('toProjectSkill', () => {
  it('puts name: sw-<name> first and drops the generated marker', () => {
    const plugin = '---\ndescription: d\nversion: 3.0.0\n---\n<!-- Generated from skills/sw-do/SKILL.md by x. Edit the source. -->\n# body\n';
    expect(toProjectSkill(plugin, 'do')).toBe('---\nname: sw-do\ndescription: d\nversion: 3.0.0\n---\n# body\n');
  });

  it('replaces an existing name', () => {
    expect(toProjectSkill('---\nname: do\ndescription: d\n---\nx\n', 'do')).toBe('---\nname: sw-do\ndescription: d\n---\nx\n');
  });
});

describe('installProjectSkills', () => {
  it('writes both folders, then reports everything unchanged on a second run', () => {
    const first = installProjectSkills(root);
    expect(first.written).toHaveLength(SPECWEAVE_SKILLS.length * 2);
    for (const name of SPECWEAVE_SKILLS) {
      expect(fs.existsSync(path.join(root, '.claude/skills', `sw-${name}`, 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(root, '.agents/skills', `sw-${name}`, 'SKILL.md'))).toBe(true);
    }
    const second = installProjectSkills(root);
    expect(second.written).toEqual([]);
    expect(second.unchanged).toHaveLength(SPECWEAVE_SKILLS.length * 2);
  });

  it('removes files a skill no longer ships from its own sw-<name> folder only', () => {
    write('.claude/skills/sw-team/agents/backend.md', 'old');
    write('.claude/skills/my-skill/SKILL.md', 'mine');
    const result = installProjectSkills(root);
    expect(result.removed).toEqual(['.claude/skills/sw-team/agents/backend.md']);
    expect(fs.existsSync(path.join(root, '.claude/skills/my-skill/SKILL.md'))).toBe(true);
  });

  it('dry run writes nothing', () => {
    const result = installProjectSkills(root, { dryRun: true });
    expect(result.written.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(root, '.claude'))).toBe(false);
  });

  it.skipIf(process.platform === 'win32')('refuses to write through a symlinked skills folder', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-outside-'));
    try {
      fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
      fs.symlinkSync(outside, path.join(root, '.claude', 'skills'));
      expect(() => installProjectSkills(root)).toThrow(/symlink/);
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('removeLegacySkillCopies', () => {
  it('removes the unnamespaced copies SpecWeave installed', () => {
    write('.claude/skills/do/SKILL.md', '---\ndescription: x\n---\nRun `specweave task next <id>` then claim.\n');
    write('.claude/skills/team/SKILL.md', '---\ndescription: x\n---\nThen `sw:done`.\n');
    write('.claude/skills/team/agents/backend.md', 'lane');
    write('.agents/skills/review/SKILL.md', '---\ndescription: x\n---\nclose with sw:done\n');
    expect(removeLegacySkillCopies(root).sort()).toEqual(['.agents/skills/review', '.claude/skills/do', '.claude/skills/team']);
    expect(fs.existsSync(path.join(root, '.claude/skills/do'))).toBe(false);
  });

  it("keeps the user's own skill that happens to share a name", () => {
    write('.claude/skills/review/SKILL.md', '---\ndescription: my review\n---\nReview my code carefully.\n');
    write('.claude/skills/do/SKILL.md', '---\ndescription: x\n---\nspecweave task next\n');
    write('.claude/skills/do/notes.md', 'my own file next to it');
    expect(removeLegacySkillCopies(root)).toEqual([]);
    expect(fs.existsSync(path.join(root, '.claude/skills/review/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, '.claude/skills/do/notes.md'))).toBe(true);
  });

  it('never touches the namespaced sw-* copies', () => {
    installProjectSkills(root);
    expect(removeLegacySkillCopies(root)).toEqual([]);
    expect(fs.existsSync(path.join(root, '.claude/skills/sw-do/SKILL.md'))).toBe(true);
  });
});
