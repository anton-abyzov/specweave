import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  mergeInstructionFile,
  parseTemplate,
  parseTemplateSections,
  stripSwSections,
  fillCommandPlaceholders,
  getPackageVersion,
  type ParsedTemplate,
} from '../../../../../src/cli/helpers/init/instruction-file-merger.js';

const TEMPLATES_DIR = path.join(process.cwd(), 'src/templates');
const claudeTemplate = (): ParsedTemplate =>
  parseTemplate(fs.readFileSync(path.join(TEMPLATES_DIR, 'CLAUDE.md.template'), 'utf-8'));
const agentsTemplate = (): ParsedTemplate =>
  parseTemplate(fs.readFileSync(path.join(TEMPLATES_DIR, 'AGENTS.md.template'), 'utf-8'));

const V = '2.0.0';
const NAME = 'demo-app';
const CMDS = { stack: 'node', build: 'npm run build', test: 'npm test', lint: 'npm run lint' };

const sha = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Minimal 3-section template used where the real one would be noise. */
const MINI: ParsedTemplate = {
  sections: [
    { id: 'header', order: 0, required: true, content: '# {PROJECT_NAME}\n\nIntro.' },
    { id: 'loop', order: 1, required: true, content: '## The loop\n\nDo the loop.' },
    { id: 'tips', order: 2, required: false, content: '## Tips\n\nOptional tips.' },
  ],
  tail: '## Commands\n\n| Action | Command |\n|---|---|\n| Build | `{{BUILD_CMD}}` |\n| Test | `{{TEST_CMD}}` |\n| Lint | `{{LINT_CMD}}` |\n\n## Project notes\n\n(keep it short)',
};

function oneX(sections: Array<[string, string]>, user: string[] = [], version = '1.0.580'): string {
  const ids = sections.map(([id]) => id).join(',');
  const parts = [`<!-- SW:META template="claude" version="${version}" sections="${ids}" -->`];
  sections.forEach(([id, body], i) => {
    parts.push(`<!-- SW:SECTION:${id} version="${version}" -->\n${body}\n<!-- SW:END:${id} -->`);
    if (user[i]) parts.push(user[i]);
  });
  return parts.join('\n\n') + '\n';
}

describe('parseTemplate', () => {
  it('splits sections and keeps the user-owned tail', () => {
    const t = claudeTemplate();
    expect(t.sections.map(s => s.id)).toEqual(['header', 'structure', 'loop', 'verify', 'parallel', 'conventions', 'troubleshooting']);
    expect(t.sections.filter(s => s.required).map(s => s.id)).toEqual(['header', 'loop', 'verify', 'parallel', 'conventions']);
    expect(t.tail).toMatch(/^## Commands/);
    expect(t.tail).toContain('## Project notes');
    expect(parseTemplateSections(fs.readFileSync(path.join(TEMPLATES_DIR, 'CLAUDE.md.template'), 'utf-8'))).toEqual(t.sections);
  });
});

describe('mergeInstructionFile — (a) fresh file', () => {
  it('renders META + sections + tail with commands filled', () => {
    const r = mergeInstructionFile(null, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    expect(r.action).toBe('created');
    expect(r.content.startsWith(`<!-- SW:META template="claude" version="${V}" sections="header,structure,loop,verify,parallel,conventions,troubleshooting" -->`)).toBe(true);
    expect(r.content).toContain(`# ${NAME}`);
    expect(r.content).toContain('| Build | `npm run build` |');
    expect(r.content).toContain('| Test | `npm test` |');
    expect(r.content).toContain('## Project notes');
    expect(r.content).not.toMatch(/\{\{?[A-Z_]+\}?\}/);
    expect(r.content.split('\n').length).toBeLessThan(90);
    // the tail is outside any SW marker
    const lastEnd = r.content.lastIndexOf('<!-- SW:END:');
    expect(r.content.indexOf('## Commands')).toBeGreaterThan(lastEnd);
  });

  it('leaves a TODO comment when a command is unknown, and fills it on a later run', () => {
    const r1 = mergeInstructionFile(null, MINI, 'claude', V, NAME, { commands: { stack: 'unknown' } });
    expect(r1.content).toContain('| Build | <!-- TODO: add build command --> |');
    expect(r1.content).not.toContain('{{');
    const r2 = mergeInstructionFile(r1.content, MINI, 'claude', V, NAME, { commands: CMDS });
    expect(r2.action).toBe('merged');
    expect(r2.content).toContain('| Build | `npm run build` |');
    expect(r2.content).not.toContain('TODO: add');
  });

  it('never overwrites a user-edited command row', () => {
    const r1 = mergeInstructionFile(null, MINI, 'claude', V, NAME, { commands: CMDS });
    const edited = r1.content.replace('`npm test`', '`npm run test:unit`');
    const r2 = mergeInstructionFile(edited, MINI, 'claude', V, NAME, { commands: CMDS });
    expect(r2.action).toBe('unchanged');
    expect(r2.content).toContain('`npm run test:unit`');
  });
});

describe('mergeInstructionFile — (b) 1.x SW:META file', () => {
  const legacy1x = oneX(
    [
      ['hook-priority', '## Hook Instructions Override Everything\n\nold'],
      ['header', '**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`'],
      ['reflect', '## Skill Memories\n\nSpecWeave learns from corrections.'],
      ['structure', '## Structure\n\nold structure'],
      ['docs', '## Docs\n\n[verified-skill.com](https://verified-skill.com)'],
      ['non-claude', '## Using SpecWeave with Other AI Tools\n\nSee AGENTS.md'],
    ],
    [
      '',
      '',
      '## Skill Memories\n\n### Team Lead\n- **2026-03-03**: never ask to close',
      '',
      '---\n<!-- ↓ PROJECT-SPECIFIC (non-duplicate additions) ↓ -->\n\n## Project Structure\n\n- Umbrella repo\n\n## Manual Verification Gates\n\nAsk the user.',
    ]
  );

  it('deletes every section not in the new template and reports them', () => {
    const r = mergeInstructionFile(legacy1x, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    expect(r.action).toBe('merged');
    expect(r.removed).toEqual(['hook-priority', 'reflect', 'docs', 'non-claude']);
    expect(r.content).not.toContain('SW:SECTION:hook-priority');
    expect(r.content).not.toContain('Hook Instructions Override Everything');
    expect(r.content).not.toContain('SpecWeave learns from corrections');
    expect(r.content).not.toContain('See AGENTS.md');
    expect(r.content).toMatch(/sections="header,structure,loop,verify,parallel,conventions,troubleshooting"/);
    expect(r.migration).toEqual({ fromVersion: '1.0.580', removed: ['hook-priority', 'reflect', 'docs', 'non-claude'] });
    expect(r.warnings.join('\n')).toContain('Upgraded instructions from 1.0.580 to 2.0.0');
  });

  it('preserves user segments verbatim, in order, below the managed block, and strips legacy markers', () => {
    const r = mergeInstructionFile(legacy1x, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    const lastEnd = r.content.lastIndexOf('<!-- SW:END:');
    const skill = r.content.indexOf('## Skill Memories');
    const proj = r.content.indexOf('## Project Structure');
    const gates = r.content.indexOf('## Manual Verification Gates');
    expect(skill).toBeGreaterThan(lastEnd);
    expect(proj).toBeGreaterThan(skill);
    expect(gates).toBeGreaterThan(proj);
    expect(r.content).toContain('- **2026-03-03**: never ask to close');
    expect(r.content).toContain('- Umbrella repo');
    expect(r.content).not.toContain('PROJECT-SPECIFIC');
    expect(r.content).not.toContain('↓');
    expect(r.preserved).toBe(2);
    // the Commands table is added once on migration
    expect(r.content.match(/^## Commands$/gm)).toHaveLength(1);
    expect(r.content.indexOf('## Commands')).toBeLessThan(skill);
  });

  it('keeps content above the META line', () => {
    const withPre = '# My own title\n\nSome intro.\n\n' + legacy1x;
    const r = mergeInstructionFile(withPre, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    expect(r.content.startsWith('# My own title\n\nSome intro.\n\n<!-- SW:META')).toBe(true);
  });

  it('is idempotent: a second run is byte-identical and reports unchanged', () => {
    const r1 = mergeInstructionFile(legacy1x, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    const r2 = mergeInstructionFile(r1.content, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    expect(r2.action).toBe('unchanged');
    expect(sha(r2.content)).toBe(sha(r1.content));
    expect(r2.migration).toBeNull();
    expect(r2.warnings).toEqual([]);
  });

  it('bumps a section version only when its body changed', () => {
    const r1 = mergeInstructionFile(null, MINI, 'claude', '2.0.0', NAME, { commands: CMDS });
    const changed: ParsedTemplate = {
      ...MINI,
      sections: MINI.sections.map(s => (s.id === 'loop' ? { ...s, content: '## The loop\n\nDo the NEW loop.' } : s)),
    };
    const r2 = mergeInstructionFile(r1.content, changed, 'claude', '2.1.0', NAME, { commands: CMDS });
    expect(r2.action).toBe('merged');
    expect(r2.updated).toEqual(['loop']);
    expect(r2.content).toContain('<!-- SW:SECTION:header version="2.0.0" -->');
    expect(r2.content).toContain('<!-- SW:SECTION:loop version="2.1.0" -->');
    expect(r2.content).toContain('<!-- SW:SECTION:tips version="2.0.0" -->');
    expect(r2.content).toContain('<!-- SW:META template="claude" version="2.1.0"');
  });

  it('does not touch the file (or its version attrs) when only the CLI version changed', () => {
    const r1 = mergeInstructionFile(null, MINI, 'claude', '2.0.0', NAME, { commands: CMDS });
    const r2 = mergeInstructionFile(r1.content, MINI, 'claude', '2.5.3', NAME, { commands: CMDS });
    expect(r2.action).toBe('unchanged');
    expect(r2.content).toBe(r1.content);
  });

  it('keeps user content placed between 2.x sections in place', () => {
    const r1 = mergeInstructionFile(null, MINI, 'claude', V, NAME, { commands: CMDS });
    const withNote = r1.content.replace('<!-- SW:END:header -->\n', '<!-- SW:END:header -->\n\n> Team note after header\n');
    const r2 = mergeInstructionFile(withNote, MINI, 'claude', V, NAME, { commands: CMDS });
    expect(r2.action).toBe('unchanged');
    expect(r2.content.indexOf('> Team note after header')).toBeLessThan(r2.content.indexOf('<!-- SW:SECTION:loop'));
  });

  it('does not re-add an optional section the user deleted, but re-adds required ones', () => {
    const r1 = mergeInstructionFile(null, MINI, 'claude', V, NAME, { commands: CMDS });
    const stripped = r1.content
      .replace(/<!-- SW:SECTION:tips[\s\S]*?<!-- SW:END:tips -->\n\n/, '')
      .replace(/<!-- SW:SECTION:loop[\s\S]*?<!-- SW:END:loop -->\n\n/, '');
    const r2 = mergeInstructionFile(stripped, MINI, 'claude', V, NAME, { commands: CMDS });
    expect(r2.added).toEqual(['loop']);
    expect(r2.content).not.toContain('SW:SECTION:tips');
    expect(r2.warnings.join('\n')).toContain('tips');
  });

  it('preserves CRLF line endings and a BOM', () => {
    const lf = mergeInstructionFile(null, MINI, 'claude', V, NAME, { commands: CMDS }).content;
    const crlf = '\uFEFF' + lf.replace(/\n/g, '\r\n');
    const r = mergeInstructionFile(crlf, MINI, 'claude', V, NAME, { commands: CMDS });
    expect(r.action).toBe('unchanged');
    expect(r.content.startsWith('\uFEFF')).toBe(true);
    expect(r.content).not.toMatch(/[^\r]\n/);
  });

  it('migrates a file that has sections but no META line', () => {
    const noMeta = '<!-- SW:SECTION:rules version="1.0.100" -->\n## Rules\n\nold\n<!-- SW:END:rules -->\n\n## Mine\n\nkeep me\n';
    const r = mergeInstructionFile(noMeta, MINI, 'claude', V, NAME, { commands: CMDS });
    expect(r.action).toBe('merged');
    expect(r.removed).toEqual(['rules']);
    expect(r.content).toContain('## Mine\n\nkeep me');
    expect(r.content).toContain('<!-- SW:META template="claude" version="2.0.0" sections="header,loop,tips" -->');
  });
});

describe('mergeInstructionFile — (c) legacy file without markers', () => {
  const legacyBody = [
    '# my-app - SpecWeave Reference',
    '',
    '## Hook Instructions Override Everything',
    '',
    '`<system-reminder>` hook output = **BLOCKING PRECONDITIONS**.',
    '',
    '**Framework**: SpecWeave | **Truth**: `spec.md` + `tasks.md`',
    '',
    '## Rules',
    '',
    '1. **Files** → `.specweave/increments/####-name/`',
    '3. **Unique IDs**: Check ALL folders',
    '',
    '## Skill Memories',
    '',
    'SpecWeave learns from corrections. Learnings saved here automatically. Edit or delete as needed.',
    '',
    '**Disable**: Set `"reflect": { "enabled": false }` in `.specweave/config.json`',
    '',
    '### Devops',
    '- **2026-02-02**: push then monitor the pipeline',
    '',
    '## Structure',
    '',
    '**Increment root**: ONLY `metadata.json`',
    '',
    '## Troubleshooting',
    '',
    '| Issue | Fix |',
    '| Skills missing | Restart Claude Code |',
    '',
    '## Rules',
    '',
    'Our own house rules: never deploy on Friday.',
    '',
    '## Production Credentials',
    '',
    'Use `./scripts/ec-auth.sh --token`.',
    '',
    '## Using SpecWeave with Other AI Tools',
    '',
    'See **AGENTS.md**.',
    '',
  ].join('\n');

  it('strips known 1.x blocks by heading, keeps everything else verbatim under the managed block', () => {
    const r = mergeInstructionFile(legacyBody, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    expect(r.action).toBe('merged');
    expect(r.content).not.toContain('Hook Instructions Override Everything');
    expect(r.content).not.toContain('SpecWeave Reference');
    expect(r.content).not.toContain('**Framework**: SpecWeave');
    expect(r.content).not.toContain('Unique IDs');
    expect(r.content).not.toContain('**Increment root**: ONLY');
    expect(r.content).not.toContain('Skills missing');
    expect(r.content).not.toContain('See **AGENTS.md**');
    // user-written "## Rules" without the 1.x signature survives
    expect(r.content).toContain('## Rules\n\nOur own house rules: never deploy on Friday.');
    expect(r.content).toContain('## Production Credentials\n\nUse `./scripts/ec-auth.sh --token`.');
    // skill memories keep the bullets, lose the boilerplate
    expect(r.content).toContain('## Skill Memories');
    expect(r.content).toContain('- **2026-02-02**: push then monitor the pipeline');
    expect(r.content).not.toContain('SpecWeave learns from corrections');
    expect(r.content).not.toContain('**Disable**');
    // managed block first, then Commands, then user content
    const lastEnd = r.content.lastIndexOf('<!-- SW:END:');
    expect(r.content.indexOf('## Commands')).toBeGreaterThan(lastEnd);
    expect(r.content.indexOf('## Production Credentials')).toBeGreaterThan(r.content.indexOf('## Commands'));
    expect(r.migration).toEqual({ fromVersion: 'legacy (no markers)', removed: [] });
  });

  it('strips pre-1.0.233 AGENTS blocks (Quick Start, Plugin Commands, old orchestration)', () => {
    const oldAgents = [
      '## Quick Start',
      '',
      '1. **Get Project Context FIRST**: `specweave context projects` (save the output!)',
      '',
      '## Workflow Orchestration',
      '',
      '**Claude Code has built-in orchestration features. Non-Claude tools must implement these manually.**',
      '',
      '## Plugin Commands',
      '',
      '| Command | Plugin |',
      '|---------|--------|',
      '| `/sw-github:sync` | GitHub sync |',
      '',
      '## Our deployment',
      '',
      'Deploy with `make ship`.',
      '',
    ].join('\n');

    const r = mergeInstructionFile(oldAgents, agentsTemplate(), 'agents', V, NAME, { commands: CMDS });

    expect(r.content).not.toContain('## Quick Start');
    expect(r.content).not.toContain('## Plugin Commands');
    expect(r.content).not.toContain('built-in orchestration features');
    expect(r.content).toContain('## Our deployment');
    expect(r.content).toContain('Deploy with `make ship`.');
  });

  it('keeps a user H1 (and its body) that follows a stripped 1.x block', () => {
    const withH1 = [
      '## Docs',
      '',
      '[verified-skill.com](https://verified-skill.com)',
      '',
      '---',
      '',
      '# AI Assistant Instructions for My Platform',
      '',
      '## House rules',
      '',
      'Never deploy on Friday.',
      '',
    ].join('\n');

    const r = mergeInstructionFile(withH1, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });

    expect(r.content).not.toContain('verified-skill.com');
    expect(r.content).toContain('# AI Assistant Instructions for My Platform');
    expect(r.content).toContain('## House rules');
    expect(r.content).toContain('Never deploy on Friday.');
  });

  it('collapses "↓ ORIGINAL ↓" stacks and de-duplicates identical user blocks', () => {
    const stacked =
      '<!-- SW:META template="claude" version="1.0.539" sections="rules" -->\n\n' +
      '<!-- SW:SECTION:rules version="1.0.539" -->\n## Rules\n\n1. **Files** → `.specweave/increments/####-name/`\n<!-- SW:END:rules -->\n\n' +
      '---\n<!-- ↓ ORIGINAL ↓ -->\n\n' +
      '## Team conventions\n\nUse pnpm.\n\n' +
      '---\n<!-- ↓ ORIGINAL ↓ -->\n\n' +
      '## Team conventions\n\nUse pnpm.\n\n## Deploy\n\nRun the pipeline.\n';
    const r = mergeInstructionFile(stacked, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    expect(r.content).not.toContain('ORIGINAL');
    expect(r.content.match(/^## Team conventions$/gm)).toHaveLength(1);
    expect(r.content).toContain('## Deploy\n\nRun the pipeline.');
    expect(r.content).not.toMatch(/\n---\n\s*$/);
    const again = mergeInstructionFile(r.content, claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    expect(again.action).toBe('unchanged');
  });

  it('strips raw template copies (<!-- SECTION:x --> … <!-- /SECTION -->) left by the old generator', () => {
    const raw = '# demo-app\n\n**Framework**: SpecWeave - Specification-First Development\n\n---\n\n<!-- SECTION:rules required -->\n## Essential Rules\n\n1. NEVER pollute project root\n<!-- /SECTION -->\n\n---\n\n## Our API\n\nREST at /api.\n\n**Generated by SpecWeave** - x\n';
    const r = mergeInstructionFile(raw, agentsTemplate(), 'agents', V, NAME, { commands: CMDS });
    expect(r.content).not.toContain('NEVER pollute project root');
    expect(r.content).not.toContain('<!-- SECTION:');
    expect(r.content).not.toContain('Generated by SpecWeave');
    expect(r.content).toContain('## Our API\n\nREST at /api.');
    expect(r.content.match(/^# demo-app$/gm)).toHaveLength(1);
  });

  it('does not treat "## Project Structure" in a CLAUDE.md as a template block', () => {
    const r = mergeInstructionFile('## Project Structure\n\n- Umbrella repo with repos under `repositories/`\n', claudeTemplate(), 'claude', V, NAME, { commands: CMDS });
    expect(r.content).toContain('## Project Structure\n\n- Umbrella repo');
  });

  it('strips the 1.x AGENTS "## Project Structure" block only when it carries the template signature', () => {
    const tpl = '## Project Structure\n\n```\n.specweave/\n├── increments/           # Feature increments (0001-9999)\n```\n\n**Every workspace uses `repositories/`**\n';
    const user = '## Project Structure\n\n- Umbrella repo with repos under `repositories/`\n';
    const r = mergeInstructionFile(tpl + '\n' + user, agentsTemplate(), 'agents', V, NAME, { commands: CMDS });
    expect(r.content).not.toContain('Feature increments (0001-9999)');
    expect(r.content).toContain('## Project Structure\n\n- Umbrella repo');
  });
});

describe('mergeInstructionFile — (d) broken markers', () => {
  it('repairs an unterminated SECTION marker by keeping its text as user content', () => {
    const broken =
      '<!-- SW:META template="claude" version="2.0.0" sections="header,loop,tips" -->\n\n' +
      '<!-- SW:SECTION:header version="2.0.0" -->\n# demo-app\n\nIntro.\n<!-- SW:END:header -->\n\n' +
      '<!-- SW:SECTION:loop version="2.0.0" -->\n## The loop\n\nhand-edited loop text\n\n' +
      '<!-- SW:SECTION:tips version="2.0.0" -->\n## Tips\n\nOptional tips.\n<!-- SW:END:tips -->\n';
    const r = mergeInstructionFile(broken, MINI, 'claude', V, NAME, { commands: CMDS });
    expect(r.action).toBe('merged');
    expect(r.warnings.join('\n')).toContain('unterminated marker for section "loop"');
    expect(r.content).toContain('hand-edited loop text');
    expect(r.content).toContain('<!-- SW:SECTION:loop version="2.0.0" -->\n## The loop\n\nDo the loop.\n<!-- SW:END:loop -->');
    expect(r.content.match(/SW:SECTION:loop/g)).toHaveLength(1);
    // never aborts, and the repaired output is stable
    expect(mergeInstructionFile(r.content, MINI, 'claude', V, NAME, { commands: CMDS }).action).toBe('unchanged');
  });

  it('drops stray END markers and duplicate sections with a warning', () => {
    const r1 = mergeInstructionFile(null, MINI, 'claude', V, NAME, { commands: CMDS });
    const messy = r1.content + '\n<!-- SW:END:ghost -->\n\n<!-- SW:SECTION:tips version="1.0.0" -->\nstale copy\n<!-- SW:END:tips -->\n';
    const r = mergeInstructionFile(messy, MINI, 'claude', V, NAME, { commands: CMDS });
    expect(r.warnings.join('\n')).toContain('stray end marker');
    expect(r.warnings.join('\n')).toContain('duplicate section "tips"');
    expect(r.content).not.toContain('stale copy');
    expect(r.content).not.toContain('ghost');
  });
});

describe('fillCommandPlaceholders', () => {
  it('fills only placeholders that are present', () => {
    expect(fillCommandPlaceholders('`{{TEST_CMD}}` and {{LINT_CMD}}', CMDS)).toBe('`npm test` and npm run lint');
    expect(fillCommandPlaceholders('| Build | `{{BUILD_CMD}}` |', { stack: 'unknown' })).toBe('| Build | <!-- TODO: add build command --> |');
    expect(fillCommandPlaceholders('nothing here', CMDS)).toBe('nothing here');
  });
});

describe('stripSwSections', () => {
  it('returns null for a 100% managed file and user content otherwise', () => {
    const fresh = mergeInstructionFile(null, { sections: MINI.sections, tail: '' }, 'claude', V, NAME).content;
    expect(stripSwSections(fresh)).toBeNull();
    const withUser = 'above\n\n' + fresh + '\n## Mine\n\nkeep\n';
    expect(stripSwSections(withUser)).toBe('above\n\n## Mine\n\nkeep');
    expect(stripSwSections('')).toBeNull();
    expect(stripSwSections('# Plain file\n\nno markers\n')).toBe('# Plain file\n\nno markers');
  });
});

describe('getPackageVersion', () => {
  it('resolves the real package version, never the 0.0.0 fallback', () => {
    expect(getPackageVersion()).toMatch(/^\d+\.\d+\.\d+/);
    expect(getPackageVersion()).not.toBe('0.0.0');
  });
});
