import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  applyInstructionTemplate,
  backupFilePath,
} from '../../../../../src/cli/helpers/init/instruction-file-writer.js';

const TEMPLATES_DIR = path.join(process.cwd(), 'src/templates');
const NOW = new Date('2026-09-02T12:34:56.789Z');

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-writer-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { build: 'tsc', test: 'vitest run' } }));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const apply = (filename: 'CLAUDE.md' | 'AGENTS.md', extra: Partial<Parameters<typeof applyInstructionTemplate>[0]> = {}) =>
  applyInstructionTemplate({ projectPath: dir, templatesDir: TEMPLATES_DIR, filename, projectName: 'demo', version: '2.0.0', now: NOW, ...extra });


const writeConfig = (config: unknown): void => {
  fs.mkdirSync(path.join(dir, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.specweave', 'config.json'), JSON.stringify(config));
};

describe('applyInstructionTemplate', () => {
  it('creates both files with detected commands and no backup', () => {
    const c = apply('CLAUDE.md');
    const a = apply('AGENTS.md');
    expect(c.action).toBe('created');
    expect(a.action).toBe('created');
    expect(c.backupPath).toBeNull();
    expect(a.backupPath).toBeNull();
    // the Commands table lives in AGENTS.md; CLAUDE.md just imports it
    const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf-8');
    expect(agents).toContain('| Build | `npm run build` |');
    expect(agents).toContain('| Lint | TODO: not detected \u2014 fill in the lint command |');
    const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf-8');
    expect(claude).toContain('@AGENTS.md');
    expect(claude).not.toContain('## Commands');
    expect(fs.existsSync(path.join(dir, '.specweave', 'backups'))).toBe(false);
  });

  it('writes nothing and makes no backup when the file is already current', () => {
    apply('CLAUDE.md');
    const before = fs.statSync(path.join(dir, 'CLAUDE.md')).mtimeMs;
    const r = apply('CLAUDE.md');
    expect(r.action).toBe('unchanged');
    expect(r.backupPath).toBeNull();
    expect(fs.statSync(path.join(dir, 'CLAUDE.md')).mtimeMs).toBe(before);
    expect(fs.existsSync(path.join(dir, '.specweave', 'backups'))).toBe(false);
  });

  it('backs up a 1.x file under .specweave/backups (never a root .bak) and reports the path', () => {
    const oneX =
      '<!-- SW:META template="claude" version="1.0.580" sections="hook-priority" -->\n\n' +
      '<!-- SW:SECTION:hook-priority version="1.0.580" -->\n## Hook Instructions Override Everything\n<!-- SW:END:hook-priority -->\n\n## Mine\n\nkeep\n';
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), oneX);
    const r = apply('CLAUDE.md');
    expect(r.action).toBe('merged');
    expect(r.backupPath).toBe(path.join(dir, '.specweave', 'backups', 'CLAUDE.md.2026-09-02T12-34-56.789Z.bak'));
    expect(fs.readFileSync(r.backupPath!, 'utf-8')).toBe(oneX);
    expect(fs.existsSync(path.join(dir, 'CLAUDE.md.bak'))).toBe(false);
    expect(r.warnings.join('\n')).toContain(path.join('.specweave', 'backups', 'CLAUDE.md.2026-09-02T12-34-56.789Z.bak'));
    expect(r.warnings.join('\n')).toContain('removed 1.x sections hook-priority');
    expect(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf-8')).toContain('## Mine\n\nkeep');
  });

  it('dry run computes the result without touching the disk', () => {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '## Mine\n\nkeep\n');
    const r = apply('CLAUDE.md', { dryRun: true });
    expect(r.action).toBe('merged');
    expect(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf-8')).toBe('## Mine\n\nkeep\n');
    expect(fs.existsSync(path.join(dir, '.specweave'))).toBe(false);
  });

  it('skips when the template is missing', () => {
    const r = apply('AGENTS.md', { templatesDir: dir });
    expect(r.action).toBe('skipped');
  });

  it('updates a 3.1 file to the short form: old managed sections go, user sections stay, a backup is written', () => {
    writeConfig({ workspace: { name: 'w', repos: [{ id: 'api', prefix: 'API' }] }, jev: { enabled: true } });
    const old = [
      '<!-- SW:META template="agents" version="3.1.23" sections="header,loop,rules,umbrella,jev" -->',
      '<!-- SW:SECTION:header version="3.1.23" -->\n# demo\n\nSpecWeave increments live in `.specweave/increments/NNNN-slug/spec.md`.\n<!-- SW:END:header -->',
      '<!-- SW:SECTION:loop version="3.1.23" -->\n## The loop\n\n1. `specweave pickup`\n<!-- SW:END:loop -->',
      '<!-- SW:SECTION:rules version="3.1.23" -->\n## Rules\n\n- One agent per branch.\n<!-- SW:END:rules -->',
      '<!-- SW:SECTION:umbrella version="3.1.23" -->\nMulti-repo workspace: each repository in `workspace.repos`\n<!-- SW:END:umbrella -->',
      '<!-- SW:SECTION:jev version="3.1.23" -->\n## Jev (System One)\n\nGuard.\n<!-- SW:END:jev -->',
      '## Commands\n\n| Action | Command |\n|---|---|\n| Build | `make all` |',
      '## Project notes\n\nNever deploy on Friday.',
    ].join('\n\n') + '\n';
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), old);

    const r = apply('AGENTS.md', { version: '3.1.24' });
    expect(r.action).toBe('merged');
    expect(r.removed).toEqual(['loop', 'rules', 'umbrella', 'jev']);
    expect(r.content).toContain('sections="header"');
    expect(r.content).toContain('This project plans work with SpecWeave');
    expect(r.content).not.toContain('## The loop');
    expect(r.content).not.toContain('One agent per branch');
    expect(r.content).not.toContain('Multi-repo workspace');
    expect(r.content).not.toContain('Jev (System One)');
    expect(r.content).toContain('| Build | `make all` |');
    expect(r.content).toContain('Never deploy on Friday.');
    expect(r.backupPath).not.toBeNull();
    expect(fs.readFileSync(r.backupPath as string, 'utf-8')).toBe(old);
    expect(apply('AGENTS.md', { version: '3.1.24' }).action).toBe('unchanged');
  });

  it('backup filenames contain no colons', () => {
    expect(path.basename(backupFilePath(dir, 'AGENTS.md', NOW))).toBe('AGENTS.md.2026-09-02T12-34-56.789Z.bak');
  });
});
