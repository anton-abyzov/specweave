import { execFileNoThrow } from "../../../../../src/utils/execFileNoThrow.js";
import { parseIssueBody } from "./github-issue-body-parser.js";
async function pullSyncFromGitHub(userStoryLinks, specAcceptanceCriteria, options) {
  const result = { changes: [], conflicts: [], errors: [] };
  const entries = Object.entries(userStoryLinks);
  if (entries.length === 0) {
    return result;
  }
  const env = getEnv(options.token);
  const repoSlug = `${options.owner}/${options.repo}`;
  for (const [usId, link] of entries) {
    try {
      const issueData = await fetchIssue(link.issueNumber, repoSlug, env);
      const parsed = parseIssueBody(issueData.body || "");
      const specACs = specAcceptanceCriteria[usId] || [];
      compareACStates(usId, specACs, parsed.acceptanceCriteria, options.dryRun ?? false, result);
      compareIssueState(usId, issueData.state, specACs, result, options.dryRun ?? false);
    } catch (err) {
      result.errors.push({
        userStoryId: usId,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  return result;
}
function compareACStates(usId, specACs, githubACs, dryRun, result) {
  for (const specAC of specACs) {
    const ghAC = githubACs[specAC.id];
    if (!ghAC) continue;
    const specValue = String(specAC.completed);
    const githubValue = String(ghAC.checked);
    if (specValue !== githubValue) {
      if (specAC.completed && !ghAC.checked) {
        result.conflicts.push({
          userStoryId: usId,
          field: specAC.id,
          specValue,
          githubValue
        });
      } else {
        result.changes.push({
          userStoryId: usId,
          field: specAC.id,
          specValue,
          githubValue,
          applied: !dryRun
        });
      }
    }
  }
}
function compareIssueState(usId, githubState, specACs, result, dryRun) {
  const normalizedState = githubState.toLowerCase() === "closed" ? "closed" : "open";
  const allDone = specACs.length > 0 && specACs.every((ac) => ac.completed);
  const specState = allDone ? "closed" : "open";
  if (specState !== normalizedState) {
    result.changes.push({
      userStoryId: usId,
      field: "status",
      specValue: specState,
      githubValue: normalizedState,
      applied: !dryRun
    });
  }
}
async function fetchIssue(issueNumber, repoSlug, env) {
  const res = await execFileNoThrow("gh", [
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    repoSlug,
    "--json",
    "title,body,state,labels"
  ], { env });
  if (!res.success) {
    throw new Error(res.stderr || "Failed to fetch issue");
  }
  return JSON.parse(res.stdout);
}
function getEnv(token) {
  if (token) {
    return { ...process.env, GH_TOKEN: token };
  }
  return process.env;
}
async function pullSyncMultiRepo(repos, userStoryLinks, specAcceptanceCriteria, options) {
  const result = {
    changes: [],
    conflicts: [],
    disagreements: [],
    errors: []
  };
  if (repos.length === 0) {
    return result;
  }
  const env = getEnv(options.token);
  const perRepoACStates = {};
  const failedRepos = /* @__PURE__ */ new Set();
  for (const repo of repos) {
    const repoSlug = `${repo.owner}/${repo.repo}`;
    for (const usId of repo.relevantStories) {
      const links = userStoryLinks[usId];
      if (!links || !links[repoSlug]) continue;
      const issueNumber = links[repoSlug].issueNumber;
      try {
        const issueData = await fetchIssue(issueNumber, repoSlug, env);
        const parsed = parseIssueBody(issueData.body || "");
        if (!perRepoACStates[usId]) {
          perRepoACStates[usId] = {};
        }
        const specACs = specAcceptanceCriteria[usId] || [];
        for (const specAC of specACs) {
          const ghAC = parsed.acceptanceCriteria[specAC.id];
          if (!ghAC) continue;
          if (!perRepoACStates[usId][specAC.id]) {
            perRepoACStates[usId][specAC.id] = {};
          }
          perRepoACStates[usId][specAC.id][repoSlug] = ghAC.checked;
        }
      } catch (err) {
        failedRepos.add(repoSlug);
        result.errors.push({
          userStoryId: usId,
          repo: repoSlug,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  }
  for (const [usId, acMap] of Object.entries(perRepoACStates)) {
    const specACs = specAcceptanceCriteria[usId] || [];
    const usLinks = userStoryLinks[usId] || {};
    const expectedRepos = Object.keys(usLinks).filter((r) => !failedRepos.has(r));
    for (const specAC of specACs) {
      const repoStates = acMap[specAC.id];
      if (!repoStates) continue;
      const validStates = Object.entries(repoStates).filter(
        ([repo]) => !failedRepos.has(repo)
      );
      if (validStates.length === 0) continue;
      const allChecked = validStates.every(([, checked]) => checked);
      const allUnchecked = validStates.every(([, checked]) => !checked);
      const isShared = expectedRepos.length > 1;
      if (isShared) {
        if (allChecked && !specAC.completed) {
          result.changes.push({
            userStoryId: usId,
            field: specAC.id,
            specValue: String(specAC.completed),
            githubValue: "true",
            applied: true
          });
        } else if (!allChecked && !allUnchecked && !specAC.completed) {
          const stateMap = {};
          for (const [repo, checked] of validStates) {
            stateMap[repo] = checked;
          }
          result.disagreements.push({
            userStoryId: usId,
            field: specAC.id,
            repoStates: stateMap
          });
        }
      } else {
        const [, checked] = validStates[0];
        if (checked && !specAC.completed) {
          result.changes.push({
            userStoryId: usId,
            field: specAC.id,
            specValue: String(specAC.completed),
            githubValue: "true",
            applied: true
          });
        }
      }
    }
  }
  return result;
}
export {
  pullSyncFromGitHub,
  pullSyncMultiRepo
};
