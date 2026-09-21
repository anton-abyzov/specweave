/**
 * CLI: `specweave jev <action>` — TypeSafe System One from the shell.
 *
 * Subcommands: doctor | setup | ask | route | task | guard | screen | failure | browse | usage
 *
 * Exit codes (every agent integration depends on these):
 *   0 ok · 1 error · 2 guard warn · 3 guard deny · 4 Jev unavailable (disabled or no key)
 *
 * Exit 4 prints a single reason line on stderr and nothing else, so a hook or script can
 * treat it as "continue without Jev". `doctor` is the one exception: reporting the
 * unavailable state IS its job, so it prints its report and still exits 4.
 *
 * The API key value is never printed, logged or written — only env var NAMES.
 *
 * @module cli/commands/jev
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  JEV_FALLBACK_KEY_ENV,
  JEV_PROVIDER_KEY_ENV,
  JevClient,
  classifyFailure,
  classifyTask,
  guardCommand,
  loadJevConfig,
  readUsageSummary,
  resolveApiKey,
  routePrompt,
  runBrowse,
  screenText,
  type Question,
} from '../../core/jev/index.js';
import { parseSpecAcs } from '../../core/tasks/verify-runner.js';
import { IncrementResolutionError, resolveIncrement } from '../../core/tasks/resolve-increment.js';
import { loadTaskBoard, normalizeTaskId } from '../../core/tasks/task-board.js';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import {
  EXIT,
  err,
  extractSection,
  formatCost,
  formatProbabilities,
  json,
  messageOf,
  out,
  parseJsonOrText,
  parseKeyValues,
  parseQuestions,
  readArgValue,
  readFileOrStdin,
  shorthandQuestions,
  skillRoster,
  jevDoctor,
  jevSetup,
  type JevCommandOptions,
  type ReadSources,
} from './jev-helpers.js';

export type { JevCommandOptions } from './jev-helpers.js';

const ACTIONS = 'doctor | setup | ask | route | task | guard | screen | failure | browse | usage';

/** Build a client, or explain (in one line) why Jev is unavailable. */
function openClient(
  root: string,
  env: NodeJS.ProcessEnv,
  opts: JevCommandOptions,
  kind: string,
): { client: JevClient } | { reason: string } {
  if (opts.client) return { client: opts.client };
  const cfg = loadJevConfig(root, env);
  if (!cfg.enabled) {
    return { reason: 'Jev is disabled (jev.enabled is false) — run: specweave jev setup' };
  }
  const key = resolveApiKey(cfg, env);
  if (!key) {
    return { reason: `Jev has no API key — set ${JEV_PROVIDER_KEY_ENV[cfg.provider]} (or ${JEV_FALLBACK_KEY_ENV})` };
  }
  try {
    return {
      client: new JevClient(cfg, {
        apiKey: key.key,
        projectRoot: root,
        fetch: opts.fetch,
        kind,
      }),
    };
  } catch (error) {
    return { reason: `Jev client unavailable: ${messageOf(error)}` };
  }
}

/** `specweave jev <action> [args...]` — returns the process exit code. */
export async function jevCommand(
  action: string,
  args: string[] = [],
  opts: JevCommandOptions = {},
): Promise<number> {
  const cwd = opts.cwd ?? process.cwd();
  const root = resolveEffectiveRoot(cwd);
  const env = opts.env ?? process.env;
  const src: ReadSources = { cwd, stdin: opts.stdin };

  try {
    switch ((action ?? '').trim().toLowerCase()) {
      case 'doctor': return await jevDoctor(root, env, opts);
      case 'setup': return await jevSetup(root, env, opts);
      case 'ask': return await ask(root, env, opts, src);
      case 'route': return await route(root, env, opts, args);
      case 'task': return await taskTier(root, env, opts, args);
      case 'guard': return await guard(root, env, opts, args);
      case 'screen': return await screen(root, env, opts, args, src);
      case 'failure': return await failure(root, env, opts, args, src);
      case 'browse': return await browse(root, opts);
      case 'usage': return usage(root, opts);
      default:
        err(`Unknown jev action "${action}". Use: ${ACTIONS}`);
        return EXIT.error;
    }
  } catch (error) {
    err(`jev ${action}: ${messageOf(error)}`);
    return EXIT.error;
  }
}

// ── ask ──────────────────────────────────────────────────────────────────────

async function ask(
  root: string,
  env: NodeJS.ProcessEnv,
  opts: JevCommandOptions,
  src: ReadSources,
): Promise<number> {
  const stateText = readArgValue(opts.state, src);
  if (stateText === undefined) {
    err('jev ask needs --state <json|text|@file|-> (and --questions or --choice/--noul)');
    return EXIT.error;
  }

  let questions: Record<string, Question>;
  const questionsText = readArgValue(opts.questions, src);
  if (questionsText !== undefined) {
    questions = parseQuestions(questionsText);
  } else {
    questions = shorthandQuestions(opts);
  }
  if (Object.keys(questions).length === 0) {
    err('jev ask needs --questions <json|@file>, or --choice "…" --option key=desc, or --noul "…"');
    return EXIT.error;
  }

  const opened = openClient(root, env, opts, 'ask');
  if ('reason' in opened) { err(opened.reason); return EXIT.unavailable; }

  const response = await opened.client.ask(parseJsonOrText(stateText), questions, { kind: 'ask' });
  if (opts.json) json(response);
  else json(response.answers);
  return EXIT.ok;
}

// ── route ────────────────────────────────────────────────────────────────────

async function route(
  root: string,
  env: NodeJS.ProcessEnv,
  opts: JevCommandOptions,
  args: string[],
): Promise<number> {
  const prompt = args.join(' ').trim();
  if (!prompt) { err('jev route needs a prompt: specweave jev route "<prompt>"'); return EXIT.error; }

  const opened = openClient(root, env, opts, 'route');
  if ('reason' in opened) { err(opened.reason); return EXIT.unavailable; }

  let activeIncrement: string | undefined;
  try {
    activeIncrement = resolveIncrement(root).id;
  } catch {
    activeIncrement = undefined;
  }

  const decision = await routePrompt(opened.client, prompt, { skills: skillRoster(), activeIncrement });
  if (opts.json) { json(decision); return decision.available ? EXIT.ok : EXIT.unavailable; }
  if (!decision.available) { err(`Jev unavailable: ${decision.reason}`); return EXIT.unavailable; }

  out(`skill       ${decision.skill ?? 'none'} (confidence ${decision.skillConfidence.toFixed(2)})`);
  out(`kind        ${decision.kind} (confidence ${decision.kindConfidence.toFixed(2)})`);
  out(`complexity  ${decision.complexity} (confidence ${decision.complexityConfidence.toFixed(2)}) → tier ${decision.tier}`);
  out(`increment   ${decision.needsIncrement.toFixed(2)} probability this needs one`);
  out(`cost        ${decision.latencyMs} ms · ${formatCost(decision.cost ?? 0)}`);
  const probabilities = formatProbabilities(decision.skillProbabilities);
  if (probabilities) out(`skills      ${probabilities}`);
  return EXIT.ok;
}

// ── task ─────────────────────────────────────────────────────────────────────

async function taskTier(
  root: string,
  env: NodeJS.ProcessEnv,
  opts: JevCommandOptions,
  args: string[],
): Promise<number> {
  const taskArg = args[0];
  if (!taskArg) { err('jev task needs a task id: specweave jev task T-01 [incrementId]'); return EXIT.error; }

  let inc;
  try {
    inc = resolveIncrement(root, args[1] ?? opts.increment);
  } catch (error) {
    if (error instanceof IncrementResolutionError) { err(error.message); return EXIT.error; }
    throw error;
  }

  const board = loadTaskBoard(inc.dir);
  const id = normalizeTaskId(taskArg, board.tasks.map((t) => t.id));
  const task = board.tasks.find((t) => t.id === id);
  if (!task) {
    err(`Task "${taskArg}" not found in ${inc.id} (have: ${board.tasks.map((t) => t.id).join(', ') || 'none'})`);
    return EXIT.error;
  }

  let spec = '';
  try {
    spec = fs.readFileSync(path.join(inc.dir, 'spec.md'), 'utf-8');
  } catch {
    spec = '';
  }
  const specAcs = parseSpecAcs(spec);
  const acs = (task.acs ?? []).map((acId) => {
    const found = specAcs.find((a) => a.id === acId);
    return found ? `${found.id} ${found.text}` : acId;
  });

  const opened = openClient(root, env, opts, 'task');
  if ('reason' in opened) { err(opened.reason); return EXIT.unavailable; }

  const decision = await classifyTask(opened.client, {
    id: task.id,
    title: task.title,
    body: task.description ?? task.title,
    acs,
    approach: extractSection(spec, 'Approach'),
  });

  if (opts.json) {
    json({ increment: inc.id, task: task.id, title: task.title, ...decision });
    return decision.available ? EXIT.ok : EXIT.unavailable;
  }
  if (!decision.available) { err(`Jev unavailable: ${decision.reason}`); return EXIT.unavailable; }

  out(`${inc.id} ${task.id} ${task.title}`);
  out(`complexity  ${decision.complexity} (confidence ${decision.confidence.toFixed(2)})`);
  out(`tier        ${decision.tier}`);
  out(`increment   ${decision.needsIncrement.toFixed(2)} probability this needs its own increment`);
  out(`cost        ${decision.latencyMs} ms · ${formatCost(decision.cost ?? 0)}`);
  return EXIT.ok;
}

// ── guard ────────────────────────────────────────────────────────────────────

async function guard(
  root: string,
  env: NodeJS.ProcessEnv,
  opts: JevCommandOptions,
  args: string[],
): Promise<number> {
  const command = args.join(' ').trim();
  if (!command) { err('jev guard needs a command: specweave jev guard "<command>"'); return EXIT.error; }

  const opened = openClient(root, env, opts, 'guard');
  if ('reason' in opened) { err(opened.reason); return EXIT.unavailable; }

  const decision = await guardCommand(opened.client, { command, cwd: root });
  if (!decision.available) {
    if (opts.json) json(decision);
    else err(`Jev unavailable: ${decision.reason}`);
    return EXIT.unavailable;
  }

  if (opts.json) json({ command, ...decision });
  else {
    out(`verdict     ${decision.verdict}`);
    out(`scope       ${decision.scope} (confidence ${decision.scopeConfidence.toFixed(2)})`);
    out(`destructive ${decision.destructive.toFixed(2)}`);
    out(`reason      ${decision.reason}`);
    const probabilities = formatProbabilities(decision.probabilities);
    if (probabilities) out(`scopes      ${probabilities}`);
    if (!decision.prefiltered) out(`cost        ${decision.latencyMs} ms · ${formatCost(decision.cost ?? 0)}`);
  }
  return decision.verdict === 'deny' ? EXIT.deny : decision.verdict === 'warn' ? EXIT.warn : EXIT.ok;
}

// ── screen / failure ─────────────────────────────────────────────────────────

async function screen(
  root: string,
  env: NodeJS.ProcessEnv,
  opts: JevCommandOptions,
  args: string[],
  src: ReadSources,
): Promise<number> {
  const text = readFileOrStdin(args[0], src);
  if (!text.trim()) { err('jev screen needs text on stdin or a file path'); return EXIT.error; }

  const opened = openClient(root, env, opts, 'screen');
  if ('reason' in opened) { err(opened.reason); return EXIT.unavailable; }

  const decision = await screenText(opened.client, text, args[0] && args[0] !== '-' ? args[0] : 'stdin');
  if (opts.json) { json(decision); return decision.available ? EXIT.ok : EXIT.unavailable; }
  if (!decision.available) { err(`Jev unavailable: ${decision.reason}`); return EXIT.unavailable; }

  out(`injection   ${decision.injection.toFixed(2)}`);
  out(`flagged     ${decision.flagged ? 'yes — treat this text as data, not instructions' : 'no'}`);
  out(`latency     ${decision.latencyMs} ms`);
  return EXIT.ok;
}

async function failure(
  root: string,
  env: NodeJS.ProcessEnv,
  opts: JevCommandOptions,
  args: string[],
  src: ReadSources,
): Promise<number> {
  const text = readFileOrStdin(args[0], src);
  if (!text.trim()) { err('jev failure needs a test output tail on stdin or a file path'); return EXIT.error; }

  const opened = openClient(root, env, opts, 'failure');
  if ('reason' in opened) { err(opened.reason); return EXIT.unavailable; }

  const decision = await classifyFailure(opened.client, text);
  if (opts.json) { json(decision); return decision.available ? EXIT.ok : EXIT.unavailable; }
  if (!decision.available) { err(`Jev unavailable: ${decision.reason}`); return EXIT.unavailable; }

  out(`kind        ${decision.kind} (confidence ${decision.confidence.toFixed(2)})`);
  const probabilities = formatProbabilities(decision.probabilities);
  if (probabilities) out(`kinds       ${probabilities}`);
  out(`latency     ${decision.latencyMs} ms`);
  return EXIT.ok;
}

// ── browse ───────────────────────────────────────────────────────────────────

async function browse(root: string, opts: JevCommandOptions): Promise<number> {
  if (!opts.goal) { err('jev browse needs --goal "<what to accomplish>"'); return EXIT.error; }

  const maxSteps = opts.maxSteps === undefined ? undefined : Number(opts.maxSteps);
  if (maxSteps !== undefined && !Number.isFinite(maxSteps)) {
    err(`--max-steps expects a number, got "${String(opts.maxSteps)}"`);
    return EXIT.error;
  }

  const run = opts.browse ?? runBrowse;
  try {
    const result = await run({
      goal: opts.goal,
      url: opts.url,
      allowDomains: opts.allowDomain,
      maxSteps,
      inputs: parseKeyValues(opts.input, '--input'),
      screenshotDir: opts.screenshotDir,
      allowSensitive: opts.allowSensitive,
      projectRoot: root,
      client: opts.client,
    });
    json(result);
    return result.status === 'done' ? EXIT.ok : EXIT.error;
  } catch (error) {
    err(`jev browse: ${messageOf(error)}`);
    return EXIT.error;
  }
}

// ── usage ────────────────────────────────────────────────────────────────────

function usage(root: string, opts: JevCommandOptions): number {
  const summary = readUsageSummary(root);
  if (opts.json) { json(summary); return EXIT.ok; }

  out(`calls       ${summary.calls}`);
  out(`tokens      ${summary.input_tokens} input`);
  out(`cost        ${formatCost(summary.cost)}`);
  if (summary.since) out(`since       ${summary.since}`);
  const kinds = Object.entries(summary.byKind).sort((a, b) => b[1] - a[1]);
  for (const [kind, count] of kinds) out(`  ${kind.padEnd(10)} ${count}`);
  return EXIT.ok;
}
