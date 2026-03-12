import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import type { CommandExecution } from '../types.js';
import { killProcessOnPort } from '../../utils/docs-preview/server-manager.js';
import { SCOPE_PORTS } from '../../utils/docs-preview/types.js';

type CommandSpec =
  | { cmd: string; args: string[] }
  | { handler: () => Promise<void> };

/** Whitelisted commands that can be executed from the dashboard */
const ALLOWED_COMMANDS: Record<string, CommandSpec> = {
  'sync-push': { cmd: 'specweave', args: ['sync-progress'] },
  'refresh-plugins': { cmd: 'specweave', args: ['refresh-plugins'] },
  'living-docs': { cmd: 'specweave', args: ['living-docs'] },
  'lsp-status': { cmd: 'specweave', args: ['lsp', 'status'] },
  'analytics': { cmd: 'specweave', args: ['analytics'] },
  'doctor': { cmd: 'specweave', args: ['doctor'] },
  'docs-internal-start': { cmd: 'specweave', args: ['docs', 'preview'] },
  'docs-internal-stop': { handler: async () => { await killProcessOnPort(SCOPE_PORTS.internal); } },
  'docs-public-start': { cmd: 'specweave', args: ['docs', 'preview', '--scope', 'public'] },
  'docs-public-stop': { handler: async () => { await killProcessOnPort(SCOPE_PORTS.public); } },
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

  /** Execute a whitelisted command, optionally in a different working directory */
  execute(commandName: string, options?: { cwd?: string }): CommandExecution | null {
    if (this.active?.status === 'running') {
      return null; // Already running
    }

    const spec = ALLOWED_COMMANDS[commandName];
    if (!spec) return null;

    const execution: CommandExecution = {
      id: randomUUID().slice(0, 8),
      command: commandName,
      args: 'args' in spec ? spec.args : [],
      status: 'running',
      startedAt: new Date().toISOString(),
      output: [],
    };

    this.active = execution;

    // Handler-based commands run in-process (e.g. port-specific kill)
    if ('handler' in spec) {
      spec.handler()
        .then(() => {
          execution.status = 'completed';
          execution.exitCode = 0;
          execution.output.push('Done.');
          this.onOutput?.(execution.id, 'Done.', 'stdout');
          this.onComplete?.(execution.id, 0);
        })
        .catch((err: Error) => {
          execution.status = 'failed';
          execution.output.push(`Error: ${err.message}`);
          this.onOutput?.(execution.id, `Error: ${err.message}`, 'stderr');
          this.onComplete?.(execution.id, 1);
        });
      return execution;
    }

    const proc = spawn(spec.cmd, spec.args, {
      cwd: options?.cwd || this.projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this.process = proc;

    const handleData = (stream: 'stdout' | 'stderr') => (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const rawLine of lines) {
        const line = rawLine.length > 5000 ? rawLine.slice(0, 5000) + '... [truncated]' : rawLine;
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
