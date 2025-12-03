/**
 * Living Docs Preflight - User Input Collection for Living Docs Builder
 *
 * Collects user preferences BEFORE launching the background job:
 * - Additional documentation sources (Notion exports, MD folders)
 * - Priority areas to focus on
 * - Known pain points in documentation
 * - Analysis depth preference
 *
 * This runs interactively in the init command, not in the background worker.
 */

import chalk from 'chalk';
import { input, select, confirm, checkbox } from '@inquirer/prompts';
import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import type { LivingDocsUserInputs } from '../../../core/background/types.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

/**
 * Get translated strings for preflight prompts
 */
interface PreflightStrings {
  header: string;
  description: string;
  descriptionGreenfield: string;
  enableLivingDocs: string;
  enableLivingDocsGreenfield: string;
  detectedBrownfield: string;
  detectedGreenfield: string;
  additionalSourcesPrompt: string;
  additionalSourcesHint: string;
  priorityAreasPrompt: string;
  priorityAreasHint: string;
  painPointsPrompt: string;
  painPointsHint: string;
  analysisDepthPrompt: string;
  depthQuick: string;
  depthQuickDesc: string;
  depthStandard: string;
  depthStandardDesc: string;
  depthDeep: string;
  depthDeepDesc: string;
  confirmLaunch: string;
  skipLivingDocs: string;
  jobScheduled: string;
  jobId: string;
  estimatedDuration: string;
  monitorWith: string;
  continuousSyncNote: string;
  greenfieldSetupComplete: string;
}

function getPreflightStrings(language: SupportedLanguage): PreflightStrings {
  const strings: Partial<Record<SupportedLanguage, PreflightStrings>> = {
    en: {
      header: 'Living Docs Builder',
      description: 'Generate documentation from your codebase automatically.',
      descriptionGreenfield: 'Set up living docs structure for your new project.',
      enableLivingDocs: 'Enable Living Docs?',
      enableLivingDocsGreenfield: 'Enable Living Docs for this project?',
      detectedBrownfield: 'Detected: existing codebase',
      detectedGreenfield: 'New project - docs will sync as you build',
      additionalSourcesPrompt: 'Any additional documentation folders to include?',
      additionalSourcesHint: 'e.g., docs/, wiki/, notion-export/ (comma-separated, or leave empty)',
      priorityAreasPrompt: 'Priority areas to document first?',
      priorityAreasHint: 'e.g., auth, payments, api (comma-separated, or leave empty)',
      painPointsPrompt: 'Known documentation pain points?',
      painPointsHint: 'e.g., "deployment process unclear", "API not documented"',
      analysisDepthPrompt: 'How deep should the analysis go?',
      depthQuick: 'Quick (~30 min)',
      depthQuickDesc: 'Top 5 modules only - fast overview',
      depthStandard: 'Standard (~2 hours)',
      depthStandardDesc: 'Top 10 modules - recommended',
      depthDeep: 'Deep (hours/days)',
      depthDeepDesc: 'All modules - comprehensive',
      confirmLaunch: 'Launch Living Docs Builder job?',
      skipLivingDocs: 'Skipping living docs generation',
      jobScheduled: 'Living Docs Builder job scheduled!',
      jobId: 'Job ID',
      estimatedDuration: 'Estimated duration',
      monitorWith: 'Monitor with',
      continuousSyncNote: 'Living docs will sync automatically as you work',
      greenfieldSetupComplete: 'Living docs structure ready - will populate as you create increments',
    },
    ru: {
      header: 'Генератор Living Docs',
      description: 'Автоматическая генерация документации из кодовой базы.',
      descriptionGreenfield: 'Настройка структуры living docs для нового проекта.',
      enableLivingDocs: 'Включить Living Docs?',
      enableLivingDocsGreenfield: 'Включить Living Docs для этого проекта?',
      detectedBrownfield: 'Обнаружен: существующий код',
      detectedGreenfield: 'Новый проект - доки будут синхронизироваться по мере разработки',
      additionalSourcesPrompt: 'Дополнительные папки с документацией?',
      additionalSourcesHint: 'например, docs/, wiki/, notion-export/ (через запятую или пусто)',
      priorityAreasPrompt: 'Приоритетные области для документирования?',
      priorityAreasHint: 'например, auth, payments, api (через запятую или пусто)',
      painPointsPrompt: 'Известные проблемы с документацией?',
      painPointsHint: 'например, "процесс деплоя непонятен", "API не задокументировано"',
      analysisDepthPrompt: 'Насколько глубокий анализ?',
      depthQuick: 'Быстрый (~30 мин)',
      depthQuickDesc: 'Только топ-5 модулей',
      depthStandard: 'Стандартный (~2 часа)',
      depthStandardDesc: 'Топ-10 модулей - рекомендуется',
      depthDeep: 'Глубокий (часы/дни)',
      depthDeepDesc: 'Все модули - полный',
      confirmLaunch: 'Запустить генератор Living Docs?',
      skipLivingDocs: 'Пропуск генерации living docs',
      jobScheduled: 'Задача Living Docs Builder запланирована!',
      jobId: 'ID задачи',
      estimatedDuration: 'Ожидаемое время',
      monitorWith: 'Отслеживать с помощью',
      continuousSyncNote: 'Living docs будут синхронизироваться автоматически',
      greenfieldSetupComplete: 'Структура living docs готова - заполнится по мере создания инкрементов',
    },
  };

  return strings[language] || strings.en!;
}

/**
 * Options for preflight collection
 */
export interface PreflightOptions {
  /** Project path */
  projectPath: string;
  /** UI language */
  language?: SupportedLanguage;
  /** Is CI environment (no prompts) */
  isCi?: boolean;
  /** Force skip living docs */
  skipLivingDocs?: boolean;
  /** Job IDs that will populate the project (clone, import) - makes greenfield → brownfield */
  pendingJobIds?: string[];
}

/**
 * Result of preflight collection
 */
export interface PreflightResult {
  /** Whether to launch the job */
  shouldLaunch: boolean;
  /** Whether project is brownfield (has existing code) */
  isBrownfield: boolean;
  /** User inputs for the job */
  userInputs: LivingDocsUserInputs;
  /** Estimated duration string */
  estimatedDuration: string;
}

/**
 * Detect if project is brownfield (has existing code)
 */
export function detectBrownfield(projectPath: string): boolean {
  // Check for common indicators of existing code
  const indicators = [
    'package.json',
    'requirements.txt',
    'go.mod',
    'Cargo.toml',
    'pom.xml',
    'build.gradle',
    'pyproject.toml',
    'composer.json',
    'Gemfile',
    'CMakeLists.txt',
  ];

  for (const indicator of indicators) {
    if (fs.existsSync(path.join(projectPath, indicator))) {
      return true;
    }
  }

  // Check for src/ directory with files
  const srcDir = path.join(projectPath, 'src');
  if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
    const files = fs.readdirSync(srcDir);
    if (files.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Detect existing documentation folders
 */
export function detectExistingDocs(projectPath: string): string[] {
  const docFolders = ['docs', 'doc', 'documentation', 'wiki', 'notion-export'];
  const found: string[] = [];

  for (const folder of docFolders) {
    const folderPath = path.join(projectPath, folder);
    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
      found.push(folder);
    }
  }

  return found;
}

/**
 * Estimate duration based on codebase size
 */
export function estimateDuration(
  projectPath: string,
  depth: 'quick' | 'standard' | 'deep'
): string {
  // Quick file count estimate
  let fileCount = 0;
  try {
    const srcDir = path.join(projectPath, 'src');
    if (fs.existsSync(srcDir)) {
      fileCount = countFiles(srcDir);
    } else {
      fileCount = countFiles(projectPath);
    }
  } catch {
    fileCount = 100; // Default estimate
  }

  // Duration estimates based on tier and depth
  if (depth === 'quick') {
    return '15-30 minutes';
  }

  if (depth === 'standard') {
    if (fileCount < 500) return '30 minutes - 1 hour';
    if (fileCount < 2000) return '1-2 hours';
    return '2-4 hours';
  }

  // Deep
  if (fileCount < 500) return '1-2 hours';
  if (fileCount < 2000) return '2-6 hours';
  if (fileCount < 10000) return '6-24 hours';
  return '1-3 days';
}

/**
 * Count files recursively (limited depth)
 */
function countFiles(dir: string, depth: number = 0): number {
  if (depth > 5) return 0; // Limit depth

  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip common non-source directories
      if (['node_modules', 'dist', 'build', '.git', '__pycache__', 'vendor'].includes(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        count += countFiles(path.join(dir, entry.name), depth + 1);
      } else {
        count++;
      }
    }
  } catch {
    // Ignore permission errors
  }

  return count;
}

/**
 * Collect user inputs for living docs builder
 *
 * NEW FLOW (v0.31+):
 * 1. Always ask "Enable Living Docs?" first (both brownfield and greenfield)
 * 2. For brownfield: ask detailed config, launch background builder job
 * 3. For greenfield: just enable structure, docs sync automatically as you work
 * 4. If pendingJobIds exist (clone/import), treat as "will be brownfield"
 */
export async function collectLivingDocsInputs(
  options: PreflightOptions
): Promise<PreflightResult | null> {
  const { projectPath, language = 'en', isCi = false, skipLivingDocs = false, pendingJobIds = [] } = options;
  const strings = getPreflightStrings(language);

  // Skip if explicitly disabled
  if (skipLivingDocs) {
    console.log(chalk.gray(`  ${strings.skipLivingDocs}`));
    return null;
  }

  // Detect project type
  // IMPORTANT: If there are pending clone/import jobs, treat as "will be brownfield"
  // because the directory will have code once those jobs complete
  const currentlyBrownfield = detectBrownfield(projectPath);
  const hasPendingJobs = pendingJobIds.length > 0;
  const isBrownfield = currentlyBrownfield || hasPendingJobs;

  // CI mode: use defaults (enable for brownfield, skip config for greenfield)
  if (isCi) {
    if (isBrownfield) {
      return {
        shouldLaunch: true,
        isBrownfield: true,
        userInputs: {
          additionalSources: [],
          priorityAreas: [],
          knownPainPoints: [],
          analysisDepth: 'quick',
        },
        estimatedDuration: estimateDuration(projectPath, 'quick'),
      };
    } else {
      // Greenfield CI: enable but no background job needed
      return {
        shouldLaunch: true,
        isBrownfield: false,
        userInputs: {
          additionalSources: [],
          priorityAreas: [],
          knownPainPoints: [],
          analysisDepth: 'quick',
        },
        estimatedDuration: 'N/A',
      };
    }
  }

  // Interactive mode - ALWAYS show this section
  console.log('');
  console.log(chalk.cyan(`  📚 ${strings.header}`));

  // Show context about project type
  if (currentlyBrownfield) {
    const fileCount = countFilesQuick(projectPath);
    console.log(chalk.gray(`     ${strings.description}`));
    console.log(chalk.gray(`     ${strings.detectedBrownfield} (${fileCount} source files)`));
  } else if (hasPendingJobs) {
    // Directory is empty but will have code after jobs complete
    console.log(chalk.gray(`     ${strings.description}`));
    console.log(chalk.gray(`     Pending: ${pendingJobIds.length} background job(s) will populate codebase`));
  } else {
    console.log(chalk.gray(`     ${strings.descriptionGreenfield}`));
    console.log(chalk.gray(`     ${strings.detectedGreenfield}`));
  }
  console.log('');

  // FIRST: Ask if user wants Living Docs at all
  const enablePrompt = isBrownfield ? strings.enableLivingDocs : strings.enableLivingDocsGreenfield;
  const enableLivingDocs = await confirm({
    message: enablePrompt,
    default: true,
  });

  if (!enableLivingDocs) {
    console.log(chalk.gray(`  ${strings.skipLivingDocs}`));
    return null;
  }

  // Greenfield: No detailed questions needed - just enable structure
  if (!isBrownfield) {
    console.log(chalk.green(`  ✓ ${strings.greenfieldSetupComplete}`));
    console.log(chalk.gray(`  💡 ${strings.continuousSyncNote}`));
    return {
      shouldLaunch: true,
      isBrownfield: false,
      userInputs: {
        additionalSources: [],
        priorityAreas: [],
        knownPainPoints: [],
        analysisDepth: 'quick',
      },
      estimatedDuration: 'N/A',
    };
  }

  // Brownfield: Ask detailed configuration
  console.log('');

  // Detect existing docs and suggest them
  const existingDocs = detectExistingDocs(projectPath);

  // Additional sources
  const additionalSourcesInput = await input({
    message: strings.additionalSourcesPrompt,
    default: existingDocs.join(', '),
  });

  const additionalSources = additionalSourcesInput
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Priority areas
  const priorityAreasInput = await input({
    message: strings.priorityAreasPrompt,
  });

  const priorityAreas = priorityAreasInput
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Pain points
  const painPointsInput = await input({
    message: strings.painPointsPrompt,
  });

  const knownPainPoints = painPointsInput
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Analysis depth
  const analysisDepth = await select<'quick' | 'standard' | 'deep'>({
    message: strings.analysisDepthPrompt,
    choices: [
      {
        value: 'quick',
        name: `${strings.depthQuick} - ${strings.depthQuickDesc}`,
      },
      {
        value: 'standard',
        name: `${strings.depthStandard} - ${strings.depthStandardDesc}`,
      },
      {
        value: 'deep',
        name: `${strings.depthDeep} - ${strings.depthDeepDesc}`,
      },
    ],
    default: 'standard',
  });

  const estimatedDurationStr = estimateDuration(projectPath, analysisDepth);

  // Final confirmation for background job
  const shouldLaunch = await confirm({
    message: `${strings.confirmLaunch} (${estimatedDurationStr})`,
    default: true,
  });

  if (!shouldLaunch) {
    // User wants living docs but not the background builder
    console.log(chalk.green(`  ✓ Living docs enabled`));
    console.log(chalk.gray(`  💡 ${strings.continuousSyncNote}`));
    return {
      shouldLaunch: false,
      isBrownfield: true,
      userInputs: {
        additionalSources,
        priorityAreas,
        knownPainPoints,
        analysisDepth,
      },
      estimatedDuration: estimatedDurationStr,
    };
  }

  return {
    shouldLaunch: true,
    isBrownfield: true,
    userInputs: {
      additionalSources,
      priorityAreas,
      knownPainPoints,
      analysisDepth,
    },
    estimatedDuration: estimatedDurationStr,
  };
}

/**
 * Quick file count for display (limited depth, fast)
 */
function countFilesQuick(projectPath: string): number {
  try {
    const srcDir = path.join(projectPath, 'src');
    if (fs.existsSync(srcDir)) {
      return countFiles(srcDir);
    }
    return countFiles(projectPath);
  } catch {
    return 0;
  }
}

/**
 * Display job scheduled message
 */
export function displayJobScheduled(
  jobId: string,
  estimatedDuration: string,
  language: SupportedLanguage = 'en'
): void {
  const strings = getPreflightStrings(language);

  console.log('');
  console.log(chalk.green(`  ✓ ${strings.jobScheduled}`));
  console.log(chalk.gray(`    ${strings.jobId}: ${jobId}`));
  console.log(chalk.gray(`    ${strings.estimatedDuration}: ${estimatedDuration}`));
  console.log(chalk.gray(`    ${strings.monitorWith}: /specweave:jobs`));
  console.log(chalk.gray(`  💡 ${strings.continuousSyncNote}`));
}
