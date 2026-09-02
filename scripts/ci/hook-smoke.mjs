#!/usr/bin/env node
/**
 * Cross-platform hook smoke test (used by .github/workflows/hooks-crossplatform.yml
 * and runnable locally after `npm run build`):
 *
 *   node scripts/ci/hook-smoke.mjs
 *
 * For each of the four events it spawns `node plugins/specweave/hooks/run.mjs <event>`
 * with a sample stdin (piped from Node — no shell redirection, PowerShell-safe),
 * asserts exit 0, exactly one JSON object on stdout and a schema-valid shape.
 * Zero dependencies; validation mirrors src/core/hooks/handlers/types.ts.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const runner = path.join(repoRoot, 'plugins', 'specweave', 'hooks', 'run.mjs');

const EVENT_NAME = {
  'session-start': 'SessionStart',
  'pre-tool-use': 'PreToolUse',
  'stop': 'Stop',
  'pre-compact': 'PreCompact',
};

/** Sample project: one active increment so SessionStart has something to say. */
const project = mkdtempSync(path.join(tmpdir(), 'sw-hook-smoke-'));
mkdirSync(path.join(project, '.specweave', 'state'), { recursive: true });
writeFileSync(path.join(project, '.specweave', 'config.json'), '{}');
const inc = path.join(project, '.specweave', 'increments', '0001-smoke');
mkdirSync(inc, { recursive: true });
writeFileSync(path.join(inc, 'metadata.json'), JSON.stringify({ status: 'active', title: 'Smoke' }));
writeFileSync(path.join(inc, 'tasks.md'), '### T-001: First\n**Status**: [ ] pending\n');
writeFileSync(path.join(inc, 'spec.md'), '# Smoke\n\n- [ ] AC-01 x\n');

const winMeta = 'C:\\proj\\.specweave\\increments\\0001-smoke\\metadata.json';
const cases = [
  { event: 'session-start', input: { hook_event_name: 'SessionStart', source: 'startup' }, expect: (o) => o.hookSpecificOutput?.additionalContext?.includes('0001-smoke') },
  { event: 'pre-tool-use', input: { hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: winMeta, old_string: 'a', new_string: '"status": "completed"' } }, expect: (o) => o.hookSpecificOutput?.permissionDecision === 'deny' },
  { event: 'pre-tool-use', label: 'pre-tool-use (fast path, non-increment file)', input: { hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: 'C:\\proj\\src\\a.ts', old_string: 'a', new_string: 'b' } }, expect: (o) => Object.keys(o).length === 0 },
  { event: 'stop', input: { hook_event_name: 'Stop', stop_hook_active: false }, expect: (o) => Object.keys(o).length === 0 },
  { event: 'pre-compact', input: { hook_event_name: 'PreCompact', trigger: 'auto' }, expect: (o) => Object.keys(o).length === 0 },
];

function validate(event, o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return 'not a JSON object';
  const hso = o.hookSpecificOutput;
  if (hso !== undefined && (typeof hso !== 'object' || hso.hookEventName !== EVENT_NAME[event])) {
    return `hookSpecificOutput.hookEventName must be ${EVENT_NAME[event]}`;
  }
  if ('decision' in o && o.decision !== 'block') return `invalid decision ${JSON.stringify(o.decision)}`;
  if (o.decision === 'block' && typeof o.reason !== 'string') return 'block without reason';
  if (event === 'pre-tool-use') {
    if ('decision' in o) return 'PreToolUse must not use top-level decision';
    if (hso && !['allow', 'deny', 'ask'].includes(hso.permissionDecision)) return 'bad permissionDecision';
  }
  if (event === 'session-start' && hso && typeof hso.additionalContext !== 'string') return 'additionalContext must be a string';
  return null;
}

let failed = 0;
for (const c of cases) {
  const label = c.label ?? c.event;
  const res = spawnSync(process.execPath, [runner, c.event], {
    cwd: project,
    input: JSON.stringify({ ...c.input, cwd: project }),
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, SPECWEAVE_HOME: repoRoot, SPECWEAVE_HOOK_DRY_RUN: '1' },
  });
  const out = (res.stdout || '').trim();
  let parsed;
  let problem = null;
  if (res.status !== 0) problem = `exit ${res.status}: ${res.stderr}`;
  else if (out.split('\n').length !== 1) problem = `expected exactly one line, got: ${JSON.stringify(out)}`;
  else {
    try { parsed = JSON.parse(out); } catch { problem = `non-JSON stdout: ${out}`; }
    if (!problem) problem = validate(c.event, parsed);
    if (!problem && !c.expect(parsed)) problem = `unexpected shape: ${out}`;
  }
  if (problem) {
    failed++;
    console.error(`FAIL ${label}: ${problem}`);
  } else {
    console.log(`ok   ${label}: ${out}`);
  }
}

// Unknown event and garbage stdin must still be `{}` / exit 0.
for (const [label, event, input] of [['unknown event', 'bogus', '{}'], ['garbage stdin', 'stop', '{{{']]) {
  const res = spawnSync(process.execPath, [runner, event], { cwd: project, input, encoding: 'utf8', timeout: 20000, env: { ...process.env, SPECWEAVE_HOME: repoRoot } });
  if (res.status !== 0 || (res.stdout || '').trim() !== '{}') {
    failed++;
    console.error(`FAIL ${label}: exit ${res.status} stdout=${JSON.stringify(res.stdout)}`);
  } else {
    console.log(`ok   ${label}: {}`);
  }
}

rmSync(project, { recursive: true, force: true });
if (failed > 0) {
  console.error(`${failed} hook smoke check(s) failed`);
  process.exit(1);
}
console.log(`all hook smoke checks passed on ${process.platform}`);
