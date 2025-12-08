/**
 * Frontend Standards Parser - Detect and parse React/Angular/Vue coding standards
 *
 * Detects framework from package.json, parses ESLint plugins, and extracts conventions
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Logger, consoleLogger } from '../../../utils/logger.js';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export type FrontendFramework = 'react' | 'angular' | 'vue' | 'svelte' | 'none';

export interface FrontendStandards {
  framework: FrontendFramework;
  frameworkVersion?: string;
  stateManagement?: StateManagementConfig;
  cssMethodology?: CssMethodologyConfig;
  testing: TestingConfig;
  bundler?: BundlerConfig;
  eslintPlugins: string[];
  componentNaming: ComponentNamingConfig;
  hooks?: HooksConfig;
  routing?: RoutingConfig;
  warnings: string[];
}

export interface StateManagementConfig {
  name: string;
  version?: string;
}

export interface CssMethodologyConfig {
  name: string;
  details?: string;
}

export interface TestingConfig {
  frameworks: string[];
  e2e?: string;
  coverage?: boolean;
}

export interface BundlerConfig {
  name: string;
  version?: string;
}

export interface ComponentNamingConfig {
  convention: 'PascalCase' | 'kebab-case' | 'camelCase';
  fileExtension: string;
  folderStructure?: string;
}

export interface HooksConfig {
  enabled: boolean;
  customHooksPattern?: string;
}

export interface RoutingConfig {
  library: string;
  version?: string;
}

export interface FrontendStandardsParserOptions {
  logger?: Logger;
}

const FRAMEWORK_DEPENDENCIES: Record<FrontendFramework, string[]> = {
  react: ['react', 'react-dom', 'next', 'gatsby', '@remix-run/react', 'preact'],
  angular: ['@angular/core', '@angular/cli'],
  vue: ['vue', 'nuxt', '@nuxt/core', '@vue/cli-service'],
  svelte: ['svelte', '@sveltejs/kit'],
  none: [],
};

const STATE_MANAGEMENT_LIBS: Record<string, FrontendFramework[]> = {
  redux: ['react'],
  '@reduxjs/toolkit': ['react'],
  zustand: ['react'],
  jotai: ['react'],
  recoil: ['react'],
  mobx: ['react', 'vue'],
  pinia: ['vue'],
  vuex: ['vue'],
  '@ngrx/store': ['angular'],
  '@ngxs/store': ['angular'],
  'svelte/store': ['svelte'],
};

const CSS_METHODOLOGIES: Record<string, string> = {
  tailwindcss: 'Tailwind CSS (utility-first)',
  'styled-components': 'styled-components (CSS-in-JS)',
  '@emotion/react': 'Emotion (CSS-in-JS)',
  '@emotion/styled': 'Emotion (CSS-in-JS)',
  'sass': 'Sass/SCSS (preprocessor)',
  'node-sass': 'Sass/SCSS (preprocessor)',
  'less': 'Less (preprocessor)',
  '@vanilla-extract/css': 'Vanilla Extract (zero-runtime CSS-in-TS)',
  'css-modules': 'CSS Modules (scoped CSS)',
};

const TESTING_FRAMEWORKS: Record<string, string> = {
  jest: 'Jest',
  vitest: 'Vitest',
  '@testing-library/react': 'React Testing Library',
  '@testing-library/vue': 'Vue Testing Library',
  '@testing-library/angular': 'Angular Testing Library',
  cypress: 'Cypress (E2E)',
  playwright: 'Playwright (E2E)',
  '@playwright/test': 'Playwright (E2E)',
};

const BUNDLERS: Record<string, string> = {
  vite: 'Vite',
  webpack: 'webpack',
  esbuild: 'esbuild',
  rollup: 'Rollup',
  parcel: 'Parcel',
  '@angular/cli': 'Angular CLI (webpack)',
  next: 'Next.js (webpack/turbopack)',
  nuxt: 'Nuxt (Vite/webpack)',
};

export class FrontendStandardsParser {
  private logger: Logger;

  constructor(options: FrontendStandardsParserOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  async parse(projectPath: string): Promise<FrontendStandards> {
    const warnings: string[] = [];
    const result: FrontendStandards = {
      framework: 'none',
      testing: { frameworks: [] },
      eslintPlugins: [],
      componentNaming: {
        convention: 'PascalCase',
        fileExtension: '.tsx',
      },
      warnings,
    };

    // Read package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!(await this.fileExists(packageJsonPath))) {
      warnings.push('No package.json found');
      return result;
    }

    let packageJson: {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    try {
      const content = await readFile(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(content);
    } catch (error) {
      warnings.push(`Failed to parse package.json: ${error}`);
      return result;
    }

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Detect framework
    const { framework, version } = this.detectFramework(allDeps);
    result.framework = framework;
    result.frameworkVersion = version;

    // Set framework-specific defaults
    this.setFrameworkDefaults(result, framework);

    // Detect state management
    result.stateManagement = this.detectStateManagement(allDeps, framework);

    // Detect CSS methodology
    result.cssMethodology = this.detectCssMethodology(allDeps);

    // Detect testing frameworks
    result.testing = this.detectTesting(allDeps);

    // Detect bundler
    result.bundler = this.detectBundler(allDeps);

    // Parse ESLint config for plugins
    result.eslintPlugins = await this.detectEslintPlugins(projectPath, framework);

    // Detect routing
    result.routing = this.detectRouting(allDeps, framework);

    // Framework-specific config parsing
    if (framework === 'angular') {
      await this.parseAngularConfig(projectPath, result);
    } else if (framework === 'vue') {
      await this.parseVueConfig(projectPath, result);
    }

    this.logger.debug(`Detected frontend: ${framework} ${version ?? ''}`);
    return result;
  }

  private detectFramework(deps: Record<string, string>): {
    framework: FrontendFramework;
    version?: string;
  } {
    for (const [framework, markers] of Object.entries(FRAMEWORK_DEPENDENCIES)) {
      if (framework === 'none') continue;

      for (const marker of markers) {
        if (deps[marker]) {
          return {
            framework: framework as FrontendFramework,
            version: deps[marker]?.replace(/[\^~]/, ''),
          };
        }
      }
    }

    return { framework: 'none' };
  }

  private setFrameworkDefaults(result: FrontendStandards, framework: FrontendFramework): void {
    switch (framework) {
      case 'react':
        result.componentNaming = {
          convention: 'PascalCase',
          fileExtension: '.tsx',
          folderStructure: 'components/{ComponentName}/{ComponentName}.tsx',
        };
        result.hooks = {
          enabled: true,
          customHooksPattern: 'use{Name}',
        };
        break;

      case 'angular':
        result.componentNaming = {
          convention: 'kebab-case',
          fileExtension: '.ts',
          folderStructure: '{feature}/{feature}.component.ts',
        };
        break;

      case 'vue':
        result.componentNaming = {
          convention: 'PascalCase',
          fileExtension: '.vue',
          folderStructure: 'components/{ComponentName}.vue',
        };
        break;

      case 'svelte':
        result.componentNaming = {
          convention: 'PascalCase',
          fileExtension: '.svelte',
          folderStructure: 'components/{ComponentName}.svelte',
        };
        break;
    }
  }

  private detectStateManagement(
    deps: Record<string, string>,
    framework: FrontendFramework
  ): StateManagementConfig | undefined {
    for (const [lib, frameworks] of Object.entries(STATE_MANAGEMENT_LIBS)) {
      if (deps[lib] && (frameworks.includes(framework) || framework === 'none')) {
        return {
          name: lib,
          version: deps[lib]?.replace(/[\^~]/, ''),
        };
      }
    }
    return undefined;
  }

  private detectCssMethodology(deps: Record<string, string>): CssMethodologyConfig | undefined {
    for (const [lib, description] of Object.entries(CSS_METHODOLOGIES)) {
      if (deps[lib]) {
        return {
          name: lib,
          details: description,
        };
      }
    }
    return undefined;
  }

  private detectTesting(deps: Record<string, string>): TestingConfig {
    const frameworks: string[] = [];
    let e2e: string | undefined;

    for (const [lib, name] of Object.entries(TESTING_FRAMEWORKS)) {
      if (deps[lib]) {
        if (name.includes('E2E')) {
          e2e = name;
        } else {
          frameworks.push(name);
        }
      }
    }

    return {
      frameworks,
      e2e,
      coverage: !!(deps['@vitest/coverage-v8'] || deps['jest'] || deps['c8']),
    };
  }

  private detectBundler(deps: Record<string, string>): BundlerConfig | undefined {
    for (const [lib, name] of Object.entries(BUNDLERS)) {
      if (deps[lib]) {
        return {
          name,
          version: deps[lib]?.replace(/[\^~]/, ''),
        };
      }
    }
    return undefined;
  }

  private detectRouting(
    deps: Record<string, string>,
    framework: FrontendFramework
  ): RoutingConfig | undefined {
    const routingLibs: Record<string, string> = {
      'react-router-dom': 'React Router',
      '@tanstack/react-router': 'TanStack Router',
      'vue-router': 'Vue Router',
      '@angular/router': 'Angular Router',
    };

    for (const [lib, name] of Object.entries(routingLibs)) {
      if (deps[lib]) {
        return {
          library: name,
          version: deps[lib]?.replace(/[\^~]/, ''),
        };
      }
    }

    // Built-in routing for meta-frameworks
    if (deps['next']) return { library: 'Next.js App Router' };
    if (deps['nuxt']) return { library: 'Nuxt Router' };
    if (deps['@sveltejs/kit']) return { library: 'SvelteKit Router' };

    return undefined;
  }

  private async detectEslintPlugins(
    projectPath: string,
    framework: FrontendFramework
  ): Promise<string[]> {
    const eslintConfigs = [
      '.eslintrc.json',
      '.eslintrc.js',
      '.eslintrc.cjs',
      '.eslintrc.yml',
      'eslint.config.js',
      'eslint.config.mjs',
    ];

    const plugins: string[] = [];

    for (const config of eslintConfigs) {
      const configPath = path.join(projectPath, config);
      if (await this.fileExists(configPath)) {
        try {
          const content = await readFile(configPath, 'utf-8');

          // Common framework-specific plugins
          const frameworkPlugins: Record<FrontendFramework, string[]> = {
            react: ['plugin:react/', 'plugin:react-hooks/', 'plugin:jsx-a11y/'],
            angular: ['plugin:@angular-eslint/', 'plugin:@typescript-eslint/'],
            vue: ['plugin:vue/', 'plugin:vue-scoped-css/'],
            svelte: ['plugin:svelte/'],
            none: [],
          };

          for (const plugin of frameworkPlugins[framework] ?? []) {
            if (content.includes(plugin)) {
              plugins.push(plugin.replace('plugin:', '').replace('/', ''));
            }
          }

          // Check for common plugins
          const commonPlugins = [
            'import',
            'prettier',
            '@typescript-eslint',
            'testing-library',
            'jest',
            'vitest',
          ];

          for (const plugin of commonPlugins) {
            if (content.includes(`"${plugin}"`) || content.includes(`'${plugin}'`)) {
              plugins.push(plugin);
            }
          }

          break;
        } catch {
          continue;
        }
      }
    }

    return Array.from(new Set(plugins)); // Remove duplicates
  }

  private async parseAngularConfig(
    projectPath: string,
    result: FrontendStandards
  ): Promise<void> {
    const angularJsonPath = path.join(projectPath, 'angular.json');
    if (!(await this.fileExists(angularJsonPath))) return;

    try {
      const content = await readFile(angularJsonPath, 'utf-8');
      const config = JSON.parse(content);

      // Extract style preprocessor
      const projects = config.projects ?? {};
      const firstProject = Object.values(projects)[0] as {
        architect?: {
          build?: {
            options?: {
              styles?: string[];
              stylePreprocessorOptions?: { includePaths?: string[] };
            };
          };
        };
      };

      if (firstProject?.architect?.build?.options?.styles) {
        const styles = firstProject.architect.build.options.styles;
        if (styles.some((s: string) => s.endsWith('.scss'))) {
          result.cssMethodology = { name: 'sass', details: 'Sass/SCSS (preprocessor)' };
        }
      }

      this.logger.debug('Parsed angular.json');
    } catch {
      result.warnings.push('Failed to parse angular.json');
    }
  }

  private async parseVueConfig(projectPath: string, result: FrontendStandards): Promise<void> {
    // Check for Vue config files
    const vueConfigs = ['vue.config.js', 'vite.config.ts', 'vite.config.js', 'nuxt.config.ts'];

    for (const config of vueConfigs) {
      const configPath = path.join(projectPath, config);
      if (await this.fileExists(configPath)) {
        try {
          const content = await readFile(configPath, 'utf-8');

          // Detect Composition API usage
          if (content.includes('composition') || content.includes('script setup')) {
            result.hooks = {
              enabled: true,
              customHooksPattern: 'use{Name}',
            };
          }

          this.logger.debug(`Parsed ${config}`);
        } catch {
          continue;
        }
      }
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Convenience function for quick frontend standards parsing
 */
export async function parseFrontendStandards(
  projectPath: string,
  options?: FrontendStandardsParserOptions
): Promise<FrontendStandards> {
  const parser = new FrontendStandardsParser(options);
  return parser.parse(projectPath);
}
