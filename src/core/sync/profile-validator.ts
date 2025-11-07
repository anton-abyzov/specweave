/**
 * Sync Profile Validator
 *
 * Validates sync profile configurations for multi-team support
 */

import {
  SyncProfile,
  AdoConfig,
  JiraConfig,
  GitHubConfig,
  ProfileValidationResult,
} from '../types/sync-profile.js';

/**
 * Validate Jira profile configuration
 *
 * Rules:
 * - Strategy is required
 * - project-per-team: requires projects[] array
 * - shared-project-with-components: requires projectKey + components[]
 * - Cannot mix strategies (no projects[] with shared-project)
 *
 * @param config - Jira configuration
 * @returns Validation result with errors/warnings
 */
export function validateJiraConfig(config: JiraConfig): ProfileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate domain
  if (!config.domain || config.domain.trim().length === 0) {
    errors.push('Jira domain is required');
  }

  // Strategy is optional for backward compatibility
  // If not provided, assume single project mode
  if (!config.strategy) {
    // Legacy mode: single projectKey
    if (!config.projectKey) {
      errors.push(
        'Either strategy (with projects/components) or projectKey (legacy) is required'
      );
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  // Validate project-per-team strategy
  if (config.strategy === 'project-per-team') {
    if (!config.projects || config.projects.length === 0) {
      errors.push('projects[] is required for project-per-team strategy');
    } else {
      // Validate project keys (must be uppercase alphanumeric)
      const invalidProjects = config.projects.filter(
        (p) => !/^[A-Z][A-Z0-9]*$/.test(p)
      );
      if (invalidProjects.length > 0) {
        errors.push(
          `Invalid Jira project keys: ${invalidProjects.join(', ')} (must be uppercase alphanumeric, e.g., FRONTEND, QA)`
        );
      }
    }

    // Cannot have projectKey or components with this strategy
    if (config.projectKey) {
      errors.push(
        'projectKey is not allowed with project-per-team strategy (use projects[] instead)'
      );
    }
    if (config.components) {
      errors.push(
        'components[] is not allowed with project-per-team strategy'
      );
    }
  }

  // Validate shared-project-with-components strategy
  if (config.strategy === 'shared-project-with-components') {
    if (!config.projectKey || config.projectKey.trim().length === 0) {
      errors.push('projectKey is required for shared-project-with-components strategy');
    } else if (!/^[A-Z][A-Z0-9]*$/.test(config.projectKey)) {
      errors.push(
        `Invalid Jira project key: ${config.projectKey} (must be uppercase alphanumeric, e.g., PRODUCT)`
      );
    }

    if (!config.components || config.components.length === 0) {
      errors.push('components[] is required for shared-project-with-components strategy');
    } else {
      // Validate component names (no empty strings)
      const emptyComponents = config.components.filter((c) => !c.trim());
      if (emptyComponents.length > 0) {
        errors.push('Component names cannot be empty');
      }
    }

    // Cannot have projects[] with this strategy
    if (config.projects) {
      errors.push(
        'projects[] is not allowed with shared-project-with-components strategy (use components[] instead)'
      );
    }
  }

  // Warnings
  if (config.strategy === 'project-per-team' && config.projects && config.projects.length > 10) {
    warnings.push(
      `Large number of projects (${config.projects.length}). Consider using shared-project-with-components strategy for better manageability.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Azure DevOps profile configuration
 *
 * Rules:
 * - organization and project are required
 * - teams[] array is optional (single project if not provided)
 * - Team names cannot be empty
 * - areaPaths map must match teams if both provided
 *
 * @param config - ADO configuration
 * @returns Validation result with errors/warnings
 */
export function validateAdoConfig(config: AdoConfig): ProfileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate organization
  if (!config.organization || config.organization.trim().length === 0) {
    errors.push('ADO organization is required');
  }

  // Validate project
  if (!config.project || config.project.trim().length === 0) {
    errors.push('ADO project is required');
  }

  // Validate teams (optional)
  if (config.teams) {
    if (config.teams.length === 0) {
      warnings.push('teams[] is empty. Remove it to use single-project mode.');
    } else {
      // Validate team names (no empty strings)
      const emptyTeams = config.teams.filter((t) => !t.trim());
      if (emptyTeams.length > 0) {
        errors.push('Team names cannot be empty');
      }

      // Check for duplicate team names
      const uniqueTeams = new Set(config.teams);
      if (uniqueTeams.size !== config.teams.length) {
        errors.push('Duplicate team names detected');
      }
    }
  }

  // Validate areaPaths (optional, must match teams if both provided)
  if (config.areaPaths && config.teams) {
    const teamFolders = new Set(
      config.teams.map((t) => t.toLowerCase().replace(/\s+/g, '-'))
    );
    const areaPathFolders = new Set(Object.keys(config.areaPaths));

    // Check if all team folders have area paths
    for (const folder of teamFolders) {
      if (!areaPathFolders.has(folder)) {
        warnings.push(
          `Missing Area Path for team folder "${folder}". It will be auto-generated.`
        );
      }
    }

    // Check for extra area paths (not matching any team)
    for (const folder of areaPathFolders) {
      if (!teamFolders.has(folder)) {
        warnings.push(
          `Area Path for "${folder}" does not match any team. It will be ignored.`
        );
      }
    }
  }

  // Warnings
  if (config.teams && config.teams.length > 20) {
    warnings.push(
      `Large number of teams (${config.teams.length}). Consider splitting into multiple ADO projects.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate GitHub profile configuration
 *
 * Rules:
 * - owner and repo are required
 *
 * @param config - GitHub configuration
 * @returns Validation result with errors/warnings
 */
export function validateGitHubConfig(config: GitHubConfig): ProfileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.owner || config.owner.trim().length === 0) {
    errors.push('GitHub owner is required');
  }

  if (!config.repo || config.repo.trim().length === 0) {
    errors.push('GitHub repo is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate sync profile
 *
 * Validates entire profile including provider-specific config
 *
 * @param profile - Sync profile to validate
 * @returns Validation result with errors/warnings
 */
export function validateSyncProfile(profile: SyncProfile): ProfileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate displayName
  if (!profile.displayName || profile.displayName.trim().length === 0) {
    errors.push('Profile displayName is required');
  }

  // Validate provider
  if (!profile.provider) {
    errors.push('Provider is required (github, jira, or ado)');
    return { valid: false, errors, warnings };
  }

  // Validate provider-specific config
  let providerValidation: ProfileValidationResult;

  if (profile.provider === 'github') {
    providerValidation = validateGitHubConfig(profile.config as GitHubConfig);
  } else if (profile.provider === 'jira') {
    providerValidation = validateJiraConfig(profile.config as JiraConfig);
  } else if (profile.provider === 'ado') {
    providerValidation = validateAdoConfig(profile.config as AdoConfig);
  } else {
    errors.push(`Unknown provider: ${profile.provider}`);
    return { valid: false, errors, warnings };
  }

  // Merge provider validation results
  errors.push(...providerValidation.errors);
  if (providerValidation.warnings) {
    warnings.push(...providerValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
