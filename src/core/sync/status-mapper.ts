/**
 * Status Mapper
 *
 * Maps SpecWeave increment statuses to tool-specific statuses for
 * GitHub, JIRA, and Azure DevOps.
 *
 * Supports both simple string mappings and complex mappings with
 * labels/tags for more granular status representation.
 */

export type ExternalTool = 'github' | 'jira' | 'ado';

export type SpecWeaveStatus = 'planning' | 'active' | 'paused' | 'completed' | 'abandoned';

export interface StatusMappingConfig {
  state: string;
  labels?: string[];  // GitHub-specific
  tags?: string[];    // ADO-specific
}

export type StatusMappingValue = string | StatusMappingConfig;

export interface ToolStatusMappings {
  planning: StatusMappingValue;
  active: StatusMappingValue;
  paused: StatusMappingValue;
  completed: StatusMappingValue;
  abandoned: StatusMappingValue;
}

export interface StatusSyncConfig {
  enabled: boolean;
  autoSync?: boolean;
  promptUser?: boolean;
  conflictResolution?: 'prompt' | 'last-write-wins' | 'specweave-wins' | 'external-wins';
  mappings: {
    github?: ToolStatusMappings;
    jira?: ToolStatusMappings;
    ado?: ToolStatusMappings;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SyncConfig {
  sync: {
    statusSync: StatusSyncConfig;
  };
}

export class StatusMapper {
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  /**
   * Map SpecWeave status to external tool status
   */
  public mapToExternal(
    specweaveStatus: string,
    tool: ExternalTool
  ): StatusMappingConfig {
    const mappings = this.config.sync.statusSync.mappings[tool];

    if (!mappings) {
      throw new Error(`No status mappings configured for ${tool}`);
    }

    const mapping = mappings[specweaveStatus as SpecWeaveStatus];

    if (!mapping) {
      throw new Error(`No mapping for status "${specweaveStatus}" in ${tool}`);
    }

    // Normalize to StatusMappingConfig
    if (typeof mapping === 'string') {
      return { state: mapping };
    }

    return mapping;
  }

  /**
   * Map external tool status to SpecWeave status (reverse lookup)
   */
  public mapFromExternal(
    externalStatus: string,
    tool: ExternalTool
  ): SpecWeaveStatus | null {
    const mappings = this.config.sync.statusSync.mappings[tool];

    if (!mappings) {
      return null;
    }

    for (const [specweaveStatus, mapping] of Object.entries(mappings)) {
      const state = typeof mapping === 'string' ? mapping : mapping.state;

      if (state === externalStatus) {
        return specweaveStatus as SpecWeaveStatus;
      }
    }

    return null; // Unknown external status
  }

  /**
   * Validate status mapping configuration
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const requiredStatuses: SpecWeaveStatus[] = [
      'planning',
      'active',
      'paused',
      'completed',
      'abandoned'
    ];

    for (const tool of ['github', 'jira', 'ado'] as const) {
      const mappings = this.config.sync.statusSync.mappings[tool];

      if (!mappings) {
        errors.push(`No mappings configured for ${tool}`);
        continue;
      }

      for (const status of requiredStatuses) {
        if (!mappings[status]) {
          errors.push(`Missing mapping for "${status}" in ${tool}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all required SpecWeave statuses
   */
  public getRequiredStatuses(): SpecWeaveStatus[] {
    return ['planning', 'active', 'paused', 'completed', 'abandoned'];
  }

  /**
   * Get all supported external tools
   */
  public getSupportedTools(): ExternalTool[] {
    return ['github', 'jira', 'ado'];
  }
}
