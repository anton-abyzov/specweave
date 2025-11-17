/**
 * Workflow Orchestration Module
 *
 * Provides intelligent workflow orchestration for SpecWeave,
 * enabling autonomous and semi-autonomous workflow execution.
 *
 * Part of increment 0039: Ultra-Smart Next Command
 *
 * @module core/workflow
 * @since v0.22.0
 */

// Core orchestration
export { WorkflowOrchestrator, WorkflowExecuteOptions, WorkflowExecutionResult } from './workflow-orchestrator.js';
export { AutonomousExecutor, AutonomousConfig, AutonomousResult } from './autonomous-executor.js';

// Phase detection
export { PhaseDetector } from './phase-detector.js';
export {
  WorkflowPhase,
  PhaseDetectionResult,
  DetectionContext,
  PhaseEvidence
} from './types.js';

// Intelligence
export {
  BacklogScanner,
  BacklogItem,
  RankedBacklogItem,
  BacklogRecommendation
} from './backlog-scanner.js';
export {
  CostEstimator,
  CostEstimate,
  CostBreakdown,
  RiskLevel,
  CostEstimatorConfig
} from './cost-estimator.js';

// Execution infrastructure
export { CommandInvoker, InvokeOptions, InvokeResult, ErrorSeverity } from './command-invoker.js';
export { StateManager, Checkpoint } from './state-manager.js';
