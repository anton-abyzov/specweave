/**
 * Guard: no CLI output string may name a slash command that does not exist.
 *
 * This defect class has now shipped three times — `/inc`, then `/resume` from
 * `pause`/`abandon` and `/do` from `resume`, then `/specweave.inc` and
 * `/specweave-bitbucket:clone-repos`. Each one is a dead end for the user: they
 * type what the CLI told them to type and Claude Code answers "unknown
 * command". Nothing caught them because the strings are printed, never asserted.
 *
 * The check parses `src/**` with the TypeScript compiler, collects the string
 * and template literals that reach the user (arguments of console/logger/spinner
 * calls, lines pushed into an output buffer, and the bodies returned by the
 * adapters' `getInstructions()`), and requires every `/name` or `/ns:name`
 * token in them to resolve to a shipped skill directory.
 *
 * Data that is NOT output — e.g. the phase detector's table of command
 * *patterns* it matches against a user's history, or the instruction merger's
 * list of legacy headings it strips — is intentionally out of scope: those are
 * inputs, not promises.
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SRC = path.join(REPO_ROOT, 'src');
const SKILLS_DIR = path.join(REPO_ROOT, 'plugins', 'specweave', 'skills');

/**
 * Slash commands owned by something other than SpecWeave. Each entry must name
 * its owner — this list is the escape hatch, and an unjustified entry defeats
 * the whole guard.
 */
const NOT_OURS = new Map<string, string>([
  ['/plugin', 'Claude Code built-in (/plugin marketplace add, /plugin install)'],
  ['/reload-plugins', 'Claude Code built-in'],
  ['/chat', 'Gemini CLI built-in (/chat list)'],
  ['/v', 'Windows `reg query ... /v <name>` flag'],
  ['/force', 'Windows shell flag in the long-path help text'],
]);

/** Callees whose arguments end up in front of a user. */
const OUTPUT_CALLEES = new Set([
  'log', 'info', 'warn', 'error', 'debug', 'trace',
  'succeed', 'fail', 'start', 'stopAndPersist',
  'push', 'write',
]);

/** Functions whose return value is printed verbatim (adapter banners). */
const OUTPUT_RETURNERS = /instructions$/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      walk(p, out);
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts') && !e.name.endsWith('.test.ts')) {
      out.push(p);
    }
  }
  return out;
}

function calleeName(node: ts.CallExpression): string {
  const e = node.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.name)) return e.name.text;
  return '';
}

function enclosingFunctionName(node: ts.Node): string {
  for (let n: ts.Node | undefined = node; n; n = n.parent) {
    if (ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n)) {
      return n.name && ts.isIdentifier(n.name) ? n.name.text : '';
    }
    if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name)) return n.name.text;
  }
  return '';
}

interface Hit {
  token: string;
  file: string;
  line: number;
}

/**
 * `/ns:name` — unambiguous: nothing but a command is written that way.
 */
const NAMESPACED = /\/((?:sw|sw-github|sw-jira|sw-ado|specweave[a-z-]*)[:.][a-z][a-z0-9.-]*)/g;

/**
 * A bare `/name` only counts where the text is OFFERING it: at the start of a
 * line in a command list, or right after a `:` or `|` separator ("Resume with:
 * /resume 0002"). Anything else in prose is a unit or a path — `$5 /month`,
 * `owner /repo-name`, `.../${repo}/issues` — not a promise the user can type.
 *
 * `atStart` is false for a template chunk that FOLLOWS an interpolation: there
 * the chunk's first character is mid-sentence, not the start of a line.
 */
const NAME = '([a-z][a-z0-9-]+)(?![/a-zA-Z0-9_:.-])';
function bareRe(atStart: boolean): RegExp {
  const lineStart = atStart ? '(?:^|\\n)' : '\\n';
  return new RegExp(`${lineStart}[ \\t]*\\/${NAME}|[:|][ \\t]*\\/${NAME}`, 'g');
}

function collectHits(): Hit[] {
  const hits: Hit[] = [];

  for (const file of walk(SRC)) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

    const record = (node: ts.Node, text: string, atStart: boolean) => {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const rel = path.relative(REPO_ROOT, file);
      for (const m of text.matchAll(NAMESPACED)) hits.push({ token: `/${m[1]}`, file: rel, line });
      for (const m of text.matchAll(bareRe(atStart))) hits.push({ token: `/${m[1] ?? m[2]}`, file: rel, line });
    };

    const literalsIn = (node: ts.Node): void => {
      if (ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        record(node, node.text ?? '', false);
      } else if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node)
      ) {
        record(node, node.text ?? '', true);
      }
      ts.forEachChild(node, literalsIn);
    };

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && OUTPUT_CALLEES.has(calleeName(node))) {
        for (const arg of node.arguments) literalsIn(arg);
      }
      if (ts.isReturnStatement(node) && node.expression && OUTPUT_RETURNERS.test(enclosingFunctionName(node))) {
        literalsIn(node.expression);
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return hits;
}

function shippedSkills(): Set<string> {
  return new Set(
    fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  );
}

/** `/sw:do` → `do`; `/done` → `done`; anything else → null (unresolvable). */
function skillNameFor(token: string): string | null {
  const named = token.match(/^\/(?:sw|sw-github|sw-jira|sw-ado|specweave[a-z-]*)[:.]([a-z][a-z0-9-]*)$/);
  if (named) return named[1];
  const bare = token.match(/^\/([a-z][a-z0-9-]*)$/);
  return bare ? bare[1] : null;
}

describe('CLI output never names a slash command that does not exist', () => {
  const skills = shippedSkills();

  it('has the 2.0 skill surface to check against', () => {
    expect(skills.size).toBeGreaterThan(0);
    expect(skills.has('do')).toBe(true);
    expect(skills.has('increment')).toBe(true);
    // The command the CLI used to advertise. Its absence is the whole point.
    expect(skills.has('resume')).toBe(false);
  });

  it('resolves every slash command printed by the CLI', () => {
    const unresolved = collectHits().filter((h) => {
      if (NOT_OURS.has(h.token)) return false;
      const name = skillNameFor(h.token);
      return name === null || !skills.has(name);
    });

    const report = unresolved.map((h) => `${h.file}:${h.line}  ${h.token}`);
    expect(
      report,
      `These CLI output strings name a slash command with no plugins/specweave/skills/<name>/.\n` +
        `Point them at a real command (e.g. \`specweave resume <id>\`, /sw:do), or — if the command\n` +
        `belongs to another tool — add it to NOT_OURS with its owner.`
    ).toEqual([]);
  });
});
