import { execSync } from 'child_process';

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
      session: config.session,
      timeout: config.timeout ?? 30_000,
      ...config,
    };
  }

  private exec(command: string): CliResult {
    const sessionFlag = this.config.session ? `-s=${this.config.session} ` : '';
    const fullCommand = `playwright-cli ${sessionFlag}${command}`;
    try {
      const output = execSync(fullCommand, {
        encoding: 'utf-8',
        timeout: this.config.timeout,
      }).trim();
      return { ok: true, output };
    } catch (e: unknown) {
      return { ok: false, output: (e as Error).message };
    }
  }

  open(url?: string): CliResult {
    const headedFlag = this.config.headed ? ' --headed' : '';
    const urlPart = url ? ` ${url}` : '';
    return this.exec(`open${urlPart}${headedFlag}`);
  }

  navigate(url: string): CliResult {
    return this.exec(`goto ${url}`);
  }

  snapshot(): CliResult {
    return this.exec('snapshot');
  }

  screenshot(filename?: string): CliResult {
    const flag = filename ? ` --filename ${filename}` : '';
    return this.exec(`screenshot${flag}`);
  }

  close(): CliResult {
    return this.exec('close');
  }

  click(ref: string): CliResult {
    return this.exec(`click ${ref}`);
  }

  type(text: string): CliResult {
    return this.exec(`type "${text}"`);
  }

  fill(ref: string, text: string): CliResult {
    return this.exec(`fill ${ref} "${text}"`);
  }

  evaluate(fn: string): CliResult {
    return this.exec(`eval "${fn}"`);
  }
}
