/**
 * `specweave require-increment [off|remind|enforce]` — show or set
 * `planning.requireIncrement` and install or remove the PreToolUse hook that
 * enforces it, both in `<projectRoot>/.claude/settings.json` and in the user's
 * `~/.claude/settings.json`. The user entry reaches Claude sessions that run
 * outside the project, such as SpecWithCode worktrees; without the project's
 * marker the launcher's fast path passes those edits at once. Other tools
 * follow AGENTS.md.
 *
 * @module cli/commands/require-increment
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import {
  REQUIRE_INCREMENT_MARKER,
  REQUIRE_INCREMENT_MODES,
  readRequireIncrementMode,
  type RequireIncrementMode,
} from '../../core/hooks/handlers/require-increment.js';
import { EDIT_HOOK_MATCHER, packageRoot, readProjectHook, setProjectHook } from './jev-helpers.js';
import { readSmallFixes } from './small-fix.js';

export function requireIncrementCommand(
  mode: string | undefined,
  opts: { cwd?: string; packageDir?: string; home?: string } = {},
): number {
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  const home = opts.home ?? os.homedir();
  const configPath = path.join(root, '.specweave', 'config.json');
  const out = (s: string) => process.stdout.write(s + '\n');

  if (!mode) {
    const hook = readProjectHook(root, EDIT_HOOK_MATCHER);
    const user = readProjectHook(home, EDIT_HOOK_MATCHER);
    out(`planning.requireIncrement: ${readRequireIncrementMode(configPath)}`);
    out(`Claude Code edit hook: ${hook.present ? 'installed' : 'not installed'} (${hook.path})`);
    out(`Claude Code user edit hook: ${user.present ? 'installed' : 'not installed'} (${user.path})`);
    out(`Small fixes logged: ${readSmallFixes(root).length}`);
    return 0;
  }
  if (!REQUIRE_INCREMENT_MODES.includes(mode as RequireIncrementMode)) {
    process.stderr.write(`Unknown mode "${mode}". Use one of: ${REQUIRE_INCREMENT_MODES.join(', ')}\n`);
    return 1;
  }

  let config: Record<string, any>;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    process.stderr.write(`Cannot read ${configPath}: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  config.planning = { ...(config.planning ?? {}), requireIncrement: mode };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

  // The hook launcher's fast path skips ordinary edits unless this marker exists.
  const marker = path.join(root, '.specweave', 'state', REQUIRE_INCREMENT_MARKER);
  if (mode === 'off') fs.rmSync(marker, { force: true });
  else {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, `${mode}\n`, 'utf8');
  }
  const packageDir = opts.packageDir ?? packageRoot();
  const hook = setProjectHook(root, mode !== 'off', packageDir, EDIT_HOOK_MATCHER);
  const user = setProjectHook(home, mode !== 'off', packageDir, EDIT_HOOK_MATCHER);
  out(`planning.requireIncrement: ${mode}`);
  let failed = false;
  for (const [label, state] of [['Claude Code edit hook', hook], ['Claude Code user edit hook', user]] as const) {
    if (state.error) {
      process.stderr.write(`${label} not changed: ${state.error}\n`);
      failed = true;
    } else out(`${label}: ${state.present ? 'installed' : 'removed'} (${state.path})`);
  }
  if (failed) return 1;
  if (mode === 'enforce') out('Edits now need an increment or `specweave small-fix "<why>"` in the session.');
  return 0;
}
