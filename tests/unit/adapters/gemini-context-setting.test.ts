import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureGeminiReadsAgentsMd } from '../../../src/adapters/gemini/context-setting.js';

let dir: string;
const file = () => path.join(dir, '.gemini', 'settings.json');
const read = () => JSON.parse(fs.readFileSync(file(), 'utf8'));
const write = (v: unknown) => { fs.mkdirSync(path.dirname(file()), { recursive: true }); fs.writeFileSync(file(), typeof v === 'string' ? v : JSON.stringify(v)); };

beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-gemini-')); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('Gemini CLI reads AGENTS.md', () => {
  it('creates the setting with AGENTS.md first and GEMINI.md kept', () => {
    expect(ensureGeminiReadsAgentsMd(dir)).toBe('added');
    expect(read()).toEqual({ context: { fileName: ['AGENTS.md', 'GEMINI.md'] } });
  });

  it('keeps the user\'s own names and other keys', () => {
    write({ theme: 'dark', context: { fileName: 'CONTEXT.md', includeDirectories: ['../lib'] } });
    expect(ensureGeminiReadsAgentsMd(dir)).toBe('added');
    expect(read()).toEqual({ theme: 'dark', context: { fileName: ['AGENTS.md', 'CONTEXT.md'], includeDirectories: ['../lib'] } });
  });

  it('is idempotent', () => {
    ensureGeminiReadsAgentsMd(dir);
    const before = fs.readFileSync(file(), 'utf8');
    expect(ensureGeminiReadsAgentsMd(dir)).toBe('present');
    expect(fs.readFileSync(file(), 'utf8')).toBe(before);
  });

  it('leaves a settings file it cannot parse untouched', () => {
    write('{ "context": ');
    expect(ensureGeminiReadsAgentsMd(dir)).toBe('invalid');
    expect(fs.readFileSync(file(), 'utf8')).toBe('{ "context": ');
  });
});
