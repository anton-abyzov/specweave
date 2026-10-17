import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseTemplate } from '../../../../../src/cli/helpers/init/instruction-file-merger.js';

const ROOT = process.cwd();
const TEMPLATES_DIR = path.join(ROOT, 'src/templates');
const read = (name: string): string => fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');

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
    expect(parseTemplate(agents).sections.map(s => `${s.id}${s.required ? '!' : ''}`)).toEqual([
      'header!', 'loop!', 'rules!', 'umbrella', 'glossary', 'hub', 'jev',
    ]);
    expect(parseTemplate(claude).sections.map(s => `${s.id}${s.required ? '!' : ''}`)).toEqual(['header!', 'jev']);
    expect(claude.split('\n')[1]).toBe('@AGENTS.md');
    // Claude reads AGENTS.md through the import, so nothing is said twice.
    expect(claude).not.toContain('## The loop');
    expect(claude).not.toContain('## Commands');
  });

  it.each([['umbrella'], ['hub'], ['jev']])('the %s section of AGENTS.md is conditional on its own flag', (id) => {
    const section = parseTemplate(agents).sections.find(s => s.id === id);
    expect(section?.when).toBe(id);
    expect(section?.required).toBe(false);
  });

  it('AGENTS.md maps "hand off" and "pick up" to the two commands', () => {
    expect(agents).toContain('`specweave pickup`');
    expect(agents).toContain('`specweave handoff --reason');
    expect(agents).toMatch(/says "hand off"/);
    expect(agents).toMatch(/says "pick up"/);
    expect(agents).toContain('.specweave/memory/');
    expect(agents).not.toContain('tasks.md');
  });

  it('AGENTS.md has agents check ACs from the outside, not add unit tests by default', () => {
    expect(agents).toContain('A Test checks the AC as users would (CLI, HTTP, UI, API)');
    expect(agents).toContain('add unit tests only when asked');
    expect(agents).not.toMatch(/Files: src\/a\.ts, src\/a\.test\.ts/);
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
    expect(found.has('{PROJECT_NAME}')).toBe(true);
  });

  it.each([
    ['CLAUDE.md.template', claude],
    ['AGENTS.md.template', agents],
  ])('%s keeps the managed block small and the Project notes outside it', (_name, content) => {
    // What a project renders by default: `umbrella`, `hub` and `jev` are opt-in.
    const t = parseTemplate(content);
    const unconditional = t.sections.filter(s => !s.when);
    const rendered = [...unconditional.map(s => s.content), t.tail].join('\n\n');
    // About 890 tokens for AGENTS.md (it was 1,860 in 2.x); the Decide line added ~40.
    expect(rendered.length).toBeLessThanOrEqual(3600);
    expect(t.tail).toContain('## Project notes');
    expect(t.sections.map(s => s.content).join('\n')).not.toContain('## Commands');
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

  it('CLAUDE.md uses slash commands and AGENTS.md uses the CLI plus the standalone skills', () => {
    // Project skills are namespaced sw-*; the plugin form /sw:<name> also works.
    expect(claude).toContain('`/sw-increment "title"`');
    expect(agents).toContain('`specweave create-increment "title"`');
    expect(agents).not.toMatch(/`\/sw:/);
    // the sw-* skills are vskill-installed standalone skills, not plugin commands;
    // the canonical ref carries no `skills/` segment — see lintTemplateInstallRefs
    expect(agents).toContain('npx vskill install anton-abyzov/specweave/sw-do');
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
