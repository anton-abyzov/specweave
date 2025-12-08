/**
 * Ecosystem Detector - Multi-technology ecosystem detection for polyglot codebases
 *
 * Detects all technology ecosystems present in a project by scanning for
 * marker files (package.json, go.mod, pyproject.toml, etc.) and config files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Logger, consoleLogger } from '../../../utils/logger.js';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

export type EcosystemName =
  | 'typescript'
  | 'python'
  | 'go'
  | 'java'
  | 'kotlin'
  | 'dotnet'
  | 'rust'
  | 'react'
  | 'angular'
  | 'vue';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DetectedEcosystem {
  name: EcosystemName;
  confidence: ConfidenceLevel;
  detectedFrom: string;
  configFiles: string[];
  version?: string;
}

interface EcosystemDefinition {
  markers: string[];
  configFiles: string[];
  globPatterns?: string[];
}

const ECOSYSTEM_DEFINITIONS: Record<string, EcosystemDefinition> = {
  typescript: {
    markers: ['package.json', 'tsconfig.json'],
    configFiles: [
      '.eslintrc.json',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
      '.prettierrc',
      '.prettierrc.json',
      '.prettierrc.js',
      'prettier.config.js',
      'tsconfig.json',
      'tsconfig.base.json',
      'biome.json',
    ],
  },
  python: {
    markers: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile', 'poetry.lock'],
    configFiles: [
      'pyproject.toml',
      '.pylintrc',
      'setup.cfg',
      '.flake8',
      'ruff.toml',
      '.ruff.toml',
      'mypy.ini',
      '.mypy.ini',
      'pyrightconfig.json',
      '.python-version',
      'tox.ini',
    ],
  },
  go: {
    markers: ['go.mod'],
    configFiles: ['go.mod', 'go.sum', '.golangci.yml', '.golangci.yaml', 'staticcheck.conf'],
  },
  java: {
    markers: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    configFiles: [
      'pom.xml',
      'build.gradle',
      'build.gradle.kts',
      'checkstyle.xml',
      'checkstyle/checkstyle.xml',
      'pmd.xml',
      'pmd/pmd.xml',
      'spotbugs.xml',
      'spotbugs-exclude.xml',
      '.editorconfig',
    ],
  },
  kotlin: {
    markers: ['build.gradle.kts'],
    configFiles: ['build.gradle.kts', 'detekt.yml', '.editorconfig'],
  },
  dotnet: {
    markers: [],
    configFiles: ['.editorconfig', 'StyleCop.json', 'Directory.Build.props', '.globalconfig'],
    globPatterns: ['*.csproj', '*.sln', '*.fsproj'],
  },
  rust: {
    markers: ['Cargo.toml'],
    configFiles: ['Cargo.toml', 'rustfmt.toml', '.rustfmt.toml', 'clippy.toml', '.clippy.toml'],
  },
};

const FRONTEND_FRAMEWORKS: Record<
  string,
  { dependencies: string[]; configFiles: string[]; eslintPlugins: string[] }
> = {
  react: {
    dependencies: ['react', 'react-dom', 'next', 'gatsby', '@remix-run/react'],
    configFiles: [],
    eslintPlugins: ['plugin:react/', 'plugin:react-hooks/'],
  },
  angular: {
    dependencies: ['@angular/core', '@angular/cli'],
    configFiles: ['angular.json', '.angular.json'],
    eslintPlugins: ['plugin:@angular-eslint/'],
  },
  vue: {
    dependencies: ['vue', 'nuxt', '@nuxt/'],
    configFiles: ['vue.config.js', 'nuxt.config.js', 'nuxt.config.ts'],
    eslintPlugins: ['plugin:vue/'],
  },
};

export interface EcosystemDetectorOptions {
  logger?: Logger;
  maxDepth?: number;
}

export class EcosystemDetector {
  private logger: Logger;
  private maxDepth: number;

  constructor(options: EcosystemDetectorOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.maxDepth = options.maxDepth ?? 3;
  }

  async detectEcosystems(projectPath: string): Promise<DetectedEcosystem[]> {
    const ecosystems: DetectedEcosystem[] = [];

    this.logger.debug(`Scanning for ecosystems in: ${projectPath}`);

    // Detect backend ecosystems
    for (const [name, definition] of Object.entries(ECOSYSTEM_DEFINITIONS)) {
      const result = await this.detectEcosystem(
        projectPath,
        name as EcosystemName,
        definition
      );
      if (result) {
        ecosystems.push(result);
      }
    }

    // Detect frontend frameworks (requires package.json)
    const frontendEcosystems = await this.detectFrontendFrameworks(projectPath);
    ecosystems.push(...frontendEcosystems);

    this.logger.info(`Detected ${ecosystems.length} ecosystem(s)`);
    return ecosystems;
  }

  private async detectEcosystem(
    projectPath: string,
    name: EcosystemName,
    definition: EcosystemDefinition
  ): Promise<DetectedEcosystem | null> {
    let detectedFrom: string | null = null;
    let confidence: ConfidenceLevel = 'low';

    // Check markers first
    for (const marker of definition.markers) {
      const markerPath = path.join(projectPath, marker);
      if (await this.fileExists(markerPath)) {
        detectedFrom = marker;
        confidence = 'high';
        break;
      }
    }

    // Check glob patterns (for .NET projects)
    if (!detectedFrom && definition.globPatterns) {
      for (const pattern of definition.globPatterns) {
        const found = await this.findByGlobPattern(projectPath, pattern);
        if (found) {
          detectedFrom = found;
          confidence = 'high';
          break;
        }
      }
    }

    if (!detectedFrom) {
      return null;
    }

    // Find all config files
    const configFiles: string[] = [];
    for (const configFile of definition.configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (await this.fileExists(configPath)) {
        configFiles.push(configFile);
      }
    }

    // Get version if possible
    const version = await this.extractVersion(projectPath, name, detectedFrom);

    return {
      name,
      confidence,
      detectedFrom,
      configFiles,
      version,
    };
  }

  private async detectFrontendFrameworks(
    projectPath: string
  ): Promise<DetectedEcosystem[]> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!(await this.fileExists(packageJsonPath))) {
      return [];
    }

    let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    try {
      const content = await readFile(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(content);
    } catch {
      return [];
    }

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const ecosystems: DetectedEcosystem[] = [];

    for (const [framework, definition] of Object.entries(FRONTEND_FRAMEWORKS)) {
      const matchedDep = definition.dependencies.find((dep) =>
        Object.keys(allDeps).some((key) => key === dep || key.startsWith(dep))
      );

      if (matchedDep) {
        const configFiles = await this.findFrontendConfigFiles(
          projectPath,
          definition.configFiles
        );

        // Get ESLint plugins from eslint config if present
        const eslintPlugins = await this.detectEslintPlugins(
          projectPath,
          definition.eslintPlugins
        );

        const version = allDeps[matchedDep];

        ecosystems.push({
          name: framework as EcosystemName,
          confidence: 'high',
          detectedFrom: `package.json (${matchedDep})`,
          configFiles: [...configFiles, ...(eslintPlugins.length > 0 ? ['.eslintrc'] : [])],
          version: version?.replace(/[\^~]/, ''),
        });
      }
    }

    return ecosystems;
  }

  private async findFrontendConfigFiles(
    projectPath: string,
    configFiles: string[]
  ): Promise<string[]> {
    const found: string[] = [];
    for (const configFile of configFiles) {
      if (await this.fileExists(path.join(projectPath, configFile))) {
        found.push(configFile);
      }
    }
    return found;
  }

  private async detectEslintPlugins(
    projectPath: string,
    plugins: string[]
  ): Promise<string[]> {
    const eslintConfigs = [
      '.eslintrc.json',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
    ];

    for (const config of eslintConfigs) {
      const configPath = path.join(projectPath, config);
      if (await this.fileExists(configPath)) {
        try {
          const content = await readFile(configPath, 'utf-8');
          return plugins.filter((plugin) => content.includes(plugin));
        } catch {
          continue;
        }
      }
    }

    return [];
  }

  private async extractVersion(
    projectPath: string,
    ecosystem: EcosystemName,
    detectedFrom: string
  ): Promise<string | undefined> {
    try {
      switch (ecosystem) {
        case 'typescript': {
          const packagePath = path.join(projectPath, 'package.json');
          const content = await readFile(packagePath, 'utf-8');
          const pkg = JSON.parse(content);
          return (
            pkg.devDependencies?.typescript ||
            pkg.dependencies?.typescript
          )?.replace(/[\^~]/, '');
        }

        case 'python': {
          const pythonVersionPath = path.join(projectPath, '.python-version');
          if (await this.fileExists(pythonVersionPath)) {
            const version = await readFile(pythonVersionPath, 'utf-8');
            return version.trim();
          }
          // Try pyproject.toml
          const pyprojectPath = path.join(projectPath, 'pyproject.toml');
          if (await this.fileExists(pyprojectPath)) {
            const content = await readFile(pyprojectPath, 'utf-8');
            const match = content.match(/python\s*=\s*"([^"]+)"/);
            return match?.[1];
          }
          break;
        }

        case 'go': {
          const goModPath = path.join(projectPath, 'go.mod');
          const content = await readFile(goModPath, 'utf-8');
          const match = content.match(/^go\s+(\d+\.\d+(?:\.\d+)?)/m);
          return match?.[1];
        }

        case 'java': {
          // Check pom.xml for Java version
          const pomPath = path.join(projectPath, 'pom.xml');
          if (await this.fileExists(pomPath)) {
            const content = await readFile(pomPath, 'utf-8');
            const match = content.match(/<java\.version>([^<]+)<\/java\.version>/);
            return match?.[1];
          }
          break;
        }

        case 'rust': {
          const cargoPath = path.join(projectPath, 'Cargo.toml');
          const content = await readFile(cargoPath, 'utf-8');
          const match = content.match(/rust-version\s*=\s*"([^"]+)"/);
          return match?.[1];
        }

        case 'dotnet': {
          // Check .csproj for TargetFramework
          const files = await readdir(projectPath);
          const csproj = files.find((f) => f.endsWith('.csproj'));
          if (csproj) {
            const content = await readFile(path.join(projectPath, csproj), 'utf-8');
            const match = content.match(/<TargetFramework>([^<]+)<\/TargetFramework>/);
            return match?.[1];
          }
          break;
        }
      }
    } catch {
      // Version extraction is optional, don't fail on errors
    }
    return undefined;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async findByGlobPattern(
    projectPath: string,
    pattern: string
  ): Promise<string | null> {
    try {
      const files = await readdir(projectPath);
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
      );
      const match = files.find((f) => regex.test(f));
      return match || null;
    } catch {
      return null;
    }
  }
}

/**
 * Convenience function for quick ecosystem detection
 */
export async function detectEcosystems(
  projectPath: string,
  options?: EcosystemDetectorOptions
): Promise<DetectedEcosystem[]> {
  const detector = new EcosystemDetector(options);
  return detector.detectEcosystems(projectPath);
}
