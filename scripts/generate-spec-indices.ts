#!/usr/bin/env ts-node
/**
 * Generate navigation indices for specs
 *
 * Usage: npx ts-node scripts/generate-spec-indices.ts
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface SpecMetadata {
  id: string;
  title: string;
  domain: string;
  category: string;
  priority: string;
  status: string;
  version?: string;
  team?: string;
  owner?: string;
  target_release?: string;
  tags?: string[];
  increments?: string[];
}

const SPECS_DIR = '.specweave/docs/internal/specs/default';
const INDEX_DIR = path.join(SPECS_DIR, '_index');

/**
 * Extract frontmatter from markdown file
 */
function extractFrontmatter(content: string): SpecMetadata | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  try {
    return yaml.load(match[1]) as SpecMetadata;
  } catch (e) {
    return null;
  }
}

/**
 * Scan all specs and extract metadata
 */
function scanSpecs(): SpecMetadata[] {
  const specsPath = path.join(process.cwd(), SPECS_DIR);
  const specs: SpecMetadata[] = [];

  function scanDir(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !file.startsWith('_')) {
        scanDir(fullPath);
      } else if (file.endsWith('.md') && file.startsWith('spec-') && file !== 'README.md') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const metadata = extractFrontmatter(content);

        if (metadata) {
          specs.push(metadata);
        }
      }
    }
  }

  scanDir(specsPath);
  return specs;
}

/**
 * Generate index by status
 */
function generateByStatus(specs: SpecMetadata[]): void {
  const byStatus: { [key: string]: SpecMetadata[] } = {};

  for (const spec of specs) {
    const status = spec.status || 'unknown';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(spec);
  }

  let content = `# Specs by Status\n\n`;
  content += `**Generated**: ${new Date().toISOString()}\n`;
  content += `**Total Specs**: ${specs.length}\n\n`;

  const statusOrder = ['active', 'planning', 'completed', 'archived', 'unknown'];

  for (const status of statusOrder) {
    if (!byStatus[status]) continue;

    const statusSpecs = byStatus[status].sort((a, b) => a.id.localeCompare(b.id));

    content += `## ${status.charAt(0).toUpperCase() + status.slice(1)} (${statusSpecs.length})\n\n`;

    for (const spec of statusSpecs) {
      const link = `../${spec.domain}/${getCategoryFolder(spec.category)}${spec.id}.md`;
      content += `- [${spec.id}](${link}): ${spec.title}\n`;
      if (spec.priority) content += `  - Priority: ${spec.priority}\n`;
      if (spec.team) content += `  - Team: ${spec.team}\n`;
    }

    content += `\n`;
  }

  fs.writeFileSync(path.join(INDEX_DIR, 'by-status.md'), content);
  console.log('  ✅ Generated: by-status.md');
}

/**
 * Generate index by domain
 */
function generateByDomain(specs: SpecMetadata[]): void {
  const byDomain: { [key: string]: SpecMetadata[] } = {};

  for (const spec of specs) {
    const domain = spec.domain || 'uncategorized';
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(spec);
  }

  let content = `# Specs by Domain\n\n`;
  content += `**Generated**: ${new Date().toISOString()}\n`;
  content += `**Total Specs**: ${specs.length}\n\n`;

  for (const [domain, domainSpecs] of Object.entries(byDomain).sort()) {
    const sorted = domainSpecs.sort((a, b) => a.id.localeCompare(b.id));

    content += `## ${domain.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${sorted.length})\n\n`;

    for (const spec of sorted) {
      const link = `../${spec.domain}/${getCategoryFolder(spec.category)}${spec.id}.md`;
      content += `- [${spec.id}](${link}): ${spec.title} (${spec.status})\n`;
    }

    content += `\n`;
  }

  fs.writeFileSync(path.join(INDEX_DIR, 'by-domain.md'), content);
  console.log('  ✅ Generated: by-domain.md');
}

/**
 * Generate index by release
 */
function generateByRelease(specs: SpecMetadata[]): void {
  const byRelease: { [key: string]: SpecMetadata[] } = {};

  for (const spec of specs) {
    const release = spec.target_release || 'unscheduled';
    if (!byRelease[release]) byRelease[release] = [];
    byRelease[release].push(spec);
  }

  let content = `# Specs by Release\n\n`;
  content += `**Generated**: ${new Date().toISOString()}\n`;
  content += `**Total Specs**: ${specs.length}\n\n`;

  for (const [release, releaseSpecs] of Object.entries(byRelease).sort()) {
    const sorted = releaseSpecs.sort((a, b) => a.id.localeCompare(b.id));

    content += `## ${release} (${sorted.length})\n\n`;

    for (const spec of sorted) {
      const link = `../${spec.domain}/${getCategoryFolder(spec.category)}${spec.id}.md`;
      content += `- [${spec.id}](${link}): ${spec.title} (${spec.status})\n`;
      if (spec.priority) content += `  - Priority: ${spec.priority}\n`;
    }

    content += `\n`;
  }

  fs.writeFileSync(path.join(INDEX_DIR, 'by-release.md'), content);
  console.log('  ✅ Generated: by-release.md');
}

/**
 * Generate index by priority
 */
function generateByPriority(specs: SpecMetadata[]): void {
  const byPriority: { [key: string]: SpecMetadata[] } = {};

  for (const spec of specs) {
    const priority = spec.priority || 'P2';
    if (!byPriority[priority]) byPriority[priority] = [];
    byPriority[priority].push(spec);
  }

  let content = `# Specs by Priority\n\n`;
  content += `**Generated**: ${new Date().toISOString()}\n`;
  content += `**Total Specs**: ${specs.length}\n\n`;

  const priorityOrder = ['P0', 'P1', 'P2', 'P3'];

  for (const priority of priorityOrder) {
    if (!byPriority[priority]) continue;

    const prioritySpecs = byPriority[priority].sort((a, b) => a.id.localeCompare(b.id));

    content += `## ${priority} (${prioritySpecs.length})\n\n`;

    for (const spec of prioritySpecs) {
      const link = `../${spec.domain}/${getCategoryFolder(spec.category)}${spec.id}.md`;
      content += `- [${spec.id}](${link}): ${spec.title} (${spec.status})\n`;
      if (spec.domain) content += `  - Domain: ${spec.domain}\n`;
    }

    content += `\n`;
  }

  fs.writeFileSync(path.join(INDEX_DIR, 'by-priority.md'), content);
  console.log('  ✅ Generated: by-priority.md');
}

/**
 * Generate index by team
 */
function generateByTeam(specs: SpecMetadata[]): void {
  const byTeam: { [key: string]: SpecMetadata[] } = {};

  for (const spec of specs) {
    const team = spec.team || 'Unassigned';
    if (!byTeam[team]) byTeam[team] = [];
    byTeam[team].push(spec);
  }

  let content = `# Specs by Team\n\n`;
  content += `**Generated**: ${new Date().toISOString()}\n`;
  content += `**Total Specs**: ${specs.length}\n\n`;

  for (const [team, teamSpecs] of Object.entries(byTeam).sort()) {
    const sorted = teamSpecs.sort((a, b) => a.id.localeCompare(b.id));

    content += `## ${team} (${sorted.length})\n\n`;

    for (const spec of sorted) {
      const link = `../${spec.domain}/${getCategoryFolder(spec.category)}${spec.id}.md`;
      content += `- [${spec.id}](${link}): ${spec.title} (${spec.status})\n`;
      if (spec.priority) content += `  - Priority: ${spec.priority}\n`;
    }

    content += `\n`;
  }

  fs.writeFileSync(path.join(INDEX_DIR, 'by-team.md'), content);
  console.log('  ✅ Generated: by-team.md');
}

/**
 * Generate master index (README)
 */
function generateMasterIndex(specs: SpecMetadata[]): void {
  let content = `# Specs Index\n\n`;
  content += `**Generated**: ${new Date().toISOString()}\n`;
  content += `**Total Specs**: ${specs.length}\n\n`;

  content += `## Navigation\n\n`;
  content += `- [By Status](./by-status.md) - Active, Planning, Completed, Archived\n`;
  content += `- [By Domain](./by-domain.md) - Core Framework, DX, Integrations, etc.\n`;
  content += `- [By Release](./by-release.md) - 1.0.0, 1.1.0, 2.0.0, etc.\n`;
  content += `- [By Priority](./by-priority.md) - P0, P1, P2, P3\n`;
  content += `- [By Team](./by-team.md) - Core Team, Platform Team, etc.\n\n`;

  content += `## Statistics\n\n`;

  // Status distribution
  const statusCount: { [key: string]: number } = {};
  for (const spec of specs) {
    const status = spec.status || 'unknown';
    statusCount[status] = (statusCount[status] || 0) + 1;
  }

  content += `### Status Distribution\n\n`;
  for (const [status, count] of Object.entries(statusCount).sort((a, b) => b[1] - a[1])) {
    const percentage = ((count / specs.length) * 100).toFixed(0);
    content += `- ${status}: ${count} (${percentage}%)\n`;
  }
  content += `\n`;

  // Domain distribution
  const domainCount: { [key: string]: number } = {};
  for (const spec of specs) {
    const domain = spec.domain || 'uncategorized';
    domainCount[domain] = (domainCount[domain] || 0) + 1;
  }

  content += `### Domain Distribution\n\n`;
  for (const [domain, count] of Object.entries(domainCount).sort((a, b) => b[1] - a[1])) {
    const percentage = ((count / specs.length) * 100).toFixed(0);
    content += `- ${domain}: ${count} (${percentage}%)\n`;
  }
  content += `\n`;

  content += `---\n\n`;
  content += `Generated by SpecWeave Index Generator\n`;

  fs.writeFileSync(path.join(INDEX_DIR, 'README.md'), content);
  console.log('  ✅ Generated: README.md (master index)');
}

/**
 * Get category folder path
 */
function getCategoryFolder(category: string): string {
  if (category === 'nfr') return 'nfrs/';
  if (category === 'user-story') return 'user-stories/';
  if (category === 'overview') return 'overviews/';
  return '';
}

/**
 * Main execution
 */
async function main() {
  console.log('\n📊 Generating spec indices...\n');

  // Ensure index directory exists
  fs.ensureDirSync(INDEX_DIR);

  // Scan all specs
  const specs = scanSpecs();
  console.log(`Found ${specs.length} specs with metadata\n`);

  // Generate indices
  generateByStatus(specs);
  generateByDomain(specs);
  generateByRelease(specs);
  generateByPriority(specs);
  generateByTeam(specs);
  generateMasterIndex(specs);

  console.log(`\n✅ Index generation complete!\n`);
  console.log(`Indices saved to: ${INDEX_DIR}\n`);
  console.log('View master index: .specweave/docs/internal/specs/default/_index/README.md\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
