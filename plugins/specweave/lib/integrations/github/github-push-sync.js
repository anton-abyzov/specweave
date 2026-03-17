import { execFileNoThrow } from "../../../../../src/utils/execFileNoThrow.js";
import { generateIssueBody } from "./github-issue-body-generator.js";
import { SyncError } from "../../../../../src/core/errors/sync-error.js";
function parseHttpStatus(stderr) {
  const match = stderr.match(/HTTP\s+(\d{3})/);
  return match ? parseInt(match[1], 10) : 0;
}
async function pushSyncUserStories(userStories, options) {
  const result = { created: [], updated: [], errors: [] };
  if (options.dryRun) {
    return result;
  }
  const env = getEnv(options.token);
  const repoSlug = `${options.owner}/${options.repo}`;
  for (const us of userStories) {
    try {
      const existing = await searchIssueByPrefix(us.id, repoSlug, env);
      const body = generateIssueBody({
        id: us.id,
        title: us.title,
        description: us.description,
        priority: us.priority,
        acceptanceCriteria: us.acceptanceCriteria,
        specId: us.specId
      });
      const title = `[${us.id}] ${us.title}`;
      if (existing) {
        const updated = await updateIssue(existing.number, title, body, repoSlug, env);
        result.updated.push({
          userStoryId: us.id,
          issueNumber: updated.number,
          issueUrl: updated.url
        });
      } else {
        const created = await createIssue(title, body, us, repoSlug, env);
        result.created.push({
          userStoryId: us.id,
          issueNumber: created.number,
          issueUrl: created.url,
          issueNodeId: created.node_id
        });
      }
    } catch (err) {
      result.errors.push({
        userStoryId: us.id,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  return result;
}
async function searchIssueByPrefix(usId, repoSlug, env) {
  const res = await execFileNoThrow("gh", [
    "issue",
    "list",
    "--repo",
    repoSlug,
    "--state",
    "all",
    "--search",
    `[${usId}] in:title`,
    "--json",
    "number,title,node_id",
    "--limit",
    "1"
  ], { env });
  if (!res.success) {
    const status = parseHttpStatus(res.stderr);
    throw new SyncError("github", status, res.stderr, `Search failed: ${res.stderr}`);
  }
  const issues = JSON.parse(res.stdout);
  return issues.length > 0 ? issues[0] : null;
}
async function createIssue(title, body, us, repoSlug, env) {
  const args = [
    "issue",
    "create",
    "--repo",
    repoSlug,
    "--title",
    title,
    "--body",
    body,
    "--label",
    "user-story",
    "--label",
    `spec:${us.specId || "unknown"}`,
    "--label",
    `priority:${us.priority}`,
    "--json",
    "number,url,node_id"
  ];
  const res = await execFileNoThrow("gh", args, { env });
  if (!res.success) {
    const status = parseHttpStatus(res.stderr);
    throw new SyncError("github", status, res.stderr, `Create failed: ${res.stderr}`);
  }
  return JSON.parse(res.stdout);
}
async function updateIssue(issueNumber, title, body, repoSlug, env) {
  const args = [
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    repoSlug,
    "--title",
    title,
    "--body",
    body,
    "--json",
    "number,url"
  ];
  const res = await execFileNoThrow("gh", args, { env });
  if (!res.success) {
    const status = parseHttpStatus(res.stderr);
    throw new SyncError("github", status, res.stderr, `Update failed: ${res.stderr}`);
  }
  return JSON.parse(res.stdout);
}
function getEnv(token) {
  if (token) {
    return { ...process.env, GH_TOKEN: token };
  }
  return process.env;
}
export {
  pushSyncUserStories
};
