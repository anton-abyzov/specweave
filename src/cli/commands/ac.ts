/**
 * CLI: `specweave ac <action>` — acceptance criteria on the ledger.
 *
 *   ac accept-skip <AC> [inc] --check <id> --reason <text> --accepted-by <who>
 *                  --authorization <text> [--accepted-at <ISO date>]
 *       a person accepted skipping one named check of the AC (no license, no
 *       installation); appends one `accept-skip` event. Never verification.
 *   ac list [inc] [--json]
 *       every AC with its acceptance (met | mixed | skipped-accepted | open)
 *       and accepted skips
 *
 * See core/tasks/accepted-skip.ts for how an AC's acceptance is derived.
 *
 * @module cli/commands/ac
 */

import { resolveEffectiveRoot } from '../../utils/find-project-root.js';
import { appendEvent, getAgentId, ledgerPath } from '../../core/tasks/ledger.js';
import { loadTaskBoard } from '../../core/tasks/task-board.js';
import { resolveIncrement, readLeaseHours, IncrementResolutionError } from '../../core/tasks/resolve-increment.js';
import { deriveAcStatus, readSpecAcs } from '../../core/tasks/verify-runner.js';
import { acJson, deriveAcAcceptance } from '../../core/tasks/accepted-skip.js';
import { autoCommitIncrement, describeAutoCommit } from '../../core/increment/auto-commit.js';

export interface AcCommandOptions {
  check?: string;
  reason?: string;
  acceptedBy?: string;
  acceptedAt?: string;
  authorization?: string;
  json?: boolean;
  /** `--no-commit` → false: skip the `git.autoCommitIncrement` commit. */
  commit?: boolean;
  /** Override cwd (tests). */
  cwd?: string;
  /** Override the agent id (tests). */
  agent?: string;
}

const ACTIONS = ['accept-skip', 'list'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** Entry point. Returns the process exit code. */
export async function acCommand(action: string, a?: string, b?: string, opts: AcCommandOptions = {}): Promise<number> {
  const out = (s: string) => process.stdout.write(s + '\n');
  const err = (s: string) => process.stderr.write(s + '\n');
  if (!(ACTIONS as readonly string[]).includes(action)) {
    err(`Unknown ac action "${action}". Actions: ${ACTIONS.join(', ')}`);
    return 2;
  }
  const projectRoot = resolveEffectiveRoot(opts.cwd ?? process.cwd());
  const acArg = action === 'accept-skip' ? a : undefined;
  const incArg = action === 'accept-skip' ? b : a;

  let inc;
  try {
    inc = resolveIncrement(projectRoot, incArg);
  } catch (e) {
    if (e instanceof IncrementResolutionError) { err(e.message); return 1; }
    throw e;
  }
  const leaseHours = readLeaseHours(projectRoot);
  const criteria = () => {
    const board = loadTaskBoard(inc.dir, { leaseHours });
    return deriveAcAcceptance(deriveAcStatus(readSpecAcs(inc.dir), board), board);
  };

  if (action === 'list') {
    const acs = criteria();
    if (opts.json) {
      out(JSON.stringify({ increment: inc.id, criteria: acs.map(acJson) }, null, 2));
      return 0;
    }
    out(`${inc.id} — acceptance criteria`);
    for (const c of acs) {
      out(`${c.id}  ${c.acceptance}${c.text ? `  ${c.text}` : ''}`);
      for (const w of c.waivers) out(`    accepted skip ${w.check}: ${w.reason} (accepted by ${w.acceptedBy} ${w.acceptedAt}; not verified)`);
    }
    if (!acs.length) out('(spec.md declares no acceptance criteria)');
    return 0;
  }

  const usage = 'Usage: specweave ac accept-skip <AC-id> [increment] --check <id> --reason "<why>" --accepted-by <who> --authorization "<quote or message ref>" [--accepted-at <ISO date>]';
  if (!acArg) { err(usage); return 2; }
  const missing = (['check', 'reason', 'acceptedBy', 'authorization'] as const).filter((k) => !opts[k]?.trim());
  if (missing.length) {
    err(`Missing ${missing.map((k) => `--${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`).join(', ')}.\n${usage}`);
    return 1;
  }
  const acceptedAt = opts.acceptedAt?.trim() || new Date().toISOString();
  if (!ISO_DATE.test(acceptedAt) || Number.isNaN(Date.parse(acceptedAt))) {
    err(`--accepted-at must be an ISO-8601 date or time (2026-10-27 or 2026-10-27T13:05:00Z), got "${acceptedAt}"`);
    return 1;
  }

  const before = criteria();
  const ac = before.find((c) => c.id.toUpperCase() === acArg.trim().toUpperCase());
  if (!ac) {
    err(`${acArg} is not an acceptance criterion in ${inc.id}/spec.md${before.length ? ` (declared: ${before.map((c) => c.id).join(', ')})` : ''}`);
    return 1;
  }
  const check = opts.check!.trim();
  const prior = ac.waivers.find((w) => w.check.toLowerCase() === check.toLowerCase());
  if (prior) {
    err(`${ac.id} check ${check} is already accepted (by ${prior.acceptedBy} at ${prior.acceptedAt}). The ledger is append-only; nothing written.`);
    return 1;
  }

  appendEvent(ledgerPath(inc.dir), {
    t: ac.id, e: 'accept-skip', by: opts.agent ?? getAgentId(), at: new Date().toISOString(),
    check, reason: opts.reason!.trim(), acceptedBy: opts.acceptedBy!.trim(), acceptedAt, authorization: opts.authorization!.trim(),
  });
  const after = criteria().find((c) => c.id === ac.id)!;
  const committed = autoCommitIncrement(projectRoot, inc.dir, { incrementId: inc.id, action: 'accept-skip', tasks: [ac.id], commit: opts.commit });
  for (const w of committed.warnings) err(`warning: ${w}`);

  if (opts.json) {
    out(JSON.stringify({
      increment: inc.id, accepted: ac.id, check, acceptance: after.acceptance, criterion: acJson(after),
      ...(committed.status === 'off' ? {} : { commit: { status: committed.status, sha: committed.sha, subject: committed.subject, pushed: committed.pushed } }),
    }, null, 2));
  } else {
    out(`Accepted skip recorded: ${ac.id} check ${check} (accepted by ${opts.acceptedBy!.trim()} ${acceptedAt}). Not verified.`);
    out(`${ac.id} acceptance: ${after.acceptance}${after.acceptance === 'open' ? ' (other work on this AC is still unresolved)' : ''}`);
    const line = describeAutoCommit(committed);
    if (line) out(line);
  }
  return 0;
}
