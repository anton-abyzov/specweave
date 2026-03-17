/**
 * JIRA Deployment Type Detector
 *
 * Detects whether a JIRA instance is Cloud or Server/Data Center
 * and returns the correct API version to use.
 *
 * - Cloud: /rest/api/3 (ADF content format)
 * - Server/DC: /rest/api/2 (wiki markup content format)
 *
 * Results are cached per domain to avoid repeated lookups.
 *
 * @module jira-deployment-detector
 */

import axios from 'axios';

export interface DeploymentInfo {
  type: 'cloud' | 'server';
  apiVersion: '2' | '3';
  baseUrl: string;
}

/** Cache: domain → deployment info */
const deploymentCache = new Map<string, DeploymentInfo>();

/**
 * Detect JIRA deployment type by calling /rest/api/2/serverInfo.
 * This endpoint exists on both Cloud and Server/DC.
 *
 * Cloud instances return deploymentType: "Cloud".
 * Server/DC instances return deploymentType: "Server" or "DataCenter".
 */
export async function detectDeploymentType(
  domain: string,
  auth: { email: string; apiToken: string }
): Promise<DeploymentInfo> {
  // Check cache first
  const cached = deploymentCache.get(domain);
  if (cached) return cached;

  try {
    const response = await axios.get(
      `https://${domain}/rest/api/2/serverInfo`,
      {
        auth: {
          username: auth.email,
          password: auth.apiToken,
        },
        headers: {
          Accept: 'application/json',
        },
        timeout: 10000,
      }
    );

    const data = response.data;
    const deploymentType = (data.deploymentType || '').toLowerCase();

    const isCloud = deploymentType === 'cloud' || domain.endsWith('.atlassian.net');

    const info: DeploymentInfo = {
      type: isCloud ? 'cloud' : 'server',
      apiVersion: isCloud ? '3' : '2',
      baseUrl: `https://${domain}/rest/api/${isCloud ? '3' : '2'}`,
    };

    deploymentCache.set(domain, info);
    return info;
  } catch {
    // Fallback: if .atlassian.net assume Cloud, otherwise Server
    const isCloud = domain.endsWith('.atlassian.net');
    const info: DeploymentInfo = {
      type: isCloud ? 'cloud' : 'server',
      apiVersion: isCloud ? '3' : '2',
      baseUrl: `https://${domain}/rest/api/${isCloud ? '3' : '2'}`,
    };

    deploymentCache.set(domain, info);
    return info;
  }
}

/**
 * Build the full API base URL for a given JIRA domain.
 * Uses cached deployment info if available.
 */
export function getApiBaseUrl(domain: string): string {
  const cached = deploymentCache.get(domain);
  if (cached) return cached.baseUrl;
  // Default to v3 (Cloud) if not yet detected
  return `https://${domain}/rest/api/3`;
}

/**
 * Get the API version string for a domain.
 */
export function getApiVersion(domain: string): '2' | '3' {
  const cached = deploymentCache.get(domain);
  return cached?.apiVersion ?? '3';
}

/**
 * Check if a domain is Cloud deployment.
 */
export function isCloud(domain: string): boolean {
  const cached = deploymentCache.get(domain);
  return cached ? cached.type === 'cloud' : domain.endsWith('.atlassian.net');
}

/** Clear cache (for testing) */
export function clearDeploymentCache(): void {
  deploymentCache.clear();
}
