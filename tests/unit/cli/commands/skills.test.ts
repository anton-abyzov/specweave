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
    expect(await skillsCommand('enable', ['grill-me', 'sw-glossary'], { cwd: root })).toBe(0);
    expect(config()).toEqual({ project: { name: 'demo' }, skills: { enabled: ['glossary', 'grill-me'] } });
    for (const base of ['.claude/skills', '.agents/skills']) {
      expect(exists(`${base}/sw-grill-me/SKILL.md`)).toBe(true);
      expect(exists(`${base}/sw-glossary/SKILL.md`)).toBe(true);
    }
    expect(out.join('')).toContain('sw-grill-me: on (skills.enabled)');
  });

  it('disable moves a skill to skills.disabled and removes SpecWeave\'s copies', async () => {
    await skillsCommand('enable', ['grill-me'], { cwd: root });
    expect(await skillsCommand('disable', ['grill-me'], { cwd: root })).toBe(0);
    expect(config().skills).toEqual({ disabled: ['grill-me'] });
    expect(exists('.claude/skills/sw-grill-me')).toBe(false);
    expect(exists('.agents/skills/sw-grill-me')).toBe(false);
    expect(out.join('')).toContain('Removed .claude/skills/sw-grill-me');
  });

  it('refuses core and unknown skills without touching config', async () => {
    expect(await skillsCommand('disable', ['do'], { cwd: root })).toBe(1);
    expect(err.join('')).toContain('sw-do is a core skill');
    expect(await skillsCommand('enable', ['tdd'], { cwd: root })).toBe(1);
    expect(err.join('')).toContain('Unknown skill "tdd"');
    expect(await skillsCommand('enable', [], { cwd: root })).toBe(1);
    expect(config()).toEqual({ project: { name: 'demo' } });
  });

  it('list shows every skill with its state and reason', async () => {
    fs.writeFileSync(path.join(root, 'GLOSSARY.md'), '### Order\n');
    expect(await skillsCommand('list', [], { cwd: root, json: true })).toBe(0);
    const states = JSON.parse(out.join('')) as Array<{ name: string; on: boolean; reason: string }>;
    expect(states.map((s) => s.name)).toEqual(['increment', 'do', 'auto', 'done', 'review', 'handoff', 'grill-me', 'glossary', 'sync', 'project', 'jev']);
    expect(states.find((s) => s.name === 'glossary')).toMatchObject({ on: true, reason: 'detected' });
    expect(states.find((s) => s.name === 'grill-me')).toMatchObject({ on: false, reason: 'off' });
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
