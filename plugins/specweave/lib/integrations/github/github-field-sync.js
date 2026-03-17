const DEFAULT_STATUS_MAPPING = {
  "planned": "Todo",
  "in-progress": "In Progress",
  "completed": "Done"
};
const DEFAULT_PRIORITY_MAPPING = {
  "P1": "Urgent",
  "P2": "High",
  "P3": "Medium",
  "P4": "Low"
};
class GitHubFieldSync {
  constructor(client, config) {
    this.fieldsLoaded = false;
    this.client = client;
    this.config = config;
  }
  /**
   * Load project fields and cache field IDs and option IDs.
   */
  async loadFields() {
    if (this.fieldsLoaded) return;
    const fields = await this.client.getProjectFields(this.config.projectId);
    for (const field of fields) {
      if (field.name === "Status" && field.options) {
        this.statusField = {
          id: field.id,
          name: field.name,
          options: new Map(field.options.map((o) => [o.name, o.id]))
        };
      } else if (field.name === "Priority" && field.options) {
        this.priorityField = {
          id: field.id,
          name: field.name,
          options: new Map(field.options.map((o) => [o.name, o.id]))
        };
      }
    }
    this.fieldsLoaded = true;
  }
  /**
   * Sync fields for one or more items.
   * Auto-calls loadFields if not called yet.
   */
  async syncItemFields(items) {
    if (!this.fieldsLoaded) {
      await this.loadFields();
    }
    const result = { updated: [], warnings: [] };
    for (const item of items) {
      if (item.status !== void 0) {
        await this.syncField(
          item,
          "Status",
          item.status,
          this.statusField,
          this.config.statusFieldMapping ?? DEFAULT_STATUS_MAPPING,
          result
        );
      }
      if (item.priority !== void 0) {
        await this.syncField(
          item,
          "Priority",
          item.priority,
          this.priorityField,
          this.config.priorityFieldMapping ?? DEFAULT_PRIORITY_MAPPING,
          result
        );
      }
    }
    return result;
  }
  async syncField(item, fieldName, value, cachedField, mapping, result) {
    if (!cachedField) {
      result.warnings.push({
        itemId: item.itemId,
        field: fieldName,
        message: `${fieldName} field not found on project`
      });
      return;
    }
    const mappedValue = mapping[value];
    if (!mappedValue) {
      result.warnings.push({
        itemId: item.itemId,
        field: fieldName,
        message: `No mapping found for ${fieldName} value "${value}"`
      });
      return;
    }
    const optionId = cachedField.options.get(mappedValue);
    if (!optionId) {
      result.warnings.push({
        itemId: item.itemId,
        field: fieldName,
        message: `Option "${mappedValue}" not found on ${fieldName} field`
      });
      return;
    }
    await this.client.updateItemFieldValue(
      this.config.projectId,
      item.itemId,
      cachedField.id,
      { singleSelectOptionId: optionId }
    );
    result.updated.push({
      itemId: item.itemId,
      field: fieldName,
      value: mappedValue
    });
  }
}
export {
  GitHubFieldSync
};
