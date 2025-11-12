import {
  isSimpleStrategy,
  isFilteredStrategy,
  isCustomStrategy
} from "../../../src/core/types/sync-profile.js";
import { getBoardIds } from "./jira-board-resolver.js";
async function buildHierarchicalJQL(client, containers) {
  const clauses = [];
  for (const container of containers) {
    const parts = [];
    parts.push(`project=${container.id}`);
    if (container.subOrganizations && container.subOrganizations.length > 0) {
      try {
        const boardIds = await getBoardIds(
          client,
          container.id,
          container.subOrganizations
        );
        if (boardIds.length > 0) {
          parts.push(`board IN (${boardIds.join(",")})`);
        } else {
          console.warn(
            `\u26A0\uFE0F  No valid boards found for project ${container.id}, syncing all boards`
          );
        }
      } catch (error) {
        console.warn(
          `\u26A0\uFE0F  Failed to resolve boards for ${container.id}, syncing all boards:`,
          error.message
        );
      }
    }
    if (container.filters) {
      const filterClauses = buildFilterClauses(container.filters);
      parts.push(...filterClauses);
    }
    clauses.push(`(${parts.join(" AND ")})`);
  }
  return clauses.join(" OR ");
}
function buildFilterClauses(filters) {
  const clauses = [];
  if (filters.includeLabels && filters.includeLabels.length > 0) {
    const labels = filters.includeLabels.map((l) => `"${l}"`).join(", ");
    clauses.push(`labels IN (${labels})`);
  }
  if (filters.excludeLabels && filters.excludeLabels.length > 0) {
    const labels = filters.excludeLabels.map((l) => `"${l}"`).join(", ");
    clauses.push(`labels NOT IN (${labels})`);
  }
  if (filters.assignees && filters.assignees.length > 0) {
    const assignees = filters.assignees.map((a) => `"${a}"`).join(", ");
    clauses.push(`assignee IN (${assignees})`);
  }
  if (filters.statusCategories && filters.statusCategories.length > 0) {
    const statuses = filters.statusCategories.map((s) => `"${s}"`).join(", ");
    clauses.push(`status IN (${statuses})`);
  }
  if (filters.components && filters.components.length > 0) {
    const components = filters.components.map((c) => `"${c}"`).join(", ");
    clauses.push(`component IN (${components})`);
  }
  if (filters.sprints && filters.sprints.length > 0) {
    const sprints = filters.sprints.map((s) => `"${s}"`).join(", ");
    clauses.push(`sprint IN (${sprints})`);
  }
  if (filters.issueTypes && filters.issueTypes.length > 0) {
    const types = filters.issueTypes.map((t) => `"${t}"`).join(", ");
    clauses.push(`issuetype IN (${types})`);
  }
  return clauses;
}
function addTimeRangeFilter(jql, timeRange) {
  if (timeRange === "ALL") {
    return jql;
  }
  const timeMap = {
    "1W": "-1w",
    "2W": "-2w",
    "1M": "-1M",
    "3M": "-3M",
    "6M": "-6M",
    "1Y": "-1y"
  };
  const jiraTime = timeMap[timeRange] || "-1M";
  return `${jql} AND created >= ${jiraTime}`;
}
async function fetchIssuesHierarchical(client, profile, timeRange = "1M") {
  const config = profile.config;
  if (isSimpleStrategy(profile)) {
    return fetchIssuesSimple(client, config, timeRange);
  }
  if (isCustomStrategy(profile)) {
    return fetchIssuesCustom(client, config, timeRange);
  }
  if (isFilteredStrategy(profile)) {
    return fetchIssuesFiltered(client, config, timeRange);
  }
  console.warn("\u26A0\uFE0F  Unknown strategy, defaulting to simple");
  return fetchIssuesSimple(client, config, timeRange);
}
async function fetchIssuesSimple(client, config, timeRange) {
  const projectKey = config.projectKey;
  if (!projectKey) {
    throw new Error("Simple strategy requires projectKey in config");
  }
  let jql = `project=${projectKey}`;
  jql = addTimeRangeFilter(jql, timeRange);
  console.log("\u{1F50D} Fetching issues (SIMPLE strategy):", jql);
  return client.searchIssues({ jql });
}
async function fetchIssuesCustom(client, config, timeRange) {
  const customQuery = config.customQuery;
  if (!customQuery) {
    throw new Error("Custom strategy requires customQuery in config");
  }
  const jql = addTimeRangeFilter(customQuery, timeRange);
  console.log("\u{1F50D} Fetching issues (CUSTOM strategy):", jql);
  return client.searchIssues({ jql });
}
async function fetchIssuesFiltered(client, config, timeRange) {
  const containers = config.containers;
  if (!containers || containers.length === 0) {
    throw new Error("Filtered strategy requires containers array in config");
  }
  const baseJql = await buildHierarchicalJQL(client, containers);
  const jql = addTimeRangeFilter(baseJql, timeRange);
  console.log("\u{1F50D} Fetching issues (FILTERED strategy):", jql);
  return client.searchIssues({ jql });
}
export {
  buildHierarchicalJQL,
  fetchIssuesHierarchical
};
