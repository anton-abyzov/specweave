import { SpecWeaveError, ErrorCode } from './index.js';

/**
 * Error thrown when an external sync operation fails.
 * Captures provider, HTTP status, and response body for diagnostics.
 */
export class SyncError extends SpecWeaveError {
  public readonly provider: string;
  public readonly httpStatus: number;
  public readonly responseBody: string;

  constructor(provider: string, httpStatus: number, responseBody: string, detail: string) {
    const label = provider.toUpperCase();
    super(`[${label}] sync failed: ${httpStatus} ${detail}`, {
      code: ErrorCode.SYNC_FAILED,
      context: { provider, httpStatus, responseBody },
    });
    this.name = 'SyncError';
    this.provider = provider;
    this.httpStatus = httpStatus;
    this.responseBody = responseBody;
  }
}
