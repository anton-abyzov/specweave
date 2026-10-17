import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  catalogFor,
  defaultPluginSkillsDir,
  installProjectSkills,
  projectSkillStates,
  removeLegacySkillCopies,
  toProjectSkill,
} from '../../../../src/core/skills/project-skills.js';

let root: string;
const CATALOG = catalogFor(defaultPluginSkillsDir());

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
const exists = (rel: string) => fs.existsSync(path.join(root, rel));
const config = (value: unknown) => write('.specweave/config.json', JSON.stringify(value));

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
  it('installs the core skills only, in both folders, then reports everything unchanged', () => {
    expect(CATALOG.core).toEqual(['increment', 'do', 'auto', 'done', 'review', 'handoff']);
    const first = installProjectSkills(root);
    expect(first.installed).toEqual(CATALOG.core);
    const skillFiles = (files: string[]) => files.filter(f => f.endsWith('/SKILL.md'));
    expect(skillFiles(first.written)).toHaveLength(CATALOG.core.length * 2);
    for (const base of ['.claude/skills', '.agents/skills']) {
      expect(fs.readdirSync(path.join(root, base)).sort()).toEqual(CATALOG.core.map(n => `sw-${n}`).sort());
    }
    const second = installProjectSkills(root);
    expect(second.written).toEqual([]);
    expect(second.unchanged).toHaveLength(first.written.length);
  });

  it('removes files a skill no longer ships from its own sw-<name> folder only', () => {
    write('.claude/skills/sw-do/agents/backend.md', 'old');
    write('.claude/skills/my-skill/SKILL.md', 'mine');
    const result = installProjectSkills(root);
    expect(result.removed).toEqual(['.claude/skills/sw-do/agents/backend.md']);
    expect(exists('.claude/skills/my-skill/SKILL.md')).toBe(true);
  });

  it('installs optional skills listed under skills.enabled', () => {
    config({ skills: { enabled: ['grill-me', 'sw-glossary'] } });
    const result = installProjectSkills(root);
    expect(result.installed).toEqual([...CATALOG.core, 'grill-me', 'glossary']);
    for (const base of ['.claude/skills', '.agents/skills']) {
      expect(fs.readFileSync(path.join(root, base, 'sw-grill-me', 'SKILL.md'), 'utf-8')).toMatch(/^---\nname: sw-grill-me\n/);
      expect(exists(`${base}/sw-glossary/references/credits.md`)).toBe(true);
    }
  });

  it('installs detected skills, unless skills.disabled lists them', () => {
    write('GLOSSARY.md', '### Order\nA request to buy.\n');
    write('.specweave/project/hub.json', '{}');
    config({ jev: { enabled: true }, sync: { github: { enabled: true } }, planning: { deepInterview: 'deep' } });
    expect(installProjectSkills(root).installed).toEqual([...CATALOG.core, 'grill-me', 'glossary', 'sync', 'project', 'jev']);

    config({ jev: { enabled: true }, sync: { github: { enabled: true } }, planning: { deepInterview: 'deep' }, skills: { disabled: ['glossary', 'jev'] } });
    const result = installProjectSkills(root);
    expect(result.installed).toEqual([...CATALOG.core, 'grill-me', 'sync', 'project']);
    expect(result.removedSkills.sort()).toEqual([
      '.agents/skills/sw-glossary', '.agents/skills/sw-jev', '.claude/skills/sw-glossary', '.claude/skills/sw-jev',
    ]);
    expect(exists('.claude/skills/sw-glossary')).toBe(false);
  });

  it('enabled wins over disabled, and states give the reason', () => {
    write('GLOSSARY.md', '### Order\n');
    config({ skills: { enabled: ['jev'], disabled: ['jev'] } });
    const states = projectSkillStates(root);
    expect(states.find(s => s.name === 'jev')).toMatchObject({ on: true, reason: 'enabled' });
    expect(states.find(s => s.name === 'glossary')).toMatchObject({ on: true, reason: 'detected', detail: 'GLOSSARY.md' });
    expect(states.find(s => s.name === 'sync')).toMatchObject({ on: false, reason: 'off' });
    expect(states.find(s => s.name === 'do')).toMatchObject({ on: true, reason: 'core' });
  });

  it("keeps a turned-off folder that is not SpecWeave's copy", () => {
    config({ skills: { enabled: ['grill-me', 'glossary'] } });
    installProjectSkills(root);
    write('.claude/skills/sw-grill-me/my-notes.md', 'mine');
    write('.agents/skills/sw-glossary/.vskill-meta.json', '{}');
    write('.claude/skills/sw-jev/SKILL.md', '---\nname: my-jev\n---\nmine\n');
    config({});
    const result = installProjectSkills(root);
    expect(result.removedSkills.sort()).toEqual(['.agents/skills/sw-grill-me', '.claude/skills/sw-glossary']);
    expect(exists('.claude/skills/sw-grill-me/my-notes.md')).toBe(true);
    expect(exists('.agents/skills/sw-glossary/.vskill-meta.json')).toBe(true);
    expect(exists('.claude/skills/sw-jev/SKILL.md')).toBe(true);
  });

  it('dry run writes and removes nothing', () => {
    config({ skills: { enabled: ['grill-me'] } });
    installProjectSkills(root);
    config({});
    const result = installProjectSkills(root, { dryRun: true });
    expect(result.removedSkills).toContain('.claude/skills/sw-grill-me');
    expect(exists('.claude/skills/sw-grill-me/SKILL.md')).toBe(true);
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-dry-'));
    try {
      expect(installProjectSkills(fresh, { dryRun: true }).written.length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(fresh, '.claude'))).toBe(false);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
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
    expect(exists('.claude/skills/do')).toBe(false);
  });

  it("keeps the user's own skill that happens to share a name", () => {
    write('.claude/skills/review/SKILL.md', '---\ndescription: my review\n---\nReview my code carefully.\n');
    write('.claude/skills/do/SKILL.md', '---\ndescription: x\n---\nspecweave task next\n');
    write('.claude/skills/do/notes.md', 'my own file next to it');
    expect(removeLegacySkillCopies(root)).toEqual([]);
    expect(exists('.claude/skills/review/SKILL.md')).toBe(true);
    expect(exists('.claude/skills/do/notes.md')).toBe(true);
  });

  it('never touches the namespaced sw-* copies', () => {
    installProjectSkills(root);
    expect(removeLegacySkillCopies(root)).toEqual([]);
    expect(exists('.claude/skills/sw-do/SKILL.md')).toBe(true);
  });
});
