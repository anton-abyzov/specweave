/**
 * Language Registry - Metadata for all supported languages
 * 
 * Provides native names, system prompts, and configuration for each language.
 * 
 * @module core/i18n
 */

import { SupportedLanguage, LanguageMetadata, LanguageConfig, LocaleStrings } from './types.js';

/**
 * Language metadata for UI display and selection
 */
export const LANGUAGE_METADATA: Record<SupportedLanguage, LanguageMetadata> = {
  en: {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    flag: '🇬🇧',
    completionPercent: 100,
  },
  ru: {
    code: 'ru',
    nativeName: 'Русский',
    englishName: 'Russian',
    flag: '🇷🇺',
    completionPercent: 0,
  },
  es: {
    code: 'es',
    nativeName: 'Español',
    englishName: 'Spanish',
    flag: '🇪🇸',
    completionPercent: 0,
  },
  zh: {
    code: 'zh',
    nativeName: '中文',
    englishName: 'Chinese',
    flag: '🇨🇳',
    completionPercent: 0,
  },
  de: {
    code: 'de',
    nativeName: 'Deutsch',
    englishName: 'German',
    flag: '🇩🇪',
    completionPercent: 0,
  },
  fr: {
    code: 'fr',
    nativeName: 'Français',
    englishName: 'French',
    flag: '🇫🇷',
    completionPercent: 0,
  },
  ja: {
    code: 'ja',
    nativeName: '日本語',
    englishName: 'Japanese',
    flag: '🇯🇵',
    completionPercent: 0,
  },
  ko: {
    code: 'ko',
    nativeName: '한국어',
    englishName: 'Korean',
    flag: '🇰🇷',
    completionPercent: 0,
  },
  pt: {
    code: 'pt',
    nativeName: 'Português',
    englishName: 'Portuguese',
    flag: '🇧🇷',
    completionPercent: 0,
  },
};

/**
 * System prompts for LLM-native translation
 * These are injected at the top of skills/agents/commands
 */
export const SYSTEM_PROMPTS: Record<SupportedLanguage, string> = {
  en: '', // No prompt needed for English (default)
  ru: '**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation MUST be in Russian (Русский). Maintain technical terms in English when appropriate.',
  es: '**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation MUST be in Spanish (Español). Maintain technical terms in English when appropriate.',
  zh: '**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation MUST be in Simplified Chinese (简体中文). Maintain technical terms in English when appropriate.',
  de: '**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation MUST be in German (Deutsch). Maintain technical terms in English when appropriate.',
  fr: '**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation MUST be in French (Français). Maintain technical terms in English when appropriate.',
  ja: '**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation MUST be in Japanese (日本語). Maintain technical terms in English when appropriate.',
  ko: '**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation MUST be in Korean (한국어). Maintain technical terms in English when appropriate.',
  pt: '**LANGUAGE INSTRUCTION**: All responses, generated content, and documentation MUST be in Portuguese (Português). Maintain technical terms in English when appropriate.',
};

/**
 * English locale strings (default)
 */
const ENGLISH_STRINGS: LocaleStrings = {
  cli: {
    welcome: 'Welcome to SpecWeave!',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
  },
  increment: {
    created: 'Increment created',
    inProgress: 'In progress',
    completed: 'Completed',
    failed: 'Failed',
    taskComplete: 'Task completed',
    allTasksComplete: 'All tasks completed',
  },
  validation: {
    invalidInput: 'Invalid input',
    missingFile: 'File not found',
    incompleteTasks: 'Incomplete tasks found',
    blockingIncrement: 'Previous increments must be completed first',
  },
  gates: {
    taskGatePass: 'All tasks completed',
    taskGateFail: 'Some tasks incomplete',
    testGatePass: 'All tests passing',
    testGateFail: 'Some tests failing',
    docsGatePass: 'Documentation up to date',
    docsGateFail: 'Documentation needs update',
  },
};

/**
 * Full language configurations
 * Note: Currently only English has locale strings
 * Other languages will use system prompts for LLM-native translation
 */
export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    systemPrompt: SYSTEM_PROMPTS.en,
    rtl: false,
    strings: ENGLISH_STRINGS,
  },
  ru: {
    code: 'ru',
    nativeName: 'Русский',
    englishName: 'Russian',
    systemPrompt: SYSTEM_PROMPTS.ru,
    rtl: false,
    strings: ENGLISH_STRINGS, // Will be translated via LLM
  },
  es: {
    code: 'es',
    nativeName: 'Español',
    englishName: 'Spanish',
    systemPrompt: SYSTEM_PROMPTS.es,
    rtl: false,
    strings: ENGLISH_STRINGS,
  },
  zh: {
    code: 'zh',
    nativeName: '中文',
    englishName: 'Chinese',
    systemPrompt: SYSTEM_PROMPTS.zh,
    rtl: false,
    strings: ENGLISH_STRINGS,
  },
  de: {
    code: 'de',
    nativeName: 'Deutsch',
    englishName: 'German',
    systemPrompt: SYSTEM_PROMPTS.de,
    rtl: false,
    strings: ENGLISH_STRINGS,
  },
  fr: {
    code: 'fr',
    nativeName: 'Français',
    englishName: 'French',
    systemPrompt: SYSTEM_PROMPTS.fr,
    rtl: false,
    strings: ENGLISH_STRINGS,
  },
  ja: {
    code: 'ja',
    nativeName: '日本語',
    englishName: 'Japanese',
    systemPrompt: SYSTEM_PROMPTS.ja,
    rtl: false,
    strings: ENGLISH_STRINGS,
  },
  ko: {
    code: 'ko',
    nativeName: '한국어',
    englishName: 'Korean',
    systemPrompt: SYSTEM_PROMPTS.ko,
    rtl: false,
    strings: ENGLISH_STRINGS,
  },
  pt: {
    code: 'pt',
    nativeName: 'Português',
    englishName: 'Portuguese',
    systemPrompt: SYSTEM_PROMPTS.pt,
    rtl: false,
    strings: ENGLISH_STRINGS,
  },
};

/**
 * Get language metadata by code
 */
export function getLanguageMetadata(code: SupportedLanguage): LanguageMetadata {
  return LANGUAGE_METADATA[code];
}

/**
 * Get language configuration by code
 */
export function getLanguageConfig(code: SupportedLanguage): LanguageConfig {
  return LANGUAGE_CONFIGS[code];
}

/**
 * Get system prompt for language
 */
export function getSystemPrompt(code: SupportedLanguage): string {
  return SYSTEM_PROMPTS[code];
}

/**
 * Get all supported languages
 */
export function getAllLanguages(): LanguageMetadata[] {
  return Object.values(LANGUAGE_METADATA);
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(code: string): code is SupportedLanguage {
  return code in LANGUAGE_METADATA;
}
