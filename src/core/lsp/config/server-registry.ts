/**
 * ServerRegistry - Registry for LSP server configurations
 *
 * Manages both built-in and custom LSP server configurations.
 *
 * @see spec.md US-004: Custom LSP Registration
 * @satisfies AC-US4-01
 */

/**
 * Configuration for an LSP server
 */
export interface ServerConfig {
  /** Command to start the server */
  command: string;
  /** Command line arguments */
  args?: string[];
  /** File patterns this server handles */
  filePatterns?: string[];
  /** Language ID for the server */
  languageId?: string;
  /** Initialization options */
  initializationOptions?: Record<string, unknown>;
}

/**
 * Configuration passed to ServerRegistry
 */
export interface RegistryConfig {
  servers?: Record<string, ServerConfig>;
}

/**
 * Built-in server configurations
 */
const BUILT_IN_SERVERS: Record<string, ServerConfig> = {
  typescript: {
    command: 'typescript-language-server',
    args: ['--stdio'],
    filePatterns: ['*.ts', '*.tsx', '*.js', '*.jsx'],
    languageId: 'typescript',
  },
  csharp: {
    command: 'csharp-ls',
    args: [],
    filePatterns: ['*.cs'],
    languageId: 'csharp',
  },
  go: {
    command: 'gopls',
    args: ['serve'],
    filePatterns: ['*.go'],
    languageId: 'go',
  },
  python: {
    command: 'pyright-langserver',
    args: ['--stdio'],
    filePatterns: ['*.py'],
    languageId: 'python',
  },
  rust: {
    command: 'rust-analyzer',
    args: [],
    filePatterns: ['*.rs'],
    languageId: 'rust',
  },
};

/**
 * Registry for managing LSP server configurations
 */
export class ServerRegistry {
  private readonly servers: Map<string, ServerConfig> = new Map();
  private readonly customServers: Set<string> = new Set();

  constructor(config: RegistryConfig) {
    // Load built-in servers first
    for (const [name, serverConfig] of Object.entries(BUILT_IN_SERVERS)) {
      this.servers.set(name, { ...serverConfig });
    }

    // Merge/override with custom servers
    if (config.servers) {
      for (const [name, serverConfig] of Object.entries(config.servers)) {
        this.servers.set(name, serverConfig);
        this.customServers.add(name);
      }
    }
  }

  /**
   * Get server configuration by name
   *
   * @param name - Server name (e.g., 'typescript', 'myLang')
   * @returns Server configuration or undefined
   */
  get(name: string): ServerConfig | undefined {
    return this.servers.get(name);
  }

  /**
   * List all available server names
   *
   * @returns Array of server names
   */
  listAll(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * List only custom server names
   *
   * @returns Array of custom server names
   */
  listCustom(): string[] {
    return Array.from(this.customServers);
  }

  /**
   * Check if a server is custom (not built-in)
   *
   * @param name - Server name
   * @returns True if the server is custom
   */
  isCustom(name: string): boolean {
    return this.customServers.has(name);
  }
}
