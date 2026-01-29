/**
 * Claude Code LSP Plugin Auto-Configuration
 *
 * Automatically installs a local LSP plugin during `specweave init` and
 * `specweave update` to enable code intelligence features like:
 * - Go to Definition
 * - Find References
 * - Hover information
 *
 * This creates a local plugin at `.claude/plugins/specweave-lsp/` with
 * proper `.lsp.json` configuration, which is the correct way to enable
 * LSP in Claude Code (not via settings.json directly).
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * LSP Server Configuration
 */
export interface LspServerConfig {
  command: string;
  args: string[];
  extensionToLanguage: Record<string, string>;
}

/**
 * All supported LSP server configurations
 */
const LSP_SERVERS: Record<string, LspServerConfig> = {
  typescript: {
    command: 'typescript-language-server',
    args: ['--stdio'],
    extensionToLanguage: {
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
      '.mjs': 'javascript',
      '.cjs': 'javascript',
    },
  },
  python: {
    command: 'pyright-langserver',
    args: ['--stdio'],
    extensionToLanguage: {
      '.py': 'python',
      '.pyi': 'python',
    },
  },
  go: {
    command: 'gopls',
    args: ['serve'],
    extensionToLanguage: {
      '.go': 'go',
    },
  },
  rust: {
    command: 'rust-analyzer',
    args: [],
    extensionToLanguage: {
      '.rs': 'rust',
    },
  },
  csharp: {
    command: 'omnisharp',
    args: ['-lsp'],
    extensionToLanguage: {
      '.cs': 'csharp',
    },
  },
};

/**
 * Tech stack detection rules
 */
const TECH_DETECTION: Record<string, { files: string[]; patterns: RegExp[] }> = {
  typescript: {
    files: ['tsconfig.json', 'tsconfig.base.json'],
    patterns: [/typescript|@types\/node/i],
  },
  python: {
    files: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    patterns: [/\.py$/],
  },
  go: {
    files: ['go.mod', 'go.sum'],
    patterns: [/\.go$/],
  },
  rust: {
    files: ['Cargo.toml', 'Cargo.lock'],
    patterns: [/\.rs$/],
  },
  csharp: {
    files: ['*.csproj', '*.sln'],
    patterns: [/\.cs$/],
  },
};

/**
 * Get LSP server configuration for a language
 */
export function getLspServerConfig(language: string): LspServerConfig {
  const config = LSP_SERVERS[language];
  if (!config) {
    throw new Error(`Unknown language: ${language}`);
  }
  return config;
}

/**
 * Detect tech stack in a project directory
 */
export function detectTechStack(projectDir: string): string[] {
  const detected: string[] = [];

  for (const [tech, rules] of Object.entries(TECH_DETECTION)) {
    // Check for indicator files
    for (const file of rules.files) {
      if (file.includes('*')) {
        // Glob pattern
        const pattern = file.replace('*', '');
        try {
          const files = fs.readdirSync(projectDir);
          if (files.some((f) => f.endsWith(pattern))) {
            detected.push(tech);
            break;
          }
        } catch {
          // Directory not readable
        }
      } else {
        // Exact file
        if (fs.existsSync(path.join(projectDir, file))) {
          detected.push(tech);
          break;
        }
      }
    }

    // Check package.json for dependencies
    if (tech === 'typescript' && !detected.includes(tech)) {
      const pkgPath = path.join(projectDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          const deps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
          };
          if (deps.typescript || Object.keys(deps).some((k) => k.startsWith('@types/'))) {
            detected.push(tech);
          }
        } catch {
          // Invalid JSON
        }
      }
    }
  }

  return [...new Set(detected)]; // Remove duplicates
}

/**
 * Build lspServers configuration based on detected tech stack
 */
export function buildLspServersConfig(techStack: string[]): Record<string, LspServerConfig> {
  const lspServers: Record<string, LspServerConfig> = {};

  // Map tech to LSP server names
  const techToServer: Record<string, string> = {
    typescript: 'vtsls',
    python: 'pyright',
    go: 'gopls',
    rust: 'rust-analyzer',
    csharp: 'omnisharp',
  };

  for (const tech of techStack) {
    const serverName = techToServer[tech];
    if (serverName && LSP_SERVERS[tech]) {
      lspServers[serverName] = LSP_SERVERS[tech];
    }
  }

  // Always include TypeScript as default if no tech detected
  if (Object.keys(lspServers).length === 0) {
    lspServers.vtsls = LSP_SERVERS.typescript;
  }

  return lspServers;
}

/**
 * Install local LSP plugin to .claude/plugins/specweave-lsp/
 *
 * This is the correct way to enable LSP in Claude Code - via a plugin
 * with .lsp.json, not via settings.json directly.
 */
export async function installLocalLspPlugin(projectDir: string): Promise<boolean> {
  const pluginDir = path.join(projectDir, '.claude', 'plugins', 'specweave-lsp');
  const pluginJsonPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');
  const lspJsonPath = path.join(pluginDir, '.lsp.json');

  // Skip if plugin already exists
  if (fs.existsSync(pluginJsonPath) && fs.existsSync(lspJsonPath)) {
    return false;
  }

  // Detect tech stack
  const techStack = detectTechStack(projectDir);
  const lspServers = buildLspServersConfig(techStack);

  // Create plugin directory structure
  fs.mkdirSync(path.join(pluginDir, '.claude-plugin'), { recursive: true });

  // Write plugin.json
  const pluginJson = {
    name: 'specweave-lsp',
    version: '1.0.0',
    description: 'Auto-configured LSP servers for code intelligence',
    author: {
      name: 'SpecWeave',
      url: 'https://spec-weave.com',
    },
    keywords: ['lsp', 'code-intelligence'],
  };
  fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 2) + '\n');

  // Write .lsp.json with detected servers
  fs.writeFileSync(lspJsonPath, JSON.stringify(lspServers, null, 2) + '\n');

  return true;
}

/**
 * Enable the local LSP plugin in settings.json
 */
export async function enableLspPluginInSettings(projectDir: string): Promise<void> {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');

  // Read existing settings or create new
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  // Ensure .claude directory exists
  fs.mkdirSync(path.join(projectDir, '.claude'), { recursive: true });

  // Add plugin to enabledPlugins if not already there
  const enabledPlugins = (settings.enabledPlugins || {}) as Record<string, boolean>;

  // Enable the local plugin (path-based plugin)
  enabledPlugins['./plugins/specweave-lsp'] = true;

  settings.enabledPlugins = enabledPlugins;

  // Write back
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Ensure LSP is configured during `specweave init`
 *
 * Creates a local LSP plugin and enables it in settings.json.
 */
export async function ensureClaudeSettingsWithLsp(projectDir: string): Promise<void> {
  // Install the local LSP plugin
  const installed = await installLocalLspPlugin(projectDir);

  // Enable it in settings.json
  await enableLspPluginInSettings(projectDir);

  // For backwards compatibility, also add lspServers to settings.json
  // (in case future Claude Code versions support this)
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (!settings.lspServers) {
        const techStack = detectTechStack(projectDir);
        settings.lspServers = buildLspServersConfig(techStack);
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
      }
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Ensure LSP settings exist during `specweave update`
 */
export async function ensureLspSettingsOnUpdate(projectDir: string): Promise<void> {
  await ensureClaudeSettingsWithLsp(projectDir);
}
