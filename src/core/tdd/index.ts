/**
 * TDD Module
 *
 * Task template generation and TDD enforcement utilities.
 *
 * @module tdd
 * @see {@link https://spec-weave.com/docs/tdd} TDD Documentation
 */

export * from './types.js';
export {
  generateTDDTasks,
  generateTaskTriplet,
  formatTaskAsMarkdown,
  parsePhaseFromTask,
  PHASE_MARKERS,
  TDD_TEMPLATES,
} from './task-template-generator.js';
