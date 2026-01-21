/**
 * Item Converter Module
 *
 * Converts external items (GitHub/JIRA/ADO) to SpecWeave living docs User Stories.
 * CRITICAL: Does NOT create increments - only creates living docs.
 *
 * @module importers/item-converter
 * @since v1.0.115
 */

// Types
export type {
  ConvertedUserStory,
  ItemConverterOptions,
  Platform,
  GroupKey,
  ExternalItem,
} from './types.js';

// Hierarchy Mapping
export {
  normalizeAdoWorkItemType,
  getDefaultMapping,
  typeMatchesArray,
  getSpecWeaveLevel,
  isFeatureLevelType,
  getJiraWorkItemTypeLabel,
} from './hierarchy-mapper.js';

// Path Resolution
export {
  getBaseDirectory,
  shouldAutoArchive,
  shouldArchiveEntireGroup,
  cleanupEmptyFeatureFolder,
} from './path-resolver.js';

// Feature Folder Creation
export {
  createFeatureFolder,
  createOrphansFolder,
  type FeatureFolderOptions,
} from './feature-folder-creator.js';

// Parent Change Handling
export {
  hasParentChanged,
  updateParentMetadataInContent,
  moveUserStoryFile,
  type MoveFileResult,
} from './parent-change-handler.js';

// Duplicate Scanning
export {
  findExistingFeatureFolders,
  groupHasNonDuplicates,
} from './duplicate-scanner.js';
