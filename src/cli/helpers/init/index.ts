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
  scanWorkspaceRepos,
  scanMisplacedRepos,
  buildUmbrellaConfig,
  buildWorkspaceConfig,
  isSystemTempDir,
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
  createMinimalConfig,
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
  validateAndParseRepoInput,
  formatRepoInputErrors,
  promptProjectSetup,
  promptRepoUrls,
  mapParsedReposToCloneOptions,
  runForegroundClone,
  FOREGROUND_CLONE_THRESHOLD,
  promptRepoUrlsLoop,
  cloneReposIntoWorkspace, // @deprecated — kept for backward compat
  type ProjectSetupChoice,
  type ParsedRepo,
  type RepoConnectResult,
  type RepoUrlsLoopResult,
  type RepoInputValidation,
  type RepoInputError,
} from './repo-connect.js';

// Workspace setup (non-empty folder detection — 0640)
export {
  scanWorkspaceContent,
  promptMigrationChoice,
  promptStartEmptySubChoice,
  restructureIntoRepositories,
  copyLocalPathIntoRepositories,
  showRestructureWarnings,
  detectOrgRepo,
  promptOrgRepo,
  type WorkspaceContentScan,
  type MigrationChoice,
  type RestructureResult,
} from './workspace-setup.js';

// Root repo detection (early GitHub connection — 0640)
export {
  detectRootRepo,
  promptRootRepoConnection,
  type RootRepoInfo,
} from './root-repo-detection.js';

// Skill-creator auto-installer (v1.0.548+)
export {
  ensureSkillCreator,
  type EnsureSkillCreatorResult,
} from './skill-creator-installer.js';

// Vskill init invoker — syncs skills to non-Claude agents (v1.0.569+)
export {
  ensureVskillInit,
  type VskillInitResult,
} from './vskill-init-invoker.js';

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
