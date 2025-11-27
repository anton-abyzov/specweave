/**
 * External Resource Validator
 *
 * Re-exports from validators/ for backward compatibility.
 * The actual implementations are in:
 * - validators/jira-validator.ts
 * - validators/ado-validator.ts
 *
 * @module utils/external-resource-validator
 * @since 0.9.5
 */

// Re-export everything from validators/
export {
  // Types
  type JiraProject,
  type JiraBoard,
  type JiraValidationResult,
  type AzureDevOpsProject,
  type AzureDevOpsTeam,
  type AzureDevOpsAreaPath,
  type AzureDevOpsValidationResult,
  // Classes
  JiraResourceValidator,
  AzureDevOpsResourceValidator,
  // Utility functions
  validateJiraResources,
  validateAzureDevOpsResources,
} from './validators/index.js';
