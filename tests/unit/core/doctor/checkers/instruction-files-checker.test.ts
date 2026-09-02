import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  InstructionFilesChecker,
  registeredCommands,
  availableSkills,
  removedSkillReplacements,
} from '../../../../../src/core/doctor/checkers/instruction-files-checker.js';
import { packageRoot } from '../../../../../src/core/doctor/checkers/hooks-checker.js';

describe('InstructionFilesChecker', () => {
  let dir: string;
  const checker = new InstructionFilesChecker();

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-doctor-instr-'));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const find = (checks: Array<{ name: string }>, needle: string) =>
    checks.find((c) => c.name.includes(needle))!;

  /** A file shaped like one `specweave update` writes: managed block + user tail. */
  const merged = (managedBody: string, userTail = ''): string =>
    [
      '<!-- SW:META template="claude" version="2.0.0" sections="loop" -->',
      '',
      '<!-- SW:SECTION:loop version="2.0.0" -->',
      managedBody,
      '<!-- SW:END:loop -->',
      '',
      userTail,
    ].join('\n');

  it('reads the real CLI command list and skill list', () => {
    const root = packageRoot();
    expect(registeredCommands(root).has('doctor')).toBe(true);
    expect(registeredCommands(root).has('complete')).toBe(true);
    expect(availableSkills(root).has('increment')).toBe(true);
  });

  it('warns when neither instruction file exists', async () => {
    const result = await checker.check(dir, {});
    expect(result.status).toBe('warn');
    expect(result.checks[0].message).toContain('no CLAUDE.md');
  });

  it('passes for a file whose commands and skills all resolve', async () => {
    fs.writeFileSync(
      path.join(dir, 'CLAUDE.md'),
      '# Loop\n\nRun `specweave verify`, then `specweave complete 0001`.\nClaude: `/sw:increment`, `/sw:done`.\n',
    );
    const result = await checker.check(dir, {});
    expect(find(result.checks, 'references').status).toBe('pass');
    expect(find(result.checks, 'placeholders').status).toBe('pass');
    expect(result.status).toBe('pass');
  });

  it('fails on a command that is not registered inside the managed block', async () => {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), merged('Run `specweave frobnicate` to ship.'));
    const check = find((await checker.check(dir, {})).checks, 'references');
    expect(check.status).toBe('fail');
    expect(check.message).toContain('specweave frobnicate');
    expect(check.message).toContain('managed block');
  });

  it('fails on a skill inside the managed block that no plugin directory backs', async () => {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), merged('Use `/sw:not-a-real-skill` for that.'));
    const check = find((await checker.check(dir, {})).checks, 'references');
    expect(check.status).toBe('fail');
    expect(check.message).toContain('/sw:not-a-real-skill');
  });

  it('only warns for a removed skill in user content, and names its replacement', async () => {
    fs.writeFileSync(
      path.join(dir, 'CLAUDE.md'),
      merged('Close with `/sw:done`.', '## Skill Memories\n\n- Agents should not run /sw:grill themselves.\n'),
    );
    const result = await checker.check(dir, {});
    const check = find(result.checks, 'references');
    expect(check.status).toBe('warn');
    expect(check.message).toContain('/sw:grill');
    expect(check.message).toContain('/sw:review');
    expect(result.status).toBe('warn');
  });

  it('warns without a replacement for an unmapped name in user content', async () => {
    fs.writeFileSync(
      path.join(dir, 'CLAUDE.md'),
      merged('Close with `/sw:done`.', 'We used to run /sw:not-a-real-skill here.\n'),
    );
    const check = find((await checker.check(dir, {})).checks, 'references');
    expect(check.status).toBe('warn');
    expect(check.message).toContain('/sw:not-a-real-skill resolves to nothing');
  });

  it('treats a legacy file with no SW markers as entirely user content', async () => {
    fs.writeFileSync(
      path.join(dir, 'CLAUDE.md'),
      '# Legacy 1.x\n\nRun `/sw:grill` before `specweave frobnicate`.\n',
    );
    const check = find((await checker.check(dir, {})).checks, 'references');
    expect(check.status).toBe('warn');
    expect(check.message).toContain('/sw:grill');
    expect(check.message).toContain('/sw:review');
    expect(check.message).toContain('specweave frobnicate');
  });

  it('passes a merged file whose managed and user content both resolve', async () => {
    fs.writeFileSync(
      path.join(dir, 'CLAUDE.md'),
      merged('Close with `/sw:done` after `specweave verify`.', 'My own note: `/sw:increment` first.\n'),
    );
    const result = await checker.check(dir, {});
    expect(find(result.checks, 'references').status).toBe('pass');
    expect(result.status).toBe('pass');
  });

  it('reads the removed-skill forwarding table from the plugin manifest', () => {
    const map = removedSkillReplacements(packageRoot());
    expect(map.get('grill')).toBe('sw:review');
    expect(map.get('pm')).toBe('sw:increment');
  });

  it('fails on a leftover {{ placeholder and points at the line', async () => {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# Project\n\n## Commands\n\n{{BUILD_COMMAND}}\n');
    const check = find((await checker.check(dir, {})).checks, 'placeholders');
    expect(check.status).toBe('fail');
    expect(check.details?.[0]).toContain('{{BUILD_COMMAND}}');
  });

  it('checks AGENTS.md as well as CLAUDE.md', async () => {
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'ok `specweave verify`\n');
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), '{{STACK}}\n');
    const result = await checker.check(dir, {});
    expect(find(result.checks, 'AGENTS.md placeholders').status).toBe('fail');
    expect(find(result.checks, 'CLAUDE.md placeholders').status).toBe('pass');
  });
});
