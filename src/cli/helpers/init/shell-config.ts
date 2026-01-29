/**
 * Cross-platform shell configuration helper
 *
 * Provides utilities for detecting user's shell, finding config files,
 * and safely appending environment variables across macOS, Linux, and Windows.
 *
 * Supported shells:
 * - zsh (macOS default, Linux)
 * - bash (Linux default, macOS legacy)
 * - fish (alternative shell)
 * - PowerShell (Windows)
 *
 * @module shell-config
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Supported shell types
 */
export enum ShellType {
  ZSH = 'zsh',
  BASH = 'bash',
  FISH = 'fish',
  POWERSHELL = 'powershell',
  UNKNOWN = 'unknown',
}

/**
 * Result of setupLspEnvVar operation
 */
export interface ShellConfigResult {
  success: boolean;
  shell: string;
  configPath: string;
  exportSyntax: string;
  alreadyConfigured?: boolean;
  error?: string;
}

/**
 * Detects the user's current shell from the SHELL environment variable
 *
 * @returns Shell type identifier (zsh, bash, fish, powershell, unknown)
 */
export function detectShell(): string {
  const shell = process.env.SHELL || '';

  if (!shell) {
    // On Windows, SHELL may not be set
    if (process.platform === 'win32') {
      return ShellType.POWERSHELL;
    }
    return ShellType.UNKNOWN;
  }

  const shellName = path.basename(shell).toLowerCase();

  switch (shellName) {
    case 'zsh':
      return ShellType.ZSH;
    case 'bash':
      return ShellType.BASH;
    case 'fish':
      return ShellType.FISH;
    case 'pwsh':
    case 'powershell':
      return ShellType.POWERSHELL;
    default:
      return ShellType.UNKNOWN;
  }
}

/**
 * Gets the appropriate shell config file path for the given shell and platform
 *
 * @param shell - Shell type (zsh, bash, fish, powershell, unknown)
 * @param platform - OS platform (darwin, linux, win32)
 * @returns Full path to the shell config file
 */
export function getShellConfigPath(
  shell: string,
  platform: string = process.platform
): string {
  const homeDir = os.homedir();

  if (platform === 'win32') {
    // Windows: Use PowerShell profile
    const documentsPath =
      process.env.USERPROFILE || process.env.HOME || homeDir;
    return path.join(
      documentsPath,
      'Documents',
      'PowerShell',
      'Microsoft.PowerShell_profile.ps1'
    );
  }

  switch (shell) {
    case ShellType.ZSH:
      return path.join(homeDir, '.zshrc');

    case ShellType.BASH:
      // macOS uses .bash_profile for login shells, Linux uses .bashrc
      if (platform === 'darwin') {
        return path.join(homeDir, '.bash_profile');
      }
      return path.join(homeDir, '.bashrc');

    case ShellType.FISH:
      return path.join(homeDir, '.config', 'fish', 'config.fish');

    case ShellType.POWERSHELL:
      const userProfile = process.env.USERPROFILE || homeDir;
      return path.join(
        userProfile,
        'Documents',
        'PowerShell',
        'Microsoft.PowerShell_profile.ps1'
      );

    default:
      // Fallback to POSIX standard .profile
      return path.join(homeDir, '.profile');
  }
}

/**
 * Gets the correct export syntax for the given shell
 *
 * @param shell - Shell type
 * @param varName - Environment variable name
 * @param value - Environment variable value
 * @returns Export command string in the correct syntax
 */
export function getExportSyntax(
  shell: string,
  varName: string,
  value: string
): string {
  switch (shell) {
    case ShellType.FISH:
      return `set -gx ${varName} ${value}`;

    case ShellType.POWERSHELL:
      return `$env:${varName} = "${value}"`;

    case ShellType.ZSH:
    case ShellType.BASH:
    default:
      // POSIX-compliant export syntax
      return `export ${varName}=${value}`;
  }
}

/**
 * Checks if an environment variable is already configured in the given file
 *
 * Detects various syntaxes:
 * - POSIX: export VAR=value, export VAR = value
 * - Fish: set -gx VAR value
 * - PowerShell: $env:VAR = "value"
 *
 * @param configPath - Path to the shell config file
 * @param varName - Environment variable name to check
 * @returns true if the variable is already configured (not commented out)
 */
export function isEnvVarConfigured(configPath: string, varName: string): boolean {
  try {
    if (!fs.existsSync(configPath)) {
      return false;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith('#')) {
        continue;
      }

      // Check for POSIX export syntax: export VAR=value or export VAR = value
      if (
        trimmedLine.match(new RegExp(`^export\\s+${varName}\\s*=`)) ||
        trimmedLine.match(new RegExp(`^export\\s+${varName}\\s*$`))
      ) {
        return true;
      }

      // Check for fish syntax: set -gx VAR value
      if (trimmedLine.match(new RegExp(`^set\\s+(-gx|-Ux)\\s+${varName}\\s`))) {
        return true;
      }

      // Check for PowerShell syntax: $env:VAR = "value"
      if (trimmedLine.match(new RegExp(`^\\$env:${varName}\\s*=`))) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Appends an environment variable export to the shell config file
 *
 * @param configPath - Path to the shell config file
 * @param shell - Shell type for correct syntax
 * @param varName - Environment variable name
 * @param value - Environment variable value
 */
export function appendEnvVarToConfig(
  configPath: string,
  shell: string,
  varName: string,
  value: string
): void {
  // Ensure parent directory exists
  const parentDir = path.dirname(configPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // Get the correct export syntax
  const exportLine = getExportSyntax(shell, varName, value);

  // Build the content to append
  const commentChar = shell === ShellType.POWERSHELL ? '#' : '#';
  const appendContent = `
${commentChar} Added by SpecWeave - Enable LSP support
${exportLine}
`;

  // Check if file exists and get current content
  let currentContent = '';
  if (fs.existsSync(configPath)) {
    currentContent = fs.readFileSync(configPath, 'utf-8');
  }

  // Ensure we start on a new line if file doesn't end with newline
  let prefix = '';
  if (currentContent.length > 0 && !currentContent.endsWith('\n')) {
    prefix = '\n';
  }

  fs.appendFileSync(configPath, prefix + appendContent);
}

/**
 * Main function to set up the ENABLE_LSP_TOOL environment variable
 *
 * Automatically detects the user's shell, finds the config file,
 * checks if already configured, and appends if needed.
 *
 * @returns Result object with success status and details
 */
export function setupLspEnvVar(): ShellConfigResult {
  try {
    const shell = detectShell();
    const configPath = getShellConfigPath(shell, process.platform);
    const exportSyntax = getExportSyntax(shell, 'ENABLE_LSP_TOOL', '1');

    // Check if already configured
    if (isEnvVarConfigured(configPath, 'ENABLE_LSP_TOOL')) {
      return {
        success: true,
        shell,
        configPath,
        exportSyntax,
        alreadyConfigured: true,
      };
    }

    // Append to config file
    appendEnvVarToConfig(configPath, shell, 'ENABLE_LSP_TOOL', '1');

    return {
      success: true,
      shell,
      configPath,
      exportSyntax,
      alreadyConfigured: false,
    };
  } catch (error) {
    const shell = detectShell();
    const configPath = getShellConfigPath(shell, process.platform);
    const exportSyntax = getExportSyntax(shell, 'ENABLE_LSP_TOOL', '1');

    return {
      success: false,
      shell,
      configPath,
      exportSyntax,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
