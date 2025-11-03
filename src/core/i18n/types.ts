/**
 * SpecWeave i18n Type Definitions
 *
 * LLM-native multilingual support using system prompt injection
 * instead of traditional translation.
 *
 * @module core/i18n
 * @version 0.6.0
 */

/**
 * Supported languages for SpecWeave
 */
export type SupportedLanguage =
  | 'en'
  | 'ru'
  | 'es'
  | 'zh'
  | 'de'
  | 'fr'
  | 'ja'
  | 'ko'
  | 'pt';

/**
 * Translation options for different content types
 */
export interface TranslateOptions {
  targetLanguage: SupportedLanguage;
  contextType?: 'cli' | 'template' | 'docs' | 'living-docs' | 'code-comments';
  preserveMarkdown?: boolean;
  preserveCodeBlocks?: boolean;
  keepFrameworkTerms?: boolean;
  keepTechnicalTerms?: boolean;
}

/**
 * Locale-specific strings for CLI prompts and messages
 */
export interface LocaleStrings {
  cli: {
    welcome: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  increment: {
    created: string;
    inProgress: string;
    completed: string;
    failed: string;
    taskComplete: string;
    allTasksComplete: string;
  };
  validation: {
    invalidInput: string;
    missingFile: string;
    incompleteTasks: string;
    blockingIncrement: string;
  };
  gates: {
    taskGatePass: string;
    taskGateFail: string;
    testGatePass: string;
    testGateFail: string;
    docsGatePass: string;
    docsGateFail: string;
  };
}

/**
 * Configuration for language-specific behavior
 */
export interface LanguageConfig {
  code: SupportedLanguage;
  nativeName: string;
  englishName: string;
  systemPrompt: string;
  rtl: boolean;
  strings: LocaleStrings;
}

/**
 * User preferences for language settings
 */
export interface UserLanguagePreference {
  primary: SupportedLanguage;
  secondary?: SupportedLanguage;
  codeCommentsInEnglish?: boolean;
  frameworkTermsInEnglish?: boolean;
}

/**
 * System prompt injection template
 */
export interface SystemPromptTemplate {
  language: SupportedLanguage;
  prompt: string;
  placement: 'top' | 'after-frontmatter' | 'bottom';
}

/**
 * Translation result
 */
export interface TranslationResult {
  original: string;
  translated: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  method: 'system-prompt' | 'in-session' | 'cached';
  tokenCost?: number;
  warnings?: string[];
}

/**
 * Language detection result
 */
export interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number;
  reliable: boolean;
}

/**
 * Global i18n configuration
 */
export interface I18nConfig {
  /** Default language */
  defaultLanguage: SupportedLanguage;

  /** Enabled languages */
  enabledLanguages: SupportedLanguage[];

  /** Auto-detect user language from environment */
  autoDetect: boolean;

  /** Translation cache settings */
  cache?: {
    enabled: boolean;
    ttl: number; // seconds
  };
}

/**
 * Language metadata for display and selection
 */
export interface LanguageMetadata {
  /** Language code */
  code: SupportedLanguage;

  /** Native name (e.g., "Русский" for Russian) */
  nativeName: string;

  /** English name */
  englishName: string;

  /** Flag emoji */
  flag: string;

  /** Completion percentage (0-100) */
  completionPercent: number;
}

/**
 * Translation configuration for project
 */
export interface TranslationConfig {
  /** Enabled languages for this project */
  languages: SupportedLanguage[];

  /** Primary language */
  primary: SupportedLanguage;

  /** Translation method preference */
  method: 'system-prompt' | 'in-session' | 'auto';

  /** Keep framework terms in English */
  preserveFrameworkTerms: boolean;
}
