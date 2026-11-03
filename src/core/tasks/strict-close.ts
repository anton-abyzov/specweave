import * as fs from 'fs';
import * as path from 'path';
import type { TaskBoard } from './task-board.js';

export interface ScopedCheck {
  cmd: string;
  cwd: string;
  source: string;
}

export function readStrictClose(root: string): { ownerCommands?: Record<string, string[]> } | undefined {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(path.join(root, '.specweave', 'config.json'), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw new Error('Cannot read .specweave/config.json; fix the configuration before verifying or closing');
  }
  if (config.testing?.strictClose !== true) return undefined;
  const commands = config.testing.commands;
  if (commands !== undefined && (!Array.isArray(commands) || commands.some((cmd) => typeof cmd !== 'string' || !cmd.trim()))) {
    throw new Error('testing.commands must contain nonblank strings');
  }
  return { ownerCommands: config.testing.ownerCommands };
}

/** The umbrella convention is repositories/<organization>/<repository>. */
export function resolveOwnerChecks(root: string, board: TaskBoard, config: NonNullable<ReturnType<typeof readStrictClose>>) {
  const owners = new Set<string>();
  const errors = [...board.warnings];
  const checks: ScopedCheck[] = [];
  for (const task of board.tasks) {
    for (const file of task.filesAffected ?? []) {
      const normalized = path.posix.normalize(file.replace(/\\/g, '/'));
      if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(file) || normalized.startsWith('../') || normalized === '..') {
        errors.push(`${task.id}: declare a project-relative Files path: ${file}`);
        continue;
      }
      if (!normalized.startsWith('repositories/')) continue;
      const parts = normalized.split('/');
      if (parts.length < 3 || !parts[2] || /[*?\[\]{}]/.test(parts.slice(1, 3).join('/'))) {
        errors.push(`${task.id}: declare the owning repository explicitly in Files: ${file}`);
        continue;
      }
      owners.add(parts.slice(0, 3).join('/'));
    }
  }
  for (const cwd of [...owners].sort()) {
    const commands = config.ownerCommands && Object.prototype.hasOwnProperty.call(config.ownerCommands, cwd) ? config.ownerCommands[cwd] : undefined;
    if (!Array.isArray(commands) || !commands.length || commands.some((cmd) => typeof cmd !== 'string' || !cmd.trim())) {
      errors.push(`No testing.ownerCommands configured for ${cwd}`);
      continue;
    }
    try {
      if (!fs.statSync(path.join(root, cwd)).isDirectory()) throw new Error();
    } catch {
      errors.push(`Owning repository directory is unavailable: ${cwd}`);
      continue;
    }
    checks.push(...commands.map((cmd) => ({ cmd, cwd, source: 'config testing.ownerCommands' })));
  }
  return { checks, errors };
}
