/**
 * Startup Checker
 *
 * Lightweight background monitoring that runs on CLI startup with throttling.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { consoleLogger as logger } from '../../utils/logger.js';

/**
 * Performs lightweight cache health checks on startup
 */
export class StartupChecker {
  private static readonly THROTTLE_FILE = path.join(
    os.homedir(),
    '.specweave',
    'state',
    '.cache-check-throttle'
  );
  private static readonly THROTTLE_MS = 60 * 60 * 1000; // 1 hour
  private static readonly PLUGIN_CACHE_BASE = path.join(
    os.homedir(),
    '.claude',
    'plugins',
    'cache',
    'specweave'
  );

  /**
   * Quick startup check (lightweight, <100ms target)
   *
   * Runs local-only checks without GitHub API calls.
   * Fails silently on errors (non-blocking).
   */
  static async quickCheck(): Promise<void> {
    try {
      if (!this.shouldRunCheck()) {
        return;
      }

      const pluginPaths = this.getPluginPaths();
      const issues: string[] = [];

      for (const pluginPath of pluginPaths) {
        const scripts = this.findShellScripts(pluginPath);
        for (const script of scripts) {
          if (this.hasMergeConflict(script)) {
            issues.push(`Merge conflict in ${path.basename(script)}`);
          }
          if (!this.validateBashSyntax(script)) {
            issues.push(`Syntax error in ${path.basename(script)}`);
          }
        }
      }

      this.updateThrottle();

      if (issues.length > 0) {
        console.warn('Plugin cache issues detected. Run: specweave cache-status');
      }
    } catch (error) {
      logger.debug(`Startup check failed (non-critical): ${error}`);
    }
  }

  /**
   * Check if startup check should run (throttle mechanism)
   *
   * @returns True if check should run
   */
  private static shouldRunCheck(): boolean {
    try {
      if (!fs.existsSync(this.THROTTLE_FILE)) {
        return true;
      }

      const lastCheckTime = parseInt(fs.readFileSync(this.THROTTLE_FILE, 'utf8'), 10);
      const elapsed = Date.now() - lastCheckTime;

      return elapsed > this.THROTTLE_MS;
    } catch {
      return true;
    }
  }

  /**
   * Update throttle timestamp
   */
  private static updateThrottle(): void {
    try {
      const stateDir = path.dirname(this.THROTTLE_FILE);
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(this.THROTTLE_FILE, Date.now().toString());
    } catch (error) {
      logger.debug(`Failed to update throttle: ${error}`);
    }
  }

  /**
   * Get all plugin cache paths
   *
   * @returns Array of plugin directory paths
   */
  private static getPluginPaths(): string[] {
    try {
      if (!fs.existsSync(this.PLUGIN_CACHE_BASE)) {
        return [];
      }

      const pluginNames = fs.readdirSync(this.PLUGIN_CACHE_BASE);

      return pluginNames.flatMap((pluginName) => {
        const pluginDir = path.join(this.PLUGIN_CACHE_BASE, pluginName);
        if (!fs.statSync(pluginDir).isDirectory()) {
          return [];
        }

        return fs.readdirSync(pluginDir)
          .map((version) => path.join(pluginDir, version))
          .filter((versionDir) => fs.statSync(versionDir).isDirectory());
      });
    } catch (error) {
      logger.debug(`Failed to get plugin paths: ${error}`);
      return [];
    }
  }

  /**
   * Find all shell scripts in a directory
   *
   * @param dir - Directory to search
   * @returns Array of shell script paths
   */
  private static findShellScripts(dir: string): string[] {
    try {
      const entries = fs.readdirSync(dir, { recursive: true });

      return entries
        .filter((entry): entry is string => typeof entry === 'string' && entry.endsWith('.sh'))
        .map((entry) => path.join(dir, entry))
        .filter((fullPath) => fs.statSync(fullPath).isFile());
    } catch {
      return [];
    }
  }

  /**
   * Check if file contains merge conflict markers
   *
   * @param filePath - Path to file
   * @returns True if merge conflict detected
   */
  private static hasMergeConflict(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return /<{7}|={7}|>{7}/.test(content);
    } catch {
      return false;
    }
  }

  /**
   * Validate bash script syntax
   *
   * @param scriptPath - Path to script
   * @returns True if syntax is valid
   */
  private static validateBashSyntax(scriptPath: string): boolean {
    try {
      execSync(`bash -n "${scriptPath}"`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}
