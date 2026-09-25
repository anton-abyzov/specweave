import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildPickup } from '../../../../src/core/session/pickup.js';
import { noteCommand } from '../../../../src/cli/commands/pickup.js';
import { pushHandoff } from '../../../../src/core/session/handoff-push.js';
import { detectTool, detectHost, getAgentId, recordSessionOnce, readIncrementEvents } from '../../../../src/core/tasks/ledger.js';

let root: string;

function writeIncrement(id: string, status = 'active', ledger: object[] = []): string {
  const dir = path.join(root, '.specweave', 'increments', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({ id, status, title: 'Login form' }));
  fs.writeFileSync(path.join(dir, 'spec.md'), [
    '# Login form', '', '## Acceptance Criteria',
    '- [ ] AC-01: Valid credentials sign the user in',
    '- [ ] AC-02: Wrong password shows an error', '',
    '## Tasks', '',
    '### T-01 Sign in', '- AC: AC-01 | Files: login.js | Test: npm test', '',
    '### T-02 Error message', '- AC: AC-02 | Files: error.js | Test: npm test', '',
  ].join('\n'));
  if (ledger.length) fs.writeFileSync(path.join(dir, 'ledger.jsonl'), ledger.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return dir;
}

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-pickup-'));
  fs.mkdirSync(path.join(root, '.specweave'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('buildPickup', () => {
  it('prints the next task with its acceptance criteria, derived AC status and others\' claims', () => {
    writeIncrement('0001-login', 'active', [
      { t: 'T-01', e: 'claim', by: 'codex@mbp', at: ago(30) },
      { t: 'T-01', e: 'done', by: 'codex@mbp', at: ago(20), evidence: 'npm test → exit 0' },
      { t: 'T-02', e: 'claim', by: 'codex@mbp', at: ago(10) },
    ]);
    const { text, incrementId } = buildPickup(root, { agent: 'claude@cloud' });
    expect(incrementId).toBe('0001-login');
    expect(text).toContain('you are claude@cloud');
    expect(text).toContain('Increment 0001-login "Login form" (active) · tasks 1/2 done · ACs 1/2 met');
    expect(text).toContain('T-02 claimed by codex@mbp 10m ago');
    expect(text).toContain('Spec: .specweave/increments/0001-login/spec.md');
  });

  it('shows the next task\'s AC text and the claim command', () => {
    writeIncrement('0001-login');
    const { text } = buildPickup(root, { agent: 'claude@cloud' });
    expect(text).toContain('Next: T-01 Sign in');
    expect(text).toContain('  AC-01: Valid credentials sign the user in');
    expect(text).toContain('  Files: login.js | Test: npm test');
    expect(text).toContain('  claim: specweave task claim T-01 0001-login');
  });

  it('shows the caller\'s own claims instead of a next task', () => {
    writeIncrement('0001-login', 'active', [{ t: 'T-01', e: 'claim', by: 'claude@cloud', at: ago(5) }]);
    const { text } = buildPickup(root, { agent: 'claude@cloud' });
    expect(text).toContain('Yours: T-01 Sign in (claimed 5m ago)');
  });

  it('shows the last handoff event, notes and the memory index', () => {
    writeIncrement('0001-login', 'active', [
      { t: '*', e: 'note', by: 'codex@cloud', at: ago(90), note: 'Use the config base URL' },
      { t: '*', e: 'handoff', by: 'claude@mbp', at: ago(60), note: 'out of tokens' },
    ]);
    fs.mkdirSync(path.join(root, '.specweave', 'memory'));
    fs.writeFileSync(path.join(root, '.specweave', 'memory', 'MEMORY.md'), '# Memory\n- [Auth](auth.md): sessions, not JWT\n');
    const { text } = buildPickup(root, { agent: 'claude@cloud' });
    expect(text).toContain('Last handoff: claude@mbp 1h ago: out of tokens');
    expect(text).toContain('- codex@cloud 2h ago: Use the config base URL');
    expect(text).toContain('Memory (.specweave/memory/MEMORY.md):');
    expect(text).toContain('  - [Auth](auth.md): sessions, not JWT');
  });

  it('lists several open increments and asks for one', () => {
    writeIncrement('0001-login');
    writeIncrement('0002-signup');
    const { text, incrementId } = buildPickup(root, { agent: 'a@b' });
    expect(incrementId).toBeUndefined();
    expect(text).toContain('Active increment: 0001-login');
    expect(text).toContain('Active increment: 0002-signup');
    expect(text).toContain('run `specweave pickup <id>`');
  });

  it('compact form skips Git and per-task detail and points at pickup', () => {
    writeIncrement('0001-login');
    fs.mkdirSync(path.join(root, '.specweave', 'memory'));
    fs.writeFileSync(path.join(root, '.specweave', 'memory', 'MEMORY.md'), '- one\n- two\n');
    const { text } = buildPickup(root, { compact: true, agent: 'a@b' });
    expect(text).toContain('Active increment: 0001-login — Login form (2/2 tasks pending; next: T-01 Sign in)');
    expect(text).toContain('Memory: .specweave/memory/MEMORY.md (2 lines');
    expect(text).toContain('Run `specweave pickup`');
    expect(text).not.toContain('Branch:');
  });

  it('says how to start when nothing is open', () => {
    expect(buildPickup(root, { agent: 'a@b' }).text).toContain('No open increment');
  });
});

describe('note', () => {
  it('appends a note event that pickup shows', async () => {
    writeIncrement('0001-login');
    const write = process.stdout.write;
    process.stdout.write = (() => true) as typeof process.stdout.write;
    try {
      expect(await noteCommand('token sk-ant-abcdefghijklmnopqrstuvwxyz0123456789 needs rotating', { cwd: root, agent: 'grok@mbp' })).toBe(0);
    } finally { process.stdout.write = write; }
    const notes = readIncrementEvents(path.join(root, '.specweave/increments/0001-login/ledger.jsonl'), ['note']);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ t: '*', by: 'grok@mbp' });
    expect(notes[0].note).not.toContain('sk-ant-abcdefghijklmnop');
    expect(buildPickup(root, { agent: 'a@b' }).text).toContain('grok@mbp 0m ago: token');
  });
});

describe('agent identity', () => {
  it('detects the tool from AI_AGENT and tool markers, with an override', () => {
    expect(detectTool({ AI_AGENT: 'claude-code_2-1-282_agent' })).toBe('claude');
    expect(detectTool({ CODEX_SANDBOX: 'seatbelt' })).toBe('codex');
    expect(detectTool({ GROK_API_KEY: 'x' })).toBe('grok');
    expect(detectTool({ CURSOR_TRACE_ID: 'x' })).toBe('cursor');
    expect(detectTool({ GEMINI_CLI: '1' })).toBe('gemini');
    expect(detectTool({ SPECWEAVE_TOOL: 'Claude-Work', AI_AGENT: 'codex' })).toBe('claude-work');
    expect(detectTool({})).toBe('cli');
  });

  it('names every cloud container "cloud" so a cloud session keeps its own claims', () => {
    expect(detectHost({ CLAUDE_CODE_REMOTE: 'true' })).toBe('cloud');
    expect(detectHost({ CODEX_CLOUD: '1' })).toBe('cloud');
    expect(detectHost({ SPECWEAVE_HOST: 'Work-Mac' })).toBe('work-mac');
    expect(getAgentId({ SPECWEAVE_AGENT: 'me@here' })).toBe('me@here');
  });

  it('records a session once per session id', () => {
    const dir = writeIncrement('0001-login');
    const ledger = path.join(dir, 'ledger.jsonl');
    expect(recordSessionOnce(ledger, 'claude@cloud', { CLAUDE_CODE_SESSION_ID: 's1' })).toBe(true);
    expect(recordSessionOnce(ledger, 'claude@cloud', { CLAUDE_CODE_SESSION_ID: 's1' })).toBe(false);
    expect(recordSessionOnce(ledger, 'codex@cloud', { CODEX_SESSION_ID: 's2' })).toBe(true);
    expect(recordSessionOnce(ledger, 'cli@box', {})).toBe(false);
    expect(readIncrementEvents(ledger, ['session']).map((e) => e.note)).toEqual(['session s1', 'session s2']);
  });
});

describe('pushHandoff', () => {
  const git = (cwd: string, ...args: string[]) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

  it('pushes the branch and a WIP snapshot without touching the index or branch', () => {
    const remote = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-remote-'));
    try {
      git(remote, 'init', '-q', '--bare');
      git(root, 'init', '-q', '-b', 'feature');
      git(root, 'config', 'user.email', 't@t');
      git(root, 'config', 'user.name', 't');
      git(root, 'config', 'commit.gpgsign', 'false');
      git(root, 'remote', 'add', 'origin', remote);
      fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
      git(root, 'add', '-A');
      git(root, 'commit', '-qm', 'init');
      fs.writeFileSync(path.join(root, 'a.txt'), 'two\n');
      fs.writeFileSync(path.join(root, 'new.txt'), 'untracked\n');
      const head = git(root, 'rev-parse', 'HEAD');

      const info = pushHandoff(root);
      expect(info.warnings).toEqual([]);
      expect(info.branch).toBe('feature');
      expect(info.wipRef).toBe('wip/feature');
      expect(git(root, 'rev-parse', 'HEAD')).toBe(head);
      expect(git(root, 'status', '--porcelain')).toContain('?? new.txt');
      expect(git(remote, 'show', 'wip/feature:a.txt')).toBe('two');
      expect(git(remote, 'show', 'wip/feature:new.txt')).toBe('untracked');
      expect(git(remote, 'rev-parse', 'wip/feature^')).toBe(head);
    } finally {
      fs.rmSync(remote, { recursive: true, force: true });
    }
  });

  it('explains why it could not push', () => {
    expect(pushHandoff(root).warnings).toEqual(['not a git repository']);
  });
});

describe('buildWorkHandoff', () => {
  it('releases the agent\'s claims and records the handoff, which pickup then shows', async () => {
    const { buildWorkHandoff } = await import('../../../../src/core/session/work-handoff.js');
    writeIncrement('0001-login', 'active', [{ t: 'T-01', e: 'claim', by: 'claude@mbp', at: ago(5) }]);
    const res = await buildWorkHandoff(root, { agent: 'claude@mbp', reason: 'out of tokens' });
    expect(res.released).toEqual(['T-01']);
    expect(res.pastePrompt).toContain('specweave pickup');
    expect(res.pastePrompt).not.toContain(root);
    const text = buildPickup(root, { agent: 'codex@cloud' }).text;
    expect(text).toContain('Next: T-01 Sign in');
    expect(text).toContain('Last handoff: claude@mbp 0m ago: out of tokens');
  });

  it('as a PreCompact checkpoint keeps claims and writes no ledger events', async () => {
    const { buildWorkHandoff } = await import('../../../../src/core/session/work-handoff.js');
    const dir = writeIncrement('0001-login', 'active', [{ t: 'T-01', e: 'claim', by: 'claude@mbp', at: ago(5) }]);
    const before = fs.readFileSync(path.join(dir, 'ledger.jsonl'), 'utf-8');
    const res = await buildWorkHandoff(root, { agent: 'claude@mbp', checkpoint: true });
    expect(res.released).toEqual([]);
    expect(fs.readFileSync(path.join(dir, 'ledger.jsonl'), 'utf-8')).toBe(before);
  });
});
