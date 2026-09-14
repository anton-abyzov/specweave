import * as fs from 'fs';
import path from 'node:path';
import { loadTaskBoard, type TaskBoard, type BoardTask } from '../../../core/tasks/task-board.js';

/** Legacy checklist compatibility shared by all dashboard views; ledger state always wins. */
export function loadDashboardTaskBoard(incrementDir: string, legacyContent?: string): TaskBoard {
  const board = loadTaskBoard(incrementDir);
  if (board.tasks.length || board.fold.tasks.size || fs.existsSync(path.join(incrementDir, 'ledger.jsonl')))
    return board;
  let content = legacyContent;
  if (content === undefined) {
    try { content = fs.readFileSync(path.join(incrementDir, 'tasks.md'), 'utf8'); }
    catch { return board; }
  }
  const tasks = new Map<string, BoardTask>();
  let current: BoardTask | undefined;
  const setDone = (task: BoardTask, done: boolean) => {
    task.status = done ? 'completed' : 'pending';
    task.state = done
      ? { status: 'done', by: 'tasks.md', evidence: 'checkbox in tasks.md' }
      : { status: 'open' };
  };
  for (const line of content.split(/\r?\n/)) {
    const heading = line.match(/^#{2,}\s+(T-\d+[a-z]?)\b\s*:?\s*(.*)/i);
    const checklist = line.match(/^- \[([x ])\]\s+(T-\d+[a-z]?)\b\s*:?\s*(.*)/i);
    if (heading || checklist) {
      const id = (heading?.[1] ?? checklist![2]).toUpperCase();
      const task = tasks.get(id) ?? {
        id, title: heading?.[2] ?? checklist![3], status: 'pending',
        state: { status: 'open' }, source: 'tasks.md',
      } satisfies BoardTask;
      if (checklist) setDone(task, checklist[1].toLowerCase() === 'x');
      tasks.set(id, task);
      current = heading ? task : undefined;
    } else if (current) {
      const status = line.match(/\*\*Status\*\*:\s*\[([x ])\]/i);
      if (status) setDone(current, status[1].toLowerCase() === 'x');
      else if (/^#{1,6}\s/.test(line)) current = undefined;
    }
  }
  const values = [...tasks.values()];
  const done = values.filter((task) => task.state.status === 'done').length;
  return {
    ...board,
    tasks: values,
    counts: { ...board.counts, total: values.length, done, open: values.length - done },
  };
}
