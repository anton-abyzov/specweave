/**
 * Smart .gitignore generator
 *
 * Generates appropriate .gitignore based on:
 * 1. Detected tech stack from existing files
 * 2. User's first prompt (framework hints)
 * 3. Project structure analysis
 *
 * For multi-repo projects, each repository can get its own tailored .gitignore.
 *
 * @since v1.0.130
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Detected technology/framework in the project
 */
export interface DetectedTech {
  name: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'file' | 'config' | 'prompt';
  category: TechCategory;
}

export type TechCategory =
  | 'language'
  | 'framework'
  | 'build-tool'
  | 'database'
  | 'testing'
  | 'runtime'
  | 'platform';

/**
 * Tech stack detection result
 */
export interface TechStackDetection {
  detected: DetectedTech[];
  primary: string | null;  // Primary framework/language
  categories: Map<TechCategory, string[]>;
}

/**
 * .gitignore entries organized by tech
 */
const GITIGNORE_ENTRIES: Record<string, string[]> = {
  // === Languages ===
  javascript: [
    '# JavaScript/TypeScript',
    'node_modules/',
    '.pnpm-store/',
    '.yarn/',
    '.npm/',
    'package-lock.json',  // Optional: some teams commit this
    '*.tsbuildinfo',
    '.eslintcache',
  ],
  typescript: [
    '# TypeScript',
    '*.tsbuildinfo',
    'dist/',
    'build/',
    '*.d.ts.map',
  ],
  python: [
    '# Python',
    '__pycache__/',
    '*.py[cod]',
    '*$py.class',
    '*.so',
    '.Python',
    'venv/',
    'env/',
    'ENV/',
    '.venv/',
    'pip-log.txt',
    '.mypy_cache/',
    '.ruff_cache/',
    '.pytest_cache/',
    '*.egg-info/',
    '*.egg',
    'MANIFEST',
    '.python-version',
  ],
  rust: [
    '# Rust',
    'target/',
    'Cargo.lock',  // For libraries (keep for binaries)
    '**/*.rs.bk',
  ],
  go: [
    '# Go',
    'vendor/',
    'go.sum',
    '*.exe',
    '*.test',
    '*.out',
  ],
  java: [
    '# Java',
    '*.class',
    '*.jar',
    '*.war',
    '*.ear',
    '*.nar',
    'hs_err_pid*',
    'replay_pid*',
    '.gradle/',
    'build/',
    'target/',
    '.project',
    '.classpath',
  ],
  csharp: [
    '# C#/.NET',
    'bin/',
    'obj/',
    '*.user',
    '*.userosscache',
    '*.sln.docstates',
    '[Dd]ebug/',
    '[Rr]elease/',
    'packages/',
    '.nuget/',
    '*.nupkg',
  ],
  ruby: [
    '# Ruby',
    '*.gem',
    '*.rbc',
    '.bundle/',
    'vendor/bundle/',
    '.ruby-version',
    '.ruby-gemset',
    'Gemfile.lock',  // Optional for gems
  ],
  php: [
    '# PHP',
    'vendor/',
    'composer.lock',
    '.phpunit.result.cache',
    '.php_cs.cache',
    '.php-cs-fixer.cache',
  ],
  swift: [
    '# Swift/iOS',
    '.build/',
    'DerivedData/',
    '*.xcodeproj/',
    '*.xcworkspace/',
    '*.pbxuser',
    'xcuserdata/',
    'Pods/',
    'Carthage/Build/',
  ],
  kotlin: [
    '# Kotlin',
    '.kotlin/',
    '*.class',
    'build/',
    '.gradle/',
  ],

  // === Frontend Frameworks ===
  nextjs: [
    '# Next.js',
    '.next/',
    'out/',
    '.vercel/',
    'next-env.d.ts',
  ],
  react: [
    '# React',
    'build/',
    '.cache/',
  ],
  vue: [
    '# Vue',
    '.nuxt/',
    '.output/',
    'dist/',
  ],
  angular: [
    '# Angular',
    '.angular/',
    'dist/',
  ],
  svelte: [
    '# Svelte/SvelteKit',
    '.svelte-kit/',
    'build/',
  ],
  remix: [
    '# Remix',
    '.cache/',
    'build/',
    'public/build/',
  ],
  astro: [
    '# Astro',
    '.astro/',
    'dist/',
  ],

  // === Backend Frameworks ===
  nestjs: [
    '# NestJS',
    'dist/',
    '.nest/',
  ],
  express: [
    '# Express',
    'dist/',
  ],
  fastapi: [
    '# FastAPI',
    '__pycache__/',
    '.pytest_cache/',
  ],
  django: [
    '# Django',
    '*.log',
    'db.sqlite3',
    'staticfiles/',
    'media/',
    '*/migrations/__pycache__/',
  ],
  rails: [
    '# Rails',
    '/log/*',
    '/tmp/*',
    '/storage/*',
    '.byebug_history',
  ],
  spring: [
    '# Spring Boot',
    'target/',
    '.mvn/',
    'mvnw',
    'mvnw.cmd',
  ],

  // === Mobile ===
  'react-native': [
    '# React Native',
    '.expo/',
    '.expo-shared/',
    '*.jks',
    '*.keystore',
    'android/.gradle/',
    'android/app/build/',
    'ios/Pods/',
    'ios/build/',
  ],
  flutter: [
    '# Flutter',
    '.dart_tool/',
    '.flutter-plugins',
    '.flutter-plugins-dependencies',
    '.packages',
    '.pub-cache/',
    'build/',
  ],

  // === Build Tools ===
  webpack: [
    '# Webpack',
    '.cache/',
    'dist/',
  ],
  vite: [
    '# Vite',
    '.vite/',
    'dist/',
  ],
  turbo: [
    '# Turborepo',
    '.turbo/',
  ],
  esbuild: [
    '# esbuild',
    'dist/',
    'build/',
  ],

  // === Databases ===
  prisma: [
    '# Prisma',
    'prisma/migrations/*/migration.sql',
    'prisma/*.db',
    'prisma/*.db-journal',
  ],
  drizzle: [
    '# Drizzle',
    'drizzle/',
  ],
  sqlite: [
    '# SQLite',
    '*.db',
    '*.sqlite',
    '*.sqlite3',
    '*.db-shm',
    '*.db-wal',
  ],
  mongodb: [
    '# MongoDB',
    'data/db/',
  ],

  // === Testing ===
  jest: [
    '# Jest',
    'coverage/',
    '.jest/',
  ],
  vitest: [
    '# Vitest',
    'coverage/',
  ],
  playwright: [
    '# Playwright',
    'test-results/',
    'playwright-report/',
    'playwright/.cache/',
  ],
  cypress: [
    '# Cypress',
    'cypress/videos/',
    'cypress/screenshots/',
  ],

  // === Infrastructure ===
  docker: [
    '# Docker',
    '.docker/',
  ],
  terraform: [
    '# Terraform',
    '.terraform/',
    '*.tfstate',
    '*.tfstate.*',
    '*.tfvars',
    'override.tf',
    'override.tf.json',
    '*_override.tf',
    '*_override.tf.json',
    '.terraformrc',
    'terraform.rc',
  ],
  kubernetes: [
    '# Kubernetes',
    '*.kubeconfig',
    'kubeconfig',
  ],

  // === Cloud Platforms ===
  vercel: [
    '# Vercel',
    '.vercel/',
  ],
  netlify: [
    '# Netlify',
    '.netlify/',
  ],
  aws: [
    '# AWS',
    '.aws-sam/',
    'samconfig.toml',
    'cdk.out/',
  ],
  firebase: [
    '# Firebase',
    '.firebase/',
    'firebase-debug.log',
    '.firebaserc',
  ],

  // === Common entries (always included) ===
  common: [
    '# Dependencies',
    'node_modules/',
    '',
    '# Environment',
    '.env',
    '.env.local',
    '.env.*.local',
    '*.env',
    '',
    '# IDEs',
    '.vscode/',
    '.idea/',
    '*.swp',
    '*.swo',
    '*~',
    '',
    '# OS',
    '.DS_Store',
    'Thumbs.db',
    'desktop.ini',
    '',
    '# Logs',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    '',
    '# Temporary',
    '*.tmp',
    '.temp/',
    'tmp/',
  ],

  // === SpecWeave entries (always included) ===
  specweave: [
    '# SpecWeave',
    '.specweave/cache/',
    '.specweave/increments/*/logs/',
    '.specweave/increments/*/test-results/',
    '.specweave/docs-site-internal/',
    '.claude-plugin/',
    'plugins/',
  ],
};

/**
 * File patterns that indicate specific tech
 */
const DETECTION_PATTERNS: Array<{
  files: string[];
  tech: string;
  category: TechCategory;
  confidence: 'high' | 'medium' | 'low';
}> = [
  // Languages (by config files)
  { files: ['package.json'], tech: 'javascript', category: 'language', confidence: 'high' },
  { files: ['tsconfig.json'], tech: 'typescript', category: 'language', confidence: 'high' },
  { files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'], tech: 'python', category: 'language', confidence: 'high' },
  { files: ['Cargo.toml'], tech: 'rust', category: 'language', confidence: 'high' },
  { files: ['go.mod'], tech: 'go', category: 'language', confidence: 'high' },
  { files: ['pom.xml', 'build.gradle', 'build.gradle.kts'], tech: 'java', category: 'language', confidence: 'high' },
  { files: ['*.csproj', '*.sln'], tech: 'csharp', category: 'language', confidence: 'high' },
  { files: ['Gemfile'], tech: 'ruby', category: 'language', confidence: 'high' },
  { files: ['composer.json'], tech: 'php', category: 'language', confidence: 'high' },
  { files: ['Package.swift'], tech: 'swift', category: 'language', confidence: 'high' },
  { files: ['build.gradle.kts'], tech: 'kotlin', category: 'language', confidence: 'medium' },

  // Frontend Frameworks
  { files: ['next.config.js', 'next.config.ts', 'next.config.mjs'], tech: 'nextjs', category: 'framework', confidence: 'high' },
  { files: ['vue.config.js', 'nuxt.config.ts', 'nuxt.config.js'], tech: 'vue', category: 'framework', confidence: 'high' },
  { files: ['angular.json'], tech: 'angular', category: 'framework', confidence: 'high' },
  { files: ['svelte.config.js', 'svelte.config.ts'], tech: 'svelte', category: 'framework', confidence: 'high' },
  { files: ['remix.config.js', 'remix.config.ts'], tech: 'remix', category: 'framework', confidence: 'high' },
  { files: ['astro.config.mjs', 'astro.config.ts'], tech: 'astro', category: 'framework', confidence: 'high' },

  // Backend Frameworks
  { files: ['nest-cli.json'], tech: 'nestjs', category: 'framework', confidence: 'high' },
  { files: ['manage.py'], tech: 'django', category: 'framework', confidence: 'high' },
  { files: ['config/routes.rb'], tech: 'rails', category: 'framework', confidence: 'high' },

  // Mobile
  { files: ['app.json', 'expo.json'], tech: 'react-native', category: 'framework', confidence: 'high' },
  { files: ['pubspec.yaml'], tech: 'flutter', category: 'framework', confidence: 'high' },

  // Build Tools
  { files: ['webpack.config.js', 'webpack.config.ts'], tech: 'webpack', category: 'build-tool', confidence: 'high' },
  { files: ['vite.config.js', 'vite.config.ts'], tech: 'vite', category: 'build-tool', confidence: 'high' },
  { files: ['turbo.json'], tech: 'turbo', category: 'build-tool', confidence: 'high' },

  // Databases
  { files: ['prisma/schema.prisma'], tech: 'prisma', category: 'database', confidence: 'high' },
  { files: ['drizzle.config.ts', 'drizzle.config.js'], tech: 'drizzle', category: 'database', confidence: 'high' },

  // Testing
  { files: ['jest.config.js', 'jest.config.ts'], tech: 'jest', category: 'testing', confidence: 'high' },
  { files: ['vitest.config.js', 'vitest.config.ts'], tech: 'vitest', category: 'testing', confidence: 'high' },
  { files: ['playwright.config.js', 'playwright.config.ts'], tech: 'playwright', category: 'testing', confidence: 'high' },
  { files: ['cypress.config.js', 'cypress.config.ts', 'cypress.json'], tech: 'cypress', category: 'testing', confidence: 'high' },

  // Infrastructure
  { files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'], tech: 'docker', category: 'platform', confidence: 'high' },
  { files: ['*.tf', 'main.tf'], tech: 'terraform', category: 'platform', confidence: 'high' },
  { files: ['vercel.json'], tech: 'vercel', category: 'platform', confidence: 'high' },
  { files: ['netlify.toml'], tech: 'netlify', category: 'platform', confidence: 'high' },
  { files: ['firebase.json'], tech: 'firebase', category: 'platform', confidence: 'high' },
  { files: ['serverless.yml', 'serverless.yaml'], tech: 'aws', category: 'platform', confidence: 'high' },
];

/**
 * Keywords in prompts that suggest tech stack
 */
const PROMPT_KEYWORDS: Record<string, string[]> = {
  nextjs: ['nextjs', 'next.js', 'next js', 'next 14', 'next 15', 'app router'],
  react: ['react', 'react.js', 'reactjs', 'create-react-app', 'cra'],
  vue: ['vue', 'vuejs', 'vue.js', 'nuxt', 'nuxtjs'],
  angular: ['angular', 'angularjs', 'ng'],
  svelte: ['svelte', 'sveltekit', 'svelte kit'],
  remix: ['remix', 'remix.run'],
  astro: ['astro'],
  nestjs: ['nestjs', 'nest.js', 'nest'],
  express: ['express', 'expressjs'],
  fastapi: ['fastapi', 'fast api', 'starlette'],
  django: ['django'],
  rails: ['rails', 'ruby on rails', 'ror'],
  spring: ['spring', 'spring boot', 'springboot'],
  'react-native': ['react native', 'react-native', 'expo', 'rn app', 'mobile app'],
  flutter: ['flutter', 'dart'],
  typescript: ['typescript', 'ts'],
  python: ['python', 'py', 'fastapi', 'django', 'flask'],
  rust: ['rust', 'cargo'],
  go: ['golang', 'go lang'],
  prisma: ['prisma'],
  drizzle: ['drizzle'],
  docker: ['docker', 'containerize', 'container'],
  kubernetes: ['kubernetes', 'k8s', 'kubectl', 'helm'],
  terraform: ['terraform', 'tf', 'infrastructure as code', 'iac'],
  vercel: ['vercel', 'deploy to vercel'],
  aws: ['aws', 'lambda', 'dynamodb', 'amplify'],
};

/**
 * Detect tech stack from existing files in directory
 */
export async function detectTechStack(
  targetDir: string,
  userPrompt?: string
): Promise<TechStackDetection> {
  const detected: DetectedTech[] = [];
  const categories = new Map<TechCategory, string[]>();

  // 1. Detect from existing files
  for (const pattern of DETECTION_PATTERNS) {
    for (const filePattern of pattern.files) {
      // Handle glob patterns vs exact files
      const files = filePattern.includes('*')
        ? await findFilesWithPattern(targetDir, filePattern)
        : [path.join(targetDir, filePattern)];

      for (const filePath of files) {
        if (fs.existsSync(filePath)) {
          detected.push({
            name: pattern.tech,
            confidence: pattern.confidence,
            source: 'file',
            category: pattern.category,
          });
          break; // Only add once per tech
        }
      }
    }
  }

  // 2. Detect from user prompt keywords
  if (userPrompt) {
    const promptLower = userPrompt.toLowerCase();
    for (const [tech, keywords] of Object.entries(PROMPT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (promptLower.includes(keyword)) {
          // Check if already detected from files
          if (!detected.some(d => d.name === tech)) {
            detected.push({
              name: tech,
              confidence: 'medium',
              source: 'prompt',
              category: getTechCategory(tech),
            });
          }
          break;
        }
      }
    }
  }

  // 3. Organize by category
  for (const tech of detected) {
    const existing = categories.get(tech.category) || [];
    if (!existing.includes(tech.name)) {
      existing.push(tech.name);
    }
    categories.set(tech.category, existing);
  }

  // 4. Determine primary tech (highest confidence framework, then language)
  let primary: string | null = null;
  const frameworks = detected.filter(d => d.category === 'framework' && d.confidence === 'high');
  if (frameworks.length > 0) {
    primary = frameworks[0].name;
  } else {
    const languages = detected.filter(d => d.category === 'language' && d.confidence === 'high');
    if (languages.length > 0) {
      primary = languages[0].name;
    }
  }

  return { detected, primary, categories };
}

/**
 * Get category for a tech name
 */
function getTechCategory(tech: string): TechCategory {
  const pattern = DETECTION_PATTERNS.find(p => p.tech === tech);
  return pattern?.category || 'framework';
}

/**
 * Find files matching a glob pattern (simple implementation)
 */
async function findFilesWithPattern(dir: string, pattern: string): Promise<string[]> {
  const results: string[] = [];
  const extension = pattern.replace('*', '');

  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith(extension)) {
        results.push(path.join(dir, file));
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return results;
}

/**
 * Generate .gitignore content based on detected tech stack
 */
export function generateGitignore(
  detection: TechStackDetection,
  options?: {
    includeSpecweave?: boolean;
    includeCommon?: boolean;
    customEntries?: string[];
  }
): string {
  const { includeSpecweave = true, includeCommon = true, customEntries = [] } = options || {};

  const sections: string[] = [];

  // Add detected tech entries (deduplicated)
  const addedTechs = new Set<string>();

  // Sort by category for cleaner output
  const categoryOrder: TechCategory[] = [
    'language',
    'framework',
    'build-tool',
    'database',
    'testing',
    'runtime',
    'platform',
  ];

  for (const category of categoryOrder) {
    const techs = detection.categories.get(category) || [];
    for (const tech of techs) {
      if (!addedTechs.has(tech) && GITIGNORE_ENTRIES[tech]) {
        sections.push(...GITIGNORE_ENTRIES[tech]);
        sections.push('');
        addedTechs.add(tech);
      }
    }
  }

  // Add common entries
  if (includeCommon && GITIGNORE_ENTRIES.common) {
    sections.push(...GITIGNORE_ENTRIES.common);
    sections.push('');
  }

  // Add SpecWeave entries
  if (includeSpecweave && GITIGNORE_ENTRIES.specweave) {
    sections.push(...GITIGNORE_ENTRIES.specweave);
    sections.push('');
  }

  // Add custom entries
  if (customEntries.length > 0) {
    sections.push('# Project-specific');
    sections.push(...customEntries);
    sections.push('');
  }

  // Clean up multiple blank lines
  return sections
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

/**
 * Generate .gitignore for a specific repository in multi-repo setup
 */
export async function generateRepoGitignore(
  repoPath: string,
  userPrompt?: string
): Promise<string> {
  const detection = await detectTechStack(repoPath, userPrompt);
  return generateGitignore(detection);
}

/**
 * Write .gitignore to directory (merges with existing if present)
 */
export async function writeGitignore(
  targetDir: string,
  content: string,
  options?: { merge?: boolean; backup?: boolean }
): Promise<{ action: 'created' | 'merged' | 'skipped'; path: string }> {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const { merge = true, backup = true } = options || {};

  // Check for existing .gitignore
  if (fs.existsSync(gitignorePath)) {
    if (!merge) {
      return { action: 'skipped', path: gitignorePath };
    }

    const existing = fs.readFileSync(gitignorePath, 'utf-8');

    // Backup existing
    if (backup) {
      fs.writeFileSync(`${gitignorePath}.backup`, existing);
    }

    // Merge: add new entries that don't exist
    const existingLines = new Set(
      existing.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    );

    const newLines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      // Keep comments and blank lines
      if (!trimmed || trimmed.startsWith('#')) return true;
      // Only add if not already present
      return !existingLines.has(trimmed);
    });

    if (newLines.filter(l => l.trim() && !l.startsWith('#')).length === 0) {
      // No new entries to add
      return { action: 'skipped', path: gitignorePath };
    }

    // Append new entries
    const merged = existing.trimEnd() + '\n\n# Auto-detected by SpecWeave\n' + newLines.join('\n');
    fs.writeFileSync(gitignorePath, merged);
    return { action: 'merged', path: gitignorePath };
  }

  // Create new .gitignore
  fs.writeFileSync(gitignorePath, content);
  return { action: 'created', path: gitignorePath };
}

/**
 * Main entry: detect and generate .gitignore for a project
 */
export async function generateSmartGitignore(
  targetDir: string,
  userPrompt?: string,
  options?: {
    merge?: boolean;
    backup?: boolean;
    includeSpecweave?: boolean;
    verbose?: boolean;
  }
): Promise<{
  detection: TechStackDetection;
  result: { action: 'created' | 'merged' | 'skipped'; path: string };
}> {
  const { verbose = false, ...writeOptions } = options || {};

  // Detect tech stack
  const detection = await detectTechStack(targetDir, userPrompt);

  if (verbose && detection.detected.length > 0) {
    console.log(chalk.blue('   Detected tech stack:'));
    for (const tech of detection.detected) {
      const confidence = tech.confidence === 'high' ? '●' : tech.confidence === 'medium' ? '◐' : '○';
      console.log(chalk.gray(`     ${confidence} ${tech.name} (${tech.source})`));
    }
  }

  // Generate .gitignore content
  const content = generateGitignore(detection, {
    includeSpecweave: writeOptions.includeSpecweave,
  });

  // Write to file
  const result = await writeGitignore(targetDir, content, writeOptions);

  if (verbose) {
    if (result.action === 'created') {
      console.log(chalk.green(`   ✓ .gitignore created with ${detection.detected.length} tech patterns`));
    } else if (result.action === 'merged') {
      console.log(chalk.blue(`   ✓ .gitignore merged with detected patterns`));
    }
  }

  return { detection, result };
}
