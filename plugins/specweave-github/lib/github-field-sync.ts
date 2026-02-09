/**
 * GitHub Field Sync — Status and Priority field sync for Projects V2
 *
 * Syncs Status and Priority custom fields on Projects V2 items
 * using configurable field mappings.
 *
 * @module github-field-sync
 */

import type { GitHubGraphQLClient } from './github-graphql-client.js';

export interface FieldSyncConfig {
  projectId: string;
  statusFieldMapping?: Record<string, string>;
  priorityFieldMapping?: Record<string, string>;
}

export interface FieldSyncItem {
  itemId: string;
  status?: string;
  priority?: string;
}

export interface FieldSyncResult {
  updated: Array<{ itemId: string; field: string; value: string }>;
  warnings: Array<{ itemId: string; field: string; message: string }>;
}

interface CachedField {
  id: string;
  name: string;
  options: Map<string, string>; // option name → option ID
}

const DEFAULT_STATUS_MAPPING: Record<string, string> = {
  'planned': 'Todo',
  'in-progress': 'In Progress',
  'completed': 'Done',
};

const DEFAULT_PRIORITY_MAPPING: Record<string, string> = {
  'P1': 'Urgent',
  'P2': 'High',
  'P3': 'Medium',
  'P4': 'Low',
};

export class GitHubFieldSync {
  private client: GitHubGraphQLClient;
  private config: FieldSyncConfig;
  private statusField?: CachedField;
  private priorityField?: CachedField;
  private fieldsLoaded = false;

  constructor(client: GitHubGraphQLClient, config: FieldSyncConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Load project fields and cache field IDs and option IDs.
   */
  async loadFields(): Promise<void> {
    if (this.fieldsLoaded) return;

    const fields = await this.client.getProjectFields(this.config.projectId);

    for (const field of fields) {
      if (field.name === 'Status' && field.options) {
        this.statusField = {
          id: field.id,
          name: field.name,
          options: new Map(field.options.map(o => [o.name, o.id])),
        };
      } else if (field.name === 'Priority' && field.options) {
        this.priorityField = {
          id: field.id,
          name: field.name,
          options: new Map(field.options.map(o => [o.name, o.id])),
        };
      }
    }

    this.fieldsLoaded = true;
  }

  /**
   * Sync fields for one or more items.
   * Auto-calls loadFields if not called yet.
   */
  async syncItemFields(items: FieldSyncItem[]): Promise<FieldSyncResult> {
    if (!this.fieldsLoaded) {
      await this.loadFields();
    }

    const result: FieldSyncResult = { updated: [], warnings: [] };

    for (const item of items) {
      // Sync Status field
      if (item.status !== undefined) {
        await this.syncField(item, 'Status', item.status, this.statusField,
          this.config.statusFieldMapping ?? DEFAULT_STATUS_MAPPING, result);
      }

      // Sync Priority field
      if (item.priority !== undefined) {
        await this.syncField(item, 'Priority', item.priority, this.priorityField,
          this.config.priorityFieldMapping ?? DEFAULT_PRIORITY_MAPPING, result);
      }
    }

    return result;
  }

  private async syncField(
    item: FieldSyncItem,
    fieldName: string,
    value: string,
    cachedField: CachedField | undefined,
    mapping: Record<string, string>,
    result: FieldSyncResult,
  ): Promise<void> {
    if (!cachedField) {
      result.warnings.push({
        itemId: item.itemId,
        field: fieldName,
        message: `${fieldName} field not found on project`,
      });
      return;
    }

    const mappedValue = mapping[value];
    if (!mappedValue) {
      result.warnings.push({
        itemId: item.itemId,
        field: fieldName,
        message: `No mapping found for ${fieldName} value "${value}"`,
      });
      return;
    }

    const optionId = cachedField.options.get(mappedValue);
    if (!optionId) {
      result.warnings.push({
        itemId: item.itemId,
        field: fieldName,
        message: `Option "${mappedValue}" not found on ${fieldName} field`,
      });
      return;
    }

    await this.client.updateItemFieldValue(
      this.config.projectId,
      item.itemId,
      cachedField.id,
      { singleSelectOptionId: optionId },
    );

    result.updated.push({
      itemId: item.itemId,
      field: fieldName,
      value: mappedValue,
    });
  }
}
