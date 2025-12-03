/**
 * Umbrella Repository Detector
 *
 * Detects umbrella/multi-repo project structures where:
 * - Multiple independent git repositories are cloned into subdirectories
 * - Each child repo should be treated as a module
 * - Clone job has produced a list of repositories
 *
 * Detection strategies (in priority order):
 * 1. Clone job config - reads repos from .specweave/state/jobs/<id>/config.json
 * 2. Umbrella config - reads from config.json umbrella.childRepos
 * 3. Git directory scan - finds all .git directories as module boundaries
 *
 * @module living-docs/umbrella-detector
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import type { ModuleInfo } from './discovery.js';

/**
 * Child repository configuration
 */
export interface ChildRepoConfig {
  /** Unique identifier (usually repo name) */
  id: string;

  /** Relative path from project root */
  path: string;

  /** Display name */
  name: string;

  /** Team this repo belongs to (from ADO area path) */
  team?: string;

  /** ADO area path (e.g., "Acme\\Inventory") */
  areaPath?: string;

  /** When the repo was cloned */
  clonedAt?: string;

  /** Clone status */
  status?: 'cloned' | 'failed' | 'skipped';
}

/**
 * Umbrella configuration (stored in config.json)
 */
export interface UmbrellaConfig {
  /** Is umbrella mode enabled */
  enabled: boolean;

  /** Child repositories */
  childRepos: ChildRepoConfig[];

  /** Source of detection */
  detectedFrom?: 'clone-job' | 'config' | 'git-scan';

  /** When detection occurred */
  detectedAt?: string;
}

/**
 * Clone job configuration (from .specweave/state/jobs/<id>/config.json)
 */
interface CloneJobConfig {
  jobId: string;
  projectPath: string;
  repositories: Array<{
    owner: string;
    name: string;
    path: string;
    cloneUrl: string;
    team?: string;
    areaPath?: string;
  }>;
  startedAt: string;
}

/**
 * Detection result
 */
export interface UmbrellaDetectionResult {
  /** Is this an umbrella project */
  isUmbrella: boolean;

  /** Umbrella configuration (if detected) */
  config: UmbrellaConfig | null;

  /** Converted modules (ready for discovery) */
  modules: ModuleInfo[];

  /** Detection source */
  source: 'clone-job' | 'config' | 'git-scan' | 'none';

  /** Detection stats */
  stats: {
    totalRepos: number;
    clonedRepos: number;
    failedRepos: number;
    detectionTimeMs: number;
  };
}

/**
 * Skip directories when scanning for .git
 */
const SKIP_DIRS = new Set([
  'node_modules',
  '.specweave',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
  'vendor',
  'target',
]);

/**
 * Main entry point: Detect umbrella structure
 *
 * Tries detection strategies in order:
 * 1. Clone job config (most accurate)
 * 2. Config.json umbrella section
 * 3. Git directory scanning (fallback)
 */
export async function detectUmbrellaStructure(
  projectPath: string,
  cloneJobId?: string
): Promise<UmbrellaDetectionResult> {
  const startTime = Date.now();

  // Strategy 1: Load from clone job
  if (cloneJobId) {
    const fromJob = await loadFromCloneJob(projectPath, cloneJobId);
    if (fromJob.isUmbrella) {
      fromJob.stats.detectionTimeMs = Date.now() - startTime;
      return fromJob;
    }
  }

  // Strategy 1b: Find most recent clone job
  const recentJobResult = await loadFromMostRecentCloneJob(projectPath);
  if (recentJobResult.isUmbrella) {
    recentJobResult.stats.detectionTimeMs = Date.now() - startTime;
    return recentJobResult;
  }

  // Strategy 2: Load from config.json
  const fromConfig = await loadFromUmbrellaConfig(projectPath);
  if (fromConfig.isUmbrella) {
    fromConfig.stats.detectionTimeMs = Date.now() - startTime;
    return fromConfig;
  }

  // Strategy 3: Scan for .git directories
  const fromScan = await scanForChildRepos(projectPath);
  fromScan.stats.detectionTimeMs = Date.now() - startTime;
  return fromScan;
}

/**
 * Load umbrella structure from clone job config
 */
export async function loadFromCloneJob(
  projectPath: string,
  jobId: string
): Promise<UmbrellaDetectionResult> {
  const configPath = path.join(
    projectPath,
    '.specweave',
    'state',
    'jobs',
    jobId,
    'config.json'
  );

  const emptyResult: UmbrellaDetectionResult = {
    isUmbrella: false,
    config: null,
    modules: [],
    source: 'none',
    stats: { totalRepos: 0, clonedRepos: 0, failedRepos: 0, detectionTimeMs: 0 },
  };

  if (!fs.existsSync(configPath)) {
    return emptyResult;
  }

  try {
    const jobConfig: CloneJobConfig = JSON.parse(
      fs.readFileSync(configPath, 'utf-8')
    );

    if (!jobConfig.repositories || jobConfig.repositories.length === 0) {
      return emptyResult;
    }

    // Load result.json for status
    const resultPath = path.join(
      projectPath,
      '.specweave',
      'state',
      'jobs',
      jobId,
      'result.json'
    );
    let resultData: { succeeded?: number; failed?: number } = {};
    if (fs.existsSync(resultPath)) {
      resultData = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    }

    // Convert to child repo configs
    const childRepos: ChildRepoConfig[] = jobConfig.repositories.map((repo) => ({
      id: repo.name,
      path: repo.path,
      name: repo.name,
      team: repo.team || extractTeamFromPath(repo.path),
      areaPath: repo.areaPath,
      clonedAt: jobConfig.startedAt,
      status: 'cloned' as const,
    }));

    // Convert to modules
    const modules = await convertReposToModules(projectPath, childRepos);

    return {
      isUmbrella: true,
      config: {
        enabled: true,
        childRepos,
        detectedFrom: 'clone-job',
        detectedAt: new Date().toISOString(),
      },
      modules,
      source: 'clone-job',
      stats: {
        totalRepos: jobConfig.repositories.length,
        clonedRepos: resultData.succeeded || modules.length,
        failedRepos: resultData.failed || 0,
        detectionTimeMs: 0,
      },
    };
  } catch (error) {
    return emptyResult;
  }
}

/**
 * Load from most recent clone job (auto-detect)
 */
async function loadFromMostRecentCloneJob(
  projectPath: string
): Promise<UmbrellaDetectionResult> {
  const jobsDir = path.join(projectPath, '.specweave', 'state', 'jobs');

  const emptyResult: UmbrellaDetectionResult = {
    isUmbrella: false,
    config: null,
    modules: [],
    source: 'none',
    stats: { totalRepos: 0, clonedRepos: 0, failedRepos: 0, detectionTimeMs: 0 },
  };

  if (!fs.existsSync(jobsDir)) {
    return emptyResult;
  }

  try {
    const jobDirs = fs
      .readdirSync(jobsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    // Find clone jobs by checking for config.json with repositories
    for (const jobId of jobDirs.reverse()) {
      // Most recent first
      const configPath = path.join(jobsDir, jobId, 'config.json');
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (config.repositories && config.repositories.length > 0) {
            return loadFromCloneJob(projectPath, jobId);
          }
        } catch {
          continue;
        }
      }
    }

    return emptyResult;
  } catch {
    return emptyResult;
  }
}

/**
 * Load umbrella structure from config.json
 */
export async function loadFromUmbrellaConfig(
  projectPath: string
): Promise<UmbrellaDetectionResult> {
  const configPath = path.join(projectPath, '.specweave', 'config.json');

  const emptyResult: UmbrellaDetectionResult = {
    isUmbrella: false,
    config: null,
    modules: [],
    source: 'none',
    stats: { totalRepos: 0, clonedRepos: 0, failedRepos: 0, detectionTimeMs: 0 },
  };

  if (!fs.existsSync(configPath)) {
    return emptyResult;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (!config.umbrella?.enabled || !config.umbrella?.childRepos?.length) {
      return emptyResult;
    }

    const childRepos: ChildRepoConfig[] = config.umbrella.childRepos;
    const modules = await convertReposToModules(projectPath, childRepos);

    return {
      isUmbrella: true,
      config: {
        enabled: true,
        childRepos,
        detectedFrom: 'config',
        detectedAt: new Date().toISOString(),
      },
      modules,
      source: 'config',
      stats: {
        totalRepos: childRepos.length,
        clonedRepos: modules.length,
        failedRepos: childRepos.length - modules.length,
        detectionTimeMs: 0,
      },
    };
  } catch {
    return emptyResult;
  }
}

/**
 * Scan for child repositories by finding .git directories
 */
export async function scanForChildRepos(
  projectPath: string,
  maxDepth: number = 3
): Promise<UmbrellaDetectionResult> {
  const childRepos: ChildRepoConfig[] = [];

  const emptyResult: UmbrellaDetectionResult = {
    isUmbrella: false,
    config: null,
    modules: [],
    source: 'none',
    stats: { totalRepos: 0, clonedRepos: 0, failedRepos: 0, detectionTimeMs: 0 },
  };

  // Don't scan root .git
  const rootGit = path.join(projectPath, '.git');
  const hasRootGit = fs.existsSync(rootGit);

  /**
   * Recursively scan for .git directories
   */
  function scanDir(dir: string, depth: number): void {
    if (depth > maxDepth) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.') && entry.name !== '.git') continue;

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath);

        // Check if this directory has a .git folder
        const gitPath = path.join(fullPath, '.git');
        if (fs.existsSync(gitPath) && relativePath !== '') {
          // Found a child repo
          childRepos.push({
            id: entry.name,
            path: relativePath,
            name: entry.name,
            team: extractTeamFromPath(relativePath),
            status: 'cloned',
          });
          // Don't recurse into child repos
          continue;
        }

        // Recurse into subdirectories
        scanDir(fullPath, depth + 1);
      }
    } catch {
      // Ignore permission errors
    }
  }

  scanDir(projectPath, 0);

  // Umbrella detection threshold: at least 2 child repos
  if (childRepos.length < 2) {
    return emptyResult;
  }

  const modules = await convertReposToModules(projectPath, childRepos);

  return {
    isUmbrella: true,
    config: {
      enabled: true,
      childRepos,
      detectedFrom: 'git-scan',
      detectedAt: new Date().toISOString(),
    },
    modules,
    source: 'git-scan',
    stats: {
      totalRepos: childRepos.length,
      clonedRepos: modules.length,
      failedRepos: 0,
      detectionTimeMs: 0,
    },
  };
}

/**
 * Convert child repo configs to ModuleInfo format
 */
async function convertReposToModules(
  projectPath: string,
  repos: ChildRepoConfig[]
): Promise<ModuleInfo[]> {
  const modules: ModuleInfo[] = [];

  for (const repo of repos) {
    const fullPath = path.join(projectPath, repo.path);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const moduleInfo = await analyzeChildRepo(fullPath, repo);
    modules.push(moduleInfo);
  }

  // Sort by file count (largest first)
  modules.sort((a, b) => b.fileCount - a.fileCount);

  return modules;
}

/**
 * Analyze a child repository to create ModuleInfo
 */
async function analyzeChildRepo(
  repoPath: string,
  config: ChildRepoConfig
): Promise<ModuleInfo> {
  const info: ModuleInfo = {
    name: config.name,
    path: config.path,
    fileCount: 0,
    estimatedLOC: 0,
    hasTests: false,
    hasReadme: false,
    entryPoints: [],
    extensions: {},
  };

  // Quick scan for stats (don't recurse too deep)
  try {
    await scanRepoStats(repoPath, info, 0, 5);
  } catch {
    // Ignore errors
  }

  // Check for common entry points
  const entryPointPatterns = [
    'index.ts',
    'index.js',
    'main.ts',
    'main.js',
    'app.ts',
    'app.js',
    'src/index.ts',
    'src/index.js',
    'src/main.ts',
    'src/main.js',
  ];

  for (const pattern of entryPointPatterns) {
    if (fs.existsSync(path.join(repoPath, pattern))) {
      info.entryPoints.push(pattern);
    }
  }

  // Check for README
  const readmePatterns = ['README.md', 'readme.md', 'README'];
  for (const pattern of readmePatterns) {
    if (fs.existsSync(path.join(repoPath, pattern))) {
      info.hasReadme = true;
      break;
    }
  }

  // Check for tests
  const testPatterns = ['tests', 'test', '__tests__', 'spec'];
  for (const pattern of testPatterns) {
    if (fs.existsSync(path.join(repoPath, pattern))) {
      info.hasTests = true;
      break;
    }
  }

  return info;
}

/**
 * Scan repository stats (file count, extensions, LOC estimate)
 */
async function scanRepoStats(
  dir: string,
  info: ModuleInfo,
  depth: number,
  maxDepth: number
): Promise<void> {
  if (depth > maxDepth) return;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) {
          continue;
        }
        await scanRepoStats(fullPath, info, depth + 1, maxDepth);
      } else if (entry.isFile()) {
        info.fileCount++;

        const ext = path.extname(entry.name).toLowerCase();
        info.extensions[ext] = (info.extensions[ext] || 0) + 1;

        // Estimate LOC for code files
        if (isCodeFile(ext)) {
          try {
            const stat = fs.statSync(fullPath);
            info.estimatedLOC += Math.round(stat.size / 40);
          } catch {
            // Ignore
          }
        }

        // Check for test files
        if (
          entry.name.includes('.test.') ||
          entry.name.includes('.spec.') ||
          entry.name.includes('_test.')
        ) {
          info.hasTests = true;
        }
      }
    }
  } catch {
    // Ignore permission errors
  }
}

/**
 * Check if extension is a code file
 */
function isCodeFile(ext: string): boolean {
  const codeExtensions = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.go',
    '.rs',
    '.java',
    '.kt',
    '.cs',
    '.cpp',
    '.c',
    '.rb',
    '.php',
    '.swift',
    '.vue',
    '.svelte',
  ]);
  return codeExtensions.has(ext);
}

/**
 * Extract team name from path
 * e.g., "acme/inventory-fe" -> "inventory"
 */
function extractTeamFromPath(repoPath: string): string | undefined {
  const parts = repoPath.split('/');

  if (parts.length >= 2) {
    // Pattern: org/team-suffix -> team
    const repoName = parts[parts.length - 1];
    // Remove common suffixes
    const team = repoName
      .replace(/-fe$/, '')
      .replace(/-be$/, '')
      .replace(/-api$/, '')
      .replace(/-web$/, '')
      .replace(/-mobile$/, '')
      .replace(/-backend$/, '')
      .replace(/-frontend$/, '')
      .replace(/-service$/, '')
      .replace(/-srv$/, '');

    return team;
  }

  return undefined;
}

/**
 * Persist umbrella config to config.json
 */
export async function persistUmbrellaConfig(
  projectPath: string,
  umbrellaConfig: UmbrellaConfig
): Promise<void> {
  const configPath = path.join(projectPath, '.specweave', 'config.json');

  let config: Record<string, any> = {};

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // Start fresh if parse fails
    }
  }

  config.umbrella = {
    enabled: umbrellaConfig.enabled,
    childRepos: umbrellaConfig.childRepos,
    detectedFrom: umbrellaConfig.detectedFrom,
    detectedAt: umbrellaConfig.detectedAt,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
