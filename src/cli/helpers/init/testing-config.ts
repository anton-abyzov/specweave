/**
 * Testing configuration prompts
 * Handles test mode selection and coverage targets
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select, input } from '@inquirer/prompts';
import type { TestMode, TestingConfig } from './types.js';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { WIZARD_BACK, createGoBackChoice, type WizardResult } from './wizard-navigation.js';

/**
 * Get the default coverage target based on the selected test mode.
 * TDD mode defaults to 90%, test-after to 80%, manual/none to 0%.
 */
export function getCoverageDefault(testMode: TestMode): number {
  switch (testMode) {
    case 'TDD': return 90;
    case 'test-after': return 80;
    default: return 0;
  }
}

/**
 * Get translated strings for testing configuration
 */
export function getTestingStrings(language: SupportedLanguage): {
  header: string;
  subheader: string;
  guidance: string;
  tddHint: string;
  testAfterHint: string;
  manualHint: string;
  noneHint: string;
  selectApproach: string;
  tddOption: string;
  testAfterOption: string;
  manualOption: string;
  noneOption: string;
  selectCoverage: string;
  coverageNone: string;
  coverage50: string;
  coverage70: string;
  coverage80: string;
  coverage90: string;
  coverage100: string;
  coverageCustom: string;
  enterCustom: string;
  coverageValidation: string;
  selectedTesting: string;
  selectedCoverage: string;
  noCoverageTarget: string;
  configNotFound: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getTestingStrings>> = {
    en: {
      header: '🧪 Testing Configuration',
      subheader: 'Configure your default testing approach and coverage targets',
      guidance: '💡 Quick Guide:',
      tddHint: '🔴 TDD: Tests first → Better design (critical systems)',
      testAfterHint: '🔵 Test-After: Code first → Fast iteration (most projects)',
      manualHint: '🟡 Manual: Ad-hoc tests → Flexible (startups, MVPs)',
      noneHint: '⚪ None: No tests → Fastest (hackathons, experiments)',
      selectApproach: 'Select your testing approach:',
      tddOption: '🔴 TDD - Write tests first (Recommended)',
      testAfterOption: '🔵 Test-After - Implement first, test later (most projects)',
      manualOption: '🟡 Manual - Test when needed, no strict rules (flexible)',
      noneOption: '⚪ None - Skip testing entirely (hackathons, experiments)',
      selectCoverage: 'Select your coverage target level:',
      coverageNone: '0% - No coverage tracking (fastest iteration)',
      coverage50: '50% - Minimal (just critical paths)',
      coverage70: '70% - Moderate (good for most projects)',
      coverage80: '80% - Good (recommended for production)',
      coverage90: '90% - High (comprehensive coverage)',
      coverage100: '100% - Full coverage (strict)',
      coverageCustom: 'Custom (enter your own value 0-100)',
      enterCustom: 'Enter custom coverage target (0-100):',
      coverageValidation: 'Coverage target must be between 0% and 100%',
      selectedTesting: '✔ Testing:',
      selectedCoverage: '✔ Coverage Target:',
      noCoverageTarget: '✔ Coverage: Not tracked',
      configNotFound: '⚠️  config.json not found, cannot update testing configuration',
    },
    ru: {
      header: '🧪 Конфигурация тестирования',
      subheader: 'Настройте подход к тестированию по умолчанию и целевые показатели покрытия',
      guidance: '💡 Краткое руководство:',
      tddHint: '🔴 TDD: Сначала тесты → Лучший дизайн (критичные системы)',
      testAfterHint: '🔵 Test-After: Сначала код → Быстрая итерация (большинство проектов)',
      manualHint: '🟡 Ручное: Тесты по необходимости → Гибко (стартапы, MVP)',
      noneHint: '⚪ Без тестов: Пропустить → Быстро (хакатоны, эксперименты)',
      selectApproach: 'Выберите подход к тестированию:',
      tddOption: '🔴 TDD - Сначала тесты (Рекомендуется)',
      testAfterOption: '🔵 Test-After - Сначала код, потом тесты (большинство проектов)',
      manualOption: '🟡 Ручное - Тесты по необходимости, без строгих правил (гибко)',
      noneOption: '⚪ Без тестов - Пропустить тестирование (хакатоны, эксперименты)',
      selectCoverage: 'Выберите целевой уровень покрытия:',
      coverageNone: '0% - Без отслеживания покрытия (быстрая итерация)',
      coverage50: '50% - Минимум (только критичные пути)',
      coverage70: '70% - Умеренно (подходит для большинства проектов)',
      coverage80: '80% - Хорошо (рекомендуется для production)',
      coverage90: '90% - Высокое (полное покрытие)',
      coverage100: '100% - Полное покрытие (строгое)',
      coverageCustom: 'Свое значение (введите 0-100)',
      enterCustom: 'Введите целевое покрытие (0-100):',
      coverageValidation: 'Целевое покрытие должно быть между 0% и 100%',
      selectedTesting: '✔ Тестирование:',
      selectedCoverage: '✔ Целевое покрытие:',
      noCoverageTarget: '✔ Покрытие: Не отслеживается',
      configNotFound: '⚠️  config.json не найден, невозможно обновить конфигурацию тестирования',
    },
    es: {
      header: '🧪 Configuración de pruebas',
      subheader: 'Configure su enfoque de pruebas predeterminado y objetivos de cobertura',
      guidance: '💡 Guía rápida:',
      tddHint: '🔴 TDD: Pruebas primero → Mejor diseño (sistemas críticos)',
      testAfterHint: '🔵 Test-After: Código primero → Iteración rápida (mayoría de proyectos)',
      manualHint: '🟡 Manual: Pruebas ad-hoc → Flexible (startups, MVPs)',
      noneHint: '⚪ Ninguno: Sin pruebas → Más rápido (hackathons, experimentos)',
      selectApproach: 'Seleccione su enfoque de pruebas:',
      tddOption: '🔴 TDD - Escribir pruebas primero (Recomendado)',
      testAfterOption: '🔵 Test-After - Implementar primero, probar después (mayoría de proyectos)',
      manualOption: '🟡 Manual - Probar cuando sea necesario, sin reglas estrictas (flexible)',
      noneOption: '⚪ Ninguno - Omitir pruebas completamente (hackathons, experimentos)',
      selectCoverage: 'Seleccione su nivel de cobertura objetivo:',
      coverageNone: '0% - Sin seguimiento de cobertura (iteración más rápida)',
      coverage50: '50% - Mínimo (solo rutas críticas)',
      coverage70: '70% - Moderado (bueno para la mayoría de proyectos)',
      coverage80: '80% - Bueno (recomendado para producción)',
      coverage90: '90% - Alto (cobertura completa)',
      coverage100: '100% - Cobertura total (estricto)',
      coverageCustom: 'Personalizado (ingrese valor 0-100)',
      enterCustom: 'Ingrese cobertura objetivo personalizada (0-100):',
      coverageValidation: 'La cobertura objetivo debe estar entre 0% y 100%',
      selectedTesting: '✔ Pruebas:',
      selectedCoverage: '✔ Cobertura objetivo:',
      noCoverageTarget: '✔ Cobertura: No rastreada',
      configNotFound: '⚠️  config.json no encontrado, no se puede actualizar la configuración de pruebas',
    },
    zh: {
      header: '🧪 测试配置',
      subheader: '配置默认测试方法和覆盖率目标',
      guidance: '💡 快速指南:',
      tddHint: '🔴 TDD: 先测试 → 更好的设计 (关键系统)',
      testAfterHint: '🔵 后置测试: 先代码 → 快速迭代 (大多数项目)',
      manualHint: '🟡 手动: 按需测试 → 灵活 (初创企业, MVP)',
      noneHint: '⚪ 无测试: 跳过 → 最快 (黑客马拉松, 实验)',
      selectApproach: '选择您的测试方法：',
      tddOption: '🔴 TDD - 先写测试（推荐）',
      testAfterOption: '🔵 后置测试 - 先实现后测试（大多数项目）',
      manualOption: '🟡 手动 - 按需测试，无严格规则（灵活）',
      noneOption: '⚪ 无测试 - 完全跳过测试（黑客马拉松, 实验）',
      selectCoverage: '选择您的覆盖率目标级别：',
      coverageNone: '0% - 不跟踪覆盖率（最快迭代）',
      coverage50: '50% - 最低限度（仅关键路径）',
      coverage70: '70% - 中等（适合大多数项目）',
      coverage80: '80% - 良好（推荐用于生产）',
      coverage90: '90% - 高（全面覆盖）',
      coverage100: '100% - 完全覆盖（严格）',
      coverageCustom: '自定义（输入0-100）',
      enterCustom: '输入自定义覆盖率目标（0-100）：',
      coverageValidation: '覆盖率目标必须在0%到100%之间',
      selectedTesting: '✔ 测试：',
      selectedCoverage: '✔ 覆盖率目标：',
      noCoverageTarget: '✔ 覆盖率：不跟踪',
      configNotFound: '⚠️  未找到config.json，无法更新测试配置',
    },
    de: {
      header: '🧪 Test-Konfiguration',
      subheader: 'Konfigurieren Sie Ihren Standard-Testansatz und Abdeckungsziele',
      guidance: '💡 Kurzanleitung:',
      tddHint: '🔴 TDD: Tests zuerst → Besseres Design (kritische Systeme)',
      testAfterHint: '🔵 Test-After: Code zuerst → Schnelle Iteration (meiste Projekte)',
      manualHint: '🟡 Manuell: Tests bei Bedarf → Flexibel (Startups, MVPs)',
      noneHint: '⚪ Keine: Tests überspringen → Am schnellsten (Hackathons, Experimente)',
      selectApproach: 'Wählen Sie Ihren Testansatz:',
      tddOption: '🔴 TDD - Zuerst Tests schreiben (Empfohlen)',
      testAfterOption: '🔵 Test-After - Erst implementieren, dann testen (meiste Projekte)',
      manualOption: '🟡 Manuell - Testen bei Bedarf, keine strengen Regeln (flexibel)',
      noneOption: '⚪ Keine - Tests komplett überspringen (Hackathons, Experimente)',
      selectCoverage: 'Wählen Sie Ihr Abdeckungsziel:',
      coverageNone: '0% - Keine Abdeckungsverfolgung (schnellste Iteration)',
      coverage50: '50% - Minimal (nur kritische Pfade)',
      coverage70: '70% - Moderat (gut für die meisten Projekte)',
      coverage80: '80% - Gut (empfohlen für Produktion)',
      coverage90: '90% - Hoch (umfassende Abdeckung)',
      coverage100: '100% - Volle Abdeckung (streng)',
      coverageCustom: 'Benutzerdefiniert (Wert 0-100 eingeben)',
      enterCustom: 'Geben Sie ein benutzerdefiniertes Abdeckungsziel ein (0-100):',
      coverageValidation: 'Abdeckungsziel muss zwischen 0% und 100% liegen',
      selectedTesting: '✔ Testen:',
      selectedCoverage: '✔ Abdeckungsziel:',
      noCoverageTarget: '✔ Abdeckung: Nicht verfolgt',
      configNotFound: '⚠️  config.json nicht gefunden, kann Testkonfiguration nicht aktualisieren',
    },
    fr: {
      header: '🧪 Configuration des tests',
      subheader: 'Configurez votre approche de test par défaut et vos objectifs de couverture',
      guidance: '💡 Guide rapide:',
      tddHint: '🔴 TDD: Tests d\'abord → Meilleur design (systèmes critiques)',
      testAfterHint: '🔵 Test-After: Code d\'abord → Itération rapide (plupart des projets)',
      manualHint: '🟡 Manuel: Tests ad-hoc → Flexible (startups, MVPs)',
      noneHint: '⚪ Aucun: Pas de tests → Plus rapide (hackathons, expériences)',
      selectApproach: 'Sélectionnez votre approche de test :',
      tddOption: '🔴 TDD - Écrire les tests en premier (Recommandé)',
      testAfterOption: '🔵 Test-After - Implémenter d\'abord, tester ensuite (plupart des projets)',
      manualOption: '🟡 Manuel - Tester quand nécessaire, pas de règles strictes (flexible)',
      noneOption: '⚪ Aucun - Ignorer les tests complètement (hackathons, expériences)',
      selectCoverage: 'Sélectionnez votre niveau de couverture cible :',
      coverageNone: '0% - Pas de suivi de couverture (itération la plus rapide)',
      coverage50: '50% - Minimal (seulement les chemins critiques)',
      coverage70: '70% - Modéré (bon pour la plupart des projets)',
      coverage80: '80% - Bon (recommandé pour la production)',
      coverage90: '90% - Élevé (couverture complète)',
      coverage100: '100% - Couverture totale (strict)',
      coverageCustom: 'Personnalisé (entrez une valeur 0-100)',
      enterCustom: 'Entrez une couverture cible personnalisée (0-100) :',
      coverageValidation: 'La couverture cible doit être entre 0% et 100%',
      selectedTesting: '✔ Tests :',
      selectedCoverage: '✔ Couverture cible :',
      noCoverageTarget: '✔ Couverture : Non suivie',
      configNotFound: '⚠️  config.json non trouvé, impossible de mettre à jour la configuration des tests',
    },
    ja: {
      header: '🧪 テスト設定',
      subheader: 'デフォルトのテストアプローチとカバレッジ目標を設定します',
      guidance: '💡 クイックガイド:',
      tddHint: '🔴 TDD: テスト先行 → 良い設計 (クリティカルシステム)',
      testAfterHint: '🔵 後付け: コード先行 → 高速反復 (ほとんどのプロジェクト)',
      manualHint: '🟡 手動: 必要時テスト → 柔軟 (スタートアップ, MVP)',
      noneHint: '⚪ なし: テストスキップ → 最速 (ハッカソン, 実験)',
      selectApproach: 'テストアプローチを選択してください：',
      tddOption: '🔴 TDD - テストを先に書く（推奨）',
      testAfterOption: '🔵 テスト後付け - 先に実装、後でテスト（ほとんどのプロジェクト）',
      manualOption: '🟡 手動 - 必要時にテスト、厳格なルールなし（柔軟）',
      noneOption: '⚪ なし - テストを完全にスキップ（ハッカソン, 実験）',
      selectCoverage: 'カバレッジ目標レベルを選択してください：',
      coverageNone: '0% - カバレッジ追跡なし（最速反復）',
      coverage50: '50% - 最小限（クリティカルパスのみ）',
      coverage70: '70% - 中程度（ほとんどのプロジェクトに適切）',
      coverage80: '80% - 良好（本番に推奨）',
      coverage90: '90% - 高い（包括的カバレッジ）',
      coverage100: '100% - 完全カバレッジ（厳格）',
      coverageCustom: 'カスタム（0-100の値を入力）',
      enterCustom: 'カスタムカバレッジ目標を入力（0-100）：',
      coverageValidation: 'カバレッジ目標は0%から100%の間でなければなりません',
      selectedTesting: '✔ テスト：',
      selectedCoverage: '✔ カバレッジ目標：',
      noCoverageTarget: '✔ カバレッジ：追跡なし',
      configNotFound: '⚠️  config.jsonが見つかりません。テスト設定を更新できません',
    },
    ko: {
      header: '🧪 테스트 구성',
      subheader: '기본 테스트 접근 방식과 커버리지 목표를 구성합니다',
      guidance: '💡 빠른 가이드:',
      tddHint: '🔴 TDD: 테스트 먼저 → 더 나은 설계 (핵심 시스템)',
      testAfterHint: '🔵 후행: 코드 먼저 → 빠른 반복 (대부분 프로젝트)',
      manualHint: '🟡 수동: 필요시 테스트 → 유연 (스타트업, MVP)',
      noneHint: '⚪ 없음: 테스트 건너뛰기 → 가장 빠름 (해커톤, 실험)',
      selectApproach: '테스트 접근 방식을 선택하세요:',
      tddOption: '🔴 TDD - 테스트 먼저 작성 (권장)',
      testAfterOption: '🔵 테스트 후행 - 먼저 구현, 나중에 테스트 (대부분 프로젝트)',
      manualOption: '🟡 수동 - 필요시 테스트, 엄격한 규칙 없음 (유연)',
      noneOption: '⚪ 없음 - 테스트 완전히 건너뛰기 (해커톤, 실험)',
      selectCoverage: '커버리지 목표 수준을 선택하세요:',
      coverageNone: '0% - 커버리지 추적 없음 (가장 빠른 반복)',
      coverage50: '50% - 최소 (핵심 경로만)',
      coverage70: '70% - 중간 (대부분 프로젝트에 적합)',
      coverage80: '80% - 좋음 (프로덕션에 권장)',
      coverage90: '90% - 높음 (포괄적 커버리지)',
      coverage100: '100% - 완전 커버리지 (엄격)',
      coverageCustom: '사용자 지정 (0-100 값 입력)',
      enterCustom: '사용자 지정 커버리지 목표 입력 (0-100):',
      coverageValidation: '커버리지 목표는 0%에서 100% 사이여야 합니다',
      selectedTesting: '✔ 테스트:',
      selectedCoverage: '✔ 커버리지 목표:',
      noCoverageTarget: '✔ 커버리지: 추적 안 함',
      configNotFound: '⚠️  config.json을 찾을 수 없어 테스트 구성을 업데이트할 수 없습니다',
    },
    pt: {
      header: '🧪 Configuração de Testes',
      subheader: 'Configure sua abordagem de teste padrão e metas de cobertura',
      guidance: '💡 Guia rápido:',
      tddHint: '🔴 TDD: Testes primeiro → Melhor design (sistemas críticos)',
      testAfterHint: '🔵 Test-After: Código primeiro → Iteração rápida (maioria dos projetos)',
      manualHint: '🟡 Manual: Testes ad-hoc → Flexível (startups, MVPs)',
      noneHint: '⚪ Nenhum: Sem testes → Mais rápido (hackathons, experimentos)',
      selectApproach: 'Selecione sua abordagem de teste:',
      tddOption: '🔴 TDD - Escrever testes primeiro (Recomendado)',
      testAfterOption: '🔵 Test-After - Implementar primeiro, testar depois (maioria dos projetos)',
      manualOption: '🟡 Manual - Testar quando necessário, sem regras rígidas (flexível)',
      noneOption: '⚪ Nenhum - Pular testes completamente (hackathons, experimentos)',
      selectCoverage: 'Selecione seu nível de cobertura alvo:',
      coverageNone: '0% - Sem rastreamento de cobertura (iteração mais rápida)',
      coverage50: '50% - Mínimo (apenas caminhos críticos)',
      coverage70: '70% - Moderado (bom para maioria dos projetos)',
      coverage80: '80% - Bom (recomendado para produção)',
      coverage90: '90% - Alto (cobertura abrangente)',
      coverage100: '100% - Cobertura total (estrito)',
      coverageCustom: 'Personalizado (digite valor 0-100)',
      enterCustom: 'Digite a cobertura alvo personalizada (0-100):',
      coverageValidation: 'A cobertura alvo deve estar entre 0% e 100%',
      selectedTesting: '✔ Testes:',
      selectedCoverage: '✔ Cobertura Alvo:',
      noCoverageTarget: '✔ Cobertura: Não rastreada',
      configNotFound: '⚠️  config.json não encontrado, não é possível atualizar a configuração de testes',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Result of testing configuration
 */
export interface TestingConfigResult {
  testMode: TestMode;
  coverageTarget: number;
  /** Signal to go back to previous step */
  goBack?: typeof WIZARD_BACK;
}

/**
 * Prompt user for testing configuration
 *
 * @param language - Language for translations
 * @returns Testing configuration
 */
export async function promptTestingConfig(language: SupportedLanguage = 'en'): Promise<TestingConfigResult> {
  const strings = getTestingStrings(language);

  console.log('');
  console.log(chalk.cyan.bold(strings.header));
  console.log(chalk.gray('   ' + strings.subheader));
  console.log('');

  // Quick guide on testing approaches
  console.log(chalk.white(strings.guidance));
  console.log(chalk.gray('   ' + strings.tddHint));
  console.log(chalk.gray('   ' + strings.testAfterHint));
  console.log(chalk.gray('   ' + strings.manualHint));
  console.log(chalk.gray('   ' + strings.noneHint));
  console.log('');

  const testModeChoice = await select<TestMode | 'back'>({
    message: strings.selectApproach,
    choices: [
      {
        name: strings.tddOption,
        value: 'TDD' as TestMode | 'back',
      },
      {
        name: strings.testAfterOption,
        value: 'test-after' as TestMode | 'back',
      },
      {
        name: strings.manualOption,
        value: 'manual' as TestMode | 'back',
      },
      {
        name: strings.noneOption,
        value: 'none' as TestMode | 'back',
      },
      createGoBackChoice(language) as { name: string; value: TestMode | 'back' },
    ],
    default: 'TDD'
  });

  // Handle go back
  if (testModeChoice === 'back') {
    return { testMode: 'TDD', coverageTarget: 80, goBack: WIZARD_BACK };
  }

  const testMode = testModeChoice as TestMode;

  let coverageTarget = 0;

  // Only ask for coverage if not 'none' or 'manual' testing mode
  // For 'none' mode: no testing at all, coverage = 0
  // For 'manual' mode: ad-hoc testing, no strict coverage target, default to 0
  if (testMode !== 'none' && testMode !== 'manual') {
    const selectedCoverageLevel = await select<number | 'custom'>({
      message: strings.selectCoverage,
      choices: [
        {
          name: strings.coverageNone,
          value: 0 as number | 'custom',
        },
        {
          name: strings.coverage50,
          value: 50 as number | 'custom',
        },
        {
          name: strings.coverage70,
          value: 70 as number | 'custom',
        },
        {
          name: strings.coverage80,
          value: 80 as number | 'custom',
        },
        {
          name: strings.coverage90,
          value: 90 as number | 'custom',
        },
        {
          name: strings.coverage100,
          value: 100 as number | 'custom',
        },
        {
          name: strings.coverageCustom,
          value: 'custom' as number | 'custom',
        }
      ],
      default: getCoverageDefault(testMode)
    });

    if (selectedCoverageLevel === 'custom') {
      const customInput = await input({
        message: strings.enterCustom,
        default: '50',
        validate: (val: string) => {
          const num = parseInt(val, 10);
          if (isNaN(num) || num < 0 || num > 100) {
            return strings.coverageValidation;
          }
          return true;
        }
      });
      coverageTarget = parseInt(customInput, 10);
    } else {
      coverageTarget = selectedCoverageLevel as number;
    }
  }

  console.log('');
  console.log(chalk.green(`   ${strings.selectedTesting} ${testMode}`));
  if (testMode !== 'none' && testMode !== 'manual') {
    if (coverageTarget > 0) {
      console.log(chalk.green(`   ${strings.selectedCoverage} ${coverageTarget}%`));
    } else {
      console.log(chalk.green(`   ${strings.noCoverageTarget}`));
    }
  }
  console.log('');

  return { testMode, coverageTarget };
}

/**
 * Update config.json with testing configuration
 *
 * @param targetDir - Project directory
 * @param testMode - Selected test mode
 * @param coverageTarget - Selected coverage target
 * @param language - Language for translations
 */
export function updateConfigWithTesting(
  targetDir: string,
  testMode: TestMode,
  coverageTarget: number,
  language: SupportedLanguage = 'en'
): void {
  const strings = getTestingStrings(language);
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red(strings.configNotFound));
    return;
  }

  const config = fs.readJsonSync(configPath);

  // If coverage is 0 or mode is 'none'/'manual', don't track coverage at all
  const trackCoverage = coverageTarget > 0 && testMode !== 'none';

  config.testing = {
    defaultTestMode: testMode,
    defaultCoverageTarget: coverageTarget,
    coverageTargets: trackCoverage
      ? {
          unit: Math.min(coverageTarget + 5, 100),
          integration: coverageTarget,
          e2e: Math.min(coverageTarget + 10, 100)
        }
      : {
          unit: 0,
          integration: 0,
          e2e: 0
        }
  } satisfies TestingConfig;

  fs.writeJsonSync(configPath, config, { spaces: 2 });
}
