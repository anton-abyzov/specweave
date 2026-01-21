/**
 * JIRA Filter Processor
 *
 * Smart filtering for JIRA projects with active/archived, type, lead, and JQL support.
 *
 * NEW (v0.24.0): Enables selective project imports with filter presets
 *
 * @module integrations/jira/filter-processor
 */

import { JiraClient } from './jira-client.js';
import type { Logger } from '../../utils/logger.js';
import { consoleLogger } from '../../utils/logger.js';

export interface FilterOptions {
  active?: boolean;
  types?: string[];
  lead?: string;
  jql?: string;
  excludeArchived?: boolean;
}

export interface FilterPreset {
  name: string;
  description: string;
  filters: FilterOptions;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
  lead?: {
    displayName: string;
    emailAddress: string;
  };
  archived?: boolean;
  [key: string]: any;
}

/**
 * Filter processor for JIRA projects
 */
export class FilterProcessor {
  private client: JiraClient;
  private logger: Logger;
  private presets: Map<string, FilterPreset>;

  constructor(client: JiraClient, options: { logger?: Logger } = {}) {
    this.client = client;
    this.logger = options.logger ?? consoleLogger;
    this.presets = new Map();
    this.initializeDefaultPresets();
  }

  /**
   * Initialize default filter presets
   */
  private initializeDefaultPresets(): void {
    this.addPreset({
      name: 'production',
      description: 'Active Agile projects (excludes TEST, SANDBOX)',
      filters: {
        active: true,
        types: ['software'],
        jql: 'project NOT IN (TEST, SANDBOX, DEMO)'
      }
    });

    this.addPreset({
      name: 'active-only',
      description: 'All active projects',
      filters: {
        active: true,
        excludeArchived: true
      }
    });

    this.addPreset({
      name: 'agile-only',
      description: 'Agile/Scrum projects only',
      filters: {
        types: ['software', 'agile']
      }
    });
  }

  /**
   * Add custom filter preset
   */
  addPreset(preset: FilterPreset): void {
    this.presets.set(preset.name, preset);
  }

  /**
   * Get filter preset by name
   */
  getPreset(name: string): FilterPreset | undefined {
    return this.presets.get(name);
  }

  /**
   * List all available presets
   */
  listPresets(): FilterPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Apply filters to project list
   *
   * @param projects - List of JIRA projects
   * @param options - Filter options
   * @returns Filtered project list
   */
  async applyFilters(
    projects: JiraProject[],
    options: FilterOptions
  ): Promise<JiraProject[]> {
    let filtered = [...projects];

    // Filter: Active only (non-archived)
    if (options.active !== undefined) {
      filtered = this.filterActive(filtered, options.active);
      this.logger.log(`After active filter: ${filtered.length} projects`);
    }

    // Filter: Exclude archived
    if (options.excludeArchived) {
      filtered = this.filterActive(filtered, true);
      this.logger.log(`After exclude archived: ${filtered.length} projects`);
    }

    // Filter: By project type
    if (options.types && options.types.length > 0) {
      filtered = this.filterByType(filtered, options.types);
      this.logger.log(`After type filter: ${filtered.length} projects`);
    }

    // Filter: By lead
    if (options.lead) {
      filtered = this.filterByLead(filtered, options.lead);
      this.logger.log(`After lead filter: ${filtered.length} projects`);
    }

    // Filter: Custom JQL (requires API call)
    if (options.jql) {
      filtered = await this.filterByJql(filtered, options.jql);
      this.logger.log(`After JQL filter: ${filtered.length} projects`);
    }

    return filtered;
  }

  /**
   * Filter active/archived projects
   *
   * @param projects - Project list
   * @param activeOnly - If true, return only active projects
   * @returns Filtered projects
   */
  filterActive(projects: JiraProject[], activeOnly: boolean = true): JiraProject[] {
    return projects.filter(p => {
      const isArchived = p.archived === true;
      return activeOnly ? !isArchived : isArchived;
    });
  }

  /**
   * Filter by project type
   *
   * @param projects - Project list
   * @param types - Allowed types (e.g., 'software', 'business', 'service_desk')
   * @returns Filtered projects
   */
  filterByType(projects: JiraProject[], types: string[]): JiraProject[] {
    const normalizedTypes = types.map(t => t.toLowerCase());

    return projects.filter(p => {
      if (!p.projectTypeKey) return false;
      return normalizedTypes.includes(p.projectTypeKey.toLowerCase());
    });
  }

  /**
   * Filter by project lead
   *
   * @param projects - Project list
   * @param leadEmail - Lead email or display name
   * @returns Filtered projects
   */
  filterByLead(projects: JiraProject[], leadEmail: string): JiraProject[] {
    const normalizedLead = leadEmail.toLowerCase();

    return projects.filter(p => {
      if (!p.lead) return false;

      const emailMatch = p.lead.emailAddress?.toLowerCase() === normalizedLead;
      const nameMatch = p.lead.displayName?.toLowerCase().includes(normalizedLead);

      return emailMatch || nameMatch;
    });
  }

  /**
   * Filter by custom JQL
   *
   * Uses JIRA Search API to execute JQL query
   *
   * @param projects - Original project list
   * @param jql - JQL query string
   * @returns Projects matching JQL
   */
  async filterByJql(projects: JiraProject[], jql: string): Promise<JiraProject[]> {
    try {
      // Execute JQL search via JIRA API
      const response = await this.client.searchWithJql(jql);

      // Extract project keys from results
      const matchingKeys = new Set(
        response.issues?.map((issue: any) => issue.fields?.project?.key).filter(Boolean) || []
      );

      // Filter original list to matching projects
      return projects.filter(p => matchingKeys.has(p.key));

    } catch (error: any) {
      this.logger.error(`JQL filter failed: ${error.message}`);
      throw new Error(`Invalid JQL query: ${jql}`);
    }
  }

  /**
   * Preview filter results
   *
   * @param projects - Project list
   * @param options - Filter options
   * @returns Preview summary
   */
  async previewFilters(
    projects: JiraProject[],
    options: FilterOptions
  ): Promise<{ original: number; filtered: number; reduction: number; preview: string }> {
    const original = projects.length;
    const filtered = await this.applyFilters(projects, options);
    const reduction = Math.round(((original - filtered.length) / original) * 100);

    const appliedFilters: string[] = [];
    if (options.active) {
      appliedFilters.push('  - Active projects only');
    }
    if (options.types) {
      appliedFilters.push(`  - Types: ${options.types.join(', ')}`);
    }
    if (options.lead) {
      appliedFilters.push(`  - Lead: ${options.lead}`);
    }
    if (options.jql) {
      appliedFilters.push(`  - JQL: ${options.jql}`);
    }

    const preview = [
      `Filters will load ${filtered.length} projects (down from ${original})`,
      '',
      'Applied filters:',
      ...appliedFilters,
      '',
      `Reduction: ${reduction}% fewer projects`
    ].join('\n');

    return { original, filtered: filtered.length, reduction, preview };
  }

  /**
   * Load preset and apply filters
   *
   * @param projects - Project list
   * @param presetName - Preset name
   * @returns Filtered projects
   */
  async applyPreset(
    projects: JiraProject[],
    presetName: string
  ): Promise<JiraProject[]> {
    const preset = this.getPreset(presetName);
    if (!preset) {
      throw new Error(`Filter preset not found: ${presetName}`);
    }

    this.logger.log(`Applying preset: ${preset.name} - ${preset.description}`);
    return this.applyFilters(projects, preset.filters);
  }
}
