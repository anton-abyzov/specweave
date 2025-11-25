/**
 * Init command helpers - barrel export
 */

// Types
export * from './types.js';

// Path utilities
export {
  findPackageRoot,
  findSourceDir,
  detectNestedSpecweave,
  countFilesRecursive,
} from './path-utils.js';

// Config detection
export {
  detectGitHubRemote,
  detectJiraConfig,
  detectADOConfig,
  detectAllConfigs,
} from './config-detection.js';

// Smart re-initialization
export {
  promptSmartReinit,
  type SmartReinitOptions,
  type SmartReinitResult,
} from './smart-reinit.js';

// Plugin installation
export {
  installAllPlugins,
  type PluginInstallOptions,
  type PluginInstallResult,
} from './plugin-installer.js';

// Repository setup
export {
  setupRepositoryHosting,
  type RepositorySetupOptions,
  type RepositorySetupResult,
} from './repository-setup.js';

// Testing configuration
export {
  promptTestingConfig,
  updateConfigWithTesting,
  type TestingConfigResult,
} from './testing-config.js';

// Language selection (MUST be first in init)
export {
  promptLanguageSelection,
  getDefaultLanguageSelection,
  getLanguageNativeName,
  type LanguageSelectionResult,
} from './language-selection.js';

// Translation configuration
export {
  promptTranslationConfig,
  updateConfigWithTranslation,
  getDefaultTranslationConfig,
  type TranslationConfigResult,
  type TranslationScope,
} from './translation-config.js';

// External import
export {
  promptAndRunExternalImport,
} from './external-import.js';

// Directory structure
export {
  createDirectoryStructure,
  copyTemplates,
  createConfigFile,
} from './directory-structure.js';

// Next steps
export {
  showNextSteps,
} from './next-steps.js';

// Initial increment generator (existing)
export {
  generateInitialIncrement,
  type InitialIncrementOptions,
} from './initial-increment-generator.js';
