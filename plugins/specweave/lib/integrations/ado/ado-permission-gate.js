import { promises as fs } from "node:fs";
import * as path from "node:path";
function resolvePresetPermissions(preset) {
  switch (preset) {
    case "bidirectional":
      return { canUpsert: true, canUpdateStatus: true };
    case "push-only":
      return { canUpsert: true, canUpdateStatus: true };
    case "full-control":
      return { canUpsert: true, canUpdateStatus: true };
    case "read-only":
      return { canUpsert: false, canUpdateStatus: false };
    default:
      return { canUpsert: false, canUpdateStatus: false };
  }
}
const DEFAULT_SYNC_SETTINGS = {
  canUpsertInternalItems: false,
  canUpdateExternalItems: false,
  canUpdateStatus: false
};
class AdoPermissionGate {
  constructor(settings, configPath) {
    this.settings = settings;
    this.configPath = configPath;
  }
  /**
   * Check if write operations (create/update work items) are allowed
   *
   * Requires: canUpdateExternalItems = true
   */
  checkWritePermission() {
    if (this.settings.canUpdateExternalItems) {
      return {
        allowed: true,
        reason: "Write operations permitted (canUpdateExternalItems=true)"
      };
    }
    return {
      allowed: false,
      reason: "Permission denied: External tool updates are disabled.",
      suggestedAction: `Enable sync.settings.canUpdateExternalItems in ${this.configPath}`,
      settingPath: "sync.settings.canUpdateExternalItems"
    };
  }
  /**
   * Check if status updates are allowed
   *
   * Requires: canUpdateStatus = true
   */
  checkStatusPermission() {
    if (this.settings.canUpdateStatus) {
      return {
        allowed: true,
        reason: "Status updates permitted (canUpdateStatus=true)"
      };
    }
    return {
      allowed: false,
      reason: "Permission denied: Status updates are disabled.",
      suggestedAction: `Enable sync.settings.canUpdateStatus in ${this.configPath}`,
      settingPath: "sync.settings.canUpdateStatus"
    };
  }
  /**
   * Check if internal item creation is allowed
   *
   * Requires: canUpsertInternalItems = true
   */
  checkCreateInternalPermission() {
    if (this.settings.canUpsertInternalItems) {
      return {
        allowed: true,
        reason: "Internal item creation permitted (canUpsertInternalItems=true)"
      };
    }
    return {
      allowed: false,
      reason: "Permission denied: Creating internal items is disabled.",
      suggestedAction: `Enable sync.settings.canUpsertInternalItems in ${this.configPath}`,
      settingPath: "sync.settings.canUpsertInternalItems"
    };
  }
  /**
   * Get current settings
   */
  getSettings() {
    return { ...this.settings };
  }
  /**
   * Get human-readable permission summary
   */
  getPermissionSummary() {
    const parts = [];
    if (this.settings.canUpdateExternalItems) {
      parts.push("create/update ADO items");
    }
    if (this.settings.canUpdateStatus) {
      parts.push("update status");
    }
    if (this.settings.canUpsertInternalItems) {
      parts.push("create internal items");
    }
    if (parts.length === 0) {
      return "All ADO write operations disabled (read-only mode)";
    }
    return `Allowed: ${parts.join(", ")}`;
  }
}
async function createAdoPermissionGate(projectRoot = process.cwd()) {
  const configPath = path.join(projectRoot, ".specweave", "config.json");
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    const preset = config?.sync?.preset;
    const presetDefaults = resolvePresetPermissions(preset);
    const settings = {
      canUpsertInternalItems: config?.sync?.settings?.canUpsertInternalItems ?? false,
      canUpdateExternalItems: config?.sync?.settings?.canUpdateExternalItems ?? presetDefaults.canUpsert,
      canUpdateStatus: config?.sync?.settings?.canUpdateStatus ?? presetDefaults.canUpdateStatus
    };
    return new AdoPermissionGate(settings, configPath);
  } catch {
    return new AdoPermissionGate(DEFAULT_SYNC_SETTINGS, configPath);
  }
}
async function canWriteToAdo(projectRoot = process.cwd()) {
  const gate = await createAdoPermissionGate(projectRoot);
  return gate.checkWritePermission();
}
async function canUpdateAdoStatus(projectRoot = process.cwd()) {
  const gate = await createAdoPermissionGate(projectRoot);
  return gate.checkStatusPermission();
}
var ado_permission_gate_default = AdoPermissionGate;
export {
  AdoPermissionGate,
  DEFAULT_SYNC_SETTINGS,
  canUpdateAdoStatus,
  canWriteToAdo,
  createAdoPermissionGate,
  ado_permission_gate_default as default
};
