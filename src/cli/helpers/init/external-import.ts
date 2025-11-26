/**
 * External tool import functionality
 * Imports work items from GitHub, JIRA, Azure DevOps
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { select, confirm } from '@inquirer/prompts';
import { Octokit } from '@octokit/rest';
import { ImportCoordinator, CoordinatorConfig, CoordinatorResult, ProgressInfo } from '../../../importers/import-coordinator.js';
import { ItemConverter, ConvertedUserStory } from '../../../importers/item-converter.js';
import type { ExternalItem } from '../../../importers/external-importer.js';
import { loadImportConfig } from '../../../config/import-config.js';
import { selectRepositories, type RepoSelectionConfig } from '../github-repo-selector.js';
import { detectAllConfigs } from './config-detection.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getGitHubAuth } from '../../../utils/auth-helpers.js';

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
  const { github, jira, ado, availableTools } = detectAllConfigs(targetDir);

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

  // Get GitHub token from all available sources (env vars, gh CLI, gh config file)
  const githubAuth = getGitHubAuth();
  const hasGitHubToken = githubAuth.source !== 'none';

  if (github && hasGitHubToken) {
    // First check if sync profiles already exist (from umbrella repo setup)
    const existingProfiles = getExistingSyncProfiles(targetDir);
    if (existingProfiles && existingProfiles.length > 0) {
      console.log(chalk.gray(`   Using existing sync profiles: ${existingProfiles.length} repositories`));
      repoSelectionConfig = {
        repositories: existingProfiles,
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
  const timeRange = await select({
    message: 'How far back should we import?',
    choices: [
      { name: '1 month (recent items only)', value: 1 },
      { name: '3 months (recommended)', value: 3 },
      { name: '6 months (comprehensive)', value: 6 },
      { name: 'All time (warning: may be slow)', value: 999 }
    ],
    default: defaultTimeRange
  });

  // Build coordinator configuration
  const coordinatorConfig: CoordinatorConfig = {
    importConfig: {
      timeRangeMonths: timeRange,
      includeClosed: false,
      pageSize: importConfig.pageSize
    },
    parallel: true,
    projectRoot: targetDir
  };

  // Add GitHub config - prefer multi-repo if selected
  if (github && hasGitHubToken) {
    if (repoSelectionConfig && repoSelectionConfig.repositories.length > 0) {
      // Multi-repo mode: import from all selected repositories
      coordinatorConfig.githubRepositories = repoSelectionConfig.repositories.map(fullRepo => {
        const [owner, repo] = fullRepo.split('/');
        return { owner, repo };
      });
      coordinatorConfig.githubToken = githubAuth.token;
    } else {
      // Single repo mode (backwards compatible)
      coordinatorConfig.github = {
        owner: github.owner,
        repo: github.repo,
        token: githubAuth.token
      };
    }
  }

  // Add JIRA config if available
  if (jira) {
    coordinatorConfig.jira = {
      host: jira.host,
      email: jira.email,
      apiToken: jira.apiToken
    };
  }

  // Add ADO config if available
  if (ado) {
    coordinatorConfig.ado = {
      orgUrl: ado.orgUrl,
      project: ado.project,
      pat: ado.pat
    };
  }

  // Run import with progress tracking
  return await runImport(targetDir, coordinatorConfig);
}

/**
 * Get existing sync profiles from config.json
 * Returns array of "owner/repo" strings if profiles exist
 */
function getExistingSyncProfiles(targetDir: string): string[] | null {
  try {
    const configPath = path.join(targetDir, '.specweave', 'config.json');
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Check for sync.profiles structure (umbrella repo setup)
    if (config.sync?.profiles && typeof config.sync.profiles === 'object') {
      const profiles = config.sync.profiles;
      const repos: string[] = [];

      for (const [profileId, profile] of Object.entries(profiles)) {
        const p = profile as { config?: { owner?: string; repo?: string } };
        if (p.config?.owner && p.config?.repo) {
          repos.push(`${p.config.owner}/${p.config.repo}`);
        }
      }

      return repos.length > 0 ? repos : null;
    }

    return null;
  } catch (error) {
    // Log warning for debugging - config parsing errors shouldn't be silent
    console.warn(chalk.yellow(`   ⚠️  Failed to read sync profiles: ${error instanceof Error ? error.message : String(error)}`));
    return null;
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

    // Use auth helper to get token from all available sources
    const auth = getGitHubAuth();
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

  // Enhanced progress callback with percentage and ETA
  coordinatorConfig.onProgressEnhanced = (info: ProgressInfo) => {
    const parts: string[] = [];

    // Show repo name for multi-repo imports
    if (info.sourceRepo && info.sourceRepo !== lastRepo) {
      lastRepo = info.sourceRepo;
    }

    const repoLabel = info.sourceRepo ? ` (${info.sourceRepo})` : '';

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
  };

  // Legacy progress callback (fallback)
  coordinatorConfig.onProgress = (platform: string, count: number, total?: number) => {
    if (!coordinatorConfig.onProgressEnhanced) {
      const totalStr = total ? `/${total}` : '';
      spinner.text = `Importing from ${platform}... (${count}${totalStr} items)`;
    }
  };

  try {
    const coordinator = new ImportCoordinator(coordinatorConfig);
    const result = await coordinator.importAll();

    spinner.succeed(`Imported ${result.totalCount} items`);

    // Show breakdown by platform
    if (result.results.length > 0) {
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
      await convertToLivingDocs(targetDir, result, spinner);
    }

    return result;
  } catch (error) {
    spinner.fail('Import failed');
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

    // Group items by sourceRepo for proper multi-repo folder allocation
    const itemsByRepo = groupItemsBySourceRepo(result.allItems);
    const repoCount = itemsByRepo.size;

    for (const [repoKey, items] of itemsByRepo.entries()) {
      // Determine project ID:
      // - For multi-repo: use repo name (e.g., "sw-thumbnail-ab-be")
      // - For single-repo/no sourceRepo: null (items go directly to specs/)
      const projectId = repoKey === '_default' ? null : repoKey;

      spinner.text = projectId
        ? `Converting items from ${projectId}...`
        : 'Converting items to living docs...';

      // Create converter for this project/repo
      const converter = new ItemConverter({
        specsDir,
        projectRoot: targetDir,
        enableFeatureAllocation: true,
        // For multi-repo: use repo name as project folder
        // For single-repo: undefined means direct to specs/ (no project subfolder)
        projectId: projectId || undefined,
        autoArchiveAfterDays: 30,
        onFeatureCreated: (featureId, featurePath) => {
          const label = projectId ? `${projectId}/${featureId}` : featureId;
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
    if (repoCount > 1) {
      console.log(chalk.gray(`   → Organized into ${repoCount} project folders`));
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
