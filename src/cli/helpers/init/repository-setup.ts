/**
 * Repository hosting setup
 * Handles git provider detection and configuration
 */

import chalk from 'chalk';
import { select, input, checkbox, password } from '@inquirer/prompts';
import ora from 'ora';
import type { RepositoryHosting, GitHubRemote } from './types.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { parsePatternShortcut, validateRegex } from '../selection-strategy.js';
import { getAzureDevOpsAuth } from '../../../utils/auth-helpers.js';
import { parseEnvFile, readEnvFile } from '../../../utils/env-file.js';

/**
 * Safely parse JSON response with HTML detection
 *
 * Azure DevOps may return HTML error pages instead of JSON when:
 * - PAT is invalid/expired
 * - Organization name is wrong
 * - Corporate proxy/firewall intercepts the request
 * - SSO redirect occurs
 *
 * @param response - Fetch response object
 * @param context - Context string for error messages (e.g., "Azure DevOps")
 * @returns Parsed JSON data
 * @throws Error with helpful message if response is not valid JSON
 */
async function safeParseJsonResponse<T>(response: Response, context: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();

  // Check if response looks like HTML
  const looksLikeHtml = responseText.trim().startsWith('<!DOCTYPE') ||
                        responseText.trim().startsWith('<html') ||
                        responseText.trim().startsWith('<HTML') ||
                        !contentType.includes('application/json');

  if (looksLikeHtml && responseText.includes('<')) {
    // Build helpful error message
    const possibleCauses = [
      'Invalid or expired Personal Access Token (PAT)',
      'Incorrect organization name',
      'Corporate firewall or proxy intercepting the request',
      'SSO/authentication redirect (try accessing Azure DevOps in browser first)',
      'Network connectivity issues'
    ];

    throw new Error(
      `${context} returned HTML instead of JSON.\n` +
      `   This usually indicates an authentication or configuration issue.\n` +
      `   \n` +
      `   Possible causes:\n` +
      possibleCauses.map(cause => `   • ${cause}`).join('\n')
    );
  }

  // Try to parse as JSON
  try {
    return JSON.parse(responseText) as T;
  } catch (parseError) {
    // JSON parse failed - provide helpful message
    const preview = responseText.substring(0, 100);
    throw new Error(
      `${context} returned invalid JSON.\n` +
      `   Response preview: ${preview}${responseText.length > 100 ? '...' : ''}`
    );
  }
}

/**
 * Options for repository setup
 */
export interface RepositorySetupOptions {
  targetDir: string;
  isCI: boolean;
  gitHubRemote: GitHubRemote | null;
  language?: SupportedLanguage;
}

/**
 * ADO clone pattern selection strategy
 */
export type AdoCloneStrategy = 'all' | 'pattern-glob' | 'pattern-regex' | 'skip';

/**
 * ADO clone pattern result
 */
export interface AdoClonePatternResult {
  strategy: AdoCloneStrategy;
  pattern?: string;
  isRegex?: boolean;
}

// Import from types.ts (single source of truth) and re-export for backward compatibility
import type { AdoProjectSelection } from '../issue-tracker/types.js';
export type { AdoProjectSelection };

/**
 * GitHub repository selection (for multi-repo cloning)
 */
export interface GitHubRepoSelection {
  /** GitHub organization or owner */
  org: string;
  /** Personal Access Token */
  pat: string;
}

/**
 * Bitbucket repository selection (for multi-repo cloning)
 */
export interface BitbucketRepoSelection {
  /** Bitbucket workspace slug */
  workspace: string;
  /** Bitbucket username */
  username: string;
  /** Bitbucket App Password */
  appPassword: string;
}

/**
 * Git URL format type (v1.0.7+)
 */
export type GitUrlFormat = 'ssh' | 'https';

/**
 * Result of repository setup
 */
export interface RepositorySetupResult {
  hosting: RepositoryHosting;
  isMultiRepo: boolean;
  /** Git URL format preference (SSH or HTTPS) - v1.0.7+ */
  gitUrlFormat?: GitUrlFormat;
  /** Repo clone pattern for multi-repo (e.g., "sw-*") - works for ADO, GitHub, Bitbucket */
  adoClonePattern?: string;
  /** Clone pattern details */
  adoClonePatternResult?: AdoClonePatternResult;
  /** ADO project(s) to clone repositories from */
  adoProjectSelection?: AdoProjectSelection;
  /** GitHub repo selection for multi-repo cloning (v0.32.7+) */
  githubRepoSelection?: GitHubRepoSelection;
  /** Bitbucket repo selection for multi-repo cloning (v0.32.7+) */
  bitbucketRepoSelection?: BitbucketRepoSelection;
}

/**
 * Fetch all accessible projects for an ADO organization
 */
async function fetchAdoProjects(
  org: string,
  pat: string
): Promise<Array<{ name: string; id: string }>> {
  const auth = Buffer.from(`:${pat}`).toString('base64');
  const endpoint = `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`;

  const response = await fetch(endpoint, {
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
  });

  if (!response.ok) {
    // Read response body to check for HTML error pages
    const errorBody = await response.text();
    const looksLikeHtml = errorBody.trim().startsWith('<!DOCTYPE') || errorBody.trim().startsWith('<html');

    if (looksLikeHtml) {
      throw new Error(
        `Azure DevOps returned an error page (HTTP ${response.status}).\n` +
        `   This usually indicates an authentication or configuration issue.\n` +
        `   \n` +
        `   Possible causes:\n` +
        `   • Invalid or expired Personal Access Token (PAT)\n` +
        `   • Incorrect organization name "${org}"\n` +
        `   • Corporate firewall or proxy intercepting the request\n` +
        `   • SSO/authentication redirect (try accessing Azure DevOps in browser first)`
      );
    }

    throw new Error(`Failed to fetch projects: ${response.status} - ${errorBody.substring(0, 200)}`);
  }

  // Use safe JSON parser to detect HTML responses even on 200 OK
  const data = await safeParseJsonResponse<{ value?: Array<{ name: string; id: string }> }>(
    response,
    'Azure DevOps'
  );

  return (data.value || []).map((p) => ({ name: p.name, id: p.id }));
}

/**
 * Prompt user for ADO organization, credentials, and project selection
 * For repository cloning in multi-repo setups
 */
async function promptAdoProjectSelection(
  targetDir: string,
  strings: { adoOrgPrompt: string; adoPatPrompt: string; adoProjectPrompt: string; adoProjectsSelected: string; adoFetchingProjects: string; adoNoProjects: string; adoConnectionFailed: string }
): Promise<AdoProjectSelection | null> {
  // Check for existing credentials in .env or environment
  let existingOrg: string | undefined;
  let existingPat: string | undefined;

  const envContent = readEnvFile(targetDir);
  if (envContent) {
    const parsed = parseEnvFile(envContent);
    existingOrg = parsed.AZURE_DEVOPS_ORG;
    existingPat = parsed.AZURE_DEVOPS_PAT;
  }

  // Fall back to environment variables
  if (!existingOrg || !existingPat) {
    const auth = getAzureDevOpsAuth();
    if (auth) {
      existingOrg = existingOrg || auth.org;
      existingPat = existingPat || auth.pat;
    }
  }

  // Prompt for organization
  const org = await input({
    message: strings.adoOrgPrompt,
    default: existingOrg,
    validate: (value: string) => {
      if (!value.trim()) return 'Organization name is required';
      return true;
    }
  });

  // Prompt for PAT
  const pat = await password({
    message: strings.adoPatPrompt,
    mask: true,
    validate: (value: string) => {
      if (!value.trim()) return 'Personal Access Token is required';
      return true;
    }
  });

  // Fetch projects
  const spinner = ora(strings.adoFetchingProjects).start();
  let projects: Array<{ name: string; id: string }>;

  try {
    projects = await fetchAdoProjects(org, pat);
    spinner.succeed();
  } catch (error) {
    spinner.fail(strings.adoConnectionFailed);
    console.log(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
    return null;
  }

  if (projects.length === 0) {
    console.log(chalk.yellow(`   ${strings.adoNoProjects}`));
    return null;
  }

  // Let user select projects
  const selectedProjects = await checkbox({
    message: strings.adoProjectPrompt,
    choices: projects.map((p, index) => ({
      name: p.name,
      value: p.name,
      checked: index === 0 // First project selected by default
    })),
    required: true
  });

  console.log(chalk.green(`   ✓ ${strings.adoProjectsSelected.replace('{count}', String(selectedProjects.length))}`));

  return {
    org,
    pat,
    projects: selectedProjects
  };
}

/**
 * Prompt user for GitHub organization and PAT for multi-repo cloning
 *
 * NOTE (v1.0.10): PAT is required for listing repos via GitHub API, even when SSH cloning.
 * SSH keys authenticate git operations, but GitHub API requires token authentication.
 *
 * @param targetDir - Target directory (for reading existing .env)
 * @param gitHubRemote - Detected GitHub remote (provides default org)
 * @param strings - Translated strings
 * @param gitUrlFormat - User's URL format choice ('ssh' or 'https') - affects messaging
 * @returns GitHub selection or null if cancelled
 */
async function promptGitHubRepoSelection(
  targetDir: string,
  gitHubRemote: { owner: string; repo: string } | null,
  strings: { githubOrgPrompt: string; githubPatPrompt: string; githubSelected: string },
  gitUrlFormat?: 'ssh' | 'https'
): Promise<GitHubRepoSelection | null> {
  // Check for existing credentials in .env or environment
  let existingOrg: string | undefined;
  let existingPat: string | undefined;

  const envContent = readEnvFile(targetDir);
  if (envContent) {
    const parsed = parseEnvFile(envContent);
    existingOrg = parsed.GITHUB_ORG;
    existingPat = parsed.GITHUB_PAT || parsed.GITHUB_TOKEN;
  }

  // Fall back to environment variables
  existingOrg = existingOrg || process.env.GITHUB_ORG;
  existingPat = existingPat || process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

  // Use detected remote owner as default
  const defaultOrg = existingOrg || gitHubRemote?.owner;

  // Prompt for organization
  const org = await input({
    message: strings.githubOrgPrompt,
    default: defaultOrg,
    validate: (value: string) => {
      if (!value.trim()) return 'Organization or username is required';
      return true;
    }
  });

  // v1.0.10: Show context-aware message about why PAT is needed
  if (gitUrlFormat === 'ssh') {
    console.log(chalk.gray('\n   💡 PAT is required to list repositories via GitHub API.'));
    console.log(chalk.gray('   Cloning will use SSH (your SSH key handles authentication).\n'));
  }

  // Prompt for PAT
  const patMessage = gitUrlFormat === 'ssh'
    ? 'GitHub PAT (for listing repos only):'
    : strings.githubPatPrompt;

  const pat = await password({
    message: patMessage,
    mask: true,
    validate: (value: string) => {
      if (!value.trim()) return 'Personal Access Token is required';
      return true;
    }
  });

  console.log(chalk.green(`   ✓ ${strings.githubSelected.replace('{org}', org)}`));

  return { org, pat };
}

/**
 * Prompt user for Bitbucket workspace and credentials for multi-repo cloning
 *
 * @param targetDir - Target directory (for reading existing .env)
 * @param strings - Translated strings
 * @returns Bitbucket selection or null if cancelled
 */
async function promptBitbucketRepoSelection(
  targetDir: string,
  strings: { bitbucketWorkspacePrompt: string; bitbucketUsernamePrompt: string; bitbucketAppPasswordPrompt: string; bitbucketSelected: string }
): Promise<BitbucketRepoSelection | null> {
  // Check for existing credentials in .env or environment
  let existingWorkspace: string | undefined;
  let existingUsername: string | undefined;
  let existingAppPassword: string | undefined;

  const envContent = readEnvFile(targetDir);
  if (envContent) {
    const parsed = parseEnvFile(envContent);
    existingWorkspace = parsed.BITBUCKET_WORKSPACE;
    existingUsername = parsed.BITBUCKET_USERNAME;
    existingAppPassword = parsed.BITBUCKET_APP_PASSWORD;
  }

  // Fall back to environment variables
  existingWorkspace = existingWorkspace || process.env.BITBUCKET_WORKSPACE;
  existingUsername = existingUsername || process.env.BITBUCKET_USERNAME;
  existingAppPassword = existingAppPassword || process.env.BITBUCKET_APP_PASSWORD;

  // Prompt for workspace
  const workspace = await input({
    message: strings.bitbucketWorkspacePrompt,
    default: existingWorkspace,
    validate: (value: string) => {
      if (!value.trim()) return 'Workspace slug is required';
      return true;
    }
  });

  // Prompt for username
  const username = await input({
    message: strings.bitbucketUsernamePrompt,
    default: existingUsername,
    validate: (value: string) => {
      if (!value.trim()) return 'Username is required';
      return true;
    }
  });

  // Prompt for app password
  const appPassword = await password({
    message: strings.bitbucketAppPasswordPrompt,
    mask: true,
    validate: (value: string) => {
      if (!value.trim()) return 'App Password is required';
      return true;
    }
  });

  console.log(chalk.green(`   ✓ ${strings.bitbucketSelected.replace('{workspace}', workspace)}`));

  return { workspace, username, appPassword };
}

/**
 * Get translated strings for repository setup
 */
function getRepoStrings(language: SupportedLanguage): {
  header: string;
  ciAutoDetected: string;
  structureQuestion: string;
  structureSingle: string;
  structureMultiple: string;
  providerQuestion: string;
  github: string;
  githubDetected: string;
  githubRecommended: string;
  bitbucket: string;
  ado: string;
  local: string;
  other: string;
  adoCloneQuestion: string;
  adoCloneSkip: string;
  // Unified selection strings (used for ADO, GitHub, Bitbucket)
  adoSelectStrategy: string;
  adoAllRepos: string;
  adoAllReposDesc: string;
  adoPatternGlob: string;
  adoPatternGlobDesc: string;
  adoPatternRegex: string;
  adoPatternRegexDesc: string;
  adoSkipOption: string;
  adoSkipDesc: string;
  // v1.0.21: Enhanced skip option with manual placement guidance
  skipManualReposHeader: string;
  skipManualReposGuidance: string;
  skipManualReposPath: string;
  skipManualReposExample: string;
  adoPatternPrompt: string;
  adoPatternHint: string;
  adoRegexPrompt: string;
  adoRegexHint: string;
  adoShortcutsHint: string;
  adoPatternRequired: string;
  adoInvalidRegex: string;
  adoSelectedAll: string;
  adoSelectedPattern: string;
  adoSelectedRegex: string;
  // ADO project selection strings
  adoOrgPrompt: string;
  adoPatPrompt: string;
  adoProjectPrompt: string;
  adoProjectsSelected: string;
  adoFetchingProjects: string;
  adoNoProjects: string;
  adoConnectionFailed: string;
  // GitHub/Bitbucket multi-repo strings (v0.32.6+)
  githubMultiRepoHeader: string;
  githubMultiRepoDesc: string;
  githubSelectStrategy: string;
  bitbucketMultiRepoHeader: string;
  bitbucketMultiRepoDesc: string;
  bitbucketSelectStrategy: string;
  // GitHub/Bitbucket credential prompts (v0.32.7+)
  githubOrgPrompt: string;
  githubPatPrompt: string;
  githubSelected: string;
  bitbucketWorkspacePrompt: string;
  bitbucketUsernamePrompt: string;
  bitbucketAppPasswordPrompt: string;
  bitbucketSelected: string;
  // Git URL format prompt (v1.0.7+)
  gitUrlFormatQuestion: string;
  gitUrlFormatSsh: string;
  gitUrlFormatHttps: string;
  gitUrlFormatSshDesc: string;
  gitUrlFormatHttpsDesc: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getRepoStrings>> = {
    en: {
      header: '📦 Repository Hosting',
      ciAutoDetected: 'CI mode: Auto-detected',
      structureQuestion: 'What is your repository structure?',
      structureSingle: 'single   - One repository (monorepo or standard project)',
      structureMultiple: 'multiple - Multiple repos (microservices, EDA, parent/child)',
      providerQuestion: 'Which Git provider do you use?',
      github: 'GitHub',
      githubDetected: '(detected)',
      githubRecommended: '(recommended)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Local (no remote)',
      other: 'Other (GitLab, etc - coming soon)',
      adoCloneQuestion: 'Enter repo name pattern to clone (e.g., sw-* or leave empty to skip):',
      adoCloneSkip: 'Skipping repo cloning - you can configure later',
      // Unified selection strings
      adoSelectStrategy: 'How do you want to select repositories to clone?',
      adoAllRepos: 'All',
      adoAllReposDesc: 'Clone all repositories from the project',
      adoPatternGlob: 'Pattern (glob)',
      adoPatternGlobDesc: 'Match by pattern (e.g., "sw-*", "*-backend")',
      adoPatternRegex: 'Pattern (regex)',
      adoPatternRegexDesc: 'Regular expression (e.g., "^sw-.*$")',
      adoSkipOption: 'Skip',
      adoSkipDesc: 'I have my own repos / configure later',
      // v1.0.21: Enhanced skip option with manual placement guidance
      skipManualReposHeader: '📁 Manual Repository Placement',
      skipManualReposGuidance: 'If you have existing repositories, place them in:',
      skipManualReposPath: 'repositories/{organization}/',
      skipManualReposExample: 'Example: repositories/my-org/frontend-app/',
      adoPatternPrompt: 'Enter pattern',
      adoPatternHint: 'Examples: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Enter regex pattern',
      adoRegexHint: 'Examples: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Shortcuts: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Pattern is required',
      adoInvalidRegex: 'Invalid regular expression',
      adoSelectedAll: 'All repositories will be cloned',
      adoSelectedPattern: 'Repositories matching pattern "{pattern}" will be cloned',
      adoSelectedRegex: 'Repositories matching regex "{pattern}" will be cloned',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps organization name:',
      adoPatPrompt: 'Personal Access Token (PAT):',
      adoProjectPrompt: 'Select project(s) to clone repositories from:',
      adoProjectsSelected: '{count} project(s) selected',
      adoFetchingProjects: 'Fetching projects...',
      adoNoProjects: 'No projects found in this organization',
      adoConnectionFailed: 'Failed to connect to Azure DevOps',
      // GitHub/Bitbucket multi-repo strings (v0.32.6+)
      githubMultiRepoHeader: '📁 GitHub Multi-Repository Selection',
      githubMultiRepoDesc: 'Select which repositories to work with from your GitHub organization.',
      githubSelectStrategy: 'How do you want to select GitHub repositories?',
      bitbucketMultiRepoHeader: '📁 Bitbucket Multi-Repository Selection',
      bitbucketMultiRepoDesc: 'Select which repositories to work with from your Bitbucket workspace.',
      bitbucketSelectStrategy: 'How do you want to select Bitbucket repositories?',
      // GitHub/Bitbucket credential prompts (v0.32.7+)
      githubOrgPrompt: 'GitHub organization or username:',
      githubPatPrompt: 'GitHub Personal Access Token (PAT):',
      githubSelected: 'GitHub organization "{org}" configured for cloning',
      bitbucketWorkspacePrompt: 'Bitbucket workspace slug:',
      bitbucketUsernamePrompt: 'Bitbucket username:',
      bitbucketAppPasswordPrompt: 'Bitbucket App Password:',
      bitbucketSelected: 'Bitbucket workspace "{workspace}" configured for cloning',
      // Git URL format (v1.0.7+)
      gitUrlFormatQuestion: 'Git remote URL format?',
      gitUrlFormatSsh: 'SSH',
      gitUrlFormatHttps: 'HTTPS',
      gitUrlFormatSshDesc: 'git@github.com:org/repo.git (requires SSH key)',
      gitUrlFormatHttpsDesc: 'https://github.com/org/repo.git (uses PAT for auth)',
    },
    ru: {
      header: '📦 Хостинг репозитория',
      ciAutoDetected: 'CI режим: Автоопределено',
      structureQuestion: 'Какова структура вашего репозитория?',
      structureSingle: 'single   - Один репозиторий (монорепо или стандартный проект)',
      structureMultiple: 'multiple - Несколько репо (микросервисы, EDA, родитель/потомок)',
      providerQuestion: 'Какой Git-провайдер вы используете?',
      github: 'GitHub',
      githubDetected: '(обнаружен)',
      githubRecommended: '(рекомендуется)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Локально (без remote)',
      other: 'Другой (GitLab и т.д. - скоро)',
      adoCloneQuestion: 'Введите шаблон имени репо для клонирования (напр., sw-* или оставьте пустым):',
      adoCloneSkip: 'Пропуск клонирования - можно настроить позже',
      // Unified selection strings
      adoSelectStrategy: 'Как вы хотите выбрать репозитории для клонирования?',
      adoAllRepos: 'Все',
      adoAllReposDesc: 'Клонировать все репозитории из проекта',
      adoPatternGlob: 'Шаблон (glob)',
      adoPatternGlobDesc: 'Сопоставление по шаблону (напр., "sw-*", "*-backend")',
      adoPatternRegex: 'Шаблон (regex)',
      adoPatternRegexDesc: 'Регулярное выражение (напр., "^sw-.*$")',
      adoSkipOption: 'Пропустить',
      adoSkipDesc: 'У меня свои репо / настроить позже',
      // v1.0.21: Enhanced skip option with manual placement guidance
      skipManualReposHeader: '📁 Ручное размещение репозиториев',
      skipManualReposGuidance: 'Если у вас есть существующие репозитории, разместите их в:',
      skipManualReposPath: 'repositories/{organization}/',
      skipManualReposExample: 'Пример: repositories/my-org/frontend-app/',
      adoPatternPrompt: 'Введите шаблон',
      adoPatternHint: 'Примеры: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Введите регулярное выражение',
      adoRegexHint: 'Примеры: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Сокращения: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Шаблон обязателен',
      adoInvalidRegex: 'Неверное регулярное выражение',
      adoSelectedAll: 'Все репозитории будут клонированы',
      adoSelectedPattern: 'Репозитории, соответствующие шаблону "{pattern}", будут клонированы',
      adoSelectedRegex: 'Репозитории, соответствующие regex "{pattern}", будут клонированы',
      // ADO project selection strings
      adoOrgPrompt: 'Название организации Azure DevOps:',
      adoPatPrompt: 'Персональный токен доступа (PAT):',
      adoProjectPrompt: 'Выберите проект(ы) для клонирования репозиториев:',
      adoProjectsSelected: 'Выбрано проектов: {count}',
      adoFetchingProjects: 'Загрузка проектов...',
      adoNoProjects: 'Проекты не найдены в этой организации',
      adoConnectionFailed: 'Не удалось подключиться к Azure DevOps',
      // GitHub/Bitbucket multi-repo strings (v0.32.6+)
      githubMultiRepoHeader: '📁 Выбор репозиториев GitHub',
      githubMultiRepoDesc: 'Выберите репозитории для работы из вашей организации GitHub.',
      githubSelectStrategy: 'Как вы хотите выбрать репозитории GitHub?',
      bitbucketMultiRepoHeader: '📁 Выбор репозиториев Bitbucket',
      bitbucketMultiRepoDesc: 'Выберите репозитории для работы из вашего рабочего пространства Bitbucket.',
      bitbucketSelectStrategy: 'Как вы хотите выбрать репозитории Bitbucket?',
      githubOrgPrompt: 'Организация или имя пользователя GitHub:',
      githubPatPrompt: 'Personal Access Token (PAT) GitHub:',
      githubSelected: 'Организация GitHub "{org}" настроена для клонирования',
      bitbucketWorkspacePrompt: 'Workspace Bitbucket:',
      bitbucketUsernamePrompt: 'Имя пользователя Bitbucket:',
      bitbucketAppPasswordPrompt: 'App Password Bitbucket:',
      bitbucketSelected: 'Workspace Bitbucket "{workspace}" настроен для клонирования',
      // Git URL format (v1.0.7+)
      gitUrlFormatQuestion: 'Формат URL Git-репозитория?',
      gitUrlFormatSsh: 'SSH',
      gitUrlFormatHttps: 'HTTPS',
      gitUrlFormatSshDesc: 'git@github.com:org/repo.git (требуется SSH-ключ)',
      gitUrlFormatHttpsDesc: 'https://github.com/org/repo.git (использует PAT для авторизации)',
    },
    es: {
      header: '📦 Alojamiento del repositorio',
      ciAutoDetected: 'Modo CI: Detectado automáticamente',
      structureQuestion: '¿Cuál es la estructura de su repositorio?',
      structureSingle: 'single   - Un repositorio (monorepo o proyecto estándar)',
      structureMultiple: 'multiple - Múltiples repos (microservicios, EDA, padre/hijo)',
      providerQuestion: '¿Qué proveedor de Git usa?',
      github: 'GitHub',
      githubDetected: '(detectado)',
      githubRecommended: '(recomendado)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Local (sin remoto)',
      other: 'Otro (GitLab, etc - próximamente)',
      adoCloneQuestion: 'Ingrese patrón de nombre de repo a clonar (ej., sw-* o deje vacío):',
      adoCloneSkip: 'Omitiendo clonación - puede configurar después',
      // Unified selection strings
      adoSelectStrategy: '¿Cómo quiere seleccionar repositorios para clonar?',
      adoAllRepos: 'Todos',
      adoAllReposDesc: 'Clonar todos los repositorios del proyecto',
      adoPatternGlob: 'Patrón (glob)',
      adoPatternGlobDesc: 'Coincidir por patrón (ej., "sw-*", "*-backend")',
      adoPatternRegex: 'Patrón (regex)',
      adoPatternRegexDesc: 'Expresión regular (ej., "^sw-.*$")',
      adoSkipOption: 'Omitir',
      adoSkipDesc: 'Tengo mis propios repos / configurar después',
      // v1.0.21: Enhanced skip option with manual placement guidance
      skipManualReposHeader: '📁 Ubicación manual de repositorios',
      skipManualReposGuidance: 'Si tiene repositorios existentes, colóquelos en:',
      skipManualReposPath: 'repositories/{organization}/',
      skipManualReposExample: 'Ejemplo: repositories/my-org/frontend-app/',
      adoPatternPrompt: 'Ingrese patrón',
      adoPatternHint: 'Ejemplos: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Ingrese expresión regular',
      adoRegexHint: 'Ejemplos: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Atajos: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'El patrón es requerido',
      adoInvalidRegex: 'Expresión regular inválida',
      adoSelectedAll: 'Todos los repositorios serán clonados',
      adoSelectedPattern: 'Repositorios que coincidan con "{pattern}" serán clonados',
      adoSelectedRegex: 'Repositorios que coincidan con regex "{pattern}" serán clonados',
      // ADO project selection strings
      adoOrgPrompt: 'Nombre de la organización Azure DevOps:',
      adoPatPrompt: 'Token de Acceso Personal (PAT):',
      adoProjectPrompt: 'Seleccione proyecto(s) para clonar repositorios:',
      adoProjectsSelected: '{count} proyecto(s) seleccionado(s)',
      adoFetchingProjects: 'Obteniendo proyectos...',
      adoNoProjects: 'No se encontraron proyectos en esta organización',
      adoConnectionFailed: 'Error al conectar con Azure DevOps',
      // GitHub/Bitbucket multi-repo strings (v0.32.6+)
      githubMultiRepoHeader: '📁 Selección de repositorios GitHub',
      githubMultiRepoDesc: 'Seleccione los repositorios de su organización GitHub.',
      githubSelectStrategy: '¿Cómo desea seleccionar los repositorios de GitHub?',
      bitbucketMultiRepoHeader: '📁 Selección de repositorios Bitbucket',
      bitbucketMultiRepoDesc: 'Seleccione los repositorios de su espacio de trabajo Bitbucket.',
      bitbucketSelectStrategy: '¿Cómo desea seleccionar los repositorios de Bitbucket?',
      githubOrgPrompt: 'Organización o nombre de usuario de GitHub:',
      githubPatPrompt: 'Token de acceso personal (PAT) de GitHub:',
      githubSelected: 'Organización de GitHub "{org}" configurada para clonar',
      bitbucketWorkspacePrompt: 'Workspace de Bitbucket:',
      bitbucketUsernamePrompt: 'Nombre de usuario de Bitbucket:',
      bitbucketAppPasswordPrompt: 'Contraseña de aplicación de Bitbucket:',
      bitbucketSelected: 'Workspace de Bitbucket "{workspace}" configurado para clonar',
      // Git URL format (v1.0.7+)
      gitUrlFormatQuestion: '¿Formato de URL del repositorio Git?',
      gitUrlFormatSsh: 'SSH',
      gitUrlFormatHttps: 'HTTPS',
      gitUrlFormatSshDesc: 'git@github.com:org/repo.git (requiere clave SSH)',
      gitUrlFormatHttpsDesc: 'https://github.com/org/repo.git (usa PAT para autenticación)',
    },
    zh: {
      header: '📦 仓库托管',
      ciAutoDetected: 'CI 模式：自动检测',
      structureQuestion: '您的仓库结构是什么？',
      structureSingle: 'single   - 单个仓库（单体仓库或标准项目）',
      structureMultiple: 'multiple - 多个仓库（微服务、EDA、父/子）',
      providerQuestion: '您使用哪个 Git 提供商？',
      github: 'GitHub',
      githubDetected: '（已检测）',
      githubRecommended: '（推荐）',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: '本地（无远程）',
      other: '其他（GitLab 等 - 即将推出）',
      adoCloneQuestion: '输入要克隆的仓库名称模式（例如 sw-* 或留空跳过）：',
      adoCloneSkip: '跳过克隆 - 稍后可以配置',
      // Unified selection strings
      adoSelectStrategy: '您想如何选择要克隆的仓库？',
      adoAllRepos: '全部',
      adoAllReposDesc: '克隆项目中的所有仓库',
      adoPatternGlob: '模式 (glob)',
      adoPatternGlobDesc: '按模式匹配（例如 "sw-*"、"*-backend"）',
      adoPatternRegex: '模式 (正则)',
      adoPatternRegexDesc: '正则表达式（例如 "^sw-.*$"）',
      adoSkipOption: '跳过',
      adoSkipDesc: '我有自己的仓库 / 稍后配置',
      // v1.0.21: Enhanced skip option with manual placement guidance
      skipManualReposHeader: '📁 手动放置仓库',
      skipManualReposGuidance: '如果您有现有仓库，请将它们放在：',
      skipManualReposPath: 'repositories/{organization}/',
      skipManualReposExample: '示例：repositories/my-org/frontend-app/',
      adoPatternPrompt: '输入模式',
      adoPatternHint: '示例："sw-*"、"*-backend"、"api-*-service"',
      adoRegexPrompt: '输入正则表达式',
      adoRegexHint: '示例："^sw-"、".*-backend$"、"^api-\\d+-service$"',
      adoShortcutsHint: '快捷方式："starts: sw-"、"ends: -api"、"contains: core"',
      adoPatternRequired: '模式是必需的',
      adoInvalidRegex: '无效的正则表达式',
      adoSelectedAll: '将克隆所有仓库',
      adoSelectedPattern: '匹配模式 "{pattern}" 的仓库将被克隆',
      adoSelectedRegex: '匹配正则 "{pattern}" 的仓库将被克隆',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps 组织名称：',
      adoPatPrompt: '个人访问令牌 (PAT)：',
      adoProjectPrompt: '选择要克隆仓库的项目：',
      adoProjectsSelected: '已选择 {count} 个项目',
      adoFetchingProjects: '正在获取项目...',
      adoNoProjects: '在此组织中未找到项目',
      adoConnectionFailed: '无法连接到 Azure DevOps',
      // GitHub/Bitbucket multi-repo strings (v0.32.6+)
      githubMultiRepoHeader: '📁 GitHub 多仓库选择',
      githubMultiRepoDesc: '从您的 GitHub 组织中选择要使用的仓库。',
      githubSelectStrategy: '您想如何选择 GitHub 仓库？',
      bitbucketMultiRepoHeader: '📁 Bitbucket 多仓库选择',
      bitbucketMultiRepoDesc: '从您的 Bitbucket 工作区中选择要使用的仓库。',
      bitbucketSelectStrategy: '您想如何选择 Bitbucket 仓库？',
      githubOrgPrompt: 'GitHub 组织或用户名：',
      githubPatPrompt: 'GitHub 个人访问令牌 (PAT)：',
      githubSelected: 'GitHub 组织 "{org}" 已配置用于克隆',
      bitbucketWorkspacePrompt: 'Bitbucket 工作区：',
      bitbucketUsernamePrompt: 'Bitbucket 用户名：',
      bitbucketAppPasswordPrompt: 'Bitbucket 应用密码：',
      bitbucketSelected: 'Bitbucket 工作区 "{workspace}" 已配置用于克隆',
      // Git URL format (v1.0.7+)
      gitUrlFormatQuestion: 'Git 远程 URL 格式？',
      gitUrlFormatSsh: 'SSH',
      gitUrlFormatHttps: 'HTTPS',
      gitUrlFormatSshDesc: 'git@github.com:org/repo.git（需要 SSH 密钥）',
      gitUrlFormatHttpsDesc: 'https://github.com/org/repo.git（使用 PAT 进行身份验证）',
    },
    de: {
      header: '📦 Repository-Hosting',
      ciAutoDetected: 'CI-Modus: Automatisch erkannt',
      structureQuestion: 'Wie ist Ihre Repository-Struktur?',
      structureSingle: 'single   - Ein Repository (Monorepo oder Standardprojekt)',
      structureMultiple: 'multiple - Mehrere Repos (Microservices, EDA, Parent/Child)',
      providerQuestion: 'Welchen Git-Anbieter verwenden Sie?',
      github: 'GitHub',
      githubDetected: '(erkannt)',
      githubRecommended: '(empfohlen)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Lokal (kein Remote)',
      other: 'Andere (GitLab, etc - kommt bald)',
      adoCloneQuestion: 'Repo-Namensmuster zum Klonen eingeben (z.B. sw-* oder leer lassen):',
      adoCloneSkip: 'Klonen übersprungen - später konfigurierbar',
      // Unified selection strings
      adoSelectStrategy: 'Wie möchten Sie Repositories zum Klonen auswählen?',
      adoAllRepos: 'Alle',
      adoAllReposDesc: 'Alle Repositories aus dem Projekt klonen',
      adoPatternGlob: 'Muster (glob)',
      adoPatternGlobDesc: 'Nach Muster filtern (z.B. "sw-*", "*-backend")',
      adoPatternRegex: 'Muster (regex)',
      adoPatternRegexDesc: 'Regulärer Ausdruck (z.B. "^sw-.*$")',
      adoSkipOption: 'Überspringen',
      adoSkipDesc: 'Ich habe eigene Repos / später konfigurieren',
      // v1.0.21: Enhanced skip option with manual placement guidance
      skipManualReposHeader: '📁 Manuelle Repository-Platzierung',
      skipManualReposGuidance: 'Wenn Sie bereits Repositories haben, platzieren Sie diese in:',
      skipManualReposPath: 'repositories/{organization}/',
      skipManualReposExample: 'Beispiel: repositories/my-org/frontend-app/',
      adoPatternPrompt: 'Muster eingeben',
      adoPatternHint: 'Beispiele: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Regex eingeben',
      adoRegexHint: 'Beispiele: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Abkürzungen: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Muster ist erforderlich',
      adoInvalidRegex: 'Ungültiger regulärer Ausdruck',
      adoSelectedAll: 'Alle Repositories werden geklont',
      adoSelectedPattern: 'Repositories mit Muster "{pattern}" werden geklont',
      adoSelectedRegex: 'Repositories mit Regex "{pattern}" werden geklont',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps Organisationsname:',
      adoPatPrompt: 'Personal Access Token (PAT):',
      adoProjectPrompt: 'Projekt(e) zum Klonen von Repositories auswählen:',
      adoProjectsSelected: '{count} Projekt(e) ausgewählt',
      adoFetchingProjects: 'Projekte werden abgerufen...',
      adoNoProjects: 'Keine Projekte in dieser Organisation gefunden',
      adoConnectionFailed: 'Verbindung zu Azure DevOps fehlgeschlagen',
      // GitHub/Bitbucket multi-repo strings (v0.32.6+)
      githubMultiRepoHeader: '📁 GitHub Multi-Repository Auswahl',
      githubMultiRepoDesc: 'Wählen Sie die Repositories aus Ihrer GitHub-Organisation.',
      githubSelectStrategy: 'Wie möchten Sie GitHub-Repositories auswählen?',
      bitbucketMultiRepoHeader: '📁 Bitbucket Multi-Repository Auswahl',
      bitbucketMultiRepoDesc: 'Wählen Sie die Repositories aus Ihrem Bitbucket-Workspace.',
      bitbucketSelectStrategy: 'Wie möchten Sie Bitbucket-Repositories auswählen?',
      githubOrgPrompt: 'GitHub-Organisation oder Benutzername:',
      githubPatPrompt: 'GitHub Personal Access Token (PAT):',
      githubSelected: 'GitHub-Organisation "{org}" für Klonen konfiguriert',
      bitbucketWorkspacePrompt: 'Bitbucket-Workspace:',
      bitbucketUsernamePrompt: 'Bitbucket-Benutzername:',
      bitbucketAppPasswordPrompt: 'Bitbucket-App-Passwort:',
      bitbucketSelected: 'Bitbucket-Workspace "{workspace}" für Klonen konfiguriert',
      // Git URL format (v1.0.7+)
      gitUrlFormatQuestion: 'Git Remote URL Format?',
      gitUrlFormatSsh: 'SSH',
      gitUrlFormatHttps: 'HTTPS',
      gitUrlFormatSshDesc: 'git@github.com:org/repo.git (erfordert SSH-Schlüssel)',
      gitUrlFormatHttpsDesc: 'https://github.com/org/repo.git (verwendet PAT für Auth)',
    },
    fr: {
      header: '📦 Hébergement du dépôt',
      ciAutoDetected: 'Mode CI: Détecté automatiquement',
      structureQuestion: 'Quelle est la structure de votre dépôt?',
      structureSingle: 'single   - Un dépôt (monorepo ou projet standard)',
      structureMultiple: 'multiple - Plusieurs dépôts (microservices, EDA, parent/enfant)',
      providerQuestion: 'Quel fournisseur Git utilisez-vous?',
      github: 'GitHub',
      githubDetected: '(détecté)',
      githubRecommended: '(recommandé)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Local (pas de remote)',
      other: 'Autre (GitLab, etc - bientôt)',
      adoCloneQuestion: 'Entrez le modèle de nom de repo à cloner (ex. sw-* ou laissez vide):',
      adoCloneSkip: 'Clonage ignoré - configurable plus tard',
      // Unified selection strings
      adoSelectStrategy: 'Comment voulez-vous sélectionner les repos à cloner?',
      adoAllRepos: 'Tous',
      adoAllReposDesc: 'Cloner tous les repos du projet',
      adoPatternGlob: 'Modèle (glob)',
      adoPatternGlobDesc: 'Correspondance par modèle (ex., "sw-*", "*-backend")',
      adoPatternRegex: 'Modèle (regex)',
      adoPatternRegexDesc: 'Expression régulière (ex., "^sw-.*$")',
      adoSkipOption: 'Ignorer',
      adoSkipDesc: "J'ai mes propres repos / configurer plus tard",
      // v1.0.21: Enhanced skip option with manual placement guidance
      skipManualReposHeader: '📁 Placement manuel des dépôts',
      skipManualReposGuidance: 'Si vous avez des dépôts existants, placez-les dans:',
      skipManualReposPath: 'repositories/{organization}/',
      skipManualReposExample: 'Exemple: repositories/my-org/frontend-app/',
      adoPatternPrompt: 'Entrez le modèle',
      adoPatternHint: 'Exemples: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Entrez le regex',
      adoRegexHint: 'Exemples: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Raccourcis: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Le modèle est requis',
      adoInvalidRegex: 'Expression régulière invalide',
      adoSelectedAll: 'Tous les repos seront clonés',
      adoSelectedPattern: 'Les repos correspondant à "{pattern}" seront clonés',
      adoSelectedRegex: 'Les repos correspondant au regex "{pattern}" seront clonés',
      // ADO project selection strings
      adoOrgPrompt: 'Nom de l\'organisation Azure DevOps:',
      adoPatPrompt: 'Jeton d\'accès personnel (PAT):',
      adoProjectPrompt: 'Sélectionnez le(s) projet(s) pour cloner les repos:',
      adoProjectsSelected: '{count} projet(s) sélectionné(s)',
      adoFetchingProjects: 'Récupération des projets...',
      adoNoProjects: 'Aucun projet trouvé dans cette organisation',
      adoConnectionFailed: 'Échec de connexion à Azure DevOps',
      // GitHub/Bitbucket multi-repo strings (v0.32.6+)
      githubMultiRepoHeader: '📁 Sélection multi-dépôt GitHub',
      githubMultiRepoDesc: 'Sélectionnez les dépôts de votre organisation GitHub.',
      githubSelectStrategy: 'Comment voulez-vous sélectionner les dépôts GitHub?',
      bitbucketMultiRepoHeader: '📁 Sélection multi-dépôt Bitbucket',
      bitbucketMultiRepoDesc: 'Sélectionnez les dépôts de votre espace de travail Bitbucket.',
      bitbucketSelectStrategy: 'Comment voulez-vous sélectionner les dépôts Bitbucket?',
      githubOrgPrompt: 'Organisation ou nom d\'utilisateur GitHub :',
      githubPatPrompt: 'Token d\'accès personnel GitHub (PAT) :',
      githubSelected: 'Organisation GitHub "{org}" configurée pour le clonage',
      bitbucketWorkspacePrompt: 'Workspace Bitbucket :',
      bitbucketUsernamePrompt: 'Nom d\'utilisateur Bitbucket :',
      bitbucketAppPasswordPrompt: 'Mot de passe d\'application Bitbucket :',
      bitbucketSelected: 'Workspace Bitbucket "{workspace}" configuré pour le clonage',
      // Git URL format (v1.0.7+)
      gitUrlFormatQuestion: 'Format d\'URL du dépôt Git ?',
      gitUrlFormatSsh: 'SSH',
      gitUrlFormatHttps: 'HTTPS',
      gitUrlFormatSshDesc: 'git@github.com:org/repo.git (nécessite une clé SSH)',
      gitUrlFormatHttpsDesc: 'https://github.com/org/repo.git (utilise PAT pour l\'auth)',
    },
    ja: {
      header: '📦 リポジトリホスティング',
      ciAutoDetected: 'CIモード：自動検出',
      structureQuestion: 'リポジトリの構造は？',
      structureSingle: 'single   - 1つのリポジトリ（モノレポまたは標準プロジェクト）',
      structureMultiple: 'multiple - 複数のリポジトリ（マイクロサービス、EDA、親/子）',
      providerQuestion: 'どのGitプロバイダーを使用していますか？',
      github: 'GitHub',
      githubDetected: '（検出済み）',
      githubRecommended: '（推奨）',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'ローカル（リモートなし）',
      other: 'その他（GitLabなど - 近日公開）',
      adoCloneQuestion: 'クローンするリポ名パターンを入力（例: sw-* または空白でスキップ）:',
      adoCloneSkip: 'クローンをスキップ - 後で設定可能',
      // Unified selection strings
      adoSelectStrategy: 'クローンするリポジトリをどのように選択しますか？',
      adoAllRepos: 'すべて',
      adoAllReposDesc: 'プロジェクトのすべてのリポジトリをクローン',
      adoPatternGlob: 'パターン (glob)',
      adoPatternGlobDesc: 'パターンでマッチ（例: "sw-*", "*-backend"）',
      adoPatternRegex: 'パターン (正規表現)',
      adoPatternRegexDesc: '正規表現（例: "^sw-.*$"）',
      adoSkipOption: 'スキップ',
      adoSkipDesc: '自分のリポジトリがある / 後で設定',
      // v1.0.21: Enhanced skip option with manual placement guidance
      skipManualReposHeader: '📁 リポジトリの手動配置',
      skipManualReposGuidance: '既存のリポジトリがある場合は、次の場所に配置してください:',
      skipManualReposPath: 'repositories/{organization}/',
      skipManualReposExample: '例: repositories/my-org/frontend-app/',
      adoPatternPrompt: 'パターンを入力',
      adoPatternHint: '例: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: '正規表現を入力',
      adoRegexHint: '例: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'ショートカット: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'パターンは必須です',
      adoInvalidRegex: '無効な正規表現',
      adoSelectedAll: 'すべてのリポジトリがクローンされます',
      adoSelectedPattern: '"{pattern}" に一致するリポジトリがクローンされます',
      adoSelectedRegex: '正規表現 "{pattern}" に一致するリポジトリがクローンされます',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps 組織名:',
      adoPatPrompt: '個人アクセストークン (PAT):',
      adoProjectPrompt: 'リポジトリをクローンするプロジェクトを選択:',
      adoProjectsSelected: '{count} 個のプロジェクトを選択',
      adoFetchingProjects: 'プロジェクトを取得中...',
      adoNoProjects: 'この組織にプロジェクトが見つかりません',
      adoConnectionFailed: 'Azure DevOps への接続に失敗しました',
      // GitHub/Bitbucket multi-repo strings (v0.32.6+)
      githubMultiRepoHeader: '📁 GitHub マルチリポジトリ選択',
      githubMultiRepoDesc: 'GitHub組織からリポジトリを選択してください。',
      githubSelectStrategy: 'GitHubリポジトリをどのように選択しますか？',
      bitbucketMultiRepoHeader: '📁 Bitbucket マルチリポジトリ選択',
      bitbucketMultiRepoDesc: 'Bitbucketワークスペースからリポジトリを選択してください。',
      bitbucketSelectStrategy: 'Bitbucketリポジトリをどのように選択しますか？',
      githubOrgPrompt: 'GitHub組織またはユーザー名：',
      githubPatPrompt: 'GitHub Personal Access Token (PAT)：',
      githubSelected: 'GitHub組織 "{org}" がクローン用に設定されました',
      bitbucketWorkspacePrompt: 'Bitbucketワークスペース：',
      bitbucketUsernamePrompt: 'Bitbucketユーザー名：',
      bitbucketAppPasswordPrompt: 'Bitbucketアプリパスワード：',
      bitbucketSelected: 'Bitbucketワークスペース "{workspace}" がクローン用に設定されました',
      // Git URL format (v1.0.7+)
      gitUrlFormatQuestion: 'GitリモートURLの形式は？',
      gitUrlFormatSsh: 'SSH',
      gitUrlFormatHttps: 'HTTPS',
      gitUrlFormatSshDesc: 'git@github.com:org/repo.git（SSHキーが必要）',
      gitUrlFormatHttpsDesc: 'https://github.com/org/repo.git（認証にPATを使用）',
    },
    ko: {
      header: '📦 저장소 호스팅',
      ciAutoDetected: 'CI 모드: 자동 감지됨',
      structureQuestion: '저장소 구조는 무엇입니까?',
      structureSingle: 'single   - 하나의 저장소 (모노레포 또는 표준 프로젝트)',
      structureMultiple: 'multiple - 여러 저장소 (마이크로서비스, EDA, 부모/자식)',
      providerQuestion: '어떤 Git 제공자를 사용하시나요?',
      github: 'GitHub',
      githubDetected: '(감지됨)',
      githubRecommended: '(권장)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: '로컬 (원격 없음)',
      other: '기타 (GitLab 등 - 곧 출시)',
      adoCloneQuestion: '복제할 저장소 이름 패턴 입력 (예: sw-* 또는 비워두기):',
      adoCloneSkip: '복제 건너뜀 - 나중에 설정 가능',
      // Unified selection strings
      adoSelectStrategy: '복제할 저장소를 어떻게 선택하시겠습니까?',
      adoAllRepos: '모두',
      adoAllReposDesc: '프로젝트의 모든 저장소 복제',
      adoPatternGlob: '패턴 (glob)',
      adoPatternGlobDesc: '패턴으로 매칭 (예: "sw-*", "*-backend")',
      adoPatternRegex: '패턴 (정규식)',
      adoPatternRegexDesc: '정규 표현식 (예: "^sw-.*$")',
      adoSkipOption: '건너뛰기',
      adoSkipDesc: '내 레포가 있음 / 나중에 설정',
      // v1.0.21: Enhanced skip option with manual placement guidance
      skipManualReposHeader: '📁 수동 저장소 배치',
      skipManualReposGuidance: '기존 저장소가 있는 경우 다음 위치에 배치하세요:',
      skipManualReposPath: 'repositories/{organization}/',
      skipManualReposExample: '예: repositories/my-org/frontend-app/',
      adoPatternPrompt: '패턴 입력',
      adoPatternHint: '예: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: '정규식 입력',
      adoRegexHint: '예: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: '단축키: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: '패턴이 필요합니다',
      adoInvalidRegex: '잘못된 정규 표현식',
      adoSelectedAll: '모든 저장소가 복제됩니다',
      adoSelectedPattern: '"{pattern}" 패턴과 일치하는 저장소가 복제됩니다',
      adoSelectedRegex: '정규식 "{pattern}"과 일치하는 저장소가 복제됩니다',
      // ADO project selection strings
      adoOrgPrompt: 'Azure DevOps 조직 이름:',
      adoPatPrompt: '개인용 액세스 토큰 (PAT):',
      adoProjectPrompt: '저장소를 복제할 프로젝트 선택:',
      adoProjectsSelected: '{count}개 프로젝트 선택됨',
      adoFetchingProjects: '프로젝트 가져오는 중...',
      adoNoProjects: '이 조직에서 프로젝트를 찾을 수 없습니다',
      adoConnectionFailed: 'Azure DevOps 연결 실패',
      // GitHub/Bitbucket multi-repo strings (v0.32.6+)
      githubMultiRepoHeader: '📁 GitHub 다중 저장소 선택',
      githubMultiRepoDesc: 'GitHub 조직에서 저장소를 선택하세요.',
      githubSelectStrategy: 'GitHub 저장소를 어떻게 선택하시겠습니까?',
      bitbucketMultiRepoHeader: '📁 Bitbucket 다중 저장소 선택',
      bitbucketMultiRepoDesc: 'Bitbucket 워크스페이스에서 저장소를 선택하세요.',
      bitbucketSelectStrategy: 'Bitbucket 저장소를 어떻게 선택하시겠습니까?',
      githubOrgPrompt: 'GitHub 조직 또는 사용자 이름:',
      githubPatPrompt: 'GitHub Personal Access Token (PAT):',
      githubSelected: 'GitHub 조직 "{org}"이(가) 복제용으로 구성되었습니다',
      bitbucketWorkspacePrompt: 'Bitbucket 워크스페이스:',
      bitbucketUsernamePrompt: 'Bitbucket 사용자 이름:',
      bitbucketAppPasswordPrompt: 'Bitbucket 앱 비밀번호:',
      bitbucketSelected: 'Bitbucket 워크스페이스 "{workspace}"이(가) 복제용으로 구성되었습니다',
      // Git URL format (v1.0.7+)
      gitUrlFormatQuestion: 'Git 원격 URL 형식?',
      gitUrlFormatSsh: 'SSH',
      gitUrlFormatHttps: 'HTTPS',
      gitUrlFormatSshDesc: 'git@github.com:org/repo.git (SSH 키 필요)',
      gitUrlFormatHttpsDesc: 'https://github.com/org/repo.git (인증에 PAT 사용)',
    },
    pt: {
      header: '📦 Hospedagem do repositório',
      ciAutoDetected: 'Modo CI: Detectado automaticamente',
      structureQuestion: 'Qual é a estrutura do seu repositório?',
      structureSingle: 'single   - Um repositório (monorepo ou projeto padrão)',
      structureMultiple: 'multiple - Múltiplos repos (microsserviços, EDA, pai/filho)',
      providerQuestion: 'Qual provedor Git você usa?',
      github: 'GitHub',
      githubDetected: '(detectado)',
      githubRecommended: '(recomendado)',
      bitbucket: 'Bitbucket',
      ado: 'Azure DevOps',
      local: 'Local (sem remoto)',
      other: 'Outro (GitLab, etc - em breve)',
      adoCloneQuestion: 'Digite padrão de nome de repo para clonar (ex. sw-* ou deixe vazio):',
      adoCloneSkip: 'Clonagem ignorada - configurável depois',
      // Unified selection strings
      adoSelectStrategy: 'Como você quer selecionar repositórios para clonar?',
      adoAllRepos: 'Todos',
      adoAllReposDesc: 'Clonar todos os repositórios do projeto',
      adoPatternGlob: 'Padrão (glob)',
      adoPatternGlobDesc: 'Corresponder por padrão (ex., "sw-*", "*-backend")',
      adoPatternRegex: 'Padrão (regex)',
      adoPatternRegexDesc: 'Expressão regular (ex., "^sw-.*$")',
      adoSkipOption: 'Pular',
      adoSkipDesc: 'Tenho meus próprios repos / configurar depois',
      // v1.0.21: Enhanced skip option with manual placement guidance
      skipManualReposHeader: '📁 Posicionamento manual de repositórios',
      skipManualReposGuidance: 'Se você tiver repositórios existentes, coloque-os em:',
      skipManualReposPath: 'repositories/{organization}/',
      skipManualReposExample: 'Exemplo: repositories/my-org/frontend-app/',
      adoPatternPrompt: 'Digite o padrão',
      adoPatternHint: 'Exemplos: "sw-*", "*-backend", "api-*-service"',
      adoRegexPrompt: 'Digite a regex',
      adoRegexHint: 'Exemplos: "^sw-", ".*-backend$", "^api-\\d+-service$"',
      adoShortcutsHint: 'Atalhos: "starts: sw-", "ends: -api", "contains: core"',
      adoPatternRequired: 'Padrão é obrigatório',
      adoInvalidRegex: 'Expressão regular inválida',
      adoSelectedAll: 'Todos os repositórios serão clonados',
      adoSelectedPattern: 'Repositórios correspondendo a "{pattern}" serão clonados',
      adoSelectedRegex: 'Repositórios correspondendo a regex "{pattern}" serão clonados',
      // ADO project selection strings
      adoOrgPrompt: 'Nome da organização Azure DevOps:',
      adoPatPrompt: 'Token de Acesso Pessoal (PAT):',
      adoProjectPrompt: 'Selecione projeto(s) para clonar repositórios:',
      adoProjectsSelected: '{count} projeto(s) selecionado(s)',
      adoFetchingProjects: 'Buscando projetos...',
      adoNoProjects: 'Nenhum projeto encontrado nesta organização',
      adoConnectionFailed: 'Falha ao conectar ao Azure DevOps',
      // GitHub/Bitbucket multi-repo strings (v0.32.6+)
      githubMultiRepoHeader: '📁 Seleção de múltiplos repositórios GitHub',
      githubMultiRepoDesc: 'Selecione os repositórios da sua organização GitHub.',
      githubSelectStrategy: 'Como você quer selecionar os repositórios do GitHub?',
      bitbucketMultiRepoHeader: '📁 Seleção de múltiplos repositórios Bitbucket',
      bitbucketMultiRepoDesc: 'Selecione os repositórios do seu workspace Bitbucket.',
      bitbucketSelectStrategy: 'Como você quer selecionar os repositórios do Bitbucket?',
      githubOrgPrompt: 'Organização ou nome de usuário do GitHub:',
      githubPatPrompt: 'Token de acesso pessoal do GitHub (PAT):',
      githubSelected: 'Organização do GitHub "{org}" configurada para clonagem',
      bitbucketWorkspacePrompt: 'Workspace do Bitbucket:',
      bitbucketUsernamePrompt: 'Nome de usuário do Bitbucket:',
      bitbucketAppPasswordPrompt: 'Senha de aplicativo do Bitbucket:',
      bitbucketSelected: 'Workspace do Bitbucket "{workspace}" configurado para clonagem',
      // Git URL format (v1.0.7+)
      gitUrlFormatQuestion: 'Formato de URL do repositório Git?',
      gitUrlFormatSsh: 'SSH',
      gitUrlFormatHttps: 'HTTPS',
      gitUrlFormatSshDesc: 'git@github.com:org/repo.git (requer chave SSH)',
      gitUrlFormatHttpsDesc: 'https://github.com/org/repo.git (usa PAT para autenticação)',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Generic multi-repo pattern selection strategy type
 */
export type MultiRepoCloneStrategy = 'all' | 'pattern-glob' | 'pattern-regex' | 'skip';

/**
 * Generic multi-repo pattern selection result
 */
export interface MultiRepoPatternResult {
  strategy: MultiRepoCloneStrategy;
  pattern?: string;
  isRegex?: boolean;
}

/**
 * Prompt for multi-repo pattern selection (unified for GitHub, Bitbucket, ADO)
 *
 * @param provider - The git provider ('github' | 'bitbucket' | 'ado')
 * @param strings - Localized strings
 * @param orgName - Organization/workspace name for skip guidance (v1.0.21+)
 * @returns Selected pattern result
 */
async function promptMultiRepoPatternSelection(
  provider: 'github' | 'bitbucket' | 'ado',
  strings: ReturnType<typeof getRepoStrings>,
  orgName?: string
): Promise<MultiRepoPatternResult> {
  // Display provider-specific header
  if (provider === 'github') {
    console.log(chalk.blue(`\n${strings.githubMultiRepoHeader}\n`));
    console.log(chalk.gray(`   ${strings.githubMultiRepoDesc}\n`));
  } else if (provider === 'bitbucket') {
    console.log(chalk.blue(`\n${strings.bitbucketMultiRepoHeader}\n`));
    console.log(chalk.gray(`   ${strings.bitbucketMultiRepoDesc}\n`));
  } else {
    console.log(chalk.blue('\n📁 Azure DevOps Repository Selection\n'));
    console.log(chalk.gray('   Select which repositories to clone from your ADO project.\n'));
  }

  // Get provider-specific strategy message
  const strategyMessage = provider === 'github'
    ? strings.githubSelectStrategy
    : provider === 'bitbucket'
    ? strings.bitbucketSelectStrategy
    : strings.adoSelectStrategy;

  const strategyChoices: Array<{ name: string; value: MultiRepoCloneStrategy }> = [
    {
      name: `${chalk.green('✓')} ${strings.adoAllRepos} ${chalk.gray(`- ${strings.adoAllReposDesc}`)}`,
      value: 'all',
    },
    {
      name: `${strings.adoPatternGlob} ${chalk.gray(`- ${strings.adoPatternGlobDesc}`)}`,
      value: 'pattern-glob',
    },
    {
      name: `${strings.adoPatternRegex} ${chalk.gray(`- ${strings.adoPatternRegexDesc}`)}`,
      value: 'pattern-regex',
    },
    {
      name: `${strings.adoSkipOption} ${chalk.gray(`- ${strings.adoSkipDesc}`)}`,
      value: 'skip',
    },
  ];

  const strategy = await select<MultiRepoCloneStrategy>({
    message: strategyMessage,
    choices: strategyChoices,
    default: 'all',
  });

  switch (strategy) {
    case 'all': {
      console.log(chalk.green(`   ✓ ${strings.adoSelectedAll}`));
      return { strategy: 'all', pattern: '*' };
    }

    case 'pattern-glob': {
      console.log(chalk.gray(`\n   💡 ${strings.adoPatternHint}`));
      console.log(chalk.gray(`   💡 ${strings.adoShortcutsHint}\n`));

      const pattern = await input({
        message: strings.adoPatternPrompt,
        validate: (value: string) => {
          if (!value.trim()) return strings.adoPatternRequired;
          return true;
        },
      });

      // Parse shortcuts (starts:, ends:, contains:)
      const parsedPattern = parsePatternShortcut(pattern.trim());
      const message = strings.adoSelectedPattern.replace('{pattern}', parsedPattern);
      console.log(chalk.green(`   ✓ ${message}`));
      return { strategy: 'pattern-glob', pattern: parsedPattern };
    }

    case 'pattern-regex': {
      console.log(chalk.gray(`\n   💡 ${strings.adoRegexHint}\n`));

      const pattern = await input({
        message: strings.adoRegexPrompt,
        validate: (value: string) => {
          if (!value.trim()) return strings.adoPatternRequired;
          const validation = validateRegex(value.trim());
          if (validation !== true) {
            return `${strings.adoInvalidRegex}: ${validation}`;
          }
          return true;
        },
      });

      const message = strings.adoSelectedRegex.replace('{pattern}', pattern.trim());
      console.log(chalk.green(`   ✓ ${message}`));
      return { strategy: 'pattern-regex', pattern: pattern.trim(), isRegex: true };
    }

    case 'skip': {
      console.log(chalk.gray(`   → ${strings.adoCloneSkip}`));
      // v1.0.21: Show guidance for manual repository placement
      console.log('');
      console.log(chalk.blue(`   ${strings.skipManualReposHeader}`));
      console.log(chalk.gray(`   ${strings.skipManualReposGuidance}`));
      const pathExample = orgName
        ? strings.skipManualReposPath.replace('{organization}', orgName)
        : strings.skipManualReposPath;
      console.log(chalk.cyan(`   ${pathExample}`));
      console.log(chalk.gray(`   ${strings.skipManualReposExample}`));
      console.log('');
      console.log(chalk.gray('   After placing your repos, living docs will auto-detect them.'));
      console.log('');
      return { strategy: 'skip' };
    }
  }
}

/**
 * Prompt user for repository hosting configuration
 *
 * @param options - Setup options
 * @returns Repository configuration
 */
export async function setupRepositoryHosting(options: RepositorySetupOptions): Promise<RepositorySetupResult> {
  const { isCI, gitHubRemote, language = 'en' } = options;
  const strings = getRepoStrings(language);

  console.log('');
  console.log(chalk.cyan.bold(strings.header));
  console.log('');

  let repositoryHosting: RepositoryHosting = 'github-single';
  let isMultiRepo = false;

  if (isCI) {
    // CI mode: auto-detect
    repositoryHosting = gitHubRemote ? 'github-single' : 'local';
    console.log(chalk.gray(`   → ${strings.ciAutoDetected} ${repositoryHosting} hosting\n`));
    return { hosting: repositoryHosting, isMultiRepo: false };
  }

  // Step 1: Ask about repository structure
  const structure = await select({
    message: strings.structureQuestion,
    choices: [
      {
        name: strings.structureSingle,
        value: 'single' as const
      },
      {
        name: strings.structureMultiple,
        value: 'multirepo' as const
      }
    ],
    default: 'single'
  });

  isMultiRepo = structure === 'multirepo';

  // Step 2: Ask about git provider
  const provider = await select({
    message: strings.providerQuestion,
    choices: [
      {
        name: `🐙 ${strings.github}${gitHubRemote ? ` ${strings.githubDetected}` : ''}`,
        value: 'github' as const
      },
      {
        name: `🪣 ${strings.bitbucket}`,
        value: 'bitbucket' as const
      },
      {
        name: `🔷 ${strings.ado}`,
        value: 'ado' as const
      },
      {
        name: `💻 ${strings.local}`,
        value: 'local' as const
      },
      {
        name: `🔧 ${strings.other}`,
        value: 'other' as const
      }
    ],
    default: 'github'  // GitHub is recommended
  });

  // Combine structure + provider
  if (provider === 'local') {
    repositoryHosting = 'local';
  } else {
    repositoryHosting = `${provider}-${structure}` as RepositoryHosting;
  }

  // Step 2b: Ask about git URL format (SSH or HTTPS) for remote providers (v1.0.7+)
  let gitUrlFormat: GitUrlFormat | undefined;
  if (provider !== 'local' && provider !== 'other') {
    const urlFormat = await select<GitUrlFormat>({
      message: strings.gitUrlFormatQuestion,
      choices: [
        {
          name: `🔑 ${strings.gitUrlFormatSsh} ${chalk.gray(`- ${strings.gitUrlFormatSshDesc}`)}`,
          value: 'ssh' as const
        },
        {
          name: `🔗 ${strings.gitUrlFormatHttps} ${chalk.gray(`- ${strings.gitUrlFormatHttpsDesc}`)}`,
          value: 'https' as const
        }
      ],
      default: 'ssh'  // SSH is recommended for development
    });
    gitUrlFormat = urlFormat;
  }

  // Step 3: For multi-repo setups, prompt for pattern selection
  // Now unified for ADO, GitHub, and Bitbucket (v0.32.6+)
  let adoClonePattern: string | undefined;
  let adoClonePatternResult: AdoClonePatternResult | undefined;
  let adoProjectSelection: AdoProjectSelection | undefined;
  let githubRepoSelection: GitHubRepoSelection | undefined;
  let bitbucketRepoSelection: BitbucketRepoSelection | undefined;

  if (isMultiRepo && (provider === 'ado' || provider === 'github' || provider === 'bitbucket')) {
    // Step 3a: Provider-specific credential prompts
    if (provider === 'ado') {
      console.log(chalk.blue('\n📁 Azure DevOps Project Selection\n'));
      console.log(chalk.gray('   Select which project(s) to clone repositories from.\n'));

      const projectSelection = await promptAdoProjectSelection(options.targetDir, strings);
      if (projectSelection) {
        adoProjectSelection = projectSelection;
      }
    } else if (provider === 'github') {
      // GitHub multi-repo credential prompt (v0.32.7+)
      console.log(chalk.blue(`\n${strings.githubMultiRepoHeader}\n`));
      console.log(chalk.gray(`   ${strings.githubMultiRepoDesc}\n`));

      // v1.0.10: Pass gitUrlFormat to show context-aware PAT message
      const githubSelection = await promptGitHubRepoSelection(options.targetDir, gitHubRemote, strings, gitUrlFormat);
      if (githubSelection) {
        githubRepoSelection = githubSelection;
      }
    } else if (provider === 'bitbucket') {
      // Bitbucket multi-repo credential prompt (v0.32.7+)
      console.log(chalk.blue(`\n${strings.bitbucketMultiRepoHeader}\n`));
      console.log(chalk.gray(`   ${strings.bitbucketMultiRepoDesc}\n`));

      const bitbucketSelection = await promptBitbucketRepoSelection(options.targetDir, strings);
      if (bitbucketSelection) {
        bitbucketRepoSelection = bitbucketSelection;
      }
    }

    // Step 3b: Show unified strategy selection (ALL providers)
    // v1.0.21: Pass org name for skip guidance
    const orgName = githubRepoSelection?.org || bitbucketRepoSelection?.workspace || adoProjectSelection?.org;
    const patternResult = await promptMultiRepoPatternSelection(provider, strings, orgName);

    // Map to ADO-style result for backward compatibility
    adoClonePatternResult = {
      strategy: patternResult.strategy,
      pattern: patternResult.pattern,
      isRegex: patternResult.isRegex,
    };

    // Set the clone pattern string
    if (patternResult.strategy === 'all') {
      adoClonePattern = '*';
    } else if (patternResult.strategy === 'pattern-glob') {
      adoClonePattern = patternResult.pattern;
    } else if (patternResult.strategy === 'pattern-regex') {
      adoClonePattern = `regex:${patternResult.pattern}`;
    }
    // For 'skip', adoClonePattern remains undefined
  }

  return {
    hosting: repositoryHosting,
    isMultiRepo,
    gitUrlFormat,
    adoClonePattern,
    adoClonePatternResult,
    adoProjectSelection,
    githubRepoSelection,
    bitbucketRepoSelection
  };
}
