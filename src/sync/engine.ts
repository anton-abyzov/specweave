/**
 * SyncEngine — Unified sync orchestrator
 *
 * ADR-0234: Single SyncEngine replaces 17+ scattered modules.
 * ADR-0235: ProviderAdapter interface for clean provider separation.
 *
 * Entry points: push(), pull(), reconcile()
 * Each provider (GitHub, JIRA, ADO) implements ProviderAdapter.
 */

import { type Platform, type PlatformSuffix } from './types.js';
import { type SyncPermissions } from './config.js';

// ---------------------------------------------------------------------------
// External Reference
// ---------------------------------------------------------------------------

export interface ExternalRef {
  platform: Platform;
  id: string;
  url: string;
  userStory: string;
}

// ---------------------------------------------------------------------------
// Data types for sync operations
// ---------------------------------------------------------------------------

export interface UserStoryData {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  acceptanceCriteria?: string[];
}

export interface FeatureData {
  id: string;
  title: string;
}

export interface FieldChanges {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  labels?: Label[];
}

export interface ExternalChange {
  type: 'status_change' | 'field_update' | 'comment' | 'created' | 'closed';
  ref: ExternalRef;
  data: Record<string, unknown>;
}

export interface ItemState {
  status: string;
  labels: string[];
  title: string;
  [key: string]: unknown;
}

export interface ExpectedState {
  ref: ExternalRef;
  expected: Partial<ItemState>;
}

export interface Label {
  name: string;
  color: string;
  description?: string;
}

export interface DetectedHierarchy {
  pattern: 'flat' | 'standard' | 'safe' | 'custom';
  levels: HierarchyLevel[];
}

export interface HierarchyLevel {
  externalType: string;
  specweaveMapping: 'feature' | 'user-story' | 'task' | 'skip';
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface SyncResult {
  ref: ExternalRef;
  action: 'created' | 'updated' | 'closed';
}

export interface PullResult {
  changes: ExternalChange[];
  platform: Platform;
}

export interface ReconcileResult {
  created: number;
  updated: number;
  closed: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// ProviderAdapter interface
// ---------------------------------------------------------------------------

export interface ProviderAdapter {
  readonly platform: Platform;
  readonly suffix: PlatformSuffix;

  testConnection(): Promise<{ ok: boolean; error?: string }>;

  createIssue(story: UserStoryData, feature: FeatureData): Promise<ExternalRef>;
  updateIssue(ref: ExternalRef, changes: FieldChanges): Promise<void>;
  closeIssue(ref: ExternalRef, comment?: string): Promise<void>;
  reopenIssue(ref: ExternalRef): Promise<void>;

  pullChanges(since?: Date): Promise<ExternalChange[]>;
  getIssueState(ref: ExternalRef): Promise<ItemState>;

  applyLabels(ref: ExternalRef, labels: Label[]): Promise<void>;

  detectHierarchy(): Promise<DetectedHierarchy>;
  reconcile(items: ExpectedState[]): Promise<ReconcileResult>;

  generateLabels(config: LabelConfig): Label[];
}

// ---------------------------------------------------------------------------
// Label generation
// ---------------------------------------------------------------------------

export interface LabelConfig {
  priority: string;
  type: string;
  projectName: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'b60205', // red
  P1: 'd93f0b', // orange-red
  P2: 'fbca04', // yellow
  P3: '0e8a16', // green
};

const TYPE_COLORS: Record<string, string> = {
  'user-story': 'e4e669',
  task: 'bfdadc',
  feature: '5319e7',
  bug: 'd73a4a',
};

/**
 * Generate standardized labels for an issue.
 * Replaces the old system that labeled everything "critical".
 */
export function generateLabels(config: LabelConfig): Label[] {
  const labels: Label[] = [];

  // Priority label
  labels.push({
    name: `priority:${config.priority}`,
    color: PRIORITY_COLORS[config.priority] || 'c5def5',
  });

  // Type label
  labels.push({
    name: `type:${config.type}`,
    color: TYPE_COLORS[config.type] || 'c5def5',
  });

  // Project label (single format, no duplicates)
  labels.push({
    name: `project:${config.projectName}`,
    color: '0075ca',
  });

  return labels;
}

// ---------------------------------------------------------------------------
// SyncEngine
// ---------------------------------------------------------------------------

export interface SyncEngineConfig {
  permissions: SyncPermissions;
}

interface PushRequest {
  userStory: UserStoryData;
  feature: FeatureData;
}

export class SyncEngine {
  private providers = new Map<Platform, ProviderAdapter>();
  private permissions: SyncPermissions;

  constructor(config: SyncEngineConfig) {
    this.permissions = config.permissions;
  }

  registerProvider(adapter: ProviderAdapter): void {
    this.providers.set(adapter.platform, adapter);
  }

  getProvider(platform: Platform): ProviderAdapter | undefined {
    return this.providers.get(platform);
  }

  getRegisteredPlatforms(): Platform[] {
    return [...this.providers.keys()];
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  async testConnection(platform: Platform): Promise<{ ok: boolean; error?: string }> {
    const adapter = this.requireProvider(platform);
    return adapter.testConnection();
  }

  // -------------------------------------------------------------------------
  // Push (SpecWeave → External)
  // -------------------------------------------------------------------------

  async push(platform: Platform, request: PushRequest): Promise<SyncResult> {
    this.requirePermission('canUpsert', 'push');
    const adapter = this.requireProvider(platform);

    const ref = await adapter.createIssue(request.userStory, request.feature);
    return { ref, action: 'created' };
  }

  // -------------------------------------------------------------------------
  // Pull (External → SpecWeave)
  // -------------------------------------------------------------------------

  async pull(platform: Platform, since?: Date): Promise<PullResult> {
    this.requirePermission('canRead', 'pull');
    const adapter = this.requireProvider(platform);

    const changes = await adapter.pullChanges(since);
    return { changes, platform };
  }

  // -------------------------------------------------------------------------
  // Update & Close
  // -------------------------------------------------------------------------

  async updateIssue(ref: ExternalRef, changes: FieldChanges): Promise<void> {
    this.requirePermission('canUpsert', 'update');
    const adapter = this.requireProvider(ref.platform);
    return adapter.updateIssue(ref, changes);
  }

  async closeIssue(ref: ExternalRef, comment?: string): Promise<void> {
    this.requirePermission('canUpdateStatus', 'close');
    const adapter = this.requireProvider(ref.platform);
    return adapter.closeIssue(ref, comment);
  }

  // -------------------------------------------------------------------------
  // Reconcile
  // -------------------------------------------------------------------------

  async reconcile(platform: Platform, items: ExpectedState[]): Promise<ReconcileResult> {
    this.requirePermission('canUpdateStatus', 'reconcile');
    const adapter = this.requireProvider(platform);
    return adapter.reconcile(items);
  }

  // -------------------------------------------------------------------------
  // Hierarchy detection
  // -------------------------------------------------------------------------

  async detectHierarchy(platform: Platform): Promise<DetectedHierarchy> {
    this.requirePermission('canRead', 'detectHierarchy');
    const adapter = this.requireProvider(platform);
    return adapter.detectHierarchy();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private requireProvider(platform: Platform): ProviderAdapter {
    const adapter = this.providers.get(platform);
    if (!adapter) {
      throw new Error(`Provider "${platform}" is not registered. Register it with engine.registerProvider().`);
    }
    return adapter;
  }

  private requirePermission(key: keyof SyncPermissions, operation: string): void {
    if (!this.permissions[key]) {
      throw new Error(`Permission denied: "${key}" is required for ${operation} operation. Check your sync preset/permissions.`);
    }
  }
}
