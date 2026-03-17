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
class JiraPermissionGate {
  constructor(settings, configPath) {
    this.settings = settings;
    this.configPath = configPath;
  }
  /**
   * Check if write operations (create/update issues) are allowed
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
      reason: "Permission denied: JIRA updates are disabled.",
      suggestedAction: `Enable sync.settings.canUpdateExternalItems in ${this.configPath}`,
      settingPath: "sync.settings.canUpdateExternalItems"
    };
  }
  /**
   * Check if status updates (transitions) are allowed
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
      reason: "Permission denied: JIRA status transitions are disabled.",
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
   * Check if close operation is allowed (requires both write AND status)
   *
   * Requires: canUpdateExternalItems = true AND canUpdateStatus = true
   */
  checkClosePermission() {
    const writeCheck = this.checkWritePermission();
    const statusCheck = this.checkStatusPermission();
    if (writeCheck.allowed && statusCheck.allowed) {
      return {
        allowed: true,
        reason: "Close operations permitted (canUpdateExternalItems=true, canUpdateStatus=true)"
      };
    }
    const missingPermissions = [];
    if (!writeCheck.allowed) {
      missingPermissions.push("canUpdateExternalItems");
    }
    if (!statusCheck.allowed) {
      missingPermissions.push("canUpdateStatus");
    }
    return {
      allowed: false,
      reason: `Permission denied: Closing JIRA issues requires ${missingPermissions.join(" and ")}.`,
      suggestedAction: `Enable ${missingPermissions.map((p) => `sync.settings.${p}`).join(" and ")} in ${this.configPath}`,
      settingPath: missingPermissions.map((p) => `sync.settings.${p}`).join(", ")
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
      parts.push("create/update JIRA issues");
    }
    if (this.settings.canUpdateStatus) {
      parts.push("transition issue status");
    }
    if (this.settings.canUpsertInternalItems) {
      parts.push("create internal items");
    }
    if (parts.length === 0) {
      return "All JIRA write operations disabled (read-only mode)";
    }
    return `Allowed: ${parts.join(", ")}`;
  }
}
async function createJiraPermissionGate(projectRoot = process.cwd()) {
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
    return new JiraPermissionGate(settings, configPath);
  } catch {
    return new JiraPermissionGate(DEFAULT_SYNC_SETTINGS, configPath);
  }
}
async function canWriteToJira(projectRoot = process.cwd()) {
  const gate = await createJiraPermissionGate(projectRoot);
  return gate.checkWritePermission();
}
async function canUpdateJiraStatus(projectRoot = process.cwd()) {
  const gate = await createJiraPermissionGate(projectRoot);
  return gate.checkStatusPermission();
}
async function canCloseJiraIssue(projectRoot = process.cwd()) {
  const gate = await createJiraPermissionGate(projectRoot);
  return gate.checkClosePermission();
}
var jira_permission_gate_default = JiraPermissionGate;
export {
  DEFAULT_SYNC_SETTINGS,
  JiraPermissionGate,
  canCloseJiraIssue,
  canUpdateJiraStatus,
  canWriteToJira,
  createJiraPermissionGate,
  jira_permission_gate_default as default
};
