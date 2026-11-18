/**
 * `.specweave/` folders, the committed memory index, `.gitattributes` and the
 * config fill that `specweave init` runs (1407).
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';

/** The committed project memory index `init` creates (see the AGENTS.md template). */
export const MEMORY_INDEX_STUB =
  '# Project memory index\n' +
  'Committed and read by every tool and account: one file per durable fact in this folder, one line per file here (see AGENTS.md).\n';

/**
 * Create the .specweave directory structure: increments/, state/ and the
 * committed memory index. No living-docs scaffold (3.0).
 *
 * @param targetDir - Target directory
 * @param _adapterName - Adapter name (unused, kept for API compatibility)
 * @param _options - Unused, kept for API compatibility
 */
export async function createDirectoryStructure(
  targetDir: string,
  _adapterName: string,
  _options?: { projectName?: string; scanExistingDocs?: boolean }
): Promise<void> {
  // Guard: Prevent creating .specweave inside an existing .specweave/increments/ path
  const resolvedTarget = path.resolve(targetDir);
  const incrementsSegment = path.join('.specweave', 'increments');
  if (resolvedTarget.includes(incrementsSegment)) {
    throw new Error(
      'Cannot initialize SpecWeave inside .specweave/increments/. ' +
      'This would create a nested .specweave folder. ' +
      'Run specweave init from your project root directory.'
    );
  }

  for (const dir of ['.specweave/increments', '.specweave/state', '.specweave/memory']) {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true });
  }
  ensureMemoryIndex(targetDir);
}

/** Create `.specweave/memory/MEMORY.md` unless one exists. */
export function ensureMemoryIndex(targetDir: string): void {
  const index = path.join(targetDir, '.specweave', 'memory', 'MEMORY.md');
  if (fs.existsSync(index)) return;
  fs.mkdirSync(path.dirname(index), { recursive: true });
  fs.writeFileSync(index, MEMORY_INDEX_STUB, 'utf-8');
}

// Required so concurrent agents never lose ledger lines on a merge.
export const LEDGER_MERGE_ATTRIBUTE = '**/ledger.jsonl merge=union';

/**
 * Create `.gitattributes` from the template, or (when the user already has one)
 * append only the lines SpecWeave needs. Idempotent: re-running init never
 * duplicates a line and never clobbers user content.
 */
export function ensureGitattributes(targetDir: string, templatePath: string): void {
  const target = path.join(targetDir, '.gitattributes');
  if (!fs.existsSync(target)) {
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, target);
      return;
    }
    fs.writeFileSync(target, `${LEDGER_MERGE_ATTRIBUTE}\n`, 'utf-8');
    return;
  }
  const existing = fs.readFileSync(target, 'utf-8');
  if (existing.split(/\r?\n/).some((l) => l.trim() === LEDGER_MERGE_ATTRIBUTE)) return;
  const prefix = existing.endsWith('\n') ? '' : '\n';
  fs.writeFileSync(
    target,
    `${existing}${prefix}\n# Append-only task ledger: keep every line from both sides on a merge\n${LEDGER_MERGE_ATTRIBUTE}\n`,
    'utf-8',
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Write `.specweave/config.json` so that it has every default, without
 * replacing anything the project already set: keys in the file win, defaults
 * only fill what is missing (one level deep, so `testing.commands` survives
 * while a missing `testing` block is added). `adapters.default` is the one
 * key set outright, to the tool this run settled on.
 *
 * A file that is not a JSON object is left untouched ('unreadable'): the
 * person's settings may still be recoverable from it.
 */
export function ensureConfigFile(
  targetDir: string,
  projectName: string,
  adapter: string,
): 'created' | 'kept' | 'unreadable' {
  const configPath = path.join(targetDir, '.specweave', 'config.json');
  const defaults = defaultConfig(projectName, adapter);

  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeJsonSync(configPath, defaults, { spaces: 2 });
    return 'created';
  }

  let existing: unknown;
  try {
    existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return 'unreadable';
  }
  if (!isPlainObject(existing)) return 'unreadable';

  const merged = fillMissing(existing, defaults);
  for (const [key, fallback] of Object.entries(defaults)) {
    const current = existing[key];
    if (isPlainObject(fallback) && isPlainObject(current)) {
      merged[key] = fillMissing(current, fallback);
    }
  }
  merged.adapters = { ...(isPlainObject(merged.adapters) ? merged.adapters : {}), default: adapter };

  writeJsonIfChanged(configPath, merged);
  return 'kept';
}

/**
 * `current` with the keys it lacks added from `fallback`. Keys `current` has
 * win and keep their order, so two writers filling the same object never
 * reorder each other's work (which would rewrite an unchanged config).
 */
export function fillMissing(current: object, fallback: object): Record<string, unknown> {
  const out: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(fallback)) {
    if (!(key in out)) out[key] = value;
  }
  return out;
}

/**
 * Write `data` as two-space JSON unless the file already holds exactly that,
 * so a re-run leaves an unchanged file untouched (no mtime churn for watchers).
 */
export function writeJsonIfChanged(filePath: string, data: unknown): boolean {
  const content = JSON.stringify(data, null, 2);
  try {
    if (fs.readFileSync(filePath, 'utf-8') === content) return false;
  } catch {
    // Missing or unreadable: write it.
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

/** The config a new project starts with. */
function defaultConfig(projectName: string, adapter: string): Record<string, unknown> {
  const config: Record<string, unknown> = {
    version: '2.0',
    project: {
      name: projectName,
      version: '0.1.0',
    },
    adapters: {
      default: adapter,
    },
    repository: {
      provider: 'local' as const,
    },
    testing: {
      // `specweave verify` falls back to stack auto-detection while this is empty.
      commands: [],
    },
    // Advisory WIP note only — nothing blocks on it.
    limits: {
      activeIncrements: 3,
    },
    planning: {
      deepInterview: 'critical',
    },
    // Auto mode: only the keys something reads. The Stop hook stops the loop
    // after maxTurns turns or a session older than maxSessionAge seconds;
    // `specweave auto` reads requireTests.
    auto: {
      maxTurns: 20,
      maxSessionAge: 7200,
      requireTests: false,
    },
    // Living docs are opt-in: set to 'onDone' to regenerate them at closure.
    livingDocs: false,
    // LSP configuration — language server integration for code intelligence
    lsp: {
      enabled: true,
    },
  };

  return config;
}
