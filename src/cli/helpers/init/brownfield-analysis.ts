/**
 * Brownfield analysis prompts
 * Handles brownfield project detection and analysis configuration
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select, confirm, input } from '@inquirer/prompts';
import type { SupportedLanguage } from '../../../core/i18n/types.js';

/**
 * Analysis depth options
 */
export type AnalysisDepth = 'quick' | 'standard' | 'deep';

/**
 * Detected documentation location
 */
export interface DetectedDocsLocation {
  path: string;
  type: 'markdown' | 'wiki' | 'readme' | 'jsdoc' | 'mixed';
  fileCount: number;
}

/**
 * Brownfield analysis configuration result
 */
export interface BrownfieldAnalysisConfig {
  enabled: boolean;
  sourceDocsPath?: string;
  analysisDepth: AnalysisDepth;
}

/**
 * Get translated strings for brownfield analysis
 */
function getBrownfieldStrings(language: SupportedLanguage): {
  header: string;
  subheader: string;
  explanation: string;
  analyzeQuestion: string;
  skipped: string;
  detectedDocs: string;
  useDetectedDocs: string;
  customDocsPath: string;
  selectDepth: string;
  depthQuick: string;
  depthStandard: string;
  depthDeep: string;
  starting: string;
  monitorHint: string;
  discrepancyTypes: string[];
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getBrownfieldStrings>> = {
    en: {
      header: '📚 Brownfield Documentation Analysis',
      subheader: 'Analyze existing codebase for documentation gaps',
      explanation: 'This feature helps bootstrap living docs by analyzing your existing codebase:',
      analyzeQuestion: 'Analyze existing codebase for documentation gaps?',
      skipped: 'Skipping brownfield analysis. You can run it later with /specweave:analyze-brownfield',
      detectedDocs: 'Found existing documentation:',
      useDetectedDocs: 'Use this documentation location?',
      customDocsPath: 'Enter documentation location (relative path):',
      selectDepth: 'Select analysis depth:',
      depthQuick: 'Quick (5-10 min) - Structure and exports only',
      depthStandard: 'Standard (30-60 min) - Full code analysis',
      depthDeep: 'Deep (1-2 hours) - Semantic analysis + git history',
      starting: '✓ Brownfield analysis configured',
      monitorHint: 'Analysis will run as background job. Monitor with: /specweave:jobs',
      discrepancyTypes: [
        'Undocumented public APIs',
        'Stale documentation',
        'Missing ADRs',
        'Knowledge silos',
      ],
    },
    ru: {
      header: '📚 Анализ документации браунфилда',
      subheader: 'Анализ существующей кодовой базы на пробелы в документации',
      explanation: 'Эта функция помогает создать живую документацию, анализируя существующий код:',
      analyzeQuestion: 'Проанализировать кодовую базу на пробелы в документации?',
      skipped: 'Пропуск анализа браунфилда. Запустите позже: /specweave:analyze-brownfield',
      detectedDocs: 'Найдена существующая документация:',
      useDetectedDocs: 'Использовать эту документацию?',
      customDocsPath: 'Введите путь к документации (относительный):',
      selectDepth: 'Выберите глубину анализа:',
      depthQuick: 'Быстрый (5-10 мин) - Только структура и экспорты',
      depthStandard: 'Стандартный (30-60 мин) - Полный анализ кода',
      depthDeep: 'Глубокий (1-2 часа) - Семантика + история git',
      starting: '✓ Анализ браунфилда настроен',
      monitorHint: 'Анализ запустится в фоне. Мониторинг: /specweave:jobs',
      discrepancyTypes: [
        'Недокументированные API',
        'Устаревшая документация',
        'Отсутствующие ADR',
        'Информационные бункеры',
      ],
    },
    es: {
      header: '📚 Análisis de documentación Brownfield',
      subheader: 'Analizar base de código existente para brechas de documentación',
      explanation: 'Esta función ayuda a crear docs vivos analizando su código existente:',
      analyzeQuestion: '¿Analizar base de código para brechas de documentación?',
      skipped: 'Omitiendo análisis brownfield. Ejecútelo después: /specweave:analyze-brownfield',
      detectedDocs: 'Documentación encontrada:',
      useDetectedDocs: '¿Usar esta ubicación de documentación?',
      customDocsPath: 'Ingrese ubicación de documentación (ruta relativa):',
      selectDepth: 'Seleccione profundidad de análisis:',
      depthQuick: 'Rápido (5-10 min) - Solo estructura y exportaciones',
      depthStandard: 'Estándar (30-60 min) - Análisis completo de código',
      depthDeep: 'Profundo (1-2 horas) - Análisis semántico + historial git',
      starting: '✓ Análisis brownfield configurado',
      monitorHint: 'El análisis se ejecutará en segundo plano. Monitorear: /specweave:jobs',
      discrepancyTypes: [
        'APIs públicas sin documentar',
        'Documentación obsoleta',
        'ADRs faltantes',
        'Silos de conocimiento',
      ],
    },
    zh: {
      header: '📚 棕地项目文档分析',
      subheader: '分析现有代码库的文档缺口',
      explanation: '此功能通过分析现有代码库帮助引导活文档:',
      analyzeQuestion: '分析代码库以查找文档缺口?',
      skipped: '跳过棕地分析。稍后运行: /specweave:analyze-brownfield',
      detectedDocs: '发现现有文档:',
      useDetectedDocs: '使用此文档位置?',
      customDocsPath: '输入文档位置 (相对路径):',
      selectDepth: '选择分析深度:',
      depthQuick: '快速 (5-10分钟) - 仅结构和导出',
      depthStandard: '标准 (30-60分钟) - 完整代码分析',
      depthDeep: '深度 (1-2小时) - 语义分析 + git历史',
      starting: '✓ 棕地分析已配置',
      monitorHint: '分析将作为后台任务运行。监控: /specweave:jobs',
      discrepancyTypes: [
        '未文档化的公共API',
        '过时的文档',
        '缺失的ADR',
        '知识孤岛',
      ],
    },
    de: {
      header: '📚 Brownfield-Dokumentationsanalyse',
      subheader: 'Bestehende Codebasis auf Dokumentationslücken analysieren',
      explanation: 'Diese Funktion hilft bei der Erstellung von Living Docs durch Analyse Ihres Codes:',
      analyzeQuestion: 'Codebasis auf Dokumentationslücken analysieren?',
      skipped: 'Brownfield-Analyse übersprungen. Später ausführen: /specweave:analyze-brownfield',
      detectedDocs: 'Gefundene Dokumentation:',
      useDetectedDocs: 'Diesen Dokumentationsort verwenden?',
      customDocsPath: 'Dokumentationsort eingeben (relativer Pfad):',
      selectDepth: 'Analysetiefe wählen:',
      depthQuick: 'Schnell (5-10 Min) - Nur Struktur und Exporte',
      depthStandard: 'Standard (30-60 Min) - Vollständige Code-Analyse',
      depthDeep: 'Tief (1-2 Std) - Semantische Analyse + Git-Historie',
      starting: '✓ Brownfield-Analyse konfiguriert',
      monitorHint: 'Analyse läuft im Hintergrund. Überwachen: /specweave:jobs',
      discrepancyTypes: [
        'Undokumentierte öffentliche APIs',
        'Veraltete Dokumentation',
        'Fehlende ADRs',
        'Wissens-Silos',
      ],
    },
    fr: {
      header: '📚 Analyse de documentation Brownfield',
      subheader: 'Analyser la base de code existante pour les lacunes de documentation',
      explanation: 'Cette fonction aide à créer des docs vivants en analysant votre code:',
      analyzeQuestion: 'Analyser la base de code pour les lacunes de documentation?',
      skipped: 'Analyse brownfield ignorée. Exécutez plus tard: /specweave:analyze-brownfield',
      detectedDocs: 'Documentation trouvée:',
      useDetectedDocs: 'Utiliser cet emplacement de documentation?',
      customDocsPath: 'Entrez l\'emplacement de documentation (chemin relatif):',
      selectDepth: 'Sélectionnez la profondeur d\'analyse:',
      depthQuick: 'Rapide (5-10 min) - Structure et exports seulement',
      depthStandard: 'Standard (30-60 min) - Analyse complète du code',
      depthDeep: 'Profond (1-2 heures) - Analyse sémantique + historique git',
      starting: '✓ Analyse brownfield configurée',
      monitorHint: 'L\'analyse s\'exécutera en arrière-plan. Surveiller: /specweave:jobs',
      discrepancyTypes: [
        'APIs publiques non documentées',
        'Documentation obsolète',
        'ADRs manquants',
        'Silos de connaissances',
      ],
    },
    ja: {
      header: '📚 ブラウンフィールドドキュメント分析',
      subheader: '既存コードベースのドキュメントギャップを分析',
      explanation: 'この機能は既存コードを分析してリビングドキュメントの作成を支援します:',
      analyzeQuestion: 'コードベースのドキュメントギャップを分析しますか?',
      skipped: 'ブラウンフィールド分析をスキップ。後で実行: /specweave:analyze-brownfield',
      detectedDocs: '既存ドキュメントを検出:',
      useDetectedDocs: 'このドキュメント場所を使用しますか?',
      customDocsPath: 'ドキュメントの場所を入力 (相対パス):',
      selectDepth: '分析深度を選択:',
      depthQuick: '高速 (5-10分) - 構造とエクスポートのみ',
      depthStandard: '標準 (30-60分) - 完全なコード分析',
      depthDeep: '深層 (1-2時間) - セマンティック分析 + git履歴',
      starting: '✓ ブラウンフィールド分析が設定されました',
      monitorHint: '分析はバックグラウンドジョブとして実行。監視: /specweave:jobs',
      discrepancyTypes: [
        '未文書化のパブリックAPI',
        '古いドキュメント',
        '欠落しているADR',
        'ナレッジサイロ',
      ],
    },
    ko: {
      header: '📚 브라운필드 문서 분석',
      subheader: '기존 코드베이스의 문서 격차 분석',
      explanation: '이 기능은 기존 코드를 분석하여 리빙 문서 생성을 지원합니다:',
      analyzeQuestion: '코드베이스의 문서 격차를 분석할까요?',
      skipped: '브라운필드 분석 건너뜀. 나중에 실행: /specweave:analyze-brownfield',
      detectedDocs: '발견된 문서:',
      useDetectedDocs: '이 문서 위치를 사용할까요?',
      customDocsPath: '문서 위치 입력 (상대 경로):',
      selectDepth: '분석 깊이 선택:',
      depthQuick: '빠름 (5-10분) - 구조 및 내보내기만',
      depthStandard: '표준 (30-60분) - 전체 코드 분석',
      depthDeep: '심층 (1-2시간) - 의미 분석 + git 기록',
      starting: '✓ 브라운필드 분석이 구성됨',
      monitorHint: '분석은 백그라운드 작업으로 실행됩니다. 모니터링: /specweave:jobs',
      discrepancyTypes: [
        '문서화되지 않은 공개 API',
        '오래된 문서',
        '누락된 ADR',
        '지식 사일로',
      ],
    },
    pt: {
      header: '📚 Análise de Documentação Brownfield',
      subheader: 'Analisar base de código existente para lacunas de documentação',
      explanation: 'Esta função ajuda a criar docs vivos analisando seu código existente:',
      analyzeQuestion: 'Analisar base de código para lacunas de documentação?',
      skipped: 'Análise brownfield ignorada. Execute depois: /specweave:analyze-brownfield',
      detectedDocs: 'Documentação encontrada:',
      useDetectedDocs: 'Usar esta localização de documentação?',
      customDocsPath: 'Digite localização da documentação (caminho relativo):',
      selectDepth: 'Selecione profundidade de análise:',
      depthQuick: 'Rápido (5-10 min) - Apenas estrutura e exportações',
      depthStandard: 'Padrão (30-60 min) - Análise completa de código',
      depthDeep: 'Profundo (1-2 horas) - Análise semântica + histórico git',
      starting: '✓ Análise brownfield configurada',
      monitorHint: 'A análise será executada em segundo plano. Monitorar: /specweave:jobs',
      discrepancyTypes: [
        'APIs públicas não documentadas',
        'Documentação obsoleta',
        'ADRs ausentes',
        'Silos de conhecimento',
      ],
    },
  };
  return strings[language] || strings.en;
}

/**
 * Common documentation folder patterns to detect
 */
const DOC_FOLDER_PATTERNS = [
  'docs',
  'documentation',
  'doc',
  'wiki',
  '.wiki',
  'guide',
  'guides',
  'manual',
  'manuals',
];

/**
 * Detect existing documentation locations in a project
 */
export function detectExistingDocsLocations(targetDir: string): DetectedDocsLocation[] {
  const locations: DetectedDocsLocation[] = [];

  // Check common doc folders
  for (const pattern of DOC_FOLDER_PATTERNS) {
    const docPath = path.join(targetDir, pattern);
    if (fs.existsSync(docPath) && fs.statSync(docPath).isDirectory()) {
      const fileCount = countDocFiles(docPath);
      if (fileCount > 0) {
        locations.push({
          path: pattern,
          type: 'markdown',
          fileCount,
        });
      }
    }
  }

  // Check for README files
  const readmePatterns = ['README.md', 'README.rst', 'README.txt', 'readme.md'];
  for (const readme of readmePatterns) {
    if (fs.existsSync(path.join(targetDir, readme))) {
      locations.push({
        path: readme,
        type: 'readme',
        fileCount: 1,
      });
      break; // Only count one README
    }
  }

  // Check for JSDoc/TSDoc in source files
  const srcDir = path.join(targetDir, 'src');
  if (fs.existsSync(srcDir)) {
    const hasJsDoc = checkForJsDoc(srcDir);
    if (hasJsDoc) {
      locations.push({
        path: 'src/',
        type: 'jsdoc',
        fileCount: hasJsDoc,
      });
    }
  }

  return locations;
}

/**
 * Count markdown files in a directory (recursive)
 */
function countDocFiles(dir: string, maxDepth = 3): number {
  if (maxDepth <= 0) return 0;

  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countDocFiles(fullPath, maxDepth - 1);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        count++;
      }
    }
  } catch {
    // Ignore permission errors
  }
  return count;
}

/**
 * Check for JSDoc comments in source files
 */
function checkForJsDoc(srcDir: string): number {
  let filesWithDocs = 0;
  try {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(srcDir, entry.name);
      if (entry.isDirectory()) {
        filesWithDocs += checkForJsDoc(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('/**') && content.includes('@')) {
          filesWithDocs++;
        }
      }
    }
  } catch {
    // Ignore permission errors
  }
  return filesWithDocs;
}

/**
 * Prompt user for brownfield analysis configuration
 *
 * @param targetDir - Project directory
 * @param language - Language for translations
 * @returns Brownfield analysis configuration
 */
export async function promptBrownfieldAnalysis(
  targetDir: string,
  language: SupportedLanguage = 'en'
): Promise<BrownfieldAnalysisConfig> {
  const strings = getBrownfieldStrings(language);

  console.log('');
  console.log(chalk.cyan.bold(strings.header));
  console.log(chalk.gray('   ' + strings.subheader));
  console.log('');

  // Show explanation
  console.log(chalk.white(strings.explanation));
  for (const discType of strings.discrepancyTypes) {
    console.log(chalk.gray(`   • ${discType}`));
  }
  console.log('');

  // Ask if user wants analysis
  const wantsAnalysis = await confirm({
    message: strings.analyzeQuestion,
    default: true,
  });

  if (!wantsAnalysis) {
    console.log(chalk.gray(`   ${strings.skipped}`));
    return { enabled: false, analysisDepth: 'quick' };
  }

  // Detect existing docs
  const detectedDocs = detectExistingDocsLocations(targetDir);

  let sourceDocsPath: string | undefined;

  if (detectedDocs.length > 0) {
    console.log('');
    console.log(chalk.gray(`   ${strings.detectedDocs}`));
    for (const doc of detectedDocs) {
      console.log(chalk.gray(`     • ${doc.path} (${doc.fileCount} files, ${doc.type})`));
    }
    console.log('');

    const useDetected = await confirm({
      message: strings.useDetectedDocs,
      default: true,
    });

    if (useDetected) {
      // Use the first markdown folder, or first detected location
      const mdLoc = detectedDocs.find(d => d.type === 'markdown');
      sourceDocsPath = mdLoc?.path || detectedDocs[0].path;
    } else {
      sourceDocsPath = await input({
        message: strings.customDocsPath,
        default: 'docs/',
      });
    }
  }

  // Select analysis depth
  const depth = await select<AnalysisDepth>({
    message: strings.selectDepth,
    choices: [
      {
        name: strings.depthQuick,
        value: 'quick' as const,
      },
      {
        name: strings.depthStandard,
        value: 'standard' as const,
      },
      {
        name: strings.depthDeep,
        value: 'deep' as const,
      },
    ],
    default: 'standard',
  });

  console.log('');
  console.log(chalk.green(`   ${strings.starting}`));
  console.log(chalk.gray(`   ${strings.monitorHint}`));
  console.log('');

  return {
    enabled: true,
    sourceDocsPath,
    analysisDepth: depth,
  };
}

/**
 * Update config.json with brownfield analysis configuration
 *
 * @param targetDir - Project directory
 * @param config - Brownfield analysis configuration
 */
export function updateConfigWithBrownfield(
  targetDir: string,
  config: BrownfieldAnalysisConfig
): void {
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('⚠️  config.json not found'));
    return;
  }

  const existingConfig = fs.readJsonSync(configPath);

  existingConfig.brownfield = {
    analysisEnabled: config.enabled,
    sourceDocsPath: config.sourceDocsPath,
    analysisDepth: config.analysisDepth,
    lastAnalysis: null,
  };

  fs.writeJsonSync(configPath, existingConfig, { spaces: 2 });
}
