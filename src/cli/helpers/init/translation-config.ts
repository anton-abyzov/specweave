/**
 * Translation configuration prompts
 *
 * NOTE: Language selection is now in language-selection.ts (asked first)
 * This module only handles auto-translation scope configuration.
 *
 * CRITICAL: User MUST be asked before enabling translation
 * Translation can ~2x token usage (significant cost impact)
 *
 * @module cli/helpers/init/translation-config
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';
import type { SupportedLanguage } from '../../../core/i18n/types.js';
import { getLocaleManager } from '../../../core/i18n/locale-manager.js';
import type { LanguageSelectionResult } from './language-selection.js';
import { WIZARD_BACK, getGoBackStrings } from './wizard-navigation.js';

/**
 * Translation scope - what gets auto-translated
 */
export interface TranslationScope {
  /** Auto-translate spec.md, plan.md, tasks.md after creation */
  incrementSpecs: boolean;
  /** Auto-translate living docs on update */
  livingDocs: boolean;
  /** Auto-translate GitHub/JIRA/ADO issues on sync */
  externalSync: boolean;
}

/**
 * Result of translation configuration prompts
 */
export interface TranslationConfigResult {
  language: SupportedLanguage;
  translationEnabled: boolean;
  translationScope: TranslationScope;
  keepEnglishOriginals: boolean;
  /** Signal to go back to previous step */
  goBack?: typeof WIZARD_BACK;
}

/**
 * Get human-readable language name in native form
 */
function getLanguageNativeName(code: SupportedLanguage): string {
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
 * Get translated strings for translation config prompts
 */
export function getTranslationStrings(language: SupportedLanguage): {
  header: string;
  subheader: string;
  costHeader: string;
  costLine1: string;
  costLine2: string;
  costLine3: string;
  costLine4: string;
  costLine5: string;
  enableQuestion: string;
  disabled: string;
  manualHint: string;
  scopeQuestion: string;
  scopeAll: string;
  scopeLivingDocs: string;
  scopeExternal: string;
  scopeCustom: string;
  customSpecs: string;
  customLivingDocs: string;
  customExternal: string;
  summary: string;
  translationEnabled: string;
  scopeLabel: string;
  specsLabel: string;
  livingDocsLabel: string;
  externalLabel: string;
  enableChoice: string;
  disableChoice: string;
} {
  const strings: Record<SupportedLanguage, ReturnType<typeof getTranslationStrings>> = {
    en: {
      header: '📝 Auto-Translation Configuration',
      subheader: 'Configure automatic translation for your documentation',
      costHeader: 'TRANSLATION COST NOTICE',
      costLine1: 'Enabling translation will approximately DOUBLE token usage:',
      costLine2: '• Each spec.md translation: ~$0.003-0.005',
      costLine3: '• Living docs update:       ~$0.002-0.004',
      costLine4: '• GitHub/JIRA issue sync:   ~$0.001-0.002',
      costLine5: 'Estimated monthly increase: $0.50-$2.00 (depends on activity)',
      enableQuestion: 'Enable automatic translation?',
      disabled: 'Translation: Disabled',
      manualHint: 'use /sw:translate manually',
      scopeQuestion: 'What should be auto-translated?',
      scopeAll: 'Everything (specs + living docs + external tools)',
      scopeLivingDocs: 'Living docs only (internal documentation)',
      scopeExternal: 'External sync only (GitHub/JIRA/ADO issues)',
      scopeCustom: 'Let me choose individually',
      customSpecs: 'Translate spec.md, plan.md, tasks.md after creation?',
      customLivingDocs: 'Translate living docs on update?',
      customExternal: 'Translate GitHub/JIRA/ADO issues on sync?',
      summary: 'Translation configured',
      translationEnabled: 'Translation: Enabled (auto)',
      scopeLabel: 'Scope',
      specsLabel: 'Increment specs',
      livingDocsLabel: 'Living docs',
      externalLabel: 'External tools',
      enableChoice: '✓ Enable translation (auto)',
      disableChoice: 'No translation',
    },
    ru: {
      header: '📝 Настройка автоперевода',
      subheader: 'Настройте автоматический перевод документации',
      costHeader: 'УВЕДОМЛЕНИЕ О СТОИМОСТИ ПЕРЕВОДА',
      costLine1: 'Включение перевода примерно УДВОИТ расход токенов:',
      costLine2: '• Каждый перевод spec.md: ~$0.003-0.005',
      costLine3: '• Обновление living docs:  ~$0.002-0.004',
      costLine4: '• Синхр. GitHub/JIRA:      ~$0.001-0.002',
      costLine5: 'Ориентир. увеличение в месяц: $0.50-$2.00 (зависит от активности)',
      enableQuestion: 'Включить автоматический перевод?',
      disabled: 'Перевод: Отключён',
      manualHint: 'используйте /sw:translate вручную',
      scopeQuestion: 'Что переводить автоматически?',
      scopeAll: 'Всё (specs + living docs + внешние инструменты)',
      scopeLivingDocs: 'Только living docs (внутренняя документация)',
      scopeExternal: 'Только внешняя синхр. (GitHub/JIRA/ADO issues)',
      scopeCustom: 'Выбрать по отдельности',
      customSpecs: 'Переводить spec.md, plan.md, tasks.md после создания?',
      customLivingDocs: 'Переводить living docs при обновлении?',
      customExternal: 'Переводить GitHub/JIRA/ADO issues при синхронизации?',
      summary: 'Перевод настроен',
      translationEnabled: 'Перевод: Включён (авто)',
      scopeLabel: 'Область',
      specsLabel: 'Спецификации инкрементов',
      livingDocsLabel: 'Living docs',
      externalLabel: 'Внешние инструменты',
      enableChoice: '✓ Включить перевод (авто)',
      disableChoice: 'Нет перевода',
    },
    es: {
      header: '📝 Configuración de traducción automática',
      subheader: 'Configure la traducción automática de la documentación',
      costHeader: 'AVISO DE COSTO DE TRADUCCIÓN',
      costLine1: 'Habilitar la traducción aproximadamente DUPLICARÁ el uso de tokens:',
      costLine2: '• Cada traducción de spec.md: ~$0.003-0.005',
      costLine3: '• Actualización de living docs: ~$0.002-0.004',
      costLine4: '• Sincr. GitHub/JIRA:          ~$0.001-0.002',
      costLine5: 'Aumento mensual estimado: $0.50-$2.00 (depende de la actividad)',
      enableQuestion: '¿Habilitar traducción automática?',
      disabled: 'Traducción: Deshabilitada',
      manualHint: 'use /sw:translate manualmente',
      scopeQuestion: '¿Qué se debe traducir automáticamente?',
      scopeAll: 'Todo (specs + living docs + herramientas externas)',
      scopeLivingDocs: 'Solo living docs (documentación interna)',
      scopeExternal: 'Solo sincr. externa (issues de GitHub/JIRA/ADO)',
      scopeCustom: 'Déjame elegir individualmente',
      customSpecs: '¿Traducir spec.md, plan.md, tasks.md después de crear?',
      customLivingDocs: '¿Traducir living docs al actualizar?',
      customExternal: '¿Traducir issues de GitHub/JIRA/ADO al sincronizar?',
      summary: 'Traducción configurada',
      translationEnabled: 'Traducción: Habilitada (auto)',
      scopeLabel: 'Alcance',
      specsLabel: 'Specs de incrementos',
      livingDocsLabel: 'Living docs',
      externalLabel: 'Herramientas externas',
      enableChoice: '✓ Habilitar traducción (auto)',
      disableChoice: 'Sin traducción',
    },
    zh: {
      header: '📝 自动翻译配置',
      subheader: '配置文档的自动翻译',
      costHeader: '翻译费用通知',
      costLine1: '启用翻译将使令牌使用量大约翻倍：',
      costLine2: '• 每个 spec.md 翻译：~$0.003-0.005',
      costLine3: '• Living docs 更新：  ~$0.002-0.004',
      costLine4: '• GitHub/JIRA 同步：  ~$0.001-0.002',
      costLine5: '预计每月增加：$0.50-$2.00（取决于活动量）',
      enableQuestion: '启用自动翻译？',
      disabled: '翻译：已禁用',
      manualHint: '手动使用 /sw:translate',
      scopeQuestion: '什么应该自动翻译？',
      scopeAll: '全部（specs + living docs + 外部工具）',
      scopeLivingDocs: '仅 living docs（内部文档）',
      scopeExternal: '仅外部同步（GitHub/JIRA/ADO issues）',
      scopeCustom: '让我单独选择',
      customSpecs: '创建后翻译 spec.md、plan.md、tasks.md？',
      customLivingDocs: '更新时翻译 living docs？',
      customExternal: '同步时翻译 GitHub/JIRA/ADO issues？',
      summary: '翻译已配置',
      translationEnabled: '翻译：已启用（自动）',
      scopeLabel: '范围',
      specsLabel: '增量规范',
      livingDocsLabel: 'Living docs',
      externalLabel: '外部工具',
      enableChoice: '✓ 启用翻译（自动）',
      disableChoice: '不翻译',
    },
    de: {
      header: '📝 Auto-Übersetzung Konfiguration',
      subheader: 'Konfigurieren Sie die automatische Übersetzung der Dokumentation',
      costHeader: 'ÜBERSETZUNGSKOSTEN-HINWEIS',
      costLine1: 'Das Aktivieren der Übersetzung wird den Token-Verbrauch ungefähr VERDOPPELN:',
      costLine2: '• Jede spec.md Übersetzung: ~$0.003-0.005',
      costLine3: '• Living docs Update:       ~$0.002-0.004',
      costLine4: '• GitHub/JIRA Sync:         ~$0.001-0.002',
      costLine5: 'Geschätzte monatliche Erhöhung: $0.50-$2.00 (abhängig von Aktivität)',
      enableQuestion: 'Automatische Übersetzung aktivieren?',
      disabled: 'Übersetzung: Deaktiviert',
      manualHint: 'verwenden Sie /sw:translate manuell',
      scopeQuestion: 'Was soll automatisch übersetzt werden?',
      scopeAll: 'Alles (specs + living docs + externe Tools)',
      scopeLivingDocs: 'Nur living docs (interne Dokumentation)',
      scopeExternal: 'Nur externe Sync (GitHub/JIRA/ADO issues)',
      scopeCustom: 'Einzeln auswählen',
      customSpecs: 'spec.md, plan.md, tasks.md nach Erstellung übersetzen?',
      customLivingDocs: 'Living docs bei Update übersetzen?',
      customExternal: 'GitHub/JIRA/ADO issues bei Sync übersetzen?',
      summary: 'Übersetzung konfiguriert',
      translationEnabled: 'Übersetzung: Aktiviert (auto)',
      scopeLabel: 'Bereich',
      specsLabel: 'Increment Specs',
      livingDocsLabel: 'Living docs',
      externalLabel: 'Externe Tools',
      enableChoice: '✓ Übersetzung aktivieren (auto)',
      disableChoice: 'Keine Übersetzung',
    },
    fr: {
      header: '📝 Configuration de traduction automatique',
      subheader: 'Configurez la traduction automatique de la documentation',
      costHeader: 'AVIS DE COÛT DE TRADUCTION',
      costLine1: 'L\'activation de la traduction DOUBLERA approximativement l\'utilisation des tokens:',
      costLine2: '• Chaque traduction spec.md: ~$0.003-0.005',
      costLine3: '• Mise à jour living docs:   ~$0.002-0.004',
      costLine4: '• Sync GitHub/JIRA:          ~$0.001-0.002',
      costLine5: 'Augmentation mensuelle estimée: $0.50-$2.00 (dépend de l\'activité)',
      enableQuestion: 'Activer la traduction automatique?',
      disabled: 'Traduction: Désactivée',
      manualHint: 'utilisez /sw:translate manuellement',
      scopeQuestion: 'Que faut-il traduire automatiquement?',
      scopeAll: 'Tout (specs + living docs + outils externes)',
      scopeLivingDocs: 'Living docs uniquement (documentation interne)',
      scopeExternal: 'Sync externe uniquement (issues GitHub/JIRA/ADO)',
      scopeCustom: 'Choisir individuellement',
      customSpecs: 'Traduire spec.md, plan.md, tasks.md après création?',
      customLivingDocs: 'Traduire living docs lors de la mise à jour?',
      customExternal: 'Traduire issues GitHub/JIRA/ADO lors de la sync?',
      summary: 'Traduction configurée',
      translationEnabled: 'Traduction: Activée (auto)',
      scopeLabel: 'Portée',
      specsLabel: 'Specs d\'incréments',
      livingDocsLabel: 'Living docs',
      externalLabel: 'Outils externes',
      enableChoice: '✓ Activer la traduction (auto)',
      disableChoice: 'Pas de traduction',
    },
    ja: {
      header: '📝 自動翻訳設定',
      subheader: 'ドキュメントの自動翻訳を設定',
      costHeader: '翻訳コスト通知',
      costLine1: '翻訳を有効にすると、トークン使用量がほぼ2倍になります：',
      costLine2: '• 各 spec.md 翻訳：~$0.003-0.005',
      costLine3: '• Living docs 更新： ~$0.002-0.004',
      costLine4: '• GitHub/JIRA 同期： ~$0.001-0.002',
      costLine5: '推定月額増加：$0.50-$2.00（活動量による）',
      enableQuestion: '自動翻訳を有効にしますか？',
      disabled: '翻訳：無効',
      manualHint: '手動で /sw:translate を使用',
      scopeQuestion: '何を自動翻訳しますか？',
      scopeAll: 'すべて（specs + living docs + 外部ツール）',
      scopeLivingDocs: 'living docs のみ（内部ドキュメント）',
      scopeExternal: '外部同期のみ（GitHub/JIRA/ADO issues）',
      scopeCustom: '個別に選択',
      customSpecs: '作成後に spec.md, plan.md, tasks.md を翻訳？',
      customLivingDocs: '更新時に living docs を翻訳？',
      customExternal: '同期時に GitHub/JIRA/ADO issues を翻訳？',
      summary: '翻訳が設定されました',
      translationEnabled: '翻訳：有効（自動）',
      scopeLabel: '範囲',
      specsLabel: 'インクリメント仕様',
      livingDocsLabel: 'Living docs',
      externalLabel: '外部ツール',
      enableChoice: '✓ 翻訳を有効にする（自動）',
      disableChoice: '翻訳なし',
    },
    ko: {
      header: '📝 자동 번역 구성',
      subheader: '문서의 자동 번역 구성',
      costHeader: '번역 비용 알림',
      costLine1: '번역을 활성화하면 토큰 사용량이 약 2배로 증가합니다:',
      costLine2: '• 각 spec.md 번역: ~$0.003-0.005',
      costLine3: '• Living docs 업데이트: ~$0.002-0.004',
      costLine4: '• GitHub/JIRA 동기화: ~$0.001-0.002',
      costLine5: '예상 월 증가: $0.50-$2.00 (활동량에 따라 다름)',
      enableQuestion: '자동 번역을 활성화하시겠습니까?',
      disabled: '번역: 비활성화됨',
      manualHint: '수동으로 /sw:translate 사용',
      scopeQuestion: '무엇을 자동 번역하시겠습니까?',
      scopeAll: '전체 (specs + living docs + 외부 도구)',
      scopeLivingDocs: 'living docs만 (내부 문서)',
      scopeExternal: '외부 동기화만 (GitHub/JIRA/ADO issues)',
      scopeCustom: '개별 선택',
      customSpecs: '생성 후 spec.md, plan.md, tasks.md 번역?',
      customLivingDocs: '업데이트 시 living docs 번역?',
      customExternal: '동기화 시 GitHub/JIRA/ADO issues 번역?',
      summary: '번역이 구성되었습니다',
      translationEnabled: '번역: 활성화됨 (자동)',
      scopeLabel: '범위',
      specsLabel: '증분 사양',
      livingDocsLabel: 'Living docs',
      externalLabel: '외부 도구',
      enableChoice: '✓ 번역 활성화 (자동)',
      disableChoice: '번역 없음',
    },
    pt: {
      header: '📝 Configuração de tradução automática',
      subheader: 'Configure a tradução automática da documentação',
      costHeader: 'AVISO DE CUSTO DE TRADUÇÃO',
      costLine1: 'Ativar tradução aproximadamente DOBRARÁ o uso de tokens:',
      costLine2: '• Cada tradução de spec.md: ~$0.003-0.005',
      costLine3: '• Atualização de living docs: ~$0.002-0.004',
      costLine4: '• Sinc. GitHub/JIRA:          ~$0.001-0.002',
      costLine5: 'Aumento mensal estimado: $0.50-$2.00 (depende da atividade)',
      enableQuestion: 'Habilitar tradução automática?',
      disabled: 'Tradução: Desabilitada',
      manualHint: 'use /sw:translate manualmente',
      scopeQuestion: 'O que deve ser traduzido automaticamente?',
      scopeAll: 'Tudo (specs + living docs + ferramentas externas)',
      scopeLivingDocs: 'Apenas living docs (documentação interna)',
      scopeExternal: 'Apenas sinc. externa (issues GitHub/JIRA/ADO)',
      scopeCustom: 'Deixe-me escolher individualmente',
      customSpecs: 'Traduzir spec.md, plan.md, tasks.md após criação?',
      customLivingDocs: 'Traduzir living docs ao atualizar?',
      customExternal: 'Traduzir issues GitHub/JIRA/ADO ao sincronizar?',
      summary: 'Tradução configurada',
      translationEnabled: 'Tradução: Habilitada (auto)',
      scopeLabel: 'Escopo',
      specsLabel: 'Specs de incrementos',
      livingDocsLabel: 'Living docs',
      externalLabel: 'Ferramentas externas',
      enableChoice: '✓ Habilitar tradução (auto)',
      disableChoice: 'Sem tradução',
    },
  };

  return strings[language] || strings.en;
}

/**
 * Prompt user for translation configuration
 *
 * NOTE: Language is already selected in language-selection.ts
 * This only handles auto-translation scope configuration.
 *
 * CRITICAL: Shows cost warning before enabling translation
 * User must explicitly opt-in to translation (default: disabled)
 *
 * @param languageResult - Result from language selection (language + bilingual preference)
 * @returns Translation configuration result
 */
export async function promptTranslationConfig(
  languageResult?: LanguageSelectionResult
): Promise<TranslationConfigResult> {
  // Get language from result or use English default
  const language = languageResult?.language || 'en';
  const keepEnglishOriginals = languageResult?.keepEnglishOriginals || false;
  const strings = getTranslationStrings(language);

  // If English selected, no translation needed
  if (language === 'en') {
    return {
      language: 'en',
      translationEnabled: false,
      translationScope: { livingDocs: false, externalSync: false, incrementSpecs: false },
      keepEnglishOriginals: false,
    };
  }

  console.log('');
  console.log(chalk.cyan.bold(strings.header));
  console.log(chalk.gray(`   ${strings.subheader}`));
  console.log('');

  // STEP 1: Cost Warning (CRITICAL!)
  console.log(chalk.yellow.bold(`⚠️  ${strings.costHeader}`));
  console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.white(`   ${strings.costLine1}`));
  console.log('');
  console.log(chalk.gray(`   ${strings.costLine2}`));
  console.log(chalk.gray(`   ${strings.costLine3}`));
  console.log(chalk.gray(`   ${strings.costLine4}`));
  console.log('');
  console.log(chalk.gray(`   ${strings.costLine5}`));
  console.log(chalk.gray('   Translation uses Claude Haiku (cheapest model).'));
  console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  // STEP 2: Enable Translation? (with go-back option)
  const goBackStrings = getGoBackStrings(language);
  const enableChoice = await select<'yes' | 'no' | 'back'>({
    message: strings.enableQuestion,
    choices: [
      { value: 'no', name: strings.disableChoice },
      { value: 'yes', name: strings.enableChoice },
      { value: 'back', name: chalk.gray(goBackStrings.goBack) },
    ],
    default: 'no', // Default to NO (opt-in, not opt-out)
  });

  // Handle go back
  if (enableChoice === 'back') {
    return {
      language,
      translationEnabled: false,
      translationScope: { livingDocs: false, externalSync: false, incrementSpecs: false },
      keepEnglishOriginals,
      goBack: WIZARD_BACK,
    };
  }

  if (enableChoice === 'no') {
    console.log('');
    console.log(chalk.green(`   ✔ ${strings.disabled} (${strings.manualHint})`));
    console.log('');
    return {
      language,
      translationEnabled: false,
      translationScope: { livingDocs: false, externalSync: false, incrementSpecs: false },
      keepEnglishOriginals,
    };
  }

  // STEP 3: Translation Scope
  const scope = await select<'all' | 'living-docs' | 'external' | 'custom'>({
    message: strings.scopeQuestion,
    choices: [
      { name: strings.scopeAll, value: 'all' as const },
      { name: strings.scopeLivingDocs, value: 'living-docs' as const },
      { name: strings.scopeExternal, value: 'external' as const },
      { name: strings.scopeCustom, value: 'custom' as const },
    ],
    default: 'living-docs'
  });

  let translationScope: TranslationScope = { livingDocs: false, externalSync: false, incrementSpecs: false };

  if (scope === 'all') {
    translationScope = { livingDocs: true, externalSync: true, incrementSpecs: true };
  } else if (scope === 'living-docs') {
    translationScope = { livingDocs: true, externalSync: false, incrementSpecs: true };
  } else if (scope === 'external') {
    translationScope = { livingDocs: false, externalSync: true, incrementSpecs: false };
  } else {
    // Custom selection
    translationScope.incrementSpecs = await confirm({
      message: strings.customSpecs,
      default: true,
    });
    translationScope.livingDocs = await confirm({
      message: strings.customLivingDocs,
      default: true,
    });
    translationScope.externalSync = await confirm({
      message: strings.customExternal,
      default: false,
    });
  }

  // Summary
  console.log('');
  console.log(chalk.green(`   ✔ ${strings.translationEnabled}`));
  if (translationScope.incrementSpecs) console.log(chalk.green(`   ✔ ${strings.scopeLabel}: ${strings.specsLabel}`));
  if (translationScope.livingDocs) console.log(chalk.green(`   ✔ ${strings.scopeLabel}: ${strings.livingDocsLabel}`));
  if (translationScope.externalSync) console.log(chalk.green(`   ✔ ${strings.scopeLabel}: ${strings.externalLabel}`));
  console.log('');

  return {
    language,
    translationEnabled: true,
    translationScope,
    keepEnglishOriginals,
  };
}

/**
 * Update config.json with translation configuration
 *
 * @param targetDir - Project directory
 * @param config - Translation configuration result
 */
export function updateConfigWithTranslation(
  targetDir: string,
  config: TranslationConfigResult
): void {
  const configPath = path.join(targetDir, '.specweave', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('⚠️  config.json not found, cannot update translation configuration'));
    return;
  }

  const existingConfig = fs.readJsonSync(configPath);

  // Update language at root level
  existingConfig.language = config.language;

  // Update translation configuration
  existingConfig.translation = {
    enabled: config.translationEnabled,
    languages: config.translationEnabled ? ['en', config.language] : ['en'],
    primary: config.language,
    method: config.translationEnabled ? 'auto' : 'manual',
    preserveFrameworkTerms: true,
    scope: config.translationScope,
    keepEnglishOriginals: config.keepEnglishOriginals,
  };

  fs.writeJsonSync(configPath, existingConfig, { spaces: 2 });
}

/**
 * Get translation configuration for CI/non-interactive mode
 *
 * @param language - Language code from CLI options
 * @returns Default translation configuration (disabled)
 */
export function getDefaultTranslationConfig(language: SupportedLanguage = 'en'): TranslationConfigResult {
  return {
    language,
    translationEnabled: false,
    translationScope: { livingDocs: false, externalSync: false, incrementSpecs: false },
    keepEnglishOriginals: false,
  };
}
