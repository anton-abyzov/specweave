/**
 * Canonical SpecWeave 2.0 increment-folder layout.
 *
 * SINGLE SOURCE OF TRUTH for "what is allowed at an increment root".
 * Every consumer (the git pre-commit hook `specweave init` installs, the
 * `specweave doctor` project-structure checker, and the increment structure
 * validator) MUST derive its allow-list from here — historically each kept its
 * own copy, which is how the 1.x "only 4 files" rule survived into 2.0 and
 * started rejecting `ledger.jsonl`/`handoff.md`, the artifacts the 2.0 CLI
 * itself writes to the increment root.
 */

/**
 * Files the CLI (or the user, by design) keeps at `.specweave/increments/NNNN-slug/`.
 *
 * - metadata.json  — required, increment state
 * - spec.md        — required, numbered ACs = definition of done
 * - plan.md        — optional design notes
 * - tasks.md       — required, Given/When/Then per task
 * - rubric.md      — AC-tied quality contract (written by the rubric generator)
 * - ledger.jsonl   — append-only claim/done ledger (written by `specweave task`)
 * - handoff.md     — cross-tool hand-off doc (written by `specweave handoff`)
 * - handoff.diff   — uncommitted-work snapshot peered with handoff.md
 * - README.md      — optional human entry point
 */
export const INCREMENT_ROOT_FILES = [
  'metadata.json',
  'spec.md',
  'plan.md',
  'tasks.md',
  'rubric.md',
  'ledger.jsonl',
  'handoff.md',
  'handoff.diff',
  'README.md',
] as const;

/** Subfolders an increment may carry. Everything that is not a root file goes here. */
export const INCREMENT_SUBFOLDERS = [
  'reports',
  'logs',
  'scripts',
  'backups',
  'diagrams',
] as const;

export type IncrementRootFile = (typeof INCREMENT_ROOT_FILES)[number];
export type IncrementSubfolder = (typeof INCREMENT_SUBFOLDERS)[number];

/** True when `name` is a recognised increment-root artifact (file or subfolder). */
export function isAllowedIncrementRootEntry(name: string): boolean {
  return (
    (INCREMENT_ROOT_FILES as readonly string[]).includes(name) ||
    (INCREMENT_SUBFOLDERS as readonly string[]).includes(name)
  );
}

/**
 * Shell `case` pattern for the allowed root files, e.g.
 * `metadata.json|spec.md|…`. Used to generate the pre-commit hook so the hook
 * can never drift from this list.
 */
export function incrementRootFilesShellPattern(): string {
  return INCREMENT_ROOT_FILES.join('|');
}
