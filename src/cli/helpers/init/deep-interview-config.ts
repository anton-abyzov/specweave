/**
 * Deep Interview Mode configuration prompts
 *
 * Handles deep interview mode selection during init.
 * When enabled, Claude asks 5-40 questions (scaled to complexity) about architecture,
 * integrations, UI/UX, and tradeoffs before creating specs.
 *
 * @since v1.0.195
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import type { DeepInterviewConfig } from '../../../core/types/config.js';
import { WIZARD_BACK, createGoBackChoice, type WizardResult } from './wizard-navigation.js';

/**
 * Get translated strings for deep interview configuration
 */
function getDeepInterviewStrings(language: SupportedLanguage): {
  header: string;
  description: string;
  example: string;
  benefits: string;
  benefit1: string;
  benefit2: string;
  benefit3: string;
  benefit4: string;
  note: string;
  prompt: string;
  optionYes: string;
  optionNo: string;
  selectedEnabled: string;
  selectedDisabled: string;
  configNotFound: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getDeepInterviewStrings>> = {
    en: {
      header: 'Deep Interview Mode',
      description: 'Claude asks 5-40 questions (scaled to complexity) about architecture,',
      example: 'integrations, UI/UX, and tradeoffs before creating specifications.',
      benefits: 'Benefits:',
      benefit1: 'More comprehensive specs with fewer iterations',
      benefit2: 'Catches integration issues early',
      benefit3: 'Better architecture decisions upfront',
      benefit4: 'Feel more control over the final specification',
      note: 'Note: Can be disabled per-session or toggled in config.json anytime.',
      prompt: 'Enable Deep Interview Mode?',
      optionYes: 'Yes - Enable deep interview (5-40 questions scaled to complexity)',
      optionNo: 'No - Use standard spec flow (faster, less questions)',
      selectedEnabled: 'Deep Interview Mode: ENABLED',
      selectedDisabled: 'Deep Interview Mode: Disabled (standard flow)',
      configNotFound: 'config.json not found, cannot update planning configuration',
    },
    ru: {
      header: 'Режим глубокого интервью',
      description: 'Claude задаёт 5-40 вопросов (в зависимости от сложности) об архитектуре,',
      example: 'интеграциях, UI/UX и компромиссах перед созданием спецификаций.',
      benefits: 'Преимущества:',
      benefit1: 'Более полные спецификации с меньшим количеством итераций',
      benefit2: 'Выявление проблем интеграции на раннем этапе',
      benefit3: 'Лучшие архитектурные решения заранее',
      benefit4: 'Больше контроля над итоговой спецификацией',
      note: 'Примечание: Можно отключить для сессии или изменить в config.json в любое время.',
      prompt: 'Включить режим глубокого интервью?',
      optionYes: 'Да - Включить глубокое интервью (5-40 вопросов в зависимости от сложности)',
      optionNo: 'Нет - Использовать стандартный процесс (быстрее, меньше вопросов)',
      selectedEnabled: 'Режим глубокого интервью: ВКЛЮЧЕН',
      selectedDisabled: 'Режим глубокого интервью: Отключен (стандартный процесс)',
      configNotFound: 'config.json не найден, невозможно обновить конфигурацию планирования',
    },
    es: {
      header: 'Modo de Entrevista Profunda',
      description: 'Claude hace 5-40 preguntas (según la complejidad) sobre arquitectura,',
      example: 'integraciones, UI/UX y compensaciones antes de crear especificaciones.',
      benefits: 'Beneficios:',
      benefit1: 'Especificaciones mas completas con menos iteraciones',
      benefit2: 'Detecta problemas de integracion temprano',
      benefit3: 'Mejores decisiones de arquitectura por adelantado',
      benefit4: 'Mas control sobre la especificacion final',
      note: 'Nota: Se puede desactivar por sesion o cambiar en config.json en cualquier momento.',
      prompt: 'Habilitar Modo de Entrevista Profunda?',
      optionYes: 'Si - Habilitar entrevista profunda (5-40 preguntas según complejidad)',
      optionNo: 'No - Usar flujo estandar (mas rapido, menos preguntas)',
      selectedEnabled: 'Modo de Entrevista Profunda: HABILITADO',
      selectedDisabled: 'Modo de Entrevista Profunda: Deshabilitado (flujo estandar)',
      configNotFound: 'config.json no encontrado, no se puede actualizar la configuracion de planificacion',
    },
    zh: {
      header: '深度访谈模式',
      description: 'Claude 会根据复杂度询问 5-40 个关于架构、',
      example: '集成、UI/UX 和权衡的问题。',
      benefits: '好处:',
      benefit1: '更少的迭代获得更全面的规格',
      benefit2: '尽早发现集成问题',
      benefit3: '预先做出更好的架构决策',
      benefit4: '对最终规格有更多控制',
      note: '注意:可以按会话禁用或随时在 config.json 中切换。',
      prompt: '启用深度访谈模式?',
      optionYes: '是 - 启用深度访谈(5-40个问题,根据复杂度调整)',
      optionNo: '否 - 使用标准流程(更快,更少问题)',
      selectedEnabled: '深度访谈模式:已启用',
      selectedDisabled: '深度访谈模式:已禁用(标准流程)',
      configNotFound: '未找到 config.json,无法更新规划配置',
    },
    de: {
      header: 'Tiefeninterview-Modus',
      description: 'Claude stellt 5-40 Fragen (an Komplexität angepasst) zu Architektur,',
      example: 'Integrationen, UI/UX und Kompromissen stellen, bevor Spezifikationen erstellt werden.',
      benefits: 'Vorteile:',
      benefit1: 'Umfassendere Spezifikationen mit weniger Iterationen',
      benefit2: 'Erkennt Integrationsprobleme fruhzeitig',
      benefit3: 'Bessere Architekturentscheidungen im Voraus',
      benefit4: 'Mehr Kontrolle uber die endgultige Spezifikation',
      note: 'Hinweis: Kann pro Sitzung deaktiviert oder jederzeit in config.json umgeschaltet werden.',
      prompt: 'Tiefeninterview-Modus aktivieren?',
      optionYes: 'Ja - Tiefeninterview aktivieren (5-40 Fragen, an Komplexität angepasst)',
      optionNo: 'Nein - Standardablauf verwenden (schneller, weniger Fragen)',
      selectedEnabled: 'Tiefeninterview-Modus: AKTIVIERT',
      selectedDisabled: 'Tiefeninterview-Modus: Deaktiviert (Standardablauf)',
      configNotFound: 'config.json nicht gefunden, Planungskonfiguration kann nicht aktualisiert werden',
    },
    fr: {
      header: 'Mode Interview Approfondie',
      description: 'Claude pose 5-40 questions (adaptées à la complexité) sur l\'architecture,',
      example: 'les integrations, l\'UI/UX et les compromis avant de creer les specifications.',
      benefits: 'Avantages:',
      benefit1: 'Specifications plus completes avec moins d\'iterations',
      benefit2: 'Detecte les problemes d\'integration tot',
      benefit3: 'Meilleures decisions d\'architecture en amont',
      benefit4: 'Plus de controle sur la specification finale',
      note: 'Note: Peut etre desactive par session ou bascule dans config.json a tout moment.',
      prompt: 'Activer le Mode Interview Approfondie?',
      optionYes: 'Oui - Activer l\'interview approfondie (5-40 questions adaptées à la complexité)',
      optionNo: 'Non - Utiliser le flux standard (plus rapide, moins de questions)',
      selectedEnabled: 'Mode Interview Approfondie: ACTIVE',
      selectedDisabled: 'Mode Interview Approfondie: Desactive (flux standard)',
      configNotFound: 'config.json non trouve, impossible de mettre a jour la configuration de planification',
    },
    ja: {
      header: 'ディープインタビューモード',
      description: 'Claude は複雑さに応じて 5-40 の質問をアーキテクチャ、',
      example: '統合、UI/UX、トレードオフについて仕様作成前に行います。',
      benefits: '利点:',
      benefit1: 'より少ないイテレーションでより包括的な仕様',
      benefit2: '統合の問題を早期に発見',
      benefit3: '事前により良いアーキテクチャの決定',
      benefit4: '最終的な仕様に対するより多くのコントロール',
      note: '注意: セッションごとに無効にするか、いつでも config.json で切り替え可能。',
      prompt: 'ディープインタビューモードを有効にしますか?',
      optionYes: 'はい - ディープインタビューを有効にする(5-40の質問、複雑さに応じて調整)',
      optionNo: 'いいえ - 標準フローを使用(より速く、質問少なめ)',
      selectedEnabled: 'ディープインタビューモード: 有効',
      selectedDisabled: 'ディープインタビューモード: 無効(標準フロー)',
      configNotFound: 'config.json が見つかりません。計画設定を更新できません',
    },
    ko: {
      header: '심층 인터뷰 모드',
      description: 'Claude가 복잡도에 따라 5-40개의 질문을 아키텍처,',
      example: '통합, UI/UX 및 트레이드오프에 대해 사양 작성 전에 합니다.',
      benefits: '이점:',
      benefit1: '더 적은 반복으로 더 포괄적인 사양',
      benefit2: '통합 문제를 조기에 발견',
      benefit3: '사전에 더 나은 아키텍처 결정',
      benefit4: '최종 사양에 대한 더 많은 통제',
      note: '참고: 세션별로 비활성화하거나 언제든지 config.json에서 전환 가능.',
      prompt: '심층 인터뷰 모드를 활성화하시겠습니까?',
      optionYes: '예 - 심층 인터뷰 활성화 (5-40개 질문, 복잡도에 따라 조정)',
      optionNo: '아니오 - 표준 흐름 사용 (더 빠름, 질문 적음)',
      selectedEnabled: '심층 인터뷰 모드: 활성화됨',
      selectedDisabled: '심층 인터뷰 모드: 비활성화됨 (표준 흐름)',
      configNotFound: 'config.json을 찾을 수 없어 계획 구성을 업데이트할 수 없습니다',
    },
    pt: {
      header: 'Modo de Entrevista Profunda',
      description: 'Claude faz 5-40 perguntas (de acordo com a complexidade) sobre arquitetura,',
      example: 'integracoes, UI/UX e compensacoes antes de criar especificacoes.',
      benefits: 'Beneficios:',
      benefit1: 'Especificacoes mais completas com menos iteracoes',
      benefit2: 'Detecta problemas de integracao cedo',
      benefit3: 'Melhores decisoes de arquitetura antecipadamente',
      benefit4: 'Mais controle sobre a especificacao final',
      note: 'Nota: Pode ser desativado por sessao ou alternado em config.json a qualquer momento.',
      prompt: 'Habilitar Modo de Entrevista Profunda?',
      optionYes: 'Sim - Habilitar entrevista profunda (5-40 perguntas de acordo com a complexidade)',
      optionNo: 'Nao - Usar fluxo padrao (mais rapido, menos perguntas)',
      selectedEnabled: 'Modo de Entrevista Profunda: HABILITADO',
      selectedDisabled: 'Modo de Entrevista Profunda: Desabilitado (fluxo padrao)',
      configNotFound: 'config.json nao encontrado, nao e possivel atualizar a configuracao de planejamento',
    },
  };
  return strings[language] || strings.en;
}

/**
 * Result of deep interview configuration
 */
export interface DeepInterviewConfigResult {
  enabled: boolean;
  /** Signal to go back to previous step */
  goBack?: typeof WIZARD_BACK;
}

/**
 * Prompt user for deep interview mode configuration
 *
 * @param language - Language for translations
 * @returns Deep interview configuration result
 */
export async function promptDeepInterviewConfig(language: SupportedLanguage = 'en'): Promise<DeepInterviewConfigResult> {
  const strings = getDeepInterviewStrings(language);

  console.log('');
  console.log(chalk.cyan.bold(strings.header));
  console.log('');
  console.log(chalk.white('   ' + strings.description));
  console.log(chalk.white('   ' + strings.example));
  console.log('');
  console.log(chalk.gray('   ' + strings.benefits));
  console.log(chalk.gray('   - ' + strings.benefit1));
  console.log(chalk.gray('   - ' + strings.benefit2));
  console.log(chalk.gray('   - ' + strings.benefit3));
  console.log(chalk.gray('   - ' + strings.benefit4));
  console.log('');
  console.log(chalk.dim('   ' + strings.note));
  console.log('');

  const choice = await select<boolean | 'back'>({
    message: strings.prompt,
    choices: [
      {
        name: strings.optionNo,
        value: false as boolean | 'back',
      },
      {
        name: strings.optionYes,
        value: true as boolean | 'back',
      },
      createGoBackChoice(language) as { name: string; value: boolean | 'back' },
    ],
    default: false,  // Disabled by default per ADR-0232
  });

  // Handle go back
  if (choice === 'back') {
    return { enabled: false, goBack: WIZARD_BACK };
  }

  const enabled = choice as boolean;

  console.log('');
  if (enabled) {
    console.log(chalk.green('   ' + strings.selectedEnabled));
  } else {
    console.log(chalk.gray('   ' + strings.selectedDisabled));
  }
  console.log('');

  return { enabled };
}

/**
 * Update config.json with deep interview configuration
 *
 * @param targetDir - Project directory
 * @param enabled - Whether deep interview mode is enabled
 * @param language - Language for translations
 */
export function updateConfigWithDeepInterview(
  targetDir: string,
  enabled: boolean,
  language: SupportedLanguage = 'en'
): void {
  const strings = getDeepInterviewStrings(language);
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red(strings.configNotFound));
    return;
  }

  const config = fs.readJsonSync(configPath);

  // Initialize planning config if not present
  if (!config.planning) {
    config.planning = {};
  }

  config.planning.deepInterview = {
    enabled,
    minQuestions: 5,  // Soft guideline - LLM should assess complexity and decide
    categories: [
      'architecture',
      'integrations',
      'ui-ux',
      'performance',
      'security',
      'edge-cases',
    ],
  } satisfies DeepInterviewConfig;

  fs.writeJsonSync(configPath, config, { spaces: 2 });
}
