/**
 * Living Docs Builder - Foundation Builder Phase
 *
 * Generates high-level documentation from key files:
 * - overview.md - Project summary, tech stack, main components
 * - tech-stack.md - Detected technologies and versions
 * - modules-skeleton.md - Module list with brief descriptions
 *
 * This phase completes quickly (1-2 hours) for any codebase size
 * by reading only priority files and using minimal LLM calls.
 */

import * as fs from '../../utils/fs-native.js';
import * as path from 'path';
import type { DiscoveryResult, ModuleInfo, SamplingConfig } from './discovery.js';
import { selectRepresentativeFiles } from './discovery.js';

/**
 * Foundation docs output
 */
export interface FoundationDocs {
  overview: string;
  techStack: string;
  modulesSkeleton: string;
}

/**
 * Key file content map
 */
export type KeyFileMap = Map<string, string>;

/**
 * Progress callback
 */
export type FoundationProgressCallback = (
  docName: string,
  status: 'reading' | 'generating' | 'complete'
) => void;

/**
 * Build foundation documentation from discovery results
 */
export async function buildFoundation(
  projectPath: string,
  discovery: DiscoveryResult,
  onProgress?: FoundationProgressCallback
): Promise<FoundationDocs> {
  // 1. Read key files
  onProgress?.('key-files', 'reading');
  const keyFiles = await readKeyFiles(projectPath, discovery);
  onProgress?.('key-files', 'complete');

  // 2. Generate overview.md
  onProgress?.('overview.md', 'generating');
  const overview = generateOverview(projectPath, discovery, keyFiles);
  onProgress?.('overview.md', 'complete');

  // 3. Generate tech-stack.md
  onProgress?.('tech-stack.md', 'generating');
  const techStack = generateTechStack(discovery, keyFiles);
  onProgress?.('tech-stack.md', 'complete');

  // 4. Generate modules-skeleton.md
  onProgress?.('modules-skeleton.md', 'generating');
  const modulesSkeleton = generateModulesSkeleton(discovery);
  onProgress?.('modules-skeleton.md', 'complete');

  return { overview, techStack, modulesSkeleton };
}

/**
 * Read key files from the project
 * Limited to ~30-50 files maximum for efficiency
 */
async function readKeyFiles(
  projectPath: string,
  discovery: DiscoveryResult
): Promise<KeyFileMap> {
  const files = new Map<string, string>();
  const maxFiles = 50;
  const filesToRead: string[] = [];

  // Priority 1: README and key docs
  if (discovery.existingDocs.readme) {
    filesToRead.push(discovery.existingDocs.readme);
  }
  if (discovery.existingDocs.contributing) {
    filesToRead.push(discovery.existingDocs.contributing);
  }

  // Priority 2: Config files
  const configFiles = ['package.json', 'tsconfig.json', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'pom.xml'];
  for (const config of configFiles) {
    const configPath = path.join(projectPath, config);
    if (fs.existsSync(configPath)) {
      filesToRead.push(config);
    }
  }

  // Priority 3: Main entry points (up to 5)
  filesToRead.push(...discovery.entryPoints.main.slice(0, 3));
  filesToRead.push(...discovery.entryPoints.index.slice(0, 2));

  // Priority 4: One sample file per module (up to 10 modules)
  for (const module of discovery.modules.slice(0, 10)) {
    const moduleEntryPoint = module.entryPoints[0];
    if (moduleEntryPoint) {
      filesToRead.push(path.join(module.path, moduleEntryPoint));
    } else {
      // Try to find an index file
      const indexPath = path.join(module.path, 'index.ts');
      const indexJsPath = path.join(module.path, 'index.js');
      if (fs.existsSync(path.join(projectPath, indexPath))) {
        filesToRead.push(indexPath);
      } else if (fs.existsSync(path.join(projectPath, indexJsPath))) {
        filesToRead.push(indexJsPath);
      }
    }
  }

  // Deduplicate and limit
  const uniqueFiles = [...new Set(filesToRead)].slice(0, maxFiles);

  // Read files
  for (const file of uniqueFiles) {
    const fullPath = path.join(projectPath, file);
    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Limit content size to avoid memory issues (64KB per file)
        files.set(file, content.slice(0, 65536));
      }
    } catch {
      // Skip files we can't read
    }
  }

  return files;
}

/**
 * Generate overview.md content
 *
 * Enhanced for umbrella projects (v0.31.0+):
 * - Shows umbrella status and child repo count
 * - Groups overview by teams
 */
function generateOverview(
  projectPath: string,
  discovery: DiscoveryResult,
  keyFiles: KeyFileMap
): string {
  const projectName = path.basename(projectPath);
  const lines: string[] = [];

  lines.push(`# ${projectName}`);
  lines.push('');

  // ==================================================
  // UMBRELLA PROJECT INDICATOR (v0.31.0+)
  // ==================================================
  if (discovery.umbrella?.isUmbrella) {
    lines.push('> **Umbrella Project** - Multi-repository architecture');
    lines.push(`> Detected via: ${discovery.umbrella.source}`);
    lines.push(`> Child repositories: ${discovery.umbrella.childRepoCount}`);
    lines.push('');
  }

  // Extract description from README if available
  const readme = keyFiles.get(discovery.existingDocs.readme || '');
  if (readme) {
    const descriptionMatch = readme.match(/^#[^\n]+\n+([^\n#]+)/);
    if (descriptionMatch) {
      lines.push(descriptionMatch[1].trim());
      lines.push('');
    }
  }

  // Codebase stats
  lines.push('## Codebase Overview');
  lines.push('');
  lines.push(`- **Total Files**: ${discovery.codebaseStats.totalFiles.toLocaleString()}`);
  lines.push(`- **Estimated LOC**: ${discovery.codebaseStats.estimatedLOC.toLocaleString()}`);
  lines.push(`- **Analysis Tier**: ${discovery.tier}`);
  if (discovery.umbrella?.isUmbrella) {
    lines.push(`- **Project Type**: Umbrella (${discovery.umbrella.childRepoCount} repositories)`);
  }
  lines.push('');

  // File breakdown
  lines.push('### File Breakdown');
  lines.push('');
  lines.push('| Type | Count |');
  lines.push('|------|-------|');
  lines.push(`| Code | ${discovery.codebaseStats.byType.code.toLocaleString()} |`);
  lines.push(`| Tests | ${discovery.codebaseStats.byType.tests.toLocaleString()} |`);
  lines.push(`| Docs | ${discovery.codebaseStats.byType.docs.toLocaleString()} |`);
  lines.push(`| Config | ${discovery.codebaseStats.byType.config.toLocaleString()} |`);
  lines.push(`| Assets | ${discovery.codebaseStats.byType.assets.toLocaleString()} |`);
  lines.push('');

  // Tech stack summary
  lines.push('## Technology Stack');
  lines.push('');
  if (discovery.techStack.languages.length > 0) {
    lines.push(`**Languages**: ${discovery.techStack.languages.join(', ')}`);
  }
  if (discovery.techStack.frameworks.length > 0) {
    lines.push(`**Frameworks**: ${discovery.techStack.frameworks.join(', ')}`);
  }
  if (discovery.techStack.buildTools.length > 0) {
    lines.push(`**Build Tools**: ${discovery.techStack.buildTools.join(', ')}`);
  }
  if (discovery.techStack.testFrameworks.length > 0) {
    lines.push(`**Testing**: ${discovery.techStack.testFrameworks.join(', ')}`);
  }
  lines.push('');

  // Main modules
  if (discovery.modules.length > 0) {
    lines.push('## Main Modules');
    lines.push('');
    for (const module of discovery.modules.slice(0, 10)) {
      lines.push(`- **${module.name}** - ${module.fileCount} files, ~${module.estimatedLOC.toLocaleString()} LOC`);
    }
    if (discovery.modules.length > 10) {
      lines.push(`- ...and ${discovery.modules.length - 10} more modules`);
    }
    lines.push('');
  }

  // Entry points
  if (discovery.entryPoints.main.length > 0 || discovery.entryPoints.exports.length > 0) {
    lines.push('## Entry Points');
    lines.push('');
    for (const entry of [...discovery.entryPoints.main, ...discovery.entryPoints.exports].slice(0, 5)) {
      lines.push(`- \`${entry}\``);
    }
    lines.push('');
  }

  // Existing documentation
  if (discovery.existingDocs.readme || discovery.existingDocs.docsFolder) {
    lines.push('## Existing Documentation');
    lines.push('');
    if (discovery.existingDocs.readme) {
      lines.push(`- README: \`${discovery.existingDocs.readme}\``);
    }
    if (discovery.existingDocs.contributing) {
      lines.push(`- Contributing Guide: \`${discovery.existingDocs.contributing}\``);
    }
    if (discovery.existingDocs.docsFolder) {
      lines.push(`- Docs Folder: \`${discovery.existingDocs.docsFolder}/\``);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated by Living Docs Builder on ${new Date().toISOString().split('T')[0]}*`);

  return lines.join('\n');
}

/**
 * Generate tech-stack.md content
 *
 * Enhanced for umbrella projects (v0.31.0+):
 * - Shows tech stack distribution per team
 */
function generateTechStack(
  discovery: DiscoveryResult,
  keyFiles: KeyFileMap
): string {
  const lines: string[] = [];

  lines.push('# Technology Stack');
  lines.push('');
  lines.push(`Detected from: ${discovery.techStack.detectedFrom.join(', ')}`);
  lines.push('');

  // ==================================================
  // UMBRELLA: Per-Team Tech Stack Distribution (v0.31.0+)
  // ==================================================
  if (discovery.umbrella?.isUmbrella && discovery.modules.length > 0) {
    lines.push('## Tech Stack by Team');
    lines.push('');
    lines.push('> Distribution of technologies across umbrella child repositories');
    lines.push('');

    // Group modules by team prefix
    const teamStacks = new Map<string, { frameworks: Set<string>; languages: Set<string>; count: number }>();

    for (const module of discovery.modules) {
      // Extract team from module name (e.g., "producthub-fe" → "producthub")
      const teamMatch = module.name.match(/^([a-z0-9]+)-/i);
      const team = teamMatch ? teamMatch[1] : 'other';

      if (!teamStacks.has(team)) {
        teamStacks.set(team, { frameworks: new Set(), languages: new Set(), count: 0 });
      }

      const teamData = teamStacks.get(team)!;
      teamData.count++;

      // Detect tech from module extensions
      for (const [ext] of Object.entries(module.extensions)) {
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) teamData.languages.add('TypeScript/JavaScript');
        if (['.py'].includes(ext)) teamData.languages.add('Python');
        if (['.go'].includes(ext)) teamData.languages.add('Go');
        if (['.cs'].includes(ext)) teamData.languages.add('C#');
        if (['.java'].includes(ext)) teamData.languages.add('Java');

        if (['.tsx', '.jsx'].includes(ext)) teamData.frameworks.add('React');
      }
    }

    // Output per-team table
    lines.push('| Team | Repos | Languages | Frameworks |');
    lines.push('|------|-------|-----------|------------|');
    for (const [team, data] of teamStacks) {
      const langs = [...data.languages].slice(0, 3).join(', ') || '-';
      const frameworks = [...data.frameworks].slice(0, 3).join(', ') || '-';
      lines.push(`| ${team} | ${data.count} | ${langs} | ${frameworks} |`);
    }
    lines.push('');
  }

  // Languages
  if (discovery.techStack.languages.length > 0) {
    lines.push('## Languages');
    lines.push('');
    for (const lang of discovery.techStack.languages) {
      lines.push(`- **${lang}**`);
    }
    lines.push('');
  }

  // Frameworks
  if (discovery.techStack.frameworks.length > 0) {
    lines.push('## Frameworks');
    lines.push('');
    for (const framework of discovery.techStack.frameworks) {
      lines.push(`- **${framework}**`);
    }
    lines.push('');
  }

  // Build Tools
  if (discovery.techStack.buildTools.length > 0) {
    lines.push('## Build Tools');
    lines.push('');
    for (const tool of discovery.techStack.buildTools) {
      lines.push(`- **${tool}**`);
    }
    lines.push('');
  }

  // Test Frameworks
  if (discovery.techStack.testFrameworks.length > 0) {
    lines.push('## Testing');
    lines.push('');
    for (const test of discovery.techStack.testFrameworks) {
      lines.push(`- **${test}**`);
    }
    lines.push('');
  }

  // Extension breakdown
  lines.push('## File Extensions');
  lines.push('');
  lines.push('| Extension | Count |');
  lines.push('|-----------|-------|');
  const sortedExtensions = Object.entries(discovery.codebaseStats.byExtension)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [ext, count] of sortedExtensions) {
    lines.push(`| ${ext || '(none)'} | ${count.toLocaleString()} |`);
  }
  lines.push('');

  // Dependencies from package.json
  const packageJson = keyFiles.get('package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});

      if (deps.length > 0) {
        lines.push('## Dependencies');
        lines.push('');
        lines.push(`${deps.length} production dependencies, ${devDeps.length} dev dependencies`);
        lines.push('');

        // Top 10 dependencies
        lines.push('### Top Dependencies');
        lines.push('');
        for (const dep of deps.slice(0, 10)) {
          const version = pkg.dependencies[dep];
          lines.push(`- ${dep}: ${version}`);
        }
        if (deps.length > 10) {
          lines.push(`- ...and ${deps.length - 10} more`);
        }
        lines.push('');
      }
    } catch {
      // Ignore parse errors
    }
  }

  lines.push('---');
  lines.push(`*Generated by Living Docs Builder on ${new Date().toISOString().split('T')[0]}*`);

  return lines.join('\n');
}

/**
 * Generate modules-skeleton.md content
 *
 * Enhanced for umbrella projects (v0.31.0+):
 * - Groups modules by team for umbrella projects
 * - Shows team-level statistics
 */
function generateModulesSkeleton(discovery: DiscoveryResult): string {
  const lines: string[] = [];

  lines.push('# Module Structure');
  lines.push('');
  lines.push(`Total modules: ${discovery.modules.length}`);

  // ==================================================
  // UMBRELLA: Group by Team (v0.31.0+)
  // ==================================================
  if (discovery.umbrella?.isUmbrella) {
    lines.push(`Project type: **Umbrella** (${discovery.umbrella.childRepoCount} child repos)`);
  }
  lines.push('');

  if (discovery.modules.length === 0) {
    lines.push('No modules detected. Project may have flat structure.');
    return lines.join('\n');
  }

  // For umbrella projects, group by team
  if (discovery.umbrella?.isUmbrella && discovery.modules.length > 10) {
    const teamModules = new Map<string, typeof discovery.modules>();

    for (const module of discovery.modules) {
      // Extract team from module name or path
      const teamMatch = module.name.match(/^([a-z0-9]+)-/i) || module.path.match(/^([^/]+)\//);
      const team = teamMatch ? teamMatch[1] : 'other';

      if (!teamModules.has(team)) {
        teamModules.set(team, []);
      }
      teamModules.get(team)!.push(module);
    }

    // Team summary table
    lines.push('## Team Overview');
    lines.push('');
    lines.push('| Team | Repositories | Total Files | Total LOC |');
    lines.push('|------|--------------|-------------|-----------|');

    for (const [team, modules] of teamModules) {
      const totalFiles = modules.reduce((sum, m) => sum + m.fileCount, 0);
      const totalLOC = modules.reduce((sum, m) => sum + m.estimatedLOC, 0);
      lines.push(`| ${team} | ${modules.length} | ${totalFiles.toLocaleString()} | ${totalLOC.toLocaleString()} |`);
    }
    lines.push('');

    // Detailed sections per team
    for (const [team, modules] of teamModules) {
      lines.push(`## ${team}`);
      lines.push('');
      lines.push(`${modules.length} repositories`);
      lines.push('');
      lines.push('| Repository | Files | LOC | Tests | Docs |');
      lines.push('|------------|-------|-----|-------|------|');

      for (const module of modules) {
        const hasTests = module.hasTests ? '✅' : '❌';
        const hasDocs = module.hasReadme ? '✅' : '❌';
        lines.push(`| ${module.name} | ${module.fileCount} | ${module.estimatedLOC.toLocaleString()} | ${hasTests} | ${hasDocs} |`);
      }
      lines.push('');
    }
  } else {
    // Standard flat module list for non-umbrella projects
    lines.push('## Module Overview');
    lines.push('');
    lines.push('| Module | Path | Files | LOC | Tests | Docs |');
    lines.push('|--------|------|-------|-----|-------|------|');

    for (const module of discovery.modules) {
      const hasTests = module.hasTests ? '✅' : '❌';
      const hasDocs = module.hasReadme ? '✅' : '❌';
      lines.push(`| ${module.name} | \`${module.path}\` | ${module.fileCount} | ${module.estimatedLOC.toLocaleString()} | ${hasTests} | ${hasDocs} |`);
    }
    lines.push('');

    // Detailed module sections
    lines.push('## Module Details');
    lines.push('');

    for (const module of discovery.modules) {
      lines.push(`### ${module.name}`);
      lines.push('');
      lines.push(`**Path**: \`${module.path}\``);
      lines.push('');
      lines.push(`- Files: ${module.fileCount}`);
      lines.push(`- Estimated LOC: ${module.estimatedLOC.toLocaleString()}`);
      lines.push(`- Has Tests: ${module.hasTests ? 'Yes' : 'No'}`);
      lines.push(`- Has README: ${module.hasReadme ? 'Yes' : 'No'}`);

      if (module.entryPoints.length > 0) {
        lines.push(`- Entry Points: ${module.entryPoints.map(e => `\`${e}\``).join(', ')}`);
      }

      // File type breakdown
      if (Object.keys(module.extensions).length > 0) {
        const topExtensions = Object.entries(module.extensions)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([ext, count]) => `${ext} (${count})`)
          .join(', ');
        lines.push(`- File Types: ${topExtensions}`);
      }

      lines.push('');
      lines.push('**Description**: *To be documented*');
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  lines.push(`*Generated by Living Docs Builder on ${new Date().toISOString().split('T')[0]}*`);

  return lines.join('\n');
}

/**
 * Save foundation docs to the living docs directory
 */
export async function saveFoundationDocs(
  projectPath: string,
  docs: FoundationDocs
): Promise<string[]> {
  const outputDir = path.join(projectPath, '.specweave', 'docs', 'internal', 'architecture');
  fs.ensureDirSync(outputDir);

  const savedFiles: string[] = [];

  // Save overview.md
  const overviewPath = path.join(outputDir, 'overview.md');
  fs.writeFileSync(overviewPath, docs.overview);
  savedFiles.push(overviewPath);

  // Save tech-stack.md
  const techStackPath = path.join(outputDir, 'tech-stack.md');
  fs.writeFileSync(techStackPath, docs.techStack);
  savedFiles.push(techStackPath);

  // Save modules-skeleton.md
  const modulesPath = path.join(outputDir, 'modules-skeleton.md');
  fs.writeFileSync(modulesPath, docs.modulesSkeleton);
  savedFiles.push(modulesPath);

  return savedFiles;
}
