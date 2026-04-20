/**
 * Barrel export for the skill-signals module.
 *
 * @module core/skill-signals
 */

export { readSignals, listRefinementsForSkill } from './reader.js';
export {
  appendRefinementSignal,
  appendGenerationSignal,
  type AppendRefinementInput,
} from './writer.js';
export {
  migrateV1toV2,
  isV1,
  EMPTY_SIGNAL_FILE,
  SignalFileSchema,
  SkillSignalSchema,
  GenerationSignalSchema,
  RefinementSignalSchema,
  SIGNAL_SOURCES,
  SIGNAL_SEVERITIES,
  type SkillSignal,
  type GenerationSignal,
  type RefinementSignal,
  type SignalSource,
  type SignalSeverity,
  type SignalFile,
} from '../../types/skill-signals.js';
