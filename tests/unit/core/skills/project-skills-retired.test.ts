import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHash } from 'crypto';
import { installProjectSkills, removeLegacySkillCopies, RETIRED_SKILL_NAMES } from '../../../../src/core/skills/project-skills.js';
import { LEGACY_SKILL_HASHES } from '../../../../src/core/skills/legacy-skill-hashes.js';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-retired-skills-'));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const write = (rel: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
};
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

describe('retired sw-* project skills (0894)', () => {
  it('removes sw-qa that SpecWeave 2.x installed and 3.x no longer ships', () => {
    write('.agents/skills/sw-qa/SKILL.md', '---\nname: sw-qa\n---\nRun `specweave qa <id>`.\n');
    write('.claude/skills/sw-qa/SKILL.md', '---\nname: sw-qa\n---\nUse sw:qa before closing.\n');

    const removed = removeLegacySkillCopies(root);

    expect(removed.sort()).toEqual(['.agents/skills/sw-qa', '.claude/skills/sw-qa']);
    expect(exists('.agents/skills/sw-qa')).toBe(false);
    expect(exists('.claude/skills/sw-qa')).toBe(false);
  });

  it("keeps a user's own sw-* skill that is not SpecWeave's", () => {
    write('.claude/skills/sw-notes/SKILL.md', '---\nname: sw-notes\n---\nMy software notes.\n');
    expect(removeLegacySkillCopies(root)).toEqual([]);
    expect(exists('.claude/skills/sw-notes/SKILL.md')).toBe(true);
  });

  it('keeps a retired folder that holds extra user files', () => {
    write('.agents/skills/sw-qa/SKILL.md', 'specweave qa\n');
    write('.agents/skills/sw-qa/notes.md', 'mine');
    expect(removeLegacySkillCopies(root)).toEqual([]);
    expect(exists('.agents/skills/sw-qa/notes.md')).toBe(true);
  });

  it('never touches shipped skills, and dry run reports without deleting', () => {
    installProjectSkills(root);
    write('.agents/skills/sw-qa/SKILL.md', 'specweave qa\n');

    expect(removeLegacySkillCopies(root, { dryRun: true })).toEqual(['.agents/skills/sw-qa']);
    expect(exists('.agents/skills/sw-qa')).toBe(true);
    expect(exists('.agents/skills/sw-do/SKILL.md')).toBe(true);
    expect(exists('.claude/skills/sw-review/SKILL.md')).toBe(true);
  });

  it('drops files a shipped skill no longer has', () => {
    installProjectSkills(root);
    write('.agents/skills/sw-do/agents/old-worker.md', 'old');

    const res = installProjectSkills(root);

    expect(res.removed).toContain('.agents/skills/sw-do/agents/old-worker.md');
    expect(exists('.agents/skills/sw-do/agents/old-worker.md')).toBe(false);
  });

  it('removes sw-team and sw-brainstorm only when every file is one a 3.0.x release installed', () => {
    const team = '---\nname: sw-team\n---\nSplit lanes, then `specweave task release --all-mine`.\n';
    const brainstorm = '---\nname: sw-brainstorm\n---\nRecord decisions, then sw:increment.\n';
    const sha = (s: string) => createHash('sha256').update(s).digest('hex');
    const legacyHashes = {
      team: { 'SKILL.md': [sha(team)] },
      brainstorm: { 'SKILL.md': [sha(brainstorm)], 'references/credits.md': [sha('credits')] },
    };
    write('.claude/skills/sw-team/SKILL.md', team);
    write('.agents/skills/sw-team/SKILL.md', team);
    write('.agents/skills/sw-team/notes.md', 'my lane notes');
    write('.agents/skills/sw-brainstorm/SKILL.md', brainstorm);
    write('.agents/skills/sw-brainstorm/references/credits.md', 'credits');
    write('.claude/skills/sw-brainstorm/SKILL.md', brainstorm.replace('Record', 'Always record'));

    expect(removeLegacySkillCopies(root, { legacyHashes }).sort()).toEqual(['.agents/skills/sw-brainstorm', '.claude/skills/sw-team']);
    expect(exists('.agents/skills/sw-team/notes.md')).toBe(true);
    expect(exists('.claude/skills/sw-brainstorm/SKILL.md')).toBe(true);
  });

  it("keeps a hand-written sw-team that merely mentions SpecWeave", () => {
    write('.claude/skills/sw-team/SKILL.md', '---\nname: sw-team\n---\nUse sw:do, then `specweave task list`.\n');
    expect(removeLegacySkillCopies(root)).toEqual([]);
    expect(exists('.claude/skills/sw-team/SKILL.md')).toBe(true);
  });

  it('knows the files of every skill 3.0 shipped', () => {
    expect(Object.keys(LEGACY_SKILL_HASHES).sort()).toEqual(
      ['auto', 'brainstorm', 'do', 'done', 'handoff', 'increment', 'jev', 'project', 'review', 'sync', 'team'],
    );
    for (const files of Object.values(LEGACY_SKILL_HASHES)) expect(files['SKILL.md']?.length).toBeGreaterThan(0);
  });

  it('the retired list matches skills/catalog.json', () => {
    const catalog = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'skills', 'catalog.json'), 'utf-8')) as { retired: string[] };
    expect([...RETIRED_SKILL_NAMES].sort()).toEqual([...catalog.retired].sort());
  });

  it('removes sw-task, the standalone skill SpecWeave 2.x shipped and 3.x retired', () => {
    write('.claude/skills/sw-task/SKILL.md', '---\nname: sw-task\n---\nRun `specweave task claim T-01`.\n');
    expect(removeLegacySkillCopies(root)).toEqual(['.claude/skills/sw-task']);
    expect(exists('.claude/skills/sw-task')).toBe(false);
  });

  it("keeps a user's sw-release skill even when it drives the specweave CLI", () => {
    write(
      '.claude/skills/sw-release/SKILL.md',
      '---\nname: sw-release\n---\nAfter closing, run `specweave complete NNNN` then npm version patch.\n',
    );
    write('.agents/skills/sw-release/SKILL.md', 'Use sw:done, then `specweave verify`.\n');

    expect(removeLegacySkillCopies(root)).toEqual([]);
    expect(exists('.claude/skills/sw-release/SKILL.md')).toBe(true);
    expect(exists('.agents/skills/sw-release/SKILL.md')).toBe(true);
  });

  it('never deletes through a symlinked skills folder', () => {
    const shared = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-shared-skills-'));
    try {
      fs.mkdirSync(path.join(shared, 'sw-qa'), { recursive: true });
      fs.writeFileSync(path.join(shared, 'sw-qa', 'SKILL.md'), 'Run `specweave qa <id>`.\n');
      fs.mkdirSync(path.join(shared, 'review'), { recursive: true });
      fs.writeFileSync(path.join(shared, 'review', 'SKILL.md'), 'Use sw:review.\n');
      fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
      fs.symlinkSync(shared, path.join(root, '.claude', 'skills'), 'dir');
      write('.agents/skills/sw-qa/SKILL.md', 'specweave qa\n');

      expect(removeLegacySkillCopies(root)).toEqual(['.agents/skills/sw-qa']);
      expect(fs.existsSync(path.join(shared, 'sw-qa', 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(shared, 'review', 'SKILL.md'))).toBe(true);
    } finally {
      fs.rmSync(shared, { recursive: true, force: true });
    }
  });

  it('never deletes when a parent of the skills folder is a symlink', () => {
    const shared = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-shared-agents-'));
    try {
      fs.mkdirSync(path.join(shared, 'skills', 'sw-qa'), { recursive: true });
      fs.writeFileSync(path.join(shared, 'skills', 'sw-qa', 'SKILL.md'), 'specweave qa\n');
      fs.symlinkSync(shared, path.join(root, '.agents'), 'dir');

      expect(removeLegacySkillCopies(root)).toEqual([]);
      expect(fs.existsSync(path.join(shared, 'skills', 'sw-qa', 'SKILL.md'))).toBe(true);
    } finally {
      fs.rmSync(shared, { recursive: true, force: true });
    }
  });
});
