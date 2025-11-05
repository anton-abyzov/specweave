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
  syncProfiles?: string[];  // Links to sync profiles from increment 0011
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
        id: projectId,
        name: config.project?.name || formatProjectName(projectId),
        description: config.project?.description || `${formatProjectName(projectId)} project`,
        techStack: config.project?.techStack || [],
        team: config.project?.team || 'Engineering Team'
      };
      return this.cachedProject;
    }

    // Multi-project mode → return active project
    const activeProjectId = config.multiProject.activeProject;
    if (!activeProjectId) {
      throw new Error('Multi-project mode enabled but no active project set in config');
    }

    const project = config.multiProject.projects.find(
      p => p.id === activeProjectId
    );

    if (!project) {
      throw new Error(`Active project '${activeProjectId}' not found in config. Available projects: ${config.multiProject.projects.map(p => p.id).join(', ')}`);
    }

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
        id: projectId,
        name: config.project?.name || formatProjectName(projectId),
        description: config.project?.description || `${formatProjectName(projectId)} project`,
        techStack: config.project?.techStack || [],
        team: config.project?.team || 'Engineering Team'
      }];
    }

    return config.multiProject.projects;
  }

  /**
   * Get project by ID
   *
   * @param projectId - Project identifier
   * @returns ProjectContext or null
   */
  getProjectById(projectId: string): ProjectContext | null {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  /**
   * Get base path for active project
   * Example: .specweave/docs/internal/projects/default/
   *
   * @returns string
   */
  getProjectBasePath(projectId?: string): string {
    const project = projectId ? this.getProjectById(projectId) : this.getActiveProject();
    if (!project) {
      throw new Error(`Project '${projectId}' not found`);
    }

    return path.join(
      this.projectRoot,
      '.specweave/docs/internal/projects',
      project.id
    );
  }

  /**
   * Get specs path for active project
   * Example: .specweave/docs/internal/projects/default/specs/
   *
   * @returns string
   */
  getSpecsPath(projectId?: string): string {
    return path.join(this.getProjectBasePath(projectId), 'specs');
  }

  /**
   * Get modules path for active project
   * Example: .specweave/docs/internal/projects/default/modules/
   *
   * @returns string
   */
  getModulesPath(projectId?: string): string {
    return path.join(this.getProjectBasePath(projectId), 'modules');
  }

  /**
   * Get team docs path for active project
   * Example: .specweave/docs/internal/projects/default/team/
   *
   * @returns string
   */
  getTeamPath(projectId?: string): string {
    return path.join(this.getProjectBasePath(projectId), 'team');
  }

  /**
   * Get architecture path for active project
   * Example: .specweave/docs/internal/projects/default/architecture/
   *
   * @returns string
   */
  getArchitecturePath(projectId?: string): string {
    return path.join(this.getProjectBasePath(projectId), 'architecture');
  }

  /**
   * Get legacy docs path for active project
   * Example: .specweave/docs/internal/projects/default/legacy/
   * Or with source: .specweave/docs/internal/projects/default/legacy/notion/
   *
   * @param source - Optional source type (notion, confluence, wiki, custom)
   * @returns string
   */
  getLegacyPath(source?: string, projectId?: string): string {
    const basePath = path.join(this.getProjectBasePath(projectId), 'legacy');
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

    const project = config.multiProject.projects.find(p => p.id === projectId);
    if (!project) {
      const availableProjects = config.multiProject.projects.map(p => p.id).join(', ');
      throw new Error(`Project '${projectId}' not found. Available projects: ${availableProjects}`);
    }

    // Update config
    config.multiProject.activeProject = projectId;
    await this.configManager.save(config);

    // Clear cache
    this.cachedProject = null;

    console.log(`✅ Switched to project: ${project.name} (${projectId})`);
  }

  /**
   * Create project structure with all folders
   *
   * @param projectId - Project identifier
   */
  async createProjectStructure(projectId: string): Promise<void> {
    const basePath = this.getProjectBasePath(projectId);

    // Create folders
    await fs.ensureDir(path.join(basePath, 'specs'));
    await fs.ensureDir(path.join(basePath, 'modules'));
    await fs.ensureDir(path.join(basePath, 'team'));
    await fs.ensureDir(path.join(basePath, 'architecture/adr'));
    await fs.ensureDir(path.join(basePath, 'legacy'));

    // Create README files
    const project = this.getProjectById(projectId);
    if (project) {
      await this.createProjectREADME(project, basePath);
      await this.createModulesREADME(basePath);
      await this.createTeamREADME(basePath);
      await this.createArchitectureREADME(basePath);
      await this.createLegacyREADME(basePath);
    }

    console.log(`📁 Created project structure: ${basePath}`);
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
        projects: []
      };
    }

    // Check for duplicate ID
    const existingProject = config.multiProject.projects.find(p => p.id === project.id);
    if (existingProject) {
      throw new Error(`Project with ID '${project.id}' already exists`);
    }

    // Validate project ID (kebab-case)
    const kebabCaseRegex = /^[a-z0-9-]+$/;
    if (!kebabCaseRegex.test(project.id)) {
      throw new Error(`Project ID '${project.id}' is invalid. Must be kebab-case (lowercase, hyphens only)`);
    }

    // Add project
    config.multiProject.projects.push(project);
    await this.configManager.save(config);

    // Create structure
    await this.createProjectStructure(project.id);

    console.log(`✅ Added project: ${project.name} (${project.id})`);
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

    const projectIndex = config.multiProject.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      throw new Error(`Project '${projectId}' not found`);
    }

    // Remove from config
    config.multiProject.projects.splice(projectIndex, 1);
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

  private async createProjectREADME(project: ProjectContext, basePath: string): Promise<void> {
    const content = `# ${project.name}

${project.description}

## Project Information

- **Team**: ${project.team}
- **Tech Stack**: ${project.techStack.length > 0 ? project.techStack.join(', ') : 'Not specified'}
${project.contacts?.lead ? `- **Tech Lead**: ${project.contacts.lead}` : ''}
${project.contacts?.pm ? `- **Product Manager**: ${project.contacts.pm}` : ''}

## Folder Structure

- \`specs/\` - Living documentation specs (spec-001, spec-002, ...)
- \`modules/\` - Module-level documentation (auth, payments, etc.)
- \`team/\` - Team playbooks (onboarding, conventions, workflows)
- \`architecture/\` - Project-specific architecture (optional)
- \`legacy/\` - Brownfield imported documentation

## Documentation

### Specs
Living documentation for features and requirements. Each spec follows the format:
- \`spec-NNN-feature-name.md\`

### Modules
Module-level documentation for components, services, and domains. Examples:
- \`auth-module.md\` - Authentication domain
- \`payment-module.md\` - Payment processing
- \`ml-pipeline-module.md\` - Machine learning pipeline

### Team Playbooks
Team-specific conventions, workflows, and processes:
- \`onboarding.md\` - How to join this team
- \`conventions.md\` - Coding conventions, naming standards
- \`workflows.md\` - PR process, deployment, incident handling

## External Sync

${project.syncProfiles && project.syncProfiles.length > 0 ?
`This project syncs with external tools:
${project.syncProfiles.map(profile => `- ${profile}`).join('\n')}` :
'No external sync profiles configured yet.'}

---

**Created**: ${new Date().toISOString().split('T')[0]}
**Last Updated**: ${new Date().toISOString().split('T')[0]}
`;

    await fs.writeFile(path.join(basePath, 'README.md'), content);
  }

  private async createModulesREADME(basePath: string): Promise<void> {
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
| **Location** | \`projects/{id}/modules/\` | \`architecture/\` (shared) or \`projects/{id}/architecture/\` (project-specific) |
| **Audience** | Developers working on module | All technical stakeholders |
| **Examples** | auth-module.md, payment-module.md | HLD, ADR, system diagrams |

---

**See**: [../README.md](../README.md) for project overview
`;

    await fs.writeFile(path.join(basePath, 'modules', 'README.md'), content);
  }

  private async createTeamREADME(basePath: string): Promise<void> {
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

**See**: [../README.md](../README.md) for project overview
`;

    await fs.writeFile(path.join(basePath, 'team', 'README.md'), content);
  }

  private async createArchitectureREADME(basePath: string): Promise<void> {
    const content = `# Project-Specific Architecture

Project-specific architecture documentation and ADRs.

## When to Use This vs Shared Architecture

### Project-Specific Architecture (\`projects/{id}/architecture/\`)
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

**See**: [../README.md](../README.md) for project overview
`;

    await fs.writeFile(path.join(basePath, 'architecture', 'README.md'), content);
  }

  private async createLegacyREADME(basePath: string): Promise<void> {
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

**See**: [../README.md](../README.md) for project overview
`;

    await fs.writeFile(path.join(basePath, 'legacy', 'README.md'), content);
  }
}
