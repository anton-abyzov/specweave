import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { copyPluginSkillsToProject } from '../../src/utils/plugin-copier.js';

const temporary: string[] = [];
afterEach(() => { for (const dir of temporary.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-native-skills-'));
  temporary.push(root);
  const source = path.join(root, 'package');
  const project = path.join(root, 'project');
  const skill = path.join(source, 'plugins/sw/skills/project');
  fs.mkdirSync(path.join(source, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(skill, 'scripts'), { recursive: true });
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(source, '.claude-plugin/marketplace.json'), JSON.stringify({ plugins: [{ name: 'sw', source: 'plugins/sw', version: '2.3.0' }] }));
  fs.writeFileSync(path.join(skill, 'SKILL.md'), '---\ndescription: Project work\nallowed-tools: Bash\n---\nUse scripts/check.mjs.\n');
  fs.writeFileSync(path.join(skill, 'scripts/check.mjs'), 'export const check = true;');
  const copy = (destination = project) => copyPluginSkillsToProject('sw', source, destination, { targetSkillsDir: '.agents/skills' });
  return { root, project, skill, copy, target: path.join(project, '.agents/skills/sw-project') };
}
describe('native skill installation receipts and preservation', () => {
  it('installs independently in each project and the native path despite a legacy installation', () => {
    const f = fixture();
    fs.mkdirSync(path.join(f.project, '.codex/skills/project'), { recursive: true });
    fs.writeFileSync(path.join(f.project, '.codex/skills/project/SKILL.md'), 'legacy customization');
    expect(f.copy().success).toBe(true);
    expect(fs.readFileSync(path.join(f.target, 'SKILL.md'), 'utf8')).toContain('name: sw-project');
    expect(fs.readFileSync(path.join(f.project, '.codex/skills/project/SKILL.md'), 'utf8')).toBe('legacy customization');
    const second = path.join(f.root, 'second');
    expect(f.copy(second).skipped).toBe(false);
    expect(fs.existsSync(path.join(second, '.agents/skills/sw-project/scripts/check.mjs'))).toBe(true);
    expect(f.copy().skipped).toBe(true);
  });
  it('preserves unnamespaced custom skills and backs up changed namespaced skills', () => {
    const f = fixture();
    fs.mkdirSync(path.join(f.project, '.agents/skills/project'), { recursive: true });
    fs.writeFileSync(path.join(f.project, '.agents/skills/project/SKILL.md'), 'custom project');
    fs.mkdirSync(f.target);
    fs.writeFileSync(path.join(f.target, 'SKILL.md'), 'custom sw-project');
    const result = f.copy();
    expect(result.success).toBe(true);
    expect(fs.readFileSync(path.join(f.project, '.agents/skills/project/SKILL.md'), 'utf8')).toBe('custom project');
    expect(result.backups).toHaveLength(1);
    expect(fs.readFileSync(path.join(result.backups![0], 'SKILL.md'), 'utf8')).toBe('custom sw-project');
    expect(f.copy().backups).toEqual([]);
  });
  it('repairs missing companion resources even when SKILL.md is unchanged', () => {
    const f = fixture(); f.copy();
    fs.unlinkSync(path.join(f.target, 'scripts/check.mjs'));
    expect(f.copy().skipped).toBe(false);
    expect(fs.readFileSync(path.join(f.target, 'scripts/check.mjs'), 'utf8')).toContain('check = true');
  });
  it('preserves executable companion files and repairs changed permission bits', () => {
    const f = fixture();
    fs.chmodSync(path.join(f.skill, 'scripts/check.mjs'), 0o755);
    expect(f.copy().success).toBe(true);
    const installed = path.join(f.target, 'scripts/check.mjs');
    expect(fs.statSync(installed).mode & 0o777).toBe(0o755);
    fs.chmodSync(installed, 0o644);
    expect(f.copy().skipped).toBe(false);
    expect(fs.statSync(installed).mode & 0o777).toBe(0o755);
  });
  it.each(['.agents', '.agents/skills/sw-project', '.agents/skills/sw-project/SKILL.md', '.specweave'])('rejects symlink destination %s', relative => {
    const f = fixture();
    const link = path.join(f.project, relative);
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(path.join(f.root, 'outside-missing'), link);
    expect(f.copy().success).toBe(false);
    expect(fs.existsSync(path.join(f.root, 'outside-missing'))).toBe(false);
  });
});
