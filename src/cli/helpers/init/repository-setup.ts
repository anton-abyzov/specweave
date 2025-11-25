/**
 * Repository hosting setup
 * Handles git provider detection and configuration
 */

import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import type { RepositoryHosting, GitHubRemote } from './types.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

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
    },
  };
  return strings[language] || strings.en;
}

/**
 * Result of repository setup
 */
export interface RepositorySetupResult {
  hosting: RepositoryHosting;
  isMultiRepo: boolean;
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
        name: `🐙 ${strings.github} ${gitHubRemote ? strings.githubDetected : strings.githubRecommended}`,
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
    default: gitHubRemote ? 'github' : 'local'
  });

  // Combine structure + provider
  if (provider === 'local') {
    repositoryHosting = 'local';
  } else {
    repositoryHosting = `${provider}-${structure}` as RepositoryHosting;
  }

  return { hosting: repositoryHosting, isMultiRepo };
}
