/**
 * ProjectDetector - Detects project root and suggests LSP servers
 *
 * @see spec.md US-007: Error Handling
 * @satisfies AC-US7-03, AC-US7-04
 */

/**
 * Filesystem abstraction for testing
 */
export interface FileSystemProvider {
  exists(path: string): Promise<boolean>;
  readdir(path: string): Promise<string[]>;
  glob(pattern: string, cwd: string): Promise<string[]>;
  getParentDir(path: string): string | null;
}

/**
 * Project file patterns for different languages
 */
const PROJECT_FILES: Record<string, { files: string[]; language: string }> = {
  typescript: { files: ['package.json', 'tsconfig.json'], language: 'typescript' },
  csharp: { files: ['*.sln', '*.csproj'], language: 'csharp' },
  go: { files: ['go.mod'], language: 'go' },
  python: { files: ['pyproject.toml', 'requirements.txt', 'setup.py'], language: 'python' },
  rust: { files: ['Cargo.toml'], language: 'rust' },
};

/**
 * Extension to language mapping
 */
const EXTENSION_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.cs': 'csharp',
  '.go': 'go',
  '.py': 'python',
  '.rs': 'rust',
};

/**
 * Result of analyzing an unknown project
 */
export interface UnknownProjectResult {
  suggestedLanguage: string | null;
  fileCount: number;
}

/**
 * Full project information
 */
export interface ProjectInfo {
  root: string | null;
  language: string | null;
  projectFile?: string;
  suggestedLanguage?: string;
}

/**
 * Detects project root and suggests LSP servers
 */
export class ProjectDetector {
  private readonly fs: FileSystemProvider;

  constructor(fs: FileSystemProvider) {
    this.fs = fs;
  }

  /**
   * Find project root by searching upward for project files
   *
   * @param startDir - Directory to start searching from
   * @returns Project root path or null if not found
   */
  async findRoot(startDir: string): Promise<string | null> {
    if (!startDir || startDir.trim() === '') {
      return null;
    }

    let currentDir: string | null = startDir;

    while (currentDir) {
      try {
        // Check for project files in current directory
        const files = await this.fs.readdir(currentDir);

        for (const config of Object.values(PROJECT_FILES)) {
          for (const pattern of config.files) {
            const fileName = pattern.startsWith('*') ? pattern.slice(1) : pattern;

            const match = files.find((f) => {
              if (pattern.startsWith('*')) {
                return f.endsWith(fileName);
              }
              return f === pattern;
            });

            if (match) {
              return currentDir;
            }
          }
        }
      } catch {
        // Directory not readable or doesn't exist, continue searching upward
      }

      // Move to parent directory
      currentDir = this.fs.getParentDir(currentDir);
    }

    return null;
  }

  /**
   * Analyze a directory with no project file to suggest a language
   *
   * @param dir - Directory to analyze
   * @returns Suggested language based on file extensions
   */
  async analyzeUnknownProject(dir: string): Promise<UnknownProjectResult> {
    if (!dir || dir.trim() === '') {
      return { suggestedLanguage: null, fileCount: 0 };
    }

    const counts: Record<string, number> = {};

    // Count files by extension
    for (const [ext, lang] of Object.entries(EXTENSION_LANGUAGE)) {
      const pattern = `*${ext}`;
      try {
        const files = await this.fs.glob(pattern, dir);
        if (files.length > 0) {
          counts[lang] = (counts[lang] || 0) + files.length;
        }
      } catch {
        // Glob failed for this extension, continue with others
      }
    }

    // Find language with most files
    let maxCount = 0;
    let suggestedLanguage: string | null = null;

    for (const [lang, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        suggestedLanguage = lang;
      }
    }

    return {
      suggestedLanguage,
      fileCount: maxCount,
    };
  }

  /**
   * Detect full project information
   *
   * @param startDir - Directory to start from
   * @returns Project information with root, language, and suggestions
   */
  async detectProjectInfo(startDir: string): Promise<ProjectInfo> {
    if (!startDir || startDir.trim() === '') {
      return { root: null, language: null };
    }

    const root = await this.findRoot(startDir);

    if (root) {
      // Determine language from project files
      let files: string[];
      try {
        files = await this.fs.readdir(root);
      } catch {
        // Can't read directory, return root without language info
        return { root, language: null };
      }

      let language: string | null = null;
      let projectFile: string | undefined;

      for (const [, config] of Object.entries(PROJECT_FILES)) {
        for (const pattern of config.files) {
          const match = files.find((f) => {
            if (pattern.startsWith('*')) {
              return f.endsWith(pattern.slice(1));
            }
            return f === pattern;
          });

          if (match) {
            language = config.language;
            projectFile = match;
            break;
          }
        }
        if (language) break;
      }

      return { root, language, projectFile };
    }

    // No project file found, analyze by extension
    const analysis = await this.analyzeUnknownProject(startDir);
    return {
      root: null,
      language: null,
      suggestedLanguage: analysis.suggestedLanguage ?? undefined,
    };
  }
}
