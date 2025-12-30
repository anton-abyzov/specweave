/**
 * Autopilot Module
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
  loadAutopilotConfig,
  saveAutopilotConfig,
  isAutopilotEnabled,
  getEffectiveMode,
  type ConfigLoadResult,
} from './config.js';

// Logging
export { AutopilotLogger } from './logger.js';
