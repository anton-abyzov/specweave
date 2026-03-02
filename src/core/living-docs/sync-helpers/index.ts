/**
 * Sync Helpers - Extracted utilities from LivingDocsSync
 * @module core/living-docs/sync-helpers
 */

// Parsers
export {
  calculateUSStatus,
  extractUserStories,
  extractAcceptanceCriteria,
} from './parsers.js';

// Generators
export {
  generateFeatureFile,
  generateReadmeFile,
  generateUserStoryFile,
  slugifyTitle,
  extractFirstSentence,
  type UserStoryFileOptions,
  type GeneratorContext,
} from './generators.js';

// File utilities
export {
  pathExists,
  readJson,
  ensureDir,
  findExistingUserStoryFile,
  cleanupDuplicateFiles,
  cleanupTempFiles,
} from './file-utils.js';

// Hierarchy builder (v1.0.115)
export {
  HierarchyBuilder,
  type MultiProjectDetection,
  type HierarchyBuilderOptions,
} from './hierarchy-builder.js';
