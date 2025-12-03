/**
 * ADO PAT Provider
 *
 * Centralized PAT retrieval logic for Azure DevOps.
 * Supports organization-specific PATs via environment variables.
 *
 * PAT Resolution Priority:
 * 1. Organization-specific: AZURE_DEVOPS_PAT_{ORG} (e.g., AZURE_DEVOPS_PAT_NOVA_SYSTEMS)
 * 2. Default: AZURE_DEVOPS_PAT
 *
 * @module integrations/ado/ado-pat-provider
 */

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
 * // Uses AZURE_DEVOPS_PAT_NOVA_SYSTEMS if set, otherwise AZURE_DEVOPS_PAT
 * const pat = getAdoPat('nova-systems');
 */
export function getAdoPat(organization: string): string {
  // SECURITY: Never log the PAT value itself

  // Try organization-specific PAT first (e.g., AZURE_DEVOPS_PAT_NOVA_SYSTEMS)
  const orgEnvKey = `AZURE_DEVOPS_PAT_${organization.toUpperCase().replace(/-/g, '_')}`;
  const orgPat = process.env[orgEnvKey];
  if (orgPat) {
    return orgPat;
  }

  // Fall back to default PAT
  const defaultPat = process.env.AZURE_DEVOPS_PAT;
  if (!defaultPat) {
    throw new Error(
      `Azure DevOps PAT not found. Set AZURE_DEVOPS_PAT in .env file ` +
      `or ${orgEnvKey} for organization-specific PAT.`
    );
  }

  return defaultPat;
}

/**
 * Check if a PAT is available for an organization
 *
 * @param organization - The ADO organization name
 * @returns true if a PAT is available (org-specific or default)
 */
export function hasAdoPat(organization?: string): boolean {
  if (organization) {
    const orgEnvKey = `AZURE_DEVOPS_PAT_${organization.toUpperCase().replace(/-/g, '_')}`;
    if (process.env[orgEnvKey]) {
      return true;
    }
  }

  return !!process.env.AZURE_DEVOPS_PAT;
}

/**
 * Get the environment variable key for an organization's PAT
 *
 * @param organization - The ADO organization name
 * @returns The environment variable key
 *
 * @example
 * getPatEnvKey('nova-systems') // returns 'AZURE_DEVOPS_PAT_NOVA_SYSTEMS'
 */
export function getPatEnvKey(organization: string): string {
  return `AZURE_DEVOPS_PAT_${organization.toUpperCase().replace(/-/g, '_')}`;
}
