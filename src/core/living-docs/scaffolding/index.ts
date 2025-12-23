/**
 * Living Docs Scaffolding Module
 *
 * Provides template engine, scaffolding, and merging functionality
 * for creating living documentation structures in user projects.
 *
 * @module core/living-docs/scaffolding
 */

// Template Engine
export {
  TemplateEngine,
  getTemplateEngine,
  renderTemplate,
  createDefaultContext,
  type TemplateContext,
} from './template-engine.js';

// Scaffold
export {
  LivingDocsScaffold,
  scaffoldLivingDocs,
  hasLivingDocsStructure,
  type ScaffoldOptions,
  type ScaffoldResult,
} from './scaffold.js';

// Merger
export {
  LivingDocsMerger,
  scanExistingDocs,
  findSimilarFolders,
  type DetectedDoc,
  type DocType,
  type MergeOptions,
  type MergeResult,
  type SimilarityResult,
} from './merger.js';
