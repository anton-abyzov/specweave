/**
 * Suggestion Engine — evaluates signals and prints a single suggestion.
 *
 * Runs after signal collection on increment closure.
 * Prints at most one suggestion per closure, picking the highest-confidence qualifying signal.
 *
 * @module core/skill-gen/suggestion-engine
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { SignalStore } from './types.js';
import { SKILL_GEN_DEFAULTS } from './types.js';
import type { SkillGenConfig } from '../config/types.js';

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

      const store = await this.loadStore();
      if (!store) {
        return;
      }

      const minCount = config.minSignalCount ?? SKILL_GEN_DEFAULTS.minSignalCount;
      const declined = new Set(config.declinedSuggestions ?? SKILL_GEN_DEFAULTS.declinedSuggestions);

      // Filter qualifying signals
      const qualifying = store.signals.filter(
        (s) =>
          s.incrementIds.length >= minCount &&
          !s.declined &&
          !s.generated &&
          !declined.has(s.id),
      );

      if (qualifying.length === 0) {
        return;
      }

      // Pick highest confidence
      qualifying.sort((a, b) => b.confidence - a.confidence);
      const top = qualifying[0];

      // Print suggestion
      console.log(
        `\u{1F4A1} Skill suggestion: Detected "${top.pattern}" pattern across ${top.incrementIds.length} increments. Run /sw:skill-gen to generate project skills.`,
      );

      // Mark as suggested and save
      top.suggested = true;
      await this.saveStore(store);
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

  private async loadStore(): Promise<SignalStore | null> {
    try {
      const signalsPath = join(this.projectRoot, '.specweave', 'state', 'skill-signals.json');
      return JSON.parse(await readFile(signalsPath, 'utf-8')) as SignalStore;
    } catch {
      return null;
    }
  }

  private async saveStore(store: SignalStore): Promise<void> {
    const signalsPath = join(this.projectRoot, '.specweave', 'state', 'skill-signals.json');
    await writeFile(signalsPath, JSON.stringify(store, null, 2));
  }
}
