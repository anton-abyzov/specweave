/**
 * The canonical task-id grammar, shared by every parser that reads tasks.md.
 *
 * It lives in its own dependency-free module on purpose: when `task-board` and
 * `task-parser` each carried their own copy they drifted, and tasks whose id
 * only one of them accepted disappeared from `specweave task list` with no
 * warning — under-reporting done AND total.
 *
 * Grammar: `T-` + 2 or more digits + an OPTIONAL single letter suffix.
 *   - `T-01`, `T-001`  — 2.0 / 1.x plain ids
 *   - `T-01E`          — external import marker
 *   - `T-001a`, `T-001b` — 1.x split-task convention (RED/GREEN pairs)
 *
 * @module core/tasks/task-id
 */
/** Task-id grammar as a regex source fragment (no anchors, no groups). */
export const TASK_ID_PATTERN = 'T-\\d{2,}[A-Za-z]?';
/** A whole task id, anchored. */
export const TASK_ID_RE = new RegExp(`^${TASK_ID_PATTERN}$`);
/** `### T-01 Title` (2.0) / `### T-001: Title` (1.x), including letter suffixes. */
export const TASK_HEADER_RE = new RegExp(`^###\\s+(${TASK_ID_PATTERN}):?\\s+(.+)$`);
/** Any `### T-…` heading — used to spot headings the grammar cannot parse. */
export const TASK_HEADER_LOOSE_RE = /^###\s+T-\S*/;
//# sourceMappingURL=task-id.js.map