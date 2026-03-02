/**
 * JIRA Field Discovery
 *
 * Dynamically discovers custom field IDs (e.g., Epic Link) and
 * detects project style (Next-gen vs Classic).
 *
 * Results are cached per domain/project to avoid repeated lookups.
 *
 * @module jira-field-discovery
 */

import axios from 'axios';
import { getApiBaseUrl } from './jira-deployment-detector.js';

/** Cache: domain → epic link field ID */
const epicLinkFieldCache = new Map<string, string | null>();

/** Cache: projectKey → project style */
const projectStyleCache = new Map<string, 'next-gen' | 'classic'>();

/**
 * Discover the Epic Link custom field ID by querying /rest/api/field.
 * Searches for fields with name "Epic Link" or schema type "com.pyxis.greenhopper.jira:gh-epic-link".
 *
 * @returns The custom field ID (e.g., "customfield_10014") or null if not found
 */
export async function discoverEpicLinkField(
  domain: string,
  auth: { email: string; apiToken: string }
): Promise<string | null> {
  // Check cache
  const cached = epicLinkFieldCache.get(domain);
  if (cached !== undefined) return cached;

  try {
    const baseUrl = getApiBaseUrl(domain);
    const response = await axios.get(`${baseUrl}/field`, {
      auth: {
        username: auth.email,
        password: auth.apiToken,
      },
      headers: { Accept: 'application/json' },
      timeout: 10000,
    });

    const fields: any[] = response.data;

    // Find Epic Link field by name or schema
    const epicLinkField = fields.find(
      (f: any) =>
        f.name === 'Epic Link' ||
        f.schema?.custom === 'com.pyxis.greenhopper.jira:gh-epic-link'
    );

    const fieldId = epicLinkField?.id || null;
    epicLinkFieldCache.set(domain, fieldId);
    return fieldId;
  } catch {
    epicLinkFieldCache.set(domain, null);
    return null;
  }
}

/**
 * Detect whether a JIRA project uses Next-gen (Team-managed) or Classic (Company-managed) style.
 *
 * Next-gen projects use `parent` field for epic linking.
 * Classic projects use a custom field (Epic Link).
 */
export async function detectProjectStyle(
  domain: string,
  projectKey: string,
  auth: { email: string; apiToken: string }
): Promise<'next-gen' | 'classic'> {
  const cacheKey = `${domain}:${projectKey}`;
  const cached = projectStyleCache.get(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = getApiBaseUrl(domain);
    const response = await axios.get(`${baseUrl}/project/${projectKey}`, {
      auth: {
        username: auth.email,
        password: auth.apiToken,
      },
      headers: { Accept: 'application/json' },
      timeout: 10000,
    });

    const project = response.data;

    // Next-gen projects have style: "next-gen" or projectTypeKey: "software" with simplified: true
    const isNextGen =
      project.style === 'next-gen' ||
      project.simplified === true;

    const style = isNextGen ? 'next-gen' : 'classic';
    projectStyleCache.set(cacheKey, style);
    return style;
  } catch {
    // Default to classic if detection fails
    projectStyleCache.set(cacheKey, 'classic');
    return 'classic';
  }
}

/**
 * Get the correct field name/ID for linking an issue to an epic,
 * based on project style.
 *
 * - Next-gen: uses `parent` field
 * - Classic: uses the discovered Epic Link custom field ID
 */
export async function getEpicLinkFieldForProject(
  domain: string,
  projectKey: string,
  auth: { email: string; apiToken: string }
): Promise<{ field: 'parent' | string; style: 'next-gen' | 'classic' }> {
  const style = await detectProjectStyle(domain, projectKey, auth);

  if (style === 'next-gen') {
    return { field: 'parent', style };
  }

  const epicLinkFieldId = await discoverEpicLinkField(domain, auth);
  if (!epicLinkFieldId) {
    throw new Error(
      `Could not discover Epic Link custom field for ${domain}. ` +
      `Ensure the JIRA instance has the Epic Link field and API credentials have field read access.`
    );
  }
  return { field: epicLinkFieldId, style };
}

/** Clear caches (for testing) */
export function clearFieldDiscoveryCache(): void {
  epicLinkFieldCache.clear();
  projectStyleCache.clear();
}
