/**
 * Claude Code LSP Settings Auto-Configuration
 *
 * Automatically configures LSP servers in .claude/settings.json during
 * `specweave init` and `specweave update`.
 *
 * This removes the need for users to manually set ENABLE_LSP_TOOL=1 or
 * configure LSP servers - it's all done automatically based on detected
 * project tech stack.
 */

import * as fs from '../../../utils/fs-native.js';
import * as path from 'path';

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
 * Ensure .claude/settings.json exists and has lspServers configured
 *
 * Called during `specweave init` to set up LSP automatically.
 */
export async function ensureClaudeSettingsWithLsp(projectDir: string): Promise<void> {
  const claudeDir = path.join(projectDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  // Ensure .claude directory exists
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // Read existing settings or create new
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      // Invalid JSON, start fresh but preserve the file
      settings = {};
    }
  }

  // Don't overwrite existing lspServers configuration
  if (settings.lspServers) {
    return;
  }

  // Detect tech stack
  const techStack = detectTechStack(projectDir);

  // Build LSP configuration
  const lspServers = buildLspServersConfig(techStack);

  // Merge with existing settings
  settings.lspServers = lspServers;

  // Write back
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

/**
 * Ensure LSP settings exist during `specweave update`
 *
 * Adds lspServers if missing, preserves existing configuration.
 */
export async function ensureLspSettingsOnUpdate(projectDir: string): Promise<void> {
  // Same logic as init - only adds if missing
  await ensureClaudeSettingsWithLsp(projectDir);
}
