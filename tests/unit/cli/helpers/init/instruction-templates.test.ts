import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseTemplate } from '../../../../../src/cli/helpers/init/instruction-file-merger.js';

const ROOT = process.cwd();
const TEMPLATES_DIR = path.join(ROOT, 'src/templates');
const read = (name: string): string => fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');
const skill = (name: string): string => fs.readFileSync(path.join(ROOT, 'skills', name, 'SKILL.md'), 'utf-8');

/** Shell constructs that Windows shells and weaker models copy literally. */
const BASH_ONLY: Array<{ label: string; re: RegExp }> = [
  { label: 'rm -f', re: /\brm -r?f\b/ },
  { label: 'find | pipe', re: /\bfind\b[^\n]*\|/ },
  { label: 'for d in', re: /\bfor \w+ in\b/ },
  { label: 'export', re: /(^|[\s`])export\s+\w+=/ },
  { label: 'mkdir -p', re: /\bmkdir -p\b/ },
  { label: '$(...)', re: /\$\([^)]*\)/ },
  { label: 'mv *.md', re: /\bmv \*\./ },
];

const ALLOWED_PLACEHOLDERS = new Set(['{PROJECT_NAME}', '{{BUILD_CMD}}', '{{TEST_CMD}}', '{{LINT_CMD}}']);

/** Every shipped skill (skills/catalog.json, core and optional). Nothing else may be referenced. */
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, 'skills', 'catalog.json'), 'utf-8')) as {
  core: string[];
  optional: Array<{ name: string }>;
};
const CORE_SKILLS = new Set([...CATALOG.core, ...CATALOG.optional.map((s) => s.name)]);

/** Text inside backticks, in template order. */
function backticked(content: string): string[] {
  return (content.match(/`[^`\n]+`/g) ?? []).map(s => s.slice(1, -1));
}

/** First sub-command of every backticked `specweave <cmd> …` span. */
function specweaveCommands(content: string): string[] {
  const out = new Set<string>();
  for (const span of backticked(content)) {
    const m = span.match(/^specweave\s+([a-z][\w-]*)/);
    if (m) out.add(m[1]);
  }
  return [...out].sort();
}

function slashSkills(content: string): string[] {
  return [...new Set((content.match(/\/sw:([a-z][\w-]*)/g) ?? []).map(s => s.slice(4)))].sort();
}

/** Commands registered on the CLI (`.command('name <arg>')`). */
function registeredCommands(): Set<string> {
  const bin = fs.readdirSync(path.join(ROOT, 'bin')).filter(name => name.endsWith('.js')).map(name => fs.readFileSync(path.join(ROOT, 'bin', name), 'utf-8')).join('\n');
  const names = (bin.match(/\.command\('([^']+)'/g) ?? []).map(m =>
    m.replace(/^\.command\('/, '').replace(/'$/, '').split(/\s+/)[0]
  );
  return new Set(names);
}

describe('CLAUDE.md.template / AGENTS.md.template (2.0)', () => {
  const claude = read('CLAUDE.md.template');
  const agents = read('AGENTS.md.template');
  const readme = read('README.md.template');
  const shipped: Array<[string, string]> = [
    ['CLAUDE.md.template', claude],
    ['AGENTS.md.template', agents],
    ['README.md.template', readme],
  ];

  it('AGENTS.md is the one instruction file and CLAUDE.md imports it', () => {
    // Only the opening paragraph is managed: `specweave update` has nothing else to overwrite.
    expect(parseTemplate(agents).sections.map(s => `${s.id}${s.required ? '!' : ''}`)).toEqual(['header!']);
    expect(parseTemplate(claude).sections.map(s => `${s.id}${s.required ? '!' : ''}`)).toEqual(['header!']);
    expect(parseTemplate(claude).sections[0].content.trim()).toBe('@AGENTS.md');
    expect(parseTemplate(claude).tail).toBe('');
    expect(agents).not.toContain('## The loop');
    expect(agents).not.toContain('## Rules');
  });

  it('AGENTS.md points at pickup and the skills, which carry the loop', () => {
    expect(agents).toContain('`specweave pickup`');
    expect(agents).toContain('`.agents/skills/`');
    expect(agents).toContain('`.claude/skills/`');
    expect(agents).not.toContain('tasks.md');
    // The loop the template used to spell out lives in the skill sources.
    expect(skill('sw-handoff')).toMatch(/says "hand off"/);
    expect(skill('sw-handoff')).toMatch(/says "pick up"/);
    expect(skill('sw-handoff')).toContain('specweave handoff --reason');
    expect(skill('sw-increment')).toContain('"Verify and close 0042"');
    expect(skill('sw-increment')).toContain('`specweave small-fix "<why>"`');
    expect(skill('sw-do')).toContain('## Finish without asking');
    expect(skill('sw-project')).toContain('.specweave/memory/');
  });

  it('the skills have agents check ACs from the outside, not add unit tests by default', () => {
    expect(skill('sw-increment')).toContain('A `Test` checks the AC from the outside');
    expect(skill('sw-increment')).toMatch(/new unit or integration tests only when the/);
    expect(skill('sw-do')).toMatch(/Never widen a task's `Files` or weaken a test/);
  });

  it('sw-do carries the ledger and workspace rules the template used to hold', () => {
    const doSkill = skill('sw-do');
    expect(doSkill).toContain('specweave task done T-03 --run');
    expect(doSkill).toContain('A claim older than 2 hours');
    expect(doSkill).toContain('keep every line from both sides');
    expect(doSkill).toContain('"e":"claim"');
    expect(doSkill).toContain('`workspace.repos`');
    expect(doSkill).toContain('never commit `.env*`');
    expect(readme).not.toContain('`specweave task claim T-NN` → implement');
  });

  it.each(shipped)('%s carries no repo-owner policy (browser, worktree, licensing, product caveats)', (_name, content) => {
    expect(content).not.toMatch(/headless|PLAYWRIGHT_HTML_OPEN|PWDEBUG/);
    expect(content).not.toContain('git worktree add');
    expect(content).not.toMatch(/identity and licensing|provenance|SpecWithCode/);
  });

  it.each([
    ['CLAUDE.md.template', claude],
    ['AGENTS.md.template', agents],
  ])('%s contains no bash-only syntax', (_name, content) => {
    const offenders: string[] = [];
    content.split('\n').forEach((line, i) => {
      for (const { label, re } of BASH_ONLY) {
        if (re.test(line)) offenders.push(`${i + 1}: [${label}] ${line.trim()}`);
      }
    });
    expect(offenders).toEqual([]);
  });

  it.each([
    ['CLAUDE.md.template', claude],
    ['AGENTS.md.template', agents],
  ])('%s uses only the supported placeholders', (_name, content) => {
    const found = new Set(content.match(/\{\{?[A-Z_]+\}?\}/g) ?? []);
    for (const p of found) expect(ALLOWED_PLACEHOLDERS.has(p), `unexpected placeholder ${p}`).toBe(true);
    // CLAUDE.md is the bare import; only AGENTS.md carries the project name.
    expect(found.has('{PROJECT_NAME}')).toBe(_name === 'AGENTS.md.template');
  });

  it.each([
    ['CLAUDE.md.template', claude],
    ['AGENTS.md.template', agents],
  ])('%s keeps the managed block small and unconditional', (_name, content) => {
    const t = parseTemplate(content);
    expect(t.sections.filter(s => s.when)).toEqual([]);
    const rendered = [...t.sections.map(s => s.content), t.tail].join('\n\n');
    // About 125 tokens for AGENTS.md (it was about 1,270 in 3.1): the loop lives in the skills.
    expect(rendered.length).toBeLessThanOrEqual(700);
    expect(t.sections.map(s => s.content).join('\n')).not.toContain('## Commands');
  });

  it('AGENTS.md keeps Project notes outside the managed block', () => {
    expect(parseTemplate(agents).tail).toContain('## Project notes');
  });

  it('AGENTS.md keeps the Commands table outside the managed block', () => {
    expect(parseTemplate(agents).tail).toMatch(/^## Commands\n/);
  });

  it.each(shipped)('every `specweave <cmd>` in %s is registered in bin/specweave.js', (_name, content) => {
    const registered = registeredCommands();
    const unknown = specweaveCommands(content).filter(c => !registered.has(c));
    expect(unknown).toEqual([]);
  });

  it.each(shipped)('every /sw:<skill> in %s is a shipped skill that exists', (_name, content) => {
    const referenced = slashSkills(content);
    expect(referenced.filter(s => !CORE_SKILLS.has(s))).toEqual([]);
    const missing = referenced
      .filter(s => !['skills', 'skills-optional'].some(dir => fs.existsSync(path.join(ROOT, 'plugins/specweave', dir, s, 'SKILL.md'))));
    expect(missing).toEqual([]);
  });

  it('AGENTS.md names no plugin slash command; standalone installs are listed in skills/README.md', () => {
    expect(agents).not.toMatch(/`\/sw:/);
    // the sw-* skills are vskill-installed standalone skills, not plugin commands;
    // the canonical ref carries no `skills/` segment
    const skillsReadme = fs.readFileSync(path.join(ROOT, 'skills', 'README.md'), 'utf-8');
    expect(skillsReadme).toContain('npx vskill install anton-abyzov/specweave/sw-do');
  });

  it('README.md.template is short and only needs {{PROJECT_NAME}}', () => {
    expect(readme.split('\n').length).toBeLessThanOrEqual(30);
    const found = new Set(readme.match(/\{\{?[A-Z_]+\}?\}/g) ?? []);
    expect([...found]).toEqual(['{{PROJECT_NAME}}']);
  });

  it('dead 1.x template files are gone', () => {
    for (const f of [
      'MEMORY-template.md',
      'tasks.md.template',
      'increment-metadata-template.yaml',
      'COMPLETION-REPORT.template.md',
      'config-permissions-guide.md',
      'docs/rfc-template.md',
    ]) {
      expect(fs.existsSync(path.join(TEMPLATES_DIR, f)), f).toBe(false);
    }
  });
});
