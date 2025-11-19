import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';

const execAsync = promisify(exec);

export interface HookResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface StatusLineCache {
  current: string | null;
  openCount: number;
  lastUpdate: string;
}

export class HookTestHarness {
  constructor(
    private testRoot: string,
    private hookPath: string
  ) {}

  async execute(env?: Record<string, string>): Promise<HookResult> {
    const startTime = Date.now();

    try {
      const result = await execAsync(`bash ${this.hookPath}`, {
        cwd: this.testRoot,
        env: {
          ...process.env,
          PWD: this.testRoot,
          ...env
        }
      });

      return {
        exitCode: 0,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        exitCode: error.code || 1,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        duration: Date.now() - startTime
      };
    }
  }

  async readStatusLine(): Promise<StatusLineCache | null> {
    const cachePath = path.join(
      this.testRoot,
      '.specweave/state/status-line.json'
    );

    if (!(await fs.pathExists(cachePath))) {
      return null;
    }

    return await fs.readJson(cachePath);
  }
}
