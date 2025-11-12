async function fetchBoardsForProject(client, projectKey) {
  console.log(`\u{1F50D} Fetching boards for project: ${projectKey}`);
  try {
    const baseUrl = client.baseUrl;
    const authHeader = client.getAuthHeader();
    const url = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      const error = await response.text();
      console.error(`\u274C Failed to fetch boards for ${projectKey}:`, error);
      throw new Error(`Jira API error: ${response.status} ${error}`);
    }
    const data = await response.json();
    const boards = data.values || [];
    console.log(`\u2705 Found ${boards.length} board(s) for project ${projectKey}`);
    return boards;
  } catch (error) {
    console.error(`\u274C Error fetching boards for ${projectKey}:`, error.message);
    throw error;
  }
}
async function resolveBoardNames(client, projectKey, boardNames) {
  if (!boardNames || boardNames.length === 0) {
    return /* @__PURE__ */ new Map();
  }
  const boards = await fetchBoardsForProject(client, projectKey);
  const boardMap = /* @__PURE__ */ new Map();
  for (const boardName of boardNames) {
    const board = boards.find(
      (b) => b.name.toLowerCase() === boardName.toLowerCase()
    );
    if (board) {
      boardMap.set(boardName, board.id);
      console.log(`\u2705 Resolved board "${boardName}" \u2192 ID ${board.id}`);
    } else {
      console.warn(`\u26A0\uFE0F  Board "${boardName}" not found in project ${projectKey}`);
    }
  }
  return boardMap;
}
async function getBoardIds(client, projectKey, boardNames) {
  const boardMap = await resolveBoardNames(client, projectKey, boardNames);
  return Array.from(boardMap.values());
}
export {
  fetchBoardsForProject,
  getBoardIds,
  resolveBoardNames
};
