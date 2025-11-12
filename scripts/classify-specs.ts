#!/usr/bin/env ts-node
/**
 * Classify existing specs into feature domains
 *
 * Usage: npx ts-node scripts/classify-specs.ts
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
  confidence: number;
  filePath: string;
}

const SPECS_DIR = '.specweave/docs/internal/specs/default';

const DOMAIN_KEYWORDS = {
  'core-framework': [
    'framework', 'cli', 'plugin', 'core', 'foundation', 'architecture',
    'package', 'npm', 'installation', 'configuration', 'lifecycle'
  ],
  'developer-experience': [
    'dx', 'ux', 'user experience', 'developer', 'setup', 'guide', 'documentation',
    'onboarding', 'error message', 'multi-repo', 'initialization', 'usability'
  ],
  'integrations': [
    'github', 'jira', 'ado', 'azure devops', 'figma', 'sync', 'integration',
    'external', 'api', 'webhook', 'connector', 'issue', 'project', 'epic'
  ],
  'infrastructure': [
    'cicd', 'ci/cd', 'pipeline', 'monitoring', 'observability', 'performance',
    'deployment', 'docker', 'kubernetes', 'infrastructure', 'ops', 'devops',
    'metrics', 'logging', 'tracing', 'alerting', 'failure detection'
  ],
  'quality-velocity': [
    'testing', 'test', 'qa', 'quality', 'dora', 'metrics', 'stabilization',
    'velocity', 'coverage', 'tdd', 'e2e', 'integration test', 'unit test',
    'benchmark', 'regression', 'release', 'version', 'changelog'
  ],
  'intelligence': [
    'ai', 'intelligent', 'smart', 'reflection', 'model', 'llm', 'gpt', 'claude',
    'agent', 'optimization', 'context', 'selection', 'decision', 'reopen',
    'discipline', 'automation', 'learning'
  ]
};

const CATEGORY_KEYWORDS = {
  'feature': ['feature', 'capability', 'functionality', 'system', 'component'],
  'nfr': ['nfr', 'non-functional', 'requirement', 'constraint', 'quality attribute'],
  'user-story': ['user story', 'us-', 'as a user', 'i want', 'so that'],
  'overview': ['overview', 'summary', 'introduction', 'getting started']
};

const PRIORITY_INDICATORS = {
  'P0': ['critical', 'blocker', 'urgent', 'security', 'production'],
  'P1': ['high', 'important', 'mvp', '1.0', 'core', 'essential'],
  'P2': ['medium', 'nice to have', 'enhancement', 'improvement'],
  'P3': ['low', 'future', 'backlog', 'post-launch', 'deferred']
};

const STATUS_INDICATORS = {
  'active': ['wip', 'in progress', 'implementing', 'active'],
  'planning': ['planning', 'draft', 'proposal', 'rfc', 'design'],
  'completed': ['complete', 'done', '100%', 'delivered', 'shipped'],
  'archived': ['archived', 'deprecated', 'obsolete', 'superseded']
};

/**
 * Extract frontmatter from markdown file
 */
function extractFrontmatter(content: string): any {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  try {
    return yaml.load(match[1]);
  } catch (e) {
    return null;
  }
}

/**
 * Classify spec domain based on content
 */
function classifyDomain(title: string, content: string): { domain: string; confidence: number } {
  const text = (title + ' ' + content).toLowerCase();

  const scores: { [key: string]: number } = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = keywords.filter(kw => text.includes(kw)).length;
  }

  // Find highest scoring domain
  const entries = Object.entries(scores);
  const best = entries.sort((a, b) => b[1] - a[1])[0];

  if (best[1] === 0) {
    return { domain: 'uncategorized', confidence: 0 };
  }

  const totalKeywords = DOMAIN_KEYWORDS[best[0] as keyof typeof DOMAIN_KEYWORDS].length;
  const confidence = best[1] / totalKeywords;

  return {
    domain: best[0],
    confidence: Math.min(confidence, 1.0)
  };
}

/**
 * Classify document category
 */
function classifyCategory(title: string, content: string, filename: string): string {
  const text = (title + ' ' + content + ' ' + filename).toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'feature'; // Default
}

/**
 * Detect priority
 */
function detectPriority(title: string, content: string): string {
  const text = (title + ' ' + content).toLowerCase();

  for (const [priority, indicators] of Object.entries(PRIORITY_INDICATORS)) {
    if (indicators.some(ind => text.includes(ind))) {
      return priority;
    }
  }

  return 'P2'; // Default medium priority
}

/**
 * Detect status
 */
function detectStatus(content: string): string {
  const text = content.toLowerCase();

  for (const [status, indicators] of Object.entries(STATUS_INDICATORS)) {
    if (indicators.some(ind => text.includes(ind))) {
      return status;
    }
  }

  return 'planning'; // Default
}

/**
 * Classify all specs in directory
 */
async function classifySpecs(): Promise<SpecMetadata[]> {
  const specsPath = path.join(process.cwd(), SPECS_DIR);

  if (!fs.existsSync(specsPath)) {
    console.error(`❌ Specs directory not found: ${specsPath}`);
    process.exit(1);
  }

  const files = fs.readdirSync(specsPath)
    .filter(f => f.endsWith('.md') && f.startsWith('spec-') && !f.includes('README'));

  const results: SpecMetadata[] = [];

  for (const file of files) {
    const filePath = path.join(specsPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract existing frontmatter if present
    const frontmatter = extractFrontmatter(content);

    // Extract title (from frontmatter or first heading)
    let title = frontmatter?.title || '';
    if (!title) {
      const titleMatch = content.match(/^# (.+)$/m);
      title = titleMatch ? titleMatch[1] : file.replace('.md', '');
    }

    // Extract ID
    const id = file.replace('.md', '');

    // Classify
    const { domain, confidence } = classifyDomain(title, content);
    const category = classifyCategory(title, content, file);
    const priority = frontmatter?.priority || detectPriority(title, content);
    const status = frontmatter?.status || detectStatus(content);

    results.push({
      id,
      title,
      domain,
      category,
      priority,
      status,
      confidence,
      filePath: file
    });
  }

  return results;
}

/**
 * Generate classification report
 */
function generateReport(specs: SpecMetadata[]): void {
  console.log('\n📊 Spec Classification Report\n');
  console.log(`Total specs analyzed: ${specs.length}\n`);

  // Group by domain
  const byDomain: { [key: string]: SpecMetadata[] } = {};
  for (const spec of specs) {
    if (!byDomain[spec.domain]) byDomain[spec.domain] = [];
    byDomain[spec.domain].push(spec);
  }

  console.log('Classification by Domain:\n');
  for (const [domain, domainSpecs] of Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${domain}: ${domainSpecs.length} specs`);

    // Show specs with low confidence
    const lowConfidence = domainSpecs.filter(s => s.confidence < 0.5);
    if (lowConfidence.length > 0) {
      console.log(`    ⚠️  Low confidence (${lowConfidence.length}): ${lowConfidence.map(s => s.id).join(', ')}`);
    }
  }

  // Group by status
  const byStatus: { [key: string]: number } = {};
  for (const spec of specs) {
    byStatus[spec.status] = (byStatus[spec.status] || 0) + 1;
  }

  console.log('\nClassification by Status:\n');
  for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${count} specs`);
  }

  // Group by priority
  const byPriority: { [key: string]: number } = {};
  for (const spec of specs) {
    byPriority[spec.priority] = (byPriority[spec.priority] || 0) + 1;
  }

  console.log('\nClassification by Priority:\n');
  for (const [priority, count] of Object.entries(byPriority).sort()) {
    console.log(`  ${priority}: ${count} specs`);
  }

  // Group by category
  const byCategory: { [key: string]: number } = {};
  for (const spec of specs) {
    byCategory[spec.category] = (byCategory[spec.category] || 0) + 1;
  }

  console.log('\nClassification by Category:\n');
  for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category}: ${count} specs`);
  }

  // Save detailed report
  const reportPath = path.join(process.cwd(), SPECS_DIR, '_index', 'classification-report.md');
  fs.ensureDirSync(path.dirname(reportPath));

  let report = `# Spec Classification Report\n\n`;
  report += `**Generated**: ${new Date().toISOString()}\n`;
  report += `**Total Specs**: ${specs.length}\n\n`;

  report += `## By Domain\n\n`;
  for (const [domain, domainSpecs] of Object.entries(byDomain).sort((a, b) => b[1].length - a[1].length)) {
    report += `### ${domain} (${domainSpecs.length})\n\n`;
    for (const spec of domainSpecs.sort((a, b) => a.id.localeCompare(b.id))) {
      const confidenceEmoji = spec.confidence >= 0.7 ? '✅' : spec.confidence >= 0.4 ? '⚠️' : '❌';
      report += `- ${confidenceEmoji} **${spec.id}**: ${spec.title} (confidence: ${(spec.confidence * 100).toFixed(0)}%)\n`;
    }
    report += `\n`;
  }

  report += `## Detailed Listing\n\n`;
  report += `| ID | Title | Domain | Category | Priority | Status | Confidence |\n`;
  report += `|----|-------|--------|----------|----------|--------|------------|\n`;
  for (const spec of specs.sort((a, b) => a.id.localeCompare(b.id))) {
    report += `| ${spec.id} | ${spec.title} | ${spec.domain} | ${spec.category} | ${spec.priority} | ${spec.status} | ${(spec.confidence * 100).toFixed(0)}% |\n`;
  }

  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Detailed report saved to: ${reportPath}\n`);

  // Save JSON for migration script
  const jsonPath = path.join(process.cwd(), SPECS_DIR, '_index', 'classification.json');
  fs.writeJsonSync(jsonPath, specs, { spaces: 2 });
  console.log(`✅ JSON data saved to: ${jsonPath}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Classifying existing specs...\n');

  const specs = await classifySpecs();
  generateReport(specs);

  console.log('✅ Classification complete!\n');
  console.log('Next steps:');
  console.log('  1. Review classification report: .specweave/docs/internal/specs/default/_index/classification-report.md');
  console.log('  2. Adjust classifications if needed (edit classification.json)');
  console.log('  3. Run migration: npx ts-node scripts/migrate-specs-to-domains.ts');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
