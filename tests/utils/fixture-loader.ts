import * as path from 'path';
import * as fs from 'fs-extra';
import * as matter from 'gray-matter';

export interface FixtureMeta data {
  expected_type: 'spec' | 'module' | 'team' | 'legacy';
  expected_confidence: 'high' | 'medium' | 'low';
  source: 'notion' | 'confluence' | 'wiki' | 'custom';
  keywords_density: 'high' | 'medium' | 'low' | 'none';
}

export interface FixtureFile {
  path: string;
  filename: string;
  content: string;
  frontmatter: FixtureMetadata;
  directory: string;
  source: string;
}

/**
 * Load all fixture files from a specific source directory
 */
export async function loadFixtures(source?: string): Promise<FixtureFile[]> {
  const fixturesDir = path.join(__dirname, '../fixtures/brownfield');

  let searchDir = fixturesDir;
  if (source) {
    searchDir = path.join(fixturesDir, `${source}-export`);
  }

  const files: FixtureFile[] = [];
  await collectMarkdownFiles(searchDir, fixturesDir, files);

  return files;
}

/**
 * Load fixtures from a specific directory (notion-export, confluence-export, etc.)
 */
export async function loadFixturesFromDirectory(dirName: string): Promise<FixtureFile[]> {
  const fixturesDir = path.join(__dirname, '../fixtures/brownfield');
  const targetDir = path.join(fixturesDir, dirName);

  if (!await fs.pathExists(targetDir)) {
    throw new Error(`Fixture directory not found: ${targetDir}`);
  }

  const files: FixtureFile[] = [];
  await collectMarkdownFiles(targetDir, fixturesDir, files);

  return files;
}

/**
 * Load a single fixture file by relative path
 */
export async function loadFixture(relativePath: string): Promise<FixtureFile> {
  const fixturesDir = path.join(__dirname, '../fixtures/brownfield');
  const filePath = path.join(fixturesDir, relativePath);

  if (!await fs.pathExists(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = matter(content);

  return {
    path: filePath,
    filename: path.basename(filePath),
    content: parsed.content,
    frontmatter: parsed.data as FixtureMetadata,
    directory: path.dirname(relativePath),
    source: extractSource(relativePath),
  };
}

/**
 * Get fixtures by expected type (spec, module, team, legacy)
 */
export async function getFixturesByType(type: 'spec' | 'module' | 'team' | 'legacy'): Promise<FixtureFile[]> {
  const allFixtures = await loadFixtures();
  return allFixtures.filter(f => f.frontmatter.expected_type === type);
}

/**
 * Get fixtures by confidence level (high, medium, low)
 */
export async function getFixturesByConfidence(confidence: 'high' | 'medium' | 'low'): Promise<FixtureFile[]> {
  const allFixtures = await loadFixtures();
  return allFixtures.filter(f => f.frontmatter.expected_confidence === confidence);
}

/**
 * Get fixtures by source (notion, confluence, wiki, custom)
 */
export async function getFixturesBySource(source: string): Promise<FixtureFile[]> {
  return loadFixtures(source);
}

/**
 * Get fixture count by type
 */
export async function getFixtureStats(): Promise<Record<string, number>> {
  const allFixtures = await loadFixtures();

  const stats = {
    total: allFixtures.length,
    spec: 0,
    module: 0,
    team: 0,
    legacy: 0,
    notion: 0,
    confluence: 0,
    wiki: 0,
    custom: 0,
  };

  allFixtures.forEach(f => {
    stats[f.frontmatter.expected_type]++;
    stats[f.frontmatter.source]++;
  });

  return stats;
}

/**
 * Recursively collect all .md files from directory
 */
async function collectMarkdownFiles(
  dir: string,
  baseDir: string,
  files: FixtureFile[]
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await collectMarkdownFiles(fullPath, baseDir, files);
    } else if (entry.name.endsWith('.md')) {
      const content = await fs.readFile(fullPath, 'utf-8');
      const parsed = matter(content);
      const relativePath = path.relative(baseDir, fullPath);

      files.push({
        path: fullPath,
        filename: entry.name,
        content: parsed.content,
        frontmatter: parsed.data as FixtureMetadata,
        directory: path.dirname(relativePath),
        source: extractSource(relativePath),
      });
    }
  }
}

/**
 * Extract source type from path (notion-export -> notion)
 */
function extractSource(relativePath: string): string {
  const parts = relativePath.split(path.sep);
  if (parts.length > 0) {
    const sourceDir = parts[0];
    return sourceDir.replace('-export', '');
  }
  return 'unknown';
}
