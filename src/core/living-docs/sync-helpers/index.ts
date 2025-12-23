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
