/**
 * Environment File Utilities
 *
 * Parse, update, and validate .env files
 *
 * @module utils/env-file
 */

import * as fs from 'fs';
import * as path from 'path';

export interface EnvVariable {
  key: string;
  value: string;
}

/**
 * Parse .env file content into key-value pairs
 *
 * @param content - Content of .env file
 * @returns Record of key-value pairs
 */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex > 0) {
      const key = trimmed.substring(0, equalsIndex).trim();
      const value = trimmed.substring(equalsIndex + 1).trim();

      // Remove quotes if present
      const unquotedValue = value.replace(/^["']|["']$/g, '');
      result[key] = unquotedValue;
    }
  }

  return result;
}

/**
 * Update or add environment variable in .env content
 *
 * @param envContent - Current .env file content
 * @param key - Environment variable key
 * @param value - Environment variable value
 * @returns Updated .env content
 */
export function updateEnvVar(envContent: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(envContent)) {
    // Update existing variable
    return envContent.replace(regex, `${key}=${value}`);
  } else {
    // Add new variable (append)
    const trimmed = envContent.trim();
    return trimmed ? `${trimmed}\n${key}=${value}\n` : `${key}=${value}\n`;
  }
}

/**
 * Update multiple environment variables
 *
 * @param envContent - Current .env file content
 * @param vars - Array of environment variables to update
 * @returns Updated .env content
 */
export function updateEnvVars(
  envContent: string,
  vars: EnvVariable[]
): string {
  let result = envContent;

  for (const { key, value } of vars) {
    result = updateEnvVar(result, key, value);
  }

  return result;
}

/**
 * Read .env file from project directory
 *
 * @param projectPath - Path to project root
 * @returns Content of .env file, or empty string if not found
 */
export function readEnvFile(projectPath: string): string {
  const envPath = path.join(projectPath, '.env');

  if (fs.existsSync(envPath)) {
    return fs.readFileSync(envPath, 'utf-8');
  }

  return '';
}

/**
 * Write .env file to project directory
 *
 * @param projectPath - Path to project root
 * @param content - Content to write
 */
export function writeEnvFile(projectPath: string, content: string): void {
  const envPath = path.join(projectPath, '.env');
  fs.writeFileSync(envPath, content, 'utf-8');

  // Set user-only read/write permissions (0o600) for security
  // This prevents other users on the system from reading sensitive credentials
  try {
    fs.chmodSync(envPath, 0o600);
  } catch (error) {
    // Non-critical error - log but continue (Windows doesn't support chmod)
    if (process.env.DEBUG) {
      console.error(`Warning: Could not set .env permissions: ${error}`);
    }
  }
}

/**
 * Create .env file from .env.example template
 *
 * @param projectPath - Path to project root
 * @returns Content of .env file (from template or empty)
 */
export function createEnvFromTemplate(projectPath: string): string {
  const envExamplePath = path.join(projectPath, '.env.example');

  if (fs.existsSync(envExamplePath)) {
    return fs.readFileSync(envExamplePath, 'utf-8');
  }

  return '';
}

/**
 * Verify .env is in .gitignore
 *
 * @param projectPath - Path to project root
 * @returns True if .env is gitignored, false otherwise
 */
export function isEnvGitignored(projectPath: string): boolean {
  const gitignorePath = path.join(projectPath, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return false;
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  return gitignoreContent.includes('.env');
}

/**
 * Add .env to .gitignore if not already present
 *
 * @param projectPath - Path to project root
 */
export function ensureEnvGitignored(projectPath: string): void {
  const gitignorePath = path.join(projectPath, '.gitignore');

  if (!isEnvGitignored(projectPath)) {
    // Append .env to .gitignore
    const existingContent = fs.existsSync(gitignorePath)
      ? fs.readFileSync(gitignorePath, 'utf-8')
      : '';

    const updatedContent = existingContent.trim()
      ? `${existingContent}\n.env\n`
      : '.env\n';

    fs.writeFileSync(gitignorePath, updatedContent, 'utf-8');
  }
}

/**
 * Validate required environment variables are present
 *
 * @param envContent - Content of .env file
 * @param requiredKeys - Array of required keys
 * @returns Object with validation result and missing keys
 */
export function validateEnvVars(
  envContent: string,
  requiredKeys: string[]
): { valid: boolean; missing: string[] } {
  const parsed = parseEnvFile(envContent);
  const missing: string[] = [];

  for (const key of requiredKeys) {
    if (!parsed[key] || parsed[key].trim() === '') {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Check if .env file exists in project
 *
 * @param projectPath - Path to project root
 * @returns True if .env exists, false otherwise
 */
export function envFileExists(projectPath: string): boolean {
  const envPath = path.join(projectPath, '.env');
  return fs.existsSync(envPath);
}
