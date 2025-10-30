/**
 * Skills Index Generator
 *
 * Generates SKILLS-INDEX.md from all SKILL.md files
 * Simulates Claude Code's progressive disclosure for non-native tools
 *
 * This allows GitHub Copilot, Cursor, and other AI tools to:
 * 1. Quickly scan all available skills (single file read)
 * 2. Match user requests to activation keywords
 * 3. Load full SKILL.md only when relevant
 * 4. Follow skill workflows for consistent output
 *
 * Usage:
 *   import { generateSkillsIndex } from './generate-skills-index';
 *   await generateSkillsIndex();
 *
 * Or run directly:
 *   npx ts-node src/utils/generate-skills-index.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Skill metadata extracted from SKILL.md frontmatter
 */
interface SkillMetadata {
  name: string;
  description: string;
  activationKeywords: string[];
  location: string;
  allowedTools?: string[];
  category: SkillCategory;
}

/**
 * Skill categories for organization
 */
const SkillCategory = {
  FRAMEWORK: 'Framework Core',
  INTEGRATIONS: 'External Integrations',
  ARCHITECTURE: 'Architecture & Design',
  DEVELOPMENT: 'Development',
  QUALITY: 'Quality & Testing',
  INFRASTRUCTURE: 'Infrastructure',
  DOCUMENTATION: 'Documentation',
  ORCHESTRATION: 'Orchestration & Planning',
  OTHER: 'Other',
} as const;

type SkillCategory = (typeof SkillCategory)[keyof typeof SkillCategory];

/**
 * Parse YAML frontmatter from SKILL.md
 */
function parseSkillMetadata(content: string, filePath: string): SkillMetadata | null {
  try {
    // Extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      console.warn(`⚠️  No frontmatter found in: ${filePath}`);
      return null;
    }

    let frontmatter: any;

    try {
      frontmatter = yaml.load(frontmatterMatch[1]) as any;
    } catch (yamlError) {
      // If YAML parsing fails, try manual parsing for simple key-value pairs
      // This handles cases where descriptions have unquoted colons
      frontmatter = {};
      const lines = frontmatterMatch[1].split('\n');
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          frontmatter[key] = value;
        }
      }
    }

    if (!frontmatter.name || !frontmatter.description) {
      console.warn(`⚠️  Missing name or description in: ${filePath}`);
      return null;
    }

    // Extract activation keywords from description
    // Look for "Activates for:" or "Activates when user mentions:" in description
    const activationKeywords: string[] = [];
    const activatesMatch = frontmatter.description.match(/Activates (?:for|when user mentions):\s*(.+?)(?:\.|$)/i);
    if (activatesMatch) {
      // Split by comma and clean up
      const keywords = activatesMatch[1]
        .split(',')
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);
      activationKeywords.push(...keywords);
    }

    // Determine category from skill name
    const category = categorizeSkill(frontmatter.name, frontmatter.description);

    // Relative path from .claude/skills/
    const skillDir = path.basename(path.dirname(filePath));
    const location = `.claude/skills/${skillDir}/SKILL.md`;

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      activationKeywords,
      location,
      allowedTools: frontmatter['allowed-tools'],
      category,
    };
  } catch (error) {
    console.error(`❌ Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Categorize skill based on name and description
 */
function categorizeSkill(name: string, description: string): SkillCategory {
  const nameLower = name.toLowerCase();
  const descLower = description.toLowerCase();

  // Framework core
  if (
    nameLower.includes('increment') ||
    nameLower.includes('context') ||
    nameLower.includes('specweave') ||
    nameLower.includes('skill-creator')
  ) {
    return SkillCategory.FRAMEWORK;
  }

  // Integrations
  if (
    nameLower.includes('jira') ||
    nameLower.includes('ado') ||
    nameLower.includes('github') ||
    nameLower.includes('sync') ||
    nameLower.includes('figma-mcp')
  ) {
    return SkillCategory.INTEGRATIONS;
  }

  // Architecture & Design
  if (
    nameLower.includes('diagram') ||
    nameLower.includes('architect') ||
    nameLower.includes('design-system') ||
    descLower.includes('architecture') ||
    descLower.includes('c4 model')
  ) {
    return SkillCategory.ARCHITECTURE;
  }

  // Development
  if (
    nameLower.includes('frontend') ||
    nameLower.includes('backend') ||
    nameLower.includes('nodejs') ||
    nameLower.includes('python') ||
    nameLower.includes('dotnet') ||
    nameLower.includes('nextjs') ||
    nameLower.includes('figma-implementer') ||
    nameLower.includes('figma-to-code')
  ) {
    return SkillCategory.DEVELOPMENT;
  }

  // Quality & Testing
  if (
    nameLower.includes('quality') ||
    nameLower.includes('test') ||
    nameLower.includes('e2e') ||
    nameLower.includes('playwright') ||
    descLower.includes('testing') ||
    descLower.includes('validation')
  ) {
    return SkillCategory.QUALITY;
  }

  // Infrastructure
  if (
    nameLower.includes('hetzner') ||
    nameLower.includes('provision') ||
    nameLower.includes('cost-optimizer') ||
    descLower.includes('infrastructure') ||
    descLower.includes('deployment') ||
    descLower.includes('hosting')
  ) {
    return SkillCategory.INFRASTRUCTURE;
  }

  // Documentation
  if (
    nameLower.includes('docusaurus') ||
    nameLower.includes('docs') ||
    nameLower.includes('figma-designer') ||
    descLower.includes('documentation') ||
    descLower.includes('generating documentation')
  ) {
    return SkillCategory.DOCUMENTATION;
  }

  // Orchestration
  if (
    nameLower.includes('orchestrat') ||
    nameLower.includes('role-orchestrator') ||
    nameLower.includes('skill-router') ||
    nameLower.includes('brainstorm') ||
    descLower.includes('multi-agent') ||
    descLower.includes('coordinates') ||
    descLower.includes('routing')
  ) {
    return SkillCategory.ORCHESTRATION;
  }

  return SkillCategory.OTHER;
}

/**
 * Generate markdown for skills index
 */
function generateIndexMarkdown(skills: SkillMetadata[]): string {
  const now = new Date().toISOString();
  const totalSkills = skills.length;

  // Group skills by category
  const categorized = new Map<SkillCategory, SkillMetadata[]>();
  for (const skill of skills) {
    const category = skill.category;
    if (!categorized.has(category)) {
      categorized.set(category, []);
    }
    categorized.get(category)!.push(skill);
  }

  // Sort skills within each category alphabetically
  for (const skillList of categorized.values()) {
    skillList.sort((a, b) => a.name.localeCompare(b.name));
  }

  let markdown = `# SpecWeave Skills Index

**Purpose**: Quick reference for all available skills. Read this file BEFORE starting any task.

**Last Updated**: ${now} (auto-generated, do not edit manually)

**Total Skills**: ${totalSkills}

---

## 🚀 Quick Start (Progressive Disclosure)

**MANDATORY**: Skills are your expert manuals. Always check for relevant skills BEFORE starting implementation.

### Progressive Disclosure Pattern

1. **Scan this index** to find skills matching your task
2. **Match activation keywords** to your current request
3. **Load full SKILL.md** for matching skills
4. **Follow the workflow** in SKILL.md precisely

### Example Workflow

\`\`\`
User asks: "Plan a new feature for user authentication"

Step 1: Scan this index → Find "increment-planner" skill
Step 2: Check keywords → Matches "feature planning", "create increment"
Step 3: Load skill → cat .claude/skills/increment-planner/SKILL.md
Step 4: Execute → Follow the increment planning workflow
\`\`\`

---

## 📚 All Available Skills

`;

  // Define category order
  const categoryOrder = [
    SkillCategory.FRAMEWORK,
    SkillCategory.ORCHESTRATION,
    SkillCategory.INTEGRATIONS,
    SkillCategory.ARCHITECTURE,
    SkillCategory.DEVELOPMENT,
    SkillCategory.QUALITY,
    SkillCategory.INFRASTRUCTURE,
    SkillCategory.DOCUMENTATION,
    SkillCategory.OTHER,
  ];

  // Generate sections by category
  for (const category of categoryOrder) {
    const skillList = categorized.get(category);
    if (!skillList || skillList.length === 0) continue;

    markdown += `\n### ${category}\n\n`;

    for (const skill of skillList) {
      markdown += `#### ${skill.name}\n\n`;
      markdown += `**Description**: ${skill.description}\n\n`;

      if (skill.activationKeywords.length > 0) {
        markdown += `**Activates for**: ${skill.activationKeywords.join(', ')}\n\n`;
      }

      markdown += `**Location**: \`${skill.location}\`\n\n`;

      if (skill.allowedTools && Array.isArray(skill.allowedTools)) {
        markdown += `**Allowed tools**: ${skill.allowedTools.join(', ')}\n\n`;
      } else if (skill.allowedTools && typeof skill.allowedTools === 'string') {
        markdown += `**Allowed tools**: ${skill.allowedTools}\n\n`;
      }

      markdown += '---\n\n';
    }
  }

  // Add usage guide
  markdown += `
## 💡 How Skills Work

**Level 1 - Discovery (this file)**:
- Scan activation keywords
- Match to your current task
- Identify 1-3 relevant skills

**Level 2 - Deep Dive (SKILL.md)**:
- Load full skill documentation
- Read required prerequisites
- Follow step-by-step workflow

**Level 3 - Execution**:
- Apply skill's instructions
- Use recommended tools
- Follow SpecWeave best practices

---

## 🎯 Task → Skill Matching Guide

| Your Task | Relevant Skill | Keywords |
|-----------|---------------|----------|
| "Plan a new feature" | \`increment-planner\` | "feature planning", "create increment" |
| "Sync to JIRA" | \`jira-sync\` | "JIRA sync", "create JIRA issue" |
| "Create diagram" | \`diagrams-architect\` | "architecture diagram", "C4 diagram" |
| "Build React UI" | \`frontend\` | "React", "components", "UI" |
| "Deploy to cloud" | \`hetzner-provisioner\` | "deploy", "infrastructure" |
| "Quality check" | \`increment-quality-judge\` | "quality check", "assess spec" |
| "E2E testing" | \`e2e-playwright\` | "E2E test", "browser test" |
| "Generate docs site" | \`docusaurus\` | "documentation site", "docs" |

---

## ⚡ Why Skills Matter

**Without skills**:
- ❌ Reinvent workflows every session
- ❌ Inconsistent increment structure
- ❌ Miss SpecWeave conventions
- ❌ Waste tokens on irrelevant docs

**With skills**:
- ✅ Proven workflows ready to use
- ✅ Consistent high-quality output
- ✅ SpecWeave best practices enforced
- ✅ Efficient token usage (load only what's needed)

---

## 🔧 For AI Tool Developers

This index simulates Claude Code's native progressive disclosure:
- Claude pre-loads skill metadata at startup (name + description)
- Other tools read this index file for same benefit
- Single file read replaces ${totalSkills} individual file scans
- Token savings: ~97% (1 file vs ${totalSkills} files)

**How to use in your AI tool**:
1. Load this file at session start
2. Parse activation keywords
3. Match user requests to keywords
4. Load full SKILL.md when matched
5. Execute skill workflow

---

**Generated by**: \`src/utils/generate-skills-index.ts\`

**Regenerate with**: \`npm run generate-skills-index\`
`;

  return markdown;
}

/**
 * Main function: Generate skills index
 */
export async function generateSkillsIndex(outputPath?: string): Promise<void> {
  console.log('🔍 Scanning skills...');

  // Determine skills directory
  const skillsDir = path.join(__dirname, '../../src/skills');

  if (!fs.existsSync(skillsDir)) {
    throw new Error(`Skills directory not found: ${skillsDir}`);
  }

  // Scan all SKILL.md files
  const skills: SkillMetadata[] = [];
  const skillDirs = fs.readdirSync(skillsDir).filter(name => {
    const fullPath = path.join(skillsDir, name);
    return fs.statSync(fullPath).isDirectory();
  });

  for (const skillDir of skillDirs) {
    const skillPath = path.join(skillsDir, skillDir, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const metadata = parseSkillMetadata(content, skillPath);
      if (metadata) {
        skills.push(metadata);
      }
    }
  }

  console.log(`✅ Found ${skills.length} skills`);

  // Generate markdown
  const markdown = generateIndexMarkdown(skills);

  // Determine output path
  const defaultOutputPath = path.join(__dirname, '../../src/skills/SKILLS-INDEX.md');
  const finalOutputPath = outputPath || defaultOutputPath;

  // Write to file
  fs.writeFileSync(finalOutputPath, markdown, 'utf-8');

  console.log(`✅ Generated skills index: ${finalOutputPath}`);
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total skills: ${skills.length}`);

  // Count by category
  const categoryCounts = new Map<SkillCategory, number>();
  for (const skill of skills) {
    categoryCounts.set(skill.category, (categoryCounts.get(skill.category) || 0) + 1);
  }

  for (const [category, count] of Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${category}: ${count}`);
  }
}

/**
 * CLI entry point (check if this file is being run directly)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSkillsIndex()
    .then(() => {
      console.log('');
      console.log('✅ Skills index generation complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error generating skills index:', error);
      process.exit(1);
    });
}
