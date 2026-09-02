/**
 * PreToolUse guard tests — real temp filesystem, POSIX and Windows path fixtures.
 * Output contract: pass = `{}`; deny = hookSpecificOutput.permissionDecision "deny".
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { handle } from '../../../../../src/core/hooks/handlers/pre-tool-use.js';
import { createContext } from '../../../../../src/core/hooks/handlers/utils.js';
import type { HookContext, HookInput } from '../../../../../src/core/hooks/handlers/types.js';

let root = '';
let ctx: HookContext;

const WIN_META = 'C:\\proj\\.specweave\\increments\\0001-x\\metadata.json';
const POSIX_META = '/proj/.specweave/increments/0001-x/metadata.json';
const WIN_SPEC = 'C:\\proj\\.specweave\\increments\\0002-y\\spec.md';

function edit(file_path: string, new_string: string, tool_name = 'Edit'): HookInput {
  return { tool_name, tool_input: { file_path, old_string: 'x', new_string } };
}
function write(file_path: string, content: string): HookInput {
  return { tool_name: 'Write', tool_input: { file_path, content } };
}
function writeConfig(cfg: unknown) {
  fs.writeFileSync(ctx.configPath, JSON.stringify(cfg));
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-ptu-'));
  fs.mkdirSync(path.join(root, '.specweave', 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, '.specweave', 'config.json'), '{}');
  ctx = createContext(root);
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('fast paths', () => {
  it('passes for files outside .specweave/increments/', async () => {
    expect(await handle(edit('/proj/src/index.ts', 'b'), ctx)).toEqual({});
    expect(await handle(edit('C:\\proj\\src\\index.ts', '"status": "completed"'), ctx)).toEqual({});
  });
  it('passes for non-Write/Edit tools even on increment files', async () => {
    expect(await handle({ tool_name: 'Read', tool_input: { file_path: POSIX_META } }, ctx)).toEqual({});
    expect(await handle({ tool_name: 'TeamCreate', tool_input: { team_name: 'impl' } }, ctx)).toEqual({});
  });
  it('passes on missing tool_input', async () => {
    expect(await handle({ tool_name: 'Edit' }, ctx)).toEqual({});
  });
  it('accepts camelCase toolName/toolInput fallbacks', async () => {
    const res = await handle({ toolName: 'Edit', toolInput: { file_path: WIN_META, new_string: '"status": "completed"' } }, ctx);
    expect(res.hookSpecificOutput?.permissionDecision).toBe('deny');
  });
});

describe('status completion guard', () => {
  it.each([POSIX_META, WIN_META])('denies status→completed via Edit (%s)', async (fp) => {
    const res = await handle(edit(fp, '"status": "completed"'), ctx);
    expect(res).toEqual({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: expect.stringContaining('0001-x'),
      },
    });
    expect(res.hookSpecificOutput?.permissionDecisionReason).toContain('/sw:done 0001-x');
    expect(res).not.toHaveProperty('decision');
  });

  it('denies a Write of a whole metadata.json with status completed (Windows path)', async () => {
    const res = await handle(write(WIN_META, '{"status": "completed"}'), ctx);
    expect(res.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('passes other metadata edits', async () => {
    expect(await handle(edit(WIN_META, '"title": "new"'), ctx)).toEqual({});
  });

  it('passes when sw-done marker exists', async () => {
    fs.writeFileSync(path.join(ctx.stateDir, '.sw-done-in-progress'), '');
    expect(await handle(edit(WIN_META, '"status": "completed"'), ctx)).toEqual({});
  });

  it('passes under a verified auto session', async () => {
    fs.mkdirSync(path.join(ctx.stateDir, 'auto'), { recursive: true });
    fs.writeFileSync(path.join(ctx.stateDir, 'auto', 'session.json'), JSON.stringify({ status: 'active', testsVerified: true }));
    expect(await handle(edit(POSIX_META, '"status": "completed"'), ctx)).toEqual({});
  });

  it('still denies when the auto session file is corrupt', async () => {
    fs.mkdirSync(path.join(ctx.stateDir, 'auto'), { recursive: true });
    fs.writeFileSync(path.join(ctx.stateDir, 'auto', 'session.json'), '{{{CORRUPT');
    const res = await handle(edit(POSIX_META, '"status": "completed"'), ctx);
    expect(res.hookSpecificOutput?.permissionDecision).toBe('deny');
  });
});

describe('interview enforcement guard (Write spec.md)', () => {
  const strict = { planning: { deepInterview: { enabled: true, enforcement: 'strict' } } };

  it('passes when enforcement is not strict', async () => {
    writeConfig({ planning: { deepInterview: { enabled: true, enforcement: 'warn' } } });
    expect(await handle(write(WIN_SPEC, '# Real spec with AC-01'), ctx)).toEqual({});
  });

  it('passes template writes even under strict', async () => {
    writeConfig(strict);
    expect(await handle(write(WIN_SPEC, '# TEMPLATE FILE\n[Story Title]'), ctx)).toEqual({});
  });

  it('denies when the interview was never started (Windows path)', async () => {
    writeConfig(strict);
    const res = await handle(write(WIN_SPEC, '# Real spec'), ctx);
    expect(res.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(res.hookSpecificOutput?.permissionDecisionReason).toContain('0002-y');
    expect(res.hookSpecificOutput?.permissionDecisionReason).toContain('Interview Required');
  });

  it('denies with the missing categories listed', async () => {
    writeConfig(strict);
    fs.writeFileSync(
      path.join(ctx.stateDir, 'interview-0002-y.json'),
      JSON.stringify({ coveredCategories: { architecture: {}, security: {} } }),
    );
    const res = await handle(write(WIN_SPEC, '# Real spec'), ctx);
    expect(res.hookSpecificOutput?.permissionDecisionReason).toContain('Incomplete');
    expect(res.hookSpecificOutput?.permissionDecisionReason).toContain('integrations');
  });

  it('passes when every category is covered', async () => {
    writeConfig(strict);
    const all = ['architecture', 'integrations', 'ui-ux', 'performance', 'security', 'edge-cases'];
    fs.writeFileSync(
      path.join(ctx.stateDir, 'interview-0002-y.json'),
      JSON.stringify({ coveredCategories: Object.fromEntries(all.map((c) => [c, {}])) }),
    );
    expect(await handle(write(WIN_SPEC, '# Real spec'), ctx)).toEqual({});
  });

  it('Edit on spec.md is not subject to the interview guard', async () => {
    writeConfig(strict);
    expect(await handle(edit(WIN_SPEC, 'more text'), ctx)).toEqual({});
  });
});
