import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import type { CommandExecution } from '../types.js';

/** Whitelisted commands that can be executed from the dashboard */
const ALLOWED_COMMANDS: Record<string, { cmd: string; args: string[] }> = {
  'sync-push': { cmd: 'specweave', args: ['sync-progress'] },
  'refresh-marketplace': { cmd: 'specweave', args: ['refresh-marketplace'] },
  'living-docs': { cmd: 'specweave', args: ['living-docs'] },
  'lsp-status': { cmd: 'specweave', args: ['lsp', 'status'] },
  'analytics': { cmd: 'specweave', args: ['analytics'] },
  'doctor': { cmd: 'specweave', args: ['doctor'] },
  'cache-refresh': { cmd: 'specweave', args: ['cache-refresh'] },
  'docs-preview-start': { cmd: 'specweave', args: ['docs', 'preview'] },
  'docs-preview-stop': { cmd: 'specweave', args: ['docs', 'kill'] },
  'clone-repos': { cmd: 'specweave', args: ['clone'] },
};

export class CommandRunner {
  private active: CommandExecution | null = null;
  private process: ChildProcess | null = null;
  private onOutput?: (executionId: string, line: string, stream: 'stdout' | 'stderr') => void;
  private onComplete?: (executionId: string, exitCode: number | null) => void;

  constructor(
    private projectRoot: string,
    callbacks?: {
      onOutput?: (executionId: string, line: string, stream: 'stdout' | 'stderr') => void;
      onComplete?: (executionId: string, exitCode: number | null) => void;
    },
  ) {
    this.onOutput = callbacks?.onOutput;
    this.onComplete = callbacks?.onComplete;
  }

  /** Execute a whitelisted command */
  execute(commandName: string): CommandExecution | null {
    if (this.active?.status === 'running') {
      return null; // Already running
    }

    const spec = ALLOWED_COMMANDS[commandName];
    if (!spec) return null;

    const execution: CommandExecution = {
      id: randomUUID().slice(0, 8),
      command: commandName,
      args: spec.args,
      status: 'running',
      startedAt: new Date().toISOString(),
      output: [],
    };

    this.active = execution;

    const proc = spawn(spec.cmd, spec.args, {
      cwd: this.projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this.process = proc;

    const handleData = (stream: 'stdout' | 'stderr') => (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        execution.output.push(line);
        // Keep output bounded
        if (execution.output.length > 1000) execution.output.shift();
        this.onOutput?.(execution.id, line, stream);
      }
    };

    proc.stdout?.on('data', handleData('stdout'));
    proc.stderr?.on('data', handleData('stderr'));

    proc.on('close', (code) => {
      execution.status = code === 0 ? 'completed' : 'failed';
      execution.exitCode = code ?? undefined;
      this.process = null;
      this.onComplete?.(execution.id, code);
    });

    proc.on('error', (err) => {
      execution.status = 'failed';
      execution.output.push(`Error: ${err.message}`);
      this.process = null;
      this.onComplete?.(execution.id, null);
    });

    return execution;
  }

  /** Cancel the running command */
  cancel(): boolean {
    if (!this.process || !this.active || this.active.status !== 'running') {
      return false;
    }
    this.process.kill('SIGTERM');
    this.active.status = 'failed';
    this.active.exitCode = -1;
    return true;
  }

  /** Get current active command */
  getActive(): CommandExecution | null {
    return this.active;
  }

  /** Get list of allowed command names */
  static getAllowedCommands(): string[] {
    return Object.keys(ALLOWED_COMMANDS);
  }
}
