import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readSkillCatalog, type SkillCatalog } from '../../../../src/core/skills/catalog.js';
import { deprecatedSkillNotices } from '../../../../src/core/skills/project-skills.js';

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

  it('skips folders a dry run would remove', () => {
    write('.claude/skills/sw-review/SKILL.md', 'x');
    expect(deprecatedSkillNotices(root, fixture, { skip: ['.claude/skills/sw-review'] })).toEqual([]);
  });
});
