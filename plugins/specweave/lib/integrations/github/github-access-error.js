function isLikelyAccessError(raw) {
  if (!raw) return false;
  return /\bHTTP 4(0[134])\b|\b4(0[134])\b|not found|forbidden|resource not accessible|must have admin|permission/i.test(
    raw
  );
}
function explainGitHubAccessError(rawError, facts) {
  if (!isLikelyAccessError(rawError)) return null;
  const { login, canPush, owner, repo } = facts;
  if (canPush === true) return null;
  const who = login ? `The GitHub token in .env belongs to account '${login}', which has no write access to ${owner}/${repo}.` : `The GitHub token in .env is invalid or expired \u2014 its account could not be resolved.`;
  return [
    who,
    `GitHub returns 404 (not 403) when a token's account cannot see a repo, which is why this looked like "Not Found".`,
    `Fix: point GITHUB_TOKEN / GH_TOKEN in .env at a token whose account can write ${owner}/${repo}, or run \`gh auth login\` with the right account.`,
    `Original error: ${rawError.trim()}`
  ].join("\n");
}
async function resolveGitHubAccessFacts(exec, env, owner, repo) {
  let login = null;
  try {
    const u = await exec("gh", ["api", "user", "--jq", ".login"], { env });
    if (u.exitCode === 0) login = u.stdout.trim() || null;
  } catch {
  }
  let canPush = null;
  try {
    const r = await exec(
      "gh",
      ["api", `repos/${owner}/${repo}`, "--jq", ".permissions.push // false"],
      { env }
    );
    if (r.exitCode === 0) canPush = r.stdout.trim() === "true";
    else canPush = false;
  } catch {
  }
  return { login, canPush };
}
export {
  explainGitHubAccessError,
  isLikelyAccessError,
  resolveGitHubAccessFacts
};
