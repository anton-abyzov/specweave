import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scanMisplacedRepos } from '../../src/cli/helpers/init/path-utils.js';

describe('scanMisplacedRepos', () => {
  let testRoot: string;

  beforeEach(() => {
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'specweave-misplaced-'));
  });

  afterEach(() => {
    fs.rmSync(testRoot, { recursive: true, force: true });
  });

  it('returns empty array when no repositories/ directory exists', () => {
    expect(scanMisplacedRepos(testRoot)).toEqual([]);
  });

  it('returns empty array when repositories/ is empty', () => {
    fs.mkdirSync(path.join(testRoot, 'repositories'));
    expect(scanMisplacedRepos(testRoot)).toEqual([]);
  });

  it('returns empty array when all repos follow standard 2-level {org}/{repo} pattern', () => {
    const repoPath = path.join(testRoot, 'repositories', 'my-org', 'my-repo');
    fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
    expect(scanMisplacedRepos(testRoot)).toEqual([]);
  });

  it('returns repo name when repo is at depth 1 with .git present', () => {
    const repoPath = path.join(testRoot, 'repositories', 'my-repo');
    fs.mkdirSync(path.join(repoPath, '.git'), { recursive: true });
    expect(scanMisplacedRepos(testRoot)).toEqual(['my-repo']);
  });

  it('returns multiple names when multiple repos are misplaced', () => {
    for (const name of ['repo-a', 'repo-b', 'repo-c']) {
      fs.mkdirSync(path.join(testRoot, 'repositories', name, '.git'), { recursive: true });
    }
    const result = scanMisplacedRepos(testRoot);
    expect(result.sort()).toEqual(['repo-a', 'repo-b', 'repo-c']);
  });

  it('ignores depth-1 directories that have no .git', () => {
    // A non-git directory at depth 1 (could be an org subfolder with no repos yet)
    fs.mkdirSync(path.join(testRoot, 'repositories', 'my-org'), { recursive: true });
    expect(scanMisplacedRepos(testRoot)).toEqual([]);
  });

  it('ignores hidden directories (starting with dot)', () => {
    fs.mkdirSync(path.join(testRoot, 'repositories', '.hidden', '.git'), { recursive: true });
    expect(scanMisplacedRepos(testRoot)).toEqual([]);
  });

  it('does not return standard 2-level repos even if misplaced ones also exist', () => {
    // Standard: repositories/my-org/good-repo/.git
    fs.mkdirSync(path.join(testRoot, 'repositories', 'my-org', 'good-repo', '.git'), { recursive: true });
    // Misplaced: repositories/bad-repo/.git
    fs.mkdirSync(path.join(testRoot, 'repositories', 'bad-repo', '.git'), { recursive: true });
    expect(scanMisplacedRepos(testRoot)).toEqual(['bad-repo']);
  });

  it('ignores files at depth 1 (not directories)', () => {
    fs.mkdirSync(path.join(testRoot, 'repositories'), { recursive: true });
    fs.writeFileSync(path.join(testRoot, 'repositories', 'README.md'), '');
    expect(scanMisplacedRepos(testRoot)).toEqual([]);
  });
});
