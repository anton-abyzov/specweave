#!/usr/bin/env node
/**
 * Codebase Rescan Worker
 *
 * Background worker that rescans the actual source code after an increment closes
 * to ensure living docs reflect implementation reality (code as source of truth).
 *
 * Triggered automatically by the living-specs-handler when increment.done event fires.
 *
 * Phases:
 * 1. Discovery - Scan codebase structure for files affected by the increment
 * 2. Code Analysis - Extract actual implementation details from source files
 * 3. Doc Reconciliation - Compare code reality with living docs
 * 4. Update - Update living docs based on actual code
 * 5. Reporting - Generate sync report
 *
 * Usage:
 *   node codebase-rescan-worker.js <jobId> <projectPath>
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically loaded modules
let getJobManager: any;
let runDiscovery: any;

interface CodebaseRescanJobConfig {
  jobId: string;
  projectPath: string;
  type: 'codebase-rescan';
  closedIncrementId: string;
  featureId?: string;
  scopePaths?: string[];
  depth: 'quick' | 'full';
  startedAt: string;
}

interface RescanResult {
  phase: string;
  filesScanned: number;
  filesModified: number;
  docsUpdated: string[];
  discrepanciesFound: number;
  discrepanciesFixed: number;
  timestamp: string;
}

/**
 * Extract affected paths from increment spec.md
 * Looks for file references, module names, and paths mentioned in the spec
 */
async function extractAffectedPaths(
  projectPath: string,
  incrementId: string,
  log: (msg: string) => void
): Promise<string[]> {
  const specPath = path.join(projectPath, '.specweave/increments', incrementId, 'spec.md');
  const tasksPath = path.join(projectPath, '.specweave/increments', incrementId, 'tasks.md');
  const affectedPaths: Set<string> = new Set();

  // Read spec.md to find file references
  if (fs.existsSync(specPath)) {
    const specContent = fs.readFileSync(specPath, 'utf-8');

    // Extract file paths from spec (patterns like src/*, lib/*, etc.)
    const pathMatches = specContent.match(/(?:^|\s)((?:src|lib|app|plugins|packages|dist)\/[^\s)]+)/gm);
    if (pathMatches) {
      for (const match of pathMatches) {
        const cleanPath = match.trim().replace(/[,;)]+$/, '');
        affectedPaths.add(cleanPath);
      }
    }

    // Extract module names from tech stack mentions
    const moduleMatches = specContent.match(/(?:module|component|service|handler|controller|manager):\s*(\S+)/gi);
    if (moduleMatches) {
      for (const match of moduleMatches) {
        const moduleName = match.split(/:\s*/)[1];
        if (moduleName) {
          affectedPaths.add(`src/**/${moduleName}*`);
        }
      }
    }
  }

  // Read tasks.md to find additional references
  if (fs.existsSync(tasksPath)) {
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');

    // Look for file references in completed tasks
    const fileRefs = tasksContent.match(/(?:create|update|modify|add|fix|refactor)\s+[`']?([^\s`']+\.[a-zA-Z]+)[`']?/gi);
    if (fileRefs) {
      for (const ref of fileRefs) {
        const fileMatch = ref.match(/[`']?([^\s`']+\.[a-zA-Z]+)[`']?/);
        if (fileMatch) {
          affectedPaths.add(fileMatch[1]);
        }
      }
    }
  }

  log(`  Found ${affectedPaths.size} affected paths from increment docs`);
  return Array.from(affectedPaths);
}

/**
 * Scan codebase for files modified since increment started
 */
async function scanModifiedFiles(
  projectPath: string,
  incrementId: string,
  scopePaths: string[],
  log: (msg: string) => void
): Promise<Array<{ path: string; size: number; mtime: Date }>> {
  const metadataPath = path.join(projectPath, '.specweave/increments', incrementId, 'metadata.json');
  let incrementStartTime: Date | null = null;

  // Get increment start time from metadata
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      if (metadata.startedAt) {
        incrementStartTime = new Date(metadata.startedAt);
      } else if (metadata.createdAt) {
        incrementStartTime = new Date(metadata.createdAt);
      }
    } catch {
      // Ignore parse errors
    }
  }

  const modifiedFiles: Array<{ path: string; size: number; mtime: Date }> = [];
  const skipDirs = new Set([
    'node_modules', '.git', '.specweave', 'dist', 'build', 'out',
    'coverage', '.next', '.nuxt', '__pycache__', 'vendor'
  ]);
  const codeExtensions = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.go', '.rs', '.java', '.kt', '.cs',
    '.cpp', '.c', '.h', '.hpp', '.rb', '.php'
  ]);

  const scanDir = (dir: string, depth = 0): void => {
    if (depth > 15) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!skipDirs.has(entry.name) && !entry.name.startsWith('.')) {
            scanDir(path.join(dir, entry.name), depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (codeExtensions.has(ext)) {
            const filePath = path.join(dir, entry.name);
            const relativePath = path.relative(projectPath, filePath);

            // Check if file matches scope paths
            const matchesScope = scopePaths.length === 0 ||
              scopePaths.some(scope => {
                if (scope.includes('*')) {
                  const pattern = scope.replace(/\*/g, '.*');
                  return new RegExp(pattern).test(relativePath);
                }
                return relativePath.startsWith(scope) || relativePath.includes(scope);
              });

            if (matchesScope) {
              try {
                const stat = fs.statSync(filePath);
                // Include if modified after increment start (or all files if no start time)
                if (!incrementStartTime || stat.mtime >= incrementStartTime) {
                  modifiedFiles.push({
                    path: relativePath,
                    size: stat.size,
                    mtime: stat.mtime
                  });
                }
              } catch {
                // Ignore stat errors
              }
            }
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  };

  scanDir(projectPath);
  log(`  Found ${modifiedFiles.length} modified code files`);
  return modifiedFiles;
}

/**
 * Extract implementation details from source files
 */
async function extractImplementationDetails(
  projectPath: string,
  files: Array<{ path: string; size: number }>,
  log: (msg: string) => void
): Promise<Map<string, any>> {
  const implementations = new Map<string, any>();

  for (const file of files.slice(0, 100)) { // Limit to 100 files for performance
    const filePath = path.join(projectPath, file.path);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(file.path).toLowerCase();

      const details: any = {
        path: file.path,
        size: file.size,
        lines: content.split('\n').length,
        exports: [],
        functions: [],
        classes: [],
        imports: []
      };

      // Extract TypeScript/JavaScript exports and functions
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
        // Exports
        const exportMatches = content.match(/export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g);
        if (exportMatches) {
          details.exports = exportMatches.map(m => {
            const nameMatch = m.match(/(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/);
            return nameMatch ? nameMatch[1] : m;
          });
        }

        // Functions
        const funcMatches = content.match(/(?:async\s+)?function\s+(\w+)/g);
        if (funcMatches) {
          details.functions = funcMatches.map(m => m.replace(/async\s+function\s+/, '').replace('function ', ''));
        }

        // Classes
        const classMatches = content.match(/class\s+(\w+)/g);
        if (classMatches) {
          details.classes = classMatches.map(m => m.replace('class ', ''));
        }

        // Imports
        const importMatches = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
          details.imports = importMatches.map(m => {
            const fromMatch = m.match(/from\s+['"]([^'"]+)['"]/);
            return fromMatch ? fromMatch[1] : m;
          });
        }
      }

      implementations.set(file.path, details);
    } catch {
      // Ignore read errors
    }
  }

  log(`  Extracted implementation details from ${implementations.size} files`);
  return implementations;
}

/**
 * Update living docs based on code analysis
 */
async function updateLivingDocs(
  projectPath: string,
  incrementId: string,
  featureId: string | undefined,
  implementations: Map<string, any>,
  log: (msg: string) => void
): Promise<{ updated: string[]; discrepancies: number }> {
  const updated: string[] = [];
  let discrepancies = 0;

  // Find the feature folder in living docs
  const specsDir = path.join(projectPath, '.specweave/docs/internal/specs');

  if (!fs.existsSync(specsDir)) {
    log(`  Living docs specs folder not found, creating...`);
    fs.mkdirSync(specsDir, { recursive: true });
  }

  // Generate implementation summary
  const implementationSummary: string[] = [
    '## Implementation Summary (Auto-Generated)',
    '',
    `*Generated from codebase scan on ${new Date().toISOString()}*`,
    `*Increment: ${incrementId}*`,
    '',
    '### Modified Files',
    ''
  ];

  // Group files by directory
  const filesByDir = new Map<string, any[]>();
  for (const [filePath, details] of implementations) {
    const dir = path.dirname(filePath);
    if (!filesByDir.has(dir)) {
      filesByDir.set(dir, []);
    }
    filesByDir.get(dir)!.push({ path: filePath, ...details });
  }

  // Sort directories and add to summary
  const sortedDirs = Array.from(filesByDir.keys()).sort();
  for (const dir of sortedDirs) {
    const files = filesByDir.get(dir)!;
    implementationSummary.push(`#### \`${dir}/\``);
    implementationSummary.push('');

    for (const file of files) {
      const fileName = path.basename(file.path);
      const details: string[] = [];

      if (file.exports.length > 0) {
        details.push(`exports: ${file.exports.slice(0, 5).join(', ')}${file.exports.length > 5 ? '...' : ''}`);
      }
      if (file.classes.length > 0) {
        details.push(`classes: ${file.classes.join(', ')}`);
      }
      if (file.functions.length > 0) {
        details.push(`functions: ${file.functions.slice(0, 5).join(', ')}${file.functions.length > 5 ? '...' : ''}`);
      }

      const detailStr = details.length > 0 ? ` - ${details.join('; ')}` : '';
      implementationSummary.push(`- \`${fileName}\` (${file.lines} lines)${detailStr}`);
    }
    implementationSummary.push('');
  }

  // Write implementation summary to increment folder
  const summaryPath = path.join(projectPath, '.specweave/increments', incrementId, 'reports', 'implementation-summary.md');
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, implementationSummary.join('\n'));
  updated.push(summaryPath);
  log(`  Created implementation summary: ${summaryPath}`);

  // Update living docs if feature ID exists
  if (featureId) {
    // Find feature folder
    let featurePath: string | null = null;
    const projectDirs = fs.readdirSync(specsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('_'));

    for (const projectDir of projectDirs) {
      const checkPath = path.join(specsDir, projectDir.name, featureId);
      if (fs.existsSync(checkPath)) {
        featurePath = checkPath;
        break;
      }
    }

    if (featurePath) {
      // Update FEATURE.md with implementation status
      const featureMdPath = path.join(featurePath, 'FEATURE.md');
      if (fs.existsSync(featureMdPath)) {
        let featureContent = fs.readFileSync(featureMdPath, 'utf-8');

        // Check if implementation section exists
        if (!featureContent.includes('## Implementation Status')) {
          // Add implementation status section
          const implSection = [
            '',
            '## Implementation Status',
            '',
            `**Last Synced**: ${new Date().toISOString()}`,
            `**Files Modified**: ${implementations.size}`,
            `**Total Lines**: ${Array.from(implementations.values()).reduce((sum, d) => sum + d.lines, 0)}`,
            '',
            'See [implementation summary](../../../increments/' + incrementId + '/reports/implementation-summary.md) for details.',
            ''
          ].join('\n');

          featureContent += implSection;
          fs.writeFileSync(featureMdPath, featureContent);
          updated.push(featureMdPath);
          log(`  Updated FEATURE.md with implementation status`);
        }
      }
    } else {
      log(`  Feature folder not found for ${featureId}, skipping living docs update`);
      discrepancies++;
    }
  }

  return { updated, discrepancies };
}

/**
 * Main worker entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: codebase-rescan-worker.js <jobId> <projectPath>');
    process.exit(1);
  }

  const jobId = args[0];
  const projectPath = args[1];

  // Write PID file with exclusive lock
  const pidFile = path.join(projectPath, '.specweave', 'state', 'jobs', jobId, 'worker.pid');
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });

  try {
    const fd = fs.openSync(pidFile, 'wx');
    fs.writeSync(fd, process.pid.toString());
    fs.closeSync(fd);
  } catch (err: any) {
    if (err.code === 'EEXIST') {
      try {
        const existingPid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
        process.kill(existingPid, 0);
        console.error(`Worker already running for job ${jobId} (PID: ${existingPid})`);
        process.exit(1);
      } catch {
        fs.unlinkSync(pidFile);
        fs.writeFileSync(pidFile, process.pid.toString());
      }
    } else {
      throw err;
    }
  }

  // Cleanup on exit
  const cleanup = () => {
    try {
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
      }
    } catch {
      // Ignore
    }
  };

  process.on('exit', cleanup);
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  process.on('SIGINT', () => { cleanup(); process.exit(0); });

  // Setup logging
  const logDir = path.join(projectPath, '.specweave', 'state', 'jobs', jobId);
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'worker.log');
  const progressPath = path.join(logDir, 'progress.json');

  const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
  };

  const updateProgress = (phase: string, progress: number, message: string) => {
    fs.writeFileSync(progressPath, JSON.stringify({
      phase,
      progress,
      message,
      updatedAt: new Date().toISOString()
    }, null, 2));
  };

  try {
    log('════════════════════════════════════════════════════════════');
    log('CODEBASE RESCAN WORKER STARTED');
    log('════════════════════════════════════════════════════════════');
    log(`Job ID: ${jobId}`);
    log(`Project path: ${projectPath}`);
    log(`PID: ${process.pid}`);
    log(`Started at: ${new Date().toISOString()}`);
    log('');

    // Load job configuration
    const configPath = path.join(logDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Job config not found: ${configPath}`);
    }

    const jobConfig: CodebaseRescanJobConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    log(`Closed increment: ${jobConfig.closedIncrementId}`);
    log(`Feature ID: ${jobConfig.featureId || 'not specified'}`);
    log(`Depth: ${jobConfig.depth}`);
    log(`Scope paths: ${jobConfig.scopePaths?.join(', ') || 'all'}`);
    log('');

    // Load modules dynamically
    log('Loading dependencies...');

    const jobManagerModule = await import('../../core/background/job-manager.js');
    getJobManager = jobManagerModule.getJobManager;

    log('Dependencies loaded successfully');
    log('');

    // Get job manager and start job
    const jobManager = getJobManager(projectPath);

    // Auto-register if job doesn't exist
    if (!jobManager.getJob(jobId)) {
      log('Job not registered, auto-registering...');
      const stateFilePath = path.join(projectPath, '.specweave/state/background-jobs.json');

      let state = { jobs: [] as any[] };
      try {
        if (fs.existsSync(stateFilePath)) {
          state = JSON.parse(fs.readFileSync(stateFilePath, 'utf-8').toString());
        }
      } catch {
        // Corrupted file - start fresh
      }

      state.jobs.push({
        id: jobId,
        type: 'codebase-rescan',
        status: 'pending',
        progress: {
          current: 0,
          total: 100,
          percentage: 0,
          itemsCompleted: [],
          itemsFailed: []
        },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: {
          type: 'codebase-rescan',
          projectPath,
          closedIncrementId: jobConfig.closedIncrementId,
          featureId: jobConfig.featureId,
          depth: jobConfig.depth
        }
      });

      fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
      fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
      log('  ✓ Job registered in background-jobs.json');
    }

    jobManager.startJob(jobId);

    const result: RescanResult = {
      phase: 'discovery',
      filesScanned: 0,
      filesModified: 0,
      docsUpdated: [],
      discrepanciesFound: 0,
      discrepanciesFixed: 0,
      timestamp: new Date().toISOString()
    };

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: Discovery - Extract affected paths from increment
    // ═══════════════════════════════════════════════════════════════
    log('PHASE 1: Discovery - Extracting affected paths...');
    updateProgress('discovery', 0, 'Extracting affected paths from increment');

    const affectedPaths = await extractAffectedPaths(
      projectPath,
      jobConfig.closedIncrementId,
      log
    );

    // Merge with configured scope paths
    const allScopePaths = [...(jobConfig.scopePaths || []), ...affectedPaths];
    updateProgress('discovery', 50, `Found ${allScopePaths.length} scope paths`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: Code Analysis - Scan modified files
    // ═══════════════════════════════════════════════════════════════
    log('');
    log('PHASE 2: Code Analysis - Scanning modified files...');
    updateProgress('code-analysis', 0, 'Scanning codebase for modified files');

    const modifiedFiles = await scanModifiedFiles(
      projectPath,
      jobConfig.closedIncrementId,
      allScopePaths,
      log
    );

    result.filesScanned = modifiedFiles.length;
    updateProgress('code-analysis', 50, `Scanned ${modifiedFiles.length} files`);

    // Extract implementation details
    log('  Extracting implementation details...');
    const implementations = await extractImplementationDetails(projectPath, modifiedFiles, log);

    result.filesModified = implementations.size;
    updateProgress('code-analysis', 100, `Analyzed ${implementations.size} files`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: Doc Reconciliation - Compare with living docs
    // ═══════════════════════════════════════════════════════════════
    log('');
    log('PHASE 3: Doc Reconciliation - Comparing with living docs...');
    updateProgress('doc-reconciliation', 0, 'Comparing code with living docs');

    // For quick mode, skip deep reconciliation
    if (jobConfig.depth === 'full') {
      log('  Full reconciliation mode - checking for discrepancies...');
      // TODO: Implement deep reconciliation logic
      // - Compare exported functions with documented API
      // - Check for undocumented classes
      // - Verify implementation matches spec
    } else {
      log('  Quick mode - basic reconciliation only');
    }

    updateProgress('doc-reconciliation', 100, 'Reconciliation complete');

    // ═══════════════════════════════════════════════════════════════
    // PHASE 4: Update - Update living docs based on code
    // ═══════════════════════════════════════════════════════════════
    log('');
    log('PHASE 4: Update - Updating living docs...');
    updateProgress('update', 0, 'Updating living documentation');

    const updateResult = await updateLivingDocs(
      projectPath,
      jobConfig.closedIncrementId,
      jobConfig.featureId,
      implementations,
      log
    );

    result.docsUpdated = updateResult.updated;
    result.discrepanciesFound = updateResult.discrepancies;
    updateProgress('update', 100, `Updated ${updateResult.updated.length} docs`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 5: Reporting - Generate sync report
    // ═══════════════════════════════════════════════════════════════
    log('');
    log('PHASE 5: Reporting - Generating sync report...');
    updateProgress('reporting', 0, 'Generating sync report');

    const report = [
      '# Codebase Rescan Report',
      '',
      `**Increment**: ${jobConfig.closedIncrementId}`,
      `**Feature**: ${jobConfig.featureId || 'N/A'}`,
      `**Timestamp**: ${result.timestamp}`,
      `**Depth**: ${jobConfig.depth}`,
      '',
      '## Summary',
      '',
      `- **Files Scanned**: ${result.filesScanned}`,
      `- **Files Analyzed**: ${result.filesModified}`,
      `- **Docs Updated**: ${result.docsUpdated.length}`,
      `- **Discrepancies Found**: ${result.discrepanciesFound}`,
      '',
      '## Updated Documents',
      '',
      ...result.docsUpdated.map(doc => `- \`${path.relative(projectPath, doc)}\``),
      '',
      '## Scope Paths',
      '',
      ...allScopePaths.map(p => `- \`${p}\``),
      ''
    ].join('\n');

    const reportPath = path.join(
      projectPath,
      '.specweave/increments',
      jobConfig.closedIncrementId,
      'reports',
      'codebase-rescan-report.md'
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);
    log(`  Created report: ${reportPath}`);

    updateProgress('reporting', 100, 'Report generated');

    // ═══════════════════════════════════════════════════════════════
    // Complete
    // ═══════════════════════════════════════════════════════════════
    jobManager.completeJob(jobId);
    updateProgress('complete', 100, 'Codebase rescan complete');

    log('');
    log('════════════════════════════════════════════════════════════');
    log('CODEBASE RESCAN COMPLETED');
    log('════════════════════════════════════════════════════════════');
    log(`Completed at: ${new Date().toISOString()}`);
    log(`Files scanned: ${result.filesScanned}`);
    log(`Files analyzed: ${result.filesModified}`);
    log(`Docs updated: ${result.docsUpdated.length}`);
    log(`Report: ${reportPath}`);

  } catch (err: any) {
    log(`FATAL ERROR: ${err.message}`);
    log(err.stack || '');

    try {
      const jobManager = getJobManager(projectPath);
      jobManager.failJob(jobId, err.message);
    } catch {
      // Ignore
    }

    updateProgress('error', 0, err.message);
    process.exit(1);
  }
}

main();
