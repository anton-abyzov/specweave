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

const MIN_NODE_VERSION = 18;

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

    // Additional Node.js version check
    const nodeCheck = checks.find((c) => c.name === 'Node.js');
    if (nodeCheck && nodeCheck.status === 'pass') {
      const nodeVersion = this.parseNodeVersion(nodeCheck.message);
      if (nodeVersion < MIN_NODE_VERSION) {
        nodeCheck.status = 'fail';
        nodeCheck.message = `${nodeCheck.message} (minimum required: v${MIN_NODE_VERSION})`;
        nodeCheck.fixSuggestion = `Upgrade Node.js to v${MIN_NODE_VERSION} or higher`;
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

  private parseNodeVersion(message: string): number {
    const match = message.match(/v(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
