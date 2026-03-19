/**
 * Repo Connect — post-scaffold project setup helpers
 *
 * Handles parsing GitHub repo inputs (org/repo shorthand, HTTPS URLs, SSH URLs),
 * prompting for project setup choice, and cloning repos into workspace.
 */

import chalk from 'chalk';
import { select, input } from '@inquirer/prompts';
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';
import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

export type ProjectSetupChoice = 'clone-repos' | 'add-later';

export interface ParsedRepo {
  org: string;
  name: string;
  cloneUrl: string;
}

export interface RepoConnectResult {
  repos: Array<{ org: string; name: string; path: string; success: boolean; error?: string }>;
  totalCloned: number;
  totalFailed: number;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

const SHORTHAND_RE = /^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/;
const HTTPS_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/;
const SSH_RE = /^git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/;

/**
 * Parse user input into structured repo descriptors.
 *
 * Accepts space/comma/newline-separated tokens:
 * - `org/repo` shorthand
 * - `https://github.com/org/repo[.git]`
 * - `git@github.com:org/repo[.git]`
 */
export function parseRepoInput(rawInput: string): ParsedRepo[] {
  if (!rawInput || !rawInput.trim()) return [];

  const tokens = rawInput
    .split(/[\s,]+/)
    .map(t => t.trim())
    .filter(Boolean);

  const repos: ParsedRepo[] = [];

  for (const token of tokens) {
    let match: RegExpMatchArray | null;

    if ((match = token.match(HTTPS_RE))) {
      repos.push({ org: match[1], name: match[2], cloneUrl: `https://github.com/${match[1]}/${match[2]}.git` });
    } else if ((match = token.match(SSH_RE))) {
      repos.push({ org: match[1], name: match[2], cloneUrl: `https://github.com/${match[1]}/${match[2]}.git` });
    } else if ((match = token.match(SHORTHAND_RE))) {
      repos.push({ org: match[1], name: match[2], cloneUrl: `https://github.com/${match[1]}/${match[2]}.git` });
    }
    // Unrecognized tokens are silently skipped
  }

  return repos;
}

// ---------------------------------------------------------------------------
// Prompting
// ---------------------------------------------------------------------------

function getProjectSetupStrings(language: SupportedLanguage) {
  const strings: Record<string, {
    question: string;
    cloneRepos: string;
    cloneReposDesc: string;
    addLater: string;
    addLaterDesc: string;
    repoPrompt: string;
  }> = {
    en: {
      question: 'Which repositories to connect?',
      cloneRepos: 'Connect repositories',
      cloneReposDesc: 'Enter org/repo or URLs to clone into this workspace',
      addLater: 'Add later via specweave get',
      addLaterDesc: 'Create workspace now, add repositories later',
      repoPrompt: 'Enter GitHub repo URLs or org/repo shorthand (space-separated):',
    },
    ru: {
      question: 'Какие репозитории подключить?',
      cloneRepos: 'Подключить репозитории',
      cloneReposDesc: 'Введите org/repo или URL для клонирования',
      addLater: 'Добавить позже через specweave get',
      addLaterDesc: 'Создать рабочее пространство, добавить репозитории позже',
      repoPrompt: 'Введите GitHub URL или org/repo через пробел:',
    },
    es: {
      question: 'Que repositorios conectar?',
      cloneRepos: 'Conectar repositorios',
      cloneReposDesc: 'Ingresa org/repo o URLs para clonar',
      addLater: 'Agregar despues via specweave get',
      addLaterDesc: 'Crear workspace ahora, agregar repositorios despues',
      repoPrompt: 'Ingresa URLs de GitHub o org/repo separados por espacios:',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Prompt user for how they want to set up their code.
 */
export async function promptProjectSetup(language: SupportedLanguage): Promise<ProjectSetupChoice> {
  const strings = getProjectSetupStrings(language);

  return select({
    message: strings.question,
    choices: [
      { name: strings.cloneRepos, value: 'clone-repos' as const, description: strings.cloneReposDesc },
      { name: strings.addLater, value: 'add-later' as const, description: strings.addLaterDesc },
    ],
    default: 'clone-repos',
  });
}

/**
 * Prompt for repo URLs and return parsed repos.
 */
export async function promptRepoUrls(language: SupportedLanguage): Promise<ParsedRepo[]> {
  const strings = getProjectSetupStrings(language);

  const rawInput = await input({
    message: strings.repoPrompt,
  });

  return parseRepoInput(rawInput);
}

// ---------------------------------------------------------------------------
// Cloning
// ---------------------------------------------------------------------------

/**
 * Clone repos into `repositories/{org}/{name}/` under the target directory.
 */
export function cloneReposIntoWorkspace(
  targetDir: string,
  repos: ParsedRepo[],
): RepoConnectResult {
  const results: RepoConnectResult['repos'] = [];
  let totalCloned = 0;
  let totalFailed = 0;

  for (const repo of repos) {
    const orgDir = path.join(targetDir, 'repositories', repo.org);
    const repoDir = path.join(orgDir, repo.name);
    const relPath = `repositories/${repo.org}/${repo.name}`;

    // Skip if already cloned
    if (fs.existsSync(repoDir)) {
      results.push({ org: repo.org, name: repo.name, path: relPath, success: true });
      totalCloned++;
      continue;
    }

    // Ensure org directory exists
    fs.mkdirSync(orgDir, { recursive: true });

    console.log(chalk.gray(`   Cloning ${repo.org}/${repo.name}...`));
    const result = execFileNoThrowSync('git', ['clone', repo.cloneUrl, repo.name], { cwd: orgDir });

    if (result.success) {
      results.push({ org: repo.org, name: repo.name, path: relPath, success: true });
      totalCloned++;
    } else {
      const error = result.stderr?.replace(/https:\/\/[^@]*@/g, 'https://***@') || 'Unknown error';
      results.push({ org: repo.org, name: repo.name, path: relPath, success: false, error });
      totalFailed++;
    }
  }

  return { repos: results, totalCloned, totalFailed };
}
