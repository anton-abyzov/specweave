import https from "https";
async function fetchTeamsForProject(organization, project, pat) {
  console.log(`\u{1F50D} Fetching teams for project: ${project}`);
  try {
    const url = `https://dev.azure.com/${organization}/_apis/projects/${project}/teams?api-version=7.1`;
    const response = await makeRequest(url, pat);
    const teams = response.value || [];
    console.log(`\u2705 Found ${teams.length} team(s) for project ${project}`);
    return teams;
  } catch (error) {
    console.error(`\u274C Error fetching teams for ${project}:`, error.message);
    throw error;
  }
}
async function fetchAreaPathsForProject(organization, project, pat) {
  console.log(`\u{1F50D} Fetching area paths for project: ${project}`);
  try {
    const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/classificationnodes/areas?$depth=10&api-version=7.1`;
    const response = await makeRequest(url, pat);
    const areaPaths = [];
    flattenAreaPaths(response, areaPaths, project);
    console.log(`\u2705 Found ${areaPaths.length} area path(s) for project ${project}`);
    return areaPaths;
  } catch (error) {
    console.error(`\u274C Error fetching area paths for ${project}:`, error.message);
    throw error;
  }
}
function flattenAreaPaths(node, result, projectName, parentPath = "") {
  if (!node) return;
  const fullPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
  result.push({
    id: node.id,
    identifier: node.identifier,
    name: node.name,
    path: fullPath,
    hasChildren: node.hasChildren || false
  });
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      flattenAreaPaths(child, result, projectName, fullPath);
    }
  }
}
async function fetchIterationPathsForProject(organization, project, pat) {
  console.log(`\u{1F50D} Fetching iteration paths for project: ${project}`);
  try {
    const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.1`;
    const response = await makeRequest(url, pat);
    const iterationPaths = [];
    flattenIterationPaths(response, iterationPaths, project);
    console.log(`\u2705 Found ${iterationPaths.length} iteration path(s) for project ${project}`);
    return iterationPaths;
  } catch (error) {
    console.error(`\u274C Error fetching iteration paths for ${project}:`, error.message);
    throw error;
  }
}
function flattenIterationPaths(node, result, projectName, parentPath = "") {
  if (!node) return;
  const fullPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
  result.push({
    id: node.id,
    identifier: node.identifier,
    name: node.name,
    path: fullPath,
    attributes: node.attributes || {}
  });
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      flattenIterationPaths(child, result, projectName, fullPath);
    }
  }
}
async function resolveAreaPathNames(organization, project, pat, areaPathNames) {
  if (!areaPathNames || areaPathNames.length === 0) {
    return /* @__PURE__ */ new Map();
  }
  const areaPaths = await fetchAreaPathsForProject(organization, project, pat);
  const pathMap = /* @__PURE__ */ new Map();
  for (const areaPathName of areaPathNames) {
    const exactMatch = areaPaths.find(
      (ap) => ap.path === areaPathName || ap.name === areaPathName
    );
    if (exactMatch) {
      pathMap.set(areaPathName, exactMatch.path);
      console.log(`\u2705 Resolved area path "${areaPathName}" \u2192 "${exactMatch.path}"`);
      continue;
    }
    const partialMatch = areaPaths.find(
      (ap) => ap.path.toLowerCase().includes(areaPathName.toLowerCase()) || ap.name.toLowerCase().includes(areaPathName.toLowerCase())
    );
    if (partialMatch) {
      pathMap.set(areaPathName, partialMatch.path);
      console.log(`\u2705 Resolved area path "${areaPathName}" \u2192 "${partialMatch.path}" (partial match)`);
    } else {
      console.warn(`\u26A0\uFE0F  Area path "${areaPathName}" not found in project ${project}`);
    }
  }
  return pathMap;
}
async function getAreaPaths(organization, project, pat, areaPathNames) {
  const pathMap = await resolveAreaPathNames(organization, project, pat, areaPathNames);
  return Array.from(pathMap.values());
}
function makeRequest(url, pat) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const authHeader = "Basic " + Buffer.from(`:${pat}`).toString("base64");
    const options = {
      hostname,
      path: pathname + search,
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json"
      }
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
    req.end();
  });
}
export {
  fetchAreaPathsForProject,
  fetchIterationPathsForProject,
  fetchTeamsForProject,
  getAreaPaths,
  resolveAreaPathNames
};
