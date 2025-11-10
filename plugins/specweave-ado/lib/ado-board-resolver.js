/**
 * Azure DevOps Team & Area Path Resolution for Hierarchical Sync
 *
 * Resolves team names and area paths for use in WIQL queries.
 * Azure DevOps organizes work by:
 * - Teams (organizational unit)
 * - Area Paths (hierarchical work categorization)
 * - Iteration Paths (sprints/time-based organization)
 */
import https from 'https';
/**
 * Fetch all teams for an ADO project
 *
 * Uses Azure DevOps REST API: GET /{organization}/_apis/projects/{project}/teams
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @returns Array of teams
 */
export async function fetchTeamsForProject(organization, project, pat) {
    console.log(`🔍 Fetching teams for project: ${project}`);
    try {
        const url = `https://dev.azure.com/${organization}/_apis/projects/${project}/teams?api-version=7.1`;
        const response = await makeRequest(url, pat);
        const teams = response.value || [];
        console.log(`✅ Found ${teams.length} team(s) for project ${project}`);
        return teams;
    }
    catch (error) {
        console.error(`❌ Error fetching teams for ${project}:`, error.message);
        throw error;
    }
}
/**
 * Fetch area paths for a project
 *
 * Uses Azure DevOps REST API: GET /{organization}/{project}/_apis/wit/classificationnodes/areas
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @returns Array of area paths (flattened hierarchy)
 */
export async function fetchAreaPathsForProject(organization, project, pat) {
    console.log(`🔍 Fetching area paths for project: ${project}`);
    try {
        const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/classificationnodes/areas?$depth=10&api-version=7.1`;
        const response = await makeRequest(url, pat);
        // Flatten hierarchy into array
        const areaPaths = [];
        flattenAreaPaths(response, areaPaths, project);
        console.log(`✅ Found ${areaPaths.length} area path(s) for project ${project}`);
        return areaPaths;
    }
    catch (error) {
        console.error(`❌ Error fetching area paths for ${project}:`, error.message);
        throw error;
    }
}
/**
 * Flatten area path hierarchy into flat array
 */
function flattenAreaPaths(node, result, projectName, parentPath = '') {
    if (!node)
        return;
    const fullPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
    result.push({
        id: node.id,
        identifier: node.identifier,
        name: node.name,
        path: fullPath,
        hasChildren: node.hasChildren || false,
    });
    // Recursively process children
    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            flattenAreaPaths(child, result, projectName, fullPath);
        }
    }
}
/**
 * Fetch iteration paths for a project
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @returns Array of iteration paths (flattened hierarchy)
 */
export async function fetchIterationPathsForProject(organization, project, pat) {
    console.log(`🔍 Fetching iteration paths for project: ${project}`);
    try {
        const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.1`;
        const response = await makeRequest(url, pat);
        // Flatten hierarchy into array
        const iterationPaths = [];
        flattenIterationPaths(response, iterationPaths, project);
        console.log(`✅ Found ${iterationPaths.length} iteration path(s) for project ${project}`);
        return iterationPaths;
    }
    catch (error) {
        console.error(`❌ Error fetching iteration paths for ${project}:`, error.message);
        throw error;
    }
}
/**
 * Flatten iteration path hierarchy into flat array
 */
function flattenIterationPaths(node, result, projectName, parentPath = '') {
    if (!node)
        return;
    const fullPath = parentPath ? `${parentPath}\\${node.name}` : node.name;
    result.push({
        id: node.id,
        identifier: node.identifier,
        name: node.name,
        path: fullPath,
        attributes: node.attributes || {},
    });
    // Recursively process children
    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            flattenIterationPaths(child, result, projectName, fullPath);
        }
    }
}
/**
 * Resolve area path names to full paths
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @param areaPathNames Array of area path names (can be partial)
 * @returns Map of area path name → full path
 */
export async function resolveAreaPathNames(organization, project, pat, areaPathNames) {
    if (!areaPathNames || areaPathNames.length === 0) {
        return new Map();
    }
    const areaPaths = await fetchAreaPathsForProject(organization, project, pat);
    const pathMap = new Map();
    for (const areaPathName of areaPathNames) {
        // Try exact match first
        const exactMatch = areaPaths.find((ap) => ap.path === areaPathName || ap.name === areaPathName);
        if (exactMatch) {
            pathMap.set(areaPathName, exactMatch.path);
            console.log(`✅ Resolved area path "${areaPathName}" → "${exactMatch.path}"`);
            continue;
        }
        // Try partial match (contains)
        const partialMatch = areaPaths.find((ap) => ap.path.toLowerCase().includes(areaPathName.toLowerCase()) ||
            ap.name.toLowerCase().includes(areaPathName.toLowerCase()));
        if (partialMatch) {
            pathMap.set(areaPathName, partialMatch.path);
            console.log(`✅ Resolved area path "${areaPathName}" → "${partialMatch.path}" (partial match)`);
        }
        else {
            console.warn(`⚠️  Area path "${areaPathName}" not found in project ${project}`);
            // Don't throw - just skip (user may have typo or path doesn't exist)
        }
    }
    return pathMap;
}
/**
 * Get full area paths for a list of names (helper function)
 *
 * @param organization Organization name
 * @param project Project name
 * @param pat Personal Access Token
 * @param areaPathNames Array of area path names
 * @returns Array of full area paths (skips paths not found)
 */
export async function getAreaPaths(organization, project, pat, areaPathNames) {
    const pathMap = await resolveAreaPathNames(organization, project, pat, areaPathNames);
    return Array.from(pathMap.values());
}
/**
 * Make HTTPS request to ADO API
 */
function makeRequest(url, pat) {
    return new Promise((resolve, reject) => {
        const { hostname, pathname, search } = new URL(url);
        const authHeader = 'Basic ' + Buffer.from(`:${pat}`).toString('base64');
        const options = {
            hostname,
            path: pathname + search,
            method: 'GET',
            headers: {
                Authorization: authHeader,
                Accept: 'application/json',
            },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    }
                    else {
                        reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || data}`));
                    }
                }
                catch (error) {
                    reject(new Error(`Failed to parse response: ${data}`));
                }
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
        req.end();
    });
}
//# sourceMappingURL=ado-board-resolver.js.map