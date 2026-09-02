/**
 * Instruction file writer - the single path that turns a template into
 * CLAUDE.md / AGENTS.md on disk. Used by `specweave init`, `specweave update`
 * (via update-instructions) and the adapters that ship AGENTS.md.
 *
 * - detects the project's build/test/lint commands for the Commands table
 * - resolves the conditional `umbrella` section from config.workspace.repos
 * - never writes when the merge result is byte-identical
 * - backs up the previous file to .specweave/backups/<file>.<timestamp>.bak
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import {
  mergeInstructionFile,
  parseTemplate,
  getPackageVersion,
  type MergeResult,
  type TemplateType,
} from './instruction-file-merger.js';
import { detectStackCommands, type StackCommands } from './stack-detector.js';
import { scanWorkspaceRepos } from './path-utils.js';

export type InstructionFileName = 'CLAUDE.md' | 'AGENTS.md';

export interface ApplyInstructionOptions {
  projectPath: string;
  templatesDir: string;
  filename: InstructionFileName;
  projectName: string;
  /** Defaults to the installed specweave version. */
  version?: string;
  /** Defaults to stack detection on projectPath. */
  commands?: StackCommands;
  /**
   * Condition flags for `when="…"` template sections. Defaults to
   * `{ umbrella: <config.workspace.repos is non-empty> }` read from
   * `.specweave/config.json`.
   */
  flags?: Record<string, boolean>;
  /** Compute the result without touching the disk. */
  dryRun?: boolean;
  /** Timestamp for the backup filename (tests). */
  now?: Date;
}

export interface ApplyInstructionResult extends Omit<MergeResult, 'action'> {
  action: MergeResult['action'] | 'skipped';
  filePath: string;
  backupPath: string | null;
}

export const TEMPLATE_TYPES: Record<InstructionFileName, TemplateType> = {
  'CLAUDE.md': 'claude',
  'AGENTS.md': 'agents',
};

export const BACKUP_DIR = path.join('.specweave', 'backups');

/** `.specweave/backups/CLAUDE.md.2026-09-02T12-00-00.000Z.bak` (Windows-safe: no colons). */
export function backupFilePath(projectPath: string, filename: string, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/:/g, '-');
  return path.join(projectPath, BACKUP_DIR, `${filename}.${stamp}.bak`);
}

/**
 * Condition flags for the templates' `when="…"` sections.
 *
 * `umbrella` is on when `config.workspace.repos` is non-empty. During `init` the
 * instruction files are written before the workspace section exists, so a config
 * without a `workspace` key falls back to the same `repositories/<org>/<repo>`
 * scan that init uses to build it.
 */
export function detectTemplateFlags(projectPath: string): Record<string, boolean> {
  let workspace: unknown;
  try {
    const raw = fs.readFileSync(path.join(projectPath, '.specweave', 'config.json'), 'utf-8');
    workspace = JSON.parse(raw)?.workspace;
  } catch {
    // no config yet, or unreadable: fall through to the filesystem scan
  }
  const repos = (workspace as { repos?: unknown } | undefined)?.repos;
  if (Array.isArray(repos)) return { umbrella: repos.length > 0 };
  try {
    return { umbrella: scanWorkspaceRepos(projectPath) !== null };
  } catch {
    return { umbrella: false };
  }
}

export function applyInstructionTemplate(opts: ApplyInstructionOptions): ApplyInstructionResult {
  const filePath = path.join(opts.projectPath, opts.filename);
  const templatePath = path.join(opts.templatesDir, `${opts.filename}.template`);
  const empty = { updated: [], added: [], removed: [], preserved: 0, warnings: [], migration: null };

  if (!fs.existsSync(templatePath)) {
    return { ...empty, content: '', action: 'skipped', filePath, backupPath: null };
  }

  const template = parseTemplate(fs.readFileSync(templatePath, 'utf-8'));
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
  const result = mergeInstructionFile(
    existing,
    template,
    TEMPLATE_TYPES[opts.filename],
    opts.version ?? getPackageVersion(),
    opts.projectName,
    {
      commands: opts.commands ?? detectStackCommands(opts.projectPath),
      flags: opts.flags ?? detectTemplateFlags(opts.projectPath),
    }
  );

  let backupPath: string | null = null;
  if (result.action !== 'unchanged' && !opts.dryRun) {
    if (existing !== null) {
      backupPath = backupFilePath(opts.projectPath, opts.filename, opts.now);
      try {
        fs.mkdirpSync(path.dirname(backupPath));
        fs.writeFileSync(backupPath, existing);
      } catch {
        backupPath = null; // non-fatal: the merge itself never loses user content
      }
    }
    fs.writeFileSync(filePath, result.content);
  }

  if (result.migration && backupPath) {
    result.warnings.push(`Previous file backed up to ${path.relative(opts.projectPath, backupPath)}`);
  }

  return { ...result, filePath, backupPath };
}
