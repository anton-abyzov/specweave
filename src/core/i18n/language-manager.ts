/**
 * Language Manager
 *
 * Central manager for all i18n operations in SpecWeave.
 * Coordinates language detection, switching, and translation.
 *
 * @module core/i18n
 */

import fs from 'fs-extra';
import path from 'path';
import { 
  SupportedLanguage, 
  I18nConfig, 
  UserLanguagePreference,
  LanguageConfig,
  LocaleStrings,
} from './types.js';
import { 
  getLanguageConfig, 
  getLanguageMetadata,
  getAllLanguages,
  LANGUAGE_CONFIGS,
} from './language-registry.js';
import { detectLanguage, detectLanguageFromEnvironment } from './language-detector.js';
import { injectSystemPrompt, injectPromptsIntoDirectory } from './system-prompt-injector.js';

/**
 * Central language manager singleton
 */
export class LanguageManager {
  private currentLanguage: SupportedLanguage;
  private config: I18nConfig;
  private userPreference?: UserLanguagePreference;

  constructor(config?: Partial<I18nConfig>) {
    // Initialize with defaults
    this.config = {
      defaultLanguage: config?.defaultLanguage || 'en',
      enabledLanguages: config?.enabledLanguages || ['en'],
      autoDetect: config?.autoDetect !== undefined ? config.autoDetect : true,
      cache: config?.cache,
    };

    // Set current language
    if (this.config.autoDetect) {
      const detected = detectLanguageFromEnvironment();
      this.currentLanguage = detected.language;
    } else {
      this.currentLanguage = this.config.defaultLanguage;
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Set current language
   */
  setCurrentLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(language?: SupportedLanguage): LanguageConfig {
    return getLanguageConfig(language || this.currentLanguage);
  }

  /**
   * Get locale strings for current language
   */
  getLocaleStrings(language?: SupportedLanguage): LocaleStrings {
    const config = this.getLanguageConfig(language);
    return config.strings;
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages() {
    return getAllLanguages();
  }

  /**
   * Check if language is enabled
   */
  isLanguageEnabled(language: SupportedLanguage): boolean {
    return this.config.enabledLanguages.includes(language);
  }

  /**
   * Enable a language
   */
  enableLanguage(language: SupportedLanguage): void {
    if (!this.config.enabledLanguages.includes(language)) {
      this.config.enabledLanguages.push(language);
    }
  }

  /**
   * Disable a language
   */
  disableLanguage(language: SupportedLanguage): void {
    this.config.enabledLanguages = this.config.enabledLanguages.filter(
      (lang) => lang !== language
    );
  }

  /**
   * Set user language preference
   */
  setUserPreference(preference: UserLanguagePreference): void {
    this.userPreference = preference;
    this.currentLanguage = preference.primary;
  }

  /**
   * Get user language preference
   */
  getUserPreference(): UserLanguagePreference | undefined {
    return this.userPreference;
  }

  /**
   * Auto-detect language from content
   */
  detectLanguage(content?: string): SupportedLanguage {
    const result = detectLanguage({ content });
    return result.language;
  }

  /**
   * Apply language to project
   * Injects system prompts into all skills/agents/commands
   */
  async applyLanguageToProject(
    projectPath: string,
    targetLanguage: SupportedLanguage,
    options?: {
      includeSkills?: boolean;
      includeAgents?: boolean;
      includeCommands?: boolean;
      overwrite?: boolean;
    }
  ): Promise<void> {
    const {
      includeSkills = true,
      includeAgents = true,
      includeCommands = true,
      overwrite = false,
    } = options || {};

    let totalInjected = 0;

    console.log(`\n🌍 Applying ${targetLanguage} language to project...`);

    // Inject into skills
    if (includeSkills) {
      const skillsPath = path.join(projectPath, '.claude', 'skills');
      if (await fs.pathExists(skillsPath)) {
        console.log(`\n📚 Processing skills...`);
        const count = await injectPromptsIntoDirectory(skillsPath, targetLanguage, {
          overwrite,
          recursive: true,
        });
        totalInjected += count;
      }
    }

    // Inject into agents
    if (includeAgents) {
      const agentsPath = path.join(projectPath, '.claude', 'agents');
      if (await fs.pathExists(agentsPath)) {
        console.log(`\n🤖 Processing agents...`);
        const count = await injectPromptsIntoDirectory(agentsPath, targetLanguage, {
          overwrite,
          recursive: true,
        });
        totalInjected += count;
      }
    }

    // Inject into commands
    if (includeCommands) {
      const commandsPath = path.join(projectPath, '.claude', 'commands');
      if (await fs.pathExists(commandsPath)) {
        console.log(`\n⚡ Processing commands...`);
        const count = await injectPromptsIntoDirectory(commandsPath, targetLanguage, {
          overwrite,
          recursive: true,
        });
        totalInjected += count;
      }
    }

    console.log(`\n✅ Language applied! Injected prompts into ${totalInjected} files.`);
  }

  /**
   * Save configuration to file
   */
  async saveConfig(configPath: string): Promise<void> {
    const config = {
      i18n: {
        defaultLanguage: this.config.defaultLanguage,
        enabledLanguages: this.config.enabledLanguages,
        autoDetect: this.config.autoDetect,
        currentLanguage: this.currentLanguage,
        userPreference: this.userPreference,
      },
    };

    await fs.writeJSON(configPath, config, { spaces: 2 });
    console.log(`✅ Saved i18n configuration to ${configPath}`);
  }

  /**
   * Load configuration from file
   */
  async loadConfig(configPath: string): Promise<void> {
    if (!(await fs.pathExists(configPath))) {
      console.log(`⚠️  Config file not found: ${configPath}`);
      return;
    }

    const data = await fs.readJSON(configPath);
    if (data.i18n) {
      this.config = {
        defaultLanguage: data.i18n.defaultLanguage || 'en',
        enabledLanguages: data.i18n.enabledLanguages || ['en'],
        autoDetect: data.i18n.autoDetect !== undefined ? data.i18n.autoDetect : true,
      };

      if (data.i18n.currentLanguage) {
        this.currentLanguage = data.i18n.currentLanguage;
      }

      if (data.i18n.userPreference) {
        this.userPreference = data.i18n.userPreference;
      }

      console.log(`✅ Loaded i18n configuration from ${configPath}`);
    }
  }
}

// Singleton instance
let instance: LanguageManager | null = null;

/**
 * Get singleton instance
 */
export function getLanguageManager(config?: Partial<I18nConfig>): LanguageManager {
  if (!instance) {
    instance = new LanguageManager(config);
  }
  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetLanguageManager(): void {
  instance = null;
}

/**
 * Static utility: Get system prompt for language
 */
export function getSystemPromptForLanguage(language: SupportedLanguage): string {
  const config = getLanguageConfig(language);
  return config.systemPrompt;
}

/**
 * Static utility: Check if language is supported
 */
export function isLanguageSupported(code: string): code is SupportedLanguage {
  const supported: string[] = ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'];
  return supported.includes(code);
}

/**
 * Static utility: Get all supported languages
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return ['en', 'ru', 'es', 'zh', 'de', 'fr', 'ja', 'ko', 'pt'];
}
