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
}

function getPreflightStrings(language: SupportedLanguage): PreflightStrings {
  const strings: Partial<Record<SupportedLanguage, PreflightStrings>> = {
    en: {
      header: 'Living Docs Builder',
      description: 'Generate documentation from your codebase automatically.',
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
    },
    ru: {
      header: 'Генератор Living Docs',
      description: 'Автоматическая генерация документации из кодовой базы.',
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
}

/**
 * Result of preflight collection
 */
export interface PreflightResult {
  /** Whether to launch the job */
  shouldLaunch: boolean;
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
 */
export async function collectLivingDocsInputs(
  options: PreflightOptions
): Promise<PreflightResult | null> {
  const { projectPath, language = 'en', isCi = false, skipLivingDocs = false } = options;
  const strings = getPreflightStrings(language);

  // Skip if explicitly disabled
  if (skipLivingDocs) {
    console.log(chalk.gray(`  ${strings.skipLivingDocs}`));
    return null;
  }

  // Check if brownfield project
  if (!detectBrownfield(projectPath)) {
    // Greenfield project - no code to analyze
    return null;
  }

  // CI mode: use defaults
  if (isCi) {
    return {
      shouldLaunch: true,
      userInputs: {
        additionalSources: [],
        priorityAreas: [],
        knownPainPoints: [],
        analysisDepth: 'quick',
      },
      estimatedDuration: estimateDuration(projectPath, 'quick'),
    };
  }

  // Interactive mode
  console.log('');
  console.log(chalk.cyan(`  📚 ${strings.header}`));
  console.log(chalk.gray(`     ${strings.description}`));
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

  const estimatedDuration = estimateDuration(projectPath, analysisDepth);

  // Confirm launch
  const shouldLaunch = await confirm({
    message: `${strings.confirmLaunch} (${estimatedDuration})`,
    default: true,
  });

  if (!shouldLaunch) {
    console.log(chalk.gray(`  ${strings.skipLivingDocs}`));
    return null;
  }

  return {
    shouldLaunch: true,
    userInputs: {
      additionalSources,
      priorityAreas,
      knownPainPoints,
      analysisDepth,
    },
    estimatedDuration,
  };
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
  console.log(chalk.gray(`    ${strings.monitorWith}: specweave jobs`));
}
