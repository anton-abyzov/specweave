import {
  isSimpleStrategy,
  isFilteredStrategy,
  isCustomStrategy
} from "../../../src/core/types/sync-profile.js";
import { getAreaPaths } from "./ado-board-resolver.js";
import https from "https";
async function buildHierarchicalWIQL(organization, pat, containers) {
  const projectClauses = [];
  for (const container of containers) {
    const parts = [];
    parts.push(`[System.TeamProject] = '${container.id}'`);
    if (container.subOrganizations && container.subOrganizations.length > 0) {
      try {
        const areaPaths = await getAreaPaths(
          organization,
          container.id,
          pat,
          container.subOrganizations
        );
        if (areaPaths.length > 0) {
          const areaPathClauses = areaPaths.map((path) => `[System.AreaPath] UNDER '${path}'`).join(" OR ");
          parts.push(`(${areaPathClauses})`);
        } else {
          console.warn(
            `\u26A0\uFE0F  No valid area paths found for project ${container.id}, syncing all areas`
          );
        }
      } catch (error) {
        console.warn(
          `\u26A0\uFE0F  Failed to resolve area paths for ${container.id}, syncing all areas:`,
          error.message
        );
      }
    }
    projectClauses.push(`(${parts.join(" AND ")})`);
  }
  let whereClause = projectClauses.join(" OR ");
  const filters = containers[0]?.filters;
  if (filters) {
    const filterClauses = buildFilterClauses(filters);
    if (filterClauses.length > 0) {
      whereClause = `(${whereClause}) AND ${filterClauses.join(" AND ")}`;
    }
  }
  return `
    SELECT [System.Id], [System.Title], [System.Description], [System.State],
           [System.CreatedDate], [System.ChangedDate], [System.WorkItemType],
           [System.AreaPath], [System.IterationPath], [System.Tags]
    FROM WorkItems
    WHERE ${whereClause}
    ORDER BY [System.CreatedDate] DESC
  `.trim();
}
function buildFilterClauses(filters) {
  const clauses = [];
  if (filters.workItemTypes && filters.workItemTypes.length > 0) {
    const types = filters.workItemTypes.map((t) => `'${t}'`).join(", ");
    clauses.push(`[System.WorkItemType] IN (${types})`);
  }
  if (filters.statusCategories && filters.statusCategories.length > 0) {
    const states = filters.statusCategories.map((s) => `'${s}'`).join(", ");
    clauses.push(`[System.State] IN (${states})`);
  }
  if (filters.areaPaths && filters.areaPaths.length > 0) {
    const areaPathClauses = filters.areaPaths.map((path) => `[System.AreaPath] UNDER '${path}'`).join(" OR ");
    clauses.push(`(${areaPathClauses})`);
  }
  if (filters.iterationPaths && filters.iterationPaths.length > 0) {
    const iterationClauses = filters.iterationPaths.map((path) => `[System.IterationPath] UNDER '${path}'`).join(" OR ");
    clauses.push(`(${iterationClauses})`);
  }
  if (filters.includeLabels && filters.includeLabels.length > 0) {
    const tagClauses = filters.includeLabels.map((tag) => `[System.Tags] CONTAINS '${tag}'`).join(" OR ");
    clauses.push(`(${tagClauses})`);
  }
  if (filters.excludeLabels && filters.excludeLabels.length > 0) {
    for (const tag of filters.excludeLabels) {
      clauses.push(`NOT [System.Tags] CONTAINS '${tag}'`);
    }
  }
  if (filters.assignees && filters.assignees.length > 0) {
    const assigneeClauses = filters.assignees.map((assignee) => `[System.AssignedTo] = '${assignee}'`).join(" OR ");
    clauses.push(`(${assigneeClauses})`);
  }
  return clauses;
}
function addTimeRangeFilter(wiql, timeRange) {
  if (timeRange === "ALL") {
    return wiql;
  }
  const { since, until } = calculateTimeRange(timeRange);
  const timeFilter = `[System.CreatedDate] >= '${since}' AND [System.CreatedDate] <= '${until}'`;
  if (wiql.includes("ORDER BY")) {
    return wiql.replace("ORDER BY", `AND ${timeFilter} ORDER BY`);
  } else {
    return `${wiql} AND ${timeFilter}`;
  }
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
        since: "1970-01-01T00:00:00Z",
        until: now.toISOString()
      };
  }
  return {
    since: since.toISOString(),
    until: now.toISOString()
  };
}
async function fetchWorkItemsHierarchical(profile, pat, timeRange = "1M") {
  const config = profile.config;
  if (isSimpleStrategy(profile)) {
    return fetchWorkItemsSimple(config, pat, timeRange);
  }
  if (isCustomStrategy(profile)) {
    return fetchWorkItemsCustom(config, pat, timeRange);
  }
  if (isFilteredStrategy(profile)) {
    return fetchWorkItemsFiltered(config, pat, timeRange);
  }
  console.warn("\u26A0\uFE0F  Unknown strategy, defaulting to simple");
  return fetchWorkItemsSimple(config, pat, timeRange);
}
async function fetchWorkItemsSimple(config, pat, timeRange) {
  const organization = config.organization;
  const project = config.project;
  if (!project) {
    throw new Error("Simple strategy requires project in config");
  }
  let wiql = `
    SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate]
    FROM WorkItems
    WHERE [System.TeamProject] = '${project}'
  `.trim();
  wiql = addTimeRangeFilter(wiql, timeRange);
  console.log("\u{1F50D} Fetching work items (SIMPLE strategy):", wiql);
  return executeQuery(organization, project, pat, wiql);
}
async function fetchWorkItemsCustom(config, pat, timeRange) {
  const organization = config.organization;
  const project = config.project || "DefaultProject";
  const customQuery = config.customQuery;
  if (!customQuery) {
    throw new Error("Custom strategy requires customQuery in config");
  }
  const wiql = addTimeRangeFilter(customQuery, timeRange);
  console.log("\u{1F50D} Fetching work items (CUSTOM strategy):", wiql);
  return executeQuery(organization, project, pat, wiql);
}
async function fetchWorkItemsFiltered(config, pat, timeRange) {
  const organization = config.organization;
  const containers = config.containers;
  if (!containers || containers.length === 0) {
    throw new Error("Filtered strategy requires containers array in config");
  }
  const baseWiql = await buildHierarchicalWIQL(organization, pat, containers);
  const wiql = addTimeRangeFilter(baseWiql, timeRange);
  console.log("\u{1F50D} Fetching work items (FILTERED strategy):", wiql);
  const project = containers[0].id;
  return executeQuery(organization, project, pat, wiql);
}
async function executeQuery(organization, project, pat, wiql) {
  const baseUrl = `https://dev.azure.com/${organization}/${project}`;
  const queryUrl = `${baseUrl}/_apis/wit/wiql?api-version=7.1`;
  const queryResult = await makeRequest(queryUrl, pat, "POST", { query: wiql });
  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    return [];
  }
  const ids = queryResult.workItems.map((wi) => wi.id);
  const batchUrl = `${baseUrl}/_apis/wit/workitemsbatch?api-version=7.1`;
  const response = await makeRequest(batchUrl, pat, "POST", {
    ids,
    fields: [
      "System.Id",
      "System.Title",
      "System.Description",
      "System.State",
      "System.CreatedDate",
      "System.ChangedDate",
      "System.WorkItemType",
      "System.AreaPath",
      "System.IterationPath",
      "System.Tags"
    ]
  });
  return response.value || [];
}
function makeRequest(url, pat, method = "GET", body) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const authHeader = "Basic " + Buffer.from(`:${pat}`).toString("base64");
    const headers = {
      Authorization: authHeader,
      Accept: "application/json"
    };
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    const options = {
      hostname,
      path: pathname + search,
      method,
      headers
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    req.on("error", (error) => {
      reject(error);
    });
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}
export {
  buildHierarchicalWIQL,
  fetchWorkItemsHierarchical
};
