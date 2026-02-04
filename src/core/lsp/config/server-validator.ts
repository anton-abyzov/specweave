/**
 * ServerValidator - Security validation for custom LSP servers
 *
 * @see spec.md US-004: Custom LSP Registration
 * @satisfies AC-US4-02, AC-US4-03, AC-US4-04
 */

/**
 * Trust store for persisting user confirmations
 */
export interface TrustStore {
  isTrusted(serverId: string): Promise<boolean>;
  trust(serverId: string): Promise<void>;
}

/**
 * Binary checker for validating executables
 */
export interface BinaryChecker {
  exists(path: string): Promise<boolean>;
  isExecutable(path: string): Promise<boolean>;
}

/**
 * Result of server validation
 */
export interface ValidationResult {
  /** Whether the server is valid */
  valid: boolean;
  /** Whether user confirmation is required */
  requiresConfirmation: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Warning callback type
 */
export type WarnCallback = (message: string) => void;

/**
 * Validates custom LSP servers for security
 */
export class ServerValidator {
  private readonly trustStore: TrustStore;
  private readonly binaryChecker: BinaryChecker;
  private readonly warnCallback: WarnCallback;

  constructor(
    trustStore: TrustStore,
    binaryChecker: BinaryChecker,
    warnCallback: WarnCallback
  ) {
    this.trustStore = trustStore;
    this.binaryChecker = binaryChecker;
    this.warnCallback = warnCallback;
  }

  /**
   * Validate a custom LSP server
   *
   * @param serverId - Unique identifier for the server
   * @param binaryPath - Path to the server binary
   * @returns Validation result
   */
  async validateCustomServer(
    serverId: string,
    binaryPath: string
  ): Promise<ValidationResult> {
    // Check if server is trusted
    const isTrusted = await this.trustStore.isTrusted(serverId);

    // Validate binary
    const binaryResult = await this.validateBinary(binaryPath);
    if (!binaryResult.valid) {
      return {
        valid: false,
        requiresConfirmation: false,
        error: binaryResult.error,
      };
    }

    // Show security warning for untrusted servers
    if (!isTrusted) {
      this.warnCallback(
        `⚠️ SECURITY WARNING: Custom LSP server "${serverId}" at "${binaryPath}" ` +
          'will be executed. Only use servers from trusted sources.'
      );

      return {
        valid: true,
        requiresConfirmation: true,
      };
    }

    return {
      valid: true,
      requiresConfirmation: false,
    };
  }

  /**
   * Validate a binary file
   *
   * @param path - Path to the binary
   * @returns Validation result
   */
  async validateBinary(path: string): Promise<ValidationResult> {
    const exists = await this.binaryChecker.exists(path);
    if (!exists) {
      return {
        valid: false,
        requiresConfirmation: false,
        error: `Binary not found: ${path}`,
      };
    }

    const isExecutable = await this.binaryChecker.isExecutable(path);
    if (!isExecutable) {
      return {
        valid: false,
        requiresConfirmation: false,
        error: `Binary not executable: ${path}`,
      };
    }

    return {
      valid: true,
      requiresConfirmation: false,
    };
  }

  /**
   * Confirm trust for a server
   *
   * @param serverId - Server ID to trust
   */
  async confirmTrust(serverId: string): Promise<void> {
    await this.trustStore.trust(serverId);
  }
}
