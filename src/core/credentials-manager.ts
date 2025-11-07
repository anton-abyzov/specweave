/**
 * Secure Credentials Manager
 *
 * Handles API keys and credentials for external integrations (Jira, ADO, etc.)
 * - Loads from .env file or environment variables
 * - Validates credential format
 * - Never logs secrets
 * - Provides masked logging for debugging
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AdoCredentials {
  pat: string;
  organization: string;
  project: string;  // One project (ADO standard)
  team?: string;  // Single team (backward compatibility)
  teams?: string[];  // Multiple teams within project (comma-separated)
}

export interface JiraCredentials {
  apiToken: string;
  email: string;
  domain: string;
  strategy?: 'project-per-team' | 'component-based' | 'board-based';
  project?: string;  // Single project (backward compatibility)
  projects?: string[];  // Multiple projects (comma-separated)
  components?: string[];  // Components (component-based strategy)
  boards?: string[];  // Board IDs (board-based strategy)
}

export interface GitHubCredentials {
  token: string;
  strategy?: 'repository-per-team' | 'team-based' | 'team-multi-repo';
  owner?: string;
  repos?: string[];  // Repositories (repository-per-team)
  repo?: string;  // Single repository (team-based)
  teams?: string[];  // Teams (team-based)
  teamRepoMapping?: Record<string, string[]>;  // Team-to-repo mapping (team-multi-repo)
}

export interface CredentialsConfig {
  ado?: AdoCredentials;
  jira?: JiraCredentials;
  github?: GitHubCredentials;
}

export class CredentialsManager {
  private static instance: CredentialsManager;
  private credentials: CredentialsConfig = {};
  private envLoaded = false;

  private constructor() {
    this.loadFromEnv();
  }

  public static getInstance(): CredentialsManager {
    if (!CredentialsManager.instance) {
      CredentialsManager.instance = new CredentialsManager();
    }
    return CredentialsManager.instance;
  }

  /**
   * Load credentials from .env file or environment variables
   */
  private loadFromEnv(): void {
    // First, try to load from .env file
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const envVars = this.parseEnvFile(envContent);

      // Merge with process.env (process.env takes precedence)
      Object.keys(envVars).forEach(key => {
        if (!process.env[key]) {
          process.env[key] = envVars[key];
        }
      });
    }

    // Load ADO credentials
    if (process.env.AZURE_DEVOPS_PAT) {
      const project = process.env.AZURE_DEVOPS_PROJECT || '';
      const singleTeam = process.env.AZURE_DEVOPS_TEAM || '';
      const multiTeams = process.env.AZURE_DEVOPS_TEAMS || '';

      // Parse comma-separated teams
      const teams = multiTeams
        ? multiTeams.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : (singleTeam ? [singleTeam] : []);

      this.credentials.ado = {
        pat: process.env.AZURE_DEVOPS_PAT,
        organization: process.env.AZURE_DEVOPS_ORG || '',
        project: project,  // One project (ADO standard)
        team: singleTeam || teams[0],  // Use first team for backward compatibility
        teams: teams.length > 1 ? teams : undefined  // Multiple teams (optional)
      };
    }

    // Load Jira credentials
    if (process.env.JIRA_API_TOKEN) {
      const strategy = (process.env.JIRA_STRATEGY as any) || undefined;
      const singleProject = process.env.JIRA_PROJECT || '';
      const multiProjects = process.env.JIRA_PROJECTS || '';
      const componentsStr = process.env.JIRA_COMPONENTS || '';
      const boardsStr = process.env.JIRA_BOARDS || '';

      // Parse comma-separated values
      const projects = multiProjects
        ? multiProjects.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : (singleProject ? [singleProject] : []);

      const components = componentsStr
        ? componentsStr.split(',').map(c => c.trim()).filter(c => c.length > 0)
        : [];

      const boards = boardsStr
        ? boardsStr.split(',').map(b => b.trim()).filter(b => b.length > 0)
        : [];

      this.credentials.jira = {
        apiToken: process.env.JIRA_API_TOKEN,
        email: process.env.JIRA_EMAIL || '',
        domain: process.env.JIRA_DOMAIN || '',
        strategy,

        // Strategy 1: Project-per-team
        projects: projects.length > 0 ? projects : undefined,

        // Strategy 2: Component-based
        project: singleProject,
        components: components.length > 0 ? components : undefined,

        // Strategy 3: Board-based
        boards: boards.length > 0 ? boards : undefined
      };
    }

    // Load GitHub credentials
    if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
      const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
      const strategy = (process.env.GITHUB_STRATEGY as any) || undefined;
      const owner = process.env.GITHUB_OWNER || '';
      const reposStr = process.env.GITHUB_REPOS || '';
      const singleRepo = process.env.GITHUB_REPO || '';
      const teamsStr = process.env.GITHUB_TEAMS || '';
      const teamRepoMappingStr = process.env.GITHUB_TEAM_REPO_MAPPING || '';

      // Parse comma-separated values
      const repos = reposStr
        ? reposStr.split(',').map(r => r.trim()).filter(r => r.length > 0)
        : [];

      const teams = teamsStr
        ? teamsStr.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];

      // Parse JSON mapping
      let teamRepoMapping: Record<string, string[]> | undefined;
      if (teamRepoMappingStr) {
        try {
          teamRepoMapping = JSON.parse(teamRepoMappingStr);
        } catch (e) {
          console.error('Failed to parse GITHUB_TEAM_REPO_MAPPING:', e);
        }
      }

      this.credentials.github = {
        token,
        strategy,
        owner,

        // Strategy 1: Repository-per-team
        repos: repos.length > 0 ? repos : undefined,

        // Strategy 2: Team-based
        repo: singleRepo,
        teams: teams.length > 0 ? teams : undefined,

        // Strategy 3: Team-multi-repo
        teamRepoMapping
      };
    }

    this.envLoaded = true;
  }

  /**
   * Parse .env file content into key-value pairs
   */
  private parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get ADO credentials
   * @throws Error if credentials not found
   */
  public getAdoCredentials(): AdoCredentials {
    if (!this.credentials.ado) {
      throw new Error(
        'Azure DevOps credentials not found. Please set AZURE_DEVOPS_PAT, ' +
        'AZURE_DEVOPS_ORG, and AZURE_DEVOPS_PROJECT in .env file or environment variables.'
      );
    }

    this.validateAdoCredentials(this.credentials.ado);
    return this.credentials.ado;
  }

  /**
   * Get Jira credentials
   * @throws Error if credentials not found
   */
  public getJiraCredentials(): JiraCredentials {
    if (!this.credentials.jira) {
      throw new Error(
        'Jira credentials not found. Please set JIRA_API_TOKEN, JIRA_EMAIL, ' +
        'and JIRA_DOMAIN in .env file or environment variables.'
      );
    }

    this.validateJiraCredentials(this.credentials.jira);
    return this.credentials.jira;
  }

  /**
   * Check if ADO credentials are available
   */
  public hasAdoCredentials(): boolean {
    return !!this.credentials.ado?.pat;
  }

  /**
   * Check if Jira credentials are available
   */
  public hasJiraCredentials(): boolean {
    return !!this.credentials.jira?.apiToken;
  }

  /**
   * Validate ADO credentials format
   */
  private validateAdoCredentials(creds: AdoCredentials): void {
    if (!creds.pat || creds.pat.length !== 52) {
      console.warn(
        `⚠️  Azure DevOps PAT length unexpected. Expected: 52 characters, Got: ${creds.pat.length}`
      );
    }

    if (!creds.organization || !/^[a-zA-Z0-9-]+$/.test(creds.organization)) {
      throw new Error(
        `Invalid Azure DevOps organization: "${creds.organization}". ` +
        'Expected: alphanumeric and hyphens only.'
      );
    }

    if (!creds.project) {
      throw new Error('Azure DevOps project name is required.');
    }
  }

  /**
   * Validate Jira credentials format
   */
  private validateJiraCredentials(creds: JiraCredentials): void {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(creds.email)) {
      throw new Error(
        `Invalid Jira email: "${creds.email}". Expected: valid email address.`
      );
    }

    if (!creds.domain.includes('.atlassian.net') && !creds.domain.includes('://')) {
      console.warn(
        `⚠️  Jira domain format unexpected: "${creds.domain}". ` +
        'Expected: *.atlassian.net or custom domain with protocol.'
      );
    }

    if (!creds.apiToken) {
      throw new Error('Jira API token is required.');
    }
  }

  /**
   * Get masked version of credentials for logging (safe to display)
   */
  public getMaskedAdoInfo(): string {
    if (!this.credentials.ado) {
      return 'ADO credentials: Not configured';
    }

    const lines = [
      'ADO credentials:',
      `  PAT: ${this.maskSecret(this.credentials.ado.pat)}`,
      `  Organization: ${this.credentials.ado.organization}`,
      `  Project: ${this.credentials.ado.project}`
    ];

    if (this.credentials.ado.teams && this.credentials.ado.teams.length > 1) {
      lines.push(`  Teams (${this.credentials.ado.teams.length}): ${this.credentials.ado.teams.join(', ')}`);
    } else if (this.credentials.ado.team) {
      lines.push(`  Team: ${this.credentials.ado.team}`);
    }

    return lines.join('\n');
  }

  /**
   * Get masked version of credentials for logging (safe to display)
   */
  public getMaskedJiraInfo(): string {
    if (!this.credentials.jira) {
      return 'Jira credentials: Not configured';
    }

    const lines = [
      'Jira credentials:',
      `  API Token: ${this.maskSecret(this.credentials.jira.apiToken)}`,
      `  Email: ${this.credentials.jira.email}`,
      `  Domain: ${this.credentials.jira.domain}`
    ];

    if (this.credentials.jira.projects && this.credentials.jira.projects.length > 1) {
      lines.push(`  Projects (${this.credentials.jira.projects.length}): ${this.credentials.jira.projects.join(', ')}`);
    } else if (this.credentials.jira.project) {
      lines.push(`  Project: ${this.credentials.jira.project}`);
    }

    return lines.join('\n');
  }

  /**
   * Mask a secret for safe logging
   */
  private maskSecret(secret: string): string {
    if (!secret) return '[EMPTY]';
    if (secret.length <= 8) return '****';

    const visibleChars = 4;
    const start = secret.slice(0, visibleChars);
    const end = secret.slice(-visibleChars);
    return `${start}...${end} (${secret.length} chars)`;
  }

  /**
   * Save credentials to .env file (with backup)
   */
  public saveToEnvFile(config: Partial<CredentialsConfig>): void {
    const envPath = path.join(process.cwd(), '.env');

    // Backup existing .env
    if (fs.existsSync(envPath)) {
      const backup = `${envPath}.backup.${Date.now()}`;
      fs.copyFileSync(envPath, backup);
      console.log(`📦 Backed up existing .env to: ${backup}`);
    }

    // Read existing content
    let existingContent = '';
    let existingVars: Record<string, string> = {};
    if (fs.existsSync(envPath)) {
      existingContent = fs.readFileSync(envPath, 'utf-8');
      existingVars = this.parseEnvFile(existingContent);
    }

    // Update with new credentials
    if (config.ado) {
      existingVars.AZURE_DEVOPS_PAT = config.ado.pat;
      existingVars.AZURE_DEVOPS_ORG = config.ado.organization;
      existingVars.AZURE_DEVOPS_PROJECT = config.ado.project;  // Always singular (one project)

      // Write teams as comma-separated if multiple, otherwise single
      if (config.ado.teams && config.ado.teams.length > 1) {
        existingVars.AZURE_DEVOPS_TEAMS = config.ado.teams.join(',');
        // Remove singular form to avoid confusion
        delete existingVars.AZURE_DEVOPS_TEAM;
      } else if (config.ado.team) {
        existingVars.AZURE_DEVOPS_TEAM = config.ado.team;
        // Remove plural form if only one team
        delete existingVars.AZURE_DEVOPS_TEAMS;
      }
    }

    if (config.jira) {
      existingVars.JIRA_API_TOKEN = config.jira.apiToken;
      existingVars.JIRA_EMAIL = config.jira.email;
      existingVars.JIRA_DOMAIN = config.jira.domain;

      // Write strategy if specified
      if (config.jira.strategy) {
        existingVars.JIRA_STRATEGY = config.jira.strategy;
      }

      // Strategy 1: Project-per-team (multiple projects)
      if (config.jira.strategy === 'project-per-team' && config.jira.projects) {
        existingVars.JIRA_PROJECTS = config.jira.projects.join(',');
        delete existingVars.JIRA_PROJECT;
        delete existingVars.JIRA_COMPONENTS;
        delete existingVars.JIRA_BOARDS;
      }
      // Strategy 2: Component-based (one project, multiple components)
      else if (config.jira.strategy === 'component-based') {
        if (config.jira.project) {
          existingVars.JIRA_PROJECT = config.jira.project;
        }
        if (config.jira.components) {
          existingVars.JIRA_COMPONENTS = config.jira.components.join(',');
        }
        delete existingVars.JIRA_PROJECTS;
        delete existingVars.JIRA_BOARDS;
      }
      // Strategy 3: Board-based (one project, board IDs)
      else if (config.jira.strategy === 'board-based') {
        if (config.jira.project) {
          existingVars.JIRA_PROJECT = config.jira.project;
        }
        if (config.jira.boards) {
          existingVars.JIRA_BOARDS = config.jira.boards.join(',');
        }
        delete existingVars.JIRA_PROJECTS;
        delete existingVars.JIRA_COMPONENTS;
      }
      // Legacy: No strategy (backward compatibility)
      else if (config.jira.projects && config.jira.projects.length > 1) {
        existingVars.JIRA_PROJECTS = config.jira.projects.join(',');
        delete existingVars.JIRA_PROJECT;
      } else if (config.jira.project) {
        existingVars.JIRA_PROJECT = config.jira.project;
        delete existingVars.JIRA_PROJECTS;
      }
    }

    if (config.github) {
      existingVars.GH_TOKEN = config.github.token;

      // Write strategy if specified
      if (config.github.strategy) {
        existingVars.GITHUB_STRATEGY = config.github.strategy;
      }

      // Write owner
      if (config.github.owner) {
        existingVars.GITHUB_OWNER = config.github.owner;
      }

      // Strategy 1: Repository-per-team
      if (config.github.strategy === 'repository-per-team' && config.github.repos) {
        existingVars.GITHUB_REPOS = config.github.repos.join(',');
        delete existingVars.GITHUB_REPO;
        delete existingVars.GITHUB_TEAMS;
        delete existingVars.GITHUB_TEAM_REPO_MAPPING;
      }
      // Strategy 2: Team-based (monorepo)
      else if (config.github.strategy === 'team-based') {
        if (config.github.repo) {
          existingVars.GITHUB_REPO = config.github.repo;
        }
        if (config.github.teams) {
          existingVars.GITHUB_TEAMS = config.github.teams.join(',');
        }
        delete existingVars.GITHUB_REPOS;
        delete existingVars.GITHUB_TEAM_REPO_MAPPING;
      }
      // Strategy 3: Team-multi-repo
      else if (config.github.strategy === 'team-multi-repo' && config.github.teamRepoMapping) {
        existingVars.GITHUB_TEAM_REPO_MAPPING = JSON.stringify(config.github.teamRepoMapping);
        delete existingVars.GITHUB_REPOS;
        delete existingVars.GITHUB_REPO;
        delete existingVars.GITHUB_TEAMS;
      }
    }

    // Write back to .env
    const newContent = Object.entries(existingVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(envPath, newContent + '\n', 'utf-8');
    console.log('✅ Credentials saved to .env');

    // Ensure .env is in .gitignore
    this.ensureGitignore();

    // Reload credentials
    this.loadFromEnv();
  }

  /**
   * Ensure .env is in .gitignore
   */
  private ensureGitignore(): void {
    const gitignorePath = path.join(process.cwd(), '.gitignore');

    let gitignoreContent = '';
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    }

    if (!gitignoreContent.includes('.env')) {
      fs.appendFileSync(gitignorePath, '\n# Environment variables\n.env\n.env.*.backup\n');
      console.log('✅ Added .env to .gitignore');
    }
  }

  /**
   * Create .env.example file for team
   */
  public createEnvExample(): void {
    const examplePath = path.join(process.cwd(), '.env.example');

    const exampleContent = `# Azure DevOps Personal Access Token
# Get from: https://dev.azure.com/{org}/_usersSettings/tokens
# Scopes: Work Items (Read, Write, Manage), Code (Read), Project (Read)
AZURE_DEVOPS_PAT=your-ado-pat-52-chars-base64
AZURE_DEVOPS_ORG=your-organization-name
AZURE_DEVOPS_PROJECT=your-project-name

# Single team (optional)
# AZURE_DEVOPS_TEAM=your-team-name

# OR multiple teams (comma-separated)
# AZURE_DEVOPS_TEAMS=Frontend,Backend,Mobile

# Jira API Token
# Get from: https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_API_TOKEN=your-jira-api-token
JIRA_EMAIL=your-email@example.com
JIRA_DOMAIN=your-domain.atlassian.net

# Single project (optional, for backward compatibility)
# JIRA_PROJECT=your-project-key

# OR multiple projects (comma-separated)
# JIRA_PROJECTS=PROJ1,PROJ2,PROJ3
`;

    fs.writeFileSync(examplePath, exampleContent, 'utf-8');
    console.log('✅ Created .env.example (safe to commit)');
  }
}

// Export singleton instance
export const credentialsManager = CredentialsManager.getInstance();
