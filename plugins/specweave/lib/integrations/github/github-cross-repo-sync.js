import { execFileNoThrow } from "../../../../../src/utils/execFileNoThrow.js";
import { generateIssueBody } from "./github-issue-body-generator.js";
async function crossRepoSync(stories, options) {
  const result = {
    created: [],
    updated: [],
    errors: [],
    crossReferences: []
  };
  if (stories.length === 0) return result;
  const env = getEnv(options.token);
  const storyIssueMap = /* @__PURE__ */ new Map();
  for (const story of stories) {
    const repos = story.targetRepos.length > 0 ? story.targetRepos : [`${options.owner}/${options.defaultRepo}`];
    const storyIssues = [];
    for (const repo of repos) {
      try {
        const body = generateIssueBody({
          id: story.id,
          title: story.title,
          description: story.description,
          priority: story.priority,
          acceptanceCriteria: story.acceptanceCriteria,
          specId: story.specId
        });
        const title = `[${story.id}] ${story.title}`;
        const existing = await searchIssue(story.id, repo, env);
        if (existing) {
          await updateIssue(existing.number, title, body, repo, env);
          result.updated.push({
            userStoryId: story.id,
            repo,
            issueNumber: existing.number,
            issueUrl: `https://github.com/${repo}/issues/${existing.number}`
          });
          storyIssues.push({ repo, issueNumber: existing.number });
        } else {
          const created = await createIssue(title, body, story, repo, env);
          result.created.push({
            userStoryId: story.id,
            repo,
            issueNumber: created.number,
            issueUrl: created.url,
            issueNodeId: created.node_id
          });
          storyIssues.push({ repo, issueNumber: created.number });
        }
      } catch (err) {
        result.errors.push({
          userStoryId: story.id,
          repo,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    if (storyIssues.length > 1) {
      storyIssueMap.set(story.id, storyIssues);
    }
  }
  for (const [, issues] of storyIssueMap) {
    for (const issue of issues) {
      const linkedTo = issues.filter((i) => i.repo !== issue.repo);
      result.crossReferences.push({
        repo: issue.repo,
        issueNumber: issue.issueNumber,
        linkedTo
      });
      const crossRefSection = buildCrossRefSection(linkedTo);
      try {
        await appendToIssueBody(issue.issueNumber, issue.repo, crossRefSection, env);
      } catch {
      }
    }
  }
  return result;
}
async function searchIssue(usId, repo, env) {
  const res = await execFileNoThrow("gh", [
    "issue",
    "list",
    "--repo",
    repo,
    "--search",
    `[${usId}] in:title`,
    "--json",
    "number,title,node_id",
    "--limit",
    "1"
  ], { env });
  if (!res.success) {
    throw new Error(`Search failed for ${repo}: ${res.stderr}`);
  }
  const issues = JSON.parse(res.stdout);
  return issues.length > 0 ? issues[0] : null;
}
async function createIssue(title, body, story, repo, env) {
  const res = await execFileNoThrow("gh", [
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    title,
    "--body",
    body,
    "--label",
    "user-story",
    "--label",
    `priority:${story.priority}`,
    "--json",
    "number,url,node_id"
  ], { env });
  if (!res.success) {
    throw new Error(`Create failed for ${repo}: ${res.stderr}`);
  }
  return JSON.parse(res.stdout);
}
async function updateIssue(issueNumber, title, body, repo, env) {
  const res = await execFileNoThrow("gh", [
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    repo,
    "--title",
    title,
    "--body",
    body,
    "--json",
    "number,url"
  ], { env });
  if (!res.success) {
    throw new Error(`Update failed for ${repo}: ${res.stderr}`);
  }
}
async function appendToIssueBody(issueNumber, repo, section, env) {
  const viewRes = await execFileNoThrow("gh", [
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    repo,
    "--json",
    "body",
    "-q",
    ".body"
  ], { env });
  const existingBody = viewRes.success ? (viewRes.stdout || "").trim() : "";
  const combinedBody = existingBody ? `${existingBody}

---
${section}` : section;
  const res = await execFileNoThrow("gh", [
    "issue",
    "edit",
    String(issueNumber),
    "--repo",
    repo,
    "--body",
    combinedBody
  ], { env });
  if (!res.success) {
    throw new Error(`Cross-ref update failed: ${res.stderr}`);
  }
}
function buildCrossRefSection(linkedTo) {
  const refs = linkedTo.map((l) => `- ${l.repo}#${l.issueNumber}`).join("\n");
  return `

---
**Also tracked in:**
${refs}`;
}
function getEnv(token) {
  if (token) {
    return { ...process.env, GH_TOKEN: token };
  }
  return process.env;
}
export {
  crossRepoSync
};
