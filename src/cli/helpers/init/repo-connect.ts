/**
 * Repo Connect — post-scaffold project setup helpers
 *
 * Handles parsing GitHub repo inputs (org/repo shorthand, HTTPS URLs, SSH URLs),
 * prompting for project setup choice, and cloning repos into workspace.
 */

import chalk from 'chalk';
import { select, input, confirm } from '@inquirer/prompts';
import { execFileNoThrowSync } from '../../../utils/execFileNoThrow.js';
import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { parseBulkSource, buildBulkRepoList, getAuthToken } from '../get/bulk-get.js';
import { launchCloneJob } from '../../../core/background/job-launcher.js';

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
// Validation (additive — parseRepoInput unchanged for backward compat)
// ---------------------------------------------------------------------------

export type RepoInputErrorType = 'org-only' | 'invalid-chars' | 'malformed-url' | 'empty';

export interface RepoInputError {
  token: string;
  type: RepoInputErrorType;
  message: string;
  suggestion?: string;
}

export interface RepoInputValidation {
  repos: ParsedRepo[];
  errors: RepoInputError[];
}

/** Looks like a valid org/user name but has no slash */
const ORG_ONLY_RE = /^[a-zA-Z0-9._-]+$/;

/** Characters allowed in org/repo tokens and URLs */
const VALID_CHARS_RE = /^[a-zA-Z0-9._\-/:@*]+$/;

/**
 * Validate + parse with error reporting.
 *
 * Returns both successfully parsed repos AND typed errors for invalid tokens.
 * Existing `parseRepoInput()` is unchanged for backward compatibility.
 */
export function validateAndParseRepoInput(rawInput: string): RepoInputValidation {
  if (!rawInput || !rawInput.trim()) {
    return {
      repos: [],
      errors: [{ token: '', type: 'empty', message: 'Input cannot be empty' }],
    };
  }

  const tokens = rawInput
    .split(/[\s,]+/)
    .map(t => t.trim())
    .filter(Boolean);

  const repos: ParsedRepo[] = [];
  const errors: RepoInputError[] = [];

  for (const token of tokens) {
    let match: RegExpMatchArray | null;

    if ((match = token.match(HTTPS_RE))) {
      repos.push({ org: match[1], name: match[2], cloneUrl: `https://github.com/${match[1]}/${match[2]}.git` });
    } else if ((match = token.match(SSH_RE))) {
      repos.push({ org: match[1], name: match[2], cloneUrl: `https://github.com/${match[1]}/${match[2]}.git` });
    } else if ((match = token.match(SHORTHAND_RE))) {
      repos.push({ org: match[1], name: match[2], cloneUrl: `https://github.com/${match[1]}/${match[2]}.git` });
    } else if (!token.includes('/') && ORG_ONLY_RE.test(token)) {
      // Looks like an org name without repo
      errors.push({
        token,
        type: 'org-only',
        message: `'${token}' looks like an org name.`,
        suggestion: `Use '${token}/repo-name' format, or '${token}/*' to clone all repos from this org`,
      });
    } else if (!VALID_CHARS_RE.test(token)) {
      errors.push({
        token,
        type: 'invalid-chars',
        message: `'${token}' contains invalid characters.`,
      });
    } else {
      // Has a slash but doesn't match any known pattern
      errors.push({
        token,
        type: 'malformed-url',
        message: `Could not parse '${token}' — expected formats: org/repo, https://github.com/org/repo, or git@github.com:org/repo.git`,
      });
    }
  }

  return { repos, errors };
}

/**
 * Format validation errors for console display.
 */
export function formatRepoInputErrors(errors: RepoInputError[]): string {
  if (errors.length === 0) return '';

  const lines: string[] = [];

  for (const err of errors) {
    lines.push(err.message);
    if (err.suggestion) {
      lines.push(`  ${err.suggestion}`);
    }
  }

  return lines.join('\n');
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
    repoPromptPattern: string;
    addMoreRepos: string;
    bulkDetected: string;
    bulkMatched: string;
    cloneJobStarted: string;
  }> = {
    en: {
      question: 'Which repositories to connect?',
      cloneRepos: 'Connect repositories',
      cloneReposDesc: 'Enter org/repo or URLs to clone into this workspace',
      addLater: 'Add later via specweave get',
      addLaterDesc: 'Create workspace now, add repositories later',
      repoPrompt: 'Enter GitHub repo URLs or org/repo shorthand (space-separated):',
      repoPromptPattern: 'Enter repos or patterns (org/repo, org/*, org/prefix-*):',
      addMoreRepos: 'Do you want to add more repositories?',
      bulkDetected: 'Pattern detected for',
      bulkMatched: 'repos matched',
      cloneJobStarted: 'Background clone job started',
    },
    ru: {
      question: 'Какие репозитории подключить?',
      cloneRepos: 'Подключить репозитории',
      cloneReposDesc: 'Введите org/repo или URL для клонирования',
      addLater: 'Добавить позже через specweave get',
      addLaterDesc: 'Создать рабочее пространство, добавить репозитории позже',
      repoPrompt: 'Введите GitHub URL или org/repo через пробел:',
      repoPromptPattern: 'Введите репозитории или шаблоны (org/repo, org/*, org/prefix-*):',
      addMoreRepos: 'Хотите добавить ещё репозитории?',
      bulkDetected: 'Обнаружен шаблон для',
      bulkMatched: 'репозиториев найдено',
      cloneJobStarted: 'Фоновая задача клонирования запущена',
    },
    es: {
      question: 'Que repositorios conectar?',
      cloneRepos: 'Conectar repositorios',
      cloneReposDesc: 'Ingresa org/repo o URLs para clonar',
      addLater: 'Agregar despues via specweave get',
      addLaterDesc: 'Crear workspace ahora, agregar repositorios despues',
      repoPrompt: 'Ingresa URLs de GitHub o org/repo separados por espacios:',
      repoPromptPattern: 'Ingresa repos o patrones (org/repo, org/*, org/prefix-*):',
      addMoreRepos: 'Deseas agregar mas repositorios?',
      bulkDetected: 'Patron detectado para',
      bulkMatched: 'repositorios encontrados',
      cloneJobStarted: 'Tarea de clonacion en segundo plano iniciada',
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

export interface RepoUrlsLoopResult {
  foregroundResults: RepoConnectResult[];
  jobIds: string[];
}

/**
 * Prompt for repo URLs with pattern support and an add-more loop.
 *
 * Accepts individual repos (org/repo, URLs, SSH) and glob patterns (org/*, org/prefix-*).
 * Individual repos (≤3) clone in foreground; bulk patterns launch background jobs.
 * After each batch, asks "Do you want to add more?" to support multi-org workflows.
 */
export async function promptRepoUrlsLoop(
  projectPath: string,
  language: SupportedLanguage,
): Promise<RepoUrlsLoopResult> {
  const strings = getProjectSetupStrings(language);
  const allForegroundResults: RepoConnectResult[] = [];
  const allJobIds: string[] = [];

  let addMore = true;
  while (addMore) {
    const rawInput = await input({ message: strings.repoPromptPattern });
    const tokens = rawInput.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);

    const individualTokens: string[] = [];

    for (const token of tokens) {
      const bulk = parseBulkSource(token, {});
      if (bulk) {
        console.log(chalk.gray(`   ${strings.bulkDetected} ${bulk.org}...`));
        const authToken = await getAuthToken();
        const bulkRepos = await buildBulkRepoList(bulk.org, authToken, bulk.pattern, {
          noArchived: true,
          noForks: true,
        });
        console.log(chalk.gray(`   ${bulkRepos.length} ${strings.bulkMatched}`));

        if (bulkRepos.length > 0) {
          const launchResult = await launchCloneJob({
            projectPath,
            repositories: bulkRepos,
          });
          allJobIds.push(launchResult.job.id);
          console.log(chalk.gray(`   ${strings.cloneJobStarted}: ${launchResult.job.id}`));
        }
      } else {
        individualTokens.push(token);
      }
    }

    if (individualTokens.length > 0) {
      const { repos: parsed, errors } = validateAndParseRepoInput(individualTokens.join(' '));
      if (errors.length > 0) {
        console.log(chalk.yellow('   ' + formatRepoInputErrors(errors)));
      }
      if (parsed.length > 0) {
        const jobRepos = mapParsedReposToCloneOptions(parsed);
        if (parsed.length <= FOREGROUND_CLONE_THRESHOLD) {
          const result = await runForegroundClone(projectPath, jobRepos);
          allForegroundResults.push(result);
        } else {
          const launchResult = await launchCloneJob({
            projectPath,
            repositories: jobRepos,
          });
          allJobIds.push(launchResult.job.id);
          console.log(chalk.gray(`   ${strings.cloneJobStarted}: ${launchResult.job.id}`));
        }
      }
    }

    addMore = await confirm({
      message: strings.addMoreRepos,
      default: false,
    });
  }

  return { foregroundResults: allForegroundResults, jobIds: allJobIds };
}

// ---------------------------------------------------------------------------
// Job system integration
// ---------------------------------------------------------------------------

/** Threshold: repos at or below this count clone foreground (blocking); above clone as background job */
export const FOREGROUND_CLONE_THRESHOLD = 3;

/**
 * Map ParsedRepo[] to the format expected by launchCloneJob().
 */
export function mapParsedReposToCloneOptions(repos: ParsedRepo[]): Array<{
  owner: string;
  name: string;
  path: string;
  cloneUrl: string;
}> {
  return repos.map(r => ({
    owner: r.org,
    name: r.name,
    path: `repositories/${r.org}/${r.name}`,
    cloneUrl: r.cloneUrl,
  }));
}

/**
 * Clone repos foreground (blocking) with inline progress.
 * Used for small batches (≤ FOREGROUND_CLONE_THRESHOLD) during init.
 * For larger batches, use launchCloneJob() in background mode.
 */
export async function runForegroundClone(
  projectPath: string,
  repos: Array<{ owner: string; name: string; path: string; cloneUrl: string }>,
): Promise<RepoConnectResult> {
  const results: RepoConnectResult['repos'] = [];
  let totalCloned = 0;
  let totalFailed = 0;

  for (const repo of repos) {
    const orgDir = path.join(projectPath, 'repositories', repo.owner);
    const repoDir = path.join(orgDir, repo.name);
    const relPath = `repositories/${repo.owner}/${repo.name}`;

    // Check for .git (not just directory) to avoid false-positive on partial clones
    if (fs.existsSync(path.join(repoDir, '.git'))) {
      results.push({ org: repo.owner, name: repo.name, path: relPath, success: true });
      totalCloned++;
      continue;
    }

    fs.mkdirSync(orgDir, { recursive: true });
    console.log(chalk.gray(`   Cloning ${repo.owner}/${repo.name}...`));
    const result = execFileNoThrowSync('git', ['clone', repo.cloneUrl, repo.name], { cwd: orgDir });

    if (result.success) {
      results.push({ org: repo.owner, name: repo.name, path: relPath, success: true });
      totalCloned++;
    } else {
      const error = result.stderr?.replace(/https:\/\/[^@]*@/g, 'https://***@') || 'Unknown error';
      results.push({ org: repo.owner, name: repo.name, path: relPath, success: false, error });
      totalFailed++;
    }
  }

  return { repos: results, totalCloned, totalFailed };
}

// ---------------------------------------------------------------------------
// Cloning (legacy — kept for backward compatibility, will be removed)
// ---------------------------------------------------------------------------

/**
 * Clone repos into `repositories/{org}/{name}/` under the target directory.
 * @deprecated Use launchCloneJob() with mapParsedReposToCloneOptions() instead
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
