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

  // NOTE: Strategy-based validation temporarily disabled (v0.13.0+ migration in progress)
  // TODO: Update validation to match new v0.13.0 architecture (intelligent/custom strategies)

  // Basic validation: domain + either projectKey or projects[]
  if (!config.projectKey && (!config.projects || config.projects.length === 0)) {
    errors.push('Either projectKey (single project) or projects[] (multiple projects) is required');
  }

  // Validate project keys if provided
  if (config.projects && config.projects.length > 0) {
    const invalidProjects = config.projects.filter(
      (p) => !/^[A-Z][A-Z0-9]*$/.test(p)
    );
    if (invalidProjects.length > 0) {
      errors.push(
        `Invalid Jira project keys: ${invalidProjects.join(', ')} (must be uppercase alphanumeric, e.g., FRONTEND, QA)`
      );
    }
  }

  // Validate single projectKey if provided
  if (config.projectKey && !/^[A-Z][A-Z0-9]*$/.test(config.projectKey)) {
    errors.push(
      `Invalid Jira project key: ${config.projectKey} (must be uppercase alphanumeric, e.g., PRODUCT)`
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

  // NOTE: teams[] validation removed in v0.13.0 (deprecated field)
  // TODO: Update validation to match new v0.13.0 architecture (projects[], areaPaths[])

  // Validate project (optional in v0.13.0+ - can have projects[] instead)
  if (!config.project && (!config.projects || config.projects.length === 0)) {
    errors.push('Either project (single) or projects[] (multiple) is required');
  }

  // Validate projects[] if provided
  if (config.projects && config.projects.length > 0) {
    const emptyProjects = config.projects.filter((p) => !p.trim());
    if (emptyProjects.length > 0) {
      errors.push('Project names cannot be empty');
    }

    if (config.projects.length > 10) {
      warnings.push(
        `Large number of projects (${config.projects.length}). Consider using custom query for complex filtering.`
      );
    }
  }

  // Validate areaPaths[] if provided (Pattern 3: Single project + area paths)
  if (config.areaPaths && config.areaPaths.length > 0) {
    const emptyPaths = config.areaPaths.filter((p) => !p.trim());
    if (emptyPaths.length > 0) {
      errors.push('Area path names cannot be empty');
    }

    // areaPaths should only be used with single project (not projects[])
    if (config.projects && config.projects.length > 0) {
      warnings.push(
        'areaPaths[] should be used with single project, not projects[]. Use projects[] for multiple projects.'
      );
    }
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
