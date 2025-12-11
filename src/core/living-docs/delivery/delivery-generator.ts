/**
 * Delivery Documentation Generator
 *
 * Generates documentation about delivery processes:
 * - CI/CD pipeline documentation
 * - Release history from git tags
 * - Deployment guides from IaC templates
 * - Environment configurations
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';
import { Logger, consoleLogger } from '../../../utils/logger.js';

export interface DeliveryGeneratorOptions {
  projectPath: string;
  projectName?: string;
  logger?: Logger;
}

export interface DeliveryGenerationResult {
  filesCreated: string[];
  savedFiles: string[];  // Alias for consistency
  pipelinesFound: number;
  releasesFound: number;
  environmentsFound: number;
}

/**
 * Generates delivery-related documentation
 */
export class DeliveryGenerator {
  private projectPath: string;
  private logger: Logger;
  private deliveryPath: string;

  constructor(options: DeliveryGeneratorOptions) {
    this.projectPath = options.projectPath;
    this.logger = options.logger ?? consoleLogger;
    this.deliveryPath = path.join(this.projectPath, '.specweave/docs/internal/delivery');
  }

  /**
   * Generate all delivery documentation
   */
  async generate(): Promise<DeliveryGenerationResult> {
    const filesCreated: string[] = [];
    let pipelinesFound = 0;
    let releasesFound = 0;
    let environmentsFound = 0;

    // Ensure delivery directory exists
    fs.mkdirSync(this.deliveryPath, { recursive: true });

    // 1. Generate CI/CD Pipeline documentation
    this.logger.info('  Analyzing CI/CD pipelines...');
    const pipelineResult = await this.generatePipelineDocs();
    if (pipelineResult.file) {
      filesCreated.push(pipelineResult.file);
      pipelinesFound = pipelineResult.count;
    }

    // 2. Generate Release History
    this.logger.info('  Analyzing release history...');
    const releaseResult = await this.generateReleaseHistory();
    if (releaseResult.file) {
      filesCreated.push(releaseResult.file);
      releasesFound = releaseResult.count;
    }

    // 3. Generate Deployment Guide
    this.logger.info('  Generating deployment guide...');
    const deployResult = await this.generateDeploymentGuide();
    if (deployResult.file) {
      filesCreated.push(deployResult.file);
    }

    // 4. Generate Environments documentation
    this.logger.info('  Analyzing environments...');
    const envResult = await this.generateEnvironmentsDocs();
    if (envResult.file) {
      filesCreated.push(envResult.file);
      environmentsFound = envResult.count;
    }

    return {
      filesCreated,
      savedFiles: filesCreated,  // Alias for consistency
      pipelinesFound,
      releasesFound,
      environmentsFound,
    };
  }

  /**
   * Generate CI/CD pipeline documentation
   */
  private async generatePipelineDocs(): Promise<{ file: string | null; count: number }> {
    const pipelines: PipelineInfo[] = [];

    // Check GitHub Actions
    const ghActionsPath = path.join(this.projectPath, '.github/workflows');
    if (fs.existsSync(ghActionsPath)) {
      const workflows = await glob('*.{yml,yaml}', { cwd: ghActionsPath });
      for (const wf of workflows) {
        const info = this.parseGitHubWorkflow(path.join(ghActionsPath, wf));
        if (info) pipelines.push(info);
      }
    }

    // Check GitLab CI
    const gitlabCiPath = path.join(this.projectPath, '.gitlab-ci.yml');
    if (fs.existsSync(gitlabCiPath)) {
      const info = this.parseGitLabCI(gitlabCiPath);
      if (info) pipelines.push(info);
    }

    // Check Azure Pipelines
    const azurePipelinesPath = path.join(this.projectPath, 'azure-pipelines.yml');
    if (fs.existsSync(azurePipelinesPath)) {
      const info = this.parseAzurePipeline(azurePipelinesPath);
      if (info) pipelines.push(info);
    }

    // Check package.json scripts
    const pkgScripts = this.parsePackageJsonScripts();
    if (pkgScripts) pipelines.push(pkgScripts);

    if (pipelines.length === 0) {
      return { file: null, count: 0 };
    }

    // Generate documentation
    const lines: string[] = [
      '# CI/CD Pipeline Documentation',
      '',
      `*Generated: ${new Date().toLocaleDateString()} | Pipelines: ${pipelines.length}*`,
      '',
      '## Overview',
      '',
      '| Pipeline | Provider | Triggers | Jobs |',
      '|----------|----------|----------|------|',
    ];

    for (const pipeline of pipelines) {
      const triggers = pipeline.triggers.slice(0, 3).join(', ');
      lines.push(`| ${pipeline.name} | ${pipeline.provider} | ${triggers} | ${pipeline.jobs.length} |`);
    }

    lines.push('');

    // Pipeline details
    lines.push('## Pipeline Details', '');

    for (const pipeline of pipelines) {
      lines.push(`### ${pipeline.name}`, '');
      lines.push(`**Provider**: ${pipeline.provider}`);
      lines.push(`**File**: \`${pipeline.filePath}\``);
      lines.push('');

      if (pipeline.triggers.length > 0) {
        lines.push('**Triggers**:', '');
        for (const trigger of pipeline.triggers) {
          lines.push(`- ${trigger}`);
        }
        lines.push('');
      }

      if (pipeline.jobs.length > 0) {
        lines.push('**Jobs/Steps**:', '');
        for (const job of pipeline.jobs) {
          lines.push(`- **${job.name}**: ${job.description || 'No description'}`);
        }
        lines.push('');
      }

      if (pipeline.environments.length > 0) {
        lines.push('**Environments**:', '');
        for (const env of pipeline.environments) {
          lines.push(`- ${env}`);
        }
        lines.push('');
      }
    }

    // Mermaid diagram
    lines.push('## Pipeline Flow', '');
    lines.push('```mermaid', 'graph LR');

    for (const pipeline of pipelines.slice(0, 5)) {
      const pId = pipeline.name.replace(/[^a-zA-Z0-9]/g, '_');
      lines.push(`    trigger_${pId}((${pipeline.triggers[0] || 'manual'})) --> ${pId}[${pipeline.name}]`);

      let prevJob = pId;
      for (const job of pipeline.jobs.slice(0, 5)) {
        const jId = `${pId}_${job.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        lines.push(`    ${prevJob} --> ${jId}[${job.name}]`);
        prevJob = jId;
      }
    }

    lines.push('```', '');
    lines.push('---', `*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.deliveryPath, 'CI-CD-PIPELINE.md');
    fs.writeFileSync(filePath, lines.join('\n'));

    return { file: filePath, count: pipelines.length };
  }

  /**
   * Generate release history
   */
  private async generateReleaseHistory(): Promise<{ file: string | null; count: number }> {
    const releases: ReleaseInfo[] = [];

    try {
      // Get all tags with creation dates
      const tagOutput = execSync(
        'git tag -l --format="%(refname:short)|%(creatordate:iso8601)|%(subject)"',
        { cwd: this.projectPath, encoding: 'utf-8' }
      );

      const tagLines = tagOutput.trim().split('\n').filter(Boolean);

      for (const line of tagLines) {
        const [version, date, subject] = line.split('|');
        if (!version) continue;

        // Get changelog for this release
        const changelog = this.getChangelogForTag(version);

        releases.push({
          version,
          date: date?.substring(0, 10) || 'unknown',
          subject: subject || '',
          changelog,
        });
      }
    } catch (err: any) {
      this.logger.debug(`Failed to get git tags: ${err.message}`);
    }

    if (releases.length === 0) {
      return { file: null, count: 0 };
    }

    // Sort by date descending
    releases.sort((a, b) => b.date.localeCompare(a.date));

    // Generate documentation
    const lines: string[] = [
      '# Release History',
      '',
      `*Generated: ${new Date().toLocaleDateString()} | Total Releases: ${releases.length}*`,
      '',
      '## Releases',
      '',
    ];

    for (const release of releases.slice(0, 50)) {
      lines.push(`### ${release.version}`, '');
      lines.push(`**Date**: ${release.date}`);
      if (release.subject) {
        lines.push(`**Summary**: ${release.subject}`);
      }
      lines.push('');

      if (release.changelog.length > 0) {
        lines.push('**Changes**:', '');
        for (const change of release.changelog.slice(0, 10)) {
          lines.push(`- ${change}`);
        }
        if (release.changelog.length > 10) {
          lines.push(`- *... ${release.changelog.length - 10} more changes*`);
        }
        lines.push('');
      }
    }

    if (releases.length > 50) {
      lines.push(`*Showing 50 of ${releases.length} releases*`, '');
    }

    lines.push('---', `*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.deliveryPath, 'RELEASE-HISTORY.md');
    fs.writeFileSync(filePath, lines.join('\n'));

    return { file: filePath, count: releases.length };
  }

  /**
   * Generate deployment guide
   */
  private async generateDeploymentGuide(): Promise<{ file: string | null }> {
    const lines: string[] = [
      '# Deployment Guide',
      '',
      `*Generated: ${new Date().toLocaleDateString()}*`,
      '',
      '## Quick Start',
      '',
    ];

    // Check for common deployment patterns
    const hasDocker = fs.existsSync(path.join(this.projectPath, 'Dockerfile'));
    const hasDockerCompose = fs.existsSync(path.join(this.projectPath, 'docker-compose.yml'));
    const hasTerraform = fs.existsSync(path.join(this.projectPath, 'terraform')) ||
                         fs.existsSync(path.join(this.projectPath, 'infrastructure'));
    const hasK8s = fs.existsSync(path.join(this.projectPath, 'k8s')) ||
                   fs.existsSync(path.join(this.projectPath, 'kubernetes'));
    const hasServerless = fs.existsSync(path.join(this.projectPath, 'serverless.yml')) ||
                          fs.existsSync(path.join(this.projectPath, 'serverless.ts'));
    const hasNpm = fs.existsSync(path.join(this.projectPath, 'package.json'));

    if (hasNpm) {
      lines.push('### NPM/Node.js', '', '```bash', 'npm install', 'npm run build', 'npm start', '```', '');
    }

    if (hasDocker) {
      lines.push('### Docker', '', '```bash', 'docker build -t app .', 'docker run -p 3000:3000 app', '```', '');
    }

    if (hasDockerCompose) {
      lines.push('### Docker Compose', '', '```bash', 'docker-compose up -d', '```', '');
    }

    if (hasTerraform) {
      lines.push('### Terraform', '', '```bash', 'cd terraform', 'terraform init', 'terraform plan', 'terraform apply', '```', '');
    }

    if (hasK8s) {
      lines.push('### Kubernetes', '', '```bash', 'kubectl apply -f k8s/', '```', '');
    }

    if (hasServerless) {
      lines.push('### Serverless', '', '```bash', 'serverless deploy', '```', '');
    }

    // Prerequisites
    lines.push('## Prerequisites', '');
    const prereqs: string[] = [];

    if (hasNpm) prereqs.push('Node.js >= 18');
    if (hasDocker) prereqs.push('Docker');
    if (hasTerraform) prereqs.push('Terraform >= 1.0');
    if (hasK8s) prereqs.push('kubectl configured');

    for (const prereq of prereqs) {
      lines.push(`- ${prereq}`);
    }

    lines.push('', '## Environment Variables', '');
    lines.push('See `ENVIRONMENTS.md` for environment-specific configuration.', '');

    lines.push('---', `*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.deliveryPath, 'DEPLOYMENT-GUIDE.md');
    fs.writeFileSync(filePath, lines.join('\n'));

    return { file: filePath };
  }

  /**
   * Generate environments documentation
   */
  private async generateEnvironmentsDocs(): Promise<{ file: string | null; count: number }> {
    const environments: EnvironmentInfo[] = [];

    // Check for .env files
    const envFiles = await glob('.env*', { cwd: this.projectPath, nodir: true });
    for (const envFile of envFiles) {
      const envName = envFile.replace('.env.', '').replace('.env', 'default');
      environments.push({
        name: envName,
        type: 'env-file',
        variables: this.countEnvVariables(path.join(this.projectPath, envFile)),
      });
    }

    // Check for environment folders in IaC
    const envFolders = ['dev', 'staging', 'production', 'prod', 'test'];
    for (const folder of envFolders) {
      const tfPath = path.join(this.projectPath, 'terraform', folder);
      const k8sPath = path.join(this.projectPath, 'k8s', folder);

      if (fs.existsSync(tfPath)) {
        environments.push({ name: folder, type: 'terraform', path: tfPath });
      }
      if (fs.existsSync(k8sPath)) {
        environments.push({ name: folder, type: 'kubernetes', path: k8sPath });
      }
    }

    // Generate documentation
    const lines: string[] = [
      '# Environment Configuration',
      '',
      `*Generated: ${new Date().toLocaleDateString()} | Environments: ${environments.length}*`,
      '',
      '## Environments Overview',
      '',
      '| Environment | Type | Details |',
      '|-------------|------|---------|',
    ];

    for (const env of environments) {
      const details = env.variables ? `${env.variables} variables` : env.path || '-';
      lines.push(`| ${env.name} | ${env.type} | ${details} |`);
    }

    lines.push('', '## Environment Details', '');

    for (const env of environments) {
      lines.push(`### ${env.name}`, '');
      lines.push(`**Type**: ${env.type}`);
      if (env.path) {
        lines.push(`**Path**: \`${env.path}\``);
      }
      if (env.variables) {
        lines.push(`**Variables**: ${env.variables}`);
      }
      lines.push('');
    }

    // Best practices
    lines.push('## Best Practices', '');
    lines.push('1. Never commit `.env` files with secrets');
    lines.push('2. Use environment-specific config files');
    lines.push('3. Rotate secrets regularly');
    lines.push('4. Use secrets management (Vault, AWS Secrets Manager)');
    lines.push('');

    lines.push('---', `*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.deliveryPath, 'ENVIRONMENTS.md');
    fs.writeFileSync(filePath, lines.join('\n'));

    return { file: filePath, count: environments.length };
  }

  // Helper methods

  private parseGitHubWorkflow(filePath: string): PipelineInfo | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const name = path.basename(filePath, path.extname(filePath));

      const triggers: string[] = [];
      if (content.includes('push:')) triggers.push('push');
      if (content.includes('pull_request:')) triggers.push('pull_request');
      if (content.includes('schedule:')) triggers.push('schedule');
      if (content.includes('workflow_dispatch:')) triggers.push('manual');

      const jobs: JobInfo[] = [];
      const jobMatch = content.match(/jobs:\s*\n([\s\S]*?)(?=\n[a-z]|$)/);
      if (jobMatch) {
        const jobNames = jobMatch[1].match(/^\s{2}(\w+):/gm);
        if (jobNames) {
          for (const jn of jobNames) {
            jobs.push({ name: jn.trim().replace(':', ''), description: '' });
          }
        }
      }

      return {
        name,
        provider: 'GitHub Actions',
        filePath: `.github/workflows/${path.basename(filePath)}`,
        triggers,
        jobs,
        environments: [],
      };
    } catch {
      return null;
    }
  }

  private parseGitLabCI(filePath: string): PipelineInfo | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      const jobs: JobInfo[] = [];
      const stages = content.match(/^[a-z][\w-]+:/gm);
      if (stages) {
        for (const stage of stages) {
          if (!stage.match(/^(stages|variables|default|include):/)) {
            jobs.push({ name: stage.replace(':', ''), description: '' });
          }
        }
      }

      return {
        name: 'GitLab CI',
        provider: 'GitLab',
        filePath: '.gitlab-ci.yml',
        triggers: ['push', 'merge_request'],
        jobs,
        environments: [],
      };
    } catch {
      return null;
    }
  }

  private parseAzurePipeline(filePath: string): PipelineInfo | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      const jobs: JobInfo[] = [];
      const stages = content.match(/- stage:\s*(\w+)/g);
      if (stages) {
        for (const stage of stages) {
          const name = stage.replace('- stage:', '').trim();
          jobs.push({ name, description: '' });
        }
      }

      return {
        name: 'Azure Pipeline',
        provider: 'Azure DevOps',
        filePath: 'azure-pipelines.yml',
        triggers: ['push'],
        jobs,
        environments: [],
      };
    } catch {
      return null;
    }
  }

  private parsePackageJsonScripts(): PipelineInfo | null {
    const pkgPath = path.join(this.projectPath, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const scripts = pkg.scripts || {};

      const jobs: JobInfo[] = [];
      const relevantScripts = ['build', 'test', 'lint', 'deploy', 'release', 'publish'];

      for (const script of relevantScripts) {
        if (scripts[script]) {
          jobs.push({ name: script, description: scripts[script] });
        }
      }

      if (jobs.length === 0) return null;

      return {
        name: 'NPM Scripts',
        provider: 'npm',
        filePath: 'package.json',
        triggers: ['manual'],
        jobs,
        environments: [],
      };
    } catch {
      return null;
    }
  }

  private getChangelogForTag(version: string): string[] {
    try {
      const prevTag = execSync(
        `git describe --tags --abbrev=0 ${version}^ 2>/dev/null || echo ""`,
        { cwd: this.projectPath, encoding: 'utf-8' }
      ).trim();

      const range = prevTag ? `${prevTag}..${version}` : version;
      const log = execSync(
        `git log ${range} --oneline 2>/dev/null || echo ""`,
        { cwd: this.projectPath, encoding: 'utf-8' }
      );

      return log.trim().split('\n')
        .filter(Boolean)
        .map(line => line.replace(/^[a-f0-9]+\s+/, ''));
    } catch {
      return [];
    }
  }

  private countEnvVariables(filePath: string): number {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      return lines.length;
    } catch {
      return 0;
    }
  }
}

// Types

interface PipelineInfo {
  name: string;
  provider: string;
  filePath: string;
  triggers: string[];
  jobs: JobInfo[];
  environments: string[];
}

interface JobInfo {
  name: string;
  description: string;
}

interface ReleaseInfo {
  version: string;
  date: string;
  subject: string;
  changelog: string[];
}

interface EnvironmentInfo {
  name: string;
  type: string;
  path?: string;
  variables?: number;
}
