/**
 * Instruction Files Checker — every command and skill the generated CLAUDE.md /
 * AGENTS.md tells an agent to run must actually exist, and no placeholder may
 * survive into the file a model reads.
 *
 * Checks:
 * 1. every `specweave <cmd>` named in the managed files is registered in bin/specweave.js
 * 2. every `/sw:<name>` named in them has plugins/specweave/skills/<name>/SKILL.md
 * 3. no `{{` placeholder is left anywhere in the file
 *
 * Severity depends on WHERE a reference lives. Inside the SW:SECTION regions
 * SpecWeave generates, an unresolvable reference is our bug: hard `fail`.
 * Outside them the text is the user's own writing, which the merger exists to
 * preserve verbatim — failing a health check over it would be incoherent, so it
 * is a `warn` that names the 2.0 replacement when one is known.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { HealthChecker, CategoryResult, CheckResult, DoctorOptions } from '../types.js';
import { calculateOverallStatus } from '../types.js';
import { packageRoot } from './hooks-checker.js';
import { splitManagedRegions } from '../../../cli/helpers/init/instruction-file-merger.js';

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

/**
 * `sw:<name>` -> its 2.0 replacement, from the plugin manifest's `removedIn2_0`
 * forwarding table. Keys are stored without the `sw:` prefix to match SKILL_RE.
 */
export function removedSkillReplacements(root: string): Map<string, string> {
  const out = new Map<string, string>();
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'plugins', 'specweave', 'marketplace.json'), 'utf8'),
    ) as { removedIn2_0?: { map?: Record<string, string> } };
    for (const [from, to] of Object.entries(manifest.removedIn2_0?.map ?? {})) {
      out.set(from.replace(/^sw:/, ''), to);
    }
  } catch {
    // no manifest: every miss simply reports as "resolves to nothing"
  }
  return out;
}

/** How a `/sw:<name>` or `specweave <cmd>` miss is described to the user. */
function describeMiss(label: string, replacement: string | undefined): string {
  if (!replacement) return `${label} resolves to nothing`;
  const target = replacement.startsWith('sw:') ? `/${replacement}` : replacement;
  return `${label} was removed in 2.0 — its work is now ${target}`;
}

export class InstructionFilesChecker implements HealthChecker {
  category = 'Instruction Files';

  async check(projectRoot: string, _options: DoctorOptions): Promise<CategoryResult> {
    const checks: CheckResult[] = [];
    const root = packageRoot();
    const commands = registeredCommands(root);
    const skills = availableSkills(root);
    const removed = removedSkillReplacements(root);

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
      checks.push(this.checkReferences(name, content, commands, skills, removed));
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
    removed: Map<string, string>,
  ): CheckResult {
    if (commands.size === 0 && skills.size === 0) {
      return {
        name: `${name} references`,
        status: 'skip',
        message: 'could not read the installed CLI/plugin to verify against',
      };
    }

    // The merger's own marker parser decides what SpecWeave generated and what
    // the user wrote. A file with no markers is entirely user-owned.
    const { managed, user } = splitManagedRegions(content);

    const scan = (text: string): string[] => {
      const misses: string[] = [];
      const add = (label: string, replacement: string | undefined): void => {
        const line = describeMiss(label, replacement);
        if (!misses.includes(line)) misses.push(line);
      };
      if (commands.size > 0) {
        for (const m of text.matchAll(CLI_RE)) {
          const cmd = m[1];
          if (NON_COMMANDS.has(cmd) || commands.has(cmd)) continue;
          add(`specweave ${cmd}`, undefined);
        }
      }
      if (skills.size > 0) {
        for (const m of text.matchAll(SKILL_RE)) {
          const skill = m[1];
          if (skills.has(skill)) continue;
          add(`/sw:${skill}`, removed.get(skill));
        }
      }
      return misses;
    };

    const managedMisses = scan(managed);
    const userMisses = scan(user).filter((m) => !managedMisses.includes(m));

    if (managedMisses.length > 0) {
      return {
        name: `${name} references`,
        status: 'fail',
        message: `${managedMisses.length} unresolvable reference(s) in the SpecWeave-managed block: ${managedMisses.slice(0, 3).join('; ')}`,
        details: managedMisses,
        fixSuggestion: 'Run: specweave update-instructions (the managed block is from an older SpecWeave)',
      };
    }
    if (userMisses.length > 0) {
      return {
        name: `${name} references`,
        status: 'warn',
        message: `${userMisses.length} stale reference(s) in your own text: ${userMisses.slice(0, 3).join('; ')}`,
        details: userMisses,
        fixSuggestion: `Edit ${name} by hand — SpecWeave preserves your own sections and will not rewrite them`,
      };
    }
    return { name: `${name} references`, status: 'pass', message: 'every command and skill resolves' };
  }
}
