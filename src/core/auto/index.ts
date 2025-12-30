/**
 * Auto Module
 * Autonomous Execution Engine for SpecWeave
 *
 * Inspired by Ralph Wiggum plugin architecture, fully integrated with
 * SpecWeave's spec-driven workflow, living docs, and external tool sync.
 */

// Types
export * from './types.js';

// Session State Management
export { SessionStateManager } from './session-state.js';

// Configuration
export {
  loadAutoConfig,
  saveAutoConfig,
  isAutoEnabled,
  getEffectiveMode,
  type ConfigLoadResult,
} from './config.js';

// Logging
export { AutoLogger } from './logger.js';

// Cost Estimation
export {
  estimateCost,
  formatCostEstimate,
  type CostEstimate,
  type IncrementEstimate,
  type EstimatorConfig,
} from './cost-estimator.js';

// Report Generation
export {
  generateSessionReport,
  generateMarkdownReport,
  saveReport,
  generateCancellationSummary,
  type SessionReport,
  type IncrementReport,
  type GateReport,
  type CircuitBreakerReport,
  type ReportSummary,
} from './report-generator.js';

// Increment Queue Management
export {
  IncrementQueueManager,
  type QueuedIncrement,
  type QueueConfig,
} from './increment-queue.js';

// Test Gates
export {
  TestGate,
  quickTestCheck,
  type TestGateConfig,
  type TestResult,
  type CoverageResult,
  type TestFailure,
  type GateResult,
} from './test-gate.js';

// Human Gates
export {
  HumanGateDetector,
  type HumanGateConfig,
  type GateRequest,
  type GateResponse,
  type DetectionResult,
} from './human-gate.js';

// Circuit Breakers
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitOpenError,
  parseRateLimitHeaders,
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitStatus,
  type QueuedOperation,
} from './circuit-breaker.js';

// Sync Checkpoints
export {
  SyncCheckpointManager,
  type SyncCheckpointConfig,
  type SyncResult,
  type CheckpointResult,
} from './sync-checkpoint.js';
