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
import {
  SpecContent,
  UserStory,
  SpecSyncResult,
  SpecSyncConflict
} from '../../../src/core/types/spec-metadata.js';
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import axios, { AxiosInstance } from 'axios';
import { promises as fsPromises, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface AdoFeature {
  id: number;
  url: string;
  fields: {
    'System.Title': string;
    'System.Description': string;
    'System.State': string; // New, Active, Resolved, Closed
    'System.Tags': string;
  };
}

export interface AdoUserStory {
  id: number;
  url: string;
  fields: {
    'System.Title': string;
    'System.Description': string;
    'System.State': string;
    'System.Parent': number; // Feature ID
    'System.Tags': string;
  };
}

export interface AdoConfig {
  organization: string; // e.g., mycompany
  project: string; // e.g., MyProject
  personalAccessToken: string;
}

export class AdoSpecSync {
  private specManager: SpecMetadataManager;
  private client: AxiosInstance;
  private config: AdoConfig;
  private projectRoot: string;
  private availableTypes: Set<string> | null = null;

  constructor(config: AdoConfig, projectRoot: string = process.cwd(), projectId?: string) {
    this.projectRoot = projectRoot;
    this.specManager = new SpecMetadataManager(projectRoot, projectId);
    this.config = config;

    // Create ADO API client
    // NOTE: Do NOT set a default Content-Type here. Work item create/update
    // requires 'application/json-patch+json', but WIQL queries require
    // 'application/json'. Each method sets the appropriate Content-Type.
    this.client = axios.create({
      baseURL: `https://dev.azure.com/${config.organization}/${config.project}/_apis`,
      auth: {
        username: '', // Empty for PAT auth
        password: config.personalAccessToken
      },
      headers: {
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Detect available work item types for this ADO project.
   * Basic process has Epic/Issue/Task; Agile/Scrum has Feature/User Story/Bug/Task.
   */
  private async detectAvailableTypes(): Promise<Set<string>> {
    if (this.availableTypes) return this.availableTypes;
    try {
      const resp = await this.client.get('/wit/workitemtypes?api-version=7.1');
      this.availableTypes = new Set(resp.data.value.map((t: { name: string }) => t.name));
    } catch {
      // Fallback: assume Agile process
      this.availableTypes = new Set(['Feature', 'User Story', 'Bug', 'Task', 'Epic']);
    }
    return this.availableTypes;
  }

  /**
   * Resolve a work item type, falling back if not available in the project.
   * Feature → Epic (Basic process), User Story → Issue (Basic process)
   */
  private async resolveWorkItemType(desiredType: string): Promise<string> {
    const types = await this.detectAvailableTypes();
    if (types.has(desiredType)) return desiredType;

    // Fallback mappings for Basic process
    const fallbacks: Record<string, string> = {
      'Feature': 'Epic',
      'User Story': 'Issue',
    };
    const fallback = fallbacks[desiredType];
    if (fallback && types.has(fallback)) {
      console.log(`      ℹ️  Work item type "${desiredType}" not available, using "${fallback}"`);
      return fallback;
    }
    return desiredType; // Let ADO reject if truly unavailable
  }

  /**
   * Resolve a work item state name for the given type.
   * Basic process (Issue type) uses: "To Do", "Doing", "Done"
   * Agile/Scrum process uses: "New", "Active", "Closed" / "Resolved" / "Done"
   *
   * Maps canonical states: 'New' → todo, 'Active' → in-progress, 'Closed' → done
   */
  private stateCache = new Map<string, Set<string>>();
  private async resolveWorkItemState(workItemType: string, canonicalState: 'New' | 'Active' | 'Closed'): Promise<string> {
    if (!this.stateCache.has(workItemType)) {
      try {
        const resp = await this.client.get(
          `/wit/workitemtypes/${encodeURIComponent(workItemType)}/states?api-version=7.0`,
          { headers: { 'Accept': 'application/json' } }
        );
        const states = new Set<string>(resp.data.value.map((s: { name: string }) => s.name));
        this.stateCache.set(workItemType, states);
      } catch {
        // Fallback: assume Agile states
        this.stateCache.set(workItemType, new Set(['New', 'Active', 'Resolved', 'Closed']));
      }
    }
    const validStates = this.stateCache.get(workItemType)!;

    // Preferred state names per canonical state, in priority order
    const candidates: Record<string, string[]> = {
      'New':    ['To Do', 'New', 'Open'],
      'Active': ['Doing', 'Active', 'In Progress', 'In-Progress'],
      'Closed': ['Done', 'Closed', 'Resolved', 'Completed'],
    };

    for (const candidate of candidates[canonicalState]) {
      if (validStates.has(candidate)) return candidate;
    }
    // Last resort: return first available state for 'New', last for 'Closed'
    const arr = [...validStates];
    return canonicalState === 'Closed' ? (arr[arr.length - 1] ?? canonicalState) : (arr[0] ?? canonicalState);
  }

  /**
   * Sync spec to ADO Feature (CREATE or UPDATE)
   */
  async syncSpecToAdo(specId: string): Promise<SpecSyncResult> {
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

      let feature: AdoFeature;

      if (existingLink?.featureId) {
        // UPDATE existing feature
        console.log(`   Found existing ADO Feature #${existingLink.featureId}`);
        feature = await this.updateAdoFeature(existingLink.featureId, spec);
      } else {
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

    } catch (error) {
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
  async syncFromAdo(specId: string): Promise<SpecSyncResult> {
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

    } catch (error) {
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
  private async createAdoFeature(spec: SpecContent): Promise<AdoFeature> {
    const featureTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const featureDescription = this.generateFeatureDescription(spec);
    const tags = [`spec:${spec.metadata.id}`, `priority:${spec.metadata.priority}`].join('; ');

    // Determine work item type (supports Bug for bug-type specs)
    const mappedType = this.mapTypeToAdo(spec.metadata.type, 'Feature');
    const workItemType = await this.resolveWorkItemType(mappedType);

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
        value: workItemType
      },
      {
        op: 'add',
        path: '/fields/System.Tags',
        value: tags
      },
      {
        // Set native ADO Priority field (P0→1, P1→2, P2→3, P3→4)
        op: 'add',
        path: '/fields/Microsoft.VSTS.Common.Priority',
        value: this.mapPriorityToAdo(spec.metadata.priority)
      }
    ];

    const encodedType = encodeURIComponent(workItemType);
    const response = await this.client.post(`/wit/workitems/$${encodedType}?api-version=7.0`, payload, {
      headers: { 'Content-Type': 'application/json-patch+json' }
    });
    const featureData = response.data;

    console.log(`   ✅ Created ADO Feature #${featureData.id}: ${featureData._links.html.href}`);

    return {
      id: featureData.id,
      url: featureData._links.html.href,
      fields: featureData.fields
    };
  }

  /**
   * Update existing ADO Feature (conditional — only writes changed fields)
   */
  private async updateAdoFeature(featureId: number, spec: SpecContent): Promise<AdoFeature> {
    const featureTitle = `[${spec.metadata.id.toUpperCase()}] ${spec.metadata.title}`;
    const featureDescription = this.generateFeatureDescription(spec);

    // Fetch current values to avoid overwriting ADO-side edits
    const current = await this.fetchAdoFeature(featureId);

    const payload: any[] = [];

    if (current.fields['System.Title'] !== featureTitle) {
      payload.push({
        op: 'replace',
        path: '/fields/System.Title',
        value: featureTitle
      });
    } else {
      console.log(`   ℹ️  Title unchanged, skipping`);
    }

    if (current.fields['System.Description'] !== featureDescription) {
      payload.push({
        op: 'replace',
        path: '/fields/System.Description',
        value: featureDescription
      });
    } else {
      console.log(`   ℹ️  Description unchanged, skipping`);
    }

    if (payload.length === 0) {
      console.log(`   ℹ️  No changes detected for ADO Feature #${featureId}`);
      return current;
    }

    const response = await this.client.patch(
      `/wit/workitems/${featureId}?api-version=7.0`,
      payload,
      { headers: { 'Content-Type': 'application/json-patch+json' } }
    );
    const featureData = response.data;

    console.log(`   ✅ Updated ADO Feature #${featureId} (${payload.length} field(s) changed)`);

    return {
      id: featureData.id,
      url: featureData._links.html.href,
      fields: featureData.fields
    };
  }

  /**
   * Sync user stories as ADO User Stories
   */
  private async syncUserStories(
    featureId: number,
    spec: SpecContent
  ): Promise<{ created: string[]; updated: string[]; deleted: string[] }> {
    const created: string[] = [];
    const updated: string[] = [];
    const deleted: string[] = [];

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

      let storyId: number;
      if (existingStory) {
        const resolvedStoryType = await this.resolveWorkItemType('User Story');
        const canonicalState = us.status === 'done' ? 'Closed' : us.status === 'in-progress' ? 'Active' : 'New';
        const resolvedState = await this.resolveWorkItemState(resolvedStoryType, canonicalState);
        // UPDATE existing story (also re-apply parent to fix orphaned stories)
        await this.updateStory(existingStory.id, {
          title: storyTitle,
          description: storyDescription,
          state: resolvedState,
          parentId: featureId
        });

        storyId = existingStory.id;
        updated.push(us.id);
        console.log(`   ✅ Updated ${us.id}`);
      } else {
        // CREATE new story
        const newStory = await this.createStory({
          title: storyTitle,
          description: storyDescription,
          parentId: featureId,
          tags: [`user-story`, `spec:${spec.metadata.id}`, `priority:${us.priority}`].join('; '),
          priority: us.priority
        });

        storyId = newStory.id;
        created.push(us.id);
        console.log(`   ✅ Created ${us.id} → User Story #${newStory.id}`);
      }

      // Write ADO work item ID back to living doc US file frontmatter
      await this.writeAdoIdToUSFile(spec.metadata.id, us.id, storyId);
    }

    // Auto-close parent Epic when all user stories are done
    const allDone = spec.metadata.userStories.every(us => us.status === 'done');
    if (allDone && spec.metadata.userStories.length > 0 && created.length === 0) {
      try {
        const epicType = await this.resolveWorkItemType('Feature');
        const epicClosedState = await this.resolveWorkItemState(epicType, 'Closed');
        await this.client.patch(`/wit/workitems/${featureId}?api-version=7.0`, [
          { op: 'replace', path: '/fields/System.State', value: epicClosedState }
        ], { headers: { 'Content-Type': 'application/json-patch+json' } });
        console.log(`   ✅ All stories done — closed parent Epic #${featureId} (state: ${epicClosedState})`);
      } catch {
        // Non-blocking — state transition may not be valid for all ADO project configs
      }
    }

    return { created, updated, deleted };
  }

  /**
   * Write ADO work item ID back to living doc US file frontmatter.
   */
  private async writeAdoIdToUSFile(featureId: string, usId: string, workItemId: number): Promise<void> {
    try {
      const specsRoot = path.join(this.projectRoot, '.specweave/docs/internal/specs');
      if (!existsSync(specsRoot)) return;

      for (const proj of await fsPromises.readdir(specsRoot)) {
        const featureDir = path.join(specsRoot, proj, featureId);
        if (!existsSync(featureDir)) continue;

        for (const file of await fsPromises.readdir(featureDir)) {
          if (!file.startsWith('us-') || !file.endsWith('.md')) continue;
          const filePath = path.join(featureDir, file);
          const content = await fsPromises.readFile(filePath, 'utf-8');
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (!fmMatch) continue;

          const frontmatter = yaml.parse(fmMatch[1]);
          if (frontmatter.id !== usId) continue;

          // Already has the ID - skip
          if (frontmatter.external_tools?.ado?.id === workItemId) return;

          // Update external_tools.ado.id
          if (!frontmatter.external_tools) frontmatter.external_tools = {};
          if (!frontmatter.external_tools.ado) frontmatter.external_tools.ado = {};
          frontmatter.external_tools.ado.id = workItemId;

          const newFm = yaml.stringify(frontmatter).trimEnd();
          const rest = content.slice(fmMatch[0].length);
          await fsPromises.writeFile(filePath, `---\n${newFm}\n---${rest}`, 'utf-8');
          console.log(`      📝 Saved ADO ID #${workItemId} to ${file}`);
          return;
        }
      }
    } catch { /* non-blocking */ }
  }

  /**
   * Generate feature description from spec
   */
  private generateFeatureDescription(spec: SpecContent): string {
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
`.trim();
  }

  /**
   * Generate story description from user story
   */
  private generateStoryDescription(us: UserStory): string {
    const acList = us.acceptanceCriteria
      .map(ac => `<li>${ac.status === 'done' ? '☑' : '☐'} ${ac.id}: ${ac.description}</li>`)
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
`.trim();
  }

  /**
   * Detect conflicts between spec and ADO
   */
  private async detectConflicts(
    spec: SpecContent,
    feature: AdoFeature
  ): Promise<SpecSyncConflict[]> {
    const conflicts: SpecSyncConflict[] = [];

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
  private async resolveConflicts(
    spec: SpecContent,
    conflicts: SpecSyncConflict[]
  ): Promise<void> {
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
  private async fetchAdoFeature(featureId: number): Promise<AdoFeature> {
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
  private async findStoryByTitle(usId: string): Promise<AdoUserStory | null> {
    // Use the resolved type ('Issue' for Basic process, 'User Story' for Agile) so the
    // WIQL query matches exactly what createStory() created — prevents duplicate creation.
    const resolvedType = await this.resolveWorkItemType('User Story');
    const wiql = `
      SELECT [System.Id], [System.Title], [System.Description], [System.State]
      FROM WorkItems
      WHERE [System.TeamProject] = '${this.config.project}'
        AND [System.WorkItemType] = '${resolvedType}'
        AND [System.Title] CONTAINS '[${usId}]'
    `;

    const response = await this.client.post('/wit/wiql?api-version=7.0', {
      query: wiql
    }, {
      headers: { 'Content-Type': 'application/json' }
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
  private async createStory(story: {
    title: string;
    description: string;
    parentId: number;
    tags: string;
    priority?: string;
    type?: string;
  }): Promise<AdoUserStory> {
    // Determine work item type (supports Bug for bug-type stories)
    const mappedType = this.mapTypeToAdo(story.type, 'User Story');
    const workItemType = await this.resolveWorkItemType(mappedType);

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
        value: workItemType
      },
      {
        op: 'add',
        path: '/fields/System.Tags',
        value: story.tags
      },
      {
        // Set native ADO Priority field
        op: 'add',
        path: '/fields/Microsoft.VSTS.Common.Priority',
        value: this.mapPriorityToAdo(story.priority)
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

    const encodedType = encodeURIComponent(workItemType);
    const response = await this.client.post(`/wit/workitems/$${encodedType}?api-version=7.0`, payload, {
      headers: { 'Content-Type': 'application/json-patch+json' }
    });
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
  private async updateStory(
    storyId: number,
    updates: { title?: string; description?: string; state?: string; parentId?: number }
  ): Promise<void> {
    const payload: any[] = [];

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

    if (payload.length > 0) {
      await this.client.patch(`/wit/workitems/${storyId}?api-version=7.0`, payload, {
        headers: { 'Content-Type': 'application/json-patch+json' }
      });
    }

    // Re-apply parent link separately — ADO rejects adding a duplicate relation,
    // so we catch that error and continue (parent is already set, which is correct).
    if (updates.parentId) {
      try {
        await this.client.patch(`/wit/workitems/${storyId}?api-version=7.0`, [
          {
            op: 'add',
            path: '/relations/-',
            value: {
              rel: 'System.LinkTypes.Hierarchy-Reverse',
              url: `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis/wit/workitems/${updates.parentId}`,
              attributes: { name: 'Parent' }
            }
          }
        ], {
          headers: { 'Content-Type': 'application/json-patch+json' }
        });
      } catch {
        // Duplicate relation — parent already set, ignore
      }
    }
  }

  /**
   * Map SpecWeave priority to ADO priority value
   *
   * ADO Priority field uses 1-4 scale:
   * - 1 = Highest (P0)
   * - 2 = High (P1)
   * - 3 = Medium (P2)
   * - 4 = Low (P3)
   */
  private mapPriorityToAdo(priority?: string): number {
    if (!priority) return 3; // Default to Medium

    const map: Record<string, number> = {
      P0: 1,
      P1: 2,
      P2: 3,
      P3: 4,
      p0: 1,
      p1: 2,
      p2: 3,
      p3: 4
    };

    return map[priority] || 3;
  }

  /**
   * Map SpecWeave type to ADO work item type
   *
   * Supports: Feature, User Story, Bug, Task
   */
  private mapTypeToAdo(type?: string, defaultType: string = 'Feature'): string {
    if (!type) return defaultType;

    const normalizedType = type.toLowerCase();

    const map: Record<string, string> = {
      bug: 'Bug',
      feature: 'Feature',
      epic: 'Feature',
      story: 'User Story',
      task: 'Task',
      enhancement: 'Feature'
    };

    return map[normalizedType] || defaultType;
  }
}
