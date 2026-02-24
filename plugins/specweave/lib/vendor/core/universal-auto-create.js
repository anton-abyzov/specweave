/**
 * Universal Auto-Create for External Tools
 *
 * Creates per-user-story items in ALL enabled providers (JIRA, ADO).
 * GitHub is handled separately by the existing github-auto-create-handler.sh.
 *
 * Called by universal-auto-create-dispatcher.sh when spec.md is written.
 *
 * @module universal-auto-create
 */
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { deriveFeatureId } from '../utils/feature-id-derivation.js';
// ============================================================================
// Helpers
// ============================================================================
function emptyResult() {
    return { created: [], skipped: [], errors: [] };
}
/**
 * Parse user stories (ID + title) from spec.md content.
 * Matches patterns like "### US-001: User story title"
 */
export function parseUserStories(content) {
    const stories = [];
    const pattern = /###\s+(US-\d+):\s*(.+)/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
        stories.push({ id: match[1], title: match[2].trim() });
    }
    return stories;
}
// ============================================================================
// Provider Functions
// ============================================================================
async function createJiraUserStories(incrementId, featureId, userStories, existingLinks, config) {
    const result = emptyResult();
    const { JiraClient } = await import('../integrations/jira/jira-client.js');
    const domain = config.jira?.domain || '';
    const projectKey = config.jira?.projectKey || '';
    if (!domain || !projectKey) {
        result.errors.push({ usId: 'config', error: 'JIRA domain or projectKey not configured' });
        return result;
    }
    const client = new JiraClient();
    for (const us of userStories) {
        // Idempotency: skip if already linked
        if (existingLinks[us.id]) {
            result.skipped.push({ usId: us.id, reason: 'already-linked' });
            continue;
        }
        try {
            const summary = `[${featureId}][${us.id}] ${us.title}`;
            const issue = await client.createIssue({
                issueType: 'Story',
                summary,
                labels: ['specweave', 'auto-created'],
            }, projectKey);
            const issueUrl = `https://${domain}/browse/${issue.key}`;
            result.created.push({ usId: us.id, ref: issue.key, url: issueUrl });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push({ usId: us.id, error: msg });
        }
    }
    return result;
}
async function createAdoUserStories(incrementId, featureId, userStories, existingLinks, config) {
    const result = emptyResult();
    const { AdoClient } = await import('../integrations/ado/ado-client.js');
    const { getAdoPat } = await import('../integrations/ado/ado-pat-provider.js');
    const organization = config.ado?.organization || '';
    const project = config.ado?.project || '';
    if (!organization || !project) {
        result.errors.push({ usId: 'config', error: 'ADO organization or project not configured' });
        return result;
    }
    const pat = getAdoPat(organization);
    if (!pat) {
        result.errors.push({ usId: 'config', error: 'AZURE_DEVOPS_PAT not set' });
        return result;
    }
    const client = new AdoClient({ pat, organization, project });
    for (const us of userStories) {
        // Idempotency: skip if already linked
        if (existingLinks[us.id]) {
            result.skipped.push({ usId: us.id, reason: 'already-linked' });
            continue;
        }
        try {
            const title = `[${featureId}][${us.id}] ${us.title}`;
            const workItem = await client.createWorkItem({
                workItemType: 'User Story',
                title,
                tags: ['specweave', 'auto-created'],
            });
            result.created.push({
                usId: us.id,
                ref: String(workItem.id),
                url: workItem.url,
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push({ usId: us.id, error: msg });
        }
    }
    return result;
}
// ============================================================================
// Metadata Update
// ============================================================================
async function updateMetadata(metadataPath, results) {
    if (!existsSync(metadataPath))
        return;
    const raw = await readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(raw);
    if (!metadata.externalLinks) {
        metadata.externalLinks = {};
    }
    const now = new Date().toISOString();
    // Update JIRA links
    if (results.jira && results.jira.created.length > 0) {
        if (!metadata.externalLinks.jira) {
            metadata.externalLinks.jira = { userStories: {} };
        }
        if (!metadata.externalLinks.jira.userStories) {
            metadata.externalLinks.jira.userStories = {};
        }
        for (const item of results.jira.created) {
            metadata.externalLinks.jira.userStories[item.usId] = {
                issueKey: item.ref,
                issueUrl: item.url,
                syncedAt: now,
            };
        }
    }
    // Update ADO links
    if (results.ado && results.ado.created.length > 0) {
        if (!metadata.externalLinks.ado) {
            metadata.externalLinks.ado = { userStories: {} };
        }
        if (!metadata.externalLinks.ado.userStories) {
            metadata.externalLinks.ado.userStories = {};
        }
        for (const item of results.ado.created) {
            metadata.externalLinks.ado.userStories[item.usId] = {
                workItemId: parseInt(item.ref, 10),
                workItemUrl: item.url,
                syncedAt: now,
            };
        }
    }
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n', 'utf-8');
}
// ============================================================================
// Main Entry Point
// ============================================================================
/**
 * Create per-user-story items in JIRA and/or ADO for an increment.
 *
 * GitHub is NOT handled here (delegated to existing bash handler).
 * This function is called by the universal-auto-create-dispatcher.sh.
 */
export async function createExternalIssuesForIncrement(incrementId, specPath, metadataPath, config) {
    const result = {};
    // Parse user stories from spec.md
    const content = await readFile(specPath, 'utf-8');
    const userStories = parseUserStories(content);
    if (userStories.length === 0) {
        return result;
    }
    // Derive feature ID
    let featureId;
    try {
        featureId = deriveFeatureId(incrementId);
    }
    catch {
        const numMatch = incrementId.match(/^(\d+)/);
        featureId = numMatch ? `FS-${parseInt(numMatch[1], 10)}` : `FS-${incrementId.substring(0, 3)}`;
    }
    // Load existing external links from metadata (for idempotency)
    let existingJiraLinks = {};
    let existingAdoLinks = {};
    if (existsSync(metadataPath)) {
        try {
            const metaRaw = await readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metaRaw);
            existingJiraLinks = metadata.externalLinks?.jira?.userStories || {};
            existingAdoLinks = metadata.externalLinks?.ado?.userStories || {};
        }
        catch {
            // Metadata parse error — proceed without existing links
        }
    }
    // Create in each enabled provider (isolated errors)
    if (config.sync?.jira?.enabled) {
        try {
            result.jira = await createJiraUserStories(incrementId, featureId, userStories, existingJiraLinks, config);
        }
        catch (err) {
            const providerResult = emptyResult();
            providerResult.errors.push({
                usId: 'unknown',
                error: err instanceof Error ? err.message : String(err),
            });
            result.jira = providerResult;
        }
    }
    if (config.sync?.ado?.enabled) {
        try {
            result.ado = await createAdoUserStories(incrementId, featureId, userStories, existingAdoLinks, config);
        }
        catch (err) {
            const providerResult = emptyResult();
            providerResult.errors.push({
                usId: 'unknown',
                error: err instanceof Error ? err.message : String(err),
            });
            result.ado = providerResult;
        }
    }
    // Update metadata with new links
    await updateMetadata(metadataPath, result);
    return result;
}
//# sourceMappingURL=universal-auto-create.js.map