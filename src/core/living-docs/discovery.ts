/**
 * Living Docs Builder - Discovery Phase
 *
 * Scans the codebase structure without LLM calls to:
 * - Count files by type and extension
 * - Detect tech stack from config files
 * - Find existing documentation
 * - Identify entry points
 * - Group files into modules
 * - Calculate sampling tier
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import {
  detectUmbrellaStructure,
  persistUmbrellaConfig,
  type UmbrellaDetectionResult,
} from './umbrella-detector.js';

/**
 * Module information discovered from directory structure
 */
export interface ModuleInfo {
  name: string;
  path: string;
  fileCount: number;
  estimatedLOC: number;
  hasTests: boolean;
  hasReadme: boolean;
  entryPoints: string[];
  extensions: Record<string, number>;
}

/**
 * Sampling configuration based on codebase size
 */
export interface SamplingConfig {
  tier: 'small' | 'medium' | 'large' | 'massive';
  filesPerDir: number | 'all';
  priorityPatterns: string[];
  skipPatterns: string[];
}

/**
 * Complete discovery result
 */
export interface DiscoveryResult {
  codebaseStats: {
    totalFiles: number;
    totalDirs: number;
    byExtension: Record<string, number>;
    byType: {
      code: number;
      tests: number;
      docs: number;
      config: number;
      assets: number;
    };
    estimatedLOC: number;
  };

  techStack: {
    languages: string[];
    frameworks: string[];
    buildTools: string[];
    testFrameworks: string[];
    detectedFrom: string[];
  };

  existingDocs: {
    readme: string | null;
    contributing: string | null;
    docsFolder: string | null;
    wikiFolder: string | null;
    mdFiles: string[];
  };

  entryPoints: {
    main: string[];
    index: string[];
    exports: string[];
  };

  modules: ModuleInfo[];
  tier: SamplingConfig['tier'];
  samplingConfig: SamplingConfig;
  discoveredAt: string;

  /** Languages detected from file extensions (v1.0.258+) */
  languagesDetected: string[];

  /** Umbrella detection result (v0.31.0+) */
  umbrella?: {
    /** Is this an umbrella project */
    isUmbrella: boolean;
    /** Detection source */
    source: 'clone-job' | 'config' | 'git-scan' | 'none';
    /** Number of child repos */
    childRepoCount: number;
  };
}

/**
 * Skip patterns for directories that should not be scanned
 */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
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
  'env',
  '.env',
  'vendor',
  'target', // Rust
  'bin',
  'obj', // .NET
]);

/**
 * Extension to file type mapping
 */
const EXTENSION_TYPES: Record<string, 'code' | 'tests' | 'docs' | 'config' | 'assets'> = {
  // Code
  '.ts': 'code',
  '.tsx': 'code',
  '.js': 'code',
  '.jsx': 'code',
  '.mjs': 'code',
  '.cjs': 'code',
  '.py': 'code',
  '.go': 'code',
  '.rs': 'code',
  '.java': 'code',
  '.kt': 'code',
  '.cs': 'code',
  '.cpp': 'code',
  '.c': 'code',
  '.h': 'code',
  '.hpp': 'code',
  '.rb': 'code',
  '.php': 'code',
  '.swift': 'code',
  '.scala': 'code',
  '.vue': 'code',
  '.svelte': 'code',
  // Docs
  '.md': 'docs',
  '.mdx': 'docs',
  '.rst': 'docs',
  '.txt': 'docs',
  '.adoc': 'docs',
  // Config
  '.json': 'config',
  '.yaml': 'config',
  '.yml': 'config',
  '.toml': 'config',
  '.xml': 'config',
  '.ini': 'config',
  '.env': 'config',
  // Assets
  '.png': 'assets',
  '.jpg': 'assets',
  '.jpeg': 'assets',
  '.gif': 'assets',
  '.svg': 'assets',
  '.ico': 'assets',
  '.woff': 'assets',
  '.woff2': 'assets',
  '.ttf': 'assets',
  '.eot': 'assets',
};

/**
 * Test file patterns
 */
const TEST_PATTERNS = [
  /\.test\./,
  /\.spec\./,
  /_test\./,
  /_spec\./,
  /test_/,
  /spec_/,
  /__tests__/,
  /tests\//,
];

/**
 * Extension to language name mapping for LSP bootstrap
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.php': 'php',
  '.rb': 'ruby',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.scala': 'scala',
  '.vue': 'typescript', // Vue uses TS/JS
  '.svelte': 'typescript', // Svelte uses TS/JS
};

/** Minimum file count per language to include in languagesDetected */
const LANGUAGE_DETECTION_THRESHOLD = 5;

/**
 * Count actual lines of code in a file, excluding blank lines and comment-only lines.
 *
 * @param filePath - Absolute path to the file
 * @returns Number of non-blank, non-comment lines, or 0 on error
 */
function countCodeLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let count = 0;
    let inBlockComment = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (inBlockComment) {
        if (trimmed.includes('*/')) inBlockComment = false;
        continue;
      }
      if (trimmed === '') continue; // blank line
      if (trimmed.startsWith('//')) continue; // single-line comment (JS/TS/Go/Rust/Java/C#)
      if (trimmed.startsWith('#') && !trimmed.startsWith('#!')) continue; // Python/Ruby comment (not shebang)
      if (trimmed.startsWith('/*')) {
        if (!trimmed.endsWith('*/')) inBlockComment = true;
        continue;
      }
      count++;
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * Derive languagesDetected from byExtension frequency data.
 * Only includes languages with files >= LANGUAGE_DETECTION_THRESHOLD.
 */
function deriveLanguagesDetected(byExtension: Record<string, number>): string[] {
  const langCounts: Record<string, number> = {};
  for (const [ext, count] of Object.entries(byExtension)) {
    const lang = EXTENSION_TO_LANGUAGE[ext];
    if (lang) {
      langCounts[lang] = (langCounts[lang] || 0) + count;
    }
  }
  return Object.entries(langCounts)
    .filter(([, count]) => count >= LANGUAGE_DETECTION_THRESHOLD)
    .map(([lang]) => lang)
    .sort();
}

/**
 * Progress callback type
 */
export type DiscoveryProgressCallback = (
  current: number,
  total: number,
  currentDir: string
) => void;

/**
 * Run the discovery phase
 */
export async function runDiscovery(
  projectPath: string,
  additionalSources: string[],
  onProgress?: DiscoveryProgressCallback
): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    codebaseStats: {
      totalFiles: 0,
      totalDirs: 0,
      byExtension: {},
      byType: { code: 0, tests: 0, docs: 0, config: 0, assets: 0 },
      estimatedLOC: 0,
    },
    techStack: {
      languages: [],
      frameworks: [],
      buildTools: [],
      testFrameworks: [],
      detectedFrom: [],
    },
    existingDocs: {
      readme: null,
      contributing: null,
      docsFolder: null,
      wikiFolder: null,
      mdFiles: [],
    },
    entryPoints: {
      main: [],
      index: [],
      exports: [],
    },
    modules: [],
    tier: 'small',
    samplingConfig: calculateTier(0),
    discoveredAt: new Date().toISOString(),
    languagesDetected: [],
  };

  // First pass: count directories for progress
  const dirs = await countDirectories(projectPath);
  let processedDirs = 0;

  // Scan project structure
  await scanDirectory(projectPath, projectPath, result, (dir) => {
    processedDirs++;
    onProgress?.(processedDirs, dirs, dir);
  });

  // Scan additional sources
  for (const source of additionalSources) {
    const fullPath = path.isAbsolute(source) ? source : path.join(projectPath, source);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      await scanDirectory(fullPath, projectPath, result, (dir) => {
        onProgress?.(processedDirs, dirs, `[additional] ${dir}`);
      });
    }
  }

  // Detect tech stack from config files (root level)
  detectTechStack(projectPath, result);

  // Find existing documentation
  findExistingDocs(projectPath, result);

  // Identify entry points
  findEntryPoints(projectPath, result);

  // Check for umbrella/multi-repo structure first (v0.31.0+)
  const umbrellaResult = await detectUmbrellaStructure(projectPath);

  if (umbrellaResult.isUmbrella && umbrellaResult.modules.length > 0) {
    // Umbrella project: use child repos as modules
    result.modules = umbrellaResult.modules;
    result.umbrella = {
      isUmbrella: true,
      source: umbrellaResult.source,
      childRepoCount: umbrellaResult.stats.totalRepos,
    };

    // Run per-module tech stack detection for umbrella projects
    await detectTechStackPerModule(projectPath, result);

    // Persist umbrella config for future runs
    if (umbrellaResult.config) {
      await persistUmbrellaConfig(projectPath, umbrellaResult.config);
    }
  } else {
    // Standard project: build modules from directory structure
    buildModules(projectPath, result);
    result.umbrella = {
      isUmbrella: false,
      source: 'none',
      childRepoCount: 0,
    };
  }

  // Calculate sampling tier
  result.tier = calculateTier(result.codebaseStats.totalFiles).tier;
  result.samplingConfig = calculateTier(result.codebaseStats.totalFiles);

  // Derive detected languages from extension frequency
  result.languagesDetected = deriveLanguagesDetected(result.codebaseStats.byExtension);

  return result;
}

/**
 * Count directories for progress estimation
 */
async function countDirectories(dirPath: string, count = 0): Promise<number> {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    let total = 1;

    for (const entry of entries) {
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        total += await countDirectories(path.join(dirPath, entry.name), total);
      }
    }

    return total;
  } catch {
    return count;
  }
}

/**
 * Recursively scan a directory
 */
async function scanDirectory(
  dirPath: string,
  projectRoot: string,
  result: DiscoveryResult,
  onDir: (dir: string) => void,
  depth = 0
): Promise<void> {
  if (depth > 15) return; // Prevent infinite recursion

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    result.codebaseStats.totalDirs++;
    onDir(path.relative(projectRoot, dirPath) || '.');

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(projectRoot, fullPath);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          await scanDirectory(fullPath, projectRoot, result, onDir, depth + 1);
        }
      } else if (entry.isFile()) {
        result.codebaseStats.totalFiles++;

        const ext = path.extname(entry.name).toLowerCase();
        result.codebaseStats.byExtension[ext] = (result.codebaseStats.byExtension[ext] || 0) + 1;

        // Categorize by type
        const fileType = EXTENSION_TYPES[ext] || 'assets';
        const isTest = TEST_PATTERNS.some(p => p.test(relativePath));

        if (isTest) {
          result.codebaseStats.byType.tests++;
        } else {
          result.codebaseStats.byType[fileType]++;
        }

        // Count actual lines of code (excluding blanks and comments)
        if (fileType === 'code' && !isTest) {
          result.codebaseStats.estimatedLOC += countCodeLines(fullPath);
        }
      }
    }
  } catch {
    // Ignore permission errors
  }
}

/**
 * Detect tech stack from config files
 */
function detectTechStack(projectPath: string, result: DiscoveryResult): void {
  // Check package.json (Node.js/JavaScript/TypeScript)
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      result.techStack.detectedFrom.push('package.json');

      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      // Languages
      if (allDeps.typescript || fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
        result.techStack.languages.push('TypeScript');
      } else {
        result.techStack.languages.push('JavaScript');
      }

      // Frameworks
      if (allDeps.next) result.techStack.frameworks.push('Next.js');
      if (allDeps.react) result.techStack.frameworks.push('React');
      if (allDeps.vue) result.techStack.frameworks.push('Vue');
      if (allDeps.angular || allDeps['@angular/core']) result.techStack.frameworks.push('Angular');
      if (allDeps.svelte) result.techStack.frameworks.push('Svelte');
      if (allDeps.express) result.techStack.frameworks.push('Express');
      if (allDeps.fastify) result.techStack.frameworks.push('Fastify');
      if (allDeps.nestjs || allDeps['@nestjs/core']) result.techStack.frameworks.push('NestJS');

      // Build tools
      if (allDeps.webpack) result.techStack.buildTools.push('Webpack');
      if (allDeps.vite) result.techStack.buildTools.push('Vite');
      if (allDeps.esbuild) result.techStack.buildTools.push('esbuild');
      if (allDeps.rollup) result.techStack.buildTools.push('Rollup');
      if (allDeps.parcel) result.techStack.buildTools.push('Parcel');

      // Test frameworks
      if (allDeps.jest) result.techStack.testFrameworks.push('Jest');
      if (allDeps.vitest) result.techStack.testFrameworks.push('Vitest');
      if (allDeps.mocha) result.techStack.testFrameworks.push('Mocha');
      if (allDeps.playwright || allDeps['@playwright/test']) result.techStack.testFrameworks.push('Playwright');
      if (allDeps.cypress) result.techStack.testFrameworks.push('Cypress');
    } catch {
      // Ignore parse errors
    }
  }

  // Check requirements.txt / pyproject.toml (Python)
  const requirementsPath = path.join(projectPath, 'requirements.txt');
  const pyprojectPath = path.join(projectPath, 'pyproject.toml');
  if (fs.existsSync(requirementsPath) || fs.existsSync(pyprojectPath)) {
    result.techStack.languages.push('Python');
    result.techStack.detectedFrom.push(fs.existsSync(pyprojectPath) ? 'pyproject.toml' : 'requirements.txt');

    // Try to detect frameworks
    try {
      const content = fs.existsSync(pyprojectPath)
        ? fs.readFileSync(pyprojectPath, 'utf-8')
        : fs.readFileSync(requirementsPath, 'utf-8');

      if (content.includes('django')) result.techStack.frameworks.push('Django');
      if (content.includes('fastapi')) result.techStack.frameworks.push('FastAPI');
      if (content.includes('flask')) result.techStack.frameworks.push('Flask');
      if (content.includes('pytest')) result.techStack.testFrameworks.push('pytest');
    } catch {
      // Ignore read errors
    }
  }

  // Check go.mod (Go)
  const goModPath = path.join(projectPath, 'go.mod');
  if (fs.existsSync(goModPath)) {
    result.techStack.languages.push('Go');
    result.techStack.detectedFrom.push('go.mod');

    try {
      const content = fs.readFileSync(goModPath, 'utf-8');
      if (content.includes('gin-gonic')) result.techStack.frameworks.push('Gin');
      if (content.includes('echo')) result.techStack.frameworks.push('Echo');
      if (content.includes('fiber')) result.techStack.frameworks.push('Fiber');
    } catch {
      // Ignore read errors
    }
  }

  // Check Cargo.toml (Rust)
  const cargoPath = path.join(projectPath, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    result.techStack.languages.push('Rust');
    result.techStack.detectedFrom.push('Cargo.toml');

    try {
      const content = fs.readFileSync(cargoPath, 'utf-8');
      if (content.includes('actix')) result.techStack.frameworks.push('Actix');
      if (content.includes('axum')) result.techStack.frameworks.push('Axum');
      if (content.includes('rocket')) result.techStack.frameworks.push('Rocket');
    } catch {
      // Ignore read errors
    }
  }

  // Check pom.xml / build.gradle (Java)
  const pomPath = path.join(projectPath, 'pom.xml');
  const gradlePath = path.join(projectPath, 'build.gradle');
  if (fs.existsSync(pomPath) || fs.existsSync(gradlePath)) {
    result.techStack.languages.push('Java');
    result.techStack.detectedFrom.push(fs.existsSync(pomPath) ? 'pom.xml' : 'build.gradle');

    if (fs.existsSync(gradlePath)) {
      result.techStack.buildTools.push('Gradle');
    } else {
      result.techStack.buildTools.push('Maven');
    }
  }

  // Deduplicate
  result.techStack.languages = [...new Set(result.techStack.languages)];
  result.techStack.frameworks = [...new Set(result.techStack.frameworks)];
  result.techStack.buildTools = [...new Set(result.techStack.buildTools)];
  result.techStack.testFrameworks = [...new Set(result.techStack.testFrameworks)];
}

/**
 * Detect tech stack for each module in umbrella projects (v0.31.0+)
 *
 * Runs detectTechStack-like logic per module and aggregates results.
 * This provides accurate tech stack detection when each child repo
 * has its own package.json/go.mod/etc.
 */
async function detectTechStackPerModule(
  projectPath: string,
  result: DiscoveryResult
): Promise<void> {
  const allLanguages = new Set<string>(result.techStack.languages);
  const allFrameworks = new Set<string>(result.techStack.frameworks);
  const allBuildTools = new Set<string>(result.techStack.buildTools);
  const allTestFrameworks = new Set<string>(result.techStack.testFrameworks);
  const detectedFrom = new Set<string>(result.techStack.detectedFrom);

  for (const module of result.modules) {
    const modulePath = path.join(projectPath, module.path);

    // Check package.json (Node.js/JavaScript/TypeScript)
    const packageJsonPath = path.join(modulePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        detectedFrom.add(`${module.name}/package.json`);

        const allDeps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };

        // Languages
        if (allDeps.typescript || fs.existsSync(path.join(modulePath, 'tsconfig.json'))) {
          allLanguages.add('TypeScript');
        } else if (Object.keys(allDeps).length > 0) {
          allLanguages.add('JavaScript');
        }

        // Frameworks
        if (allDeps.next) allFrameworks.add('Next.js');
        if (allDeps.react) allFrameworks.add('React');
        if (allDeps.vue) allFrameworks.add('Vue');
        if (allDeps.angular || allDeps['@angular/core']) allFrameworks.add('Angular');
        if (allDeps.svelte) allFrameworks.add('Svelte');
        if (allDeps.express) allFrameworks.add('Express');
        if (allDeps.fastify) allFrameworks.add('Fastify');
        if (allDeps.nestjs || allDeps['@nestjs/core']) allFrameworks.add('NestJS');
        if (allDeps['@microsoft/signalr']) allFrameworks.add('SignalR');

        // Build tools
        if (allDeps.webpack) allBuildTools.add('Webpack');
        if (allDeps.vite) allBuildTools.add('Vite');
        if (allDeps.esbuild) allBuildTools.add('esbuild');
        if (allDeps.rollup) allBuildTools.add('Rollup');
        if (allDeps.parcel) allBuildTools.add('Parcel');
        if (allDeps['@nx/react'] || allDeps['@nrwl/react'] || allDeps.nx) allBuildTools.add('Nx');

        // Test frameworks
        if (allDeps.jest) allTestFrameworks.add('Jest');
        if (allDeps.vitest) allTestFrameworks.add('Vitest');
        if (allDeps.mocha) allTestFrameworks.add('Mocha');
        if (allDeps.playwright || allDeps['@playwright/test']) allTestFrameworks.add('Playwright');
        if (allDeps.cypress) allTestFrameworks.add('Cypress');
      } catch {
        // Ignore parse errors
      }
    }

    // Check requirements.txt / pyproject.toml (Python)
    const requirementsPath = path.join(modulePath, 'requirements.txt');
    const pyprojectPath = path.join(modulePath, 'pyproject.toml');
    if (fs.existsSync(requirementsPath) || fs.existsSync(pyprojectPath)) {
      allLanguages.add('Python');
      detectedFrom.add(`${module.name}/${fs.existsSync(pyprojectPath) ? 'pyproject.toml' : 'requirements.txt'}`);

      try {
        const content = fs.existsSync(pyprojectPath)
          ? fs.readFileSync(pyprojectPath, 'utf-8')
          : fs.readFileSync(requirementsPath, 'utf-8');

        if (content.includes('django')) allFrameworks.add('Django');
        if (content.includes('fastapi')) allFrameworks.add('FastAPI');
        if (content.includes('flask')) allFrameworks.add('Flask');
        if (content.includes('pytest')) allTestFrameworks.add('pytest');
      } catch {
        // Ignore read errors
      }
    }

    // Check go.mod (Go)
    const goModPath = path.join(modulePath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      allLanguages.add('Go');
      detectedFrom.add(`${module.name}/go.mod`);

      try {
        const content = fs.readFileSync(goModPath, 'utf-8');
        if (content.includes('gin-gonic')) allFrameworks.add('Gin');
        if (content.includes('echo')) allFrameworks.add('Echo');
        if (content.includes('fiber')) allFrameworks.add('Fiber');
      } catch {
        // Ignore read errors
      }
    }

    // Check .csproj files (C#/.NET)
    try {
      const entries = fs.readdirSync(modulePath);
      const csprojFiles = entries.filter(e => e.endsWith('.csproj'));
      if (csprojFiles.length > 0) {
        allLanguages.add('C#');
        detectedFrom.add(`${module.name}/*.csproj`);

        // Try to detect .NET frameworks
        for (const csprojFile of csprojFiles.slice(0, 2)) {
          try {
            const content = fs.readFileSync(path.join(modulePath, csprojFile), 'utf-8');
            if (content.includes('Microsoft.AspNetCore')) allFrameworks.add('ASP.NET Core');
            if (content.includes('Microsoft.EntityFrameworkCore')) allFrameworks.add('Entity Framework');
            if (content.includes('xunit')) allTestFrameworks.add('xUnit');
            if (content.includes('NUnit')) allTestFrameworks.add('NUnit');
          } catch {
            // Ignore read errors
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }

    // Check Cargo.toml (Rust)
    const cargoPath = path.join(modulePath, 'Cargo.toml');
    if (fs.existsSync(cargoPath)) {
      allLanguages.add('Rust');
      detectedFrom.add(`${module.name}/Cargo.toml`);

      try {
        const content = fs.readFileSync(cargoPath, 'utf-8');
        if (content.includes('actix')) allFrameworks.add('Actix');
        if (content.includes('axum')) allFrameworks.add('Axum');
        if (content.includes('rocket')) allFrameworks.add('Rocket');
      } catch {
        // Ignore read errors
      }
    }
  }

  // Update result with aggregated tech stack
  result.techStack.languages = [...allLanguages];
  result.techStack.frameworks = [...allFrameworks];
  result.techStack.buildTools = [...allBuildTools];
  result.techStack.testFrameworks = [...allTestFrameworks];
  result.techStack.detectedFrom = [...detectedFrom];
}

/**
 * Find existing documentation
 */
function findExistingDocs(projectPath: string, result: DiscoveryResult): void {
  // Look for README
  const readmeVariants = ['README.md', 'README.MD', 'readme.md', 'Readme.md', 'README'];
  for (const variant of readmeVariants) {
    const readmePath = path.join(projectPath, variant);
    if (fs.existsSync(readmePath)) {
      result.existingDocs.readme = variant;
      break;
    }
  }

  // Look for CONTRIBUTING
  const contributingVariants = ['CONTRIBUTING.md', 'CONTRIBUTING.MD', 'contributing.md'];
  for (const variant of contributingVariants) {
    const contribPath = path.join(projectPath, variant);
    if (fs.existsSync(contribPath)) {
      result.existingDocs.contributing = variant;
      break;
    }
  }

  // Look for docs folder
  const docsFolders = ['docs', 'doc', 'documentation', 'Docs', 'Documentation'];
  for (const folder of docsFolders) {
    const docsPath = path.join(projectPath, folder);
    if (fs.existsSync(docsPath) && fs.statSync(docsPath).isDirectory()) {
      result.existingDocs.docsFolder = folder;
      break;
    }
  }

  // Look for wiki folder
  const wikiPath = path.join(projectPath, 'wiki');
  if (fs.existsSync(wikiPath) && fs.statSync(wikiPath).isDirectory()) {
    result.existingDocs.wikiFolder = 'wiki';
  }

  // Find all markdown files (top level and in docs)
  const mdFiles: string[] = [];
  try {
    const entries = fs.readdirSync(projectPath);
    for (const entry of entries) {
      if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        mdFiles.push(entry);
      }
    }
  } catch {
    // Ignore errors
  }
  result.existingDocs.mdFiles = mdFiles;
}

/**
 * Find entry points
 */
function findEntryPoints(projectPath: string, result: DiscoveryResult): void {
  const mainPatterns = ['main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js', 'cli.ts', 'cli.js'];
  const indexPatterns = ['index.ts', 'index.js', 'mod.ts', 'mod.js'];
  const srcFolders = ['src', 'lib', 'app'];

  // Check root level
  for (const pattern of mainPatterns) {
    const filePath = path.join(projectPath, pattern);
    if (fs.existsSync(filePath)) {
      result.entryPoints.main.push(pattern);
    }
  }

  for (const pattern of indexPatterns) {
    const filePath = path.join(projectPath, pattern);
    if (fs.existsSync(filePath)) {
      result.entryPoints.index.push(pattern);
    }
  }

  // Check src folders
  for (const folder of srcFolders) {
    const folderPath = path.join(projectPath, folder);
    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
      for (const pattern of mainPatterns) {
        const filePath = path.join(folderPath, pattern);
        if (fs.existsSync(filePath)) {
          result.entryPoints.main.push(path.join(folder, pattern));
        }
      }
      for (const pattern of indexPatterns) {
        const filePath = path.join(folderPath, pattern);
        if (fs.existsSync(filePath)) {
          result.entryPoints.index.push(path.join(folder, pattern));
        }
      }
    }
  }

  // Check package.json for main/exports
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.main) result.entryPoints.exports.push(pkg.main);
      if (pkg.module) result.entryPoints.exports.push(pkg.module);
      if (pkg.bin) {
        if (typeof pkg.bin === 'string') {
          result.entryPoints.exports.push(pkg.bin);
        } else {
          result.entryPoints.exports.push(...Object.values(pkg.bin) as string[]);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
}

/**
 * Build modules from directory structure
 */
function buildModules(projectPath: string, result: DiscoveryResult): void {
  const srcFolders = ['src', 'lib', 'app', 'packages'];

  for (const srcFolder of srcFolders) {
    const srcPath = path.join(projectPath, srcFolder);
    if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
      try {
        const entries = fs.readdirSync(srcPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            const modulePath = path.join(srcFolder, entry.name);
            const fullModulePath = path.join(projectPath, modulePath);
            const moduleInfo = analyzeModule(fullModulePath, modulePath);
            result.modules.push(moduleInfo);
          }
        }
      } catch {
        // Ignore errors
      }
    }
  }

  // Sort modules by file count (largest first)
  result.modules.sort((a, b) => b.fileCount - a.fileCount);
}

/**
 * Analyze a module directory
 */
function analyzeModule(modulePath: string, relativePath: string): ModuleInfo {
  const info: ModuleInfo = {
    name: path.basename(modulePath),
    path: relativePath,
    fileCount: 0,
    estimatedLOC: 0,
    hasTests: false,
    hasReadme: false,
    entryPoints: [],
    extensions: {},
  };

  try {
    const walk = (dir: string, depth = 0): void => {
      if (depth > 10) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
          walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          info.fileCount++;

          const ext = path.extname(entry.name).toLowerCase();
          info.extensions[ext] = (info.extensions[ext] || 0) + 1;

          // Check for tests
          if (TEST_PATTERNS.some(p => p.test(entry.name))) {
            info.hasTests = true;
          }

          // Check for README
          if (entry.name.toLowerCase().includes('readme')) {
            info.hasReadme = true;
          }

          // Check for entry points
          if (entry.name === 'index.ts' || entry.name === 'index.js') {
            info.entryPoints.push(path.relative(modulePath, fullPath));
          }

          // Count actual lines of code
          if (EXTENSION_TYPES[ext] === 'code') {
            info.estimatedLOC += countCodeLines(fullPath);
          }
        }
      }
    };

    walk(modulePath);
  } catch {
    // Ignore errors
  }

  return info;
}

/**
 * Calculate sampling tier based on file count
 */
export function calculateTier(totalFiles: number): SamplingConfig {
  if (totalFiles < 500) {
    return {
      tier: 'small',
      filesPerDir: 'all',
      priorityPatterns: ['**/index.*', '**/main.*', '**/*.config.*', '**/types.*'],
      skipPatterns: ['node_modules/**', 'dist/**', '**/*.test.*', '**/*.spec.*'],
    };
  } else if (totalFiles < 2000) {
    return {
      tier: 'medium',
      filesPerDir: 5,
      priorityPatterns: ['**/index.*', '**/main.*', '**/*.config.*', '**/types.*', '**/README.md'],
      skipPatterns: ['node_modules/**', 'dist/**', 'build/**', '**/*.test.*', '**/*.spec.*'],
    };
  } else if (totalFiles < 10000) {
    return {
      tier: 'large',
      filesPerDir: 3,
      priorityPatterns: ['**/index.*', '**/main.*', '**/*.config.*', '**/types.*', '**/README.md'],
      skipPatterns: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '**/*.test.*', '**/*.spec.*', '**/__tests__/**'],
    };
  } else {
    return {
      tier: 'massive',
      filesPerDir: 1,
      priorityPatterns: ['**/index.*', '**/main.*', '**/app.*', '**/*.config.*'],
      skipPatterns: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/*.min.*', '**/*.bundle.*'],
    };
  }
}

/**
 * Select representative files from a directory for analysis
 */
export function selectRepresentativeFiles(
  files: string[],
  maxFiles: number | 'all',
  moduleName?: string
): string[] {
  if (maxFiles === 'all') {
    return files;
  }

  if (files.length <= maxFiles) {
    return files;
  }

  // Priority selection heuristics
  const priority: string[] = [];
  const regular: string[] = [];

  for (const file of files) {
    const basename = path.basename(file).toLowerCase();
    const ext = path.extname(file);

    // High priority files
    if (
      basename.startsWith('index') ||
      basename.startsWith('main') ||
      basename.startsWith('app') ||
      (moduleName && basename.startsWith(moduleName.toLowerCase())) ||
      basename.includes('types') ||
      basename.includes('config') ||
      ext === '.d.ts'
    ) {
      priority.push(file);
    } else {
      regular.push(file);
    }
  }

  // Take priority files first, then fill with regular
  const selected = [...priority.slice(0, maxFiles)];
  const remaining = maxFiles - selected.length;

  if (remaining > 0) {
    // Sort regular files by size (larger = more content)
    selected.push(...regular.slice(0, remaining));
  }

  return selected;
}
