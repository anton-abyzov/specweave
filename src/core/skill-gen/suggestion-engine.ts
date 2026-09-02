/**
 * Suggestion Engine — evaluates signals and prints a single suggestion.
 *
 * Runs after signal collection on increment closure.
 * Prints at most one suggestion per closure, picking the highest-confidence qualifying signal.
 *
 * @module core/skill-gen/suggestion-engine
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { SignalStore } from './types.js';
import { SKILL_GEN_DEFAULTS } from './types.js';
import type { SkillGenConfig } from './types.js';
import { loadSignalStore, saveSignalStore } from './utils.js';

export class SuggestionEngine {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Evaluate signals and print a suggestion if one qualifies.
   * Never throws — all errors are caught and logged.
   */
  async evaluate(): Promise<void> {
    try {
      const config = await this.loadConfig();
      if (!config.suggest) {
        return;
      }

      const signalsPath = join(this.projectRoot, '.specweave', 'state', 'skill-signals.json');
      const store = await loadSignalStore(signalsPath);
      if (!store) {
        return;
      }

      const minCount = config.minSignalCount ?? SKILL_GEN_DEFAULTS.minSignalCount;
      const declined = new Set(config.declinedSuggestions ?? SKILL_GEN_DEFAULTS.declinedSuggestions);

      // Filter qualifying signals using file-based confidence
      const qualifying = store.signals.filter((s) => {
        const qualifyingCount = s.uniqueSourceFiles?.length ?? s.incrementIds.length;
        return (
          qualifyingCount >= minCount &&
          !s.declined &&
          !s.generated &&
          !declined.has(s.id)
        );
      });

      if (qualifying.length === 0) {
        return;
      }

      // Pick highest confidence
      qualifying.sort((a, b) => b.confidence - a.confidence);
      const top = qualifying[0];

      // Print suggestion
      const sourceCount = top.uniqueSourceFiles?.length ?? top.incrementIds.length;
      console.log(
        `\u{1F4A1} Skill suggestion: Detected "${top.pattern}" pattern across ${sourceCount} sources. Run sw:skill-gen to generate project skills.`,
      );

      // Mark as suggested and save
      top.suggested = true;
      await saveSignalStore(signalsPath, store);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[SuggestionEngine] Warning: ${msg}`);
    }
  }

  private async loadConfig(): Promise<SkillGenConfig> {
    try {
      const configPath = join(this.projectRoot, '.specweave', 'config.json');
      const content = JSON.parse(await readFile(configPath, 'utf-8'));
      return {
        detection: SKILL_GEN_DEFAULTS.detection,
        suggest: SKILL_GEN_DEFAULTS.suggest,
        minSignalCount: SKILL_GEN_DEFAULTS.minSignalCount,
        declinedSuggestions: SKILL_GEN_DEFAULTS.declinedSuggestions,
        maxSignals: SKILL_GEN_DEFAULTS.maxSignals,
        ...content.skillGen,
      };
    } catch {
      // Config missing — use defaults
      return {
        detection: SKILL_GEN_DEFAULTS.detection,
        suggest: SKILL_GEN_DEFAULTS.suggest,
        minSignalCount: SKILL_GEN_DEFAULTS.minSignalCount,
        declinedSuggestions: [...SKILL_GEN_DEFAULTS.declinedSuggestions],
        maxSignals: SKILL_GEN_DEFAULTS.maxSignals,
      };
    }
  }
}
