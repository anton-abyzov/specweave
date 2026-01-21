/**
 * Project Detector for Lazy Plugin Loading
 *
 * Analyzes project files to detect the project type and suggest relevant plugins.
 * Used by session-start hook for proactive plugin pre-loading.
 *
 * Detection is fast (<1 second) using file existence checks only.
 *
 * @module core/lazy-loading/project-detector
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Result of project type detection
 */
export interface ProjectTypeResult {
  /** Detected project types (react, express, etc.) */
  types: string[];
  /** Recommended plugins to install */
  plugins: string[];
  /** Detection latency in milliseconds */
  latencyMs?: number;
}

/**
 * Project type detection rule
 */
interface DetectionRule {
  /** Type identifier */
  type: string;
  /** Plugins to suggest when this type is detected */
  plugins: string[];
  /** Detection function */
  detect: (projectPath: string) => boolean;
}

/**
 * Helper to check if a file exists
 */
function fileExists(projectPath: string, filePath: string): boolean {
  return existsSync(join(projectPath, filePath));
}

/**
 * Helper to check if a directory exists
 */
function dirExists(projectPath: string, dirPath: string): boolean {
  return existsSync(join(projectPath, dirPath));
}

/**
 * Helper to check if package.json has a dependency
 */
function packageJsonHas(projectPath: string, dependency: string): boolean {
  const packageJsonPath = join(projectPath, 'package.json');
  if (!existsSync(packageJsonPath)) return false;

  try {
    const content = readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(content);
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };
    return dependency in deps;
  } catch {
    return false;
  }
}

/**
 * Helper to check if a file contains a string (fast search)
 */
function fileContains(projectPath: string, filePath: string, searchString: string): boolean {
  const fullPath = join(projectPath, filePath);
  if (!existsSync(fullPath)) return false;

  try {
    const content = readFileSync(fullPath, 'utf8');
    return content.toLowerCase().includes(searchString.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Project type detection rules
 * Ordered by specificity (more specific first)
 */
const DETECTION_RULES: DetectionRule[] = [
  // Frontend frameworks
  {
    type: 'nextjs',
    plugins: ['frontend', 'backend'],
    detect: (p) => packageJsonHas(p, 'next') || fileExists(p, 'next.config.js') || fileExists(p, 'next.config.mjs') || fileExists(p, 'next.config.ts'),
  },
  {
    type: 'nuxt',
    plugins: ['frontend', 'backend'],
    detect: (p) => packageJsonHas(p, 'nuxt') || fileExists(p, 'nuxt.config.js') || fileExists(p, 'nuxt.config.ts'),
  },
  {
    type: 'react',
    plugins: ['frontend'],
    detect: (p) => packageJsonHas(p, 'react') || fileExists(p, 'src/App.tsx') || fileExists(p, 'src/App.jsx'),
  },
  {
    type: 'vue',
    plugins: ['frontend'],
    detect: (p) => packageJsonHas(p, 'vue') || fileExists(p, 'src/App.vue'),
  },
  {
    type: 'angular',
    plugins: ['frontend'],
    detect: (p) => packageJsonHas(p, '@angular/core') || fileExists(p, 'angular.json'),
  },
  {
    type: 'svelte',
    plugins: ['frontend'],
    detect: (p) => packageJsonHas(p, 'svelte') || fileExists(p, 'svelte.config.js'),
  },

  // Backend frameworks - Node.js
  {
    type: 'nestjs',
    plugins: ['backend'],
    detect: (p) => packageJsonHas(p, '@nestjs/core') || fileExists(p, 'nest-cli.json'),
  },
  {
    type: 'express',
    plugins: ['backend'],
    detect: (p) => packageJsonHas(p, 'express'),
  },
  {
    type: 'fastify',
    plugins: ['backend'],
    detect: (p) => packageJsonHas(p, 'fastify'),
  },

  // Backend frameworks - Python
  {
    type: 'fastapi',
    plugins: ['backend'],
    detect: (p) =>
      fileContains(p, 'requirements.txt', 'fastapi') ||
      fileContains(p, 'pyproject.toml', 'fastapi'),
  },
  {
    type: 'django',
    plugins: ['backend'],
    detect: (p) =>
      fileExists(p, 'manage.py') ||
      fileContains(p, 'requirements.txt', 'django') ||
      fileContains(p, 'pyproject.toml', 'django'),
  },
  {
    type: 'flask',
    plugins: ['backend'],
    detect: (p) =>
      fileContains(p, 'requirements.txt', 'flask') ||
      fileContains(p, 'pyproject.toml', 'flask'),
  },

  // Backend frameworks - Go
  {
    type: 'go',
    plugins: ['backend'],
    detect: (p) => fileExists(p, 'go.mod'),
  },

  // Backend frameworks - Rust
  {
    type: 'rust',
    plugins: ['backend'],
    detect: (p) => fileExists(p, 'Cargo.toml'),
  },

  // Backend frameworks - Java/Kotlin
  {
    type: 'spring',
    plugins: ['backend'],
    detect: (p) =>
      fileContains(p, 'pom.xml', 'spring-boot') ||
      fileContains(p, 'build.gradle', 'spring-boot') ||
      fileContains(p, 'build.gradle.kts', 'spring-boot'),
  },

  // Infrastructure
  {
    type: 'kubernetes',
    plugins: ['k8s', 'infra'],
    detect: (p) =>
      dirExists(p, 'k8s') ||
      dirExists(p, 'kubernetes') ||
      dirExists(p, 'helm') ||
      fileExists(p, 'Chart.yaml') ||
      fileExists(p, 'kustomization.yaml'),
  },
  {
    type: 'docker',
    plugins: ['infra'],
    detect: (p) =>
      fileExists(p, 'Dockerfile') ||
      fileExists(p, 'docker-compose.yml') ||
      fileExists(p, 'docker-compose.yaml') ||
      fileExists(p, 'compose.yml') ||
      fileExists(p, 'compose.yaml'),
  },
  {
    type: 'terraform',
    plugins: ['infra'],
    detect: (p) =>
      fileExists(p, 'main.tf') ||
      fileExists(p, 'terraform.tf') ||
      dirExists(p, 'terraform'),
  },
  {
    type: 'pulumi',
    plugins: ['infra'],
    detect: (p) => fileExists(p, 'Pulumi.yaml'),
  },

  // Integrations
  {
    type: 'github',
    plugins: ['github'],
    detect: (p) => dirExists(p, '.github'),
  },
  {
    type: 'jira',
    plugins: ['jira'],
    detect: (p) => {
      const configPath = join(p, '.specweave', 'config.json');
      if (!existsSync(configPath)) return false;
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        return config?.sync?.jira?.enabled === true;
      } catch {
        return false;
      }
    },
  },
  {
    type: 'ado',
    plugins: ['ado'],
    detect: (p) => {
      const configPath = join(p, '.specweave', 'config.json');
      if (!existsSync(configPath)) return false;
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        return config?.sync?.ado?.enabled === true;
      } catch {
        return false;
      }
    },
  },

  // Mobile
  {
    type: 'react-native',
    plugins: ['mobile'],
    detect: (p) => packageJsonHas(p, 'react-native') || fileExists(p, 'metro.config.js'),
  },
  {
    type: 'expo',
    plugins: ['mobile'],
    detect: (p) => packageJsonHas(p, 'expo') || fileExists(p, 'app.json'),
  },
  {
    type: 'ios',
    plugins: ['mobile'],
    detect: (p) => dirExists(p, 'ios') || fileExists(p, 'Podfile'),
  },
  {
    type: 'android',
    plugins: ['mobile'],
    detect: (p) => dirExists(p, 'android') || fileExists(p, 'build.gradle'),
  },

  // ML/AI
  {
    type: 'pytorch',
    plugins: ['ml'],
    detect: (p) =>
      fileContains(p, 'requirements.txt', 'torch') ||
      fileContains(p, 'pyproject.toml', 'torch'),
  },
  {
    type: 'tensorflow',
    plugins: ['ml'],
    detect: (p) =>
      fileContains(p, 'requirements.txt', 'tensorflow') ||
      fileContains(p, 'pyproject.toml', 'tensorflow'),
  },

  // Messaging
  {
    type: 'kafka',
    plugins: ['kafka'],
    detect: (p) =>
      packageJsonHas(p, 'kafkajs') ||
      fileContains(p, 'requirements.txt', 'kafka') ||
      fileContains(p, 'docker-compose.yml', 'kafka'),
  },

  // Testing
  {
    type: 'playwright',
    plugins: ['testing'],
    detect: (p) => packageJsonHas(p, '@playwright/test') || fileExists(p, 'playwright.config.ts'),
  },
  {
    type: 'cypress',
    plugins: ['testing'],
    detect: (p) => packageJsonHas(p, 'cypress') || dirExists(p, 'cypress'),
  },
  {
    type: 'vitest',
    plugins: ['testing'],
    detect: (p) => packageJsonHas(p, 'vitest') || fileExists(p, 'vitest.config.ts'),
  },
  {
    type: 'jest',
    plugins: ['testing'],
    detect: (p) => packageJsonHas(p, 'jest') || fileExists(p, 'jest.config.js'),
  },

  // Payments
  {
    type: 'stripe',
    plugins: ['payments'],
    detect: (p) => packageJsonHas(p, 'stripe') || fileContains(p, 'requirements.txt', 'stripe'),
  },
];

/**
 * Detects project types based on files in the project directory
 *
 * @param projectPath - Path to the project root directory
 * @returns Detection result with types and recommended plugins
 *
 * @example
 * ```ts
 * const result = detectProjectType('/path/to/react-app');
 * // { types: ['react', 'github'], plugins: ['frontend', 'github'] }
 * ```
 */
export function detectProjectType(projectPath: string = process.cwd()): ProjectTypeResult {
  const startTime = performance.now();
  const detectedTypes: string[] = [];
  const detectedPlugins = new Set<string>();

  // Run all detection rules
  for (const rule of DETECTION_RULES) {
    try {
      if (rule.detect(projectPath)) {
        detectedTypes.push(rule.type);
        rule.plugins.forEach((p) => detectedPlugins.add(p));
      }
    } catch {
      // Ignore detection errors
    }
  }

  return {
    types: detectedTypes,
    plugins: Array.from(detectedPlugins),
    latencyMs: performance.now() - startTime,
  };
}

/**
 * Gets recommended plugins for a list of project types
 *
 * @param types - Array of project type identifiers
 * @returns Array of recommended plugin names
 */
export function getRecommendedPlugins(types: string[]): string[] {
  const plugins = new Set<string>();

  for (const type of types) {
    const rule = DETECTION_RULES.find((r) => r.type === type);
    if (rule) {
      rule.plugins.forEach((p) => plugins.add(p));
    }
  }

  return Array.from(plugins);
}

/**
 * Gets all available detection rules (for testing/debugging)
 */
export function getDetectionRules(): Array<{ type: string; plugins: string[] }> {
  return DETECTION_RULES.map((r) => ({ type: r.type, plugins: r.plugins }));
}
