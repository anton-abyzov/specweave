/**
 * LanguageAnalyzer - Analyzes project to recommend LSP servers
 *
 * Uses weighted scoring to identify the top languages in a project.
 * Project files (package.json, .sln, go.mod) score higher than source files.
 *
 * @see spec.md US-003: LSP Server Recommendations
 * @satisfies AC-US3-01, AC-US3-02
 */

/**
 * Filesystem abstraction for testing
 */
export interface FileSystemProvider {
  glob(pattern: string, cwd: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
}

/**
 * Language detection result with scoring
 */
export interface LanguageScore {
  /** Language identifier (e.g., 'typescript', 'csharp') */
  language: string;
  /** Weighted score */
  score: number;
  /** Project files found (e.g., package.json, .sln) */
  projectFiles: string[];
  /** Source files found (e.g., .ts, .cs) */
  sourceFiles: string[];
}

/**
 * Language detection configuration
 */
interface LanguageConfig {
  /** Language identifier */
  language: string;
  /** Project file patterns (weighted at 10 points each) */
  projectPatterns: string[];
  /** Source file patterns (weighted at 1 point each) */
  sourcePatterns: string[];
}

/**
 * Supported language configurations
 */
const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    language: 'typescript',
    projectPatterns: ['package.json', 'tsconfig.json'],
    sourcePatterns: ['.ts', '.tsx'],
  },
  {
    language: 'csharp',
    projectPatterns: ['.sln', '.csproj'],
    sourcePatterns: ['.cs'],
  },
  {
    language: 'python',
    projectPatterns: ['pyproject.toml', 'setup.py', 'requirements.txt'],
    sourcePatterns: ['.py'],
  },
  {
    language: 'go',
    projectPatterns: ['go.mod'],
    sourcePatterns: ['.go'],
  },
  {
    language: 'rust',
    projectPatterns: ['Cargo.toml'],
    sourcePatterns: ['.rs'],
  },
  {
    language: 'java',
    projectPatterns: ['pom.xml', 'build.gradle'],
    sourcePatterns: ['.java'],
  },
];

/** Score for project files */
const PROJECT_FILE_WEIGHT = 10;

/** Score for source files */
const SOURCE_FILE_WEIGHT = 1;

/** Maximum number of languages to return */
const MAX_LANGUAGES = 3;

/** Directories to ignore */
const IGNORED_DIRS = ['node_modules', 'dist', '.git', 'vendor', '__pycache__'];

/**
 * Analyzes a project to identify the primary programming languages
 */
export class LanguageAnalyzer {
  private readonly fs: FileSystemProvider;

  constructor(fs: FileSystemProvider) {
    this.fs = fs;
  }

  /**
   * Analyze a project directory to identify languages
   *
   * @param projectRoot - Root directory of the project
   * @returns Promise resolving to sorted array of language scores (max 3)
   */
  async analyze(projectRoot: string): Promise<LanguageScore[]> {
    const scores: LanguageScore[] = [];

    for (const config of LANGUAGE_CONFIGS) {
      const score = await this.scoreLanguage(config, projectRoot);
      if (score.score > 0) {
        scores.push(score);
      }
    }

    // Sort by score descending and return top 3
    return scores.sort((a, b) => b.score - a.score).slice(0, MAX_LANGUAGES);
  }

  private async scoreLanguage(
    config: LanguageConfig,
    projectRoot: string
  ): Promise<LanguageScore> {
    const projectFiles: string[] = [];
    const sourceFiles: string[] = [];
    let score = 0;

    // Check project files
    for (const pattern of config.projectPatterns) {
      const files = await this.findFiles(pattern, projectRoot);
      const filteredFiles = this.filterIgnoredDirs(files);
      projectFiles.push(...filteredFiles);
      score += filteredFiles.length * PROJECT_FILE_WEIGHT;
    }

    // Check source files
    for (const pattern of config.sourcePatterns) {
      const files = await this.findFiles(pattern, projectRoot);
      const filteredFiles = this.filterIgnoredDirs(files);
      sourceFiles.push(...filteredFiles);
      score += filteredFiles.length * SOURCE_FILE_WEIGHT;
    }

    return {
      language: config.language,
      score,
      projectFiles,
      sourceFiles,
    };
  }

  private async findFiles(pattern: string, cwd: string): Promise<string[]> {
    // Convert extension pattern to glob
    const globPattern = pattern.startsWith('.') ? `**/*${pattern}` : `**/${pattern}`;
    return this.fs.glob(globPattern, cwd);
  }

  private filterIgnoredDirs(files: string[]): string[] {
    return files.filter((file) => {
      for (const ignored of IGNORED_DIRS) {
        if (file.includes(`/${ignored}/`) || file.startsWith(`${ignored}/`)) {
          return false;
        }
      }
      return true;
    });
  }
}
