/**
 * Skill Reflection System - Self-Improving AI Memory (v2.0 - Simplified)
 *
 * ARCHITECTURE v2.0:
 * - All learnings go to CLAUDE.md (single source of truth)
 * - Organized by skill under "## Skill Memories" section
 * - Always uses LLM for extraction (no quick signal check)
 * - User can disable via config
 *
 * WHAT IT REMEMBERS:
 * - SpecWeave workflow preferences (how user uses SpecWeave)
 * - Skill-specific learnings (how to improve skill behavior)
 * - Project-specific context (tech stack preferences, conventions)
 *
 * WHAT IT DOES NOT REMEMBER:
 * - Generic coding patterns (use Zustand, prefer hooks, etc.)
 * - Implementation details unrelated to SpecWeave
 *
 * @module core/reflection
 */

// Main reflection handler
export {
  handleReflectStop,
  formatReflectResult,
  migrateOldMemoryFiles,
  readReflectConfig,
  DEFAULT_REFLECT_CONFIG,
  type ReflectConfig,
  type ReflectResult,
  type SkillLearning,
  type LLMExtractionResult,
} from './reflect-handler.js';
