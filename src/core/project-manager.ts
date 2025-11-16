/**
 * ProjectManager - Multi-project support for SpecWeave
 *
 * Handles project context, path resolution, and project switching.
 * Key principle: Single project = multi-project with 1 project (no special cases)
 */

import path from 'path';
import fs from 'fs-extra';
import { ConfigManager } from './config-manager';
import { autoDetectProjectIdSync, formatProjectName } from '../utils/project-detection';
import { ProjectContext } from './living-docs/types';

// Re-export ProjectContext as type-only for backward compatibility with CLI commands
export type { ProjectContext };

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
   * Auto-detects project ID from git remote or sync config
   *
   * @returns ProjectContext
   */
  getActiveProject(): ProjectContext {
    // Return cached project if available
    if (this.cachedProject) {
      return this.cachedProject;
    }

    const config = this.configManager.load();

    // Single project mode → return auto-detected project
    if (!config.multiProject?.enabled) {
      // Auto-detect project ID (git remote, sync config, or "default")
      const projectId = autoDetectProjectIdSync(this.projectRoot, { silent: true });

      this.cachedProject = {
        projectId: projectId,
        projectName: config.project?.name || formatProjectName(projectId),
        projectPath: path.join(this.projectRoot, '.specweave/docs/internal/specs', projectId),
        keywords: [],
        techStack: config.project?.techStack || []
      };
      return this.cachedProject;
    }

    // Multi-project mode → return active project
    const activeProjectId = config.multiProject.activeProject;
    if (!activeProjectId) {
      throw new Error('Multi-project mode enabled but no active project set in config');
    }

    const projectConfig = config.multiProject.projects[activeProjectId];

    if (!projectConfig) {
      const availableProjects = Object.keys(config.multiProject.projects).join(', ');
      throw new Error(`Active project '${activeProjectId}' not found in config. Available projects: ${availableProjects}`);
    }

    // Convert ProjectConfig to ProjectContext
    const project: ProjectContext = {
      projectId: activeProjectId,
      projectName: projectConfig.name,
      projectPath: path.join(this.projectRoot, '.specweave/docs/internal/specs', activeProjectId),
      keywords: projectConfig.keywords || [],
      techStack: projectConfig.techStack || []
    };

    this.cachedProject = project;
    return project;
  }

  /**
   * Get all projects
   *
   * @returns ProjectContext[]
   */
  getAllProjects(): ProjectContext[] {
    const config = this.configManager.load();

    if (!config.multiProject?.enabled) {
      // Auto-detect project ID for single project mode
      const projectId = autoDetectProjectIdSync(this.projectRoot, { silent: true });

      return [{
        projectId: projectId,
        projectName: config.project?.name || formatProjectName(projectId),
        projectPath: path.join(this.projectRoot, '.specweave/docs/internal/specs', projectId),
        keywords: [],
        techStack: config.project?.techStack || []
      }];
    }

    // Convert Record<string, ProjectConfig> to ProjectContext[]
    const projects: ProjectContext[] = [];
    for (const [projectId, projectConfig] of Object.entries(config.multiProject.projects)) {
      projects.push({
        projectId: projectId,
        projectName: projectConfig.name,
        projectPath: path.join(this.projectRoot, '.specweave/docs/internal/specs', projectId),
        keywords: projectConfig.keywords || [],
        techStack: projectConfig.techStack || []
      });
    }

    return projects;
  }

  /**
   * Get project by ID
   *
   * @param projectId - Project identifier
   * @returns ProjectContext or null
   */
  getProjectById(projectId: string): ProjectContext | null {
    const projects = this.getAllProjects();
    return projects.find(p => p.projectId === projectId) || null;
  }

  /**
   * Get specs path for active project
   * Example: .specweave/docs/internal/specs/backend/
   *
   * @returns string
   */
  getSpecsPath(projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/specs',
      project.projectId
    );
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), modules/ folder is no longer created.
   * Use getSpecsPath() instead and document modules within specs.
   */
  getModulesPath(projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Still return path for backward compatibility, but folder not created
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/modules',
      project.projectId
    );
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), team/ folder is no longer created.
   * Use getSpecsPath() instead and document team info within specs or README.
   */
  getTeamPath(projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Still return path for backward compatibility, but folder not created
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/team',
      project.projectId
    );
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), project-arch/ folder is no longer created.
   * Use top-level .specweave/docs/internal/architecture/ for all ADRs instead.
   */
  getProjectArchitecturePath(projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Still return path for backward compatibility, but folder not created
    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/project-arch',
      project.projectId
    );
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), legacy/ folder is no longer created.
   * Import brownfield docs directly into specs/ folder instead.
   */
  getLegacyPath(source?: string, projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Still return path for backward compatibility, but folder not created
    const basePath = path.join(
      this.projectRoot,
      '.specweave/docs/internal/legacy',
      project.projectId
    );
    return source ? path.join(basePath, source) : basePath;
  }

  /**
   * Switch active project
   *
   * @param projectId - Project identifier
   */
  async switchProject(projectId: string): Promise<void> {
    const config = this.configManager.load();

    if (!config.multiProject?.enabled) {
      throw new Error('Multi-project mode not enabled. Run /specweave:init-multiproject first.');
    }

    const projectConfig = config.multiProject.projects[projectId];
    if (!projectConfig) {
      const availableProjects = Object.keys(config.multiProject.projects).join(', ');
      throw new Error(`Project '${projectId}' not found. Available projects: ${availableProjects}`);
    }

    // Update config
    config.multiProject.activeProject = projectId;
    await this.configManager.save(config);

    // Clear cache
    this.cachedProject = null;

    console.log(`✅ Switched to project: ${projectConfig.name} (${projectId})`);
  }

  /**
   * Create project structure (simplified - ONLY specs folder)
   *
   * NOTE: As of v0.X.X (increment 0026), we ONLY create specs/ folder.
   * No modules/, team/, project-arch/, legacy/ folders.
   * This simplifies the structure and reduces complexity.
   *
   * @param projectId - Project identifier
   */
  async createProjectStructure(projectId: string): Promise<void> {
    // Create ONLY specs folder
    await fs.ensureDir(this.getSpecsPath(projectId));

    // Create README file
    const project = this.getProjectById(projectId);
    if (project) {
      await this.createProjectREADME(project);
    }

    console.log(`📁 Created project structure for: ${projectId}`);
  }

  /**
   * Add new project to config
   *
   * @param project - Project context
   */
  async addProject(project: ProjectContext): Promise<void> {
    const config = this.configManager.load();

    // Initialize multiProject if not present
    if (!config.multiProject) {
      config.multiProject = {
        enabled: false,
        activeProject: 'default',
        projects: {}
      };
    }

    // Check for duplicate ID
    if (config.multiProject.projects[project.projectId]) {
      throw new Error(`Project with ID '${project.projectId}' already exists`);
    }

    // Validate project ID (kebab-case)
    const kebabCaseRegex = /^[a-z0-9-]+$/;
    if (!kebabCaseRegex.test(project.projectId)) {
      throw new Error(`Project ID '${project.projectId}' is invalid. Must be kebab-case (lowercase, hyphens only)`);
    }

    // Add project - convert ProjectContext to ProjectConfig
    config.multiProject.projects[project.projectId] = {
      id: project.projectId,
      name: project.projectName,
      description: `${project.projectName} project`,
      keywords: project.keywords,
      techStack: project.techStack,
      team: 'Engineering Team'
    };
    await this.configManager.save(config);

    // Create structure
    await this.createProjectStructure(project.projectId);

    console.log(`✅ Added project: ${project.projectName} (${project.projectId})`);
  }

  /**
   * Remove project from config
   *
   * @param projectId - Project identifier
   */
  async removeProject(projectId: string): Promise<void> {
    const config = this.configManager.load();

    if (!config.multiProject?.enabled) {
      throw new Error('Multi-project mode not enabled');
    }

    if (projectId === 'default') {
      throw new Error('Cannot remove default project');
    }

    if (config.multiProject.activeProject === projectId) {
      throw new Error('Cannot remove active project. Switch to another project first.');
    }

    if (!config.multiProject.projects[projectId]) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Remove from config
    delete config.multiProject.projects[projectId];
    await this.configManager.save(config);

    console.log(`✅ Removed project: ${projectId}`);
    console.log('⚠️  Project files not deleted. Remove manually if needed.');
  }

  /**
   * Clear cached project (force reload)
   */
  clearCache(): void {
    this.cachedProject = null;
  }

  // README creation methods

  private async createProjectREADME(project: ProjectContext): Promise<void> {
    const specsPath = this.getSpecsPath(project.projectId);
    const content = `# ${project.projectName}

${project.projectName} project

## Project Information

- **Team**: Engineering Team
- **Tech Stack**: ${project.techStack.length > 0 ? project.techStack.join(', ') : 'Not specified'}

## Documentation Structure (Simplified)

This project uses a simplified structure:

- \`.specweave/docs/internal/specs/${project.projectId}/\` - **All living documentation** (specs, features, requirements)

**Note**: As of v0.X.X (increment 0026), we use a simplified structure with ONLY the specs folder. All project documentation lives here.

## Specs

Living documentation for features and requirements. Each spec follows the format:
- \`spec-NNN-feature-name.md\`

Examples:
- \`spec-001-user-authentication.md\` - User authentication feature
- \`spec-002-payment-processing.md\` - Payment integration
- \`spec-003-admin-dashboard.md\` - Admin dashboard

## External Sync

No external sync profiles configured yet.

---

**Created**: ${new Date().toISOString().split('T')[0]}
**Last Updated**: ${new Date().toISOString().split('T')[0]}
`;

    await fs.writeFile(path.join(specsPath, 'README.md'), content);
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), modules/ folder no longer created
   */
  private async createModulesREADME(projectId: string): Promise<void> {
    const modulesPath = this.getModulesPath(projectId);
    const content = `# Module Documentation

Module-level documentation for components, services, and domains.

## What Goes Here

- **Module architecture** - How the module is structured
- **Key components** - Main classes, services, controllers
- **Integration points** - How it connects to other modules
- **Security considerations** - Auth, permissions, data handling
- **Performance notes** - Caching, optimization, scalability

## Module Examples

### Example: \`auth-module.md\`

\`\`\`markdown
# Authentication Module

## Overview
Handles user authentication, session management, OAuth2 integration.

## Architecture
- AuthService.ts - Core authentication logic
- SessionManager.ts - Session persistence
- OAuth2Provider.ts - OAuth2 integration

## Integration Points
- Uses Redis for session storage
- Integrates with user-service for profile data
- Publishes auth events to message bus

## Security Considerations
- All passwords hashed with bcrypt (cost: 12)
- JWT tokens expire after 15 minutes
- Refresh tokens expire after 7 days
\`\`\`

## When to Create Module Docs

- **Large codebase** with distinct modules (auth, payments, notifications)
- **Domain-specific knowledge** (payment processing, ML pipeline)
- **Design system components** (button, modal, form)
- **Microservices** with complex interactions

## Module vs Architecture Docs

| Aspect | Module Docs | Architecture Docs |
|--------|-------------|-------------------|
| **Scope** | Component-level | System-level |
| **Location** | \`modules/{id}/\` | \`architecture/\` (shared) or \`project-arch/{id}/\` (project-specific) |
| **Audience** | Developers working on module | All technical stakeholders |
| **Examples** | auth-module.md, payment-module.md | HLD, ADR, system diagrams |

---

**See**: [../specs/${projectId}/README.md](../specs/${projectId}/README.md) for project overview
`;

    await fs.writeFile(path.join(modulesPath, 'README.md'), content);
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), team/ folder no longer created
   */
  private async createTeamREADME(projectId: string): Promise<void> {
    const teamPath = this.getTeamPath(projectId);
    const content = `# Team Playbook

Team-specific conventions, workflows, and processes.

## What Goes Here

- **Onboarding** - How to join this team
- **Conventions** - Coding conventions, naming standards
- **Workflows** - PR process, deployment, incident handling
- **Contacts** - Team members, on-call rotation

## Typical Team Docs

### 1. \`onboarding.md\`
- Development environment setup
- Required accounts and permissions
- Codebase walkthrough
- First tasks for new team members

### 2. \`conventions.md\`
- Naming conventions (files, functions, variables)
- Code patterns and best practices
- Tech stack preferences
- Testing approach

### 3. \`workflows.md\`
- Git workflow and branching strategy
- PR review process
- Deployment procedures
- Incident response

### 4. \`contacts.md\`
- Team members and roles
- On-call rotation
- Escalation paths

## Example: \`conventions.md\`

\`\`\`markdown
# Team Conventions

## Naming Conventions
- React components: PascalCase (UserProfile.tsx)
- Hooks: camelCase with "use" prefix (useAuth.ts)
- Test files: *.test.ts (not *.spec.ts)

## Code Patterns
- Always use TypeScript strict mode
- Prefer functional components over class components
- Use React Query for API calls (not Redux)

## Tech Stack
- Frontend: React 18, TypeScript, Tailwind CSS
- Backend: Node.js, Express, PostgreSQL
- Testing: Vitest, Playwright
\`\`\`

---

**See**: [../specs/${projectId}/README.md](../specs/${projectId}/README.md) for project overview
`;

    await fs.writeFile(path.join(teamPath, 'README.md'), content);
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), project-arch/ folder no longer created
   */
  private async createArchitectureREADME(projectId: string): Promise<void> {
    const archPath = this.getProjectArchitecturePath(projectId);
    const content = `# Project-Specific Architecture

Project-specific architecture documentation and ADRs.

## When to Use This vs Shared Architecture

### Project-Specific Architecture (\`project-arch/{id}/\`)
- Decisions specific to this project/team
- Component-level design
- Project-specific ADRs

### Shared Architecture (\`.specweave/docs/internal/architecture/\`)
- System-wide architecture
- Cross-cutting concerns
- Shared ADRs affecting all projects

## ADR Naming Convention

\`NNNN-decision-title.md\`

Example: \`0001-use-postgres-for-user-data.md\`

## ADR Template

\`\`\`markdown
# ADR-NNNN: Decision Title

**Status**: Accepted | Proposed | Deprecated
**Date**: YYYY-MM-DD
**Deciders**: Who made this decision

## Context
What is the issue we're addressing?

## Decision
What decision did we make?

## Consequences
What are the trade-offs?
- ✅ Positive consequences
- ❌ Negative consequences

## Alternatives Considered
What other options did we evaluate?
\`\`\`

---

**See**: [../specs/${projectId}/README.md](../specs/${projectId}/README.md) for project overview
`;

    await fs.writeFile(path.join(archPath, 'README.md'), content);
  }

  /**
   * @deprecated As of v0.X.X (increment 0026), legacy/ folder no longer created
   */
  private async createLegacyREADME(projectId: string): Promise<void> {
    const legacyPath = this.getLegacyPath(undefined, projectId);
    const content = `# Legacy Documentation

Brownfield documentation imported from external sources.

## Purpose

This folder contains documentation imported from:
- Notion exports
- Confluence exports
- GitHub Wiki
- Other markdown sources

## Organization

- \`notion/\` - Imported from Notion workspace
- \`confluence/\` - Imported from Confluence space
- \`wiki/\` - Imported from GitHub Wiki or other wikis
- \`custom/\` - Other imported documentation

## Migration Strategy

1. **Review imported files** for accuracy
2. **Manually move misclassified files** if needed
3. **Update spec numbers** to follow SpecWeave conventions
4. **Delete this folder** when migration is complete

## Import History

See \`.specweave/config.json\` → \`brownfield.importHistory\` for import details.

---

**See**: [../specs/${projectId}/README.md](../specs/${projectId}/README.md) for project overview
`;

    await fs.writeFile(path.join(legacyPath, 'README.md'), content);
  }
}
