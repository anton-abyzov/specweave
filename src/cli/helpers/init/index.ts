/**
 * Init command helpers - barrel export
 */

// Wizard navigation (go-back support)
export {
  WIZARD_BACK,
  isGoBack,
  getGoBackStrings,
  createGoBackChoice,
  logGoingBack,
  type WizardResult,
} from './wizard-navigation.js';

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

// Plugin enabler
export {
  enablePluginsInSettings,
  enablePlugin,
} from './claude-plugin-enabler.js';

// Repository setup
export {
  setupRepositoryHosting,
  type RepositorySetupOptions,
  type RepositorySetupResult,
  type AdoProjectSelection,
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
  scanAndSuggestMerges,
} from './directory-structure.js';

// Next steps
export {
  showNextSteps,
  type ShowNextStepsOptions,
} from './next-steps.js';

// Git hooks installation
export {
  installGitHooks,
  uninstallGitHooks,
  areGitHooksInstalled,
} from './git-hooks-installer.js';

// v1.0.27: Removed initial-increment-generator exports
// Reason: Automatic increment creation removed - requires **Project**: field per US
// File kept for reference but no longer used

// Brownfield analysis configuration
export {
  promptBrownfieldAnalysis,
  updateConfigWithBrownfield,
  detectExistingDocsLocations,
  type BrownfieldAnalysisConfig,
  type AnalysisDepth,
  type DetectedDocsLocation,
} from './brownfield-analysis.js';

// Instruction file merger (CLAUDE.md/AGENTS.md)
export {
  mergeInstructionFile,
  parseTemplateSections,
  getPackageVersion,
  type TemplateType,
  type TemplateSection,
  type MergeResult,
} from './instruction-file-merger.js';

// Smart .gitignore generator (v1.0.130+)
export {
  generateSmartGitignore,
  detectTechStack,
  generateGitignore,
  generateRepoGitignore,
  writeGitignore,
  type DetectedTech,
  type TechCategory,
  type TechStackDetection,
} from './gitignore-generator.js';

// Deep interview mode configuration (v1.0.195+)
export {
  promptDeepInterviewConfig,
  updateConfigWithDeepInterview,
  type DeepInterviewConfigResult,
} from './deep-interview-config.js';

// Quality gates configuration (v1.0.226+)
export {
  promptQualityGatesConfig,
  updateConfigWithQualityGates,
  getQualityGatePreset,
  type QualityGatesConfigResult,
  type QualityGatePreset,
  type QualityGateSettings,
} from './quality-gates-config.js';
