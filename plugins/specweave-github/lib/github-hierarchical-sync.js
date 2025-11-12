import {
  isSimpleStrategy,
  isFilteredStrategy,
  isCustomStrategy
} from "../../../src/core/types/sync-profile.js";
import { execFileNoThrow } from "../../../src/utils/execFileNoThrow.js";
async function buildHierarchicalSearchQuery(containers) {
  const parts = [];
  for (const container of containers) {
    parts.push(`repo:${container.id}`);
    if (container.subOrganizations && container.subOrganizations.length > 0) {
      console.warn(
        `\u26A0\uFE0F  GitHub search doesn't support project board filtering directly.`
      );
      console.warn(
        `   Boards will be ignored: ${container.subOrganizations.join(", ")}`
      );
    }
  }
  parts.push("is:issue");
  const filters = containers[0]?.filters;
  if (filters) {
    const filterClauses = buildFilterClauses(filters);
    parts.push(...filterClauses);
  }
  return parts.join(" ");
}
function buildFilterClauses(filters) {
  const clauses = [];
  if (filters.includeLabels && filters.includeLabels.length > 0) {
    for (const label of filters.includeLabels) {
      clauses.push(`label:"${label}"`);
    }
  }
  if (filters.excludeLabels && filters.excludeLabels.length > 0) {
    for (const label of filters.excludeLabels) {
      clauses.push(`-label:"${label}"`);
    }
  }
  if (filters.assignees && filters.assignees.length > 0) {
    const assigneeQuery = filters.assignees.map((a) => `assignee:"${a}"`).join(" ");
    clauses.push(assigneeQuery);
  }
  if (filters.statusCategories && filters.statusCategories.length > 0) {
    const statuses = filters.statusCategories.map((s) => s.toLowerCase());
    if (statuses.includes("open") || statuses.includes("to do") || statuses.includes("in progress")) {
      clauses.push("is:open");
    } else if (statuses.includes("closed") || statuses.includes("done")) {
      clauses.push("is:closed");
    }
  }
  if (filters.milestones && filters.milestones.length > 0) {
    for (const milestone of filters.milestones) {
      clauses.push(`milestone:"${milestone}"`);
    }
  }
  return clauses;
}
function addTimeRangeFilter(query, timeRange) {
  if (timeRange === "ALL") {
    return query;
  }
  const { since, until } = calculateTimeRange(timeRange);
  return `${query} created:${since}..${until}`;
}
function calculateTimeRange(timeRange) {
  const now = /* @__PURE__ */ new Date();
  const since = new Date(now);
  switch (timeRange) {
    case "1W":
      since.setDate(now.getDate() - 7);
      break;
    case "2W":
      since.setDate(now.getDate() - 14);
      break;
    case "1M":
      since.setMonth(now.getMonth() - 1);
      break;
    case "3M":
      since.setMonth(now.getMonth() - 3);
      break;
    case "6M":
      since.setMonth(now.getMonth() - 6);
      break;
    case "1Y":
      since.setFullYear(now.getFullYear() - 1);
      break;
    case "ALL":
      return {
        since: "1970-01-01",
        until: now.toISOString().split("T")[0]
      };
  }
  return {
    since: since.toISOString().split("T")[0],
    until: now.toISOString().split("T")[0]
  };
}
async function fetchIssuesHierarchical(profile, timeRange = "1M") {
  const config = profile.config;
  if (isSimpleStrategy(profile)) {
    return fetchIssuesSimple(config, timeRange);
  }
  if (isCustomStrategy(profile)) {
    return fetchIssuesCustom(config, timeRange);
  }
  if (isFilteredStrategy(profile)) {
    return fetchIssuesFiltered(config, timeRange);
  }
  console.warn("\u26A0\uFE0F  Unknown strategy, defaulting to simple");
  return fetchIssuesSimple(config, timeRange);
}
async function fetchIssuesSimple(config, timeRange) {
  const owner = config.owner;
  const repo = config.repo;
  if (!owner || !repo) {
    throw new Error("Simple strategy requires owner and repo in config");
  }
  let query = `repo:${owner}/${repo} is:issue`;
  query = addTimeRangeFilter(query, timeRange);
  console.log("\u{1F50D} Fetching issues (SIMPLE strategy):", query);
  return executeSearch(query);
}
async function fetchIssuesCustom(config, timeRange) {
  const customQuery = config.customQuery;
  if (!customQuery) {
    throw new Error("Custom strategy requires customQuery in config");
  }
  const query = addTimeRangeFilter(customQuery, timeRange);
  console.log("\u{1F50D} Fetching issues (CUSTOM strategy):", query);
  return executeSearch(query);
}
async function fetchIssuesFiltered(config, timeRange) {
  const containers = config.containers;
  if (!containers || containers.length === 0) {
    throw new Error("Filtered strategy requires containers array in config");
  }
  const baseQuery = await buildHierarchicalSearchQuery(containers);
  const query = addTimeRangeFilter(baseQuery, timeRange);
  console.log("\u{1F50D} Fetching issues (FILTERED strategy):", query);
  return executeSearch(query);
}
async function executeSearch(query) {
  const result = await execFileNoThrow("gh", [
    "search",
    "issues",
    query,
    "--json",
    "number,title,body,state,url,labels,milestone,repository",
    "--limit",
    "1000"
    // Max results
  ]);
  if (result.status !== 0) {
    throw new Error(`Failed to search issues: ${result.stderr || result.stdout}`);
  }
  if (!result.stdout.trim()) {
    return [];
  }
  const issues = JSON.parse(result.stdout);
  return issues.map((issue) => ({
    number: issue.number,
    title: issue.title,
    body: issue.body || "",
    state: issue.state,
    html_url: issue.url,
    url: issue.url,
    labels: issue.labels?.map((l) => l.name) || [],
    milestone: issue.milestone ? {
      number: issue.milestone.number,
      title: issue.milestone.title,
      description: issue.milestone.description,
      state: issue.milestone.state
    } : void 0,
    repository: issue.repository ? {
      owner: issue.repository.owner.login,
      name: issue.repository.name,
      full_name: issue.repository.full_name
    } : void 0
  }));
}
export {
  buildHierarchicalSearchQuery,
  fetchIssuesHierarchical
};
