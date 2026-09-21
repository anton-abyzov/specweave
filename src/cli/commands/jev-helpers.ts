/**
 * `specweave jev` — the local-environment half of the command.
 *
 * Argument parsing, the shipped-skill roster, `.specweave/config.json` writes, the
 * shared exit codes and printers, and the two environment subcommands (`doctor`,
 * `setup`). `jev.ts` keeps the dispatcher and the decision subcommands.
 *
 * Nothing here ever reads, prints or stores an API key VALUE — only env var NAMES.
 *
 * @module cli/commands/jev-helpers
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  JEV_FALLBACK_KEY_ENV,
  JEV_PROVIDER_KEY_ENV,
  JEV_PROVIDER_MODEL,
  JevClient,
  jevEndpoint,
  loadJevConfig,
  readUsageSummary,
  resolveApiKey,
  runBrowse,
  type JevConfig,
  type JevProvider,
  type Json,
  type Question,
} from '../../core/jev/index.js';

/** Exit codes shared by every `specweave jev` subcommand (documented in the skill). */
export const EXIT = {
  ok: 0,
  error: 1,
  warn: 2,
  deny: 3,
  /** Jev is disabled or has no key — agents treat this as "continue without Jev". */
  unavailable: 4,
} as const;

/** Where the opt-in PreToolUse Bash guard marker lives. */
export function guardMarkerPath(projectRoot: string): string {
  return path.join(projectRoot, '.specweave', 'state', 'jev-guard.enabled');
}

/** Create or remove the Bash guard marker. Returns true when the marker exists after the call. */
export function setGuardMarker(projectRoot: string, on: boolean): boolean {
  const marker = guardMarkerPath(projectRoot);
  try {
    if (on) {
      fs.mkdirSync(path.dirname(marker), { recursive: true });
      fs.writeFileSync(marker, 'Jev Bash guard enabled by `specweave jev setup`.\n', 'utf-8');
      return true;
    }
    if (fs.existsSync(marker)) fs.rmSync(marker);
    return false;
  } catch {
    return fs.existsSync(marker);
  }
}

/**
 * Merge a patch into the `jev` section of `.specweave/config.json`, keeping every
 * other key (and every other jev key) untouched. Returns the config path written.
 */
export function mergeJevConfig(projectRoot: string, patch: Record<string, unknown>): string {
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  let config: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      const parsed: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        config = parsed as Record<string, unknown>;
      }
    }
  } catch {
    // A malformed config is replaced rather than crashing setup; the jev section is
    // the only thing we own, and the user gets a fresh, valid file.
    config = {};
  }

  const current = config.jev && typeof config.jev === 'object' && !Array.isArray(config.jev)
    ? { ...(config.jev as Record<string, unknown>) }
    : {};

  for (const [key, value] of Object.entries(patch)) {
    const existing = current[key];
    if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      existing && typeof existing === 'object' && !Array.isArray(existing)
    ) {
      current[key] = { ...(existing as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      current[key] = value;
    }
  }
  config.jev = current;

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  return configPath;
}

/** The installed specweave package root (walks up from this module). */
export function packageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')) as { name?: string };
      if (pkg.name === 'specweave') return dir;
    } catch {
      // keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
}

// ── project-level PreToolUse hook (.claude/settings.json) ────────────────────

/**
 * Why this lives in the PROJECT's settings.json and not in the plugin manifest:
 * SpecWeave 2.1 deliberately ships only SessionStart and Stop as default hooks
 * ("retire intrusive hooks"). A PreToolUse entry in `plugins/specweave/hooks/
 * hooks.json` would put a guard in front of every Bash command for everyone who
 * installs the plugin, which is exactly the decision 2.1 reversed. The Jev Bash
 * guard is opt-in per project, so `specweave jev setup --guard-bash` registers it
 * where opting in belongs: `<projectRoot>/.claude/settings.json`.
 */
const HOOK_REL = path.join('plugins', 'specweave', 'hooks', 'run.mjs');
const HOOK_EVENT = 'pre-tool-use';
const HOOK_MATCHER = 'Bash';
/** Seconds, matching the launcher's own PreToolUse budget. */
const HOOK_TIMEOUT = 10;

interface HookCommand { type?: string; command?: string; timeout?: number }
interface HookGroup { matcher?: string; hooks?: HookCommand[] }

export interface ProjectHookState {
  /** Absolute path of `<projectRoot>/.claude/settings.json` (whether or not it exists). */
  path: string;
  present: boolean;
  /** Set when the settings file could not be read or written; it was left untouched. */
  error?: string;
}

/** `<projectRoot>/.claude/settings.json`. */
export function projectSettingsPath(projectRoot: string): string {
  return path.join(projectRoot, '.claude', 'settings.json');
}

/**
 * The exact command the hook entry runs.
 *
 * Absolute, because `CLAUDE_PLUGIN_ROOT` is NOT set for hooks declared in
 * settings.json — `${CLAUDE_PLUGIN_ROOT}` would expand to nothing. `run.mjs`
 * resolves its own plugin root from `import.meta.url`, so an absolute path is
 * all it needs.
 */
export function jevHookCommand(root: string = packageRoot()): string {
  return `node "${path.join(root, HOOK_REL)}" ${HOOK_EVENT}`;
}

/** One hook entry, exactly as written into settings.json. */
function jevHookEntry(root: string): HookCommand {
  return { type: 'command', command: jevHookCommand(root), timeout: HOOK_TIMEOUT };
}

/**
 * Ours? Matched on the launcher path + event rather than on the whole string, so
 * an entry written by an older install (different package path, Windows
 * separators) is still recognised — and therefore updated instead of duplicated.
 */
function isJevHookCommand(command: unknown): boolean {
  if (typeof command !== 'string') return false;
  return /hooks\/run\.mjs"?\s+pre-tool-use(\s|$)/.test(command.replace(/\\/g, '/'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function preToolUseGroups(settings: Record<string, unknown>): HookGroup[] {
  const hooks = isRecord(settings.hooks) ? settings.hooks : {};
  return Array.isArray(hooks.PreToolUse) ? (hooks.PreToolUse as HookGroup[]) : [];
}

/** Parse settings.json, or explain why it must be left alone. */
function readSettings(file: string): { settings: Record<string, unknown>; existed: boolean } | { error: string } {
  try {
    if (!fs.existsSync(file)) return { settings: {}, existed: false };
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!isRecord(parsed)) return { error: `${file} is not a JSON object` };
    return { settings: parsed, existed: true };
  } catch (error) {
    return { error: `${file} could not be read: ${messageOf(error)}` };
  }
}

/** Is the Jev PreToolUse hook registered for this project right now? */
export function readProjectHook(projectRoot: string): ProjectHookState {
  const file = projectSettingsPath(projectRoot);
  const read = readSettings(file);
  if ('error' in read) return { path: file, present: false, error: read.error };
  const present = preToolUseGroups(read.settings).some((group) =>
    (group?.hooks ?? []).some((hook) => isJevHookCommand(hook?.command)),
  );
  return { path: file, present };
}

/**
 * Register or remove the Jev Bash guard in `<projectRoot>/.claude/settings.json`.
 *
 * Idempotent: an entry already pointing at a `hooks/run.mjs pre-tool-use` is
 * rewritten in place (so a moved or reinstalled package updates rather than
 * duplicates) and never reordered. Removal takes out exactly our entries — other
 * PreToolUse groups survive — and then deletes the empty array and keys it left
 * behind. Every other key in the file is preserved byte-for-byte through the
 * JSON round trip.
 *
 * A settings.json that is missing or malformed is never overwritten blind: a
 * malformed file comes back as `{ error }` and is left exactly as it was.
 */
export function setProjectHook(
  projectRoot: string,
  on: boolean,
  packageDir: string = packageRoot(),
): ProjectHookState {
  const file = projectSettingsPath(projectRoot);
  const read = readSettings(file);
  if ('error' in read) return { path: file, present: false, error: read.error };

  const { settings, existed } = read;
  if (!on && !existed) return { path: file, present: false };

  const hooks: Record<string, unknown> = isRecord(settings.hooks) ? { ...settings.hooks } : {};
  const groups: HookGroup[] = preToolUseGroups(settings).map((group) =>
    isRecord(group) ? { ...(group as Record<string, unknown>) } as HookGroup : group,
  );

  let changed = false;
  let placed = false;
  const next: HookGroup[] = [];

  for (const group of groups) {
    const entries = Array.isArray(group?.hooks) ? group.hooks : [];
    const mine = entries.some((hook) => isJevHookCommand(hook?.command));
    if (!mine) {
      next.push(group);
      continue;
    }
    changed = true;
    if (on && !placed) {
      // Refresh in place — the package may have moved since it was written.
      placed = true;
      next.push({
        ...group,
        matcher: HOOK_MATCHER,
        hooks: entries.map((hook) => (isJevHookCommand(hook?.command) ? jevHookEntry(packageDir) : hook)),
      });
      continue;
    }
    const kept = entries.filter((hook) => !isJevHookCommand(hook?.command));
    if (kept.length > 0) next.push({ ...group, hooks: kept });
  }

  if (on && !placed) {
    next.push({ matcher: HOOK_MATCHER, hooks: [jevHookEntry(packageDir)] });
    changed = true;
  }

  if (next.length > 0) hooks.PreToolUse = next;
  else delete hooks.PreToolUse;

  if (Object.keys(hooks).length > 0) settings.hooks = hooks;
  else delete settings.hooks;

  if (!changed && existed) return { path: file, present: on };

  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  } catch (error) {
    return { path: file, present: false, error: `${file} could not be written: ${messageOf(error)}` };
  }
  return { path: file, present: on };
}

export interface SkillEntry {
  name: string;
  description: string;
}

/**
 * Roster used when the shipped `plugins/specweave/skills/` tree cannot be read
 * (global install layouts differ). Keeps `jev route` useful everywhere.
 */
export const FALLBACK_SKILLS: readonly SkillEntry[] = [
  { name: 'increment', description: 'Plan a unit of work as a SpecWeave increment: spec.md with Problem, Scope, numbered ACs and an Approach, plus tasks.md.' },
  { name: 'do', description: 'Work an increment task by task through the ledger: task next, claim, implement, commit, task done with evidence.' },
  { name: 'done', description: 'Close an increment after a green verify, or with an explicit reason.' },
  { name: 'review', description: 'Review an increment in fresh context before closing; findings cite path:line and are re-verified.' },
  { name: 'qa', description: 'Risk-scored quality assessment of an increment.' },
  { name: 'brainstorm', description: 'Expand the solution space before committing: framed options compared on stated criteria, ending in a pick.' },
  { name: 'handoff', description: 'Write a portable, secret-scrubbed work-handoff doc so another tool or agent can resume.' },
  { name: 'sync', description: 'Sync increments with external trackers (GitHub, JIRA, Azure DevOps).' },
  { name: 'team', description: 'Run a multi-agent team over one increment: fan out tasks, then close centrally.' },
  { name: 'auto', description: 'Run the increment loop autonomously until the tasks are done.' },
  { name: 'jev', description: 'Delegate a closed-set decision to Jev (TypeSafe System One): routing, guard verdicts, AC judgements, browser steps.' },
];

/** First line of the frontmatter `description:` in a SKILL.md, or ''. */
function frontmatterDescription(file: string): string {
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch {
    return '';
  }
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return '';
  const line = match[1].split(/\r?\n/).find((l) => /^description\s*:/i.test(l));
  if (!line) return '';
  return line
    .replace(/^description\s*:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim()
    .slice(0, 400);
}

/**
 * Shipped skill names + their frontmatter descriptions, for the SKILL_ROUTE question.
 * Falls back to {@link FALLBACK_SKILLS} when the plugin tree is unreadable.
 */
export function skillRoster(root: string = packageRoot()): SkillEntry[] {
  const dir = path.join(root, 'plugins', 'specweave', 'skills');
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [...FALLBACK_SKILLS];
  }

  const skills: SkillEntry[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(dir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const description = frontmatterDescription(skillFile);
    skills.push({ name: entry.name, description: description || `The ${entry.name} SpecWeave workflow step.` });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills.length >= 2 ? skills : [...FALLBACK_SKILLS];
}

export interface ReadSources {
  cwd: string;
  /** Injected stdin (tests); when absent stdin is read from fd 0. */
  stdin?: string;
}

/** Read stdin synchronously. Returns '' when there is nothing to read. */
export function readStdin(src: ReadSources): string {
  if (src.stdin !== undefined) return src.stdin;
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Resolve a `--state` / `--questions` style argument:
 * `-` → stdin, `@path` → file contents, anything else → the literal value.
 */
export function readArgValue(value: string | undefined, src: ReadSources): string | undefined {
  if (value === undefined) return undefined;
  if (value === '-') return readStdin(src);
  if (value.startsWith('@')) {
    return fs.readFileSync(path.resolve(src.cwd, value.slice(1)), 'utf-8');
  }
  return value;
}

/** Resolve a `[file|-]` positional: missing or `-` → stdin, otherwise the file. */
export function readFileOrStdin(value: string | undefined, src: ReadSources): string {
  if (!value || value === '-') return readStdin(src);
  const file = value.startsWith('@') ? value.slice(1) : value;
  return fs.readFileSync(path.resolve(src.cwd, file), 'utf-8');
}

/** JSON when the text parses as JSON, the plain string otherwise. */
export function parseJsonOrText(text: string): Json {
  const trimmed = text.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed) as Json;
  } catch {
    return text;
  }
}

/** Parse a `--questions` payload into the client's question map. */
export function parseQuestions(text: string): Record<string, Question> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`--questions is not valid JSON: ${(error as Error).message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('--questions must be a JSON object keyed by question id');
  }
  return parsed as Record<string, Question>;
}

/** Split repeatable `key=value` flags (`--option`, `--input`) into a record. */
export function parseKeyValues(list: string[] | undefined, flag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of list ?? []) {
    const eq = raw.indexOf('=');
    if (eq <= 0) throw new Error(`${flag} expects "key=value", got "${raw}"`);
    out[raw.slice(0, eq).trim()] = raw.slice(eq + 1);
  }
  return out;
}

/**
 * Build questions from the `--choice` / `--option` / `--noul` shorthands.
 * Returns an empty map when no shorthand was used.
 */
export function shorthandQuestions(opts: {
  choice?: string;
  option?: string[];
  noul?: string;
}): Record<string, Question> {
  const questions: Record<string, Question> = {};
  if (opts.choice) {
    const criteria = parseKeyValues(opts.option, '--option');
    if (Object.keys(criteria).length < 2) {
      throw new Error('--choice needs at least two --option key=description flags');
    }
    questions.CHOICE = { type: 'choice', instructions: opts.choice, criteria };
  }
  if (opts.noul) {
    questions.NOUL = { type: 'noul', instructions: opts.noul };
  }
  return questions;
}

/** Body of a `## <heading>` section of a markdown doc, up to the next `## `. */
export function extractSection(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${heading}\\b`, 'i').test(l));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s+/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

/** `0.0000155` → `$0.0000155`; small enough that toFixed(2) would read as $0.00. */
export function formatCost(cost: number): string {
  if (!Number.isFinite(cost) || cost === 0) return '$0';
  return cost < 0.01 ? `$${cost.toPrecision(3)}` : `$${cost.toFixed(4)}`;
}

/** `{a: 0.91, b: 0.09}` → `a 0.91 · b 0.09`, highest first, top 5. */
export function formatProbabilities(probabilities: Record<string, number>): string {
  const pairs = Object.entries(probabilities ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k} ${v.toFixed(2)}`);
  return pairs.join(' · ');
}

// ── shared command plumbing ────────────────────────────────────────

export interface JevCommandOptions {
  json?: boolean;
  // setup
  provider?: string;
  model?: string;
  guardBash?: boolean;
  disable?: boolean;
  // ask
  state?: string;
  questions?: string;
  choice?: string;
  option?: string[];
  noul?: string;
  // task
  increment?: string;
  // browse
  goal?: string;
  url?: string;
  allowDomain?: string[];
  input?: string[];
  maxSteps?: string | number;
  screenshotDir?: string;
  allowSensitive?: boolean;
  // injection points (tests only — never set by the CLI)
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  fetch?: typeof fetch;
  client?: JevClient;
  stdin?: string;
  browse?: typeof runBrowse;
}

export const out = (s: string): void => { process.stdout.write(s + '\n'); };
export const err = (s: string): void => { process.stderr.write(s + '\n'); };
export const json = (value: unknown): void => { out(JSON.stringify(value, null, 2)); };

export function messageOf(error: unknown): string {
  return (error as { message?: string } | null)?.message ?? String(error);
}


// ── doctor ───────────────────────────────────────────────────────────────────

export async function jevDoctor(root: string, env: NodeJS.ProcessEnv, opts: JevCommandOptions): Promise<number> {
  const cfg = loadJevConfig(root, env);
  const key = resolveApiKey(cfg, env);
  const marker = guardMarkerPath(root);
  const markerPresent = fs.existsSync(marker);
  const projectHook = readProjectHook(root);
  const summary = readUsageSummary(root);

  let ping: { ok: boolean; latencyMs: number; model?: string; error?: string } | undefined;
  if (cfg.enabled && key) {
    const client = opts.client ?? new JevClient(cfg, {
      apiKey: key.key,
      projectRoot: root,
      fetch: opts.fetch,
      usageLog: false,
      kind: 'doctor',
    });
    ping = await client.ping();
  }

  const unavailable = !cfg.enabled || !key;
  const code = unavailable ? EXIT.unavailable : ping && !ping.ok ? EXIT.error : EXIT.ok;

  if (opts.json) {
    json({
      projectRoot: root,
      enabled: cfg.enabled,
      provider: cfg.provider,
      endpoint: jevEndpoint(cfg),
      model: cfg.model,
      keySource: key?.source ?? null,
      keyPresent: !!key,
      guardBash: cfg.guards.bash,
      guardMarker: { path: marker, present: markerPresent },
      projectHook: { path: projectHook.path, present: projectHook.present },
      modelRouting: cfg.modelRouting,
      thresholds: cfg.thresholds,
      timeoutMs: cfg.timeoutMs,
      ping: ping ?? null,
      usage: summary,
      exitCode: code,
    });
    return code;
  }

  out('Jev (TypeSafe System One)');
  out(`  enabled     ${cfg.enabled ? 'yes' : 'no'}`);
  out(`  provider    ${cfg.provider}`);
  out(`  endpoint    ${jevEndpoint(cfg)}`);
  out(`  model       ${cfg.model}`);
  out(key
    ? `  key         found in ${key.source}`
    : `  key         NOT FOUND (tried ${[cfg.apiKeyEnv, JEV_PROVIDER_KEY_ENV[cfg.provider], JEV_FALLBACK_KEY_ENV].filter(Boolean).join(', ')})`);
  out(`  bash guard  ${cfg.guards.bash ? 'on' : 'off'} (marker ${markerPresent ? 'present' : 'absent'}: ${marker})`);
  out(`  project hook ${projectHook.present ? 'registered' : 'not registered'}: ${projectHook.path}`);
  out(`  timeout     ${cfg.timeoutMs} ms · thresholds route ${cfg.thresholds.route} / warn ${cfg.thresholds.guardWarn} / deny ${cfg.thresholds.guardDeny}`);
  if (ping) {
    out(ping.ok
      ? `  ping        ok ${ping.latencyMs} ms (${ping.model ?? cfg.model})`
      : `  ping        FAILED after ${ping.latencyMs} ms — ${ping.error ?? 'unknown error'}`);
  } else {
    out('  ping        skipped (Jev unavailable)');
  }
  out(`  usage       ${summary.calls} call(s) · ${summary.input_tokens} input tokens · ${formatCost(summary.cost)}`);
  if (unavailable) err('Jev unavailable: run `specweave jev setup` (exit 4 = continue without Jev)');
  return code;
}

// ── setup ────────────────────────────────────────────────────────────────────

export async function jevSetup(root: string, env: NodeJS.ProcessEnv, opts: JevCommandOptions): Promise<number> {
  const cfg = loadJevConfig(root, env);

  if (opts.disable) {
    const configPath = mergeJevConfig(root, { enabled: false, guards: { bash: false } });
    setGuardMarker(root, false);
    const projectHook = setProjectHook(root, false);
    if (opts.json) {
      json({
        enabled: false,
        configPath,
        guardBash: false,
        projectHook: { path: projectHook.path, present: projectHook.present },
      });
    } else {
      out(`Jev disabled in ${configPath} (guard marker and project hook removed).`);
      if (projectHook.error) err(`  note: ${projectHook.error}`);
    }
    return EXIT.ok;
  }

  const requested = opts.provider?.trim().toLowerCase();
  if (requested && requested !== 'openrouter' && requested !== 'typesafe') {
    err(`Unknown provider "${opts.provider}". Use: openrouter | typesafe`);
    return EXIT.error;
  }
  const provider: JevProvider = (requested as JevProvider | undefined) ?? cfg.provider;
  const model = opts.model?.trim()
    ?? (provider === cfg.provider ? cfg.model : JEV_PROVIDER_MODEL[provider]);
  const guardBash = opts.guardBash ?? cfg.guards.bash;

  const candidate: JevConfig = {
    ...cfg,
    enabled: true,
    provider,
    model,
    guards: { bash: guardBash },
  };

  const key = resolveApiKey(candidate, env);
  if (!key) {
    err(`Jev unavailable: no API key — export ${JEV_PROVIDER_KEY_ENV[provider]} (or ${JEV_FALLBACK_KEY_ENV}) and re-run`);
    return EXIT.unavailable;
  }

  const client = opts.client ?? new JevClient(candidate, {
    apiKey: key.key,
    projectRoot: root,
    fetch: opts.fetch,
    usageLog: false,
    kind: 'setup',
  });
  const ping = await client.ping();
  if (!ping.ok) {
    err(`Jev ping failed (${provider}, ${model}): ${ping.error ?? 'unknown error'} — nothing was written`);
    return EXIT.error;
  }

  const configPath = mergeJevConfig(root, {
    enabled: true,
    provider,
    model,
    guards: { bash: guardBash },
  });
  const markerPresent = setGuardMarker(root, guardBash);
  const projectHook = setProjectHook(root, guardBash);

  if (opts.json) {
    json({
      enabled: true,
      provider,
      model,
      keySource: key.source,
      guardBash,
      guardMarker: { path: guardMarkerPath(root), present: markerPresent },
      projectHook: { path: projectHook.path, present: projectHook.present },
      configPath,
      ping,
      next: 'specweave update-instructions',
    });
    return EXIT.ok;
  }

  out(`Jev enabled: ${provider} · ${ping.model ?? model} · key from ${key.source} · ping ${ping.latencyMs} ms`);
  out(`  config      ${configPath}`);
  out(`  bash guard  ${guardBash ? `on (marker ${guardMarkerPath(root)})` : 'off'}`);
  out(`  project hook ${projectHook.present ? 'registered in' : 'removed from'} ${projectHook.path}`);
  if (projectHook.error) err(`  note: ${projectHook.error}`);
  out('Next: specweave update-instructions   # renders the jev section into CLAUDE.md / AGENTS.md');
  return EXIT.ok;
}
