/**
 * Enterprise Living Docs Module
 *
 * Generates comprehensive enterprise-grade documentation:
 * - Full spec catalog with all features and user stories
 * - Project history and timeline
 * - Team directory with ownership mapping
 * - Cross-references and relationship diagrams
 */

export { EnhancedSpecLoader } from './spec-loader.js';
export type {
  SpecsCatalog,
  EnhancedFeatureSpec,
  UserStoryDetail,
  AcceptanceCriterion,
  ExternalReference,
  SpecLoaderOptions,
} from './spec-loader.js';

export { EnterpriseGenerator } from './enterprise-generator.js';
export type {
  EnterpriseGeneratorOptions,
  EnterpriseGenerationResult,
  EnterpriseMetrics,
} from './enterprise-generator.js';

export { HistoryAnalyzer } from './history-analyzer.js';
export type {
  ProjectTimeline,
  TimelineEvent,
  EventType,
  Milestone,
  Release,
  HistoryAnalyzerOptions,
} from './history-analyzer.js';

export { RelationshipMapper } from './relationship-mapper.js';
export type {
  RelationshipMap,
  RelationshipMapperOptions,
} from './relationship-mapper.js';
