/**
 * SpecWeave's own `.gitignore` lines (`ensureSpecweaveGitignoreEntries`, used
 * by init and update), and the tech-stack detection living docs reads.
 * Init no longer writes other people's rules (1407).
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';

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

/** The lines SpecWeave owns in a project's `.gitignore` (1407: init and update write only these). */
const SPECWEAVE_ENTRIES: string[] = [
  '# SpecWeave',
  '.specweave/cache/',
  '.specweave/increments/*/logs/',
  '.specweave/increments/*/test-results/',
  '.specweave/docs-site-internal/',
  // Root only: older versions copied plugins there; a project's own src/plugins/ stays tracked.
  '/.claude-plugin/',
  '/plugins/',
  'vskill.lock',
  '# Work handoff (secret-scrubbed, never auto-committed)',
  '.handoff/',
  '.specweave/state/handoff-latest.*',
  '# Runtime state (machine-local, regenerated)',
  '.specweave/state/',
  '.specweave/logs/',
  '.specweave/backups/',
  '.specweave/jobs/',
  '/.specweave.backup-*/',
  '# Binary evidence and agent worktrees (never committed)',
  '.specweave/increments/**/reports/artifacts/',
  '.claude/worktrees/',
  '.worktrees/',
  '# Binary evidence in increment reports/ (videos, screenshots)',
  '**/.specweave/**/reports/*.mp4',
  '**/.specweave/**/reports/*.png',
  '**/.specweave/**/reports/*.jpg',
];

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
 * Lines an earlier `specweave update` wrote that it now removes again. Both
 * negations un-ignored old logs by the hundred; task evidence is `.txt` now.
 */
const DROPPED_SPECWEAVE_LINES = new Set([
  '!.specweave/increments/**/reports/*.log',
  '!.specweave/increments/**/reports/task-T-*.log',
  '# `task done --run` writes its evidence to reports/task-<id>.log and the',
  '# ledger cites it, so that log is committed; every other *.log stays ignored.',
  '# reports/ holds COMMITTED evidence: the generic `*.log` rule above would',
  '# swallow the task evidence log a ledger `done` event cites, so a teammate',
  '# cloning the repo could not read it. Only reports/artifacts/ is ignored.',
])

const UPDATE_HEADER = '# SpecWeave (added by specweave update)';

/** Older, wider forms of a current rule: a file that has one needs nothing added. */
const LEGACY_FORMS: Record<string, string> = {
  '/.claude-plugin/': '.claude-plugin/',
  '/plugins/': 'plugins/',
  '**/.specweave/**/reports/*.mp4': '**/reports/*.mp4',
  '**/.specweave/**/reports/*.png': '**/reports/*.png',
  '**/.specweave/**/reports/*.jpg': '**/reports/*.jpg',
};

/**
 * Drop an update header whose block (up to the next blank line) has no rule
 * left in it, together with the blank line written above it. Happens when
 * every line under it was one of the dropped negations.
 */
function dropOrphanUpdateHeaders(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === UPDATE_HEADER) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('#')) j++;
      if (j >= lines.length || lines[j].trim() === '') {
        if (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
        i = j - 1;
        continue;
      }
    }
    out.push(lines[i]);
  }
  return out;
}

/**
 * Append the SpecWeave runtime-state entries (`.specweave/state/`, logs, jobs,
 * cache, backups, `reports/artifacts/`, `.claude/worktrees/`) to an existing
 * `.gitignore`, skipping every line that is already there.
 *
 * Used by `specweave update` so upgraded projects get the 2.0 hygiene rules
 * without regenerating their whole .gitignore. Idempotent; creates the file
 * when it is missing.
 */
export function ensureSpecweaveGitignoreEntries(
  targetDir: string,
  header: string = UPDATE_HEADER,
): { added: string[]; path: string } {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const wanted = SPECWEAVE_ENTRIES;
  let existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';

  // 3.0.0 to 3.0.2 appended negations that un-ignored old logs under
  // reports/ (hundreds in a long-lived project). Take them back out.
  const withoutNegation = dropOrphanUpdateHeaders(
    existing.split('\n').filter((line) => !DROPPED_SPECWEAVE_LINES.has(line.trim())),
  ).join('\n');
  if (withoutNegation !== existing) {
    existing = withoutNegation;
    fs.writeFileSync(gitignorePath, existing);
  }
  const present = new Set(existing.split('\n').map((l) => l.trim()).filter(Boolean));

  const missing = wanted.filter((line) => {
    const rule = line.trim();
    if (rule.startsWith('#')) return false;
    return !present.has(rule) && !(LEGACY_FORMS[rule] && present.has(LEGACY_FORMS[rule]));
  });
  if (missing.length === 0) return { added: [], path: gitignorePath };

  const prefix = existing && !existing.endsWith('\n') ? '\n' : '';
  const block = `${header}\n${missing.join('\n')}\n`;
  fs.writeFileSync(gitignorePath, existing ? `${existing}${prefix}\n${block}` : block);
  return { added: missing, path: gitignorePath };
}
