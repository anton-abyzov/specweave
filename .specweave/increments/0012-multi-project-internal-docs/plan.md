# Implementation Plan: Multi-Project Internal Docs & Brownfield Import

**Increment**: 0012-multi-project-internal-docs
**Status**: Planning
**Created**: 2025-11-05
**Estimated Effort**: ~30 hours (4 working days)

---

## Architecture Overview

### Core Principles

1. **Unified Path Resolution**: All operations use ProjectManager for path resolution
2. **No Special Cases**: Single project uses `projects/default/` (same structure as multi-project)
3. **Lazy Loading**: Project context loaded on-demand, cached in memory
4. **Backward Compatible**: Existing specs/ auto-migrate to projects/default/specs/
5. **Explicit Over Implicit**: Users explicitly enable multi-project mode

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SpecWeave CLI/Skills                      │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│                    ProjectManager                             │
│  • getActiveProject()                                         │
│  • getSpecsPath() → projects/{id}/specs/                      │
│  • getModulesPath() → projects/{id}/modules/                  │
│  • switchProject(id)                                          │
└───────────────┬───────────────────────────────────────────────┘
                │
                ├──────────────────┬──────────────────────┬─────┐
                ▼                  ▼                      ▼     ▼
    ┌────────────────┐  ┌───────────────────┐  ┌──────────────┐
    │ Config Manager │  │Brownfield Analyzer│  │ Migration    │
    │  (existing)    │  │      (new)        │  │ Script (new) │
    └────────────────┘  └───────────────────┘  └──────────────┘
```

---

## Phase 1: Core Infrastructure (8 hours)

### 1.1 ProjectManager Class (3 hours)

**File**: `src/core/project-manager.ts`

**Implementation**:

```typescript
import path from 'path';
import fs from 'fs-extra';
import { ConfigManager } from './config-manager';

export interface ProjectContext {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  team: string;
  contacts?: {
    lead?: string;
    pm?: string;
  };
  syncProfiles?: string[];  // Links to 0011 sync profiles
}

export interface MultiProjectConfig {
  enabled: boolean;
  activeProject: string;
  projects: ProjectContext[];
}

export class ProjectManager {
  private configManager: ConfigManager;
  private projectRoot: string;
  private cachedProject: ProjectContext | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configManager = new ConfigManager(projectRoot);
  }

  /**
   * Get current active project
   * Returns "default" project if multi-project disabled
   */
  getActiveProject(): ProjectContext {
    if (this.cachedProject) {
      return this.cachedProject;
    }

    const config = this.configManager.load();

    // Single project mode → return default project
    if (!config.multiProject?.enabled) {
      this.cachedProject = {
        id: 'default',
        name: 'Default Project',
        description: config.project?.description || 'Main project',
        techStack: [],
        team: 'Engineering Team'
      };
      return this.cachedProject;
    }

    // Multi-project mode → return active project
    const activeProjectId = config.multiProject.activeProject || 'default';
    const project = config.multiProject.projects.find(
      p => p.id === activeProjectId
    );

    if (!project) {
      throw new Error(`Active project '${activeProjectId}' not found in config`);
    }

    this.cachedProject = project;
    return project;
  }

  /**
   * Get specs path for active project
   * Example: .specweave/docs/internal/projects/default/specs/
   */
  getSpecsPath(): string {
    const project = this.getActiveProject();
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/projects',
      project.id,
      'specs'
    );
  }

  /**
   * Get modules path for active project
   * Example: .specweave/docs/internal/projects/default/modules/
   */
  getModulesPath(): string {
    const project = this.getActiveProject();
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/projects',
      project.id,
      'modules'
    );
  }

  /**
   * Get team docs path for active project
   * Example: .specweave/docs/internal/projects/default/team/
   */
  getTeamPath(): string {
    const project = this.getActiveProject();
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/projects',
      project.id,
      'team'
    );
  }

  /**
   * Get legacy docs path for active project
   * Example: .specweave/docs/internal/projects/default/legacy/
   */
  getLegacyPath(source?: string): string {
    const project = this.getActiveProject();
    const basePath = path.join(
      this.projectRoot,
      '.specweave/docs/internal/projects',
      project.id,
      'legacy'
    );

    return source ? path.join(basePath, source) : basePath;
  }

  /**
   * Switch active project
   */
  async switchProject(projectId: string): Promise<void> {
    const config = this.configManager.load();

    if (!config.multiProject?.enabled) {
      throw new Error('Multi-project mode not enabled. Run /specweave:init-multiproject first.');
    }

    const project = config.multiProject.projects.find(p => p.id === projectId);
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    config.multiProject.activeProject = projectId;
    await this.configManager.save(config);

    // Clear cache
    this.cachedProject = null;

    console.log(`✅ Switched to project: ${project.name} (${projectId})`);
  }

  /**
   * Create project structure
   */
  async createProjectStructure(projectId: string): Promise<void> {
    const basePath = path.join(
      this.projectRoot,
      '.specweave/docs/internal/projects',
      projectId
    );

    // Create folders
    await fs.ensureDir(path.join(basePath, 'specs'));
    await fs.ensureDir(path.join(basePath, 'modules'));
    await fs.ensureDir(path.join(basePath, 'team'));
    await fs.ensureDir(path.join(basePath, 'architecture/adr'));
    await fs.ensureDir(path.join(basePath, 'legacy'));

    // Create README files
    await this.createProjectREADME(projectId, basePath);
    await this.createModulesREADME(basePath);
    await this.createTeamREADME(basePath);
    await this.createLegacyREADME(basePath);
  }

  // ... (README creation methods)
}
```

### 1.2 Config Schema Updates (2 hours)

**File**: `src/core/schemas/specweave-config.schema.json`

**Add**:

```json
{
  "multiProject": {
    "type": "object",
    "description": "Multi-project configuration",
    "properties": {
      "enabled": {
        "type": "boolean",
        "default": false,
        "description": "Enable multi-project mode"
      },
      "activeProject": {
        "type": "string",
        "default": "default",
        "description": "Currently active project ID"
      },
      "projects": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["id", "name"],
          "properties": {
            "id": {
              "type": "string",
              "pattern": "^[a-z0-9-]+$",
              "description": "Project identifier (kebab-case)"
            },
            "name": {
              "type": "string",
              "description": "Project display name"
            },
            "description": {
              "type": "string"
            },
            "techStack": {
              "type": "array",
              "items": {"type": "string"}
            },
            "team": {
              "type": "string"
            },
            "contacts": {
              "type": "object",
              "properties": {
                "lead": {"type": "string", "format": "email"},
                "pm": {"type": "string", "format": "email"}
              }
            },
            "syncProfiles": {
              "type": "array",
              "items": {"type": "string"},
              "description": "Linked sync profiles from 0011"
            }
          }
        }
      }
    }
  },
  "brownfield": {
    "type": "object",
    "description": "Brownfield import tracking",
    "properties": {
      "importHistory": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "source": {
              "type": "string",
              "enum": ["notion", "confluence", "wiki", "custom"]
            },
            "workspace": {"type": "string"},
            "importedAt": {"type": "string", "format": "date-time"},
            "project": {"type": "string"},
            "filesImported": {"type": "number"},
            "destination": {"type": "string"}
          }
        }
      }
    }
  }
}
```

### 1.3 Auto-Migration Script (3 hours)

**File**: `src/cli/commands/migrate-to-multiproject.ts`

**Implementation**:

```typescript
import path from 'path';
import fs from 'fs-extra';
import { ProjectManager } from '../../core/project-manager';
import { ConfigManager } from '../../core/config-manager';

export async function autoMigrateSingleToMulti(
  projectRoot: string
): Promise<void> {
  console.log('🔄 Auto-migrating to multi-project structure...');

  const configManager = new ConfigManager(projectRoot);
  const config = configManager.load();

  // Check if already migrated
  if (config.multiProject?.enabled) {
    console.log('✅ Already using multi-project structure');
    return;
  }

  // 1. Backup current config
  const backupPath = path.join(
    projectRoot,
    '.specweave/config.backup.json'
  );
  await fs.writeJson(backupPath, config, { spaces: 2 });
  console.log(`📦 Backed up config to: ${backupPath}`);

  // 2. Check if old specs/ folder exists
  const oldSpecsPath = path.join(
    projectRoot,
    '.specweave/docs/internal/specs'
  );

  const hasOldSpecs = await fs.pathExists(oldSpecsPath);

  // 3. Create default project structure
  const projectManager = new ProjectManager(projectRoot);
  await projectManager.createProjectStructure('default');
  console.log('📁 Created projects/default/ structure');

  // 4. Migrate old specs if they exist
  if (hasOldSpecs) {
    const newSpecsPath = path.join(
      projectRoot,
      '.specweave/docs/internal/projects/default/specs'
    );

    const specFiles = await fs.readdir(oldSpecsPath);
    let migratedCount = 0;

    for (const file of specFiles) {
      if (file.endsWith('.md')) {
        await fs.copy(
          path.join(oldSpecsPath, file),
          path.join(newSpecsPath, file)
        );
        migratedCount++;
      }
    }

    console.log(`📋 Migrated ${migratedCount} specs to projects/default/specs/`);

    // Rename old folder
    await fs.move(
      oldSpecsPath,
      path.join(projectRoot, '.specweave/docs/internal/specs.old')
    );
    console.log('📦 Renamed old specs/ to specs.old/');
  }

  // 5. Update config
  config.multiProject = {
    enabled: false,  // Still single project, just using new structure
    activeProject: 'default',
    projects: [
      {
        id: 'default',
        name: config.project?.name || 'Default Project',
        description: config.project?.description || 'Main project',
        techStack: [],
        team: 'Engineering Team'
      }
    ]
  };

  await configManager.save(config);

  console.log('✅ Migration complete! Using projects/default/ structure');
  console.log('💡 Run /specweave:init-multiproject to enable multi-project mode');
}
```

---

## Phase 2: Brownfield Analyzer (6 hours)

### 2.1 File Classification (3 hours)

**File**: `src/core/brownfield/analyzer.ts`

**Implementation**:

```typescript
import path from 'path';
import fs from 'fs-extra';
import matter from 'gray-matter';

interface FileClassification {
  path: string;
  type: 'spec' | 'module' | 'team' | 'legacy';
  confidence: number;  // 0-1
  keywords: string[];
}

interface BrownfieldAnalysisResult {
  totalFiles: number;
  specs: FileClassification[];
  modules: FileClassification[];
  team: FileClassification[];
  legacy: FileClassification[];
}

export class BrownfieldAnalyzer {
  private readonly SPEC_KEYWORDS = [
    'user story', 'acceptance criteria', 'feature', 'requirement',
    'spec', 'specification', 'functional requirement', 'US-', 'AC-'
  ];

  private readonly MODULE_KEYWORDS = [
    'module', 'component', 'service', 'domain', 'package',
    'architecture', 'design', 'api', 'interface', 'class'
  ];

  private readonly TEAM_KEYWORDS = [
    'onboarding', 'convention', 'workflow', 'team', 'process',
    'guideline', 'style guide', 'best practice', 'code review',
    'pr process', 'git workflow', 'deployment'
  ];

  /**
   * Analyze markdown files in source directory
   */
  async analyze(sourcePath: string): Promise<BrownfieldAnalysisResult> {
    const markdownFiles = await this.findMarkdownFiles(sourcePath);

    const classifications: FileClassification[] = await Promise.all(
      markdownFiles.map(file => this.classifyFile(file))
    );

    // Group by type
    const specs = classifications.filter(c => c.type === 'spec');
    const modules = classifications.filter(c => c.type === 'module');
    const team = classifications.filter(c => c.type === 'team');
    const legacy = classifications.filter(c => c.type === 'legacy');

    return {
      totalFiles: markdownFiles.length,
      specs,
      modules,
      team,
      legacy
    };
  }

  /**
   * Classify single file based on content
   */
  private async classifyFile(filePath: string): Promise<FileClassification> {
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse frontmatter if present
    const { data: frontmatter, content: markdownContent } = matter(content);

    // Combine for analysis
    const textToAnalyze = `${JSON.stringify(frontmatter)} ${markdownContent}`.toLowerCase();

    // Score each type
    const specScore = this.scoreKeywords(textToAnalyze, this.SPEC_KEYWORDS);
    const moduleScore = this.scoreKeywords(textToAnalyze, this.MODULE_KEYWORDS);
    const teamScore = this.scoreKeywords(textToAnalyze, this.TEAM_KEYWORDS);

    // Determine type (highest score wins)
    let type: 'spec' | 'module' | 'team' | 'legacy';
    let confidence: number;
    let keywords: string[];

    if (specScore > moduleScore && specScore > teamScore && specScore > 0.3) {
      type = 'spec';
      confidence = specScore;
      keywords = this.findMatchingKeywords(textToAnalyze, this.SPEC_KEYWORDS);
    } else if (moduleScore > teamScore && moduleScore > 0.3) {
      type = 'module';
      confidence = moduleScore;
      keywords = this.findMatchingKeywords(textToAnalyze, this.MODULE_KEYWORDS);
    } else if (teamScore > 0.3) {
      type = 'team';
      confidence = teamScore;
      keywords = this.findMatchingKeywords(textToAnalyze, this.TEAM_KEYWORDS);
    } else {
      type = 'legacy';
      confidence = 0;
      keywords = [];
    }

    return {
      path: filePath,
      type,
      confidence,
      keywords
    };
  }

  /**
   * Score text based on keyword matches
   * Returns 0-1 confidence score
   */
  private scoreKeywords(text: string, keywords: string[]): number {
    let matches = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        matches++;
      }
    });

    // Normalize to 0-1 (max 5 matches = 1.0)
    return Math.min(matches / 5, 1.0);
  }

  /**
   * Find matching keywords in text
   */
  private findMatchingKeywords(text: string, keywords: string[]): string[] {
    return keywords.filter(keyword => text.includes(keyword));
  }

  /**
   * Find all markdown files recursively
   */
  private async findMarkdownFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    }

    await walk(dirPath);
    return files;
  }
}
```

### 2.2 Import Logic (3 hours)

**File**: `src/core/brownfield/importer.ts`

**Implementation**:

```typescript
import path from 'path';
import fs from 'fs-extra';
import { BrownfieldAnalyzer } from './analyzer';
import { ProjectManager } from '../project-manager';
import { ConfigManager } from '../config-manager';

interface ImportOptions {
  sourcePath: string;
  project: string;
  source: 'notion' | 'confluence' | 'wiki' | 'custom';
  preserveStructure?: boolean;
}

interface ImportReport {
  totalFiles: number;
  specsImported: number;
  modulesImported: number;
  teamImported: number;
  legacyImported: number;
  destination: string;
  timestamp: string;
}

export class BrownfieldImporter {
  private analyzer: BrownfieldAnalyzer;
  private projectManager: ProjectManager;
  private configManager: ConfigManager;

  constructor(projectRoot: string) {
    this.analyzer = new BrownfieldAnalyzer();
    this.projectManager = new ProjectManager(projectRoot);
    this.configManager = new ConfigManager(projectRoot);
  }

  /**
   * Import brownfield docs
   */
  async import(options: ImportOptions): Promise<ImportReport> {
    console.log(`🔍 Analyzing ${options.sourcePath}...`);

    // 1. Analyze files
    const analysis = await this.analyzer.analyze(options.sourcePath);

    console.log(`
📊 Analysis Results:
   Total files: ${analysis.totalFiles}
   - Specs: ${analysis.specs.length}
   - Modules: ${analysis.modules.length}
   - Team docs: ${analysis.team.length}
   - Legacy: ${analysis.legacy.length}
    `);

    // 2. Confirm with user (TODO: Add interactive prompt)
    console.log('📦 Importing files...');

    // 3. Import specs
    const specsPath = this.projectManager.getSpecsPath();
    await this.importFiles(analysis.specs, specsPath);

    // 4. Import modules
    const modulesPath = this.projectManager.getModulesPath();
    await this.importFiles(analysis.modules, modulesPath);

    // 5. Import team docs
    const teamPath = this.projectManager.getTeamPath();
    await this.importFiles(analysis.team, teamPath);

    // 6. Import legacy
    const legacyPath = this.projectManager.getLegacyPath(options.source);
    await this.importFiles(analysis.legacy, legacyPath, options.preserveStructure);

    // 7. Create migration report
    const report: ImportReport = {
      totalFiles: analysis.totalFiles,
      specsImported: analysis.specs.length,
      modulesImported: analysis.modules.length,
      teamImported: analysis.team.length,
      legacyImported: analysis.legacy.length,
      destination: this.projectManager.getLegacyPath(),
      timestamp: new Date().toISOString()
    };

    await this.createMigrationReport(options, report);

    // 8. Update config
    await this.updateConfig(options, report);

    console.log('✅ Import complete!');
    return report;
  }

  private async importFiles(
    files: Array<{ path: string }>,
    destination: string,
    preserveStructure = false
  ): Promise<void> {
    await fs.ensureDir(destination);

    for (const file of files) {
      const fileName = path.basename(file.path);
      const destPath = path.join(destination, fileName);
      await fs.copy(file.path, destPath);
    }
  }

  private async createMigrationReport(
    options: ImportOptions,
    report: ImportReport
  ): Promise<void> {
    const legacyREADME = path.join(
      this.projectManager.getLegacyPath(),
      'README.md'
    );

    const content = `# Brownfield Migration Report

**Source**: ${options.source}
**Imported**: ${report.timestamp}
**Total Files**: ${report.totalFiles}

## Import Summary

- **Specs**: ${report.specsImported} files → \`specs/\`
- **Modules**: ${report.modulesImported} files → \`modules/\`
- **Team Docs**: ${report.teamImported} files → \`team/\`
- **Legacy**: ${report.legacyImported} files → \`legacy/${options.source}/\`

## Source Information

- **Type**: ${options.source}
- **Source Path**: ${options.sourcePath}
- **Destination**: ${report.destination}

## Next Steps

1. Review imported files for accuracy
2. Manually move misclassified files if needed
3. Update spec numbers to follow SpecWeave conventions
4. Delete \`legacy/\` folder when migration complete
`;

    await fs.writeFile(legacyREADME, content);
  }

  private async updateConfig(
    options: ImportOptions,
    report: ImportReport
  ): Promise<void> {
    const config = this.configManager.load();

    if (!config.brownfield) {
      config.brownfield = { importHistory: [] };
    }

    config.brownfield.importHistory.push({
      source: options.source,
      workspace: path.basename(options.sourcePath),
      importedAt: report.timestamp,
      project: options.project,
      filesImported: report.totalFiles,
      destination: report.destination
    });

    await this.configManager.save(config);
  }
}
```

---

## Phase 3: CLI Commands (6 hours)

### 3.1 `/specweave:init-multiproject` (2 hours)

**File**: `plugins/specweave/commands/init-multiproject.md`

```markdown
---
name: specweave:init-multiproject
description: Initialize multi-project mode
---

# Initialize Multi-Project Mode

Enables multi-project mode and creates project structure.

## What This Does

1. Auto-migrates existing specs/ → projects/default/specs/
2. Enables multi-project mode in config
3. Optionally creates additional projects
4. Creates project READMEs and folder structure

## Example Usage

\`\`\`bash
/specweave:init-multiproject
\`\`\`

## Interactive Prompts

1. **Enable multi-project mode?** (yes/no)
2. **Migrate existing specs?** (yes/no)
3. **Create additional projects?** (yes/no)
   - If yes, enter project details (id, name, tech stack, team)

## Implementation

Use ProjectManager and auto-migration script.
```

**Implementation**: `src/cli/commands/init-multiproject.ts`

```typescript
import inquirer from 'inquirer';
import { ProjectManager } from '../../core/project-manager';
import { autoMigrateSingleToMulti } from './migrate-to-multiproject';

export async function initMultiProject(projectRoot: string): Promise<void> {
  console.log('🚀 Initialize Multi-Project Mode\n');

  // 1. Auto-migrate to new structure
  await autoMigrateSingleToMulti(projectRoot);

  // 2. Prompt: Enable multi-project?
  const { enableMulti } = await inquirer.prompt([{
    type: 'confirm',
    name: 'enableMulti',
    message: 'Enable multi-project mode? (supports multiple teams/repos)',
    default: false
  }]);

  if (!enableMulti) {
    console.log('✅ Staying in single-project mode (using projects/default/)');
    return;
  }

  // 3. Update config
  const configManager = new ConfigManager(projectRoot);
  const config = configManager.load();
  config.multiProject.enabled = true;
  await configManager.save(config);

  // 4. Prompt: Create additional projects?
  const { createMore } = await inquirer.prompt([{
    type: 'confirm',
    name: 'createMore',
    message: 'Create additional projects?',
    default: false
  }]);

  if (createMore) {
    await createAdditionalProjects(projectRoot);
  }

  console.log('✅ Multi-project mode enabled!');
}

async function createAdditionalProjects(projectRoot: string): Promise<void> {
  // Interactive project creation (multiple rounds)
  // ... (implementation details)
}
```

### 3.2 `/specweave:import-docs` (2 hours)

**File**: `plugins/specweave/commands/import-docs.md`

```markdown
---
name: specweave:import-docs
description: Import brownfield documentation from Notion, Confluence, or markdown exports
---

# Import Brownfield Documentation

Import existing documentation from Notion exports, Confluence, GitHub Wiki, or any markdown folder.

## Usage

\`\`\`bash
/specweave:import-docs <source-path> [options]
\`\`\`

## Options

- `--source=<type>`: Source type (notion, confluence, wiki, custom)
- `--project=<id>`: Target project (default: active project)
- `--preserve-structure`: Preserve original folder structure

## Examples

\`\`\`bash
# Import Notion export
/specweave:import-docs /tmp/notion-export/ --source=notion --project=default

# Import Confluence space export
/specweave:import-docs /path/to/confluence/ --source=confluence

# Import custom markdown docs
/specweave:import-docs /path/to/docs/ --source=custom --preserve-structure
\`\`\`

## What It Does

1. Analyzes markdown files
2. Classifies as specs, modules, team docs, or legacy
3. Copies files to appropriate destinations
4. Creates migration report
5. Updates config.json with import history
```

### 3.3 `/specweave:switch-project` (2 hours)

**File**: `plugins/specweave/commands/switch-project.md`

```markdown
---
name: specweave:switch-project
description: Switch active project for increment planning
---

# Switch Active Project

Switch the active project. Future increments will use the selected project's specs folder.

## Usage

\`\`\`bash
/specweave:switch-project <project-id>
\`\`\`

## Example

\`\`\`bash
# Switch to alpha project
/specweave:switch-project alpha

# Future increments will use:
# - projects/alpha/specs/
# - projects/alpha/modules/
\`\`\`
```

---

## Phase 4: Testing (6 hours)

### 4.1 Unit Tests (3 hours)

**Files**:
- `tests/unit/core/project-manager.test.ts`
- `tests/unit/brownfield/analyzer.test.ts`
- `tests/unit/brownfield/importer.test.ts`

**Coverage**:
- ProjectManager path resolution
- Auto-migration logic
- File classification accuracy
- Import logic

### 4.2 Integration Tests (2 hours)

**Files**:
- `tests/integration/multi-project/setup.test.ts`
- `tests/integration/brownfield/import.test.ts`

**Test Cases**:
- End-to-end multi-project setup
- Brownfield import from real Notion export
- Switch project workflow
- Increment creation with active project

### 4.3 E2E Tests (1 hour)

**Files**:
- `tests/e2e/multi-project.spec.ts`

**Test Cases**:
- `/specweave:init-multiproject` CLI flow
- `/specweave:import-docs` CLI flow
- `/specweave:switch-project` CLI flow

---

## Phase 5: Documentation (4 hours)

### 5.1 User-Facing Docs (2 hours)

**Files**:
- `docs-site/docs/guides/multi-project-setup.md`
- `docs-site/docs/guides/brownfield-import.md`
- `docs-site/docs/guides/team-playbooks.md`

### 5.2 Internal Docs (2 hours)

**Files**:
- `.specweave/docs/internal/architecture/adr/0017-multi-project-internal-structure.md`
- Update `CLAUDE.md` (Multi-Project section)
- Update `README.md` (Enterprise features)

---

## Integration Points

### With Increment 0011 (Multi-Project External Sync)

**Link sync profiles to projects**:

```json
{
  "multiProject": {
    "projects": [
      {
        "id": "web-app",
        "syncProfiles": ["web-app-github", "web-app-jira"]
      }
    ]
  },
  "sync": {
    "profiles": {
      "web-app-github": {
        "provider": "github",
        "config": {"owner": "acme", "repo": "web-app"}
      }
    }
  }
}
```

**When creating increment**:
1. ProjectManager determines active project
2. Sync profiles linked to project are suggested
3. Spec created in `projects/{activeProject}/specs/`

---

## Migration Path

### Existing Users (Single Project)

**Automatic (Transparent)**:
1. On first operation (e.g., `/specweave:increment`), auto-migrate runs
2. `specs/` → `projects/default/specs/` (automatic copy)
3. Old `specs/` renamed to `specs.old/` (backup)
4. Config updated with `multiProject.enabled = false` (still single project)
5. User sees NO change in behavior

**Opt-In (Explicit)**:
1. User runs `/specweave:init-multiproject`
2. Enables multi-project mode
3. Creates additional projects

### New Users

**Default**:
1. `specweave init` creates `projects/default/` structure
2. Single project by default (`multiProject.enabled = false`)
3. Can enable multi-project anytime

---

## Success Criteria

### Functional
- [ ] Auto-migration completes in <10s for 100 specs
- [ ] Brownfield import classifies files with 80%+ accuracy
- [ ] Path resolution returns correct paths for active project
- [ ] Switch project updates config and clears cache

### Performance
- [ ] Path resolution: <1ms per call
- [ ] Brownfield import: <1 minute for 500 markdown files
- [ ] Auto-migration: <10 seconds for 100 specs

### UX
- [ ] Single project users see NO changes (transparent)
- [ ] Multi-project users understand structure from READMEs
- [ ] Brownfield import provides clear feedback

---

## Risks & Mitigation

### Risk 1: Migration Breaks Existing Workflows
**Mitigation**:
- Backup config before migration
- Provide rollback script
- Test on SpecWeave's own increments

### Risk 2: File Classification Inaccuracy
**Mitigation**:
- Show preview before import
- Allow manual override
- Create `legacy/` folder for uncertain files

### Risk 3: Path Resolution Performance
**Mitigation**:
- Cache project context
- Benchmark: <1ms target
- Lazy load configuration

---

## Open Questions

1. **Module docs placement**: Separate or inside architecture/?
   - **Decision**: Separate (`projects/{id}/modules/`) for clarity

2. **ADR placement**: Project-specific or shared?
   - **Decision**: Both supported

3. **Spec numbering**: Per-project or global?
   - **Decision**: Per-project (spec-001 in alpha != spec-001 in beta)

---

**Status**: Plan Complete - Ready for Task Breakdown
**Next Step**: Create tasks.md with embedded tests
