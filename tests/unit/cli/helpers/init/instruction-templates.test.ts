import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseTemplate } from '../../../../../src/cli/helpers/init/instruction-file-merger.js';

const TEMPLATES_DIR = path.join(process.cwd(), 'src/templates');
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

describe('CLAUDE.md.template / AGENTS.md.template (2.0)', () => {
  const claude = read('CLAUDE.md.template');
  const agents = read('AGENTS.md.template');

  it('declare the same SECTION ids in the same order', () => {
    const c = parseTemplate(claude).sections.map(s => `${s.id}${s.required ? '!' : ''}`);
    const a = parseTemplate(agents).sections.map(s => `${s.id}${s.required ? '!' : ''}`);
    expect(a).toEqual(c);
    expect(c).toEqual(['header!', 'structure', 'loop!', 'verify!', 'parallel!', 'conventions!', 'troubleshooting']);
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

  it('CLAUDE.md uses slash commands and AGENTS.md uses the CLI', () => {
    expect(claude).toContain('`/sw:increment "title"`');
    expect(agents).toContain('`specweave create-increment "title"`');
    expect(agents).not.toMatch(/`\/sw:/);
  });

  it('README.md.template is short and only needs {{PROJECT_NAME}}', () => {
    const readme = read('README.md.template');
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
