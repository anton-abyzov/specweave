/**
 * Shell Auto-Detection for Cross-Platform Support
 *
 * Detects available shells and selects the best one for installation scripts.
 * Priority: Bash (preferred) > PowerShell > cmd (Windows fallback)
 *
 * Environment variable override: SPECWEAVE_SHELL=bash|powershell|cmd
 *
 * @module core/lazy-loading/shell-detector
 */

import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';

/** Supported shell types */
export type ShellType = 'bash' | 'powershell' | 'cmd';

/** Shell detection result */
export interface ShellInfo {
  type: ShellType;
  path: string;
  version?: string;
  isOverride: boolean;
}

/** Shell detection options */
export interface DetectionOptions {
  /** Force specific shell (overrides auto-detection) */
  forceShell?: ShellType;
  /** Skip version detection (faster) */
  skipVersion?: boolean;
}

/**
 * Environment variable for shell override
 */
export const SHELL_OVERRIDE_ENV = 'SPECWEAVE_SHELL';

/**
 * Check if a command exists
 */
function commandExists(command: string): boolean {
  try {
    if (os.platform() === 'win32') {
      execSync(`where ${command}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${command}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get shell version
 */
function getShellVersion(shell: ShellType): string | undefined {
  try {
    switch (shell) {
      case 'bash': {
        const output = execSync('bash --version', { encoding: 'utf-8' });
        const match = output.match(/version (\d+\.\d+(\.\d+)?)/);
        return match?.[1];
      }
      case 'powershell': {
        // Try pwsh first (PowerShell Core), then powershell (Windows PowerShell)
        try {
          const output = execSync('pwsh --version', { encoding: 'utf-8' });
          return output.trim().replace('PowerShell ', '');
        } catch {
          const output = execSync('powershell -Command "$PSVersionTable.PSVersion.ToString()"', {
            encoding: 'utf-8',
          });
          return output.trim();
        }
      }
      case 'cmd':
        // cmd doesn't have a meaningful version
        return undefined;
    }
  } catch {
    return undefined;
  }
}

/**
 * Get shell executable path
 */
function getShellPath(shell: ShellType): string {
  const platform = os.platform();

  switch (shell) {
    case 'bash':
      if (platform === 'win32') {
        // Git Bash locations
        const gitBashPaths = [
          'C:\\Program Files\\Git\\bin\\bash.exe',
          'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
          path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Git', 'bin', 'bash.exe'),
        ];
        for (const p of gitBashPaths) {
          try {
            execSync(`"${p}" --version`, { stdio: 'ignore' });
            return p;
          } catch {
            continue;
          }
        }
        // WSL bash
        if (commandExists('wsl')) {
          return 'wsl bash';
        }
      }
      return '/bin/bash';

    case 'powershell':
      // Prefer pwsh (PowerShell Core) over powershell (Windows PowerShell)
      if (commandExists('pwsh')) {
        return 'pwsh';
      }
      return platform === 'win32' ? 'powershell' : 'pwsh';

    case 'cmd':
      return 'cmd.exe';
  }
}

/**
 * Detect available shells on the system
 */
export function detectAvailableShells(): ShellType[] {
  const available: ShellType[] = [];

  // Check bash
  if (commandExists('bash')) {
    available.push('bash');
  }

  // Check PowerShell (pwsh for cross-platform, powershell for Windows)
  if (commandExists('pwsh') || (os.platform() === 'win32' && commandExists('powershell'))) {
    available.push('powershell');
  }

  // cmd is always available on Windows
  if (os.platform() === 'win32') {
    available.push('cmd');
  }

  return available;
}

/**
 * Detect the best shell for installation scripts
 *
 * Priority: Environment override > Bash > PowerShell > cmd
 *
 * @param options Detection options
 * @returns Shell information
 */
export function detectShell(options: DetectionOptions = {}): ShellInfo {
  // Check environment variable override
  const envOverride = process.env[SHELL_OVERRIDE_ENV]?.toLowerCase() as ShellType | undefined;

  if (envOverride && ['bash', 'powershell', 'cmd'].includes(envOverride)) {
    return {
      type: envOverride,
      path: getShellPath(envOverride),
      version: options.skipVersion ? undefined : getShellVersion(envOverride),
      isOverride: true,
    };
  }

  // Check forced shell option
  if (options.forceShell) {
    return {
      type: options.forceShell,
      path: getShellPath(options.forceShell),
      version: options.skipVersion ? undefined : getShellVersion(options.forceShell),
      isOverride: true,
    };
  }

  // Auto-detect: Bash preferred, then PowerShell, then cmd
  const available = detectAvailableShells();

  if (available.includes('bash')) {
    return {
      type: 'bash',
      path: getShellPath('bash'),
      version: options.skipVersion ? undefined : getShellVersion('bash'),
      isOverride: false,
    };
  }

  if (available.includes('powershell')) {
    return {
      type: 'powershell',
      path: getShellPath('powershell'),
      version: options.skipVersion ? undefined : getShellVersion('powershell'),
      isOverride: false,
    };
  }

  if (available.includes('cmd')) {
    return {
      type: 'cmd',
      path: getShellPath('cmd'),
      version: undefined,
      isOverride: false,
    };
  }

  // Fallback to bash (will error if not available)
  return {
    type: 'bash',
    path: '/bin/bash',
    version: undefined,
    isOverride: false,
  };
}

/**
 * Get the script file extension for a shell
 */
export function getScriptExtension(shell: ShellType): string {
  switch (shell) {
    case 'bash':
      return '.sh';
    case 'powershell':
      return '.ps1';
    case 'cmd':
      return '.bat';
  }
}

/**
 * Get the script path for installation
 */
export function getInstallScriptPath(shell: ShellType): string {
  const ext = getScriptExtension(shell);
  const scriptName = `install-plugins${ext}`;
  return `scripts/lazy-loading/${scriptName}`;
}

/**
 * Build the command to execute an installation script
 */
export function buildInstallCommand(
  shell: ShellType,
  scriptPath: string,
  args: string[] = []
): string {
  const argsStr = args.join(' ');

  switch (shell) {
    case 'bash':
      return `bash "${scriptPath}" ${argsStr}`.trim();
    case 'powershell':
      // Use -ExecutionPolicy Bypass for scripts
      return `pwsh -ExecutionPolicy Bypass -File "${scriptPath}" ${argsStr}`.trim();
    case 'cmd':
      return `"${scriptPath}" ${argsStr}`.trim();
  }
}

/**
 * Get human-readable shell name
 */
export function getShellDisplayName(shell: ShellType): string {
  switch (shell) {
    case 'bash':
      return 'Bash';
    case 'powershell':
      return 'PowerShell';
    case 'cmd':
      return 'Command Prompt';
  }
}

/**
 * Validate that a shell is available
 */
export function validateShell(shell: ShellType): boolean {
  const available = detectAvailableShells();
  return available.includes(shell);
}

/**
 * Get shell detection summary for logging/display
 */
export function getShellSummary(): string {
  const detected = detectShell();
  const available = detectAvailableShells();

  const lines = [
    `Selected: ${getShellDisplayName(detected.type)}${detected.isOverride ? ' (override)' : ''}`,
    `Path: ${detected.path}`,
  ];

  if (detected.version) {
    lines.push(`Version: ${detected.version}`);
  }

  lines.push(`Available: ${available.map(getShellDisplayName).join(', ')}`);

  if (detected.isOverride) {
    lines.push(`Override: ${SHELL_OVERRIDE_ENV}=${detected.type}`);
  }

  return lines.join('\n');
}
