/**
 * Resilient external-write helper (0865 T-007).
 *
 * Wraps a single provider write (JIRA transition, ADO state change, GitHub close)
 * with bounded-backoff retry for TRANSIENT failures (429 / 5xx / network) and, on
 * TERMINAL failure, enqueues a job into {@link SyncRetryQueue} so `sync-retry` can
 * drain it. Before this, the retry queue was structurally always-empty because no
 * live write path enqueued on failure.
 *
 * Never throws — the live closure flow already collects per-issue errors; this
 * helper additionally guarantees the failure is persisted for retry.
 *
 * @module sync/resilient-write
 */

import { withRetry, type RetryOptions } from '../core/sync/retry-wrapper.js';
import { SyncRetryQueue } from '../core/sync/sync-retry-queue.js';
import { maskCredentials } from '../utils/credential-masker.js';

export interface ResilientWriteParams {
  /** Shared retry queue (file-backed, drained by `sync-retry`). */
  retryQueue: SyncRetryQueue;
  incrementId: string;
  provider: string;
  featureId: string;
  projectPath: string;
  projectName: string;
  /** Bounded backoff config. Defaults to 3 retries, 250ms base, 5s cap. */
  retry?: RetryOptions;
}

export interface ResilientWriteResult {
  ok: boolean;
  /** True when a job was enqueued into the retry queue (terminal failure). */
  enqueued: boolean;
  /** Masked error message on failure. */
  error?: string;
}

const DEFAULT_RETRY: RetryOptions = { maxRetries: 3, baseMs: 250, maxMs: 5000 };

/**
 * Execute a provider write with transient-retry + terminal-enqueue semantics.
 *
 * @param write - The provider write to perform (e.g., `() => client.updateIssue(...)`).
 * @param params - Retry queue + identifying context for the enqueued job.
 */
export async function resilientWrite<T>(
  write: () => Promise<T>,
  params: ResilientWriteParams,
): Promise<ResilientWriteResult> {
  const retry = params.retry ?? DEFAULT_RETRY;

  try {
    // Transient failures (429/5xx/network) are retried with bounded backoff.
    // A terminal 4xx is thrown immediately (withRetry's isRetryable returns false).
    await withRetry(write, retry);
    return { ok: true, enqueued: false };
  } catch (error) {
    const masked = maskCredentials(error instanceof Error ? error.message : String(error));

    // Terminal failure — persist for retry so it is never silently dropped.
    try {
      await params.retryQueue.enqueue({
        incrementId: params.incrementId,
        provider: params.provider,
        featureId: params.featureId,
        projectPath: params.projectPath,
        projectName: params.projectName,
        error: masked,
      });
      return { ok: false, enqueued: true, error: masked };
    } catch {
      // Enqueue itself failed (e.g., disk) — surface the original failure anyway.
      return { ok: false, enqueued: false, error: masked };
    }
  }
}
