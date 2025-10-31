/**
 * Agent Model Manager
 *
 * Loads and manages agent model preferences from AGENT.md frontmatter.
 * Each agent declares:
 * - model_preference: sonnet | haiku | opus | auto
 * - cost_profile: planning | execution | hybrid
 * - fallback_behavior: strict | flexible | auto
 *
 * Planning agents (PM, Architect, Security) prefer Sonnet.
 * Execution agents (Frontend, Backend, DevOps) prefer Haiku.
 * Hybrid agents (Diagrams, Docs) use auto (context-dependent).
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import type { AgentModelPreference, Model, CostProfile, FallbackBehavior } from '../types/model-selection';

export class AgentModelManager {
  private preferences: Map<string, AgentModelPreference> = new Map();
  private agentsPath: string;

  constructor(agentsPath?: string) {
    // Default to src/agents (works in development and after build)
    this.agentsPath = agentsPath || path.join(__dirname, '../agents');
  }

  /**
   * Load all agent preferences from src/agents/
   */
  async loadAllPreferences(): Promise<void> {
    try {
      const agentDirs = await fs.readdir(this.agentsPath);

      for (const agentDir of agentDirs) {
        const agentMdPath = path.join(this.agentsPath, agentDir, 'AGENT.md');

        if (await fs.pathExists(agentMdPath)) {
          const preference = await this.loadAgentPreference(agentDir);
          if (preference) {
            this.preferences.set(agentDir, preference);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load agent preferences:', error);
      // Continue with empty preferences (fallback to defaults)
    }
  }

  /**
   * Load preference for a specific agent
   */
  async loadAgentPreference(agentName: string): Promise<AgentModelPreference | null> {
    const agentMdPath = path.join(this.agentsPath, agentName, 'AGENT.md');

    if (!await fs.pathExists(agentMdPath)) {
      return null;
    }

    try {
      const content = await fs.readFile(agentMdPath, 'utf-8');
      const frontmatter = this.extractFrontmatter(content);

      if (!frontmatter) {
        return null;
      }

      return {
        agent: agentName,
        preference: (frontmatter.model_preference as Model) || 'auto',
        profile: (frontmatter.cost_profile as CostProfile) || 'hybrid',
        fallback: (frontmatter.fallback_behavior as FallbackBehavior) || 'auto',
      };
    } catch (error) {
      console.warn(`Failed to load preference for agent ${agentName}:`, error);
      return null;
    }
  }

  /**
   * Extract YAML frontmatter from markdown content
   */
  private extractFrontmatter(content: string): any {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    try {
      return yaml.load(match[1]);
    } catch (error) {
      console.error('Failed to parse YAML frontmatter:', error);
      return null;
    }
  }

  /**
   * Get preferred model for an agent (returns 'auto' if not found)
   */
  getPreferredModel(agentName: string): Model {
    const preference = this.preferences.get(agentName);
    return preference?.preference || 'auto';
  }

  /**
   * Get cost profile for an agent (returns 'hybrid' if not found)
   */
  getCostProfile(agentName: string): CostProfile {
    const preference = this.preferences.get(agentName);
    return preference?.profile || 'hybrid';
  }

  /**
   * Get fallback behavior for an agent
   */
  getFallbackBehavior(agentName: string): FallbackBehavior {
    const preference = this.preferences.get(agentName);
    return preference?.fallback || 'auto';
  }

  /**
   * Get all loaded preferences (for debugging/reporting)
   */
  getAllPreferences(): Map<string, AgentModelPreference> {
    return new Map(this.preferences);
  }

  /**
   * Check if an agent has explicit preference (not 'auto')
   */
  hasExplicitPreference(agentName: string): boolean {
    const pref = this.getPreferredModel(agentName);
    return pref !== 'auto';
  }
}
