/**
 * Integration Health Check
 *
 * Validates external integration chain beyond simple auth.
 * Runs during sync-setup to catch misconfigurations early.
 *
 * @module sync/integration-health-check
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface HealthCheckResult {
  provider: string;
  checks: HealthCheck[];
  healthy: boolean;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

/**
 * Run health checks for JIRA integration
 */
export async function checkJiraIntegration(config: {
  domain: string;
  projectKey: string;
  email: string;
  apiToken: string;
}): Promise<HealthCheckResult> {
  const checks: HealthCheck[] = [];
  const authHeader = 'Basic ' + Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
  const baseUrl = config.domain.startsWith('http') ? config.domain : `https://${config.domain}`;

  // Check 1: Verify API auth (basic)
  try {
    const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
      headers: { 'Authorization': authHeader }
    });
    if (res.ok) {
      checks.push({ name: 'API Authentication', status: 'pass', message: 'Authenticated successfully' });
    } else {
      checks.push({ name: 'API Authentication', status: 'fail', message: `Auth failed: ${res.status}`, fix: 'Check JIRA_EMAIL and JIRA_API_TOKEN in .env' });
    }
  } catch (err: any) {
    checks.push({ name: 'API Authentication', status: 'fail', message: err.message, fix: 'Check JIRA_DOMAIN in .env' });
  }

  // Check 2: Verify project exists and has valid issue types
  try {
    const res = await fetch(`${baseUrl}/rest/api/3/project/${config.projectKey}`, {
      headers: { 'Authorization': authHeader }
    });
    if (res.ok) {
      checks.push({ name: 'Project Access', status: 'pass', message: `Project ${config.projectKey} accessible` });
    } else {
      checks.push({ name: 'Project Access', status: 'fail', message: `Project ${config.projectKey} not found or no access`, fix: `Verify JIRA project key: ${config.projectKey}` });
    }
  } catch (err: any) {
    checks.push({ name: 'Project Access', status: 'fail', message: err.message });
  }

  // Check 3: Verify issue types exist in project (catches "The issue type selected is invalid")
  try {
    const res = await fetch(`${baseUrl}/rest/api/3/issue/createmeta?projectKeys=${config.projectKey}&expand=projects.issuetypes`, {
      headers: { 'Authorization': authHeader }
    });
    if (res.ok) {
      const data = await res.json() as any;
      const project = data.projects?.[0];
      if (project) {
        const typeNames = (project.issuetypes || []).map((t: any) => t.name);
        const hasEpic = typeNames.some((n: string) => n.toLowerCase().includes('epic'));
        const hasStory = typeNames.some((n: string) => n.toLowerCase().includes('story'));

        if (hasEpic && hasStory) {
          checks.push({ name: 'Issue Types', status: 'pass', message: `Epic and Story types available (${typeNames.join(', ')})` });
        } else {
          const missing = [];
          if (!hasEpic) missing.push('Epic');
          if (!hasStory) missing.push('Story');
          checks.push({
            name: 'Issue Types',
            status: 'warn',
            message: `Missing issue types: ${missing.join(', ')}. Available: ${typeNames.join(', ')}`,
            fix: 'Add missing issue types in JIRA project settings, or SpecWeave sync will fail at increment closure'
          });
        }
      }
    }
  } catch {
    // Non-critical — createmeta API may have changed in newer JIRA versions
    checks.push({ name: 'Issue Types', status: 'warn', message: 'Could not verify issue types (createmeta API unavailable)' });
  }

  // Check 4: Verify remote link permission
  try {
    const res = await fetch(`${baseUrl}/rest/api/3/mypermissions?permissions=EDIT_ISSUES&projectKey=${config.projectKey}`, {
      headers: { 'Authorization': authHeader }
    });
    if (res.ok) {
      const data = await res.json() as any;
      const canEdit = data.permissions?.EDIT_ISSUES?.havePermission;
      if (canEdit) {
        checks.push({ name: 'Edit Permission', status: 'pass', message: 'Can edit issues (required for remote links)' });
      } else {
        checks.push({
          name: 'Edit Permission',
          status: 'warn',
          message: 'Cannot edit issues — PR remote links will fail',
          fix: 'Grant "Edit Issues" permission to the API user in JIRA project settings'
        });
      }
    }
  } catch {
    checks.push({ name: 'Edit Permission', status: 'warn', message: 'Could not verify permissions' });
  }

  return {
    provider: 'jira',
    checks,
    healthy: checks.every(c => c.status !== 'fail')
  };
}

/**
 * Run health checks for ADO integration
 */
export async function checkAdoIntegration(config: {
  organization: string;
  project: string;
  pat: string;
}): Promise<HealthCheckResult> {
  const checks: HealthCheck[] = [];
  const authHeader = 'Basic ' + Buffer.from(`:${config.pat}`).toString('base64');
  const baseUrl = `https://dev.azure.com/${config.organization}/${config.project}`;

  // Check 1: Auth + project access
  try {
    const res = await fetch(`${baseUrl}/_apis/wit/workitemtypes?api-version=7.1`, {
      headers: { 'Authorization': authHeader }
    });
    if (res.ok) {
      const data = await res.json() as any;
      const typeNames = (data.value || []).map((t: any) => t.name);
      checks.push({ name: 'API Authentication', status: 'pass', message: 'Authenticated successfully' });
      checks.push({ name: 'Work Item Types', status: 'pass', message: `Available: ${typeNames.slice(0, 5).join(', ')}` });
    } else {
      checks.push({ name: 'API Authentication', status: 'fail', message: `Auth failed: ${res.status}`, fix: 'Check ADO_PAT and ADO_ORGANIZATION in .env' });
    }
  } catch (err: any) {
    checks.push({ name: 'API Authentication', status: 'fail', message: err.message });
  }

  return {
    provider: 'ado',
    checks,
    healthy: checks.every(c => c.status !== 'fail')
  };
}

/**
 * Run health checks for GitHub integration
 */
export async function checkGitHubIntegration(): Promise<HealthCheckResult> {
  const checks: HealthCheck[] = [];

  // Check 1: gh CLI authenticated
  try {
    const { execSync } = await import('child_process');
    const output = execSync('gh auth status 2>&1', { encoding: 'utf-8', timeout: 10000 });
    if (output.includes('Logged in')) {
      checks.push({ name: 'GitHub CLI', status: 'pass', message: 'gh CLI authenticated' });
    } else {
      checks.push({ name: 'GitHub CLI', status: 'warn', message: 'gh CLI not authenticated', fix: 'Run: gh auth login' });
    }
  } catch {
    checks.push({ name: 'GitHub CLI', status: 'warn', message: 'gh CLI not available or not authenticated', fix: 'Install gh CLI and run: gh auth login' });
  }

  return {
    provider: 'github',
    checks,
    healthy: checks.every(c => c.status !== 'fail')
  };
}

/**
 * Format health check results for display
 */
export function formatHealthCheckResults(results: HealthCheckResult[]): string {
  const lines: string[] = ['', '━━━ Integration Health Check ━━━', ''];

  for (const result of results) {
    const icon = result.healthy ? '✅' : '⚠️';
    lines.push(`${icon} ${result.provider.toUpperCase()}`);

    for (const check of result.checks) {
      const statusIcon = check.status === 'pass' ? '  ✓' : check.status === 'warn' ? '  ⚠' : '  ✗';
      lines.push(`${statusIcon} ${check.name}: ${check.message}`);
      if (check.fix) {
        lines.push(`    Fix: ${check.fix}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
