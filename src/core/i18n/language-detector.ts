/**
 * Language Detector
 * 
 * Detects language from environment variables, file content, or system locale.
 * 
 * @module core/i18n
 */

import { SupportedLanguage, LanguageDetectionResult } from './types.js';
import { isLanguageSupported } from './language-registry.js';

/**
 * Detect language from environment
 */
export function detectLanguageFromEnvironment(): LanguageDetectionResult {
  // Check NODE_LANG env var
  const nodeLang = process.env.NODE_LANG || process.env.LANG || '';
  
  // Extract language code (e.g., "en_US.UTF-8" -> "en")
  const langCode = nodeLang.split('_')[0].split('.')[0].toLowerCase();

  if (isLanguageSupported(langCode)) {
    return {
      language: langCode,
      confidence: 0.9,
      reliable: true,
    };
  }

  // Default to English
  return {
    language: 'en',
    confidence: 1.0,
    reliable: true,
  };
}

/**
 * Detect language from file content
 * Uses simple heuristics based on character sets
 */
export function detectLanguageFromContent(content: string): LanguageDetectionResult {
  // Check for Cyrillic characters (Russian)
  if (/[А-Яа-я]/.test(content)) {
    return {
      language: 'ru',
      confidence: 0.8,
      reliable: true,
    };
  }

  // Check for CJK characters (Chinese, Japanese, Korean)
  if (/[\u4E00-\u9FFF]/.test(content)) {
    // Could be Chinese or Japanese, default to Chinese
    return {
      language: 'zh',
      confidence: 0.7,
      reliable: false, // Not very reliable without more analysis
    };
  }

  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(content)) {
    // Hiragana/Katakana - Japanese
    return {
      language: 'ja',
      confidence: 0.9,
      reliable: true,
    };
  }

  if (/[\uAC00-\uD7AF]/.test(content)) {
    // Hangul - Korean
    return {
      language: 'ko',
      confidence: 0.9,
      reliable: true,
    };
  }

  // Check for common Spanish words
  if (/\b(el|la|los|las|un|una|de|que|en)\b/i.test(content)) {
    return {
      language: 'es',
      confidence: 0.6,
      reliable: false,
    };
  }

  // Check for common French words
  if (/\b(le|la|les|un|une|de|que|et)\b/i.test(content)) {
    return {
      language: 'fr',
      confidence: 0.6,
      reliable: false,
    };
  }

  // Check for common German words
  if (/\b(der|die|das|ein|eine|und|ist|das)\b/i.test(content)) {
    return {
      language: 'de',
      confidence: 0.6,
      reliable: false,
    };
  }

  // Check for common Portuguese words
  if (/\b(o|a|os|as|um|uma|de|que|em)\b/i.test(content)) {
    return {
      language: 'pt',
      confidence: 0.6,
      reliable: false,
    };
  }

  // Default to English
  return {
    language: 'en',
    confidence: 0.5,
    reliable: false,
  };
}

/**
 * Detect language with fallback chain
 */
export function detectLanguage(options?: {
  content?: string;
  fallback?: SupportedLanguage;
}): LanguageDetectionResult {
  const { content, fallback = 'en' } = options || {};

  // Try content-based detection first
  if (content) {
    const contentResult = detectLanguageFromContent(content);
    if (contentResult.reliable && contentResult.confidence > 0.7) {
      return contentResult;
    }
  }

  // Try environment detection
  const envResult = detectLanguageFromEnvironment();
  if (envResult.reliable) {
    return envResult;
  }

  // Use fallback
  return {
    language: fallback,
    confidence: 1.0,
    reliable: true,
  };
}

/**
 * Parse language code from string (handles various formats)
 */
export function parseLanguageCode(code: string): SupportedLanguage | null {
  // Normalize: lowercase, extract first part
  const normalized = code.toLowerCase().split(/[-_]/)[0];

  if (isLanguageSupported(normalized)) {
    return normalized;
  }

  return null;
}
