/**
 * GitHub Project Board Resolution for Hierarchical Sync
 *
 * Resolves project board names to board IDs for use in search queries.
 * Supports both GitHub Classic Projects (v1) and Projects v2 (beta).
 */

import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';

/**
 * GitHub Project Board (Classic Projects)
 */
export interface GitHubProjectBoard {
  id: number;
  name: string;
  number: number;
  state: 'open' | 'closed';
  html_url: string;
}

/**
 * Fetch all project boards for a GitHub repository
 *
 * Uses GitHub CLI: gh api repos/{owner}/{repo}/projects
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @returns Array of project boards
 */
export async function fetchBoardsForRepo(
  owner: string,
  repo: string
): Promise<GitHubProjectBoard[]> {
  console.log(`🔍 Fetching project boards for repo: ${owner}/${repo}`);

  try {
    const result = await execFileNoThrow('gh', [
      'api',
      `repos/${owner}/${repo}/projects`,
      '--jq',
      '.[] | {id: .id, name: .name, number: .number, state: .state, html_url: .html_url}',
      '-H',
      'Accept: application/vnd.github+json',
    ]);

    if (result.status !== 0) {
      console.error(`❌ Failed to fetch boards for ${owner}/${repo}:`, result.stderr);
      throw new Error(`GitHub API error: ${result.status} ${result.stderr}`);
    }

    // Parse JSONL (one JSON object per line)
    const boards: GitHubProjectBoard[] = result.stdout
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    console.log(`✅ Found ${boards.length} board(s) for repo ${owner}/${repo}`);

    return boards;
  } catch (error) {
    console.error(`❌ Error fetching boards for ${owner}/${repo}:`, (error as Error).message);
    throw error;
  }
}

/**
 * Fetch organization-level project boards
 *
 * Uses GitHub CLI: gh api orgs/{org}/projects
 *
 * @param org Organization name
 * @returns Array of organization project boards
 */
export async function fetchBoardsForOrg(
  org: string
): Promise<GitHubProjectBoard[]> {
  console.log(`🔍 Fetching project boards for org: ${org}`);

  try {
    const result = await execFileNoThrow('gh', [
      'api',
      `orgs/${org}/projects`,
      '--jq',
      '.[] | {id: .id, name: .name, number: .number, state: .state, html_url: .html_url}',
      '-H',
      'Accept: application/vnd.github+json',
    ]);

    if (result.status !== 0) {
      console.error(`❌ Failed to fetch boards for org ${org}:`, result.stderr);
      throw new Error(`GitHub API error: ${result.status} ${result.stderr}`);
    }

    // Parse JSONL
    const boards: GitHubProjectBoard[] = result.stdout
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    console.log(`✅ Found ${boards.length} board(s) for org ${org}`);

    return boards;
  } catch (error) {
    console.error(`❌ Error fetching boards for org ${org}:`, (error as Error).message);
    throw error;
  }
}

/**
 * Resolve board names to board numbers (for repo-level projects)
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @param boardNames Array of board names to resolve
 * @returns Map of board name → board number
 */
export async function resolveBoardNames(
  owner: string,
  repo: string,
  boardNames: string[]
): Promise<Map<string, number>> {
  if (!boardNames || boardNames.length === 0) {
    return new Map();
  }

  const boards = await fetchBoardsForRepo(owner, repo);

  const boardMap = new Map<string, number>();

  for (const boardName of boardNames) {
    const board = boards.find(
      (b) => b.name.toLowerCase() === boardName.toLowerCase()
    );

    if (board) {
      boardMap.set(boardName, board.number);
      console.log(`✅ Resolved board "${boardName}" → Number ${board.number}`);
    } else {
      console.warn(`⚠️  Board "${boardName}" not found in repo ${owner}/${repo}`);
      // Don't throw - just skip this board (user may have typo or board was deleted)
    }
  }

  return boardMap;
}

/**
 * Get board numbers for a list of board names (helper function)
 *
 * @param owner Repository owner
 * @param repo Repository name
 * @param boardNames Array of board names
 * @returns Array of board numbers (skips boards not found)
 */
export async function getBoardNumbers(
  owner: string,
  repo: string,
  boardNames: string[]
): Promise<number[]> {
  const boardMap = await resolveBoardNames(owner, repo, boardNames);
  return Array.from(boardMap.values());
}
