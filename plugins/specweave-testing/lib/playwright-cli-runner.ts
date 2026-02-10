import { execFileSync } from 'child_process';

export interface CliRunnerConfig {
  headed?: boolean;
  browser?: string;
  session?: string;
  timeout?: number;
}

export interface CliResult {
  ok: boolean;
  output: string;
}

export class PlaywrightCliRunner {
  readonly config: Required<Pick<CliRunnerConfig, 'headed' | 'browser'>> & CliRunnerConfig;

  constructor(config: CliRunnerConfig = {}) {
    this.config = {
      headed: config.headed ?? false,
      browser: config.browser ?? 'chrome',
      timeout: config.timeout ?? 30_000,
      session: config.session,
    };
  }

  private exec(args: string[]): CliResult {
    const fullArgs: string[] = [];
    if (this.config.session) {
      fullArgs.push(`-s=${this.config.session}`);
    }
    fullArgs.push(...args);
    try {
      const output = execFileSync('playwright-cli', fullArgs, {
        encoding: 'utf-8',
        timeout: this.config.timeout,
        maxBuffer: 1024 * 1024,
      }).trim();
      return { ok: true, output };
    } catch (e: unknown) {
      return { ok: false, output: (e as Error).message };
    }
  }

  open(url?: string): CliResult {
    const args = ['open'];
    if (url) args.push(url);
    if (this.config.headed) args.push('--headed');
    return this.exec(args);
  }

  navigate(url: string): CliResult {
    return this.exec(['goto', url]);
  }

  snapshot(): CliResult {
    return this.exec(['snapshot']);
  }

  screenshot(filename?: string): CliResult {
    const args = ['screenshot'];
    if (filename) args.push('--filename', filename);
    return this.exec(args);
  }

  close(): CliResult {
    return this.exec(['close']);
  }

  click(ref: string): CliResult {
    return this.exec(['click', ref]);
  }

  type(text: string): CliResult {
    return this.exec(['type', text]);
  }

  fill(ref: string, text: string): CliResult {
    return this.exec(['fill', ref, text]);
  }

  evaluate(fn: string): CliResult {
    return this.exec(['eval', fn]);
  }
}
