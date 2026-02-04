/**
 * LspDoctor - Diagnostic tool for LSP server health
 *
 * Checks installed servers, connectivity, and provides suggestions.
 *
 * @see spec.md US-005: Progress & Diagnostics
 * @satisfies AC-US5-03, AC-US5-04
 */

/**
 * Result of a diagnostic run
 */
export interface DoctorResult {
  /** List of installed LSP server names */
  installedServers: string[];
  /** Connectivity status for each server ('ok' | 'failed') */
  connectivity: Record<string, 'ok' | 'failed'>;
  /** Suggestions for fixing issues */
  suggestions: string[];
  /** Overall health status */
  healthy: boolean;
}

/**
 * Server checker abstraction for testing
 */
export interface ServerChecker {
  isInstalled(server: string): Promise<boolean>;
  testConnection(server: string): Promise<boolean>;
}

/**
 * Known LSP servers with install commands
 */
const KNOWN_SERVERS: Record<string, { command: string; install: string }> = {
  'typescript-language-server': {
    command: 'typescript-language-server',
    install: 'npm install -g typescript-language-server typescript',
  },
  'csharp-ls': {
    command: 'csharp-ls',
    install: 'dotnet tool install -g csharp-ls',
  },
  'gopls': {
    command: 'gopls',
    install: 'go install golang.org/x/tools/gopls@latest',
  },
  'pyright': {
    command: 'pyright-langserver',
    install: 'npm install -g pyright',
  },
  'rust-analyzer': {
    command: 'rust-analyzer',
    install: 'rustup component add rust-analyzer',
  },
};

/**
 * Diagnostic tool for LSP server health checks
 */
export class LspDoctor {
  private readonly checker: ServerChecker;

  constructor(checker: ServerChecker) {
    this.checker = checker;
  }

  /**
   * Run diagnostics on all known LSP servers
   *
   * @returns Promise resolving to diagnostic result
   */
  async diagnose(): Promise<DoctorResult> {
    const installedServers: string[] = [];
    const connectivity: Record<string, 'ok' | 'failed'> = {};
    const suggestions: string[] = [];

    // Check each known server
    for (const [name, info] of Object.entries(KNOWN_SERVERS)) {
      const isInstalled = await this.checker.isInstalled(name);

      if (isInstalled) {
        installedServers.push(name);

        // Test connectivity for installed servers
        const isWorking = await this.checker.testConnection(name);
        connectivity[name] = isWorking ? 'ok' : 'failed';
      } else {
        // Suggest install command for missing servers
        suggestions.push(`Install ${name}: ${info.install}`);
      }
    }

    return {
      installedServers,
      connectivity,
      suggestions,
      healthy: installedServers.length > 0,
    };
  }
}
