import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { skillsCommand } from '../../../../src/cli/commands/skills.js';

let root: string;
let out: string[];
let err: string[];

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-skills-cmd-'));
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), JSON.stringify({ project: { name: 'demo' } }));
  out = [];
  err = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((s) => { out.push(String(s)); return true; });
  vi.spyOn(process.stderr, 'write').mockImplementation((s) => { err.push(String(s)); return true; });
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

const config = () => JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf-8'));
const exists = (rel: string) => fs.existsSync(path.join(root, rel));

describe('specweave skills', () => {
  it('enable records skills.enabled, keeps other config and installs both copies', async () => {
    expect(await skillsCommand('enable', ['jev', 'sw-glossary'], { cwd: root })).toBe(0);
    expect(config()).toEqual({ project: { name: 'demo' }, skills: { enabled: ['glossary', 'jev'] } });
    for (const base of ['.claude/skills', '.agents/skills']) {
      expect(exists(`${base}/sw-jev/SKILL.md`)).toBe(true);
      expect(exists(`${base}/sw-glossary/SKILL.md`)).toBe(true);
    }
    expect(out.join('')).toContain('sw-glossary: on (skills.enabled)');
  });

  it('disable moves a skill to skills.disabled and removes SpecWeave\'s copies', async () => {
    await skillsCommand('enable', ['glossary'], { cwd: root });
    expect(await skillsCommand('disable', ['glossary'], { cwd: root })).toBe(0);
    expect(config().skills).toEqual({ disabled: ['glossary'] });
    expect(exists('.claude/skills/sw-glossary')).toBe(false);
    expect(exists('.agents/skills/sw-glossary')).toBe(false);
    expect(out.join('')).toContain('Removed .claude/skills/sw-glossary');
  });

  it('refuses to disable a core skill or touch an unknown one', async () => {
    expect(await skillsCommand('disable', ['do'], { cwd: root })).toBe(1);
    expect(err.join('')).toContain('sw-do is a core skill');
    expect(await skillsCommand('disable', ['grill-me'], { cwd: root })).toBe(1);
    expect(await skillsCommand('enable', ['tdd'], { cwd: root })).toBe(1);
    expect(err.join('')).toContain('Unknown skill "tdd"');
    expect(await skillsCommand('enable', [], { cwd: root })).toBe(1);
    expect(config()).toEqual({ project: { name: 'demo' } });
  });

  it('answers the old `enable grill-me` without failing now that grill-me is core', async () => {
    expect(await skillsCommand('enable', ['grill-me'], { cwd: root })).toBe(0);
    expect(out.join('')).toContain('sw-grill-me is a core skill and is always installed.');
    expect(config()).toEqual({ project: { name: 'demo' } });
    expect(await skillsCommand('enable', ['sw-grill-me', 'glossary'], { cwd: root })).toBe(0);
    expect(config().skills).toEqual({ enabled: ['glossary'] });
  });

  it('list shows every skill with its state and reason', async () => {
    fs.writeFileSync(path.join(root, 'GLOSSARY.md'), '### Order\n');
    expect(await skillsCommand('list', [], { cwd: root, json: true })).toBe(0);
    const states = JSON.parse(out.join('')) as Array<{ name: string; on: boolean; reason: string }>;
    expect(states.map((s) => s.name)).toEqual(['increment', 'grill-me', 'do', 'auto', 'done', 'review', 'handoff', 'glossary', 'sync', 'project', 'jev']);
    expect(states.find((s) => s.name === 'glossary')).toMatchObject({ on: true, reason: 'detected' });
    expect(states.find((s) => s.name === 'grill-me')).toMatchObject({ on: true, reason: 'core' });
    expect(states.find((s) => s.name === 'jev')).toMatchObject({ on: false, reason: 'off' });
  });

  it('fails outside a SpecWeave project', async () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-skills-bare-'));
    try {
      expect(await skillsCommand('list', [], { cwd: bare })).toBe(1);
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });
});
