/**
 * Jira Board Resolution for Hierarchical Sync
 *
 * Resolves board names to board IDs for use in JQL queries.
 * Supports Jira Agile (Software) boards.
 */
/**
 * Fetch all boards for a Jira project
 *
 * Uses Jira Agile REST API: GET /rest/agile/1.0/board?projectKeyOrId={projectKey}
 *
 * @param client JiraClient instance
 * @param projectKey Jira project key (e.g., "PROJECT-A")
 * @returns Array of boards in the project
 */
export async function fetchBoardsForProject(client, projectKey) {
    console.log(`🔍 Fetching boards for project: ${projectKey}`);
    try {
        // Access private baseUrl and getAuthHeader via reflection (not ideal but necessary)
        const baseUrl = client.baseUrl;
        const authHeader = client.getAuthHeader();
        const url = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ Failed to fetch boards for ${projectKey}:`, error);
            throw new Error(`Jira API error: ${response.status} ${error}`);
        }
        const data = await response.json();
        const boards = data.values || [];
        console.log(`✅ Found ${boards.length} board(s) for project ${projectKey}`);
        return boards;
    }
    catch (error) {
        console.error(`❌ Error fetching boards for ${projectKey}:`, error.message);
        throw error;
    }
}
/**
 * Resolve board names to board IDs
 *
 * @param client JiraClient instance
 * @param projectKey Jira project key
 * @param boardNames Array of board names to resolve
 * @returns Map of board name → board ID
 */
export async function resolveBoardNames(client, projectKey, boardNames) {
    if (!boardNames || boardNames.length === 0) {
        return new Map();
    }
    const boards = await fetchBoardsForProject(client, projectKey);
    const boardMap = new Map();
    for (const boardName of boardNames) {
        const board = boards.find((b) => b.name.toLowerCase() === boardName.toLowerCase());
        if (board) {
            boardMap.set(boardName, board.id);
            console.log(`✅ Resolved board "${boardName}" → ID ${board.id}`);
        }
        else {
            console.warn(`⚠️  Board "${boardName}" not found in project ${projectKey}`);
            // Don't throw - just skip this board (user may have typo or board was deleted)
        }
    }
    return boardMap;
}
/**
 * Get board IDs for a list of board names (helper function)
 *
 * @param client JiraClient instance
 * @param projectKey Jira project key
 * @param boardNames Array of board names
 * @returns Array of board IDs (skips boards not found)
 */
export async function getBoardIds(client, projectKey, boardNames) {
    const boardMap = await resolveBoardNames(client, projectKey, boardNames);
    return Array.from(boardMap.values());
}
//# sourceMappingURL=jira-board-resolver.js.map