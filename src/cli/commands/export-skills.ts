/**
 * Export Skills Command
 *
 * Export SpecWeave skills to Agent Skills open standard format.
 * @see https://agentskills.io/specification
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import yaml from 'js-yaml';
import { consoleLogger as logger } from '../../utils/logger.js';

/**
 * SpecWeave skill frontmatter structure
 */
interface SpecWeaveSkill {
  name: string;
  description: string;
  'allowed-tools'?: string;
  visibility?: string;
  context?: string;
  model?: string;
}

/**
 * Agent Skills standard frontmatter structure
 */
interface AgentSkill {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  'allowed-tools'?: string;
}

/**
 * Export options
 */
export interface ExportSkillsOptions {
  output?: string;
  plugin?: string;
  skill?: string;
  dryRun?: boolean;
  validate?: boolean;
  verbose?: boolean;
}

/**
 * Export result for a single skill
 */
interface ExportResult {
  skill: string;
  plugin: string;
  success: boolean;
  outputPath?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Parse SKILL.md frontmatter
 */
function parseFrontmatter(content: string): { frontmatter: SpecWeaveSkill | null; body: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { frontmatter: null, body: content };
  }

  try {
    const frontmatter = yaml.load(frontmatterMatch[1]) as SpecWeaveSkill;
    return { frontmatter, body: frontmatterMatch[2] };
  } catch (error) {
    return { frontmatter: null, body: content };
  }
}

/**
 * Convert SpecWeave skill to Agent Skills format
 */
function convertSkill(specweave: SpecWeaveSkill, pluginName: string): { agentSkill: AgentSkill; warnings: string[] } {
  const warnings: string[] = [];

  // Validate and sanitize name
  let name = specweave.name.toLowerCase();
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name) && name.length > 1) {
    // Try to fix common issues
    name = name.replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
    warnings.push(`Name sanitized from "${specweave.name}" to "${name}"`);
  }

  // Validate description length
  let description = specweave.description;
  if (description.length > 1024) {
    description = description.slice(0, 1021) + '...';
    warnings.push(`Description truncated from ${specweave.description.length} to 1024 chars`);
  }

  // Convert allowed-tools from comma to space-delimited
  let allowedTools = specweave['allowed-tools'];
  if (allowedTools) {
    allowedTools = allowedTools.replace(/,\s*/g, ' ');
  }

  const agentSkill: AgentSkill = {
    name,
    description,
    license: 'Apache-2.0',
    compatibility: 'Designed for Claude Code (or similar products)',
    metadata: {
      author: 'specweave',
      source: 'SpecWeave',
      plugin: pluginName
    }
  };

  if (allowedTools) {
    agentSkill['allowed-tools'] = allowedTools;
  }

  return { agentSkill, warnings };
}

/**
 * Validate Agent Skills output
 */
function validateAgentSkill(skill: AgentSkill): string[] {
  const errors: string[] = [];

  // Name validation
  if (!skill.name || skill.name.length === 0 || skill.name.length > 64) {
    errors.push('Name must be 1-64 characters');
  }

  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(skill.name) && skill.name.length > 1) {
    if (skill.name.length === 1 && /^[a-z]$/.test(skill.name)) {
      // Single char is ok
    } else {
      errors.push('Name must be lowercase alphanumeric with hyphens, not starting/ending with hyphen');
    }
  }

  if (skill.name.includes('--')) {
    errors.push('Name must not contain consecutive hyphens');
  }

  // Description validation
  if (!skill.description || skill.description.length === 0) {
    errors.push('Description is required');
  }

  if (skill.description && skill.description.length > 1024) {
    errors.push('Description must not exceed 1024 characters');
  }

  return errors;
}

/**
 * Generate SKILL.md content in Agent Skills format
 */
function generateSkillMd(skill: AgentSkill, body: string): string {
  const frontmatter: Record<string, unknown> = {
    name: skill.name,
    description: skill.description
  };

  if (skill.license) {
    frontmatter.license = skill.license;
  }

  if (skill.compatibility) {
    frontmatter.compatibility = skill.compatibility;
  }

  if (skill.metadata) {
    frontmatter.metadata = skill.metadata;
  }

  if (skill['allowed-tools']) {
    frontmatter['allowed-tools'] = skill['allowed-tools'];
  }

  const yamlStr = yaml.dump(frontmatter, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false
  });

  return `---\n${yamlStr}---\n${body}`;
}

/**
 * Export SpecWeave skills to Agent Skills format
 */
export async function exportSkills(options: ExportSkillsOptions = {}): Promise<ExportResult[]> {
  const outputDir = options.output || '.agent-skills';
  const results: ExportResult[] = [];

  console.log('🔄 Exporting SpecWeave skills to Agent Skills format\n');

  // Find all SKILL.md files
  const pluginsDir = path.join(process.cwd(), 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    console.error('❌ No plugins directory found. Run from SpecWeave project root.');
    return results;
  }

  const skillFiles = await glob('**/skills/*/SKILL.md', { cwd: pluginsDir });

  if (skillFiles.length === 0) {
    console.log('No skills found to export.');
    return results;
  }

  console.log(`Found ${skillFiles.length} skills to export\n`);

  // Create output directory
  if (!options.dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Process each skill
  for (const skillFile of skillFiles) {
    // Extract plugin name and skill name from path
    // Format: {plugin-name}/skills/{skill-name}/SKILL.md
    const parts = skillFile.split('/');
    const pluginName = parts[0];
    const skillName = parts[2];

    // Filter by plugin if specified
    if (options.plugin && pluginName !== options.plugin) {
      continue;
    }

    // Filter by skill if specified
    if (options.skill && skillName !== options.skill) {
      continue;
    }

    const fullPath = path.join(pluginsDir, skillFile);
    const content = fs.readFileSync(fullPath, 'utf-8');

    const { frontmatter, body } = parseFrontmatter(content);

    if (!frontmatter) {
      results.push({
        skill: skillName,
        plugin: pluginName,
        success: false,
        error: 'Failed to parse frontmatter'
      });
      continue;
    }

    // Convert to Agent Skills format
    const { agentSkill, warnings } = convertSkill(frontmatter, pluginName);

    // Validate if requested
    if (options.validate) {
      const errors = validateAgentSkill(agentSkill);
      if (errors.length > 0) {
        results.push({
          skill: skillName,
          plugin: pluginName,
          success: false,
          error: errors.join('; '),
          warnings
        });
        continue;
      }
    }

    // Generate output
    const outputContent = generateSkillMd(agentSkill, body);
    const outputPath = path.join(outputDir, agentSkill.name, 'SKILL.md');

    if (options.dryRun) {
      console.log(`[DRY RUN] Would write: ${outputPath}`);
      if (options.verbose) {
        console.log('─'.repeat(50));
        console.log(outputContent.slice(0, 500) + '...');
        console.log('─'.repeat(50));
      }
    } else {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, outputContent, 'utf-8');
    }

    results.push({
      skill: skillName,
      plugin: pluginName,
      success: true,
      outputPath,
      warnings
    });
  }

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('\n' + '═'.repeat(50));
  console.log('Export Summary:');
  console.log(`  ✅ Exported: ${successful.length}`);
  console.log(`  ❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed exports:');
    for (const result of failed) {
      console.log(`  - ${result.plugin}/${result.skill}: ${result.error}`);
    }
  }

  if (successful.length > 0 && !options.dryRun) {
    console.log(`\nOutput written to: ${outputDir}/`);
    console.log('\nNext steps:');
    console.log('  1. Review exported skills in .agent-skills/');
    console.log('  2. Commit to your repository');
    console.log('  3. Skills will be discoverable by Agent Skills-compatible tools');
  }

  return results;
}

/**
 * CLI command handler
 */
export async function exportSkillsCommand(options: ExportSkillsOptions): Promise<void> {
  try {
    await exportSkills(options);
  } catch (error) {
    logger.error(`Export failed: ${error}`);
    process.exit(1);
  }
}
