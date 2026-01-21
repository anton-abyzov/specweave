/**
 * Skill Reflection System - Self-Improving AI Memory
 *
 * This module provides the core reflection functionality for SpecWeave:
 * - Skill-specific memory (learnings stored per skill)
 * - Cross-platform path resolution (Claude Code vs Non-Claude)
 * - Smart memory merging (preserves user learnings during updates)
 * - Signal detection and routing
 *
 * ## Architecture
 *
 * ```
 * Session → Detect Signals → Route to Skill/Category → Persist to MEMORY.md
 *                                    ↓
 *                           Merge during marketplace refresh
 * ```
 *
 * ## Two Flows
 *
 * 1. **Claude Code**: Skills in ~/.claude/plugins/marketplaces/specweave/
 *    - User learnings stored alongside skills
 *    - Merged during `specweave refresh-marketplace`
 *
 * 2. **Non-Claude**: Skills in .specweave/plugins/specweave/skills/
 *    - Project-specific learnings
 *    - Merged during `specweave init --refresh`
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   processSignals,
 *   reflectOnSkill,
 *   getSkillLearnings,
 *   getReflectionStats
 * } from './core/reflection/index.js';
 *
 * // Process detected signals from session
 * const result = processSignals([
 *   {
 *     type: 'correction',
 *     confidence: 'high',
 *     content: 'Always use Button component from design system',
 *     skill: 'frontend',
 *     triggers: ['button', 'component']
 *   }
 * ]);
 *
 * // Add learning to specific skill
 * reflectOnSkill('frontend', [
 *   { content: 'Use shadcn/ui Button, not custom buttons' }
 * ]);
 *
 * // Get stats
 * const stats = getReflectionStats();
 * console.log(`Total learnings: ${stats.totalLearnings}`);
 * ```
 */

// Path resolution
export {
  getClaudeUserDir,
  isClaudeCodeEnvironment,
  getSkillsDirectory,
  listSkills,
  getSkillMemoryPath,
  getSkillMemoryLocations,
  getSkillDirectory,
  skillExists,
  getSkillDefinitionPath,
  resolveSkillPaths,
  getGlobalMemoryDir,
  ensureSkillMemoryDir,
  type SkillPaths,
  type MemoryLocation,
} from './skill-memory-paths.js';

// Memory merging
export {
  parseMemoryFile,
  generateMemoryContent,
  areLearningsDuplicate,
  mergeMemoryFiles,
  addLearning,
  removeLearning,
  readMemoryFile,
  writeMemoryFile,
  mergeSkillMemory,
  createEmptyMemory,
  type Learning,
  type MemoryFile,
  type MergeResult,
} from './skill-memory-merger.js';

// Reflection management
export {
  detectSkill,
  detectCategory,
  extractTriggers,
  generateLearningId,
  routeLearning,
  processSignals,
  reflectOnSkill,
  getSkillLearnings,
  getCategoryLearnings,
  clearSkillLearnings,
  removeLearningById,
  getReflectionStats,
  type ReflectionConfig,
  type DetectedSignal,
  type ReflectionResult,
} from './skill-reflection-manager.js';
