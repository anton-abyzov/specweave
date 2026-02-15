/**
 * Project metadata detector for docs preview
 *
 * Detects project name, description, initials, and doc categories
 * from multiple sources (config.json, package.json, directory name).
 */

import * as path from 'path';
import * as fs from '../../utils/fs-native.js';
import { ProjectMetadata, DocCategory } from './types.js';

/**
 * Known category metadata for common doc folder names
 */
const CATEGORY_META: Record<string, { description: string; icon: string }> = {
  strategy: { description: 'Business rationale, PRDs, and OKRs', icon: '\u{1F9ED}' },
  specs: { description: 'Feature specifications and user stories', icon: '\u{1F4DD}' },
  specifications: { description: 'Feature specifications and user stories', icon: '\u{1F4DD}' },
  architecture: { description: 'Technical design, ADRs, and diagrams', icon: '\u{1F3D7}\u{FE0F}' },
  delivery: { description: 'Build processes and release management', icon: '\u{1F4E6}' },
  operations: { description: 'Runbooks, SLOs, and incident management', icon: '\u{2699}\u{FE0F}' },
  governance: { description: 'Policies, security, and compliance', icon: '\u{1F6E1}\u{FE0F}' },
  guides: { description: 'How-to guides and tutorials', icon: '\u{1F4D6}' },
  modules: { description: 'Module documentation and APIs', icon: '\u{1F4E6}' },
  analysis: { description: 'Analysis reports and research', icon: '\u{1F4CA}' },
  troubleshooting: { description: 'Debugging guides and known issues', icon: '\u{1F527}' },
  repos: { description: 'Repository documentation', icon: '\u{1F500}' },
  organization: { description: 'Team and organization structure', icon: '\u{1F465}' },
  api: { description: 'API reference and endpoints', icon: '\u{1F517}' },
  testing: { description: 'Test plans and quality assurance', icon: '\u{2705}' },
  security: { description: 'Security policies and assessments', icon: '\u{1F510}' },
  design: { description: 'Design documents and mockups', icon: '\u{1F3A8}' },
  infrastructure: { description: 'Infrastructure and deployment', icon: '\u{2601}\u{FE0F}' },
  projects: { description: 'Project documentation', icon: '\u{1F4C1}' },
};

/**
 * Detect project metadata from multiple sources
 */
export async function detectProjectMetadata(
  projectRoot: string,
  docsPath: string
): Promise<ProjectMetadata> {
  const { name, description, source } = await detectNameAndDescription(projectRoot);
  const initials = extractInitials(name);
  const categories = await detectDocCategories(docsPath);
  const logoPath = await detectCustomLogo(projectRoot);

  return { name, description, initials, categories, source, logoPath: logoPath ?? undefined };
}

/**
 * Detect project name and description from config.json, package.json, or directory
 */
async function detectNameAndDescription(
  projectRoot: string
): Promise<{ name: string; description: string; source: 'config' | 'package' | 'directory' }> {
  // Source 1: .specweave/config.json
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  if (await fs.pathExists(configPath)) {
    try {
      const raw = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      // Try v2 format: { project: { name: "..." } }
      const configName = raw.project?.name || raw.projectName;
      if (configName && typeof configName === 'string') {
        const description = raw.project?.description
          || raw.research?.vision?.rawVision
          || 'Project Documentation';
        return { name: configName, description: truncateDescription(description), source: 'config' };
      }
    } catch {
      // Config parse error, fall through
    }
  }

  // Source 2: package.json
  const packagePath = path.join(projectRoot, 'package.json');
  if (await fs.pathExists(packagePath)) {
    try {
      const pkg = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      if (pkg.name && typeof pkg.name === 'string') {
        const name = formatPackageName(pkg.name);
        const description = pkg.description || 'Project Documentation';
        return { name, description: truncateDescription(description), source: 'package' };
      }
    } catch {
      // Package parse error, fall through
    }
  }

  // Source 3: directory name (resolve first so "." becomes actual dir name)
  const dirName = path.basename(path.resolve(projectRoot));
  const name = formatDirectoryName(dirName);
  return { name, description: 'Project Documentation', source: 'directory' };
}

/**
 * Detect actual doc categories from the docs folder
 */
export async function detectDocCategories(docsPath: string): Promise<DocCategory[]> {
  if (!await fs.pathExists(docsPath)) {
    return [];
  }

  const entries = await fs.readdir(docsPath, { withFileTypes: true });
  const categories: DocCategory[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const folderPath = path.join(docsPath, entry.name);
    const docCount = await countMarkdownFiles(folderPath);

    if (docCount === 0) continue;

    const normalized = entry.name.toLowerCase();
    const meta = CATEGORY_META[normalized] || {
      description: `${formatLabel(entry.name)} documentation`,
      icon: '\u{1F4C2}',
    };

    categories.push({
      id: entry.name,
      label: formatLabel(entry.name),
      description: meta.description,
      icon: meta.icon,
      docCount,
    });
  }

  // Sort by known priority, then alphabetically
  const PRIORITY: Record<string, number> = {
    strategy: 1, specs: 2, specifications: 2, architecture: 3,
    delivery: 4, operations: 5, governance: 6, projects: 7,
  };

  categories.sort((a, b) => {
    const aPri = PRIORITY[a.id.toLowerCase()] || 99;
    const bPri = PRIORITY[b.id.toLowerCase()] || 99;
    if (aPri !== bPri) return aPri - bPri;
    return a.label.localeCompare(b.label);
  });

  return categories;
}

/**
 * Count markdown files recursively in a directory
 */
async function countMarkdownFiles(dirPath: string): Promise<number> {
  let count = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        count += await countMarkdownFiles(path.join(dirPath, entry.name));
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        count++;
      }
    }
  } catch {
    // Permission error or similar, skip
  }
  return count;
}

/**
 * Extract 1-2 letter initials from project name
 */
function extractInitials(name: string): string {
  // Try CamelCase detection: "SpecWeave" → "SW", "MyProject" → "MP"
  const camelParts = name.match(/[A-Z][a-z]*/g);
  if (camelParts && camelParts.length >= 2) {
    return (camelParts[0][0] + camelParts[1][0]).toUpperCase();
  }

  // Try space/dash/underscore separated: "My App" → "MA"
  const words = name.split(/[\s\-_]+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  // Single word: first letter
  return name.charAt(0).toUpperCase();
}

/**
 * Format npm package name to human-readable
 * "@scope/my-package" → "My Package"
 */
function formatPackageName(name: string): string {
  // Strip npm scope
  const stripped = name.replace(/^@[^/]+\//, '');
  return formatDirectoryName(stripped);
}

/**
 * Format directory name to human-readable
 * "my-cool-project" → "My Cool Project"
 */
function formatDirectoryName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format folder name to label
 */
function formatLabel(folderName: string): string {
  const specialCases: Record<string, string> = {
    adr: 'ADRs', adrs: 'ADRs', hld: 'HLD', lld: 'LLD',
    prd: 'PRDs', okr: 'OKRs', api: 'API', cli: 'CLI',
    ui: 'UI', ux: 'UX', sre: 'SRE', devops: 'DevOps',
  };
  const normalized = folderName.toLowerCase();
  if (specialCases[normalized]) return specialCases[normalized];

  return folderName
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Detect a custom logo file in the project
 * Checks common locations in priority order
 */
async function detectCustomLogo(projectRoot: string): Promise<string | null> {
  const candidates = [
    path.join(projectRoot, '.specweave', 'logo.svg'),
    path.join(projectRoot, '.specweave', 'logo.png'),
    path.join(projectRoot, 'logo.svg'),
    path.join(projectRoot, 'logo.png'),
  ];

  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Truncate long descriptions for tagline use
 */
function truncateDescription(desc: string): string {
  // Take first sentence or first 120 chars
  const firstSentence = desc.split(/[.!?]\s/)[0];
  if (firstSentence.length <= 120) return firstSentence;
  return firstSentence.slice(0, 117) + '...';
}
