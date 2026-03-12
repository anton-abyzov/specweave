/**
 * Init command helpers - barrel export
 *
 * Simplified (v1.0.415): Removed exports for helpers no longer used by init
 * (external tool setup, brownfield analysis, testing/translation config).
 * Those modules still exist for use by other commands but aren't re-exported here.
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
  detectUmbrellaParent,
  detectSuspiciousPath,
  scanUmbrellaRepos,
  scanMisplacedRepos,
  buildUmbrellaConfig,
  SUSPICIOUS_PATH_SEGMENTS,
} from './path-utils.js';

// Config detection
export {
  detectGitHubRemote,
  detectJiraConfig,
  detectADOConfig,
  detectAllConfigs,
} from './config-detection.js';

// Provider detection (git remote → provider/owner/repo)
export {
  detectProvider,
  type ProviderInfo,
} from './provider-detection.js';

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

// Language selection (MUST be first in init)
export {
  promptLanguageSelection,
  getDefaultLanguageSelection,
  getLanguageNativeName,
  type LanguageSelectionResult,
} from './language-selection.js';

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

// Instruction file merger (CLAUDE.md/AGENTS.md)
export {
  mergeInstructionFile,
  parseTemplateSections,
  getPackageVersion,
  type TemplateType,
  type TemplateSection,
  type MergeResult,
} from './instruction-file-merger.js';

// Repo connect (post-scaffold project setup)
export {
  parseRepoInput,
  promptProjectSetup,
  promptRepoUrls,
  cloneReposIntoWorkspace,
  type ProjectSetupChoice,
  type ParsedRepo,
  type RepoConnectResult,
} from './repo-connect.js';

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
