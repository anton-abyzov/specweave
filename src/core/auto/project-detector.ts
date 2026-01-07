/**
 * Project Type Detector
 * Auto-detects project type (web/mobile/API/library/etc.) based on files and dependencies
 *
 * Used by auto mode to apply smart completion conditions
 */

import * as fs from 'fs';
import * as path from 'path';

export type ProjectType =
  | 'web-frontend'
  | 'web-fullstack'
  | 'mobile-native'
  | 'backend-api'
  | 'desktop-app'
  | 'library'
  | 'cli-tool'
  | 'generic';

export interface Indicator {
  type: 'file' | 'directory' | 'dependency' | 'config';
  name: string;
  weight: number;
  found: boolean;
}

export interface ProjectDetection {
  type: ProjectType;
  confidence: number; // 0.0-1.0
  indicators: Indicator[];
  frameworks: string[];
  testFrameworks: string[];
  mandatoryConditions: string[]; // e.g., ['e2e', 'build', 'tests']
}

interface DetectionRule {
  type: ProjectType;
  indicators: Omit<Indicator, 'found'>[];
  mandatoryConditions: string[];
}

const DETECTION_RULES: DetectionRule[] = [
  // Web Frontend
  {
    type: 'web-frontend',
    indicators: [
      { type: 'file', name: 'playwright.config.ts', weight: 0.9 },
      { type: 'file', name: 'playwright.config.js', weight: 0.9 },
      { type: 'file', name: 'cypress.config.ts', weight: 0.9 },
      { type: 'file', name: 'cypress.config.js', weight: 0.9 },
      { type: 'file', name: 'next.config.js', weight: 0.8 },
      { type: 'file', name: 'next.config.mjs', weight: 0.8 },
      { type: 'file', name: 'vite.config.ts', weight: 0.7 },
      { type: 'file', name: 'vite.config.js', weight: 0.7 },
      { type: 'directory', name: 'src/pages', weight: 0.6 },
      { type: 'directory', name: 'src/app', weight: 0.6 },
      { type: 'directory', name: 'pages', weight: 0.6 },
      { type: 'directory', name: 'app', weight: 0.6 },
      { type: 'dependency', name: 'react', weight: 0.5 },
      { type: 'dependency', name: 'vue', weight: 0.5 },
      { type: 'dependency', name: '@angular/core', weight: 0.5 },
      { type: 'dependency', name: '@playwright/test', weight: 0.8 },
      { type: 'dependency', name: 'cypress', weight: 0.8 },
    ],
    mandatoryConditions: ['build', 'tests', 'e2e', 'e2e-coverage', 'types'],
  },

  // Mobile Native
  {
    type: 'mobile-native',
    indicators: [
      { type: 'file', name: '.detoxrc.js', weight: 0.9 },
      { type: 'file', name: '.detoxrc.json', weight: 0.9 },
      { type: 'file', name: 'maestro.yaml', weight: 0.9 },
      { type: 'directory', name: '.maestro', weight: 0.8 },
      { type: 'directory', name: 'android/app', weight: 0.7 },
      { type: 'file', name: 'ios/Podfile', weight: 0.7 },
      { type: 'file', name: 'pubspec.yaml', weight: 0.6 }, // Flutter
      { type: 'file', name: 'app.json', weight: 0.5 }, // React Native/Expo
      { type: 'dependency', name: 'react-native', weight: 0.8 },
      { type: 'dependency', name: 'detox', weight: 0.8 },
      { type: 'dependency', name: 'expo', weight: 0.7 },
    ],
    mandatoryConditions: ['build', 'tests', 'e2e', 'e2e-coverage'],
  },

  // Backend API
  {
    type: 'backend-api',
    indicators: [
      { type: 'file', name: 'openapi.yaml', weight: 0.9 },
      { type: 'file', name: 'openapi.yml', weight: 0.9 },
      { type: 'file', name: 'swagger.yaml', weight: 0.9 },
      { type: 'file', name: 'swagger.yml', weight: 0.9 },
      { type: 'directory', name: 'src/routes', weight: 0.6 },
      { type: 'directory', name: 'src/controllers', weight: 0.6 },
      { type: 'directory', name: 'routes', weight: 0.6 },
      { type: 'directory', name: 'controllers', weight: 0.6 },
      { type: 'dependency', name: 'express', weight: 0.7 },
      { type: 'dependency', name: 'fastify', weight: 0.7 },
      { type: 'dependency', name: '@nestjs/core', weight: 0.7 },
      { type: 'dependency', name: 'koa', weight: 0.7 },
      { type: 'dependency', name: 'fastapi', weight: 0.7 },
      { type: 'dependency', name: 'django', weight: 0.7 },
      { type: 'dependency', name: 'flask', weight: 0.7 },
    ],
    mandatoryConditions: ['build', 'tests', 'integration', 'coverage', 'types'],
  },

  // Desktop App
  {
    type: 'desktop-app',
    indicators: [
      { type: 'file', name: 'electron-builder.yml', weight: 0.8 },
      { type: 'file', name: 'electron-builder.json', weight: 0.8 },
      { type: 'file', name: 'tauri.conf.json', weight: 0.8 },
      { type: 'dependency', name: 'electron', weight: 0.8 },
      { type: 'dependency', name: '@tauri-apps/api', weight: 0.8 },
    ],
    mandatoryConditions: ['build', 'tests', 'e2e', 'types'],
  },

  // Library
  {
    type: 'library',
    indicators: [
      { type: 'config', name: 'has-main-or-exports', weight: 0.6 },
      { type: 'file', name: 'src/index.ts', weight: 0.5 },
      { type: 'file', name: 'src/index.js', weight: 0.5 },
      { type: 'directory', name: 'lib', weight: 0.4 },
      { type: 'config', name: 'no-pages-directory', weight: 0.3 },
      { type: 'config', name: 'no-build-script', weight: 0.2 },
    ],
    mandatoryConditions: ['build', 'tests', 'coverage', 'types'],
  },

  // CLI Tool
  {
    type: 'cli-tool',
    indicators: [
      { type: 'config', name: 'has-bin-field', weight: 0.7 },
      { type: 'dependency', name: 'commander', weight: 0.7 },
      { type: 'dependency', name: 'yargs', weight: 0.7 },
      { type: 'dependency', name: 'inquirer', weight: 0.6 },
      { type: 'dependency', name: 'chalk', weight: 0.4 },
      { type: 'dependency', name: 'ora', weight: 0.4 },
    ],
    mandatoryConditions: ['build', 'tests', 'types'],
  },
];

const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Detect project type based on files, directories, and dependencies
 */
export function detectProjectType(projectRoot: string): ProjectDetection {
  const startTime = Date.now();

  // Check for package.json (Node.js projects)
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let packageJson: any = null;
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    } catch (error) {
      // Invalid package.json, continue without it
    }
  }

  // Evaluate each project type
  const results: Array<{
    type: ProjectType;
    score: number;
    maxScore: number;
    confidence: number;
    indicators: Indicator[];
    mandatoryConditions: string[];
  }> = [];

  for (const rule of DETECTION_RULES) {
    const indicators: Indicator[] = [];
    let score = 0;
    let maxScore = 0;

    for (const indicatorDef of rule.indicators) {
      maxScore += indicatorDef.weight;
      const found = checkIndicator(projectRoot, indicatorDef, packageJson);

      indicators.push({
        ...indicatorDef,
        found,
      });

      if (found) {
        score += indicatorDef.weight;
      }
    }

    const confidence = maxScore > 0 ? score / maxScore : 0;

    results.push({
      type: rule.type,
      score,
      maxScore,
      confidence,
      indicators,
      mandatoryConditions: rule.mandatoryConditions,
    });
  }

  // Sort by confidence (descending)
  results.sort((a, b) => b.confidence - a.confidence);

  // Get best match
  const best = results[0];

  // Check if confidence meets threshold
  if (best.confidence >= CONFIDENCE_THRESHOLD) {
    // Count how many indicators matched (for multi-factor validation)
    const matchedCount = best.indicators.filter((i) => i.found).length;

    if (matchedCount >= 2) {
      // Valid detection with multiple factors
      const elapsedMs = Date.now() - startTime;

      return {
        type: best.type,
        confidence: best.confidence,
        indicators: best.indicators.filter((i) => i.found),
        frameworks: detectFrameworks(packageJson),
        testFrameworks: detectTestFrameworks(projectRoot, packageJson),
        mandatoryConditions: best.mandatoryConditions,
      };
    }
  }

  // Fallback to generic
  const elapsedMs = Date.now() - startTime;

  return {
    type: 'generic',
    confidence: 0,
    indicators: [],
    frameworks: detectFrameworks(packageJson),
    testFrameworks: detectTestFrameworks(projectRoot, packageJson),
    mandatoryConditions: ['tests'], // Minimal enforcement for generic projects
  };
}

/**
 * Check if an indicator exists in the project
 */
function checkIndicator(
  projectRoot: string,
  indicator: Omit<Indicator, 'found'>,
  packageJson: any
): boolean {
  switch (indicator.type) {
    case 'file':
      return fs.existsSync(path.join(projectRoot, indicator.name));

    case 'directory':
      return (
        fs.existsSync(path.join(projectRoot, indicator.name)) &&
        fs.statSync(path.join(projectRoot, indicator.name)).isDirectory()
      );

    case 'dependency':
      if (!packageJson) return false;
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };
      return indicator.name in allDeps;

    case 'config':
      return checkConfigIndicator(projectRoot, indicator.name, packageJson);

    default:
      return false;
  }
}

/**
 * Check special config-based indicators
 */
function checkConfigIndicator(
  projectRoot: string,
  name: string,
  packageJson: any
): boolean {
  if (!packageJson) return false;

  switch (name) {
    case 'has-main-or-exports':
      return !!(packageJson.main || packageJson.exports);

    case 'has-bin-field':
      return !!packageJson.bin;

    case 'no-pages-directory':
      return (
        !fs.existsSync(path.join(projectRoot, 'pages')) &&
        !fs.existsSync(path.join(projectRoot, 'src/pages'))
      );

    case 'no-build-script':
      return !packageJson.scripts?.build;

    default:
      return false;
  }
}

/**
 * Detect frameworks from package.json
 */
function detectFrameworks(packageJson: any): string[] {
  if (!packageJson) return [];

  const frameworks: string[] = [];
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const frameworkMap: Record<string, string> = {
    next: 'Next.js',
    react: 'React',
    vue: 'Vue',
    '@angular/core': 'Angular',
    svelte: 'Svelte',
    express: 'Express',
    fastify: 'Fastify',
    '@nestjs/core': 'NestJS',
    koa: 'Koa',
    'react-native': 'React Native',
    expo: 'Expo',
    electron: 'Electron',
    '@tauri-apps/api': 'Tauri',
  };

  for (const [dep, framework] of Object.entries(frameworkMap)) {
    if (dep in allDeps) {
      frameworks.push(framework);
    }
  }

  return frameworks;
}

/**
 * Detect test frameworks from config files and dependencies
 */
function detectTestFrameworks(projectRoot: string, packageJson: any): string[] {
  const frameworks: string[] = [];

  // Check config files
  const testConfigs = [
    { file: 'playwright.config.ts', framework: 'Playwright' },
    { file: 'playwright.config.js', framework: 'Playwright' },
    { file: 'cypress.config.ts', framework: 'Cypress' },
    { file: 'cypress.config.js', framework: 'Cypress' },
    { file: 'vitest.config.ts', framework: 'Vitest' },
    { file: 'vitest.config.js', framework: 'Vitest' },
    { file: 'jest.config.js', framework: 'Jest' },
    { file: 'jest.config.ts', framework: 'Jest' },
    { file: '.detoxrc.js', framework: 'Detox' },
    { file: 'maestro.yaml', framework: 'Maestro' },
  ];

  for (const { file, framework } of testConfigs) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      if (!frameworks.includes(framework)) {
        frameworks.push(framework);
      }
    }
  }

  // Check dependencies
  if (packageJson) {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const depMap: Record<string, string> = {
      '@playwright/test': 'Playwright',
      cypress: 'Cypress',
      vitest: 'Vitest',
      jest: 'Jest',
      detox: 'Detox',
      '@testing-library/react': 'Testing Library',
      '@testing-library/vue': 'Testing Library',
    };

    for (const [dep, framework] of Object.entries(depMap)) {
      if (dep in allDeps && !frameworks.includes(framework)) {
        frameworks.push(framework);
      }
    }
  }

  return frameworks;
}

/**
 * Get human-readable description of detected project type
 */
export function getProjectTypeDescription(type: ProjectType): string {
  const descriptions: Record<ProjectType, string> = {
    'web-frontend':
      'Web frontend application (React, Vue, Angular, or similar)',
    'web-fullstack': 'Full-stack web application (Next.js, SvelteKit, etc.)',
    'mobile-native': 'Mobile native application (React Native, Flutter, etc.)',
    'backend-api': 'Backend API service (Express, FastAPI, NestJS, etc.)',
    'desktop-app': 'Desktop application (Electron, Tauri, etc.)',
    library: 'Library or package (npm, PyPI, gem, etc.)',
    'cli-tool': 'Command-line tool',
    generic: 'Generic project (type could not be determined)',
  };

  return descriptions[type] || 'Unknown project type';
}
