import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { installProjectSkills, removeLegacySkillCopies } from '../../../../src/core/skills/project-skills.js';

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
    expect(exists('.claude/skills/sw-team/SKILL.md')).toBe(true);
  });

  it('drops files a shipped skill no longer has, such as sw-team/agents/', () => {
    installProjectSkills(root);
    write('.agents/skills/sw-team/agents/old-worker.md', 'old');

    const res = installProjectSkills(root);

    expect(res.removed).toContain('.agents/skills/sw-team/agents/old-worker.md');
    expect(exists('.agents/skills/sw-team/agents/old-worker.md')).toBe(false);
  });
});
