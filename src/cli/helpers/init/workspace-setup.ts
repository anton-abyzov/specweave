/**
 * Workspace setup for init flow — non-empty folder detection,
 * migration choice menu, restructure/copy logic, and org/repo detection.
 *
 * Part of 0640-init-ux-nonempty-workspace
 */

import * as fs from '../../../utils/fs-native.js';
import { lstatSync } from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { select, input } from '@inquirer/prompts';
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';
import { detectProvider } from './provider-detection.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

// --- Types ---

export interface WorkspaceContentScan {
  hasSourceFiles: boolean;
  hasPackageManager: boolean;
  hasGitRepo: boolean;
  hasUncommittedChanges: boolean;
  fileCount: number;
  detectedLanguages: string[];
}

export type MigrationChoice = 'start-empty' | 'restructure' | 'continue-in-place';

export type StartEmptySubChoice = 'clone-github' | 'copy-local' | 'add-later';

export interface OrgRepoDetection {
  org: string;
  repoName: string;
  source: 'git-remote' | 'package-json-repo' | 'package-json-scope' | 'directory-name' | 'user-input';
}

export interface RestructureResult {
  moved: string[];
  skipped: string[];
  errors: string[];
  targetDir: string;
}

export interface LocalCopyResult {
  copied: string[];
  skipped: string[];
  errors: string[];
  targetDir: string;
}

// --- Constants ---

/** Source file extensions (kept in sync with greenfield-detection.ts) */
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.java', '.kt', '.kts',
  '.go',
  '.rs',
  '.cs',
  '.rb',
  '.php',
  '.swift',
  '.c', '.cpp', '.h', '.hpp',
  '.scala',
  '.dart',
]);

/** Directories to skip during scan (kept in sync with greenfield-detection.ts) */
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.specweave',
  'coverage', '__pycache__', '.next', '.nuxt', 'vendor',
  '.cache', '.output', 'target', 'bin', 'obj',
]);

/** Package manager indicator files */
const PACKAGE_MANAGER_FILES = new Set([
  'package.json', 'go.mod', 'Cargo.toml', 'requirements.txt',
  'pyproject.toml', 'Gemfile', 'build.gradle', 'pom.xml',
  'composer.json', 'Package.swift',
]);

/** Extension to language mapping */
const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
  '.py': 'Python', '.pyw': 'Python',
  '.java': 'Java', '.kt': 'Kotlin', '.kts': 'Kotlin',
  '.go': 'Go',
  '.rs': 'Rust',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.c': 'C', '.cpp': 'C++', '.h': 'C/C++', '.hpp': 'C++',
  '.scala': 'Scala',
  '.dart': 'Dart',
};

/** Top-level entries to skip during restructure */
const RESTRUCTURE_SKIP = new Set(['.git', '.specweave', 'node_modules', 'repositories']);

/** Regex to extract org/repo from GitHub URLs */
const GITHUB_URL_RE = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/;

// --- Functions ---

/**
 * Scan target directory for source files, package managers, and git state.
 * Scans depth 0-1 only for performance (< 500ms target).
 */
export function scanWorkspaceContent(targetDir: string): WorkspaceContentScan {
  let hasSourceFiles = false;
  let hasPackageManager = false;
  const hasGitRepo = fs.existsSync(path.join(targetDir, '.git'));
  let hasUncommittedChanges = false;
  let fileCount = 0;
  const languages = new Set<string>();

  let dirents: fs.Dirent[];
  try {
    dirents = fs.readdirSync(targetDir, { withFileTypes: true });
  } catch {
    return { hasSourceFiles, hasPackageManager, hasGitRepo, hasUncommittedChanges, fileCount, detectedLanguages: [] };
  }

  for (const dirent of dirents) {
    if (dirent.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(dirent.name)) continue;

    if (dirent.isFile()) {
      fileCount++;
      const ext = path.extname(dirent.name).toLowerCase();
      if (SOURCE_EXTENSIONS.has(ext)) {
        hasSourceFiles = true;
        const lang = EXT_TO_LANGUAGE[ext];
        if (lang) languages.add(lang);
      }
      if (PACKAGE_MANAGER_FILES.has(dirent.name)) {
        hasPackageManager = true;
      }
    } else if (dirent.isDirectory()) {
      // Scan depth 1
      try {
        const subDirents = fs.readdirSync(path.join(targetDir, dirent.name), { withFileTypes: true });
        for (const sub of subDirents) {
          if (sub.name.startsWith('.')) continue;
          if (SKIP_DIRS.has(sub.name)) continue;
          if (sub.isFile()) {
            fileCount++;
            const ext = path.extname(sub.name).toLowerCase();
            if (SOURCE_EXTENSIONS.has(ext)) {
              hasSourceFiles = true;
              const lang = EXT_TO_LANGUAGE[ext];
              if (lang) languages.add(lang);
            }
          }
        }
      } catch { /* unreadable dir */ }
    }
  }

  if (hasGitRepo) {
    const result = execFileNoThrowSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: targetDir });
    hasUncommittedChanges = result.success && result.stdout.trim().length > 0;
  }

  return {
    hasSourceFiles,
    hasPackageManager,
    hasGitRepo,
    hasUncommittedChanges,
    fileCount,
    detectedLanguages: Array.from(languages).sort(),
  };
}

// --- Prompt strings ---

function getMigrationStrings(language: SupportedLanguage) {
  const strings: Record<string, {
    question: string;
    startEmpty: string; startEmptyDesc: string;
    restructure: string; restructureDesc: string;
    continueInPlace: string; continueInPlaceDesc: string;
  }> = {
    en: {
      question: 'This folder contains existing files. How would you like to set up SpecWeave?',
      startEmpty: 'Start empty (recommended)',
      startEmptyDesc: 'Keep files as-is, add repositories via clone or copy',
      restructure: 'Restructure here',
      restructureDesc: 'Move existing files into repositories/{org}/{repo}/',
      continueInPlace: 'Continue in-place',
      continueInPlaceDesc: 'Create .specweave/ alongside existing files (current behavior)',
    },
    ru: {
      question: 'Папка содержит файлы. Как настроить SpecWeave?',
      startEmpty: 'Начать с пустого (рекомендуется)',
      startEmptyDesc: 'Оставить файлы как есть, добавить репозитории позже',
      restructure: 'Реструктуризировать',
      restructureDesc: 'Переместить файлы в repositories/{org}/{repo}/',
      continueInPlace: 'Продолжить на месте',
      continueInPlaceDesc: 'Создать .specweave/ рядом с существующими файлами',
    },
    es: {
      question: 'Esta carpeta contiene archivos. Como configurar SpecWeave?',
      startEmpty: 'Empezar vacio (recomendado)',
      startEmptyDesc: 'Mantener archivos, agregar repositorios despues',
      restructure: 'Reestructurar aqui',
      restructureDesc: 'Mover archivos a repositories/{org}/{repo}/',
      continueInPlace: 'Continuar en sitio',
      continueInPlaceDesc: 'Crear .specweave/ junto a archivos existentes',
    },
  };
  return strings[language] || strings.en;
}

function getSubChoiceStrings(language: SupportedLanguage) {
  const strings: Record<string, {
    question: string;
    cloneGithub: string; cloneGithubDesc: string;
    copyLocal: string; copyLocalDesc: string;
    addLater: string; addLaterDesc: string;
  }> = {
    en: {
      question: 'How would you like to add your first repository?',
      cloneGithub: 'Clone from GitHub',
      cloneGithubDesc: 'Enter org/repo to clone into repositories/',
      copyLocal: 'Copy from local path',
      copyLocalDesc: 'Copy an existing local directory into repositories/',
      addLater: 'Add repositories later',
      addLaterDesc: 'Set up workspace now, use specweave get to add repos later',
    },
    ru: {
      question: 'Как добавить первый репозиторий?',
      cloneGithub: 'Клонировать с GitHub',
      cloneGithubDesc: 'Введите org/repo для клонирования',
      copyLocal: 'Скопировать из локального пути',
      copyLocalDesc: 'Скопировать существующую папку в repositories/',
      addLater: 'Добавить репозитории позже',
      addLaterDesc: 'Настроить workspace, добавить репозитории позже',
    },
    es: {
      question: 'Como agregar tu primer repositorio?',
      cloneGithub: 'Clonar desde GitHub',
      cloneGithubDesc: 'Ingresa org/repo para clonar',
      copyLocal: 'Copiar desde ruta local',
      copyLocalDesc: 'Copiar directorio existente a repositories/',
      addLater: 'Agregar repositorios despues',
      addLaterDesc: 'Configurar workspace, agregar repositorios despues',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Show 3-option menu for non-empty folder: start-empty, restructure, continue-in-place.
 * CI mode returns continue-in-place immediately (non-destructive default).
 */
export async function promptMigrationChoice(
  scan: WorkspaceContentScan,
  language: SupportedLanguage,
  isCI: boolean,
): Promise<MigrationChoice> {
  if (isCI) return 'continue-in-place';

  const s = getMigrationStrings(language);
  return select({
    message: s.question,
    choices: [
      { name: s.startEmpty, value: 'start-empty' as const, description: s.startEmptyDesc },
      { name: s.restructure, value: 'restructure' as const, description: s.restructureDesc },
      { name: s.continueInPlace, value: 'continue-in-place' as const, description: s.continueInPlaceDesc },
    ],
    default: 'start-empty',
  });
}

/**
 * Sub-menu for "Start empty": clone-github, copy-local, add-later.
 */
export async function promptStartEmptySubChoice(
  language: SupportedLanguage,
): Promise<StartEmptySubChoice> {
  const s = getSubChoiceStrings(language);
  return select({
    message: s.question,
    choices: [
      { name: s.cloneGithub, value: 'clone-github' as const, description: s.cloneGithubDesc },
      { name: s.copyLocal, value: 'copy-local' as const, description: s.copyLocalDesc },
      { name: s.addLater, value: 'add-later' as const, description: s.addLaterDesc },
    ],
  });
}

/**
 * Detect org/repo from git remote, package.json repository URL, or package scope.
 * Returns null if nothing can be auto-detected.
 *
 * Cascade:
 * 1. Git remote via detectProvider()
 * 2. package.json → repository.url
 * 3. package.json → @scope/name
 */
export function detectOrgRepo(targetDir: string): OrgRepoDetection | null {
  // Level 1: Git remote
  const provider = detectProvider(targetDir);
  if (provider?.owner && provider?.repo) {
    return { org: provider.owner, repoName: provider.repo, source: 'git-remote' };
  }

  // Level 2 & 3: package.json
  const pkgPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      // Level 2: repository URL
      const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
      if (repoUrl) {
        const match = repoUrl.match(GITHUB_URL_RE);
        if (match) {
          return { org: match[1], repoName: match[2], source: 'package-json-repo' };
        }
      }

      // Level 3: scoped package name
      if (typeof pkg.name === 'string' && pkg.name.startsWith('@')) {
        const scopeMatch = pkg.name.match(/^@([^/]+)\/(.+)$/);
        if (scopeMatch) {
          return { org: scopeMatch[1], repoName: scopeMatch[2], source: 'package-json-scope' };
        }
      }
    } catch {
      // Malformed package.json — warn so users know auto-detection failed
      console.log(chalk.gray('  Note: package.json could not be parsed — skipping auto-detection from it'));
    }
  }

  return null;
}

/**
 * Prompt for org/repo with auto-detect pre-fill.
 * Uses detectOrgRepo() first, then falls back to interactive prompt.
 */
export async function promptOrgRepo(
  targetDir: string,
): Promise<{ org: string; repoName: string }> {
  const detected = detectOrgRepo(targetDir);

  const validateName = (v: string): string | true => {
    const trimmed = v.trim();
    if (trimmed.length === 0) return 'Name is required';
    if (/[/\\]/.test(trimmed)) return 'Name must not contain path separators (/ or \\)';
    if (trimmed === '.' || trimmed === '..' || trimmed.includes('..')) return 'Name must not contain path traversal (..)';
    return true;
  };

  const org = await input({
    message: 'Organization / owner name:',
    default: detected?.org || path.basename(path.dirname(targetDir)) || undefined,
    validate: validateName,
  });

  const repoName = await input({
    message: 'Repository name:',
    default: detected?.repoName || path.basename(targetDir) || undefined,
    validate: validateName,
  });

  return { org: org.trim(), repoName: repoName.trim() };
}

/**
 * Copy a local directory into repositories/{org}/{repo}/.
 * Excludes .git directories from the copy.
 */
export function copyLocalPathIntoRepositories(
  targetDir: string,
  sourcePath: string,
  org: string,
  repoName: string,
): LocalCopyResult {
  const resolvedSource = path.resolve(sourcePath);
  const destDir = path.join(targetDir, 'repositories', org, repoName);
  const repositoriesRoot = path.resolve(path.join(targetDir, 'repositories'));

  // Path containment check — prevent traversal via crafted org/repoName
  if (!path.resolve(destDir).startsWith(repositoriesRoot + path.sep)) {
    return { copied: [], skipped: [], errors: ['Destination escapes repositories/ directory'], targetDir: destDir };
  }

  if (resolvedSource === path.resolve(targetDir)) {
    return { copied: [], skipped: [], errors: ['Source and target are the same directory'], targetDir: destDir };
  }

  if (!fs.existsSync(resolvedSource)) {
    return { copied: [], skipped: [], errors: ['Source path does not exist: ' + resolvedSource], targetDir: destDir };
  }
  try {
    if (!fs.statSync(resolvedSource).isDirectory()) {
      return { copied: [], skipped: [], errors: ['Source path is not a directory: ' + resolvedSource], targetDir: destDir };
    }
  } catch {
    return { copied: [], skipped: [], errors: ['Cannot stat source path: ' + resolvedSource], targetDir: destDir };
  }

  if (fs.existsSync(destDir)) {
    return { copied: [], skipped: [], errors: ['Target directory already exists: ' + destDir], targetDir: destDir };
  }

  const copied: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(resolvedSource);
  for (const entry of entries) {
    if (entry === '.git') {
      skipped.push(entry);
      continue;
    }
    const srcPath = path.join(resolvedSource, entry);

    // Skip symlinks to prevent copying unintended targets
    try {
      if (lstatSync(srcPath).isSymbolicLink()) {
        skipped.push(entry);
        continue;
      }
    } catch {
      skipped.push(entry);
      continue;
    }

    const destPath = path.join(destDir, entry);
    try {
      fs.copySync(srcPath, destPath);
      copied.push(entry);
    } catch (err: any) {
      errors.push(`${entry}: ${err.message}`);
    }
  }

  return { copied, skipped, errors, targetDir: destDir };
}

/**
 * Move all non-excluded entries into repositories/{org}/{repo}/.
 * Uses fs.moveSync (rename with EXDEV fallback) for each entry.
 *
 * Skip list: .git, .specweave, node_modules, repositories, hidden dotfiles, symlinks.
 */
export function restructureIntoRepositories(
  targetDir: string,
  org: string,
  repoName: string,
): RestructureResult {
  const destDir = path.join(targetDir, 'repositories', org, repoName);
  const repositoriesRoot = path.resolve(path.join(targetDir, 'repositories'));

  // Path containment check — prevent traversal via crafted org/repoName
  if (!path.resolve(destDir).startsWith(repositoriesRoot + path.sep)) {
    return { moved: [], skipped: [], errors: ['Destination escapes repositories/ directory'], targetDir: destDir };
  }

  if (fs.existsSync(destDir)) {
    return {
      moved: [],
      skipped: [],
      errors: ['Target directory already exists: ' + destDir],
      targetDir: destDir,
    };
  }

  fs.mkdirSync(destDir, { recursive: true });

  const moved: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const entries = fs.readdirSync(targetDir);
  for (const entry of entries) {
    if (entry.startsWith('.')) {
      skipped.push(entry);
      continue;
    }
    if (RESTRUCTURE_SKIP.has(entry)) {
      skipped.push(entry);
      continue;
    }

    const srcPath = path.join(targetDir, entry);

    try {
      if (lstatSync(srcPath).isSymbolicLink()) {
        skipped.push(entry);
        continue;
      }
    } catch {
      errors.push(`${entry}: cannot stat`);
      continue;
    }

    const destPath = path.join(destDir, entry);
    try {
      fs.moveSync(srcPath, destPath);
      moved.push(entry);
    } catch (err: any) {
      errors.push(`${entry}: ${err.message}`);
    }
  }

  return { moved, skipped, errors, targetDir: destDir };
}

/**
 * Display restructure warnings. Always shows symlink/CI/import warnings.
 * Additionally warns about git commit when uncommitted changes exist.
 */
export function showRestructureWarnings(scan: WorkspaceContentScan): void {
  console.log('');
  if (scan.hasUncommittedChanges) {
    console.log(chalk.yellow('  Warning: You have uncommitted git changes. Run git commit first to preserve your work.'));
  }
  console.log(chalk.yellow('  Restructure warnings:'));
  console.log(chalk.gray('    - Symlinks pointing to moved files will break'));
  console.log(chalk.gray('    - CI/CD pipeline paths may need updating'));
  console.log(chalk.gray('    - Relative imports from outside the repository will fail'));
  console.log('');
}
