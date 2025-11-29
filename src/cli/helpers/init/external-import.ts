/**
 * External tool import functionality
 * Imports work items from GitHub, JIRA, Azure DevOps
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { select, confirm, checkbox } from '@inquirer/prompts';
import { Octokit } from '@octokit/rest';
import { ImportCoordinator, CoordinatorConfig, CoordinatorResult, ProgressInfo } from '../../../importers/import-coordinator.js';
import { ItemConverter, ConvertedUserStory } from '../../../importers/item-converter.js';
import type { ExternalItem } from '../../../importers/external-importer.js';
import type { ExternalContainerContext } from '../../../core/types/increment-metadata.js';
import { loadImportConfig } from '../../../config/import-config.js';
import { selectRepositories, type RepoSelectionConfig } from '../github-repo-selector.js';
import { detectAllConfigs } from './config-detection.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getGitHubAuthFromProject } from '../../../utils/auth-helpers.js';
import {
  detectJiraStructure,
  confirmJiraMapping,
  detectAdoStructure,
  confirmAdoMapping,
  buildJiraCoordinatorConfig,
  buildAdoCoordinatorConfig,
  type JiraMappingResult,
  type AdoMappingResult,
} from './jira-ado-auto-detect.js';
import { getJobManager } from '../../../core/background/index.js';
import type { ImportJobConfig } from '../../../core/background/types.js';

/**
 * Get translated strings for external import
 */
function getExternalImportStrings(language: SupportedLanguage): {
  toolDetectionHeader: string;
  found: string;
  ciSkipping: string;
  skipImport: string;
  useExistingProfiles: string;
  failedReadProfiles: string;
  importQuestion: string;
  importItems: string;
  skipForNow: string;
  importComplete: string;
  someImportsFailed: string;
  largeDataset: string;
  largeDatasetHint: string;
  livingDocsCreated: string;
  organizedIntoRepos: string;
  organizedIntoFeatures: string;
  autoArchived: string;
  location: string;
  nextStepsHeader: string;
  nextStepReview: string;
  nextStepCreate: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getExternalImportStrings>> = {
    en: {
      toolDetectionHeader: '🔍 External Tool Detection',
      found: 'Found:',
      ciSkipping: 'CI mode: Skipping import (can run manually later)',
      skipImport: '✓ Skipping import',
      useExistingProfiles: 'Using existing sync profiles:',
      failedReadProfiles: '⚠️  Failed to read sync profiles:',
      importQuestion: 'Import existing work items to living docs?',
      importItems: '✨ Yes, import items',
      skipForNow: '⏭️  Skip for now',
      importComplete: 'Import complete!',
      someImportsFailed: '⚠️  Some imports failed:',
      largeDataset: '⚠️  Imported items (large dataset)',
      largeDatasetHint: '→ Consider using time range filters for faster imports',
      livingDocsCreated: '→ Living docs created with E suffix (US-001E, US-002E, ...)',
      organizedIntoRepos: '→ Organized into project folders',
      organizedIntoFeatures: '→ Organized into feature folder(s)',
      autoArchived: '→ Auto-archived items older than 30 days',
      location: '→ Location: .specweave/docs/internal/specs/',
      nextStepsHeader: '💡 Next steps:',
      nextStepReview: '→ Review imported User Stories in living docs',
      nextStepCreate: '→ Create increments manually when ready: /specweave:increment "feature"',
    },
    ru: {
      toolDetectionHeader: '🔍 Обнаружение внешних инструментов',
      found: 'Найдено:',
      ciSkipping: 'CI режим: Пропуск импорта (можно запустить позже)',
      skipImport: '✓ Пропуск импорта',
      useExistingProfiles: 'Использование существующих профилей синхронизации:',
      failedReadProfiles: '⚠️  Не удалось прочитать профили синхронизации:',
      importQuestion: 'Импортировать существующие рабочие элементы в living docs?',
      importItems: '✨ Да, импортировать',
      skipForNow: '⏭️  Пропустить',
      importComplete: 'Импорт завершён!',
      someImportsFailed: '⚠️  Некоторые импорты не удались:',
      largeDataset: '⚠️  Импортировано элементов (большой набор данных)',
      largeDatasetHint: '→ Рекомендуем использовать фильтры по времени для быстрого импорта',
      livingDocsCreated: '→ Living docs созданы с суффиксом E (US-001E, US-002E, ...)',
      organizedIntoRepos: '→ Организовано в папки проектов',
      organizedIntoFeatures: '→ Организовано в папки фич',
      autoArchived: '→ Автоархивированы элементы старше 30 дней',
      location: '→ Расположение: .specweave/docs/internal/specs/',
      nextStepsHeader: '💡 Следующие шаги:',
      nextStepReview: '→ Просмотрите импортированные User Stories в living docs',
      nextStepCreate: '→ Создайте инкременты когда будете готовы: /specweave:increment "feature"',
    },
    es: {
      toolDetectionHeader: '🔍 Detección de herramientas externas',
      found: 'Encontrado:',
      ciSkipping: 'Modo CI: Omitiendo importación (puede ejecutarse manualmente después)',
      skipImport: '✓ Omitiendo importación',
      useExistingProfiles: 'Usando perfiles de sincronización existentes:',
      failedReadProfiles: '⚠️  Error al leer perfiles de sincronización:',
      importQuestion: '¿Importar elementos de trabajo existentes a living docs?',
      importItems: '✨ Sí, importar elementos',
      skipForNow: '⏭️  Omitir por ahora',
      importComplete: '¡Importación completada!',
      someImportsFailed: '⚠️  Algunas importaciones fallaron:',
      largeDataset: '⚠️  Elementos importados (conjunto de datos grande)',
      largeDatasetHint: '→ Considere usar filtros de rango de tiempo para importaciones más rápidas',
      livingDocsCreated: '→ Living docs creados con sufijo E (US-001E, US-002E, ...)',
      organizedIntoRepos: '→ Organizado en carpetas de proyectos',
      organizedIntoFeatures: '→ Organizado en carpeta(s) de características',
      autoArchived: '→ Auto-archivados elementos mayores a 30 días',
      location: '→ Ubicación: .specweave/docs/internal/specs/',
      nextStepsHeader: '💡 Próximos pasos:',
      nextStepReview: '→ Revise las User Stories importadas en living docs',
      nextStepCreate: '→ Cree incrementos cuando esté listo: /specweave:increment "feature"',
    },
    zh: {
      toolDetectionHeader: '🔍 外部工具检测',
      found: '已找到：',
      ciSkipping: 'CI 模式：跳过导入（可稍后手动运行）',
      skipImport: '✓ 跳过导入',
      useExistingProfiles: '使用现有同步配置：',
      failedReadProfiles: '⚠️  读取同步配置失败：',
      importQuestion: '将现有工作项导入到 living docs？',
      importItems: '✨ 是的，导入项目',
      skipForNow: '⏭️  暂时跳过',
      importComplete: '导入完成！',
      someImportsFailed: '⚠️  部分导入失败：',
      largeDataset: '⚠️  已导入项目（大数据集）',
      largeDatasetHint: '→ 建议使用时间范围过滤器加快导入',
      livingDocsCreated: '→ Living docs 已创建，带 E 后缀 (US-001E, US-002E, ...)',
      organizedIntoRepos: '→ 已整理到项目文件夹',
      organizedIntoFeatures: '→ 已整理到功能文件夹',
      autoArchived: '→ 已自动归档超过30天的项目',
      location: '→ 位置：.specweave/docs/internal/specs/',
      nextStepsHeader: '💡 下一步：',
      nextStepReview: '→ 在 living docs 中查看导入的用户故事',
      nextStepCreate: '→ 准备好后创建增量：/specweave:increment "feature"',
    },
    de: {
      toolDetectionHeader: '🔍 Externe Tool-Erkennung',
      found: 'Gefunden:',
      ciSkipping: 'CI-Modus: Import überspringen (kann später manuell ausgeführt werden)',
      skipImport: '✓ Import überspringen',
      useExistingProfiles: 'Verwende bestehende Sync-Profile:',
      failedReadProfiles: '⚠️  Fehler beim Lesen der Sync-Profile:',
      importQuestion: 'Bestehende Arbeitselemente in Living Docs importieren?',
      importItems: '✨ Ja, Elemente importieren',
      skipForNow: '⏭️  Vorerst überspringen',
      importComplete: 'Import abgeschlossen!',
      someImportsFailed: '⚠️  Einige Importe fehlgeschlagen:',
      largeDataset: '⚠️  Importierte Elemente (großer Datensatz)',
      largeDatasetHint: '→ Zeitbereichsfilter für schnellere Importe empfohlen',
      livingDocsCreated: '→ Living Docs mit E-Suffix erstellt (US-001E, US-002E, ...)',
      organizedIntoRepos: '→ In Projektordner organisiert',
      organizedIntoFeatures: '→ In Feature-Ordner organisiert',
      autoArchived: '→ Elemente älter als 30 Tage automatisch archiviert',
      location: '→ Speicherort: .specweave/docs/internal/specs/',
      nextStepsHeader: '💡 Nächste Schritte:',
      nextStepReview: '→ Importierte User Stories in Living Docs überprüfen',
      nextStepCreate: '→ Bei Bedarf Inkremente erstellen: /specweave:increment "feature"',
    },
    fr: {
      toolDetectionHeader: '🔍 Détection des outils externes',
      found: 'Trouvé :',
      ciSkipping: 'Mode CI : Import ignoré (peut être exécuté manuellement plus tard)',
      skipImport: '✓ Import ignoré',
      useExistingProfiles: 'Utilisation des profils de synchronisation existants :',
      failedReadProfiles: '⚠️  Échec de lecture des profils de synchronisation :',
      importQuestion: 'Importer les éléments de travail existants vers living docs ?',
      importItems: '✨ Oui, importer les éléments',
      skipForNow: '⏭️  Passer pour l\'instant',
      importComplete: 'Import terminé !',
      someImportsFailed: '⚠️  Certains imports ont échoué :',
      largeDataset: '⚠️  Éléments importés (grand ensemble de données)',
      largeDatasetHint: '→ Envisagez d\'utiliser des filtres de plage de temps pour des imports plus rapides',
      livingDocsCreated: '→ Living docs créés avec suffixe E (US-001E, US-002E, ...)',
      organizedIntoRepos: '→ Organisé en dossiers de projets',
      organizedIntoFeatures: '→ Organisé en dossier(s) de fonctionnalités',
      autoArchived: '→ Éléments de plus de 30 jours auto-archivés',
      location: '→ Emplacement : .specweave/docs/internal/specs/',
      nextStepsHeader: '💡 Prochaines étapes :',
      nextStepReview: '→ Examiner les User Stories importées dans living docs',
      nextStepCreate: '→ Créer des incréments si prêt : /specweave:increment "feature"',
    },
    ja: {
      toolDetectionHeader: '🔍 外部ツール検出',
      found: '検出：',
      ciSkipping: 'CIモード：インポートをスキップ（後で手動実行可能）',
      skipImport: '✓ インポートをスキップ',
      useExistingProfiles: '既存の同期プロファイルを使用：',
      failedReadProfiles: '⚠️  同期プロファイルの読み取りに失敗：',
      importQuestion: '既存の作業項目をliving docsにインポートしますか？',
      importItems: '✨ はい、インポート',
      skipForNow: '⏭️  今はスキップ',
      importComplete: 'インポート完了！',
      someImportsFailed: '⚠️  一部のインポートが失敗：',
      largeDataset: '⚠️  インポートされた項目（大規模データセット）',
      largeDatasetHint: '→ より高速なインポートには時間範囲フィルターの使用を推奨',
      livingDocsCreated: '→ Living docsがEサフィックスで作成されました (US-001E, US-002E, ...)',
      organizedIntoRepos: '→ プロジェクトフォルダに整理',
      organizedIntoFeatures: '→ 機能フォルダに整理',
      autoArchived: '→ 30日以上前の項目を自動アーカイブ',
      location: '→ 場所：.specweave/docs/internal/specs/',
      nextStepsHeader: '💡 次のステップ：',
      nextStepReview: '→ living docsでインポートされたユーザーストーリーを確認',
      nextStepCreate: '→ 準備ができたらインクリメントを作成：/specweave:increment "feature"',
    },
    ko: {
      toolDetectionHeader: '🔍 외부 도구 감지',
      found: '발견:',
      ciSkipping: 'CI 모드: 가져오기 건너뜀 (나중에 수동으로 실행 가능)',
      skipImport: '✓ 가져오기 건너뜀',
      useExistingProfiles: '기존 동기화 프로필 사용:',
      failedReadProfiles: '⚠️  동기화 프로필 읽기 실패:',
      importQuestion: '기존 작업 항목을 living docs로 가져올까요?',
      importItems: '✨ 예, 항목 가져오기',
      skipForNow: '⏭️  지금은 건너뛰기',
      importComplete: '가져오기 완료!',
      someImportsFailed: '⚠️  일부 가져오기 실패:',
      largeDataset: '⚠️  가져온 항목 (대용량 데이터셋)',
      largeDatasetHint: '→ 더 빠른 가져오기를 위해 시간 범위 필터 사용 권장',
      livingDocsCreated: '→ Living docs가 E 접미사로 생성됨 (US-001E, US-002E, ...)',
      organizedIntoRepos: '→ 프로젝트 폴더로 정리됨',
      organizedIntoFeatures: '→ 기능 폴더로 정리됨',
      autoArchived: '→ 30일 이상 된 항목 자동 보관',
      location: '→ 위치: .specweave/docs/internal/specs/',
      nextStepsHeader: '💡 다음 단계:',
      nextStepReview: '→ living docs에서 가져온 사용자 스토리 검토',
      nextStepCreate: '→ 준비되면 증분 생성: /specweave:increment "feature"',
    },
    pt: {
      toolDetectionHeader: '🔍 Detecção de ferramentas externas',
      found: 'Encontrado:',
      ciSkipping: 'Modo CI: Pulando importação (pode ser executado manualmente depois)',
      skipImport: '✓ Pulando importação',
      useExistingProfiles: 'Usando perfis de sincronização existentes:',
      failedReadProfiles: '⚠️  Falha ao ler perfis de sincronização:',
      importQuestion: 'Importar itens de trabalho existentes para living docs?',
      importItems: '✨ Sim, importar itens',
      skipForNow: '⏭️  Pular por enquanto',
      importComplete: 'Importação concluída!',
      someImportsFailed: '⚠️  Algumas importações falharam:',
      largeDataset: '⚠️  Itens importados (grande conjunto de dados)',
      largeDatasetHint: '→ Considere usar filtros de intervalo de tempo para importações mais rápidas',
      livingDocsCreated: '→ Living docs criados com sufixo E (US-001E, US-002E, ...)',
      organizedIntoRepos: '→ Organizado em pastas de projetos',
      organizedIntoFeatures: '→ Organizado em pasta(s) de recursos',
      autoArchived: '→ Itens com mais de 30 dias auto-arquivados',
      location: '→ Local: .specweave/docs/internal/specs/',
      nextStepsHeader: '💡 Próximos passos:',
      nextStepReview: '→ Revise as User Stories importadas em living docs',
      nextStepCreate: '→ Crie incrementos quando estiver pronto: /specweave:increment "feature"',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Prompt user and run external tool import
 * Detects GitHub/JIRA/ADO configuration and imports work items
 *
 * @param targetDir - Project directory
 * @param isCI - Whether running in CI mode
 * @param language - Language for translations
 * @returns Import result
 */
export async function promptAndRunExternalImport(
  targetDir: string,
  isCI: boolean,
  language: SupportedLanguage = 'en'
): Promise<CoordinatorResult> {
  const strings = getExternalImportStrings(language);

  // Load import configuration
  const importConfig = loadImportConfig(targetDir);

  // Check if import is disabled via config
  if (!importConfig.enabled) {
    return emptyResult();
  }

  // Detect available external tools
  let { github, jira, ado, availableTools } = detectAllConfigs(targetDir);

  // CRITICAL FIX: Also check for existing sync profiles (from umbrella repo setup)
  // In multi-repo mode, sync profiles are written BEFORE this function is called,
  // but detectAllConfigs may not find GitHub remote in .git/config yet
  const existingSyncProfiles = getExistingSyncProfiles(targetDir);
  let hasGitHubProfiles = false;

  if (existingSyncProfiles && existingSyncProfiles.length > 0) {
    hasGitHubProfiles = true;
    // Add GitHub to available tools if not already detected
    if (!availableTools.includes('GitHub')) {
      availableTools = [...availableTools, 'GitHub'];
    }
  }

  // Also check for JIRA/ADO sync profiles in config.json
  const syncProfileProviders = getSyncProfileProviders(targetDir);
  for (const provider of syncProfileProviders) {
    if (provider === 'jira' && !availableTools.includes('JIRA')) {
      availableTools = [...availableTools, 'JIRA'];
    }
    if (provider === 'ado' && !availableTools.includes('Azure DevOps')) {
      availableTools = [...availableTools, 'Azure DevOps'];
    }
  }

  // If no tools detected, skip import
  if (availableTools.length === 0) {
    return emptyResult();
  }

  console.log(chalk.blue('\n' + strings.toolDetectionHeader));
  console.log(chalk.gray(`   ${strings.found} ${availableTools.join(', ')}`));
  console.log('');

  // In CI mode, skip import without prompting
  if (isCI) {
    console.log(chalk.gray('   → ' + strings.ciSkipping + '\n'));
    return emptyResult();
  }

  // Prompt user to import
  const shouldImport = await confirm({
    message: `${strings.importQuestion} (${availableTools.join(', ')})`,
    default: false
  });

  if (!shouldImport) {
    console.log(chalk.gray('   ' + strings.skipImport + '\n'));
    return emptyResult();
  }

  // Handle multi-repo selection for GitHub
  let repoSelectionConfig: RepoSelectionConfig | null = null;

  // CRITICAL FIX (2025-11-26): Use getGitHubAuthFromProject to load from .env file
  // Bug: getGitHubAuth() uses process.env which is empty unless dotenv is loaded
  const githubAuth = getGitHubAuthFromProject(targetDir);
  const hasGitHubToken = githubAuth.source !== 'none';

  // CRITICAL FIX: Use profiles OR git remote detection for GitHub
  // In umbrella mode, hasGitHubProfiles is true even when github is null
  if ((github || hasGitHubProfiles) && hasGitHubToken) {
    // Use existing sync profiles (already fetched earlier for tool detection)
    if (existingSyncProfiles && existingSyncProfiles.length > 0) {
      console.log(chalk.gray(`   Using existing sync profiles: ${existingSyncProfiles.length} repositories`));
      repoSelectionConfig = {
        repositories: existingSyncProfiles,
        selectionStrategy: 'explicit'
      };
    } else {
      // No existing profiles - prompt for multi-repo selection
      repoSelectionConfig = await promptMultiRepoSelection(targetDir);
    }
  }

  // Map config timeRangeMonths to closest prompt option
  let defaultTimeRange = 3;
  if (importConfig.timeRangeMonths === 1) defaultTimeRange = 1;
  else if (importConfig.timeRangeMonths <= 3) defaultTimeRange = 3;
  else if (importConfig.timeRangeMonths <= 6) defaultTimeRange = 6;
  else defaultTimeRange = 999;

  // Prompt for time range
  // NOTE: GitHub API 'since' filter uses 'updated_at' (not 'created_at')
  // Issues not updated within the range won't be imported even if recently created
  console.log(chalk.gray('   ℹ️  Note: GitHub filters by "updated at" date, not "created at"'));
  const timeRange = await select({
    message: 'How far back should we import?',
    choices: [
      { name: '1 month (recently updated items)', value: 1 },
      { name: '3 months (recommended)', value: 3 },
      { name: '6 months (comprehensive)', value: 6 },
      { name: 'All time (imports everything, may be slow)', value: 999 }
    ],
    default: defaultTimeRange
  });

  // CRITICAL FIX (2025-11-26): Prompt for including closed issues
  // Bug: includeClosed was hardcoded to false, missing closed issues during import
  const includeClosed = await confirm({
    message: 'Include closed/resolved issues?',
    default: true  // Default to YES to ensure complete import
  });

  // Build coordinator configuration
  const coordinatorConfig: CoordinatorConfig = {
    importConfig: {
      timeRangeMonths: timeRange,
      includeClosed: includeClosed,
      pageSize: importConfig.pageSize
    },
    parallel: true,
    projectRoot: targetDir
  };

  // Add GitHub config - prefer multi-repo if selected
  // CRITICAL FIX: Check (github || hasGitHubProfiles) to match line 359 condition
  // In umbrella mode, github=null but profiles exist - we still need to import!
  if ((github || (hasGitHubProfiles && repoSelectionConfig)) && hasGitHubToken) {
    if (repoSelectionConfig && repoSelectionConfig.repositories.length > 0) {
      // Multi-repo mode: import from all selected repositories
      coordinatorConfig.githubRepositories = repoSelectionConfig.repositories.map(fullRepo => {
        const [owner, repo] = fullRepo.split('/');
        return { owner, repo };
      });
      coordinatorConfig.githubToken = githubAuth.token;
    } else if (github) {
      // Single repo mode (backwards compatible) - only if github detected
      coordinatorConfig.github = {
        owner: github.owner,
        repo: github.repo,
        token: githubAuth.token
      };
    }
  }

  // Add JIRA config with auto-detection
  if (jira) {
    // Auto-detect JIRA structure (projects + boards)
    const jiraStructure = await detectJiraStructure();
    if (jiraStructure) {
      const jiraMapping = await confirmJiraMapping(jiraStructure);
      if (jiraMapping) {
        const jiraConfig = buildJiraCoordinatorConfig(jira, jiraMapping);
        coordinatorConfig.jira = jiraConfig;
      } else {
        // User declined - use simple mode
        coordinatorConfig.jira = {
          host: jira.host,
          email: jira.email,
          apiToken: jira.apiToken,
          mode: 'simple' as const,
          projectMappings: [],
        };
      }
    } else {
      // Auto-detect failed - use simple mode
      coordinatorConfig.jira = {
        host: jira.host,
        email: jira.email,
        apiToken: jira.apiToken,
        mode: 'simple' as const,
        projectMappings: [],
      };
    }
  }

  // Add ADO config with auto-detection
  if (ado) {
    // Extract organization from URL
    const orgMatch = ado.orgUrl.match(/dev\.azure\.com\/([^/]+)/);
    const organization = orgMatch ? orgMatch[1] : '';

    if (organization && ado.pat) {
      // Auto-detect ADO structure (projects + area paths)
      const adoStructure = await detectAdoStructure(organization, ado.pat);
      if (adoStructure) {
        const adoMapping = await confirmAdoMapping(adoStructure);
        if (adoMapping) {
          const adoConfig = buildAdoCoordinatorConfig(ado, adoMapping);
          coordinatorConfig.ado = adoConfig;
        } else {
          // User declined - use simple mode
          coordinatorConfig.ado = {
            orgUrl: ado.orgUrl,
            project: ado.project,
            pat: ado.pat,
            mode: 'simple' as const,
            projectMappings: [],
          };
        }
      } else {
        // Auto-detect failed - use simple mode
        coordinatorConfig.ado = {
          orgUrl: ado.orgUrl,
          project: ado.project,
          pat: ado.pat,
          mode: 'simple' as const,
          projectMappings: [],
        };
      }
    } else {
      // No org/PAT - use simple mode
      coordinatorConfig.ado = {
        orgUrl: ado.orgUrl,
        project: ado.project,
        pat: ado.pat,
        mode: 'simple' as const,
        projectMappings: [],
      };
    }
  }

  // Run import with progress tracking
  return await runImport(targetDir, coordinatorConfig);
}

/**
 * Get existing sync profiles from config.json
 * Returns array of "owner/repo" strings if profiles exist
 *
 * CRITICAL FIX (2025-11-26): Also includes parent repo from umbrella config
 * Bug: Parent repo was NOT being imported in umbrella mode - only child repos were processed
 */
function getExistingSyncProfiles(targetDir: string): string[] | null {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const repos: string[] = [];

    // Check for sync.profiles structure (umbrella repo setup - child repos)
    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      const profiles = config.sync.profiles;

      for (const [profileId, profile] of Object.entries(profiles)) {
        const p = profile as { config?: { owner?: string; repo?: string } };
        if (p.config?.owner && p.config?.repo) {
          repos.push(`${p.config.owner}/${p.config.repo}`);
        }
      }
    }

    // CRITICAL FIX: Also include parent repo from umbrella config
    // Parent repo may have issues/items that need to be imported too!
    if (config.umbrella?.enabled && config.umbrella?.parentRepo) {
      // parentRepo can be "owner/repo" or just "repo" (same owner as git remote)
      let parentRepoFullName = config.umbrella.parentRepo;

      // If parentRepo is just the repo name, try to get owner from git remote or first child repo
      if (!parentRepoFullName.includes('/')) {
        // Try to find owner from sync profiles (same owner as child repos)
        const firstProfile = Object.values(config.sync?.profiles || {})[0] as { config?: { owner?: string } } | undefined;
        const owner = firstProfile?.config?.owner;
        if (owner) {
          parentRepoFullName = `${owner}/${parentRepoFullName}`;
        }
      }

      // Add parent repo if not already in the list
      if (parentRepoFullName.includes('/') && !repos.includes(parentRepoFullName)) {
        repos.push(parentRepoFullName);
      }
    }

    return repos.length > 0 ? repos : null;
  } catch (error) {
    // Log warning for debugging - config parsing errors shouldn't be silent
    console.warn(chalk.yellow(`   ⚠️  Failed to read sync profiles: ${error instanceof Error ? error.message : String(error)}`));
    return null;
  }
}

/**
 * Check if umbrella mode is enabled from config.json
 * Returns true if sync.profiles exist OR umbrella.enabled is true
 *
 * CRITICAL: Used to force global collision detection even for single-group batches
 */
function isUmbrellaModeFromConfig(targetDir: string): boolean {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return false;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Check 1: umbrella.enabled is explicitly true
    if (config.umbrella?.enabled === true) {
      return true;
    }

    // Check 2: sync.profiles has multiple entries (umbrella repo setup)
    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      const profileCount = Object.keys(config.sync.profiles).length;
      if (profileCount >= 2) {
        return true;
      }
    }

    // Check 3: multiProject.enabled is true
    if (config.multiProject?.enabled === true) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get sync profile providers from config.json
 * Returns array of provider names ('github', 'jira', 'ado') from sync profiles
 */
function getSyncProfileProviders(targetDir: string): string[] {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return [];
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const providers = new Set<string>();

    // Check sync.profiles structure
    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      for (const profile of Object.values(config.sync.profiles)) {
        const p = profile as { provider?: string };
        if (p.provider) {
          providers.add(p.provider.toLowerCase());
        }
      }
    }

    // Also check top-level sync.provider
    if (config.sync?.provider) {
      providers.add(config.sync.provider.toLowerCase());
    }

    return Array.from(providers);
  } catch {
    return [];
  }
}

/**
 * Prompt for multi-repository selection
 */
async function promptMultiRepoSelection(targetDir: string): Promise<RepoSelectionConfig | null> {
  try {
    const useMultiRepo = await confirm({
      message: 'Do you want to import from multiple repositories?',
      default: false
    });

    if (!useMultiRepo) {
      return null;
    }

    // CRITICAL FIX (2025-11-26): Use getGitHubAuthFromProject to load from .env file
    // Bug: getGitHubAuth() uses process.env which is empty unless dotenv is loaded
    const auth = getGitHubAuthFromProject(targetDir);
    if (auth.source === 'none') {
      console.log(chalk.yellow('   ⚠️  No GitHub token found. Skipping multi-repo selection.'));
      return null;
    }

    const octokit = new Octokit({ auth: auth.token });
    const repoSelectionConfig = await selectRepositories(octokit, auth.token);

    if (repoSelectionConfig) {
      // Save to config
      try {
        const configPath = path.join(targetDir, '.specweave', 'config.json');
        let config: Record<string, unknown> = {};
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }

        if (!config.github) {
          config.github = {};
        }

        const githubConfig = config.github as Record<string, unknown>;
        githubConfig.repositories = repoSelectionConfig.repositories;
        githubConfig.selectionStrategy = repoSelectionConfig.selectionStrategy;
        if (repoSelectionConfig.pattern) {
          githubConfig.pattern = repoSelectionConfig.pattern;
        }
        if (repoSelectionConfig.organizationName) {
          githubConfig.organizationName = repoSelectionConfig.organizationName;
        }

        fs.ensureDirSync(path.dirname(configPath));
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      } catch {
        // Silent - config save is not critical
      }
    }

    return repoSelectionConfig;
  } catch {
    return null;
  }
}

/**
 * Run the import with progress tracking
 */
async function runImport(
  targetDir: string,
  coordinatorConfig: CoordinatorConfig
): Promise<CoordinatorResult> {
  const spinner = ora('Importing items...').start();
  let lastRepo = '';

  // Create background job for tracking
  let jobManager: ReturnType<typeof getJobManager> | null = null;
  let jobId: string | null = null;

  try {
    jobManager = getJobManager(targetDir);
    const provider = coordinatorConfig.github ? 'github' :
                     coordinatorConfig.jira ? 'jira' :
                     coordinatorConfig.ado ? 'ado' : 'github';
    const jobConfig: ImportJobConfig = {
      type: 'import-issues',
      provider,
      repositories: coordinatorConfig.githubRepositories?.map(r => `${r.owner}/${r.repo}`),
      timeRangeMonths: coordinatorConfig.importConfig?.timeRangeMonths || 3,
      projectPath: targetDir
    };
    // Estimate total - will be updated when we know actual count
    const job = jobManager.createJob('import-issues', jobConfig, 100);
    jobId = job.id;
    jobManager.startJob(jobId);
  } catch {
    // Job tracking is optional
  }

  // Enhanced progress callback with percentage and ETA
  coordinatorConfig.onProgressEnhanced = (info: ProgressInfo) => {
    const parts: string[] = [];

    // Show repo name for multi-repo imports
    if (info.sourceRepo && info.sourceRepo !== lastRepo) {
      lastRepo = info.sourceRepo;
    }

    const repoLabel = info.sourceRepo ? ` (${info.sourceRepo})` : '';

    // Add page number if available (shows pagination progress)
    if (info.page !== undefined && info.page > 0) {
      parts.push(`page ${info.page}`);
    }

    // Build progress string
    if (info.total && info.percentage !== undefined) {
      parts.push(`[${info.current}/${info.total}] ${info.percentage}%`);
    } else {
      parts.push(`${info.current} items`);
    }

    // Add rate if available
    if (info.rate !== undefined && info.rate > 0) {
      parts.push(`${info.rate}/s`);
    }

    // Add ETA if available
    if (info.eta !== undefined && info.eta > 0) {
      const minutes = Math.floor(info.eta / 60);
      const seconds = info.eta % 60;
      if (minutes > 0) {
        parts.push(`ETA: ${minutes}m ${seconds}s`);
      } else {
        parts.push(`ETA: ${seconds}s`);
      }
    }

    spinner.text = `Importing from ${info.platform}${repoLabel}... ${parts.join(' | ')}`;

    // Update background job progress
    if (jobManager && jobId && info.current !== undefined) {
      const itemId = info.sourceRepo || info.platform;
      jobManager.updateProgress(jobId, info.current, itemId);
    }
  };

  // Legacy progress callback (fallback)
  coordinatorConfig.onProgress = (platform: string, count: number, total?: number) => {
    if (!coordinatorConfig.onProgressEnhanced) {
      const totalStr = total ? `/${total}` : '';
      spinner.text = `Importing from ${platform}... (${count}${totalStr} items)`;
    }
  };

  // Rate limit callbacks - pause job when rate limited
  coordinatorConfig.onRateLimitWarning = (platform: string, rateLimitInfo) => {
    spinner.text = `⚠️  ${platform} rate limit warning: ${rateLimitInfo.remaining} requests remaining`;
  };

  coordinatorConfig.onRateLimitPause = (platform: string, seconds: number) => {
    spinner.text = `⏸️  ${platform} rate limited - waiting ${seconds}s...`;
    // Pause background job
    if (jobManager && jobId) {
      jobManager.pauseJob(jobId);
    }
  };

  try {
    const coordinator = new ImportCoordinator(coordinatorConfig);
    const result = await coordinator.importAll();

    spinner.succeed(`Imported ${result.totalCount} items`);

    // Complete background job
    if (jobManager && jobId) {
      jobManager.completeJob(jobId);
    }

    // ENHANCED (2025-11-26): Show per-repo breakdown with open/closed counts
    if (result.allItems.length > 0) {
      console.log('');
      console.log(chalk.cyan('   Import Summary:'));

      // Group items by sourceRepo (or platform if no sourceRepo)
      const repoGroups = new Map<string, { open: number; closed: number }>();

      for (const item of result.allItems) {
        const repoKey = item.sourceRepo || item.platform;
        const existing = repoGroups.get(repoKey) || { open: 0, closed: 0 };

        if (item.status === 'open' || item.status === 'in-progress') {
          existing.open++;
        } else {
          existing.closed++;
        }
        repoGroups.set(repoKey, existing);
      }

      // Display per-repo summary
      const repoEntries = Array.from(repoGroups.entries());
      repoEntries.forEach(([repo, counts], index) => {
        const isLast = index === repoEntries.length - 1;
        const prefix = isLast ? '└─' : '├─';
        const total = counts.open + counts.closed;
        const details = counts.closed > 0
          ? `(${counts.open} open, ${counts.closed} closed)`
          : `(${counts.open} open)`;
        console.log(chalk.gray(`   ${prefix} ${repo}: ${total} issues ${details}`));
      });

      console.log(chalk.gray(`   Total: ${result.totalCount} issues imported`));
    } else if (result.results.length > 0) {
      // Fallback to platform-level summary
      console.log('');
      result.results.forEach(platformResult => {
        console.log(chalk.gray(`   ✓ ${platformResult.platform}: ${platformResult.count} items`));
      });
    }

    // Show errors if any
    if (Object.keys(result.errors).length > 0) {
      console.log('');
      console.log(chalk.yellow('   ⚠️  Some imports failed:'));
      Object.entries(result.errors).forEach(([platform, errors]) => {
        console.log(chalk.gray(`   → ${platform}: ${errors.join(', ')}`));
      });
    }

    // Warn if many items detected
    if (result.totalCount > 100) {
      console.log('');
      console.log(chalk.yellow(`   ⚠️  Imported ${result.totalCount} items (large dataset)`));
      console.log(chalk.gray('   → Consider using time range filters for faster imports'));
    }

    // Convert imported items to living docs User Stories
    if (result.totalCount > 0) {
      // DIAGNOSTIC: Log items before conversion
      console.log('');
      console.log(chalk.cyan('   📊 Import Summary by Repo:'));
      const repoCounts = new Map<string, number>();
      for (const item of result.allItems) {
        const repo = item.sourceRepo || 'unknown';
        repoCounts.set(repo, (repoCounts.get(repo) || 0) + 1);
      }
      for (const [repo, count] of repoCounts) {
        console.log(chalk.gray(`      ${repo}: ${count} items`));
      }
      console.log(chalk.gray(`      Total in allItems: ${result.allItems.length}`));
      console.log('');

      await convertToLivingDocs(targetDir, result, spinner);
    } else {
      // T-008: Show troubleshooting checklist when 0 items imported
      console.log('');
      console.log(chalk.yellow('   ⚠️  No items imported. Troubleshooting checklist:'));
      console.log(chalk.gray('   ┌─ Time range: GitHub filters by "updated_at" not "created_at"'));
      console.log(chalk.gray('   │  → Try "All time" option if issues were not recently updated'));
      console.log(chalk.gray('   ├─ Include closed: Set to "Yes" to import resolved issues'));
      console.log(chalk.gray('   ├─ Repository access: Check GitHub token has repo access'));
      console.log(chalk.gray('   ├─ Issues vs PRs: Only Issues are imported (not Pull Requests)'));
      console.log(chalk.gray('   └─ Labels filter: If using labels, verify they exist in the repo'));
      console.log('');
      console.log(chalk.gray('   💡 Run with SPECWEAVE_DEBUG=1 for verbose API logging'));
    }

    return result;
  } catch (error) {
    // Show actual error message (was generic "Import failed" before)
    const errorMsg = error instanceof Error ? error.message : String(error);
    spinner.fail(`Import failed: ${errorMsg}`);

    // Mark background job as failed
    if (jobManager && jobId) {
      jobManager.completeJob(jobId, errorMsg);
    }

    throw error;
  }
}

/**
 * Convert imported items to living docs
 */
async function convertToLivingDocs(
  targetDir: string,
  result: CoordinatorResult,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  spinner.start('Converting to living docs...');

  try {
    const specsDir = path.join(targetDir, '.specweave', 'docs', 'internal', 'specs');

    // Track counts
    let archivedCount = 0;
    let totalConverted = 0;
    const allConvertedStories: ConvertedUserStory[] = [];

    // Group items by external container (JIRA project/board, ADO project/area, or GitHub repo)
    // This supports:
    // - 2-level structure for JIRA: specs/JIRA-{projectKey}/{boardName}/FS-XXX/
    // - 2-level structure for ADO: specs/{projectName}/{areaPath}/FS-XXX/
    // - 1-level structure for GitHub: specs/{repoName}/FS-XXX/
    const containerGroups = groupItemsByExternalContainer(result.allItems);
    const groupCount = containerGroups.length;

    // CRITICAL FIX (2025-11-26): Detect umbrella mode from config, NOT just current batch
    // Bug: FS-001 and FS-001E collision when sync.profiles exist but only one group in batch
    // Root cause: isUmbrellaMode was false for single-group batches in umbrella setups
    const isUmbrellaFromConfig = isUmbrellaModeFromConfig(targetDir);
    const isUmbrellaMode = groupCount > 1 || isUmbrellaFromConfig;

    // Track which container types we're using for logging
    const containerTypesUsed = new Set(containerGroups.map(g => g.containerType || 'github'));

    for (const group of containerGroups) {
      const { projectId, items, externalContainer, containerType, containerId } = group;

      // Build display label for spinner
      const displayLabel = containerType
        ? `${containerType.toUpperCase()}-${containerId}/${projectId}`
        : projectId;

      spinner.text = `Converting items from ${displayLabel}...`;

      // Create converter for this project/repo
      // Pass externalContainer for 2-level directory structure (JIRA/ADO)
      const converter = new ItemConverter({
        specsDir,
        projectRoot: targetDir,
        enableFeatureAllocation: true,
        projectId: projectId,
        // CRITICAL FIX (2025-11-26): Per-project sequences, NOT global
        // Each project gets its own FS-XXX sequence starting from 001
        // Within each project, FS-001 and FS-001E cannot coexist (unified within project)
        // Bug: Global collision detection forced global sequence (FS-001, FS-002E, FS-003E globally)
        // Fix: Disable global detection - each project is independent
        enableGlobalCollisionDetection: false,
        autoArchiveAfterDays: 30,
        // NEW: Pass external container for 2-level directory structure
        externalContainer: externalContainer,
        onFeatureCreated: (featureId, featurePath) => {
          const label = externalContainer
            ? `${containerType?.toUpperCase()}-${containerId}/${projectId}/${featureId}`
            : `${projectId}/${featureId}`;
          spinner.text = `Created feature folder: ${label}`;
        },
        onItemArchived: (usId, reason) => {
          archivedCount++;
          spinner.text = `Archived ${usId} (${reason})`;
        }
      });

      const convertedStories = await converter.convertItems(items);
      allConvertedStories.push(...convertedStories);
      totalConverted += convertedStories.length;
    }

    // Count unique features created
    const uniqueFeatures = new Set(allConvertedStories.map(s => s.featureId).filter(Boolean));

    spinner.succeed(`Converted ${totalConverted} User Stories to living docs`);
    console.log(chalk.gray('   → Living docs created with E suffix (US-001E, US-002E, ...)'));

    // Log directory structure info
    if (containerTypesUsed.has('jira') || containerTypesUsed.has('ado')) {
      console.log(chalk.gray(`   → Using 2-level directory structure for JIRA/ADO`));
      if (containerTypesUsed.has('jira')) {
        console.log(chalk.gray(`   → JIRA: specs/JIRA-{project}/{board}/FS-XXX/`));
      }
      if (containerTypesUsed.has('ado')) {
        console.log(chalk.gray(`   → ADO: specs/{project}/{areaPath}/FS-XXX/`));
      }
    }
    if (containerTypesUsed.has('github') || containerTypesUsed.has(null)) {
      console.log(chalk.gray(`   → GitHub: specs/{repo}/FS-XXX/ (1-level)`));
    }
    if (groupCount > 1) {
      console.log(chalk.gray(`   → Organized into ${groupCount} project folders`));
    }
    // Log per-project sequence info
    if (isUmbrellaMode) {
      console.log(chalk.gray(`   → Per-project sequences (each project starts from FS-001)`));
    }
    if (uniqueFeatures.size > 0) {
      console.log(chalk.gray(`   → Organized into ${uniqueFeatures.size} feature folder(s)`));
    }
    if (archivedCount > 0) {
      console.log(chalk.gray(`   → Auto-archived ${archivedCount} items older than 30 days`));
    }
    console.log(chalk.gray('   → Location: .specweave/docs/internal/specs/'));
    console.log('');

    // Validate that no increments were auto-created
    try {
      ItemConverter.validateNoIncrementsCreated(targetDir);
    } catch (validationError) {
      spinner.fail('Import validation failed');
      throw new Error(
        `CRITICAL ERROR: ${validationError instanceof Error ? validationError.message : String(validationError)}\n` +
        'This is a bug in the import system. Please report it.'
      );
    }

    console.log(chalk.blue('   💡 Next steps:'));
    console.log(chalk.gray('   → Review imported User Stories in living docs'));
    console.log(chalk.gray('   → Create increments manually when ready: /specweave:increment "feature"'));
    console.log('');
  } catch (conversionError) {
    spinner.fail('Conversion to living docs failed');
    throw conversionError;
  }
}

/**
 * Group items by their source repository
 * Items without sourceRepo go into '_default' group
 */
function groupItemsBySourceRepo(items: ExternalItem[]): Map<string, ExternalItem[]> {
  const groups = new Map<string, ExternalItem[]>();

  for (const item of items) {
    // Extract repo name from sourceRepo (e.g., "owner/repo" -> "repo")
    let repoKey = '_default';
    if (item.sourceRepo) {
      // sourceRepo is "owner/repo", we want just "repo"
      const parts = item.sourceRepo.split('/');
      const rawRepoName = parts.length > 1 ? parts[1] : item.sourceRepo;

      // Sanitize repo name to prevent path injection:
      // - Allow only alphanumeric, hyphens, underscores
      // - Trim leading/trailing hyphens
      // - Limit to 100 chars
      repoKey = rawRepoName
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100);

      // Fall back to _default if sanitization results in empty string
      if (!repoKey) {
        repoKey = '_default';
      }
    }

    if (!groups.has(repoKey)) {
      groups.set(repoKey, []);
    }
    groups.get(repoKey)!.push(item);
  }

  return groups;
}

/**
 * Group items by external container (JIRA project/board, ADO project/area path)
 * Returns groups with container context for 2-level directory structure
 */
interface ContainerGroup {
  containerId: string;          // JIRA project key or ADO project name
  containerType: 'jira' | 'ado' | null;  // null for GitHub
  projectId: string;            // Board-based or area-path-based project ID
  items: ExternalItem[];
  externalContainer: ExternalContainerContext | undefined;
}

function groupItemsByExternalContainer(items: ExternalItem[]): ContainerGroup[] {
  const groups = new Map<string, ContainerGroup>();

  for (const item of items) {
    let groupKey: string;
    let containerType: 'jira' | 'ado' | null = null;
    let containerId: string | undefined;
    let projectId: string;
    let externalContainer: ExternalContainerContext | undefined;

    // Check for JIRA container context
    if (item.jiraProjectKey) {
      containerType = 'jira';
      containerId = item.jiraProjectKey;

      // Project ID from board name (if available) or default
      projectId = item.jiraBoardName
        ? item.jiraBoardName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'default'
        : 'default';

      groupKey = `jira:${containerId}:${projectId}`;

      externalContainer = {
        type: 'jira-project',
        containerId: containerId,
        containerName: containerId,
        boardId: item.jiraBoardId,
        boardName: item.jiraBoardName
      };
    }
    // Check for ADO container context
    else if (item.adoProjectName) {
      containerType = 'ado';
      containerId = item.adoProjectName;

      // Project ID from area path (extract last segment) or default
      if (item.adoAreaPath) {
        const areaSegments = item.adoAreaPath.split('\\');
        const lastSegment = areaSegments[areaSegments.length - 1];
        projectId = lastSegment.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'default';
      } else {
        projectId = 'default';
      }

      groupKey = `ado:${containerId}:${projectId}`;

      externalContainer = {
        type: 'ado-project',
        containerId: containerId,
        containerName: containerId,
        areaPath: item.adoAreaPath
      };
    }
    // GitHub or default (1-level structure)
    else {
      // Use sourceRepo if available, otherwise '_default'
      if (item.sourceRepo) {
        const parts = item.sourceRepo.split('/');
        const rawRepoName = parts.length > 1 ? parts[1] : item.sourceRepo;
        projectId = rawRepoName
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 100) || '_default';
      } else {
        projectId = '_default';
      }

      groupKey = `gh:${projectId}`;
      // No externalContainer for GitHub (1-level structure)
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        containerId: containerId || projectId,
        containerType,
        projectId,
        items: [],
        externalContainer
      });
    }
    groups.get(groupKey)!.items.push(item);
  }

  return Array.from(groups.values());
}

/**
 * Create empty result object
 */
function emptyResult(): CoordinatorResult {
  return {
    results: [],
    totalCount: 0,
    allItems: [],
    errors: {},
    platforms: []
  };
}
