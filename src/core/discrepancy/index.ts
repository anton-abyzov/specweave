/**
 * Code-to-Spec Discrepancy Detection
 *
 * Detects discrepancies between code and specifications.
 * Core principle: CODE is source of truth.
 *
 * @module core/discrepancy
 */

// Analyzers
export {
  TypeScriptAnalyzer,
  type FunctionSignature,
  type FunctionParam,
  type TypeDefinition,
  type TypeScriptAnalyzerConfig,
  type AnalysisResult,
} from './analyzers/typescript-analyzer.js';

export {
  ApiRouteAnalyzer,
  type ApiRoute,
  type HttpMethod,
  type ApiRouteAnalyzerConfig,
  type RouteAnalysisResult,
} from './analyzers/api-route-analyzer.js';

// Spec Parser
export {
  SpecParser,
  type ParsedSpec,
  type SpecType,
  type SpecParserConfig,
  type SpecParseResult,
} from './spec-parser.js';

// Detector
export {
  DiscrepancyDetector,
  type Discrepancy,
  type DiscrepancyType,
  type DiscrepancyCategory,
  type DiscrepancySeverity,
  type DiscrepancyRecommendation,
  type CodeSignatures,
  type DetectionResult,
} from './detector.js';

// Severity Classifier
export {
  SeverityClassifier,
  type ChangeDetails,
  type ClassificationResult,
  type SeverityClassifierConfig,
} from './severity-classifier.js';

// Update Recommender
export {
  UpdateRecommender,
  type UpdatePatch,
  type RecommendationResult,
  type UpdateRecommenderConfig,
} from './update-recommender.js';

// Brownfield Discrepancy Types (persistent storage)
export type {
  BrownfieldDiscrepancyType,
  BrownfieldDiscrepancyStatus,
  BrownfieldDiscrepancyPriority,
  BrownfieldDiscrepancySource,
  BrownfieldResolutionType,
  BrownfieldDiscrepancyEvidence,
  BrownfieldDiscrepancyResolution,
  BrownfieldDiscrepancy,
  BrownfieldDiscrepancyStats,
  BrownfieldDiscrepancyIndex,
  BrownfieldDiscrepancyFilter,
  BrownfieldDiscrepancyCreate,
  BrownfieldDiscrepancyUpdate,
} from './brownfield-types.js';

// Brownfield Discrepancy Manager
export { BrownfieldDiscrepancyManager } from './brownfield-manager.js';

// Increment Generator (discrepancy → increment conversion)
export {
  generateSpecFromDiscrepancies,
  linkDiscrepanciesToIncrement,
  resolveDiscrepanciesOnCompletion,
  getNextIncrementId,
  generateIncrementFromDiscrepancies,
  type GenerateIncrementOptions,
  type GenerateIncrementResult,
} from './increment-generator.js';
