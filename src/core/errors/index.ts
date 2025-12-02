/**
 * SpecWeave Error Hierarchy
 *
 * Centralized error types for the SpecWeave framework.
 * All custom errors extend SpecWeaveError for consistent error handling.
 *
 * @module core/errors
 */

/**
 * Error codes for categorization
 */
export enum ErrorCode {
  // Configuration errors (1xxx)
  CONFIG_NOT_FOUND = 1001,
  CONFIG_INVALID = 1002,
  CONFIG_PARSE_ERROR = 1003,

  // Sync errors (2xxx)
  SYNC_FAILED = 2001,
  SYNC_CONFLICT = 2002,
  SYNC_RATE_LIMITED = 2003,
  SYNC_PERMISSION_DENIED = 2004,
  SYNC_NETWORK_ERROR = 2005,

  // Import errors (3xxx)
  IMPORT_FAILED = 3001,
  IMPORT_PARSE_ERROR = 3002,
  IMPORT_INVALID_FORMAT = 3003,
  IMPORT_DUPLICATE = 3004,

  // Validation errors (4xxx)
  VALIDATION_FAILED = 4001,
  VALIDATION_SCHEMA_ERROR = 4002,
  VALIDATION_REQUIRED_FIELD = 4003,

  // Increment errors (5xxx)
  INCREMENT_NOT_FOUND = 5001,
  INCREMENT_INVALID_STATUS = 5002,
  INCREMENT_LOCKED = 5003,
  INCREMENT_METADATA_ERROR = 5004,

  // Plugin errors (6xxx)
  PLUGIN_NOT_FOUND = 6001,
  PLUGIN_LOAD_ERROR = 6002,
  PLUGIN_EXECUTION_ERROR = 6003,

  // Integration errors (7xxx)
  INTEGRATION_AUTH_ERROR = 7001,
  INTEGRATION_API_ERROR = 7002,
  INTEGRATION_TIMEOUT = 7003,

  // File system errors (8xxx)
  FS_READ_ERROR = 8001,
  FS_WRITE_ERROR = 8002,
  FS_NOT_FOUND = 8003,
  FS_PERMISSION_DENIED = 8004,

  // Unknown
  UNKNOWN = 9999,
}

/**
 * Base error for all SpecWeave errors
 *
 * @example
 * ```typescript
 * throw new SpecWeaveError('Something went wrong', {
 *   code: ErrorCode.UNKNOWN,
 *   context: { incrementId: '0001' }
 * });
 * ```
 */
export class SpecWeaveError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly originalCause?: Error;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'SpecWeaveError';
    this.code = options.code ?? ErrorCode.UNKNOWN;
    this.context = options.context;
    this.timestamp = new Date();
    this.originalCause = options.cause;

    // Maintain proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error for logging
   */
  toLogString(): string {
    const parts = [`[${this.name}] ${this.message}`];
    parts.push(`Code: ${this.code}`);
    if (this.context) {
      parts.push(`Context: ${JSON.stringify(this.context)}`);
    }
    if (this.originalCause) {
      parts.push(`Caused by: ${this.originalCause.message}`);
    }
    return parts.join(' | ');
  }

  /**
   * Serialize error for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Configuration-related errors
 */
export class ConfigError extends SpecWeaveError {
  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: options.code ?? ErrorCode.CONFIG_INVALID,
      context: options.context,
      cause: options.cause,
    });
    this.name = 'ConfigError';
  }
}

/**
 * Sync/integration-related errors
 */
export class SyncError extends SpecWeaveError {
  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: options.code ?? ErrorCode.SYNC_FAILED,
      context: options.context,
      cause: options.cause,
    });
    this.name = 'SyncError';
  }
}

/**
 * Import-related errors
 */
export class ImportError extends SpecWeaveError {
  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      context?: Record<string, unknown>;
      cause?: Error;
    } = {}
  ) {
    super(message, {
      code: options.code ?? ErrorCode.IMPORT_FAILED,
      context: options.context,
      cause: options.cause,
    });
    this.name = 'ImportError';
  }
}

/**
 * Validation-related errors
 */
export class ValidationError extends SpecWeaveError {
  public readonly field?: string;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      context?: Record<string, unknown>;
      cause?: Error;
      field?: string;
    } = {}
  ) {
    super(message, {
      code: options.code ?? ErrorCode.VALIDATION_FAILED,
      context: options.context,
      cause: options.cause,
    });
    this.name = 'ValidationError';
    this.field = options.field;
  }
}

/**
 * Increment-related errors
 */
export class IncrementError extends SpecWeaveError {
  public readonly incrementId?: string;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      context?: Record<string, unknown>;
      cause?: Error;
      incrementId?: string;
    } = {}
  ) {
    super(message, {
      code: options.code ?? ErrorCode.INCREMENT_NOT_FOUND,
      context: { ...options.context, incrementId: options.incrementId },
      cause: options.cause,
    });
    this.name = 'IncrementError';
    this.incrementId = options.incrementId;
  }
}

/**
 * Plugin-related errors
 */
export class PluginError extends SpecWeaveError {
  public readonly pluginName?: string;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      context?: Record<string, unknown>;
      cause?: Error;
      pluginName?: string;
    } = {}
  ) {
    super(message, {
      code: options.code ?? ErrorCode.PLUGIN_LOAD_ERROR,
      context: { ...options.context, pluginName: options.pluginName },
      cause: options.cause,
    });
    this.name = 'PluginError';
    this.pluginName = options.pluginName;
  }
}

/**
 * Integration/API-related errors (GitHub, Jira, ADO)
 */
export class IntegrationError extends SpecWeaveError {
  public readonly provider?: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      context?: Record<string, unknown>;
      cause?: Error;
      provider?: string;
      statusCode?: number;
    } = {}
  ) {
    super(message, {
      code: options.code ?? ErrorCode.INTEGRATION_API_ERROR,
      context: {
        ...options.context,
        provider: options.provider,
        statusCode: options.statusCode,
      },
      cause: options.cause,
    });
    this.name = 'IntegrationError';
    this.provider = options.provider;
    this.statusCode = options.statusCode;
  }
}

/**
 * File system-related errors
 */
export class FileSystemError extends SpecWeaveError {
  public readonly path?: string;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      context?: Record<string, unknown>;
      cause?: Error;
      path?: string;
    } = {}
  ) {
    super(message, {
      code: options.code ?? ErrorCode.FS_READ_ERROR,
      context: { ...options.context, path: options.path },
      cause: options.cause,
    });
    this.name = 'FileSystemError';
    this.path = options.path;
  }
}

/**
 * Type guard to check if an error is a SpecWeaveError
 */
export function isSpecWeaveError(error: unknown): error is SpecWeaveError {
  return error instanceof SpecWeaveError;
}

/**
 * Wrap an unknown error in a SpecWeaveError
 */
export function wrapError(
  error: unknown,
  message?: string,
  code?: ErrorCode
): SpecWeaveError {
  if (error instanceof SpecWeaveError) {
    return error;
  }

  const cause = error instanceof Error ? error : new Error(String(error));
  return new SpecWeaveError(message ?? cause.message, {
    code: code ?? ErrorCode.UNKNOWN,
    cause,
  });
}
