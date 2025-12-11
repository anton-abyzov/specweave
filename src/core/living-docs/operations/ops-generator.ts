/**
 * Operations Documentation Generator
 *
 * Generates operational documentation:
 * - Runbooks from hook scripts and patterns
 * - Monitoring guidance
 * - Incident templates
 * - SLA tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Logger, consoleLogger } from '../../../utils/logger.js';

export interface OpsGeneratorOptions {
  projectPath: string;
  projectName?: string;
  logger?: Logger;
}

export interface OpsGenerationResult {
  filesCreated: string[];
  savedFiles: string[];  // Alias for consistency
  runbooksFound: number;
  monitoringConfigsFound: number;
}

/**
 * Generates operations documentation
 */
export class OpsGenerator {
  private projectPath: string;
  private logger: Logger;
  private opsPath: string;

  constructor(options: OpsGeneratorOptions) {
    this.projectPath = options.projectPath;
    this.logger = options.logger ?? consoleLogger;
    this.opsPath = path.join(this.projectPath, '.specweave/docs/internal/operations');
  }

  /**
   * Generate all operations documentation
   */
  async generate(): Promise<OpsGenerationResult> {
    const filesCreated: string[] = [];

    // Ensure operations directory exists
    fs.mkdirSync(this.opsPath, { recursive: true });

    // 1. Generate Runbooks
    this.logger.info('  Generating runbooks...');
    const runbookResult = await this.generateRunbooks();
    if (runbookResult.file) {
      filesCreated.push(runbookResult.file);
    }

    // 2. Generate Monitoring documentation
    this.logger.info('  Generating monitoring docs...');
    const monitoringResult = await this.generateMonitoringDocs();
    if (monitoringResult.file) {
      filesCreated.push(monitoringResult.file);
    }

    // 3. Generate Incident templates
    this.logger.info('  Generating incident templates...');
    const incidentResult = await this.generateIncidentDocs();
    if (incidentResult.file) {
      filesCreated.push(incidentResult.file);
    }

    // 4. Generate SLA documentation
    this.logger.info('  Generating SLA docs...');
    const slaResult = await this.generateSLADocs();
    if (slaResult.file) {
      filesCreated.push(slaResult.file);
    }

    return {
      filesCreated,
      savedFiles: filesCreated,  // Alias for consistency
      runbooksFound: runbookResult.count,
      monitoringConfigsFound: monitoringResult.count,
    };
  }

  /**
   * Generate runbooks from hooks and scripts
   */
  private async generateRunbooks(): Promise<{ file: string | null; count: number }> {
    const runbooks: RunbookInfo[] = [];

    // Find hook scripts
    const hookPaths = [
      path.join(this.projectPath, 'plugins/specweave/hooks'),
      path.join(this.projectPath, '.specweave/hooks'),
    ];

    for (const hookPath of hookPaths) {
      if (!fs.existsSync(hookPath)) continue;

      const scripts = await glob('**/*.sh', { cwd: hookPath, nodir: true });
      for (const script of scripts) {
        const info = this.parseHookScript(path.join(hookPath, script));
        if (info) {
          runbooks.push({
            name: info.name,
            description: info.description,
            type: 'hook',
            source: script,
            steps: info.steps,
          });
        }
      }
    }

    // Find shell scripts in scripts/ folder
    const scriptsPath = path.join(this.projectPath, 'scripts');
    if (fs.existsSync(scriptsPath)) {
      const scripts = await glob('**/*.sh', { cwd: scriptsPath, nodir: true });
      for (const script of scripts) {
        const info = this.parseHookScript(path.join(scriptsPath, script));
        if (info) {
          runbooks.push({
            name: info.name,
            description: info.description,
            type: 'script',
            source: `scripts/${script}`,
            steps: info.steps,
          });
        }
      }
    }

    // Add standard runbooks based on detected patterns
    const standardRunbooks = this.generateStandardRunbooks();
    runbooks.push(...standardRunbooks);

    // Generate documentation
    const lines: string[] = [
      '# Operational Runbooks',
      '',
      `*Generated: ${new Date().toLocaleDateString()} | Runbooks: ${runbooks.length}*`,
      '',
      '## Quick Reference',
      '',
      '| Runbook | Type | Description |',
      '|---------|------|-------------|',
    ];

    for (const rb of runbooks) {
      lines.push(`| [${rb.name}](#${rb.name.toLowerCase().replace(/\s+/g, '-')}) | ${rb.type} | ${rb.description.substring(0, 50)}... |`);
    }

    lines.push('', '## Runbook Details', '');

    for (const rb of runbooks) {
      lines.push(`### ${rb.name}`, '');
      lines.push(`**Type**: ${rb.type}`);
      if (rb.source) {
        lines.push(`**Source**: \`${rb.source}\``);
      }
      lines.push('');
      lines.push(rb.description, '');

      if (rb.steps.length > 0) {
        lines.push('**Steps**:', '');
        for (let i = 0; i < rb.steps.length; i++) {
          lines.push(`${i + 1}. ${rb.steps[i]}`);
        }
        lines.push('');
      }
    }

    lines.push('---', `*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.opsPath, 'RUNBOOKS.md');
    fs.writeFileSync(filePath, lines.join('\n'));

    return { file: filePath, count: runbooks.length };
  }

  /**
   * Generate monitoring documentation
   */
  private async generateMonitoringDocs(): Promise<{ file: string | null; count: number }> {
    const monitoringConfigs: MonitoringInfo[] = [];

    // Check for common monitoring configurations
    const prometheusPath = path.join(this.projectPath, 'prometheus.yml');
    if (fs.existsSync(prometheusPath)) {
      monitoringConfigs.push({
        name: 'Prometheus',
        type: 'metrics',
        configFile: 'prometheus.yml',
      });
    }

    const grafanaPath = path.join(this.projectPath, 'grafana');
    if (fs.existsSync(grafanaPath)) {
      monitoringConfigs.push({
        name: 'Grafana',
        type: 'dashboards',
        configFile: 'grafana/',
      });
    }

    // Check package.json for monitoring dependencies
    const pkgPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps['prom-client']) {
          monitoringConfigs.push({ name: 'Prometheus Client', type: 'metrics' });
        }
        if (deps['dd-trace']) {
          monitoringConfigs.push({ name: 'Datadog APM', type: 'tracing' });
        }
        if (deps['@opentelemetry/api']) {
          monitoringConfigs.push({ name: 'OpenTelemetry', type: 'tracing' });
        }
        if (deps['newrelic']) {
          monitoringConfigs.push({ name: 'New Relic', type: 'apm' });
        }
      } catch { /* ignore */ }
    }

    // Generate documentation
    const lines: string[] = [
      '# Monitoring Documentation',
      '',
      `*Generated: ${new Date().toLocaleDateString()}*`,
      '',
      '## Monitoring Stack',
      '',
      '| Tool | Type | Config |',
      '|------|------|--------|',
    ];

    for (const config of monitoringConfigs) {
      lines.push(`| ${config.name} | ${config.type} | ${config.configFile || '-'} |`);
    }

    lines.push('', '## Key Metrics to Monitor', '');
    lines.push('### Application Metrics', '');
    lines.push('- Request latency (p50, p95, p99)');
    lines.push('- Error rate');
    lines.push('- Request throughput');
    lines.push('- Active connections');
    lines.push('');

    lines.push('### Infrastructure Metrics', '');
    lines.push('- CPU utilization');
    lines.push('- Memory usage');
    lines.push('- Disk I/O');
    lines.push('- Network throughput');
    lines.push('');

    lines.push('### Business Metrics', '');
    lines.push('- Feature usage rates');
    lines.push('- User sessions');
    lines.push('- Transaction volume');
    lines.push('');

    lines.push('## Alerting Guidelines', '');
    lines.push('| Severity | Response Time | Examples |');
    lines.push('|----------|---------------|----------|');
    lines.push('| P1 - Critical | 15 min | Service down, data loss |');
    lines.push('| P2 - High | 1 hour | Degraded performance, partial outage |');
    lines.push('| P3 - Medium | 4 hours | Non-critical errors, capacity warnings |');
    lines.push('| P4 - Low | 24 hours | Minor issues, optimization opportunities |');
    lines.push('');

    lines.push('---', `*Last updated: ${new Date().toISOString()}*`);

    const filePath = path.join(this.opsPath, 'MONITORING.md');
    fs.writeFileSync(filePath, lines.join('\n'));

    return { file: filePath, count: monitoringConfigs.length };
  }

  /**
   * Generate incident documentation templates
   */
  private async generateIncidentDocs(): Promise<{ file: string | null }> {
    const lines: string[] = [
      '# Incident Management',
      '',
      `*Generated: ${new Date().toLocaleDateString()}*`,
      '',
      '## Incident Response Process',
      '',
      '```mermaid',
      'graph LR',
      '    A[Detect] --> B[Assess]',
      '    B --> C[Triage]',
      '    C --> D[Investigate]',
      '    D --> E[Mitigate]',
      '    E --> F[Resolve]',
      '    F --> G[Post-mortem]',
      '```',
      '',
      '## Incident Severity Levels',
      '',
      '| Level | Description | Response | Examples |',
      '|-------|-------------|----------|----------|',
      '| SEV1 | Critical - Complete outage | Immediate, all hands | Service unreachable |',
      '| SEV2 | Major - Partial outage | < 30 min, on-call | Degraded performance |',
      '| SEV3 | Minor - Limited impact | < 4 hours | Feature unavailable |',
      '| SEV4 | Low - Minimal impact | Next business day | Minor bug |',
      '',
      '## Incident Template',
      '',
      '### Incident Report: [TITLE]',
      '',
      '**Date**: YYYY-MM-DD',
      '**Severity**: SEV[1-4]',
      '**Duration**: X hours',
      '**Impact**: [Description of impact]',
      '',
      '#### Timeline',
      '',
      '| Time | Event |',
      '|------|-------|',
      '| HH:MM | Issue detected |',
      '| HH:MM | Investigation started |',
      '| HH:MM | Root cause identified |',
      '| HH:MM | Mitigation applied |',
      '| HH:MM | Resolved |',
      '',
      '#### Root Cause',
      '',
      '[Description of root cause]',
      '',
      '#### Resolution',
      '',
      '[Description of how it was resolved]',
      '',
      '#### Action Items',
      '',
      '- [ ] Prevent recurrence',
      '- [ ] Improve detection',
      '- [ ] Update documentation',
      '',
      '## Post-Mortem Process',
      '',
      '1. Schedule post-mortem within 48 hours',
      '2. Gather all participants',
      '3. Review timeline and facts',
      '4. Identify root causes (5 Whys)',
      '5. Define action items',
      '6. Document and share learnings',
      '',
      '---',
      `*Last updated: ${new Date().toISOString()}*`,
    ];

    const filePath = path.join(this.opsPath, 'INCIDENT-HISTORY.md');
    fs.writeFileSync(filePath, lines.join('\n'));

    return { file: filePath };
  }

  /**
   * Generate SLA documentation
   */
  private async generateSLADocs(): Promise<{ file: string | null }> {
    const lines: string[] = [
      '# Service Level Agreements (SLA)',
      '',
      `*Generated: ${new Date().toLocaleDateString()}*`,
      '',
      '## SLA Overview',
      '',
      '| Service | Target | Current | Status |',
      '|---------|--------|---------|--------|',
      '| Availability | 99.9% | TBD | 🟡 |',
      '| Response Time (p95) | < 200ms | TBD | 🟡 |',
      '| Error Rate | < 0.1% | TBD | 🟡 |',
      '',
      '## Definitions',
      '',
      '### Availability',
      '',
      'Percentage of time the service is operational and accessible.',
      '',
      '| Target | Monthly Downtime |',
      '|--------|-----------------|',
      '| 99.9% | 43.8 minutes |',
      '| 99.95% | 21.9 minutes |',
      '| 99.99% | 4.38 minutes |',
      '',
      '### Response Time',
      '',
      'Time from request receipt to response delivery.',
      '',
      '| Percentile | Target |',
      '|------------|--------|',
      '| p50 | < 50ms |',
      '| p95 | < 200ms |',
      '| p99 | < 500ms |',
      '',
      '### Error Rate',
      '',
      'Percentage of requests resulting in 5xx errors.',
      '',
      '## Error Budget',
      '',
      '```',
      'Monthly Error Budget = (100% - SLA Target) * Total Minutes',
      '',
      'For 99.9% SLA:',
      'Error Budget = 0.1% * 43,200 minutes = 43.2 minutes/month',
      '```',
      '',
      '## Measurement',
      '',
      '- **Tool**: [Prometheus/Datadog/etc.]',
      '- **Dashboard**: [Link to monitoring dashboard]',
      '- **Reporting**: Monthly SLA report',
      '',
      '---',
      `*Last updated: ${new Date().toISOString()}*`,
    ];

    const filePath = path.join(this.opsPath, 'SLA-TRACKING.md');
    fs.writeFileSync(filePath, lines.join('\n'));

    return { file: filePath };
  }

  // Helper methods

  private parseHookScript(filePath: string): { name: string; description: string; steps: string[] } | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const name = path.basename(filePath, '.sh');

      // Extract description from first comment block
      const descMatch = content.match(/^#\s*(.+)/m);
      const description = descMatch ? descMatch[1] : `Script: ${name}`;

      // Extract major steps from comments
      const steps: string[] = [];
      const stepMatches = content.match(/^#\s*\d+[\.\)]\s*(.+)/gm);
      if (stepMatches) {
        for (const match of stepMatches) {
          steps.push(match.replace(/^#\s*\d+[\.\)]\s*/, ''));
        }
      }

      return { name, description, steps };
    } catch {
      return null;
    }
  }

  private generateStandardRunbooks(): RunbookInfo[] {
    const runbooks: RunbookInfo[] = [];

    // Check for npm project
    if (fs.existsSync(path.join(this.projectPath, 'package.json'))) {
      runbooks.push({
        name: 'Application Restart',
        description: 'Steps to safely restart the application',
        type: 'standard',
        steps: [
          'Check current service health',
          'Notify stakeholders',
          'Stop the service: `npm stop` or `systemctl stop app`',
          'Clear cache if needed: `npm cache clean --force`',
          'Start the service: `npm start` or `systemctl start app`',
          'Verify health: check logs and health endpoint',
          'Notify stakeholders of completion',
        ],
      });

      runbooks.push({
        name: 'Dependency Update',
        description: 'Process for updating npm dependencies',
        type: 'standard',
        steps: [
          'Create a new branch: `git checkout -b deps-update`',
          'Check for updates: `npm outdated`',
          'Update dependencies: `npm update`',
          'Run tests: `npm test`',
          'Review changes: `git diff package-lock.json`',
          'Commit and create PR',
        ],
      });
    }

    // Check for Docker
    if (fs.existsSync(path.join(this.projectPath, 'Dockerfile'))) {
      runbooks.push({
        name: 'Container Restart',
        description: 'Steps to restart Docker containers',
        type: 'standard',
        steps: [
          'Check container status: `docker ps`',
          'Stop container: `docker-compose stop` or `docker stop <id>`',
          'Remove container (optional): `docker rm <id>`',
          'Rebuild if needed: `docker-compose build`',
          'Start container: `docker-compose up -d`',
          'Verify logs: `docker logs -f <id>`',
        ],
      });
    }

    // Add cleanup runbook
    runbooks.push({
      name: 'Cache Cleanup',
      description: 'Clear various caches to resolve issues',
      type: 'standard',
      steps: [
        'Clear npm cache: `npm cache clean --force`',
        'Clear build artifacts: `rm -rf dist/ build/`',
        'Clear node_modules if needed: `rm -rf node_modules && npm install`',
        'Clear SpecWeave cache: `rm -rf .specweave/cache/`',
        'Restart the application',
      ],
    });

    return runbooks;
  }
}

// Types

interface RunbookInfo {
  name: string;
  description: string;
  type: 'hook' | 'script' | 'standard';
  source?: string;
  steps: string[];
}

interface MonitoringInfo {
  name: string;
  type: string;
  configFile?: string;
}
