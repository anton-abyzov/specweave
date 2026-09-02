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

describe('applyInstructionTemplate', () => {
  it('creates both files with detected commands and no backup', () => {
    const c = apply('CLAUDE.md');
    const a = apply('AGENTS.md');
    expect(c.action).toBe('created');
    expect(a.action).toBe('created');
    expect(c.backupPath).toBeNull();
    const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf-8');
    expect(claude).toContain('| Build | `npm run build` |');
    expect(claude).toContain('| Lint | <!-- TODO: add lint command --> |');
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

  it('backup filenames contain no colons', () => {
    expect(path.basename(backupFilePath(dir, 'AGENTS.md', NOW))).toBe('AGENTS.md.2026-09-02T12-34-56.789Z.bak');
  });
});
