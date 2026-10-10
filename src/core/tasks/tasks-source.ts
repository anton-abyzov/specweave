/**
 * Where an increment's task definitions live.
 *
 * 3.0 increments keep everything in one file: `spec.md` with a `## Tasks`
 * section of `### T-01 Title` headings. Increments created before 3.0 keep a
 * separate `tasks.md`, which stays authoritative when it exists.
 *
 * @module core/tasks/tasks-source
 */

import * as fs from 'fs';
import * as path from 'path';

/** Path of the file that holds this increment's task definitions. */
export function tasksFileFor(incrementDir: string): string {
  const legacy = path.join(incrementDir, 'tasks.md');
  return fs.existsSync(legacy) ? legacy : path.join(incrementDir, 'spec.md');
}

/** True when the increment has any file that can hold task definitions. */
export function hasTasksFile(incrementDir: string): boolean {
  return fs.existsSync(path.join(incrementDir, 'tasks.md')) || fs.existsSync(path.join(incrementDir, 'spec.md'));
}

/** Repo-relative-friendly name of the task file (`tasks.md` or `spec.md`). */
export function tasksFileName(incrementDir: string): string {
  return path.basename(tasksFileFor(incrementDir));
}
