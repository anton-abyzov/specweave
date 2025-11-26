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

/**
 * Get translated strings for testing configuration
 */
function getTestingStrings(language: SupportedLanguage): {
  header: string;
  subheader: string;
  guidance: string;
  tddTitle: string;
  tddBestFor: string;
  tddBenefits: string;
  tddTradeoff: string;
  testAfterTitle: string;
  testAfterBestFor: string;
  testAfterBenefits: string;
  testAfterTradeoff: string;
  manualTitle: string;
  manualBestFor: string;
  manualBenefits: string;
  manualTradeoff: string;
  selectApproach: string;
  tddOption: string;
  testAfterOption: string;
  manualOption: string;
  selectCoverage: string;
  coverage70: string;
  coverage80: string;
  coverage90: string;
  coverageCustom: string;
  enterCustom: string;
  coverageValidation: string;
  selectedTesting: string;
  selectedCoverage: string;
  configNotFound: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getTestingStrings>> = {
    en: {
      header: '🧪 Testing Configuration',
      subheader: 'Configure your default testing approach and coverage targets',
      guidance: '💡 Which testing approach should you choose?',
      tddTitle: '✓ TDD (Test-Driven Development)',
      tddBestFor: 'Best for: Complex business logic, critical features, refactoring',
      tddBenefits: 'Benefits: Better design, fewer bugs, confidence in changes',
      tddTradeoff: 'Tradeoff: Slower initial development, requires discipline',
      testAfterTitle: '✓ Test-After',
      testAfterBestFor: 'Best for: Most projects, rapid prototyping, exploratory work',
      testAfterBenefits: 'Benefits: Fast iteration, flexible design, good coverage',
      testAfterTradeoff: 'Tradeoff: May miss edge cases, harder to test after design',
      manualTitle: '✓ Manual Testing',
      manualBestFor: 'Best for: Quick prototypes, proof-of-concepts, learning',
      manualBenefits: 'Benefits: Fastest development, no test maintenance',
      manualTradeoff: 'Tradeoff: No safety net, regressions, hard to refactor',
      selectApproach: 'Select your testing approach:',
      tddOption: '🔴 TDD - Write tests first (recommended for production apps)',
      testAfterOption: '🔵 Test-After - Implement first, test later (balanced approach)',
      manualOption: '🟡 Manual - No automated tests (prototypes only)',
      selectCoverage: 'Select your coverage target level:',
      coverage70: '70% - Acceptable (core paths covered)',
      coverage80: '80% - Good (recommended - most paths covered)',
      coverage90: '90% - Excellent (comprehensive coverage)',
      coverageCustom: 'Custom (enter your own value)',
      enterCustom: 'Enter custom coverage target (70-95):',
      coverageValidation: 'Coverage target must be between 70% and 95%',
      selectedTesting: '✔ Testing:',
      selectedCoverage: '✔ Coverage Target:',
      configNotFound: '⚠️  config.json not found, cannot update testing configuration',
    },
    ru: {
      header: '🧪 Конфигурация тестирования',
      subheader: 'Настройте подход к тестированию по умолчанию и целевые показатели покрытия',
      guidance: '💡 Какой подход к тестированию выбрать?',
      tddTitle: '✓ TDD (Разработка через тестирование)',
      tddBestFor: 'Подходит для: Сложной бизнес-логики, критических функций, рефакторинга',
      tddBenefits: 'Преимущества: Лучший дизайн, меньше багов, уверенность в изменениях',
      tddTradeoff: 'Компромисс: Медленная начальная разработка, требует дисциплины',
      testAfterTitle: '✓ Test-After (Тестирование после)',
      testAfterBestFor: 'Подходит для: Большинства проектов, быстрого прототипирования, исследований',
      testAfterBenefits: 'Преимущества: Быстрая итерация, гибкий дизайн, хорошее покрытие',
      testAfterTradeoff: 'Компромисс: Могут быть упущены крайние случаи, сложнее тестировать после проектирования',
      manualTitle: '✓ Ручное тестирование',
      manualBestFor: 'Подходит для: Быстрых прототипов, проверки концепций, обучения',
      manualBenefits: 'Преимущества: Самая быстрая разработка, нет поддержки тестов',
      manualTradeoff: 'Компромисс: Нет страховки, регрессии, сложно рефакторить',
      selectApproach: 'Выберите подход к тестированию:',
      tddOption: '🔴 TDD - Сначала тесты (рекомендуется для production)',
      testAfterOption: '🔵 Test-After - Сначала код, потом тесты (сбалансированный)',
      manualOption: '🟡 Ручное - Без автоматических тестов (только прототипы)',
      selectCoverage: 'Выберите целевой уровень покрытия:',
      coverage70: '70% - Приемлемо (основные пути покрыты)',
      coverage80: '80% - Хорошо (рекомендуется - большинство путей покрыто)',
      coverage90: '90% - Отлично (полное покрытие)',
      coverageCustom: 'Свое значение (введите вручную)',
      enterCustom: 'Введите целевое покрытие (70-95):',
      coverageValidation: 'Целевое покрытие должно быть между 70% и 95%',
      selectedTesting: '✔ Тестирование:',
      selectedCoverage: '✔ Целевое покрытие:',
      configNotFound: '⚠️  config.json не найден, невозможно обновить конфигурацию тестирования',
    },
    es: {
      header: '🧪 Configuración de pruebas',
      subheader: 'Configure su enfoque de pruebas predeterminado y objetivos de cobertura',
      guidance: '💡 ¿Qué enfoque de pruebas debería elegir?',
      tddTitle: '✓ TDD (Desarrollo Guiado por Pruebas)',
      tddBestFor: 'Mejor para: Lógica de negocio compleja, funciones críticas, refactorización',
      tddBenefits: 'Beneficios: Mejor diseño, menos errores, confianza en los cambios',
      tddTradeoff: 'Compensación: Desarrollo inicial más lento, requiere disciplina',
      testAfterTitle: '✓ Test-After (Pruebas después)',
      testAfterBestFor: 'Mejor para: La mayoría de proyectos, prototipado rápido, trabajo exploratorio',
      testAfterBenefits: 'Beneficios: Iteración rápida, diseño flexible, buena cobertura',
      testAfterTradeoff: 'Compensación: Puede perder casos límite, más difícil probar después del diseño',
      manualTitle: '✓ Pruebas manuales',
      manualBestFor: 'Mejor para: Prototipos rápidos, pruebas de concepto, aprendizaje',
      manualBenefits: 'Beneficios: Desarrollo más rápido, sin mantenimiento de pruebas',
      manualTradeoff: 'Compensación: Sin red de seguridad, regresiones, difícil refactorizar',
      selectApproach: 'Seleccione su enfoque de pruebas:',
      tddOption: '🔴 TDD - Escribir pruebas primero (recomendado para producción)',
      testAfterOption: '🔵 Test-After - Implementar primero, probar después (enfoque equilibrado)',
      manualOption: '🟡 Manual - Sin pruebas automatizadas (solo prototipos)',
      selectCoverage: 'Seleccione su nivel de cobertura objetivo:',
      coverage70: '70% - Aceptable (rutas principales cubiertas)',
      coverage80: '80% - Bueno (recomendado - mayoría de rutas cubiertas)',
      coverage90: '90% - Excelente (cobertura completa)',
      coverageCustom: 'Personalizado (ingrese su propio valor)',
      enterCustom: 'Ingrese cobertura objetivo personalizada (70-95):',
      coverageValidation: 'La cobertura objetivo debe estar entre 70% y 95%',
      selectedTesting: '✔ Pruebas:',
      selectedCoverage: '✔ Cobertura objetivo:',
      configNotFound: '⚠️  config.json no encontrado, no se puede actualizar la configuración de pruebas',
    },
    zh: {
      header: '🧪 测试配置',
      subheader: '配置默认测试方法和覆盖率目标',
      guidance: '💡 应该选择哪种测试方法？',
      tddTitle: '✓ TDD（测试驱动开发）',
      tddBestFor: '适用于：复杂业务逻辑、关键功能、重构',
      tddBenefits: '优点：更好的设计、更少的bug、对变更有信心',
      tddTradeoff: '权衡：初期开发较慢、需要纪律',
      testAfterTitle: '✓ 后置测试',
      testAfterBestFor: '适用于：大多数项目、快速原型、探索性工作',
      testAfterBenefits: '优点：快速迭代、灵活设计、良好覆盖',
      testAfterTradeoff: '权衡：可能遗漏边缘情况、设计后测试更难',
      manualTitle: '✓ 手动测试',
      manualBestFor: '适用于：快速原型、概念验证、学习',
      manualBenefits: '优点：最快开发、无测试维护',
      manualTradeoff: '权衡：无安全网、会有回归、难以重构',
      selectApproach: '选择您的测试方法：',
      tddOption: '🔴 TDD - 先写测试（推荐用于生产应用）',
      testAfterOption: '🔵 后置测试 - 先实现后测试（平衡方法）',
      manualOption: '🟡 手动 - 无自动化测试（仅限原型）',
      selectCoverage: '选择您的覆盖率目标级别：',
      coverage70: '70% - 可接受（核心路径已覆盖）',
      coverage80: '80% - 良好（推荐 - 大多数路径已覆盖）',
      coverage90: '90% - 优秀（全面覆盖）',
      coverageCustom: '自定义（输入您自己的值）',
      enterCustom: '输入自定义覆盖率目标（70-95）：',
      coverageValidation: '覆盖率目标必须在70%到95%之间',
      selectedTesting: '✔ 测试：',
      selectedCoverage: '✔ 覆盖率目标：',
      configNotFound: '⚠️  未找到config.json，无法更新测试配置',
    },
    de: {
      header: '🧪 Test-Konfiguration',
      subheader: 'Konfigurieren Sie Ihren Standard-Testansatz und Abdeckungsziele',
      guidance: '💡 Welchen Testansatz sollten Sie wählen?',
      tddTitle: '✓ TDD (Testgetriebene Entwicklung)',
      tddBestFor: 'Am besten für: Komplexe Geschäftslogik, kritische Funktionen, Refactoring',
      tddBenefits: 'Vorteile: Besseres Design, weniger Fehler, Vertrauen in Änderungen',
      tddTradeoff: 'Kompromiss: Langsamere anfängliche Entwicklung, erfordert Disziplin',
      testAfterTitle: '✓ Test-After',
      testAfterBestFor: 'Am besten für: Die meisten Projekte, schnelles Prototyping, explorative Arbeit',
      testAfterBenefits: 'Vorteile: Schnelle Iteration, flexibles Design, gute Abdeckung',
      testAfterTradeoff: 'Kompromiss: Kann Randfälle übersehen, schwieriger nach dem Design zu testen',
      manualTitle: '✓ Manuelles Testen',
      manualBestFor: 'Am besten für: Schnelle Prototypen, Proof-of-Concepts, Lernen',
      manualBenefits: 'Vorteile: Schnellste Entwicklung, keine Testwartung',
      manualTradeoff: 'Kompromiss: Kein Sicherheitsnetz, Regressionen, schwer zu refaktorieren',
      selectApproach: 'Wählen Sie Ihren Testansatz:',
      tddOption: '🔴 TDD - Zuerst Tests schreiben (empfohlen für Produktions-Apps)',
      testAfterOption: '🔵 Test-After - Erst implementieren, dann testen (ausgewogener Ansatz)',
      manualOption: '🟡 Manuell - Keine automatisierten Tests (nur Prototypen)',
      selectCoverage: 'Wählen Sie Ihr Abdeckungsziel:',
      coverage70: '70% - Akzeptabel (Kernpfade abgedeckt)',
      coverage80: '80% - Gut (empfohlen - die meisten Pfade abgedeckt)',
      coverage90: '90% - Exzellent (umfassende Abdeckung)',
      coverageCustom: 'Benutzerdefiniert (eigenen Wert eingeben)',
      enterCustom: 'Geben Sie ein benutzerdefiniertes Abdeckungsziel ein (70-95):',
      coverageValidation: 'Abdeckungsziel muss zwischen 70% und 95% liegen',
      selectedTesting: '✔ Testen:',
      selectedCoverage: '✔ Abdeckungsziel:',
      configNotFound: '⚠️  config.json nicht gefunden, kann Testkonfiguration nicht aktualisieren',
    },
    fr: {
      header: '🧪 Configuration des tests',
      subheader: 'Configurez votre approche de test par défaut et vos objectifs de couverture',
      guidance: '💡 Quelle approche de test devriez-vous choisir ?',
      tddTitle: '✓ TDD (Développement Piloté par les Tests)',
      tddBestFor: 'Idéal pour : Logique métier complexe, fonctionnalités critiques, refactoring',
      tddBenefits: 'Avantages : Meilleur design, moins de bugs, confiance dans les changements',
      tddTradeoff: 'Compromis : Développement initial plus lent, nécessite de la discipline',
      testAfterTitle: '✓ Test-After',
      testAfterBestFor: 'Idéal pour : La plupart des projets, prototypage rapide, travail exploratoire',
      testAfterBenefits: 'Avantages : Itération rapide, design flexible, bonne couverture',
      testAfterTradeoff: 'Compromis : Peut manquer des cas limites, plus difficile à tester après la conception',
      manualTitle: '✓ Tests manuels',
      manualBestFor: 'Idéal pour : Prototypes rapides, preuves de concept, apprentissage',
      manualBenefits: 'Avantages : Développement le plus rapide, pas de maintenance des tests',
      manualTradeoff: 'Compromis : Pas de filet de sécurité, régressions, difficile à refactorer',
      selectApproach: 'Sélectionnez votre approche de test :',
      tddOption: '🔴 TDD - Écrire les tests en premier (recommandé pour la production)',
      testAfterOption: '🔵 Test-After - Implémenter d\'abord, tester ensuite (approche équilibrée)',
      manualOption: '🟡 Manuel - Pas de tests automatisés (prototypes uniquement)',
      selectCoverage: 'Sélectionnez votre niveau de couverture cible :',
      coverage70: '70% - Acceptable (chemins principaux couverts)',
      coverage80: '80% - Bon (recommandé - la plupart des chemins couverts)',
      coverage90: '90% - Excellent (couverture complète)',
      coverageCustom: 'Personnalisé (entrez votre propre valeur)',
      enterCustom: 'Entrez une couverture cible personnalisée (70-95) :',
      coverageValidation: 'La couverture cible doit être entre 70% et 95%',
      selectedTesting: '✔ Tests :',
      selectedCoverage: '✔ Couverture cible :',
      configNotFound: '⚠️  config.json non trouvé, impossible de mettre à jour la configuration des tests',
    },
    ja: {
      header: '🧪 テスト設定',
      subheader: 'デフォルトのテストアプローチとカバレッジ目標を設定します',
      guidance: '💡 どのテストアプローチを選ぶべきですか？',
      tddTitle: '✓ TDD（テスト駆動開発）',
      tddBestFor: '最適：複雑なビジネスロジック、重要な機能、リファクタリング',
      tddBenefits: '利点：より良い設計、バグ減少、変更への自信',
      tddTradeoff: 'トレードオフ：初期開発が遅い、規律が必要',
      testAfterTitle: '✓ テスト後付け',
      testAfterBestFor: '最適：ほとんどのプロジェクト、高速プロトタイピング、探索的作業',
      testAfterBenefits: '利点：高速イテレーション、柔軟な設計、良好なカバレッジ',
      testAfterTradeoff: 'トレードオフ：エッジケースを見逃す可能性、設計後のテストが難しい',
      manualTitle: '✓ 手動テスト',
      manualBestFor: '最適：クイックプロトタイプ、概念実証、学習',
      manualBenefits: '利点：最速の開発、テストメンテナンス不要',
      manualTradeoff: 'トレードオフ：セーフティネットなし、回帰、リファクタリング困難',
      selectApproach: 'テストアプローチを選択してください：',
      tddOption: '🔴 TDD - テストを先に書く（本番アプリに推奨）',
      testAfterOption: '🔵 テスト後付け - 先に実装、後でテスト（バランスのとれたアプローチ）',
      manualOption: '🟡 手動 - 自動テストなし（プロトタイプのみ）',
      selectCoverage: 'カバレッジ目標レベルを選択してください：',
      coverage70: '70% - 許容範囲（コアパスをカバー）',
      coverage80: '80% - 良好（推奨 - ほとんどのパスをカバー）',
      coverage90: '90% - 優秀（包括的カバレッジ）',
      coverageCustom: 'カスタム（独自の値を入力）',
      enterCustom: 'カスタムカバレッジ目標を入力（70-95）：',
      coverageValidation: 'カバレッジ目標は70%から95%の間でなければなりません',
      selectedTesting: '✔ テスト：',
      selectedCoverage: '✔ カバレッジ目標：',
      configNotFound: '⚠️  config.jsonが見つかりません。テスト設定を更新できません',
    },
    ko: {
      header: '🧪 테스트 구성',
      subheader: '기본 테스트 접근 방식과 커버리지 목표를 구성합니다',
      guidance: '💡 어떤 테스트 접근 방식을 선택해야 할까요?',
      tddTitle: '✓ TDD (테스트 주도 개발)',
      tddBestFor: '적합: 복잡한 비즈니스 로직, 중요 기능, 리팩토링',
      tddBenefits: '장점: 더 나은 설계, 적은 버그, 변경에 대한 자신감',
      tddTradeoff: '단점: 초기 개발이 느림, 규율 필요',
      testAfterTitle: '✓ 테스트 후행',
      testAfterBestFor: '적합: 대부분의 프로젝트, 빠른 프로토타이핑, 탐색적 작업',
      testAfterBenefits: '장점: 빠른 반복, 유연한 설계, 좋은 커버리지',
      testAfterTradeoff: '단점: 엣지 케이스 누락 가능, 설계 후 테스트 어려움',
      manualTitle: '✓ 수동 테스트',
      manualBestFor: '적합: 빠른 프로토타입, 개념 증명, 학습',
      manualBenefits: '장점: 가장 빠른 개발, 테스트 유지보수 없음',
      manualTradeoff: '단점: 안전망 없음, 회귀, 리팩토링 어려움',
      selectApproach: '테스트 접근 방식을 선택하세요:',
      tddOption: '🔴 TDD - 테스트 먼저 작성 (프로덕션 앱에 권장)',
      testAfterOption: '🔵 테스트 후행 - 먼저 구현, 나중에 테스트 (균형 잡힌 접근)',
      manualOption: '🟡 수동 - 자동화된 테스트 없음 (프로토타입만)',
      selectCoverage: '커버리지 목표 수준을 선택하세요:',
      coverage70: '70% - 허용 가능 (핵심 경로 커버)',
      coverage80: '80% - 좋음 (권장 - 대부분 경로 커버)',
      coverage90: '90% - 우수 (포괄적 커버리지)',
      coverageCustom: '사용자 지정 (직접 값 입력)',
      enterCustom: '사용자 지정 커버리지 목표 입력 (70-95):',
      coverageValidation: '커버리지 목표는 70%에서 95% 사이여야 합니다',
      selectedTesting: '✔ 테스트:',
      selectedCoverage: '✔ 커버리지 목표:',
      configNotFound: '⚠️  config.json을 찾을 수 없어 테스트 구성을 업데이트할 수 없습니다',
    },
    pt: {
      header: '🧪 Configuração de Testes',
      subheader: 'Configure sua abordagem de teste padrão e metas de cobertura',
      guidance: '💡 Qual abordagem de teste você deve escolher?',
      tddTitle: '✓ TDD (Desenvolvimento Orientado a Testes)',
      tddBestFor: 'Melhor para: Lógica de negócios complexa, recursos críticos, refatoração',
      tddBenefits: 'Benefícios: Melhor design, menos bugs, confiança nas mudanças',
      tddTradeoff: 'Compensação: Desenvolvimento inicial mais lento, requer disciplina',
      testAfterTitle: '✓ Test-After',
      testAfterBestFor: 'Melhor para: A maioria dos projetos, prototipagem rápida, trabalho exploratório',
      testAfterBenefits: 'Benefícios: Iteração rápida, design flexível, boa cobertura',
      testAfterTradeoff: 'Compensação: Pode perder casos extremos, mais difícil testar após o design',
      manualTitle: '✓ Testes Manuais',
      manualBestFor: 'Melhor para: Protótipos rápidos, provas de conceito, aprendizado',
      manualBenefits: 'Benefícios: Desenvolvimento mais rápido, sem manutenção de testes',
      manualTradeoff: 'Compensação: Sem rede de segurança, regressões, difícil refatorar',
      selectApproach: 'Selecione sua abordagem de teste:',
      tddOption: '🔴 TDD - Escrever testes primeiro (recomendado para apps de produção)',
      testAfterOption: '🔵 Test-After - Implementar primeiro, testar depois (abordagem equilibrada)',
      manualOption: '🟡 Manual - Sem testes automatizados (apenas protótipos)',
      selectCoverage: 'Selecione seu nível de cobertura alvo:',
      coverage70: '70% - Aceitável (caminhos principais cobertos)',
      coverage80: '80% - Bom (recomendado - maioria dos caminhos cobertos)',
      coverage90: '90% - Excelente (cobertura abrangente)',
      coverageCustom: 'Personalizado (digite seu próprio valor)',
      enterCustom: 'Digite a cobertura alvo personalizada (70-95):',
      coverageValidation: 'A cobertura alvo deve estar entre 70% e 95%',
      selectedTesting: '✔ Testes:',
      selectedCoverage: '✔ Cobertura Alvo:',
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

  // Add guidance on which testing approach to choose
  console.log(chalk.white(strings.guidance));
  console.log('');
  console.log(chalk.green('   ' + strings.tddTitle));
  console.log(chalk.gray('     ' + strings.tddBestFor));
  console.log(chalk.gray('     ' + strings.tddBenefits));
  console.log(chalk.gray('     ' + strings.tddTradeoff));
  console.log('');
  console.log(chalk.blue('   ' + strings.testAfterTitle));
  console.log(chalk.gray('     ' + strings.testAfterBestFor));
  console.log(chalk.gray('     ' + strings.testAfterBenefits));
  console.log(chalk.gray('     ' + strings.testAfterTradeoff));
  console.log('');
  console.log(chalk.yellow('   ' + strings.manualTitle));
  console.log(chalk.gray('     ' + strings.manualBestFor));
  console.log(chalk.gray('     ' + strings.manualBenefits));
  console.log(chalk.gray('     ' + strings.manualTradeoff));
  console.log('');

  const testMode = await select<TestMode>({
    message: strings.selectApproach,
    choices: [
      {
        name: strings.tddOption,
        value: 'TDD' as const,
      },
      {
        name: strings.testAfterOption,
        value: 'test-after' as const,
      },
      {
        name: strings.manualOption,
        value: 'manual' as const,
      }
    ],
    default: 'test-after'
  });

  let coverageTarget = 80;

  // Only ask for coverage if not manual testing
  if (testMode !== 'manual') {
    const selectedCoverageLevel = await select<number | 'custom'>({
      message: strings.selectCoverage,
      choices: [
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
          name: strings.coverageCustom,
          value: 'custom' as number | 'custom',
        }
      ],
      default: 80
    });

    if (selectedCoverageLevel === 'custom') {
      const customInput = await input({
        message: strings.enterCustom,
        default: '80',
        validate: (val: string) => {
          const num = parseInt(val, 10);
          if (isNaN(num) || num < 70 || num > 95) {
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
  if (testMode !== 'manual') {
    console.log(chalk.green(`   ${strings.selectedCoverage} ${coverageTarget}%`));
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

  config.testing = {
    defaultTestMode: testMode,
    defaultCoverageTarget: coverageTarget,
    coverageTargets: {
      unit: Math.min(coverageTarget + 5, 95),
      integration: coverageTarget,
      e2e: Math.min(coverageTarget + 10, 100)
    }
  } satisfies TestingConfig;

  fs.writeJsonSync(configPath, config, { spaces: 2 });
}
