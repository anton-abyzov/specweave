/**
 * `specweave require-increment [off|remind|enforce]` — show or set
 * `planning.requireIncrement` and install or remove the project-level
 * PreToolUse hook that enforces it (Claude Code reads
 * `<projectRoot>/.claude/settings.json`; other tools follow AGENTS.md).
 *
 * @module cli/commands/require-increment
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import {
  REQUIRE_INCREMENT_MODES,
  readRequireIncrementMode,
  type RequireIncrementMode,
} from '../../core/hooks/handlers/require-increment.js';
import { EDIT_HOOK_MATCHER, packageRoot, readProjectHook, setProjectHook } from './jev-helpers.js';
import { readSmallFixes } from './small-fix.js';

export function requireIncrementCommand(
  mode: string | undefined,
  opts: { cwd?: string; packageDir?: string } = {},
): number {
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  const configPath = path.join(root, '.specweave', 'config.json');
  const out = (s: string) => process.stdout.write(s + '\n');

  if (!mode) {
    const hook = readProjectHook(root, EDIT_HOOK_MATCHER);
    out(`planning.requireIncrement: ${readRequireIncrementMode(configPath)}`);
    out(`Claude Code edit hook: ${hook.present ? 'installed' : 'not installed'} (${hook.path})`);
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

  const hook = setProjectHook(root, mode !== 'off', opts.packageDir ?? packageRoot(), EDIT_HOOK_MATCHER);
  out(`planning.requireIncrement: ${mode}`);
  if (hook.error) {
    process.stderr.write(`Hook not changed: ${hook.error}\n`);
    return 1;
  }
  out(`Claude Code edit hook: ${hook.present ? 'installed' : 'removed'} (${hook.path})`);
  if (mode === 'enforce') out('Edits now need an increment or `specweave small-fix "<why>"` in the session.');
  return 0;
}
