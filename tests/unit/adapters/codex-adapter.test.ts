import { describe, it, expect } from 'vitest';
import { CodexAdapter } from '../../../src/adapters/codex/adapter.js';

describe('Codex native support', () => {
  it('targets the documented native skill discovery directory', () => {
    expect(new CodexAdapter().getSkillsDirectory()).toBe('.agents/skills');
    expect(new CodexAdapter().supportsPlugins()).toBe(true);
  });
  it('describes native skills, portable state and host trust boundaries', () => {
    const instructions = new CodexAdapter().getInstructions();
    expect(instructions).toContain('.agents/skills');
    expect(instructions).toContain('project brief');
    expect(instructions).toContain('trust review');
    expect(instructions).not.toContain('openai-codex-cli');
    expect(instructions).not.toContain('GPT-5-Codex');
  });
});
