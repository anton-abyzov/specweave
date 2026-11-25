import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readSkillCatalog, type SkillCatalog } from '../../../../src/core/skills/catalog.js';
import { deprecatedSkillNotices, installProjectSkills } from '../../../../src/core/skills/project-skills.js';

let root: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-deprecated-skills-'));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const write = (rel: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
};

const writeCatalog = (catalog: Record<string, unknown>) => {
  write('plugin/skills-catalog.json', JSON.stringify(catalog));
  return readSkillCatalog(path.join(root, 'plugin'));
};

const fixture: SkillCatalog = {
  core: ['do', 'review'],
  optional: [{ name: 'sync', summary: 'Sync' }],
  retired: [],
  deprecated: [{ name: 'review', replacedBy: 'mcp:specweave:review', message: 'Use the MCP review tool.' }],
};

describe('skill catalog deprecated overlay (1486)', () => {
  it('defaults deprecated to [] when the catalog has none', () => {
    const catalog = writeCatalog({ core: ['do'], optional: [], retired: ['qa'] });
    expect(catalog.deprecated).toEqual([]);
    expect(catalog.retired).toEqual(['qa']);
  });

  it('keeps well-formed entries, drops malformed ones, and leaves the name in core', () => {
    const catalog = writeCatalog({
      core: ['do', 'review'],
      optional: [],
      deprecated: [
        { name: 'review', replacedBy: 'none', message: 'Gone soon.' },
        { name: 'sw-do', replacedBy: 'anton-abyzov/vskill/do', message: 'Moved.' },
        { name: 'x', replacedBy: 'none' },
        { name: '', replacedBy: 'none', message: 'm' },
        { name: 'y', replacedBy: 3, message: 'm' },
        'z',
        null,
      ],
    });
    expect(catalog.deprecated).toEqual([
      { name: 'review', replacedBy: 'none', message: 'Gone soon.' },
      { name: 'do', replacedBy: 'anton-abyzov/vskill/do', message: 'Moved.' },
    ]);
    expect(catalog.core).toEqual(['do', 'review']);
    expect(writeCatalog({ core: [], optional: [], deprecated: 'nope' }).deprecated).toEqual([]);
  });

  it('the shipped catalog has an empty deprecated list', () => {
    const shipped = readSkillCatalog(path.join(process.cwd(), 'plugins', 'specweave'));
    expect(shipped.deprecated).toEqual([]);
  });

  it('prints one notice for an installed deprecated skill and leaves its folders untouched', () => {
    const content = '---\nname: sw-review\n---\nReview.\n';
    write('.claude/skills/sw-review/SKILL.md', content);
    write('.agents/skills/sw-review/SKILL.md', content);

    expect(deprecatedSkillNotices(root, fixture)).toEqual([
      'sw-review is deprecated: Use the MCP review tool. Replaced by: mcp:specweave:review. The skill stays installed.',
    ]);
    expect(fs.readFileSync(path.join(root, '.claude/skills/sw-review/SKILL.md'), 'utf8')).toBe(content);
    expect(fs.readFileSync(path.join(root, '.agents/skills/sw-review/SKILL.md'), 'utf8')).toBe(content);
  });

  it('finds the skill in .agents/skills alone', () => {
    write('.agents/skills/sw-review/SKILL.md', 'x');
    expect(deprecatedSkillNotices(root, fixture)).toHaveLength(1);
  });

  it('prints nothing when the deprecated skill is not installed', () => {
    write('.claude/skills/sw-do/SKILL.md', 'x');
    expect(deprecatedSkillNotices(root, fixture)).toEqual([]);
    expect(deprecatedSkillNotices(root, { ...fixture, deprecated: [] })).toEqual([]);
  });

});

/**
 * The real installer with a fixture plugin (core `do`, `review`; optional `sync`),
 * run in the order `specweave update` uses: notices first, then install.
 */
describe('installProjectSkills keeps installed deprecated skills (1486)', () => {
  const sourceDir = () => path.join(root, 'plugin', 'skills');
  const skillMd = (name: string, body: string) => `---\nname: ${name}\ndescription: d\nmetadata:\n  version: "1.0.0"\n---\n${body}\n`;
  const plugin = (deprecated: SkillCatalog['deprecated'], bodies: Record<string, string> = {}) => {
    write('plugin/skills-catalog.json', JSON.stringify({ core: ['do', 'review'], optional: [{ name: 'sync', summary: 'Sync' }], retired: [], deprecated }));
    write('plugin/skills/do/SKILL.md', skillMd('do', bodies.do ?? 'Do v1.'));
    write('plugin/skills/review/SKILL.md', skillMd('review', bodies.review ?? 'Review v1.'));
    write('plugin/skills-optional/sync/SKILL.md', skillMd('sync', bodies.sync ?? 'Sync v1.'));
  };
  const config = (skills: Record<string, string[]>) => write('.specweave/config.json', JSON.stringify({ skills }));
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
  const update = () => {
    const catalog = readSkillCatalog(path.join(root, 'plugin'));
    const notices = deprecatedSkillNotices(root, catalog);
    return { notices, result: installProjectSkills(root, { sourceDir: sourceDir() }) };
  };

  it('leaves an edited core copy byte-identical and prints its notice', () => {
    plugin([]);
    installProjectSkills(root, { sourceDir: sourceDir() });
    const edited = read('.agents/skills/sw-review/SKILL.md') + '\nMy local notes.\n';
    write('.agents/skills/sw-review/SKILL.md', edited);
    write('.agents/skills/sw-review/extra.md', 'mine');
    const pristineClaude = read('.claude/skills/sw-review/SKILL.md');

    plugin([{ name: 'review', replacedBy: 'mcp:specweave:review', message: 'Use the MCP review tool.' }], { review: 'Review v2.', do: 'Do v2.' });
    const { notices, result } = update();

    expect(notices).toEqual(['sw-review is deprecated: Use the MCP review tool. Replaced by: mcp:specweave:review. The skill stays installed.']);
    expect(read('.agents/skills/sw-review/SKILL.md')).toBe(edited);
    expect(read('.agents/skills/sw-review/extra.md')).toBe('mine');
    expect(read('.claude/skills/sw-review/SKILL.md')).toBe(pristineClaude);
    expect(result.keptDeprecated.sort()).toEqual(['.agents/skills/sw-review', '.claude/skills/sw-review']);
    expect(result.written.some((f) => f.includes('sw-review'))).toBe(false);
    expect(read('.claude/skills/sw-do/SKILL.md')).toContain('Do v2.');
  });

  it('keeps a pristine optional copy that is now off and prints its notice', () => {
    plugin([]);
    config({ enabled: ['sync'] });
    installProjectSkills(root, { sourceDir: sourceDir() });
    const before = read('.claude/skills/sw-sync/SKILL.md');

    config({ disabled: ['sync'] });
    plugin([{ name: 'sync', replacedBy: 'none', message: 'Sync moves to the tracker app.' }]);
    const { notices, result } = update();

    expect(notices).toEqual(['sw-sync is deprecated: Sync moves to the tracker app. Replaced by: none. The skill stays installed.']);
    expect(result.removedSkills).toEqual([]);
    expect(read('.claude/skills/sw-sync/SKILL.md')).toBe(before);
    expect(fs.existsSync(path.join(root, '.agents/skills/sw-sync/SKILL.md'))).toBe(true);
    expect(deprecatedSkillNotices(root, readSkillCatalog(path.join(root, 'plugin')))).toHaveLength(1);
  });

  it('without the overlay the same off optional copy is removed (control)', () => {
    plugin([]);
    config({ enabled: ['sync'] });
    installProjectSkills(root, { sourceDir: sourceDir() });
    config({ disabled: ['sync'] });
    expect(installProjectSkills(root, { sourceDir: sourceDir() }).removedSkills.sort()).toEqual(['.agents/skills/sw-sync', '.claude/skills/sw-sync']);
  });

  it('installs a deprecated core skill fresh when it is not installed yet', () => {
    plugin([{ name: 'review', replacedBy: 'none', message: 'Going away.' }]);
    const { notices, result } = update();
    expect(notices).toEqual([]);
    expect(result.keptDeprecated).toEqual([]);
    expect(read('.claude/skills/sw-review/SKILL.md')).toContain('Review v1.');
  });
});
