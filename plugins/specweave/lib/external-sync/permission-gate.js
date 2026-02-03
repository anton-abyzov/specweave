import { existsSync, readFileSync } from "fs";
import { join } from "path";
function checkSyncPermissions(projectRoot, toolName) {
  const configPath = join(projectRoot, ".specweave", "config.json");
  const result = {
    canRead: true,
    canWrite: false,
    message: "",
    configPath
  };
  if (!existsSync(configPath)) {
    result.message = `Config not found at ${configPath}`;
    return result;
  }
  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    result.canWrite = config?.sync?.settings?.canUpdateExternalItems ?? false;
    if (!result.canWrite) {
      result.message = formatPermissionDeniedMessage(toolName);
    }
  } catch {
    result.message = `Failed to read config at ${configPath}`;
  }
  return result;
}
function formatPermissionDeniedMessage(toolName) {
  const toolLower = toolName.toLowerCase().replace(/\s+/g, "-");
  return `
\u274C Permission Denied: ${toolName} Write Operations Disabled

Cannot push changes to ${toolName} (sync.settings.canUpdateExternalItems = false).

Options:
1. Enable writes: Set canUpdateExternalItems to true in config.json
   {
     "sync": {
       "settings": {
         "canUpdateExternalItems": true
       }
     }
   }

2. Pull-only mode: /sw-${toolLower}:sync \${incrementId} --direction from-${toolLower}

3. View status: /sw-${toolLower}:status \${incrementId}
`.trim();
}
function isSyncEnabled(projectRoot) {
  const configPath = join(projectRoot, ".specweave", "config.json");
  if (!existsSync(configPath)) {
    return false;
  }
  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    return config?.sync?.enabled !== false;
  } catch {
    return false;
  }
}
export {
  checkSyncPermissions,
  formatPermissionDeniedMessage,
  isSyncEnabled
};
