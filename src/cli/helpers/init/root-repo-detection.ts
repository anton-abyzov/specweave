/**
 * Root repo detection and connection prompt for init flow
 *
 * Auto-detects the workspace root's GitHub repository from:
 * 1. Git remote URL (via detectProvider)
 * 2. package.json repository field
 * 3. package.json @scope/name
 *
 * Part of 0640-init-ux-nonempty-workspace
 */

import chalk from 'chalk';
import { confirm, input } from '@inquirer/prompts';
import { detectProvider } from './provider-detection.js';
import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

// Reuse repo-connect regex for parsing package.json URLs
const HTTPS_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?$/;
const SSH_RE = /^git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/;

export interface RootRepoInfo {
  owner: string;
  repo: string;
  source: 'git-remote' | 'package-json' | 'user-input';
}

/**
 * Auto-detect root repo from git remote or package.json.
 *
 * Cascade:
 * 1. detectProvider() → GitHub owner/repo
 * 2. package.json → repository string or object URL
 * 3. package.json → @scope/name
 * 4. null
 */
export function detectRootRepo(targetDir: string): RootRepoInfo | null {
  // 1. Git remote via detectProvider
  const provider = detectProvider(targetDir);
  if (provider?.provider === 'github' && provider.owner && provider.repo) {
    return { owner: provider.owner, repo: provider.repo, source: 'git-remote' };
  }

  // 2-3. package.json fallbacks
  const pkgPath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);

    // 2a. repository as string
    if (typeof pkg.repository === 'string') {
      const parsed = parseGitHubUrl(pkg.repository);
      if (parsed) return { ...parsed, source: 'package-json' };
    }

    // 2b. repository as object with url
    if (pkg.repository?.url && typeof pkg.repository.url === 'string') {
      const parsed = parseGitHubUrl(pkg.repository.url);
      if (parsed) return { ...parsed, source: 'package-json' };
    }

    // 3. @scope/name
    if (typeof pkg.name === 'string') {
      const scopeMatch = pkg.name.match(/^@([^/]+)\/(.+)$/);
      if (scopeMatch) {
        return { owner: scopeMatch[1], repo: scopeMatch[2], source: 'package-json' };
      }
    }
  } catch {
    // Malformed package.json — skip
  }

  return null;
}

/**
 * Parse a GitHub URL (HTTPS or SSH) into owner/repo.
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  let match = url.match(HTTPS_RE);
  if (match) return { owner: match[1], repo: match[2] };

  match = url.match(SSH_RE);
  if (match) return { owner: match[1], repo: match[2] };

  return null;
}

// ---------------------------------------------------------------------------
// Localized strings
// ---------------------------------------------------------------------------

function getStrings(language: SupportedLanguage) {
  const strings: Record<string, {
    connectQuestion: string;
    explanation: string;
    detected: string;
    useDetected: string;
    connectManually: string;
    ownerPrompt: string;
    repoPrompt: string;
  }> = {
    en: {
      connectQuestion: 'Connect this workspace root to a GitHub repo?',
      explanation: 'This umbrella folder itself can be tracked as a GitHub repository for workspace-level config and specs.',
      detected: 'Detected',
      useDetected: 'Use this as workspace root repo?',
      connectManually: 'Connect to a different GitHub repo?',
      ownerPrompt: 'GitHub owner (org or user):',
      repoPrompt: 'Repository name:',
    },
    ru: {
      connectQuestion: 'Подключить корень рабочего пространства к GitHub?',
      explanation: 'Эта зонтичная папка может отслеживаться как GitHub-репозиторий для конфигурации и спецификаций.',
      detected: 'Обнаружен',
      useDetected: 'Использовать как корневой репозиторий?',
      connectManually: 'Подключить к другому GitHub-репозиторию?',
      ownerPrompt: 'Владелец GitHub (организация или пользователь):',
      repoPrompt: 'Имя репозитория:',
    },
    es: {
      connectQuestion: 'Conectar la raiz del workspace a un repo de GitHub?',
      explanation: 'Esta carpeta puede rastrearse como un repositorio de GitHub para configuracion y especificaciones.',
      detected: 'Detectado',
      useDetected: 'Usar como repo raiz del workspace?',
      connectManually: 'Conectar a otro repo de GitHub?',
      ownerPrompt: 'Propietario de GitHub (org o usuario):',
      repoPrompt: 'Nombre del repositorio:',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Interactive prompt to connect workspace root to a GitHub repo.
 *
 * - CI mode: auto-detect only, no prompts
 * - Interactive: auto-detect → confirm → manual fallback
 */
export async function promptRootRepoConnection(
  targetDir: string,
  language: SupportedLanguage,
  isCI: boolean,
): Promise<RootRepoInfo | null> {
  const detected = detectRootRepo(targetDir);

  // CI/quick mode: return auto-detect silently
  if (isCI) {
    return detected;
  }

  const s = getStrings(language);

  // Auto-detected: confirm with user
  if (detected) {
    console.log(chalk.cyan(`   ${s.detected}: ${detected.owner}/${detected.repo}`));

    const useIt = await confirm({
      message: s.useDetected,
      default: true,
    });

    if (useIt) {
      return detected;
    }

    // User declined auto-detect — offer manual input
    const connectManually = await confirm({
      message: s.connectManually,
      default: false,
    });

    if (!connectManually) {
      return null;
    }

    return promptManualInput(s);
  }

  // Nothing auto-detected: ask if they want to connect
  console.log(chalk.gray(`   ${s.explanation}`));

  const wantsConnection = await confirm({
    message: s.connectQuestion,
    default: false,
  });

  if (!wantsConnection) {
    return null;
  }

  return promptManualInput(s);
}

async function promptManualInput(s: ReturnType<typeof getStrings>): Promise<RootRepoInfo> {
  const owner = await input({ message: s.ownerPrompt });
  const repo = await input({ message: s.repoPrompt });

  return { owner, repo, source: 'user-input' };
}
