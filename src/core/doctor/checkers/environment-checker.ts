/**
 * Environment Checker - validates Node.js, Git, Claude CLI, and optional tools
 */

import { execSync } from 'child_process';
import type {
  HealthChecker,
  CategoryResult,
  CheckResult,
  DoctorOptions,
} from '../types.js';
import { calculateOverallStatus } from '../types.js';
import { getMinNodeVersion } from '../../../cli/helpers/init/instruction-file-merger.js';

interface ToolCheck {
  name: string;
  command: string;
  versionArg: string;
  required: boolean;
  versionParser?: (output: string) => string;
}

const TOOLS: ToolCheck[] = [
  {
    name: 'Node.js',
    command: 'node',
    versionArg: '--version',
    required: true,
    versionParser: (out) => out.trim(),
  },
  {
    name: 'npm',
    command: 'npm',
    versionArg: '--version',
    required: true,
    versionParser: (out) => `v${out.trim()}`,
  },
  {
    name: 'Git',
    command: 'git',
    versionArg: '--version',
    required: true,
    versionParser: (out) => out.replace('git version ', '').trim(),
  },
  {
    name: 'Claude CLI',
    command: 'claude',
    versionArg: '--version',
    required: false,
    versionParser: (out) => out.trim().split('\n')[0],
  },
  {
    name: 'jq',
    command: 'jq',
    versionArg: '--version',
    required: false,
    versionParser: (out) => out.trim(),
  },
  {
    name: 'gh',
    command: 'gh',
    versionArg: '--version',
    required: false,
    versionParser: (out) => out.trim().split('\n')[0],
  },
];

export class EnvironmentChecker implements HealthChecker {
  category = 'Environment';

  async check(
    _projectRoot: string,
    _options: DoctorOptions
  ): Promise<CategoryResult> {
    const checks: CheckResult[] = [];

    for (const tool of TOOLS) {
      checks.push(await this.checkTool(tool));
    }

    // Node.js floor comes from specweave's package.json engines.node
    const nodeCheck = checks.find((c) => c.name === 'Node.js');
    if (nodeCheck && nodeCheck.status === 'pass') {
      const minNode = getMinNodeVersion();
      if (compareSemver(this.parseNodeVersion(nodeCheck.message), minNode) < 0) {
        nodeCheck.status = 'fail';
        nodeCheck.message = `${nodeCheck.message} (minimum required: v${minNode})`;
        nodeCheck.fixSuggestion = `Upgrade Node.js to v${minNode} or higher`;
      }
    }

    return {
      category: this.category,
      status: calculateOverallStatus(checks),
      checks,
    };
  }

  private async checkTool(tool: ToolCheck): Promise<CheckResult> {
    const start = Date.now();
    try {
      const output = execSync(`${tool.command} ${tool.versionArg}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
      });

      const version = tool.versionParser
        ? tool.versionParser(output)
        : output.trim();

      return {
        name: tool.name,
        status: 'pass',
        message: version,
        durationMs: Date.now() - start,
      };
    } catch {
      return {
        name: tool.name,
        status: tool.required ? 'fail' : 'warn',
        message: `not installed${tool.required ? '' : ' (optional)'}`,
        fixSuggestion: tool.required
          ? `Install ${tool.name}`
          : `Optional: install ${tool.name} for enhanced functionality`,
        durationMs: Date.now() - start,
      };
    }
  }

  private parseNodeVersion(message: string): string {
    const match = message.match(/v?(\d+(?:\.\d+){0,2})/);
    return match ? match[1] : '0.0.0';
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
