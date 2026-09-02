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

/** The 2.0 core skill set (design-2.0 §Skills). Nothing else may be referenced. */
const CORE_SKILLS = new Set([
  'increment', 'do', 'done', 'review', 'team', 'handoff', 'sync', 'auto', 'brainstorm', 'qa',
]);

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
  const bin = fs.readFileSync(path.join(ROOT, 'bin/specweave.js'), 'utf-8');
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

  it('declare the same SECTION ids in the same order', () => {
    const c = parseTemplate(claude).sections.map(s => `${s.id}${s.required ? '!' : ''}`);
    const a = parseTemplate(agents).sections.map(s => `${s.id}${s.required ? '!' : ''}`);
    expect(a).toEqual(c);
    expect(c).toEqual([
      'header!', 'structure', 'loop!', 'verify!', 'parallel!', 'conventions!', 'umbrella', 'troubleshooting',
    ]);
  });

  it('the umbrella section is conditional on the workspace flag in both templates', () => {
    for (const [name, content] of [['CLAUDE.md.template', claude], ['AGENTS.md.template', agents]] as const) {
      const umbrella = parseTemplate(content).sections.find(s => s.id === 'umbrella');
      expect(umbrella?.when, name).toBe('umbrella');
      expect(umbrella?.required, name).toBe(false);
    }
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
  ])('%s keeps the managed block under one page and the Commands/Project notes outside it', (_name, content) => {
    expect(content.split('\n').length).toBeLessThanOrEqual(90);
    const t = parseTemplate(content);
    expect(t.tail).toMatch(/^## Commands\n/);
    expect(t.tail).toContain('## Project notes');
    expect(t.sections.map(s => s.content).join('\n')).not.toContain('## Commands');
  });

  it.each(shipped)('every `specweave <cmd>` in %s is registered in bin/specweave.js', (_name, content) => {
    const registered = registeredCommands();
    const unknown = specweaveCommands(content).filter(c => !registered.has(c));
    expect(unknown).toEqual([]);
  });

  it.each(shipped)('every /sw:<skill> in %s is a 2.0 core skill that exists', (_name, content) => {
    // `review` and `team` are created by the 2.0 skills consolidation; the rest must be on disk today.
    const PENDING = new Set(['team']);
    const referenced = slashSkills(content);
    expect(referenced.filter(s => !CORE_SKILLS.has(s))).toEqual([]);
    const missing = referenced
      .filter(s => !PENDING.has(s))
      .filter(s => !fs.existsSync(path.join(ROOT, 'plugins/specweave/skills', s, 'SKILL.md')));
    expect(missing).toEqual([]);
  });

  it('CLAUDE.md uses slash commands and AGENTS.md uses the CLI plus the standalone skills', () => {
    expect(claude).toContain('`/sw:increment "title"`');
    expect(agents).toContain('`specweave create-increment "title"`');
    expect(agents).not.toMatch(/`\/sw:/);
    // the sw-* skills are vskill-installed standalone skills, not plugin commands
    expect(agents).toContain('npx vskill install anton-abyzov/specweave/skills/sw-do');
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
