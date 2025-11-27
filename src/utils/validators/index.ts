/**
 * External Resource Validators
 *
 * Barrel export for validator modules.
 *
 * @module utils/validators
 */

// Types
export type {
  JiraProject,
  JiraBoard,
  JiraValidationResult,
  AzureDevOpsProject,
  AzureDevOpsTeam,
  AzureDevOpsAreaPath,
  AzureDevOpsProjectResult,
  AzureDevOpsAreaPathResult,
  AzureDevOpsTeamResult,
  AzureDevOpsValidationResult,
} from './types.js';

// Jira Validator
export { JiraResourceValidator, validateJiraResources } from './jira-validator.js';

// Azure DevOps Validator
export { AzureDevOpsResourceValidator, validateAzureDevOpsResources } from './ado-validator.js';
