/**
 * Claude Code auto-compact window: where a session summarizes itself.
 *
 * Until compaction runs, every turn resends the whole conversation. Most of it
 * is a cache read, which is cheaper but still counts toward plan usage. On
 * 1M-context models Claude Code's own default waits until about 967K tokens,
 * so late turns each carry close to a million. Compacting at 400K keeps them
 * small. Claude Code compacts at the smaller of the setting and the model's
 * window, so 400K changes nothing on 200K models.
 *
 * Claude Code reads `autoCompactWindow` (100000 to 1000000) from each settings
 * file, user < project < local, and `modelSettings.<model>.autoCompactWindow`
 * (where `/autocompact` saves). A file that sets the top-level key replaces the
 * per-model values of the files below it; CLAUDE_CODE_AUTO_COMPACT_WINDOW wins
 * over all of them.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const DEFAULT_AUTO_COMPACT_WINDOW = 400_000;
export const MIN_AUTO_COMPACT_WINDOW = 100_000;
export const MAX_AUTO_COMPACT_WINDOW = 1_000_000;
const ENV_KEY = 'CLAUDE_CODE_AUTO_COMPACT_WINDOW';

type Settings = Record<string, unknown> & {
  autoCompactWindow?: unknown;
  modelSettings?: Record<string, { autoCompactWindow?: unknown } | undefined>;
};

/** `400k`, `400000`, `1M` → tokens; undefined when outside 100K..1M or unreadable. */
export function parseWindow(value: string): number | undefined {
  const m = value.trim().toLowerCase().replace(/[,_]/g, '').match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return undefined;
  const n = Math.round(Number(m[1]) * (m[2] === 'm' ? 1_000_000 : m[2] === 'k' ? 1000 : 1));
  return n >= MIN_AUTO_COMPACT_WINDOW && n <= MAX_AUTO_COMPACT_WINDOW ? n : undefined;
}

function readSettingsFile(file: string): Settings | undefined {
  if (!fs.existsSync(file)) return {};
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Settings : undefined;
  } catch {
    return undefined; // unreadable: leave it alone
  }
}

function writeSettingsFile(file: string, data: Settings): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function validWindow(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isInteger(v) && v >= MIN_AUTO_COMPACT_WINDOW && v <= MAX_AUTO_COMPACT_WINDOW ? v : undefined;
}

export interface SettingsLayer { name: 'user' | 'project' | 'local'; file: string }

/** Claude Code's settings files, lowest precedence first. */
export function settingsLayers(home: string, projectRoot: string): SettingsLayer[] {
  return [
    { name: 'user', file: path.join(home, '.claude', 'settings.json') },
    { name: 'project', file: path.join(projectRoot, '.claude', 'settings.json') },
    { name: 'local', file: path.join(projectRoot, '.claude', 'settings.local.json') },
  ];
}

export interface EffectiveWindow {
  /** Tokens, or undefined when Claude Code picks its own window ("auto"). */
  window?: number;
  /** Where it comes from: a layer name, the env var, or 'auto'. */
  source: SettingsLayer['name'] | 'env' | 'auto';
  /** Per-model values still in force (model → tokens or "auto"). */
  byModel: Record<string, number | 'auto'>;
}

/** What Claude Code would use, following its own merge of settings files. */
export function effectiveWindow(home: string, projectRoot: string, env: NodeJS.ProcessEnv = process.env): EffectiveWindow {
  let result: EffectiveWindow = { source: 'auto', byModel: {} };
  for (const layer of settingsLayers(home, projectRoot)) {
    const s = readSettingsFile(layer.file);
    if (!s) continue;
    const byModel: Record<string, number | 'auto'> = {};
    for (const [model, entry] of Object.entries(s.modelSettings ?? {})) {
      const v = entry?.autoCompactWindow;
      if (v === 'auto') byModel[model] = 'auto';
      else if (validWindow(v) !== undefined) byModel[model] = v as number;
    }
    const top = validWindow(s.autoCompactWindow);
    result = top === undefined
      ? { ...result, byModel: { ...result.byModel, ...byModel } }
      : { window: top, source: layer.name, byModel };
  }
  const fromEnv = env[ENV_KEY] ? parseWindow(env[ENV_KEY]!) : undefined;
  return fromEnv === undefined ? result : { window: fromEnv, source: 'env', byModel: {} };
}

/** Codex's own cap, from ~/.codex/config.toml, if one is set. */
export function codexCompactLimit(home: string): number | undefined {
  try {
    const toml = fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8');
    for (const line of toml.split(/\r?\n/)) {
      if (/^\s*\[/.test(line)) return undefined; // top-level keys come before the first table
      const m = line.match(/^\s*model_auto_compact_token_limit\s*=\s*(\d+)/);
      if (m) return Number(m[1]);
    }
  } catch { /* no Codex config */ }
  return undefined;
}

const fmt = (n: number) => `${Math.round(n / 1000)}K`;

/**
 * Turn the 400K default on in a new project's `.claude/settings.json`, unless
 * that file already says something about the window or cannot be read.
 * Returns the line to print, or undefined when nothing changed.
 */
export function applyProjectDefault(projectRoot: string): string | undefined {
  const file = path.join(projectRoot, '.claude', 'settings.json');
  const s = readSettingsFile(file);
  if (!s || s.autoCompactWindow !== undefined) return undefined;
  writeSettingsFile(file, { ...s, autoCompactWindow: DEFAULT_AUTO_COMPACT_WINDOW });
  return `Claude Code compacts at ${fmt(DEFAULT_AUTO_COMPACT_WINDOW)} tokens in this project (.claude/settings.json); \`specweave autocompact off --project\` undoes it`;
}

export interface AutocompactOptions {
  at?: string;
  project?: boolean;
  home?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export async function autocompactCommand(action = 'status', opts: AutocompactOptions = {}): Promise<number> {
  const home = opts.home ?? os.homedir();
  const cwd = opts.cwd ?? process.cwd();
  const env = opts.env ?? process.env;
  const say = (line: string) => process.stdout.write(line + '\n');
  const target = opts.project ? path.join(cwd, '.claude', 'settings.json') : path.join(home, '.claude', 'settings.json');
  const where = opts.project ? '.claude/settings.json (this project, shared through git)' : target;

  if (action === 'on' || action === 'off') {
    const s = readSettingsFile(target);
    if (!s) { process.stderr.write(`Left ${target} alone: it is not valid JSON.\n`); return 1; }
    if (action === 'on') {
      const window = opts.at === undefined ? DEFAULT_AUTO_COMPACT_WINDOW : parseWindow(opts.at);
      if (window === undefined) { process.stderr.write('--at takes 100k to 1M tokens, for example 400k\n'); return 2; }
      s.autoCompactWindow = window;
      writeSettingsFile(target, s);
      say(`Claude Code now compacts at ${fmt(window)} tokens (${where}).`);
    } else {
      delete s.autoCompactWindow;
      writeSettingsFile(target, s);
      say(`Removed the auto-compact window from ${where}; Claude Code picks its own again.`);
    }
    if (env[ENV_KEY]) say(`${ENV_KEY}=${env[ENV_KEY]} is set in this shell and overrides every settings file.`);
  } else if (action !== 'status') {
    process.stderr.write(`Unknown action "${action}". Use on, off or status.\n`);
    return 2;
  }

  for (const line of autocompactStatus(home, cwd, env)) say(line);
  return 0;
}

/** What `autocompact status` prints. */
export function autocompactStatus(home: string, projectRoot: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const eff = effectiveWindow(home, projectRoot, env);
  const source = eff.source === 'env' ? ENV_KEY
    : eff.source === 'auto' ? '' : settingsLayers(home, projectRoot).find((l) => l.name === eff.source)!.file;
  const lines = [eff.window === undefined
    ? 'Claude Code: picks its own window (about 967K tokens on 1M-context models). `specweave autocompact on` sets 400K.'
    : `Claude Code: compacts at ${fmt(eff.window)} tokens, or the model's window if smaller (from ${source}).`];
  for (const [model, v] of Object.entries(eff.byModel)) {
    lines.push(`  ${model}: ${v === 'auto' ? 'its own window' : `${fmt(v)} tokens`} (saved by /autocompact; replaces the value above for that model)`);
  }
  const codex = codexCompactLimit(home);
  lines.push(codex === undefined
    ? 'Codex: compacts on its own schedule; set model_auto_compact_token_limit in ~/.codex/config.toml to cap it.'
    : `Codex: compacts at ${fmt(codex)} tokens (model_auto_compact_token_limit in ~/.codex/config.toml).`);
  return lines;
}
