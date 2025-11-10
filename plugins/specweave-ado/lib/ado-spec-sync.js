/**
 * Azure DevOps Spec Sync
 *
 * CORRECT ARCHITECTURE:
 * - Syncs .specweave/docs/internal/specs/spec-*.md ↔ ADO Features
 * - NOT increments ↔ ADO Work Items (that was wrong!)
 *
 * Mapping:
 * - Spec → ADO Feature
 * - User Story → ADO User Story (child of feature)
 * - Acceptance Criteria → Checklist in User Story description
 *
 * @module ado-spec-sync
 */
import { SpecMetadataManager } from '../../../src/core/specs/spec-metadata-manager.js';
import { SpecParser } from '../../../src/core/specs/spec-parser.js';
import axios from 'axios';
export class AdoSpecSync {
    constructor(config, projectRoot = process.cwd()) {
        this.specManager = new SpecMetadataManager(projectRoot);
        this.config = config;
        // Create ADO API client
        this.client = axios.create({
            baseURL: `https://dev.azure.com/${config.organization}/${config.project}/_apis`,
            auth: {
                username: '', // Empty for PAT auth
                password: config.personalAccessToken
            },
            headers: {
                'Content-Type': 'application/json-patch+json',
                'Accept': 'application/json'
            }
        });
    }
    /**
     * Sync spec to ADO Feature (CREATE or UPDATE)
     */
    async syncSpecToAdo(specId) {
        console.log(`\n🔄 Syncing spec ${specId} to ADO Feature...`);
        try {
            // 1. Load spec
            const spec = await this.specManager.loadSpec(specId);
            if (!spec) {
                return {
                    success: false,
                    specId,
                    provider: 'ado',
                    error: `Spec ${specId} not found`
                };
            }
            // 2. Check if spec already linked to ADO Feature
            const existingLink = spec.metadata.externalLinks?.ado;
            let feature;
            if (existingLink?.featureId) {
                // UPDATE existing feature
                console.log(`   Found existing ADO Feature #${existingLink.featureId}`);
                feature = await this.updateAdoFeature(existingLink.featureId, spec);
            }
            else {
                // CREATE new feature
                console.log('   Creating new ADO Feature...');
                feature = await this.createAdoFeature(spec);
                // Link spec to feature
                await this.specManager.linkToExternal(specId, 'ado', {
                    id: feature.id,
                    url: feature.url,
                    organization: this.config.organization,
                    project: this.config.project
                });
            }
            // 3. Sync user stories as ADO User Stories
            const changes = await this.syncUserStories(feature.id, spec);
            console.log('✅ Sync complete!');
            return {
                success: true,
                specId,
                provider: 'ado',
                externalId: feature.id.toString(),
                url: feature.url,
                changes
            };
        }
        catch (error) {
            console.error('❌ Error syncing to ADO:', error);
            return {
                success: false,
                specId,
                provider: 'ado',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Sync FROM ADO Feature to spec (bidirectional)
     */
    async syncFromAdo(specId) {
        console.log(`\n🔄 Syncing FROM ADO to spec ${specId}...`);
        try {
            // 1. Load spec
            const spec = await this.specManager.loadSpec(specId);
            if (!spec) {
                return {
                    success: false,
                    specId,
                    provider: 'ado',
                    error: `Spec ${specId} not found`
                };
            }
            // 2. Get ADO Feature link
            const adoLink = spec.metadata.externalLinks?.ado;
            if (!adoLink?.featureId) {
                return {
                    success: false,
                    specId,
                    provider: 'ado',
                    error: 'Spec not linked to ADO Feature'
                };
            }
            // 3. Fetch ADO Feature state
            const feature = await this.fetchAdoFeature(adoLink.featureId);
            // 4. Detect conflicts
            const conflicts = await this.detectConflicts(spec, feature);
            if (conflicts.length === 0) {
                console.log('✅ No conflicts - spec and ADO in sync');
                return {
                    success: true,
                    specId,
                    provider: 'ado',
                    externalId: feature.id.toString(),
                    url: feature.url
                };
            }
            console.log(`⚠️  Detected ${conflicts.length} conflict(s)`);
            // 5. Resolve conflicts (ADO wins by default for now)
            await this.resolveConflicts(spec, conflicts);
            console.log('✅ Sync FROM ADO complete!');
            return {
                success: true,
                specId,
                provider: 'ado',
                externalId: feature.id.toString(),
                url: feature.url,
                conflicts
            };
        }
        catch (error) {
            console.error('❌ Error syncing FROM ADO:', error);
            return {
                success: false,
                specId,
                provider: 'ado',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Create new ADO Feature for spec
     */
    async createAdoFeature(spec) {
        const featureTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
        const featureDescription = this.generateFeatureDescription(spec);
        const tags = [`spec:${spec.metadata.id}`, `priority:${spec.metadata.priority}`].join('; ');
        const payload = [
            {
                op: 'add',
                path: '/fields/System.Title',
                value: featureTitle
            },
            {
                op: 'add',
                path: '/fields/System.Description',
                value: featureDescription
            },
            {
                op: 'add',
                path: '/fields/System.WorkItemType',
                value: 'Feature'
            },
            {
                op: 'add',
                path: '/fields/System.Tags',
                value: tags
            }
        ];
        const response = await this.client.post('/wit/workitems/$Feature?api-version=7.0', payload);
        const featureData = response.data;
        console.log(`   ✅ Created ADO Feature #${featureData.id}: ${featureData._links.html.href}`);
        return {
            id: featureData.id,
            url: featureData._links.html.href,
            fields: featureData.fields
        };
    }
    /**
     * Update existing ADO Feature
     */
    async updateAdoFeature(featureId, spec) {
        const featureTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
        const featureDescription = this.generateFeatureDescription(spec);
        const payload = [
            {
                op: 'replace',
                path: '/fields/System.Title',
                value: featureTitle
            },
            {
                op: 'replace',
                path: '/fields/System.Description',
                value: featureDescription
            }
        ];
        const response = await this.client.patch(`/wit/workitems/${featureId}?api-version=7.0`, payload);
        const featureData = response.data;
        console.log(`   ✅ Updated ADO Feature #${featureId}`);
        return {
            id: featureData.id,
            url: featureData._links.html.href,
            fields: featureData.fields
        };
    }
    /**
     * Sync user stories as ADO User Stories
     */
    async syncUserStories(featureId, spec) {
        const created = [];
        const updated = [];
        const deleted = [];
        if (!spec.metadata.userStories || spec.metadata.userStories.length === 0) {
            console.log('   ℹ️  No user stories to sync');
            return { created, updated, deleted };
        }
        console.log(`   Syncing ${spec.metadata.userStories.length} user stories...`);
        for (const us of spec.metadata.userStories) {
            // Create or update ADO User Story for each user story
            const storyTitle = `[${us.id}] ${us.title}`;
            const storyDescription = this.generateStoryDescription(us);
            // Check if story already exists (by searching for US-ID in title)
            const existingStory = await this.findStoryByTitle(us.id);
            if (existingStory) {
                // UPDATE existing story
                await this.updateStory(existingStory.id, {
                    title: storyTitle,
                    description: storyDescription,
                    state: us.status === 'done' ? 'Closed' : us.status === 'in-progress' ? 'Active' : 'New'
                });
                updated.push(us.id);
                console.log(`   ✅ Updated ${us.id}`);
            }
            else {
                // CREATE new story
                const newStory = await this.createStory({
                    title: storyTitle,
                    description: storyDescription,
                    parentId: featureId,
                    tags: [`user-story`, `spec:${spec.metadata.id}`, `priority:${us.priority}`].join('; ')
                });
                created.push(us.id);
                console.log(`   ✅ Created ${us.id} → User Story #${newStory.id}`);
            }
        }
        return { created, updated, deleted };
    }
    /**
     * Generate feature description from spec
     */
    generateFeatureDescription(spec) {
        const progress = spec.metadata.progress;
        const progressText = progress
            ? `**Progress**: ${progress.percentComplete}% (${progress.completedUserStories}/${progress.totalUserStories} user stories)`
            : '**Progress**: N/A';
        return `
<h1>${spec.metadata.title}</h1>

<p><strong>Spec ID</strong>: ${spec.metadata.id}</p>
<p><strong>Priority</strong>: ${spec.metadata.priority}</p>
<p><strong>Status</strong>: ${spec.metadata.status}</p>
<p>${progressText}</p>

<hr>

${SpecParser.extractOverview(spec.markdown).replace(/\n/g, '<br>')}

<hr>

<h2>User Stories</h2>

<p>${spec.metadata.userStories?.length || 0} user stories tracked in this feature.</p>

<hr>

<p>🤖 <strong>Auto-synced from SpecWeave</strong><br>
Last updated: ${new Date().toISOString()}</p>
`.trim();
    }
    /**
     * Generate story description from user story
     */
    generateStoryDescription(us) {
        const acList = us.acceptanceCriteria
            .map(ac => `<li>${ac.status === 'done' ? '☑' : '☐'} ${ac.description}</li>`)
            .join('\n');
        return `
<h2>User Story</h2>

<p>${us.title}</p>

<h2>Acceptance Criteria</h2>

<ul>
${acList}
</ul>

<hr>

<p><strong>Priority</strong>: ${us.priority}</p>
<p><strong>Status</strong>: ${us.status}</p>

<p>🤖 <strong>Auto-synced from SpecWeave</strong></p>
`.trim();
    }
    /**
     * Detect conflicts between spec and ADO
     */
    async detectConflicts(spec, feature) {
        const conflicts = [];
        // Compare feature title
        const expectedTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
        if (feature.fields['System.Title'] !== expectedTitle) {
            conflicts.push({
                type: 'metadata',
                field: 'title',
                localValue: spec.metadata.title,
                remoteValue: feature.fields['System.Title'],
                resolution: 'remote-wins',
                description: 'Feature title differs from spec title'
            });
        }
        // TODO: Compare user stories and their statuses
        return conflicts;
    }
    /**
     * Resolve conflicts
     */
    async resolveConflicts(spec, conflicts) {
        for (const conflict of conflicts) {
            if (conflict.resolution === 'remote-wins') {
                console.log(`   🔄 Resolving: ${conflict.description} (ADO wins)`);
                // Update spec metadata from ADO
                if (conflict.field === 'title') {
                    await this.specManager.saveMetadata(spec.metadata.id, {
                        title: conflict.remoteValue
                    });
                }
            }
        }
    }
    /**
     * Fetch ADO Feature details
     */
    async fetchAdoFeature(featureId) {
        const response = await this.client.get(`/wit/workitems/${featureId}?api-version=7.0`);
        const featureData = response.data;
        return {
            id: featureData.id,
            url: featureData._links.html.href,
            fields: featureData.fields
        };
    }
    /**
     * Find story by title pattern
     */
    async findStoryByTitle(usId) {
        const wiql = `
      SELECT [System.Id], [System.Title], [System.Description], [System.State]
      FROM WorkItems
      WHERE [System.TeamProject] = '${this.config.project}'
        AND [System.WorkItemType] = 'User Story'
        AND [System.Title] CONTAINS '[${usId}]'
    `;
        const response = await this.client.post('/wit/wiql?api-version=7.0', {
            query: wiql
        });
        const workItems = response.data.workItems;
        if (workItems.length === 0) {
            return null;
        }
        // Fetch full work item details
        const workItemId = workItems[0].id;
        const detailsResponse = await this.client.get(`/wit/workitems/${workItemId}?api-version=7.0`);
        const storyData = detailsResponse.data;
        return {
            id: storyData.id,
            url: storyData._links.html.href,
            fields: storyData.fields
        };
    }
    /**
     * Create ADO User Story
     */
    async createStory(story) {
        const payload = [
            {
                op: 'add',
                path: '/fields/System.Title',
                value: story.title
            },
            {
                op: 'add',
                path: '/fields/System.Description',
                value: story.description
            },
            {
                op: 'add',
                path: '/fields/System.WorkItemType',
                value: 'User Story'
            },
            {
                op: 'add',
                path: '/fields/System.Tags',
                value: story.tags
            },
            {
                op: 'add',
                path: '/relations/-',
                value: {
                    rel: 'System.LinkTypes.Hierarchy-Reverse',
                    url: `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis/wit/workitems/${story.parentId}`,
                    attributes: {
                        name: 'Parent'
                    }
                }
            }
        ];
        const response = await this.client.post('/wit/workitems/$User%20Story?api-version=7.0', payload);
        const storyData = response.data;
        return {
            id: storyData.id,
            url: storyData._links.html.href,
            fields: storyData.fields
        };
    }
    /**
     * Update ADO User Story
     */
    async updateStory(storyId, updates) {
        const payload = [];
        if (updates.title) {
            payload.push({
                op: 'replace',
                path: '/fields/System.Title',
                value: updates.title
            });
        }
        if (updates.description) {
            payload.push({
                op: 'replace',
                path: '/fields/System.Description',
                value: updates.description
            });
        }
        if (updates.state) {
            payload.push({
                op: 'replace',
                path: '/fields/System.State',
                value: updates.state
            });
        }
        await this.client.patch(`/wit/workitems/${storyId}?api-version=7.0`, payload);
    }
}
//# sourceMappingURL=ado-spec-sync.js.map