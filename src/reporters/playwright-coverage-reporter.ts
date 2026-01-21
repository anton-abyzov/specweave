/**
 * Playwright Custom Reporter for E2E Coverage Tracking
 *
 * Automatically tracks route visits and updates coverage manifest
 * during Playwright test execution.
 *
 * Usage in playwright.config.ts:
 * ```typescript
 * import { PlaywrightCoverageReporter } from '@specweave/playwright-coverage-reporter';
 *
 * export default defineConfig({
 *   reporter: [
 *     ['html'],
 *     [PlaywrightCoverageReporter, { projectPath: process.cwd() }]
 *   ]
 * });
 * ```
 */

import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as path from 'path';
import * as fs from 'fs';
import {
  trackRouteCoverage,
  loadManifest,
  saveManifest,
  generateCoverageReport,
  calculateCoverage,
} from '../core/auto/e2e-coverage.js';

export interface PlaywrightCoverageReporterOptions {
  projectPath?: string;
  baseUrl?: string;
  outputFile?: string;
  verbose?: boolean;
}

/**
 * Playwright Reporter that tracks E2E coverage
 */
export class PlaywrightCoverageReporter implements Reporter {
  private projectPath: string;
  private baseUrl?: string;
  private outputFile?: string;
  private verbose: boolean;
  private testOutput: string[] = [];
  private currentViewport?: string;
  private routesTested = new Set<string>();

  constructor(options: PlaywrightCoverageReporterOptions = {}) {
    this.projectPath = options.projectPath || process.cwd();
    this.baseUrl = options.baseUrl;
    this.outputFile = options.outputFile;
    this.verbose = options.verbose ?? false;

    if (this.verbose) {
      console.log(`[E2E Coverage] Reporter initialized for ${this.projectPath}`);
    }
  }

  onBegin(config: FullConfig, suite: Suite): void {
    if (this.verbose) {
      console.log(`[E2E Coverage] Test run started`);
      console.log(`[E2E Coverage] Projects: ${config.projects.map((p) => p.name).join(', ')}`);
    }

    // Determine base URL from config
    if (!this.baseUrl && config.projects.length > 0) {
      const firstProject = config.projects[0];
      this.baseUrl = firstProject.use?.baseURL || 'http://localhost:3000';
    }
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    // Extract viewport from project name
    const projectName = test.parent.project()?.name || 'desktop';
    this.currentViewport = this.parseViewport(projectName);

    if (this.verbose) {
      console.log(`[E2E Coverage] Test started: ${test.title} (${this.currentViewport})`);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Collect test output (stdout + stderr)
    const output = [
      ...(result.stdout || []).map((chunk) => chunk.toString()),
      ...(result.stderr || []).map((chunk) => chunk.toString()),
    ].join('\n');

    this.testOutput.push(output);

    if (this.verbose && output) {
      console.log(`[E2E Coverage] Test output captured for ${test.title}`);
    }
  }

  onStdOut(chunk: string | Buffer, test?: TestCase, result?: TestResult): void {
    // Capture stdout for route tracking
    const text = chunk.toString();

    // Look for page.goto() calls
    const gotoPattern = /page\.goto\(['"`]([^'"`]+)['"`]\)/g;
    let match;

    while ((match = gotoPattern.exec(text)) !== null) {
      const route = this.normalizeRoute(match[1]);
      if (route && !this.routesTested.has(route)) {
        this.routesTested.add(route);
        if (this.verbose) {
          console.log(`[E2E Coverage] Route visited: ${route} (${this.currentViewport})`);
        }
      }
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    if (this.verbose) {
      console.log(`[E2E Coverage] Test run completed: ${result.status}`);
      console.log(`[E2E Coverage] Processing ${this.testOutput.length} test outputs...`);
    }

    // Combine all test output
    const combinedOutput = this.testOutput.join('\n');

    // Track route coverage
    const trackingResult = trackRouteCoverage(this.projectPath, combinedOutput, {
      baseUrl: this.baseUrl,
      viewport: this.currentViewport,
    });

    // Generate coverage report
    const manifest = trackingResult.manifest;
    const coverage = calculateCoverage(manifest);

    console.log('\n' + '═'.repeat(60));
    console.log('📊 E2E COVERAGE REPORT');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`Routes Covered:     ${coverage.routes}%`);
    console.log(`Viewports Covered:  ${coverage.viewports}%`);
    console.log('');

    if (trackingResult.newlyTested.length > 0) {
      console.log(`✅ Newly tested routes (${trackingResult.newlyTested.length}):`);
      for (const route of trackingResult.newlyTested.slice(0, 10)) {
        console.log(`   • ${route}`);
      }
      if (trackingResult.newlyTested.length > 10) {
        console.log(`   ... and ${trackingResult.newlyTested.length - 10} more`);
      }
      console.log('');
    }

    if (trackingResult.viewportUpdates.length > 0) {
      console.log(`📱 Viewport updates (${trackingResult.viewportUpdates.length}):`);
      const grouped = this.groupByRoute(trackingResult.viewportUpdates);
      for (const [route, viewports] of Object.entries(grouped).slice(0, 5)) {
        console.log(`   • ${route} → ${viewports.join(', ')}`);
      }
      console.log('');
    }

    // Show untested routes
    const untested = Object.values(manifest.routes).filter((r) => !r.tested);
    if (untested.length > 0) {
      console.log(`❌ Untested routes (${untested.length}):`);
      for (const route of untested.slice(0, 10)) {
        console.log(`   • ${route.path}`);
      }
      if (untested.length > 10) {
        console.log(`   ... and ${untested.length - 10} more`);
      }
      console.log('');
    }

    // Show viewport coverage
    console.log('Viewport Coverage:');
    console.log(`  📱 Mobile:  ${manifest.viewportsCovered.mobile ? '✅' : '❌'}`);
    console.log(`  📱 Tablet:  ${manifest.viewportsCovered.tablet ? '✅' : '❌'}`);
    console.log(`  🖥️ Desktop: ${manifest.viewportsCovered.desktop ? '✅' : '❌'}`);
    console.log('');
    console.log('═'.repeat(60));

    // Save detailed report if requested
    if (this.outputFile) {
      const reportPath = path.join(this.projectPath, this.outputFile);
      const fullReport = generateCoverageReport(manifest);
      fs.writeFileSync(reportPath, fullReport);
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    }

    // Save manifest
    saveManifest(this.projectPath, manifest);
  }

  /**
   * Parse viewport from Playwright project name
   */
  private parseViewport(projectName: string): string {
    const name = projectName.toLowerCase();
    const mobileKeywords = ['mobile', 'iphone', 'pixel', 'webkit'];
    const tabletKeywords = ['tablet', 'ipad'];

    if (mobileKeywords.some(keyword => name.includes(keyword) || name === keyword)) {
      return 'mobile';
    }
    if (tabletKeywords.some(keyword => name.includes(keyword))) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Normalize route from URL
   */
  private normalizeRoute(urlOrPath: string): string | null {
    try {
      if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
        return new URL(urlOrPath).pathname || '/';
      }
      const path = urlOrPath.startsWith('/') ? urlOrPath : '/' + urlOrPath;
      return path.split('?')[0];
    } catch {
      return null;
    }
  }

  /**
   * Group viewport updates by route
   */
  private groupByRoute(updates: { route: string; viewport: string }[]): Record<
    string,
    string[]
  > {
    const grouped: Record<string, string[]> = {};

    for (const { route, viewport } of updates) {
      if (!grouped[route]) {
        grouped[route] = [];
      }
      grouped[route].push(viewport);
    }

    return grouped;
  }
}

/**
 * Export as default for Playwright config
 */
export default PlaywrightCoverageReporter;
