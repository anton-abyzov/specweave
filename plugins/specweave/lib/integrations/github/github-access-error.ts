/**
 * Diagnose GitHub "create" failures that are really auth/access problems.
 *
 * GitHub returns **404 Not Found** (not 403) when a token's account cannot even
 * SEE a repo — so a token in `.env` whose account lacks write access to the
 * target repo surfaces as a confusing `gh: Not Found (HTTP 404)` at
 * issue/milestone create. This module turns that into a clear, actionable error
 * naming the token's account and the repo it can't write.
 */

export interface GitHubAccessFacts {
  /** Login of the account the token belongs to, or null if the token is invalid. */
  login: string | null;
  /** Whether that account can push to owner/repo; null when it couldn't be determined. */
  canPush: boolean | null;
  owner: string;
  repo: string;
}

/** Minimal exec-result shape (matches execFileNoThrow / execWithBudget). */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type ExecFn = (
  command: string,
  args: string[],
  options?: { env?: NodeJS.ProcessEnv },
) => Promise<ExecResult>;

/**
 * True if a gh CLI error string looks like an access/permission failure.
 * 404 Not Found is included on purpose: GitHub masks "no access" as 404.
 */
export function isLikelyAccessError(raw: string | undefined): boolean {
  if (!raw) return false;
  return /\bHTTP 4(0[134])\b|\b4(0[134])\b|not found|forbidden|resource not accessible|must have admin|permission/i.test(
    raw,
  );
}

/**
 * Build a clear, actionable error message for a failed GitHub create, or null
 * when the failure is not an auth/access problem (callers then fall back to the
 * raw error). Returns null when the token's account demonstrably CAN push, so a
 * genuine missing resource isn't misreported as an auth issue.
 */
export function explainGitHubAccessError(
  rawError: string,
  facts: GitHubAccessFacts,
): string | null {
  if (!isLikelyAccessError(rawError)) return null;
  const { login, canPush, owner, repo } = facts;
  if (canPush === true) return null;

  const who = login
    ? `The GitHub token in .env belongs to account '${login}', which has no write access to ${owner}/${repo}.`
    : `The GitHub token in .env is invalid or expired — its account could not be resolved.`;

  return [
    who,
    `GitHub returns 404 (not 403) when a token's account cannot see a repo, which is why this looked like "Not Found".`,
    `Fix: point GITHUB_TOKEN / GH_TOKEN in .env at a token whose account can write ${owner}/${repo}, or run \`gh auth login\` with the right account.`,
    `Original error: ${rawError.trim()}`,
  ].join('\n');
}

/**
 * Resolve the token account's login + whether it can push to owner/repo, using
 * the gh CLI with the same token env the failing call used. Best-effort: any
 * probe that fails leaves its field null/false instead of throwing.
 */
export async function resolveGitHubAccessFacts(
  exec: ExecFn,
  env: NodeJS.ProcessEnv | undefined,
  owner: string,
  repo: string,
): Promise<{ login: string | null; canPush: boolean | null }> {
  let login: string | null = null;
  try {
    const u = await exec('gh', ['api', 'user', '--jq', '.login'], { env });
    if (u.exitCode === 0) login = u.stdout.trim() || null;
  } catch {
    /* leave login null */
  }

  let canPush: boolean | null = null;
  try {
    const r = await exec(
      'gh',
      ['api', `repos/${owner}/${repo}`, '--jq', '.permissions.push // false'],
      { env },
    );
    if (r.exitCode === 0) canPush = r.stdout.trim() === 'true';
    else canPush = false; // 404/403 on the repo itself → no access
  } catch {
    /* leave canPush null */
  }

  return { login, canPush };
}
