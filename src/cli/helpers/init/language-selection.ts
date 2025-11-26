/**
 * Language Selection - FIRST question in init process
 *
 * CRITICAL: This must be asked BEFORE any other prompts.
 * All subsequent interface elements will be translated to the selected language.
 *
 * @module cli/helpers/init/language-selection
 */

import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getLocaleManager, resetLocaleManager } from '../../../core/i18n/locale-manager.js';

/**
 * Language selection result
 */
export interface LanguageSelectionResult {
  /** Selected primary language */
  language: SupportedLanguage;
  /** Keep English originals alongside translations (doubles storage) */
  keepEnglishOriginals: boolean;
  /** Show bilingual cost warning acknowledged */
  bilingualModeEnabled: boolean;
}

/**
 * Get language display info with native names
 */
function getLanguageChoices(): Array<{ name: string; value: SupportedLanguage }> {
  return [
    { name: '🇬🇧 English', value: 'en' },
    { name: '🇪🇸 Español (Spanish)', value: 'es' },
    { name: '🇨🇳 中文 (Chinese)', value: 'zh' },
    { name: '🇩🇪 Deutsch (German)', value: 'de' },
    { name: '🇷🇺 Русский (Russian)', value: 'ru' },
    { name: '🇫🇷 Français (French)', value: 'fr' },
    { name: '🇯🇵 日本語 (Japanese)', value: 'ja' },
    { name: '🇰🇷 한국어 (Korean)', value: 'ko' },
    { name: '🇧🇷 Português (Portuguese)', value: 'pt' },
  ];
}

/**
 * Bilingual warning strings type
 */
interface BilingualWarningStrings {
  header: string;
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  question: string;
}

/**
 * Get translated bilingual cost warnings
 */
function getBilingualWarnings(language: SupportedLanguage): BilingualWarningStrings {
  const warnings: Record<SupportedLanguage, BilingualWarningStrings> = {
    en: {
      header: 'BILINGUAL MODE - COST WARNING',
      line1: 'Keeping English originals alongside translations will:',
      line2: '• Approximately DOUBLE token usage for all documentation',
      line3: '• Estimated additional monthly cost: $1-5 (depends on activity)',
      line4: '• Create .en.md backup files for every translated document',
      question: 'Enable bilingual mode? (keep English + translated versions)',
    },
    ru: {
      header: 'ДВУЯЗЫЧНЫЙ РЕЖИМ - ПРЕДУПРЕЖДЕНИЕ О РАСХОДАХ',
      line1: 'Сохранение английских оригиналов вместе с переводами приведет к:',
      line2: '• Примерно УДВОЕНИЕ расхода токенов для всей документации',
      line3: '• Ориентировочные дополнительные ежемесячные затраты: $1-5 (зависит от активности)',
      line4: '• Создание .en.md резервных копий для каждого переведенного документа',
      question: 'Включить двуязычный режим? (сохранять English + переведённую версию)',
    },
    es: {
      header: 'MODO BILINGÜE - ADVERTENCIA DE COSTOS',
      line1: 'Mantener los originales en inglés junto con las traducciones:',
      line2: '• Aproximadamente DUPLICARÁ el uso de tokens para toda la documentación',
      line3: '• Costo mensual adicional estimado: $1-5 (depende de la actividad)',
      line4: '• Crear archivos de respaldo .en.md para cada documento traducido',
      question: '¿Habilitar modo bilingüe? (mantener inglés + versiones traducidas)',
    },
    zh: {
      header: '双语模式 - 费用警告',
      line1: '同时保留英文原文和翻译将会：',
      line2: '• 所有文档的令牌使用量大约翻倍',
      line3: '• 预计每月额外费用：$1-5（取决于活动量）',
      line4: '• 为每个翻译文档创建 .en.md 备份文件',
      question: '启用双语模式？（保留英文 + 翻译版本）',
    },
    de: {
      header: 'ZWEISPRACHIGER MODUS - KOSTENWARNUNG',
      line1: 'Das Behalten englischer Originale neben Übersetzungen wird:',
      line2: '• Den Token-Verbrauch für alle Dokumentation ungefähr VERDOPPELN',
      line3: '• Geschätzte zusätzliche monatliche Kosten: $1-5 (abhängig von Aktivität)',
      line4: '• .en.md Sicherungsdateien für jedes übersetzte Dokument erstellen',
      question: 'Zweisprachigen Modus aktivieren? (Englisch + übersetzte Versionen behalten)',
    },
    fr: {
      header: 'MODE BILINGUE - AVERTISSEMENT DE COÛT',
      line1: 'Conserver les originaux anglais avec les traductions va:',
      line2: '• Approximativement DOUBLER l\'utilisation des tokens pour toute la documentation',
      line3: '• Coût mensuel supplémentaire estimé: $1-5 (dépend de l\'activité)',
      line4: '• Créer des fichiers de sauvegarde .en.md pour chaque document traduit',
      question: 'Activer le mode bilingue? (conserver anglais + versions traduites)',
    },
    ja: {
      header: 'バイリンガルモード - コスト警告',
      line1: '英語のオリジナルを翻訳と一緒に保持すると：',
      line2: '• すべてのドキュメントのトークン使用量がほぼ2倍になります',
      line3: '• 推定追加月額費用：$1-5（活動量による）',
      line4: '• 翻訳されたすべてのドキュメントに .en.md バックアップファイルを作成',
      question: 'バイリンガルモードを有効にしますか？（英語 + 翻訳版を保持）',
    },
    ko: {
      header: '이중 언어 모드 - 비용 경고',
      line1: '영어 원본을 번역과 함께 유지하면:',
      line2: '• 모든 문서의 토큰 사용량이 약 2배로 증가합니다',
      line3: '• 예상 추가 월 비용: $1-5 (활동량에 따라 다름)',
      line4: '• 모든 번역된 문서에 대해 .en.md 백업 파일 생성',
      question: '이중 언어 모드를 활성화하시겠습니까? (영어 + 번역 버전 유지)',
    },
    pt: {
      header: 'MODO BILÍNGUE - AVISO DE CUSTO',
      line1: 'Manter os originais em inglês junto com as traduções irá:',
      line2: '• Aproximadamente DOBRAR o uso de tokens para toda a documentação',
      line3: '• Custo mensal adicional estimado: $1-5 (depende da atividade)',
      line4: '• Criar arquivos de backup .en.md para cada documento traduzido',
      question: 'Habilitar modo bilíngue? (manter inglês + versões traduzidas)',
    },
  };

  return warnings[language] || warnings.en;
}

/**
 * Language prompt strings type
 */
interface LanguagePromptStrings {
  header: string;
  subheader: string;
  question: string;
  selected: string;
}

/**
 * Get translated strings for language selection prompt
 */
function getPromptStrings(language: SupportedLanguage): LanguagePromptStrings {
  const strings: Record<SupportedLanguage, LanguagePromptStrings> = {
    en: {
      header: '🌐 Language Selection',
      subheader: 'All prompts and interface will be displayed in your selected language',
      question: 'Select your preferred language:',
      selected: 'Language selected',
    },
    ru: {
      header: '🌐 Выбор языка',
      subheader: 'Все подсказки и интерфейс будут отображаться на выбранном языке',
      question: 'Выберите предпочитаемый язык:',
      selected: 'Язык выбран',
    },
    es: {
      header: '🌐 Selección de idioma',
      subheader: 'Todos los mensajes e interfaz se mostrarán en el idioma seleccionado',
      question: 'Seleccione su idioma preferido:',
      selected: 'Idioma seleccionado',
    },
    zh: {
      header: '🌐 语言选择',
      subheader: '所有提示和界面将以您选择的语言显示',
      question: '选择您的首选语言：',
      selected: '语言已选择',
    },
    de: {
      header: '🌐 Sprachauswahl',
      subheader: 'Alle Eingabeaufforderungen und Oberfläche werden in der gewählten Sprache angezeigt',
      question: 'Wählen Sie Ihre bevorzugte Sprache:',
      selected: 'Sprache ausgewählt',
    },
    fr: {
      header: '🌐 Sélection de la langue',
      subheader: 'Toutes les invites et l\'interface seront affichées dans la langue sélectionnée',
      question: 'Sélectionnez votre langue préférée:',
      selected: 'Langue sélectionnée',
    },
    ja: {
      header: '🌐 言語選択',
      subheader: 'すべてのプロンプトとインターフェースは選択した言語で表示されます',
      question: '希望の言語を選択してください：',
      selected: '言語が選択されました',
    },
    ko: {
      header: '🌐 언어 선택',
      subheader: '모든 프롬프트와 인터페이스가 선택한 언어로 표시됩니다',
      question: '선호하는 언어를 선택하세요:',
      selected: '언어가 선택되었습니다',
    },
    pt: {
      header: '🌐 Seleção de idioma',
      subheader: 'Todos os prompts e interface serão exibidos no idioma selecionado',
      question: 'Selecione seu idioma preferido:',
      selected: 'Idioma selecionado',
    },
  };

  return strings[language] || strings.en;
}

/**
 * Get native language name
 */
export function getLanguageNativeName(code: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    en: 'English',
    ru: 'Русский',
    es: 'Español',
    zh: '中文',
    de: 'Deutsch',
    fr: 'Français',
    ja: '日本語',
    ko: '한국어',
    pt: 'Português',
  };
  return names[code] || code;
}

/**
 * Prompt for language selection - MUST be called FIRST in init
 *
 * This is the entry point for all init language handling.
 * After selection, the LocaleManager is configured for the selected language.
 *
 * @param isCI - Whether running in CI environment
 * @param cliLanguage - Language passed via CLI option (skips prompt if provided)
 * @returns Language selection result
 */
export async function promptLanguageSelection(
  isCI: boolean = false,
  cliLanguage?: SupportedLanguage
): Promise<LanguageSelectionResult> {
  // If language provided via CLI, use it directly
  if (cliLanguage) {
    // Reset and configure locale manager
    resetLocaleManager();
    getLocaleManager(cliLanguage);

    return {
      language: cliLanguage,
      keepEnglishOriginals: false,
      bilingualModeEnabled: false,
    };
  }

  // CI mode: default to English
  if (isCI) {
    return {
      language: 'en',
      keepEnglishOriginals: false,
      bilingualModeEnabled: false,
    };
  }

  // Show header in English first (user hasn't selected language yet)
  const enStrings = getPromptStrings('en');
  console.log('');
  console.log(chalk.cyan.bold(enStrings.header));
  console.log(chalk.gray(`   ${enStrings.subheader}`));
  console.log('');

  // Ask for language selection
  const language = await select<SupportedLanguage>({
    message: enStrings.question,
    choices: getLanguageChoices(),
    default: 'en',
  });

  // Reset and configure locale manager with selected language
  resetLocaleManager();
  getLocaleManager(language);

  // If English selected, no bilingual question needed
  if (language === 'en') {
    const selectedStrings = getPromptStrings(language);
    console.log('');
    console.log(chalk.green(`   ✔ ${selectedStrings.selected}: ${getLanguageNativeName(language)}`));
    console.log('');

    return {
      language: 'en',
      keepEnglishOriginals: false,
      bilingualModeEnabled: false,
    };
  }

  // Show confirmation in SELECTED language
  const selectedStrings = getPromptStrings(language);
  console.log('');
  console.log(chalk.green(`   ✔ ${selectedStrings.selected}: ${getLanguageNativeName(language)}`));

  // Ask about bilingual mode (with cost warning) in SELECTED language
  const warnings = getBilingualWarnings(language);
  console.log('');
  console.log(chalk.yellow.bold(`⚠️  ${warnings.header}`));
  console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.white(`   ${warnings.line1}`));
  console.log('');
  console.log(chalk.gray(`   ${warnings.line2}`));
  console.log(chalk.gray(`   ${warnings.line3}`));
  console.log(chalk.gray(`   ${warnings.line4}`));
  console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  const keepOriginals = await confirm({
    message: warnings.question,
    default: false, // Default NO - user must explicitly opt-in
  });

  console.log('');

  return {
    language,
    keepEnglishOriginals: keepOriginals,
    bilingualModeEnabled: keepOriginals,
  };
}

/**
 * Get default language selection for CI/test mode
 */
export function getDefaultLanguageSelection(language: SupportedLanguage = 'en'): LanguageSelectionResult {
  return {
    language,
    keepEnglishOriginals: false,
    bilingualModeEnabled: false,
  };
}
