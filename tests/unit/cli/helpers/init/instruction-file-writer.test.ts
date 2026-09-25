import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  applyInstructionTemplate,
  backupFilePath,
  detectTemplateFlags,
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

describe('detectTemplateFlags (umbrella + jev + hub sections)', () => {
  it('is off without a config, with an empty repo list, or on unreadable JSON', () => {
    expect(detectTemplateFlags(dir)).toEqual({ umbrella: false, jev: false, hub: false });
    writeConfig({ workspace: { name: 'w', repos: [] } });
    expect(detectTemplateFlags(dir)).toEqual({ umbrella: false, jev: false, hub: false });
    fs.writeFileSync(path.join(dir, '.specweave', 'config.json'), '{ broken');
    expect(detectTemplateFlags(dir)).toEqual({ umbrella: false, jev: false, hub: false });
  });

  it('falls back to the repositories/ scan while init has not written workspace yet', () => {
    // init writes a minimal config (no workspace key) before the instruction files
    writeConfig({ version: '2.0', project: { name: 'demo' } });
    expect(detectTemplateFlags(dir)).toEqual({ umbrella: false, jev: false, hub: false });
    fs.mkdirSync(path.join(dir, 'repositories', 'acme', 'api', '.git'), { recursive: true });
    expect(detectTemplateFlags(dir)).toEqual({ umbrella: true, jev: false, hub: false });
    // an explicit empty workspace list still wins over the scan
    writeConfig({ version: '2.0', workspace: { name: 'demo', repos: [] } });
    expect(detectTemplateFlags(dir)).toEqual({ umbrella: false, jev: false, hub: false });
  });

  it('is on when the workspace lists repos', () => {
    writeConfig({ workspace: { name: 'w', repos: [{ id: 'api', prefix: 'API' }] } });
    expect(detectTemplateFlags(dir)).toEqual({ umbrella: true, jev: false, hub: false });
  });

  it('jev is on only when jev.enabled is literally true', () => {
    writeConfig({ workspace: { name: 'w', repos: [] }, jev: { enabled: true } });
    expect(detectTemplateFlags(dir)).toEqual({ umbrella: false, jev: true, hub: false });
    for (const enabled of [false, 'true', 1, null, undefined]) {
      writeConfig({ workspace: { name: 'w', repos: [] }, jev: { enabled } });
      expect(detectTemplateFlags(dir), String(enabled)).toEqual({ umbrella: false, jev: false, hub: false });
    }
  });

  it('hub is on when .specweave/project/hub.json exists', () => {
    writeConfig({ workspace: { name: 'w', repos: [] } });
    expect(detectTemplateFlags(dir).hub).toBe(false);
    fs.mkdirSync(path.join(dir, '.specweave', 'project'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.specweave', 'project', 'hub.json'), JSON.stringify({ goal: 'ship' }));
    expect(detectTemplateFlags(dir)).toEqual({ umbrella: false, jev: false, hub: true });
  });

  it('renders the jev section into both files only when the flag is on', () => {
    const off = apply('CLAUDE.md', { flags: { umbrella: false, jev: false, hub: false } });
    expect(off.content).not.toContain('Jev (System One)');
    const on = apply('AGENTS.md', { flags: { umbrella: false, jev: true, hub: false } });
    expect(on.content).toContain('## Jev (System One) — closed-set decisions');
    expect(on.content).toContain('specweave jev guard');
  });
});

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

  it('emits the umbrella section only for a workspace with repos, and drops it when it empties', () => {
    const UMBRELLA = 'Umbrella project: nested repos live under';
    const plain = apply('AGENTS.md');
    expect(plain.content).not.toContain(UMBRELLA);

    writeConfig({ workspace: { name: 'w', repos: [{ id: 'api', prefix: 'API' }] } });
    const umbrella = apply('AGENTS.md');
    expect(umbrella.action).toBe('merged');
    expect(umbrella.added).toEqual(['umbrella']);
    expect(umbrella.content).toContain(UMBRELLA);
    // CLAUDE.md has no umbrella section; it gets it through @AGENTS.md
    expect(apply('CLAUDE.md').content).not.toContain(UMBRELLA);

    writeConfig({ workspace: { name: 'w', repos: [] } });
    const shrunk = apply('AGENTS.md');
    expect(shrunk.removed).toEqual(['umbrella']);
    expect(shrunk.content).not.toContain(UMBRELLA);
  });

  it('backup filenames contain no colons', () => {
    expect(path.basename(backupFilePath(dir, 'AGENTS.md', NOW))).toBe('AGENTS.md.2026-09-02T12-34-56.789Z.bak');
  });
});
