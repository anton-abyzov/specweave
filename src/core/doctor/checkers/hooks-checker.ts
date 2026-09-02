/**
 * Hooks Checker — dry-runs the SpecWeave 2.0 hook launcher for each of the
 * four registered events with a sample stdin and validates the JSON output
 * against the per-event Claude Code schema.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import type { HealthChecker, CategoryResult, CheckResult, DoctorOptions } from '../types.js';
import { calculateOverallStatus } from '../types.js';
import { HOOK_EVENTS, validateHookOutput } from '../../hooks/handlers/types.js';

/** Per-event launcher budget: a hook that needs longer than this is broken. */
export const DRY_RUN_TIMEOUT_MS = 10000;

/** Sample payloads that must never trigger a block or a side effect. */
export const SAMPLE_HOOK_INPUT: Record<(typeof HOOK_EVENTS)[number], Record<string, unknown>> = {
  'session-start': { hook_event_name: 'SessionStart', source: 'startup' },
  'pre-tool-use': {
    hook_event_name: 'PreToolUse',
    tool_name: 'Edit',
    tool_input: { file_path: 'C:\\proj\\.specweave\\increments\\0001-doctor\\tasks.md', old_string: 'a', new_string: 'b' },
  },
  'stop': { hook_event_name: 'Stop', stop_hook_active: false },
  'pre-compact': { hook_event_name: 'PreCompact', trigger: 'auto' },
};

/** The specweave package root: walk up from this file until package.json name === 'specweave'. */
export function packageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) as { name?: string };
      if (pkg.name === 'specweave') return dir;
    } catch {
      // keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');
}

export class HooksChecker implements HealthChecker {
  category = 'Hooks';

  async check(projectRoot: string, options: DoctorOptions): Promise<CategoryResult> {
    const checks: CheckResult[] = [];
    const pluginRoot = path.join(packageRoot(), 'plugins', 'specweave');
    const runner = path.join(pluginRoot, 'hooks', 'run.mjs');
    const hooksJson = path.join(pluginRoot, 'hooks', 'hooks.json');

    if (!fs.existsSync(runner) || !fs.existsSync(hooksJson)) {
      checks.push({
        name: 'Hook launcher',
        status: 'fail',
        message: `missing ${fs.existsSync(runner) ? 'hooks.json' : 'hooks/run.mjs'} in ${pluginRoot}`,
        fixSuggestion: 'Reinstall: npm i -g specweave && specweave refresh-plugins',
      });
      return { category: this.category, status: 'fail', checks };
    }

    checks.push(this.checkHooksJson(hooksJson));

    if (options.quick) {
      for (const event of HOOK_EVENTS) {
        checks.push({ name: `${event} dry-run`, status: 'skip', message: 'skipped (quick mode)' });
      }
    } else {
      // The four launches are independent — run them concurrently so `doctor`
      // costs one hook round-trip, not four.
      checks.push(...(await Promise.all(HOOK_EVENTS.map((event) => this.dryRun(runner, event, projectRoot)))));
    }

    return { category: this.category, status: calculateOverallStatus(checks), checks };
  }

  /** hooks.json must be exec-form (command + args), node-based, with sane timeouts. */
  private checkHooksJson(hooksJson: string): CheckResult {
    try {
      const data = JSON.parse(fs.readFileSync(hooksJson, 'utf8')) as {
        hooks?: Record<string, Array<{ hooks?: Array<{ command?: string; args?: string[]; timeout?: number }> }>>;
      };
      const problems: string[] = [];
      for (const [event, groups] of Object.entries(data.hooks ?? {})) {
        for (const group of groups) {
          for (const h of group.hooks ?? []) {
            if (h.command !== 'node' || !Array.isArray(h.args)) problems.push(`${event}: not exec-form node`);
            if (typeof h.timeout === 'number' && h.timeout > 60) problems.push(`${event}: timeout ${h.timeout}s > 60s`);
          }
        }
      }
      return problems.length === 0
        ? { name: 'hooks.json', status: 'pass', message: 'exec-form node launcher, timeouts <= 60s' }
        : { name: 'hooks.json', status: 'fail', message: problems.join('; ') };
    } catch (err) {
      return { name: 'hooks.json', status: 'fail', message: `unreadable: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  private async dryRun(
    runner: string,
    event: (typeof HOOK_EVENTS)[number],
    projectRoot: string,
  ): Promise<CheckResult> {
    const start = Date.now();
    const name = `${event} dry-run`;
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = execFile(
        process.execPath,
        [runner, event],
        {
          cwd: projectRoot,
          encoding: 'utf8',
          timeout: DRY_RUN_TIMEOUT_MS,
          env: { ...process.env, SPECWEAVE_HOME: packageRoot(), SPECWEAVE_HOOK_DRY_RUN: '1' },
        },
        (err, out) => (err ? reject(err) : resolve(out)),
      );
      child.stdin?.end(JSON.stringify({ ...SAMPLE_HOOK_INPUT[event], cwd: projectRoot }));
    }).catch((err: unknown) => (err instanceof Error ? err : new Error(String(err))));

    const durationMs = Date.now() - start;
    if (stdout instanceof Error) {
      return {
        name,
        status: 'fail',
        message: `launcher failed: ${stdout.message.split('\n')[0]}`,
        durationMs,
        fixSuggestion: `node must be on PATH; run: node <plugin>/hooks/run.mjs ${event}`,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout.trim() || '{}');
    } catch {
      return { name, status: 'fail', message: `non-JSON output: ${stdout.trim().slice(0, 80)}`, durationMs };
    }
    const problem = validateHookOutput(event, parsed);
    if (problem) return { name, status: 'fail', message: problem, durationMs };
    if (event === 'session-start' && JSON.stringify(parsed).includes('hooks inactive')) {
      return {
        name,
        status: 'warn',
        message: 'launcher could not locate the specweave CLI',
        durationMs,
        fixSuggestion: 'npm i -g specweave (or set SPECWEAVE_HOME)',
      };
    }
    return { name, status: 'pass', message: `valid ${JSON.stringify(parsed).slice(0, 60)}`, durationMs };
  }
}
