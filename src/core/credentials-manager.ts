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
  project: string;  // Single project (backward compatibility)
  projects?: string[];  // Multiple projects (comma-separated)
}

export interface JiraCredentials {
  apiToken: string;
  email: string;
  domain: string;
  project?: string;  // Single project (backward compatibility)
  projects?: string[];  // Multiple projects (comma-separated)
}

export interface CredentialsConfig {
  ado?: AdoCredentials;
  jira?: JiraCredentials;
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
      const singleProject = process.env.AZURE_DEVOPS_PROJECT || '';
      const multiProjects = process.env.AZURE_DEVOPS_PROJECTS || '';

      // Parse comma-separated projects
      const projects = multiProjects
        ? multiProjects.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : (singleProject ? [singleProject] : []);

      this.credentials.ado = {
        pat: process.env.AZURE_DEVOPS_PAT,
        organization: process.env.AZURE_DEVOPS_ORG || '',
        project: singleProject || projects[0] || '',  // Use first project for backward compatibility
        projects: projects.length > 0 ? projects : undefined
      };
    }

    // Load Jira credentials
    if (process.env.JIRA_API_TOKEN) {
      const singleProject = process.env.JIRA_PROJECT || '';
      const multiProjects = process.env.JIRA_PROJECTS || '';

      // Parse comma-separated projects
      const projects = multiProjects
        ? multiProjects.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : (singleProject ? [singleProject] : []);

      this.credentials.jira = {
        apiToken: process.env.JIRA_API_TOKEN,
        email: process.env.JIRA_EMAIL || '',
        domain: process.env.JIRA_DOMAIN || '',
        project: singleProject || projects[0],
        projects: projects.length > 0 ? projects : undefined
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
      `  Organization: ${this.credentials.ado.organization}`
    ];

    if (this.credentials.ado.projects && this.credentials.ado.projects.length > 1) {
      lines.push(`  Projects (${this.credentials.ado.projects.length}): ${this.credentials.ado.projects.join(', ')}`);
    } else {
      lines.push(`  Project: ${this.credentials.ado.project}`);
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

      // Write projects as comma-separated if multiple, otherwise single
      if (config.ado.projects && config.ado.projects.length > 1) {
        existingVars.AZURE_DEVOPS_PROJECTS = config.ado.projects.join(',');
        // Remove singular form to avoid confusion
        delete existingVars.AZURE_DEVOPS_PROJECT;
      } else {
        existingVars.AZURE_DEVOPS_PROJECT = config.ado.project;
        // Remove plural form if only one project
        delete existingVars.AZURE_DEVOPS_PROJECTS;
      }
    }

    if (config.jira) {
      existingVars.JIRA_API_TOKEN = config.jira.apiToken;
      existingVars.JIRA_EMAIL = config.jira.email;
      existingVars.JIRA_DOMAIN = config.jira.domain;

      // Write projects as comma-separated if multiple, otherwise single
      if (config.jira.projects && config.jira.projects.length > 1) {
        existingVars.JIRA_PROJECTS = config.jira.projects.join(',');
        // Remove singular form to avoid confusion
        delete existingVars.JIRA_PROJECT;
      } else if (config.jira.project) {
        existingVars.JIRA_PROJECT = config.jira.project;
        // Remove plural form if only one project
        delete existingVars.JIRA_PROJECTS;
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

# Single project (backward compatibility)
AZURE_DEVOPS_PROJECT=your-project-name

# OR multiple projects (comma-separated)
# AZURE_DEVOPS_PROJECTS=project1,project2,project3

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
