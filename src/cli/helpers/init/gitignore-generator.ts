/**
 * SpecWeave's own `.gitignore` lines, written by `specweave init` and
 * `specweave update` (`ensureSpecweaveGitignoreEntries`). Init writes no other
 * rules (1407).
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';

/** The lines SpecWeave owns in a project's `.gitignore` (1407: init and update write only these). */
const SPECWEAVE_ENTRIES: string[] = [
  '# SpecWeave',
  '.specweave/cache/',
  '.specweave/increments/*/logs/',
  '.specweave/increments/*/test-results/',
  '.specweave/docs-site-internal/',
  // Root only: older versions copied plugins there; a project's own src/plugins/ stays tracked.
  '/.claude-plugin/',
  '/plugins/',
  'vskill.lock',
  '# Work handoff (secret-scrubbed, never auto-committed)',
  '.handoff/',
  '.specweave/state/handoff-latest.*',
  '# Runtime state (machine-local, regenerated)',
  '.specweave/state/',
  '.specweave/logs/',
  '.specweave/backups/',
  '.specweave/jobs/',
  '/.specweave.backup-*/',
  '# Binary evidence and agent worktrees (never committed)',
  '.specweave/increments/**/reports/artifacts/',
  '.claude/worktrees/',
  '.worktrees/',
  '# Binary evidence in increment reports/ (videos, screenshots)',
  '**/.specweave/**/reports/*.mp4',
  '**/.specweave/**/reports/*.png',
  '**/.specweave/**/reports/*.jpg',
];

/**
 * Lines an earlier `specweave update` wrote that it now removes again. Both
 * negations un-ignored old logs by the hundred; task evidence is `.txt` now.
 */
const DROPPED_SPECWEAVE_LINES = new Set([
  '!.specweave/increments/**/reports/*.log',
  '!.specweave/increments/**/reports/task-T-*.log',
  '# `task done --run` writes its evidence to reports/task-<id>.log and the',
  '# ledger cites it, so that log is committed; every other *.log stays ignored.',
  '# reports/ holds COMMITTED evidence: the generic `*.log` rule above would',
  '# swallow the task evidence log a ledger `done` event cites, so a teammate',
  '# cloning the repo could not read it. Only reports/artifacts/ is ignored.',
])

const UPDATE_HEADER = '# SpecWeave (added by specweave update)';

/** Older, wider forms of a current rule: a file that has one needs nothing added. */
const LEGACY_FORMS: Record<string, string> = {
  '/.claude-plugin/': '.claude-plugin/',
  '/plugins/': 'plugins/',
  '**/.specweave/**/reports/*.mp4': '**/reports/*.mp4',
  '**/.specweave/**/reports/*.png': '**/reports/*.png',
  '**/.specweave/**/reports/*.jpg': '**/reports/*.jpg',
};

/**
 * Drop an update header whose block (up to the next blank line) has no rule
 * left in it, together with the blank line written above it. Happens when
 * every line under it was one of the dropped negations.
 */
function dropOrphanUpdateHeaders(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === UPDATE_HEADER) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('#')) j++;
      if (j >= lines.length || lines[j].trim() === '') {
        if (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
        i = j - 1;
        continue;
      }
    }
    out.push(lines[i]);
  }
  return out;
}

/**
 * Append the SpecWeave runtime-state entries (`.specweave/state/`, logs, jobs,
 * cache, backups, `reports/artifacts/`, `.claude/worktrees/`) to an existing
 * `.gitignore`, skipping every line that is already there.
 *
 * Used by `specweave update` so upgraded projects get the 2.0 hygiene rules
 * without regenerating their whole .gitignore. Idempotent; creates the file
 * when it is missing.
 */
export function ensureSpecweaveGitignoreEntries(
  targetDir: string,
  header: string = UPDATE_HEADER,
): { added: string[]; path: string } {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const wanted = SPECWEAVE_ENTRIES;
  let existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';

  // 3.0.0 to 3.0.2 appended negations that un-ignored old logs under
  // reports/ (hundreds in a long-lived project). Take them back out.
  const withoutNegation = dropOrphanUpdateHeaders(
    existing.split('\n').filter((line) => !DROPPED_SPECWEAVE_LINES.has(line.trim())),
  ).join('\n');
  if (withoutNegation !== existing) {
    existing = withoutNegation;
    fs.writeFileSync(gitignorePath, existing);
  }
  const present = new Set(existing.split('\n').map((l) => l.trim()).filter(Boolean));

  const missing = wanted.filter((line) => {
    const rule = line.trim();
    if (rule.startsWith('#')) return false;
    return !present.has(rule) && !(LEGACY_FORMS[rule] && present.has(LEGACY_FORMS[rule]));
  });
  if (missing.length === 0) return { added: [], path: gitignorePath };

  const prefix = existing && !existing.endsWith('\n') ? '\n' : '';
  const block = `${header}\n${missing.join('\n')}\n`;
  fs.writeFileSync(gitignorePath, existing ? `${existing}${prefix}\n${block}` : block);
  return { added: missing, path: gitignorePath };
}
