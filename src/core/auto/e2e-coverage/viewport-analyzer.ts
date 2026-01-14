/**
 * Viewport Analyzer
 *
 * Parses Playwright config and analyzes viewport coverage.
 *
 * @module core/auto/e2e-coverage/viewport-analyzer
 * @since v1.0.115
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  PlaywrightViewportConfig,
  PlaywrightProject,
  E2ECoverageManifest,
  ViewportsCovered,
} from './types.js';

/**
 * Parse Playwright config to extract viewport/project configuration
 *
 * @param projectPath - Project root path
 * @returns Parsed viewport configuration
 *
 * @example
 * ```typescript
 * const config = parsePlaywrightConfig('/path/to/project');
 * console.log(config.viewports.mobile); // true if mobile viewport configured
 * ```
 */
export function parsePlaywrightConfig(projectPath: string): PlaywrightViewportConfig {
  const projects: PlaywrightProject[] = [];
  const viewports = { mobile: false, tablet: false, desktop: false };

  // Try different config file names
  const configNames = [
    'playwright.config.ts',
    'playwright.config.js',
    'playwright.config.mjs',
  ];

  let configPath: string | undefined;
  let configContent: string | undefined;

  for (const name of configNames) {
    const fullPath = path.join(projectPath, name);
    if (fs.existsSync(fullPath)) {
      configPath = fullPath;
      configContent = fs.readFileSync(fullPath, 'utf-8');
      break;
    }
  }

  if (!configContent) {
    return { projects, viewports };
  }

  // Parse projects array from config
  // Pattern: projects: [ { name: '...', use: { viewport: { width: X, height: Y } } } ]
  const projectPattern = /name:\s*['"`]([^'"`]+)['"`][^}]*viewport:\s*\{[^}]*width:\s*(\d+)/gi;

  let match;
  while ((match = projectPattern.exec(configContent)) !== null) {
    const name = match[1];
    const width = parseInt(match[2], 10);

    // Categorize by width
    let viewport: string;
    if (width <= 480) {
      viewport = 'mobile';
      viewports.mobile = true;
    } else if (width <= 768) {
      viewport = 'tablet';
      viewports.tablet = true;
    } else {
      viewport = 'desktop';
      viewports.desktop = true;
    }

    projects.push({ name, viewport, width });
  }

  // Alternative pattern: devices like 'iPhone 12', 'iPad Pro', etc.
  const devicePattern = /devices\s*\[\s*['"`]([^'"`]+)['"`]\s*\]/gi;
  while ((match = devicePattern.exec(configContent)) !== null) {
    const device = match[1];
    let viewport: string;

    if (/iphone|pixel|android|mobile/i.test(device)) {
      viewport = 'mobile';
      viewports.mobile = true;
    } else if (/ipad|tablet/i.test(device)) {
      viewport = 'tablet';
      viewports.tablet = true;
    } else {
      viewport = 'desktop';
      viewports.desktop = true;
    }

    projects.push({ name: device, viewport });
  }

  // Check for common project names
  const projectNamePattern = /name:\s*['"`](mobile|tablet|desktop|Mobile\s*\w+|Desktop\s*\w+|chromium|webkit|firefox)['"`]/gi;
  while ((match = projectNamePattern.exec(configContent)) !== null) {
    const name = match[1].toLowerCase();

    if (name.includes('mobile') || name === 'webkit') {
      viewports.mobile = true;
      if (!projects.find((p) => p.name.toLowerCase() === name)) {
        projects.push({ name: match[1], viewport: 'mobile' });
      }
    } else if (name.includes('tablet')) {
      viewports.tablet = true;
      if (!projects.find((p) => p.name.toLowerCase() === name)) {
        projects.push({ name: match[1], viewport: 'tablet' });
      }
    } else if (name.includes('desktop') || name === 'chromium' || name === 'firefox') {
      viewports.desktop = true;
      if (!projects.find((p) => p.name.toLowerCase() === name)) {
        projects.push({ name: match[1], viewport: 'desktop' });
      }
    }
  }

  // If we found chromium/firefox/webkit but no explicit viewports, default to desktop
  if (projects.length > 0 && !viewports.mobile && !viewports.tablet && !viewports.desktop) {
    viewports.desktop = true;
  }

  return { projects, viewports, configPath };
}

/**
 * Get required viewports from config or defaults
 *
 * @param projectPath - Project root path
 * @returns Array of required viewport names
 */
export function getRequiredViewports(projectPath: string): string[] {
  const config = parsePlaywrightConfig(projectPath);

  // If config has explicit viewports, use those
  if (config.projects.length > 0) {
    const viewports = new Set<string>();
    for (const project of config.projects) {
      viewports.add(project.viewport);
    }
    return Array.from(viewports);
  }

  // Default: require all three viewports
  return ['mobile', 'tablet', 'desktop'];
}

/**
 * Check if viewport coverage meets requirements
 *
 * @param manifest - E2E coverage manifest
 * @param projectPath - Project root path
 * @returns Coverage check result
 */
export function checkViewportCoverage(
  manifest: E2ECoverageManifest,
  projectPath: string
): {
  complete: boolean;
  required: string[];
  covered: string[];
  missing: string[];
} {
  const required = getRequiredViewports(projectPath);
  const covered: string[] = [];
  const missing: string[] = [];

  for (const viewport of required) {
    if (manifest.viewportsCovered[viewport as keyof ViewportsCovered]) {
      covered.push(viewport);
    } else {
      missing.push(viewport);
    }
  }

  return {
    complete: missing.length === 0,
    required,
    covered,
    missing,
  };
}
