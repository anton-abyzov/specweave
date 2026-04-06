import * as fs from 'fs';
import * as path from 'path';

const HTTP_EVENTS = [
  'PreToolUse', 'UserPromptSubmit',
] as const;

/** Stale hook keys from previous versions that must be actively removed */
const STALE_HOOK_KEYS = [
  'PostToolUse', 'Stop', 'SubagentStop', 'TaskCompleted',
  'PostToolUseFailure', 'PermissionRequest',
  'SessionStart', 'SessionEnd', 'Notification', 'SubagentStart',
  'ConfigChange', 'PreCompact', 'TeammateIdle',
] as const;

export interface GenerateSettingsOptions {
  projectRoot: string;
  port?: number;
}

export function getHttpMode(config: Record<string, unknown>): boolean {
  const hooks = config?.hooks as Record<string, unknown> | undefined;
  return hooks?.httpMode === true;
}

export function generateHooksSettings(options: GenerateSettingsOptions): Record<string, unknown> {
  const { projectRoot, port = 8340 } = options;

  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    // No config file
  }

  if (!getHttpMode(config)) {
    return {};
  }

  const configPort = (config?.hooks as Record<string, unknown>)?.port as number ?? port;
  // Resolve bridge path relative to this module's location (works in both src/ and dist/)
  const bridgePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'command-bridge.mjs');

  const hooks: Record<string, unknown[]> = {};

  // Only PreToolUse and UserPromptSubmit remain as HTTP hooks
  for (const event of HTTP_EVENTS) {
    hooks[event] = [{
      type: 'http',
      url: `http://localhost:${configPort}/api/hooks/${event}`,
    }];
  }

  return { hooks };
}

export function writeSettings(projectRoot: string, port?: number): void {
  const settings = generateHooksSettings({ projectRoot, port });
  if (Object.keys(settings).length === 0) {
    return;
  }

  const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
  const settingsDir = path.dirname(settingsPath);
  fs.mkdirSync(settingsDir, { recursive: true });

  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch {
    // No existing settings
  }

  // Deep-merge hooks to preserve user-defined hook configurations
  const existingHooks = (existing.hooks ?? {}) as Record<string, unknown>;
  const newHooks = (settings.hooks ?? {}) as Record<string, unknown>;
  const mergedHooks = { ...existingHooks, ...newHooks };

  // Actively remove stale hook keys from previous versions
  for (const staleKey of STALE_HOOK_KEYS) {
    delete mergedHooks[staleKey];
  }

  const merged = { ...existing, hooks: mergedHooks };
  fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2) + '\n');
}
