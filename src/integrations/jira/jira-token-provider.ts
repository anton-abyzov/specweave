/**
 * JIRA Token Provider
 *
 * Centralized API token retrieval logic for JIRA.
 * Supports domain-specific tokens via environment variables.
 *
 * Token Resolution Priority:
 * 1. Domain-specific: JIRA_API_TOKEN_{DOMAIN} (e.g., JIRA_API_TOKEN_ACME)
 * 2. Default: JIRA_API_TOKEN
 *
 * Email Resolution Priority:
 * 1. Domain-specific: JIRA_EMAIL_{DOMAIN} (e.g., JIRA_EMAIL_ACME)
 * 2. Default: JIRA_EMAIL
 *
 * This mirrors the ADO PAT provider pattern for consistency.
 *
 * @module integrations/jira/jira-token-provider
 */

/**
 * JIRA credentials for a specific domain
 */
export interface JiraCredentialsResolved {
  apiToken: string;
  email: string;
  domain: string;
}

/**
 * Normalize domain to environment variable suffix
 *
 * @example
 * normalizeDomainToEnvKey('company.atlassian.net') // 'COMPANY'
 * normalizeDomainToEnvKey('acme-corp.atlassian.net') // 'ACME_CORP'
 * normalizeDomainToEnvKey('https://jira.example.com') // 'JIRA_EXAMPLE_COM'
 */
function normalizeDomainToEnvKey(domain: string): string {
  // Remove protocol if present
  let normalized = domain.replace(/^https?:\/\//, '');

  // Remove .atlassian.net suffix for cleaner keys
  normalized = normalized.replace(/\.atlassian\.net$/, '');

  // Convert to uppercase and replace non-alphanumeric with underscore
  return normalized.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

/**
 * Get API token for a specific JIRA domain
 *
 * Supports domain-specific tokens via JIRA_API_TOKEN_{DOMAIN} env vars.
 * This allows different JIRA instances to use different credentials.
 *
 * @param domain - The JIRA domain (e.g., company.atlassian.net)
 * @returns The API token string
 * @throws Error if no token is configured
 *
 * @example
 * // Uses JIRA_API_TOKEN_ACME if set, otherwise JIRA_API_TOKEN
 * const token = getJiraToken('acme.atlassian.net');
 */
export function getJiraToken(domain: string): string {
  // SECURITY: Never log the token value itself

  // Try domain-specific token first (e.g., JIRA_API_TOKEN_ACME)
  const domainEnvKey = `JIRA_API_TOKEN_${normalizeDomainToEnvKey(domain)}`;
  const domainToken = process.env[domainEnvKey];
  if (domainToken) {
    return domainToken;
  }

  // Fall back to default token
  const defaultToken = process.env.JIRA_API_TOKEN;
  if (!defaultToken) {
    throw new Error(
      `JIRA API token not found. Set JIRA_API_TOKEN in .env file ` +
      `or ${domainEnvKey} for domain-specific token.`
    );
  }

  return defaultToken;
}

/**
 * Get email for a specific JIRA domain
 *
 * @param domain - The JIRA domain
 * @returns The email string
 * @throws Error if no email is configured
 */
export function getJiraEmail(domain: string): string {
  // Try domain-specific email first
  const domainEnvKey = `JIRA_EMAIL_${normalizeDomainToEnvKey(domain)}`;
  const domainEmail = process.env[domainEnvKey];
  if (domainEmail) {
    return domainEmail;
  }

  // Fall back to default email
  const defaultEmail = process.env.JIRA_EMAIL;
  if (!defaultEmail) {
    throw new Error(
      `JIRA email not found. Set JIRA_EMAIL in .env file ` +
      `or ${domainEnvKey} for domain-specific email.`
    );
  }

  return defaultEmail;
}

/**
 * Get full credentials for a JIRA domain
 *
 * @param domain - The JIRA domain
 * @returns Complete credentials object
 */
export function getJiraCredentialsForDomain(domain: string): JiraCredentialsResolved {
  return {
    apiToken: getJiraToken(domain),
    email: getJiraEmail(domain),
    domain,
  };
}

/**
 * Check if credentials are available for a domain
 *
 * @param domain - The JIRA domain (optional, checks default if not provided)
 * @returns true if credentials are available (domain-specific or default)
 */
export function hasJiraCredentials(domain?: string): boolean {
  if (domain) {
    const domainEnvKey = `JIRA_API_TOKEN_${normalizeDomainToEnvKey(domain)}`;
    if (process.env[domainEnvKey]) {
      return true;
    }
  }

  return !!process.env.JIRA_API_TOKEN;
}

/**
 * Get the environment variable key for a domain's token
 *
 * @param domain - The JIRA domain
 * @returns The environment variable key
 *
 * @example
 * getTokenEnvKey('acme.atlassian.net') // returns 'JIRA_API_TOKEN_ACME'
 */
export function getTokenEnvKey(domain: string): string {
  return `JIRA_API_TOKEN_${normalizeDomainToEnvKey(domain)}`;
}

/**
 * Get the environment variable key for a domain's email
 *
 * @param domain - The JIRA domain
 * @returns The environment variable key
 *
 * @example
 * getEmailEnvKey('acme.atlassian.net') // returns 'JIRA_EMAIL_ACME'
 */
export function getEmailEnvKey(domain: string): string {
  return `JIRA_EMAIL_${normalizeDomainToEnvKey(domain)}`;
}

/**
 * List all configured JIRA domains from environment
 *
 * Scans environment variables for JIRA_API_TOKEN_* patterns
 * and returns the list of configured domains.
 *
 * @returns Array of domain suffixes (e.g., ['ACME', 'CORP'])
 */
export function listConfiguredDomains(): string[] {
  const domains: string[] = [];
  const prefix = 'JIRA_API_TOKEN_';

  for (const key of Object.keys(process.env)) {
    if (key.startsWith(prefix) && key !== 'JIRA_API_TOKEN') {
      const domainSuffix = key.substring(prefix.length);
      if (domainSuffix) {
        domains.push(domainSuffix);
      }
    }
  }

  return domains;
}
