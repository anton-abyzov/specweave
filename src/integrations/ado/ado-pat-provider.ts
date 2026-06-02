/**
 * ADO PAT Provider
 *
 * Centralized PAT retrieval logic for Azure DevOps.
 * Supports organization-specific PATs via environment variables.
 *
 * PAT Resolution Priority (0865 T-006 — unified with sync-health):
 * 1. Organization-specific: AZURE_DEVOPS_PAT_{ORG} (e.g., AZURE_DEVOPS_PAT_NOVA_SYSTEMS)
 * 2. Canonical aliases (in order): AZURE_DEVOPS_PAT, AZURE_DEVOPS_TOKEN, ADO_PAT
 *
 * Both this runtime resolver and `cli/commands/sync-health` resolve through the
 * single `resolveAdoPat` / `ADO_PAT_ALIASES` surface in credentials-manager, so
 * health can never report green while runtime writes throw "PAT not found".
 *
 * @module integrations/ado/ado-pat-provider
 */

import { ADO_PAT_ALIASES, resolveAdoPat } from '../../core/credentials/credentials-manager.js';

/**
 * Get PAT for a specific ADO organization
 *
 * Supports organization-specific PATs via AZURE_DEVOPS_PAT_{ORG} env vars.
 * This allows different organizations to use different PATs.
 *
 * @param organization - The ADO organization name
 * @returns The PAT string
 * @throws Error if no PAT is configured
 *
 * @example
 * // Uses AZURE_DEVOPS_PAT_ACME_CORP if set, otherwise AZURE_DEVOPS_PAT
 * const pat = getAdoPat('acme-corp');
 */
export function getAdoPat(organization: string): string {
  // SECURITY: Never log the PAT value itself.
  // Resolution (org override + canonical aliases) is owned by credentials-manager.
  const pat = resolveAdoPat(organization);
  if (!pat) {
    const orgEnvKey = `AZURE_DEVOPS_PAT_${organization.toUpperCase().replace(/-/g, '_')}`;
    throw new Error(
      `Azure DevOps PAT not found. Set one of ${ADO_PAT_ALIASES.join(', ')} in .env ` +
      `or ${orgEnvKey} for an organization-specific PAT.`
    );
  }

  return pat;
}

/**
 * Check if a PAT is available for an organization
 *
 * @param organization - The ADO organization name
 * @returns true if a PAT is available (org-specific or default)
 */
export function hasAdoPat(organization?: string): boolean {
  return !!resolveAdoPat(organization);
}

/**
 * Get the environment variable key for an organization's PAT
 *
 * @param organization - The ADO organization name
 * @returns The environment variable key
 *
 * @example
 * getPatEnvKey('acme-corp') // returns 'AZURE_DEVOPS_PAT_ACME_CORP'
 */
export function getPatEnvKey(organization: string): string {
  return `AZURE_DEVOPS_PAT_${organization.toUpperCase().replace(/-/g, '_')}`;
}
