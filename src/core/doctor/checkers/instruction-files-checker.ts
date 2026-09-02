/**
 * Instruction Files Checker — every command and skill the generated CLAUDE.md /
 * AGENTS.md tells an agent to run must actually exist, and no placeholder may
 * survive into the file a model reads.
 *
 * Checks:
 * 1. every `specweave <cmd>` named in the managed files is registered in bin/specweave.js
 * 2. every `/sw:<name>` named in them has plugins/specweave/skills/<name>/SKILL.md
 * 3. no `{{` placeholder is left anywhere in the file
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HealthChecker, CategoryResult, CheckResult, DoctorOptions } from '../types.js';
import { calculateOverallStatus } from '../types.js';
import { packageRoot } from './hooks-checker.js';

const INSTRUCTION_FILES = ['CLAUDE.md', 'AGENTS.md'];

/** `specweave foo` / `specweave foo-bar` inside backticks or prose. */
const CLI_RE = /\bspecweave\s+([a-z][a-z0-9-]*)/g;
/** `/sw:name` (Claude slash command) — the plugin skill directory name. */
const SKILL_RE = /\/sw:([a-z][a-z0-9-]*)/g;

/** Global flags and prose words that follow `specweave` but are not commands. */
const NON_COMMANDS = new Set(['help', 'version', 'is', 'to', 'and', 'or', 'the', 'a', 'in', 'on']);

/** Command names registered in bin/specweave.js (`.command('name …')`). */
export function registeredCommands(root: string): Set<string> {
  const out = new Set<string>();
  try {
    const bin = fs.readFileSync(path.join(root, 'bin', 'specweave.js'), 'utf8');
    for (const m of bin.matchAll(/\.command\(\s*['"]([a-z][a-z0-9-]*)/g)) out.add(m[1]);
    // Sub-commands are registered on their parent (`docsCmd.command('build')`),
    // which the same regex already catches, so `docs build` resolves on `docs`.
  } catch {
    // handled by the caller: an empty set turns into a skip
  }
  return out;
}

/** Skill directory names shipped by the plugin. */
export function availableSkills(root: string): Set<string> {
  const dir = path.join(root, 'plugins', 'specweave', 'skills');
  try {
    return new Set(
      fs.readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'SKILL.md')))
        .map((e) => e.name),
    );
  } catch {
    return new Set();
  }
}

export class InstructionFilesChecker implements HealthChecker {
  category = 'Instruction Files';

  async check(projectRoot: string, _options: DoctorOptions): Promise<CategoryResult> {
    const checks: CheckResult[] = [];
    const root = packageRoot();
    const commands = registeredCommands(root);
    const skills = availableSkills(root);

    const present = INSTRUCTION_FILES
      .map((name) => ({ name, file: path.join(projectRoot, name) }))
      .filter((f) => fs.existsSync(f.file));

    if (present.length === 0) {
      return {
        category: this.category,
        status: 'warn',
        checks: [{
          name: 'Instruction files',
          status: 'warn',
          message: 'no CLAUDE.md or AGENTS.md',
          fixSuggestion: 'Run: specweave update',
        }],
      };
    }

    for (const { name, file } of present) {
      const content = fs.readFileSync(file, 'utf8');
      checks.push(this.checkPlaceholders(name, content));
      checks.push(this.checkReferences(name, content, commands, skills));
    }

    return { category: this.category, status: calculateOverallStatus(checks), checks };
  }

  private checkPlaceholders(name: string, content: string): CheckResult {
    const lines = content.split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => line.includes('{{'));

    if (lines.length === 0) {
      return { name: `${name} placeholders`, status: 'pass', message: 'no unresolved {{…}}' };
    }
    return {
      name: `${name} placeholders`,
      status: 'fail',
      message: `${lines.length} unresolved placeholder line(s)`,
      details: lines.slice(0, 5).map(({ line, n }) => `${n}: ${line.trim()}`),
      fixSuggestion: 'Run: specweave update-instructions (or fill the section in by hand)',
    };
  }

  private checkReferences(
    name: string,
    content: string,
    commands: Set<string>,
    skills: Set<string>,
  ): CheckResult {
    const missing: string[] = [];

    if (commands.size > 0) {
      for (const m of content.matchAll(CLI_RE)) {
        const cmd = m[1];
        if (NON_COMMANDS.has(cmd) || commands.has(cmd)) continue;
        const label = `specweave ${cmd}`;
        if (!missing.includes(label)) missing.push(label);
      }
    }
    if (skills.size > 0) {
      for (const m of content.matchAll(SKILL_RE)) {
        const skill = m[1];
        if (skills.has(skill)) continue;
        const label = `/sw:${skill}`;
        if (!missing.includes(label)) missing.push(label);
      }
    }

    if (commands.size === 0 && skills.size === 0) {
      return {
        name: `${name} references`,
        status: 'skip',
        message: 'could not read the installed CLI/plugin to verify against',
      };
    }
    if (missing.length === 0) {
      return { name: `${name} references`, status: 'pass', message: 'every command and skill resolves' };
    }
    return {
      name: `${name} references`,
      status: 'fail',
      message: `${missing.length} unresolvable reference(s): ${missing.slice(0, 5).join(', ')}`,
      fixSuggestion: 'Run: specweave update-instructions (the file is from an older SpecWeave)',
    };
  }
}
