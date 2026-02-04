/**
 * Skill Reflection System - Self-Improving AI Memory (v4.0)
 *
 * ARCHITECTURE v4.0:
 * - PRIMARY: .specweave/skill-memories/{skill}.md (for KNOWN_SKILLS)
 * - OVERFLOW: CLAUDE.md Skill Memories section (for unknown skills only)
 * - LLM-based semantic deduplication (existing memories in extraction prompt)
 * - Auto-pruning of old learnings
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
  cleanupDeprecatedMemoryDirectory,
  readReflectConfig,
  DEFAULT_REFLECT_CONFIG,
  type ReflectConfig,
  type ReflectResult,
  type SkillLearning,
  type LLMExtractionResult,
} from './reflect-handler.js';

// Skill memory management
export {
  writeSkillMemories,
  writeSkillMemoryFile,
  readSkillMemoryFile,
  readAllSkillMemories,
  listSkillMemoryFiles,
  pruneSkillMemories,
  formatMemoriesForPrompt,
  generateSkillMemoryContent,
  SKILL_MEMORY_DIR,
  DEFAULT_PRUNE_CONFIG,
  type PruneConfig,
  type ParsedLearning,
} from './skill-memories.js';
