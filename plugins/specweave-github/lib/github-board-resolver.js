import { execFileNoThrow } from "../../../src/utils/execFileNoThrow.js";
async function fetchBoardsForRepo(owner, repo) {
  console.log(`\u{1F50D} Fetching project boards for repo: ${owner}/${repo}`);
  try {
    const result = await execFileNoThrow("gh", [
      "api",
      `repos/${owner}/${repo}/projects`,
      "--jq",
      ".[] | {id: .id, name: .name, number: .number, state: .state, html_url: .html_url}",
      "-H",
      "Accept: application/vnd.github+json"
    ]);
    if (result.status !== 0) {
      console.error(`\u274C Failed to fetch boards for ${owner}/${repo}:`, result.stderr);
      throw new Error(`GitHub API error: ${result.status} ${result.stderr}`);
    }
    const boards = result.stdout.trim().split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
    console.log(`\u2705 Found ${boards.length} board(s) for repo ${owner}/${repo}`);
    return boards;
  } catch (error) {
    console.error(`\u274C Error fetching boards for ${owner}/${repo}:`, error.message);
    throw error;
  }
}
async function fetchBoardsForOrg(org) {
  console.log(`\u{1F50D} Fetching project boards for org: ${org}`);
  try {
    const result = await execFileNoThrow("gh", [
      "api",
      `orgs/${org}/projects`,
      "--jq",
      ".[] | {id: .id, name: .name, number: .number, state: .state, html_url: .html_url}",
      "-H",
      "Accept: application/vnd.github+json"
    ]);
    if (result.status !== 0) {
      console.error(`\u274C Failed to fetch boards for org ${org}:`, result.stderr);
      throw new Error(`GitHub API error: ${result.status} ${result.stderr}`);
    }
    const boards = result.stdout.trim().split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
    console.log(`\u2705 Found ${boards.length} board(s) for org ${org}`);
    return boards;
  } catch (error) {
    console.error(`\u274C Error fetching boards for org ${org}:`, error.message);
    throw error;
  }
}
async function resolveBoardNames(owner, repo, boardNames) {
  if (!boardNames || boardNames.length === 0) {
    return /* @__PURE__ */ new Map();
  }
  const boards = await fetchBoardsForRepo(owner, repo);
  const boardMap = /* @__PURE__ */ new Map();
  for (const boardName of boardNames) {
    const board = boards.find(
      (b) => b.name.toLowerCase() === boardName.toLowerCase()
    );
    if (board) {
      boardMap.set(boardName, board.number);
      console.log(`\u2705 Resolved board "${boardName}" \u2192 Number ${board.number}`);
    } else {
      console.warn(`\u26A0\uFE0F  Board "${boardName}" not found in repo ${owner}/${repo}`);
    }
  }
  return boardMap;
}
async function getBoardNumbers(owner, repo, boardNames) {
  const boardMap = await resolveBoardNames(owner, repo, boardNames);
  return Array.from(boardMap.values());
}
export {
  fetchBoardsForOrg,
  fetchBoardsForRepo,
  getBoardNumbers,
  resolveBoardNames
};
