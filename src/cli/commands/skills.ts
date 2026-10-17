/**
 * CLI: `specweave skills [list|enable|disable] [names...]` — which SpecWeave
 * skills this project has. Core skills are always on; optional ones (grill-me,
 * glossary, sync, project, jev) are turned on in `.specweave/config.json`
 * (`skills.enabled` / `skills.disabled`) or detected from the project's files.
 * `enable` and `disable` write the config and reinstall the project copies.
 *
 * @module cli/commands/skills
 */

import * as fs from 'fs';
import * as path from 'path';
import { findProjectRoot } from '../../utils/find-project-root.js';
import {
  defaultPluginSkillsDir,
  catalogFor,
  installProjectSkills,
  projectSkillStates,
} from '../../core/skills/project-skills.js';
import type { SkillState } from '../../core/skills/catalog.js';

export interface SkillsCommandOptions {
  json?: boolean;
  /** Override cwd (tests). */
  cwd?: string;
  /** Plugin skills folder (tests). */
  sourceDir?: string;
}

const out = (s: string) => process.stdout.write(s + '\n');
const err = (s: string) => process.stderr.write(s + '\n');

function describe(state: SkillState): string {
  if (state.tier === 'core') return 'core';
  switch (state.reason) {
    case 'enabled': return 'on (skills.enabled)';
    case 'detected': return `on (detected: ${state.detail})`;
    case 'disabled': return 'off (skills.disabled)';
    default: return 'off';
  }
}

function printStates(states: SkillState[]): void {
  const width = Math.max(...states.map((s) => s.name.length)) + 3;
  for (const s of states) {
    const name = `sw-${s.name}`.padEnd(width + 1);
    const summary = s.tier === 'optional' ? `  ${s.summary}` : '';
    out(`${s.on ? '●' : '○'} ${name}${describe(s).padEnd(34)}${summary}`.trimEnd());
  }
}

/** Read `.specweave/config.json` as a plain object (empty when missing). */
function readConfig(file: string): Record<string, any> {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8')) ?? {};
}

export async function skillsCommand(
  action: string | undefined,
  names: string[] = [],
  opts: SkillsCommandOptions = {},
): Promise<number> {
  const root = findProjectRoot(opts.cwd ?? process.cwd());
  if (!root) {
    err('Not inside a SpecWeave project (no .specweave/ found). Run `specweave init` first.');
    return 1;
  }
  const sourceDir = opts.sourceDir ?? defaultPluginSkillsDir();
  const verb = action ?? 'list';

  if (verb === 'list') {
    const states = projectSkillStates(root, { sourceDir });
    if (opts.json) out(JSON.stringify(states, null, 2));
    else {
      printStates(states);
      out('Turn one on: specweave skills enable <name>   off: specweave skills disable <name>');
    }
    return 0;
  }

  if (verb !== 'enable' && verb !== 'disable') {
    err(`Unknown action "${verb}". Use: specweave skills [list|enable|disable] [names...]`);
    return 1;
  }
  const catalog = catalogFor(sourceDir);
  const wanted = names.map((n) => n.replace(/^sw-/, ''));
  if (wanted.length === 0) {
    err(`Name at least one optional skill: ${catalog.optional.map((s) => s.name).join(', ')}`);
    return 1;
  }
  const optional = new Set(catalog.optional.map((s) => s.name));
  for (const name of wanted) {
    if (catalog.core.includes(name)) {
      err(`sw-${name} is a core skill and is always installed.`);
      return 1;
    }
    if (!optional.has(name)) {
      err(`Unknown skill "${name}". Optional skills: ${[...optional].join(', ')}`);
      return 1;
    }
  }

  const file = path.join(root, '.specweave', 'config.json');
  let config: Record<string, any>;
  try {
    config = readConfig(file);
  } catch (e) {
    err(`Cannot read ${file}: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
  const skills = (config.skills && typeof config.skills === 'object' ? config.skills : {}) as { enabled?: unknown; disabled?: unknown };
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.replace(/^sw-/, '')) : []);
  const enabled = new Set(list(skills.enabled));
  const disabled = new Set(list(skills.disabled));
  for (const name of wanted) {
    if (verb === 'enable') { enabled.add(name); disabled.delete(name); }
    else { disabled.add(name); enabled.delete(name); }
  }
  const next: Record<string, string[]> = {};
  if (enabled.size) next.enabled = [...enabled].sort();
  if (disabled.size) next.disabled = [...disabled].sort();
  if (Object.keys(next).length) config.skills = next;
  else delete config.skills;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');

  const result = installProjectSkills(root, { sourceDir });
  const states = projectSkillStates(root, { sourceDir });
  if (opts.json) {
    out(JSON.stringify({ skills: states, written: result.written, removed: result.removedSkills, kept: result.keptSkills }, null, 2));
    return 0;
  }
  for (const name of wanted) {
    const state = states.find((s) => s.name === name)!;
    out(`${state.on ? '●' : '○'} sw-${name}: ${describe(state)}`);
  }
  if (result.removedSkills.length) out(`Removed ${result.removedSkills.join(', ')}`);
  if (result.keptSkills.length) out(`Kept ${result.keptSkills.join(', ')}: changed by hand or not SpecWeave's copy; delete it yourself if you no longer want it.`);
  out('Restart or reload your tool so it sees the change.');
  return 0;
}
