/**
 * GitHub Spec Frontmatter Updater
 *
 * Updates spec.md YAML frontmatter after push sync to record
 * GitHub issue links for each user story.
 *
 * @module github-spec-frontmatter-updater
 */

import { readFile, writeFile } from 'fs/promises';
import type { PushSyncResult } from './github-push-sync.js';
import type { GitHubSyncMetadata, GitHubUserStoryLink } from '../../../src/core/types/sync-profile.js';

/**
 * Update spec.md frontmatter with GitHub sync results.
 *
 * Reads the spec file, parses YAML frontmatter, merges sync results
 * into the externalLinks.github section, and writes back.
 */
export async function updateSpecFrontmatter(
  specPath: string,
  syncResult: PushSyncResult,
  options?: { projectV2Id?: string; projectV2Number?: number },
): Promise<GitHubSyncMetadata> {
  const content = await readFile(specPath, 'utf-8');

  // Parse frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let frontmatter: Record<string, unknown> = {};
  let body = content;

  if (fmMatch) {
    frontmatter = parseYamlSimple(fmMatch[1]);
    body = content.slice(fmMatch[0].length);
  }

  // Get existing externalLinks
  const externalLinks = (frontmatter.externalLinks ?? {}) as Record<string, unknown>;
  const existingGithub = (externalLinks.github ?? {}) as Record<string, unknown>;
  const existingUserStories = (existingGithub.userStories ?? {}) as Record<string, GitHubUserStoryLink>;

  // Build updated user stories map (preserve existing)
  const userStories: Record<string, GitHubUserStoryLink> = { ...existingUserStories };
  const now = new Date().toISOString();

  // Merge created issues
  for (const item of syncResult.created) {
    userStories[item.userStoryId] = {
      issueNumber: item.issueNumber,
      issueUrl: item.issueUrl,
      issueNodeId: item.issueNodeId,
      syncedAt: now,
    };
  }

  // Merge updated issues (preserve existing nodeId)
  for (const item of syncResult.updated) {
    const existing = userStories[item.userStoryId];
    userStories[item.userStoryId] = {
      issueNumber: item.issueNumber,
      issueUrl: item.issueUrl,
      issueNodeId: existing?.issueNodeId,
      syncedAt: now,
    };
  }

  // Determine sync status
  const syncStatus: GitHubSyncMetadata['syncStatus'] =
    syncResult.errors.length > 0 ? 'dirty' : 'synced';

  // Build metadata result
  const metadata: GitHubSyncMetadata = {
    syncStatus,
    userStories,
  };

  // ProjectV2 info: prefer options, fall back to existing
  if (options?.projectV2Id) {
    metadata.projectV2Id = options.projectV2Id;
  } else if (existingGithub.projectV2Id) {
    metadata.projectV2Id = existingGithub.projectV2Id as string;
  }

  if (options?.projectV2Number) {
    metadata.projectV2Number = options.projectV2Number;
  } else if (existingGithub.projectV2Number) {
    metadata.projectV2Number = existingGithub.projectV2Number as number;
  }

  // Update frontmatter
  externalLinks.github = metadata;
  frontmatter.externalLinks = externalLinks;

  // Write back
  const newFrontmatter = stringifyYaml(frontmatter);
  const newContent = `---\n${newFrontmatter}\n---${body}`;
  await writeFile(specPath, newContent, 'utf-8');

  return metadata;
}

/**
 * Simple YAML parser for spec frontmatter.
 * Handles nested objects, strings, numbers, booleans, null, and arrays.
 * Supports block arrays (`- item`) and flow arrays (`[a, b, c]`).
 */
function parseYamlSimple(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  const stack: Array<{ obj: Record<string, unknown>; indent: number; currentKey?: string }> = [
    { obj: result, indent: -1 },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Block array item: `- value` or `- key: value` (nested object in array)
    if (trimmed.startsWith('- ')) {
      // Find the parent that owns this array
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      const parent = stack[stack.length - 1];
      const key = parent.currentKey;
      if (key && parent.obj[key] !== undefined) {
        const arr = parent.obj[key];
        if (Array.isArray(arr)) {
          const itemText = trimmed.slice(2).trim();
          // Check if it's a nested object item (- key: value)
          const nestedColonIdx = itemText.indexOf(':');
          if (nestedColonIdx > 0 && !itemText.startsWith('"') && !itemText.startsWith("'")) {
            const nestedKey = itemText.slice(0, nestedColonIdx).trim();
            const nestedVal = itemText.slice(nestedColonIdx + 1).trim();
            if (nestedVal) {
              // Simple key:value object item
              const obj: Record<string, unknown> = { [nestedKey]: parseYamlValue(nestedVal) };
              arr.push(obj);
            } else {
              arr.push(parseYamlValue(itemText));
            }
          } else {
            arr.push(parseYamlValue(itemText));
          }
        }
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    // Pop stack to correct indent level
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (rawValue === '' || rawValue === undefined) {
      // Check if next non-empty line is a block array item
      const nextIdx = findNextNonEmptyLine(lines, i + 1);
      if (nextIdx !== -1 && lines[nextIdx].trim().startsWith('- ')) {
        // This key holds an array
        parent[key] = [] as unknown[];
        stack.push({ obj: parent, indent, currentKey: key });
      } else {
        // Nested object
        const child: Record<string, unknown> = {};
        parent[key] = child;
        stack.push({ obj: child, indent });
      }
    } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      // Flow array: [a, b, c]
      parent[key] = parseFlowArray(rawValue);
    } else {
      parent[key] = parseYamlValue(rawValue);
    }
  }

  return result;
}

/**
 * Find the next non-empty, non-comment line index.
 */
function findNextNonEmptyLine(lines: string[], start: number): number {
  for (let i = start; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed && !trimmed.startsWith('#')) return i;
  }
  return -1;
}

/**
 * Parse a YAML flow array like [a, b, c] or ["a", "b"]
 */
function parseFlowArray(raw: string): unknown[] {
  const inner = raw.slice(1, -1).trim();
  if (!inner) return [];
  // Split on commas, respecting quoted strings
  const items: unknown[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inQuote) {
      if (ch === quoteChar) {
        inQuote = false;
      }
      current += ch;
    } else if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
    } else if (ch === ',') {
      items.push(parseYamlValue(current.trim()));
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) {
    items.push(parseYamlValue(current.trim()));
  }
  return items;
}

function parseYamlValue(raw: string): unknown {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return parseFloat(raw);
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

/**
 * Simple YAML stringifier with array support.
 */
function stringifyYaml(obj: Record<string, unknown>, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const parts: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      parts.push(`${prefix}${key}: null`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        parts.push(`${prefix}${key}: []`);
      } else if (value.every(v => typeof v !== 'object' || v === null)) {
        // Simple array — use block style
        parts.push(`${prefix}${key}:`);
        for (const item of value) {
          if (typeof item === 'string') {
            parts.push(`${prefix}  - "${item}"`);
          } else {
            parts.push(`${prefix}  - ${item}`);
          }
        }
      } else {
        // Array of objects — use block style with nested keys
        parts.push(`${prefix}${key}:`);
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const entries = Object.entries(item as Record<string, unknown>);
            if (entries.length > 0) {
              const [firstKey, firstVal] = entries[0];
              const formattedVal = typeof firstVal === 'string' ? `"${firstVal}"` : firstVal;
              parts.push(`${prefix}  - ${firstKey}: ${formattedVal}`);
              for (let j = 1; j < entries.length; j++) {
                const [k, v] = entries[j];
                const fv = typeof v === 'string' ? `"${v}"` : v;
                parts.push(`${prefix}    ${k}: ${fv}`);
              }
            }
          } else {
            parts.push(`${prefix}  - ${item}`);
          }
        }
      }
    } else if (typeof value === 'object') {
      parts.push(`${prefix}${key}:`);
      parts.push(stringifyYaml(value as Record<string, unknown>, indent + 1));
    } else if (typeof value === 'string') {
      parts.push(`${prefix}${key}: "${value}"`);
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      parts.push(`${prefix}${key}: ${value}`);
    } else {
      parts.push(`${prefix}${key}: ${JSON.stringify(value)}`);
    }
  }

  return parts.join('\n');
}
