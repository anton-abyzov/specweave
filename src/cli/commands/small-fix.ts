/**
 * `specweave small-fix "<why>"` — declare that this session's change is too
 * small to plan, which satisfies the required-increment guard for the session.
 * Every exemption is logged to `.specweave/state/small-fixes.jsonl` so the
 * dashboard can show how much work bypassed planning.
 *
 * @module cli/commands/small-fix
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { detectModel, detectSessionId, getAgentId } from '../../core/tasks/ledger.js';
import { recordWorkSession } from '../../core/tasks/work-session.js';

export const SMALL_FIX_LOG = path.join('.specweave', 'state', 'small-fixes.jsonl');

export interface SmallFixEntry {
  at: string;
  by: string;
  reason: string;
  session?: string;
  model?: string;
}

export function readSmallFixes(projectRoot: string): SmallFixEntry[] {
  try {
    return fs
      .readFileSync(path.join(projectRoot, SMALL_FIX_LOG), 'utf8')
      .split('\n')
      .flatMap((line) => {
        try {
          const entry = JSON.parse(line);
          return entry && typeof entry.at === 'string' && typeof entry.reason === 'string' ? [entry as SmallFixEntry] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

export function smallFixCommand(reason: string | undefined, opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): number {
  const why = (reason ?? '').replace(/\s+/g, ' ').trim();
  if (!why) {
    process.stderr.write('A reason is required: specweave small-fix "typo in the README"\n');
    return 1;
  }
  const env = opts.env ?? process.env;
  const root = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  const session = detectSessionId(env);
  const model = detectModel(env);
  const entry: SmallFixEntry = {
    at: new Date().toISOString(),
    by: getAgentId(env),
    reason: why.slice(0, 300),
    ...(session ? { session } : {}),
    ...(model ? { model } : {}),
  };
  const log = path.join(root, SMALL_FIX_LOG);
  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.appendFileSync(log, JSON.stringify(entry) + '\n', 'utf8');
  if (session) {
    recordWorkSession({ sessionId: session, kind: 'small-fix', incrementId: null, root, event: 'small-fix', reason: entry.reason, at: entry.at });
    process.stdout.write(`Small fix recorded for session ${session}: ${entry.reason}\n`);
  } else {
    process.stdout.write(
      `Small fix logged: ${entry.reason}\nNo session id in this environment (set SPECWEAVE_SESSION_ID), so the required-increment guard cannot exempt this session.\n`,
    );
  }
  return 0;
}
