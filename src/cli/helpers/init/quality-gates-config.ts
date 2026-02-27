/**
 * Quality Gates configuration prompts
 * Handles auto mode quality enforcement settings during init
 *
 * Design rationale:
 * - requireLLMEval: Lightweight LLM check integrated in stop hook (fast, cheap)
 * - requireJudgeLLM: Heavy /sw:judge-llm call (slow, expensive, manual)
 * - Production preset enables lightweight checks, not heavy ones
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { WIZARD_BACK, createGoBackChoice, type WizardResult } from './wizard-navigation.js';

/**
 * Quality gate preset levels
 */
export type QualityGatePreset = 'production' | 'standard' | 'minimal' | 'none';

/**
 * Quality gate settings for auto mode
 */
export interface QualityGateSettings {
  requireTests: boolean;
  requireValidation: boolean;
  requireLLMEval: boolean;
  requireJudgeLLM: boolean;
  requireGrill: boolean;
  skipQualityGates: boolean;
}

/**
 * Result of quality gates configuration
 */
export interface QualityGatesConfigResult extends QualityGateSettings {
  preset: QualityGatePreset;
  /** Signal to go back to previous step */
  goBack?: typeof WIZARD_BACK;
}

/**
 * Get translated strings for quality gates configuration
 */
function getQualityGatesStrings(language: SupportedLanguage): {
  header: string;
  subheader: string;
  guidance: string;
  productionHint: string;
  standardHint: string;
  minimalHint: string;
  noneHint: string;
  selectLevel: string;
  productionOption: string;
  standardOption: string;
  minimalOption: string;
  noneOption: string;
  selected: string;
  configNotFound: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getQualityGatesStrings>> = {
    en: {
      header: '🛡️  Quality Gates Configuration',
      subheader: 'Configure auto mode quality enforcement for autonomous execution',
      guidance: '💡 Quick Guide:',
      productionHint: '🔒 Production: Tests MUST pass, LLM validates completion (mission-critical)',
      standardHint: '✅ Standard: Tests MUST pass, basic validation (recommended)',
      minimalHint: '⚡ Minimal: Validation only, no test requirement (fast iteration)',
      noneHint: '🚀 None: Skip all gates (hackathons, experiments)',
      selectLevel: 'Select quality gate enforcement level:',
      productionOption: '🔒 Production - Tests + Validation + LLM Check (Recommended for production)',
      standardOption: '✅ Standard - Tests + Validation (Recommended for most projects)',
      minimalOption: '⚡ Minimal - Validation only (Fast iteration)',
      noneOption: '🚀 None - Skip all quality gates (Hackathons, experiments)',
      selected: '✔ Quality Gates:',
      configNotFound: '⚠️  config.json not found, cannot update quality gates configuration',
    },
    ru: {
      header: '🛡️  Настройка контроля качества',
      subheader: 'Настройте контроль качества для автономного выполнения',
      guidance: '💡 Краткое руководство:',
      productionHint: '🔒 Production: Тесты ДОЛЖНЫ пройти, LLM проверяет завершение (критичные системы)',
      standardHint: '✅ Standard: Тесты ДОЛЖНЫ пройти, базовая валидация (рекомендуется)',
      minimalHint: '⚡ Minimal: Только валидация, без требования тестов (быстрая итерация)',
      noneHint: '🚀 None: Пропустить все проверки (хакатоны, эксперименты)',
      selectLevel: 'Выберите уровень контроля качества:',
      productionOption: '🔒 Production - Тесты + Валидация + LLM проверка (Для production)',
      standardOption: '✅ Standard - Тесты + Валидация (Для большинства проектов)',
      minimalOption: '⚡ Minimal - Только валидация (Быстрая итерация)',
      noneOption: '🚀 None - Пропустить все проверки (Хакатоны, эксперименты)',
      selected: '✔ Контроль качества:',
      configNotFound: '⚠️  config.json не найден, невозможно обновить настройки контроля качества',
    },
    es: {
      header: '🛡️  Configuracion de Controles de Calidad',
      subheader: 'Configure la aplicacion de calidad del modo automatico',
      guidance: '💡 Guia rapida:',
      productionHint: '🔒 Production: Los tests DEBEN pasar, LLM valida completitud (critico)',
      standardHint: '✅ Standard: Los tests DEBEN pasar, validacion basica (recomendado)',
      minimalHint: '⚡ Minimal: Solo validacion, sin requisito de tests (iteracion rapida)',
      noneHint: '🚀 None: Omitir todas las puertas (hackathons, experimentos)',
      selectLevel: 'Seleccione el nivel de aplicacion de calidad:',
      productionOption: '🔒 Production - Tests + Validacion + LLM (Para produccion)',
      standardOption: '✅ Standard - Tests + Validacion (Para la mayoria de proyectos)',
      minimalOption: '⚡ Minimal - Solo validacion (Iteracion rapida)',
      noneOption: '🚀 None - Omitir todas las puertas (Hackathons, experimentos)',
      selected: '✔ Controles de Calidad:',
      configNotFound: '⚠️  config.json no encontrado, no se pueden actualizar los controles',
    },
    zh: {
      header: '🛡️  质量门配置',
      subheader: '配置自动模式的质量控制设置',
      guidance: '💡 快速指南:',
      productionHint: '🔒 Production: 测试必须通过, LLM验证完成 (关键系统)',
      standardHint: '✅ Standard: 测试必须通过, 基本验证 (推荐)',
      minimalHint: '⚡ Minimal: 仅验证, 无测试要求 (快速迭代)',
      noneHint: '🚀 None: 跳过所有门控 (黑客马拉松, 实验)',
      selectLevel: '选择质量门控级别:',
      productionOption: '🔒 Production - 测试 + 验证 + LLM检查 (推荐用于生产)',
      standardOption: '✅ Standard - 测试 + 验证 (推荐用于大多数项目)',
      minimalOption: '⚡ Minimal - 仅验证 (快速迭代)',
      noneOption: '🚀 None - 跳过所有质量门控 (黑客马拉松, 实验)',
      selected: '✔ 质量门控:',
      configNotFound: '⚠️  未找到config.json, 无法更新质量门控配置',
    },
    de: {
      header: '🛡️  Qualitatskontrolle Konfiguration',
      subheader: 'Konfigurieren Sie die Qualitatsanforderungen fur den Auto-Modus',
      guidance: '💡 Kurzanleitung:',
      productionHint: '🔒 Production: Tests MUSSEN bestehen, LLM validiert Abschluss (kritisch)',
      standardHint: '✅ Standard: Tests MUSSEN bestehen, Basisvalidierung (empfohlen)',
      minimalHint: '⚡ Minimal: Nur Validierung, keine Testanforderung (schnelle Iteration)',
      noneHint: '🚀 None: Alle Gates uberspringen (Hackathons, Experimente)',
      selectLevel: 'Wahlen Sie das Qualitatskontroll-Level:',
      productionOption: '🔒 Production - Tests + Validierung + LLM (Fur Produktion)',
      standardOption: '✅ Standard - Tests + Validierung (Fur die meisten Projekte)',
      minimalOption: '⚡ Minimal - Nur Validierung (Schnelle Iteration)',
      noneOption: '🚀 None - Alle Gates uberspringen (Hackathons, Experimente)',
      selected: '✔ Qualitatskontrolle:',
      configNotFound: '⚠️  config.json nicht gefunden, kann Qualitatskontrolle nicht aktualisieren',
    },
    fr: {
      header: '🛡️  Configuration des Portes de Qualite',
      subheader: 'Configurez les controles de qualite du mode automatique',
      guidance: '💡 Guide rapide:',
      productionHint: '🔒 Production: Les tests DOIVENT passer, LLM valide (critique)',
      standardHint: '✅ Standard: Les tests DOIVENT passer, validation basique (recommande)',
      minimalHint: '⚡ Minimal: Validation seulement, pas de tests requis (iteration rapide)',
      noneHint: '🚀 None: Ignorer toutes les portes (hackathons, experiences)',
      selectLevel: 'Selectionnez le niveau de controle qualite :',
      productionOption: '🔒 Production - Tests + Validation + LLM (Pour production)',
      standardOption: '✅ Standard - Tests + Validation (Pour la plupart des projets)',
      minimalOption: '⚡ Minimal - Validation seulement (Iteration rapide)',
      noneOption: '🚀 None - Ignorer toutes les portes (Hackathons, experiences)',
      selected: '✔ Portes de Qualite :',
      configNotFound: '⚠️  config.json non trouve, impossible de mettre a jour la configuration',
    },
    ja: {
      header: '🛡️  品質ゲート設定',
      subheader: '自動モードの品質管理設定を構成します',
      guidance: '💡 クイックガイド:',
      productionHint: '🔒 Production: テスト必須, LLM完了検証 (ミッションクリティカル)',
      standardHint: '✅ Standard: テスト必須, 基本検証 (推奨)',
      minimalHint: '⚡ Minimal: 検証のみ, テスト不要 (高速イテレーション)',
      noneHint: '🚀 None: 全ゲートスキップ (ハッカソン, 実験)',
      selectLevel: '品質ゲートレベルを選択してください：',
      productionOption: '🔒 Production - テスト + 検証 + LLMチェック (本番推奨)',
      standardOption: '✅ Standard - テスト + 検証 (ほとんどのプロジェクト推奨)',
      minimalOption: '⚡ Minimal - 検証のみ (高速イテレーション)',
      noneOption: '🚀 None - 全ゲートスキップ (ハッカソン, 実験)',
      selected: '✔ 品質ゲート：',
      configNotFound: '⚠️  config.jsonが見つかりません。品質ゲート設定を更新できません',
    },
    ko: {
      header: '🛡️  품질 게이트 구성',
      subheader: '자동 모드의 품질 관리 설정을 구성합니다',
      guidance: '💡 빠른 가이드:',
      productionHint: '🔒 Production: 테스트 필수, LLM 완료 검증 (미션 크리티컬)',
      standardHint: '✅ Standard: 테스트 필수, 기본 검증 (권장)',
      minimalHint: '⚡ Minimal: 검증만, 테스트 불필요 (빠른 반복)',
      noneHint: '🚀 None: 모든 게이트 건너뛰기 (해커톤, 실험)',
      selectLevel: '품질 게이트 수준을 선택하세요:',
      productionOption: '🔒 Production - 테스트 + 검증 + LLM 검사 (프로덕션 권장)',
      standardOption: '✅ Standard - 테스트 + 검증 (대부분 프로젝트 권장)',
      minimalOption: '⚡ Minimal - 검증만 (빠른 반복)',
      noneOption: '🚀 None - 모든 게이트 건너뛰기 (해커톤, 실험)',
      selected: '✔ 품질 게이트:',
      configNotFound: '⚠️  config.json을 찾을 수 없어 품질 게이트 설정을 업데이트할 수 없습니다',
    },
    pt: {
      header: '🛡️  Configuracao de Portas de Qualidade',
      subheader: 'Configure a aplicacao de qualidade do modo automatico',
      guidance: '💡 Guia rapido:',
      productionHint: '🔒 Production: Testes DEVEM passar, LLM valida conclusao (critico)',
      standardHint: '✅ Standard: Testes DEVEM passar, validacao basica (recomendado)',
      minimalHint: '⚡ Minimal: Apenas validacao, sem requisito de testes (iteracao rapida)',
      noneHint: '🚀 None: Pular todas as portas (hackathons, experimentos)',
      selectLevel: 'Selecione o nivel de aplicacao de qualidade:',
      productionOption: '🔒 Production - Testes + Validacao + LLM (Para producao)',
      standardOption: '✅ Standard - Testes + Validacao (Para a maioria dos projetos)',
      minimalOption: '⚡ Minimal - Apenas validacao (Iteracao rapida)',
      noneOption: '🚀 None - Pular todas as portas (Hackathons, experimentos)',
      selected: '✔ Portas de Qualidade:',
      configNotFound: '⚠️  config.json nao encontrado, nao e possivel atualizar a configuracao',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Get quality gate settings for a preset
 *
 * @param preset - Quality gate preset level
 * @returns Quality gate settings
 */
export function getQualityGatePreset(preset: QualityGatePreset): QualityGateSettings {
  const presets: Record<QualityGatePreset, QualityGateSettings> = {
    production: {
      requireTests: true,
      requireValidation: true,
      requireLLMEval: true, // Lightweight LLM check in stop hook
      requireJudgeLLM: false, // Heavy /sw:judge-llm - too expensive for every run
      requireGrill: true, // Grill report required before closure
      skipQualityGates: false,
    },
    standard: {
      requireTests: true,
      requireValidation: true,
      requireLLMEval: false,
      requireJudgeLLM: false,
      requireGrill: true,
      skipQualityGates: false,
    },
    minimal: {
      requireTests: false,
      requireValidation: true,
      requireLLMEval: false,
      requireJudgeLLM: false,
      requireGrill: false,
      skipQualityGates: false,
    },
    none: {
      requireTests: false,
      requireValidation: false,
      requireLLMEval: false,
      requireJudgeLLM: false,
      requireGrill: false,
      skipQualityGates: true,
    },
  };

  return presets[preset];
}

/**
 * Prompt user for quality gates configuration
 *
 * @param language - Language for translations
 * @returns Quality gates configuration
 */
export async function promptQualityGatesConfig(
  language: SupportedLanguage = 'en'
): Promise<QualityGatesConfigResult> {
  const strings = getQualityGatesStrings(language);

  console.log('');
  console.log(chalk.cyan.bold(strings.header));
  console.log(chalk.gray('   ' + strings.subheader));
  console.log('');

  // Quick guide on quality gate levels
  console.log(chalk.white(strings.guidance));
  console.log(chalk.gray('   ' + strings.productionHint));
  console.log(chalk.gray('   ' + strings.standardHint));
  console.log(chalk.gray('   ' + strings.minimalHint));
  console.log(chalk.gray('   ' + strings.noneHint));
  console.log('');

  const presetChoice = await select<QualityGatePreset | 'back'>({
    message: strings.selectLevel,
    choices: [
      {
        name: strings.productionOption,
        value: 'production' as QualityGatePreset | 'back',
      },
      {
        name: strings.standardOption,
        value: 'standard' as QualityGatePreset | 'back',
      },
      {
        name: strings.minimalOption,
        value: 'minimal' as QualityGatePreset | 'back',
      },
      {
        name: strings.noneOption,
        value: 'none' as QualityGatePreset | 'back',
      },
      createGoBackChoice(language) as { name: string; value: QualityGatePreset | 'back' },
    ],
    default: 'standard',
  });

  // Handle go back
  if (presetChoice === 'back') {
    return {
      preset: 'standard',
      ...getQualityGatePreset('standard'),
      goBack: WIZARD_BACK,
    };
  }

  const preset = presetChoice as QualityGatePreset;
  const settings = getQualityGatePreset(preset);

  console.log('');
  console.log(chalk.green(`   ${strings.selected} ${preset}`));
  console.log('');

  return {
    preset,
    ...settings,
  };
}

/**
 * Update config.json with quality gates configuration
 *
 * @param targetDir - Project directory
 * @param preset - Selected quality gate preset
 * @param language - Language for translations
 */
export function updateConfigWithQualityGates(
  targetDir: string,
  preset: QualityGatePreset,
  language: SupportedLanguage = 'en'
): void {
  const strings = getQualityGatesStrings(language);
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red(strings.configNotFound));
    return;
  }

  const config = fs.readJsonSync(configPath);
  const settings = getQualityGatePreset(preset);

  // Initialize auto section if missing
  if (!config.auto) {
    config.auto = {};
  }

  // Merge quality gate settings into auto config
  config.auto = {
    ...config.auto,
    requireTests: settings.requireTests,
    requireValidation: settings.requireValidation,
    requireLLMEval: settings.requireLLMEval,
    requireJudgeLLM: settings.requireJudgeLLM,
    skipQualityGates: settings.skipQualityGates,
  };

  // Set grill requirement at top level (used by completion-validator)
  if (!config.grill) {
    config.grill = {};
  }
  config.grill.required = settings.requireGrill;

  fs.writeJsonSync(configPath, config, { spaces: 2 });
}
