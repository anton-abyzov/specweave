/**
 * Sync Resilience Facade
 *
 * Wraps external sync calls with circuit breaker, rate limiter,
 * retry queue, and audit logging. Never throws — always returns
 * a result object.
 *
 * @module core/sync/sync-resilience
 */

import { CircuitBreakerRegistry } from './circuit-breaker-registry.js';
import { CachedRateLimiter } from './cached-rate-limiter.js';
import { SyncRetryQueue } from './sync-retry-queue.js';
import { SyncResilienceAuditLogger } from './sync-resilience-audit-logger.js';
import type { CreateNotificationInput } from '../notifications/notification-types.js';

export interface SyncResilienceParams {
  incrementId: string;
  provider: string;
  featureId: string;
  projectPath: string;
  projectName: string;
}

export interface SyncResilienceResult {
  ok: boolean;
  skipped?: 'circuit_open' | 'rate_limit';
  error?: string;
  durationMs?: number;
}

type NotificationAddFn = (input: CreateNotificationInput) => Promise<unknown>;

interface SyncResilienceDeps {
  registry: CircuitBreakerRegistry;
  retryQueue: SyncRetryQueue;
  auditLogger: SyncResilienceAuditLogger;
  rateLimiter: CachedRateLimiter;
  syncFn: (params: SyncResilienceParams) => Promise<void>;
  notificationAdd?: NotificationAddFn;
}

export class SyncResilience {
  private readonly registry: CircuitBreakerRegistry;
  private readonly retryQueue: SyncRetryQueue;
  private readonly auditLogger: SyncResilienceAuditLogger;
  private readonly rateLimiter: CachedRateLimiter;
  private readonly syncFn: (params: SyncResilienceParams) => Promise<void>;
  private readonly notificationAdd?: NotificationAddFn;

  constructor(deps: SyncResilienceDeps) {
    this.registry = deps.registry;
    this.retryQueue = deps.retryQueue;
    this.auditLogger = deps.auditLogger;
    this.rateLimiter = deps.rateLimiter;
    this.syncFn = deps.syncFn;
    this.notificationAdd = deps.notificationAdd;
  }

  async syncWithResilience(params: SyncResilienceParams): Promise<SyncResilienceResult> {
    try {
      const { provider } = params;
      const breaker = this.registry.get(provider);

      // Pre-flight: circuit breaker
      if (!breaker.canSync()) {
        await this.retryQueue.enqueue({
          incrementId: params.incrementId,
          provider,
          featureId: params.featureId,
          projectPath: params.projectPath,
          projectName: params.projectName,
          error: 'Circuit breaker open',
        });
        await this.auditLogger.append({
          incrementId: params.incrementId,
          provider,
          outcome: 'skipped_circuit_open',
        });
        await this.notify({
          type: 'sync-failure',
          severity: 'warning',
          title: `Sync skipped: ${provider} circuit open`,
          message: `Circuit breaker is open for ${provider} (increment ${params.incrementId}). Sync queued for retry.`,
          data: { incrementId: params.incrementId, provider, reason: 'circuit_open' },
        });
        return { ok: false, skipped: 'circuit_open' };
      }

      // Pre-flight: rate limiter (GitHub only)
      if (provider === 'github') {
        const rateResult = await this.rateLimiter.canProceed(1);
        if (!rateResult.allowed) {
          await this.retryQueue.enqueue({
            incrementId: params.incrementId,
            provider,
            featureId: params.featureId,
            projectPath: params.projectPath,
            projectName: params.projectName,
            error: rateResult.reason || 'Rate limit exceeded',
          });
          await this.auditLogger.append({
            incrementId: params.incrementId,
            provider,
            outcome: 'skipped_rate_limit',
          });
          await this.notify({
            type: 'sync-failure',
            severity: 'warning',
            title: `Sync skipped: ${provider} rate limited`,
            message: `GitHub API rate limit exceeded (increment ${params.incrementId}). Sync queued for retry.`,
            data: { incrementId: params.incrementId, provider, reason: 'rate_limit' },
          });
          return { ok: false, skipped: 'rate_limit' };
        }
      }

      // Execute sync
      const startMs = Date.now();
      await this.syncFn(params);
      const durationMs = Date.now() - startMs;

      // Record success
      breaker.recordSuccess();
      await this.auditLogger.append({
        incrementId: params.incrementId,
        provider,
        outcome: 'success',
        durationMs,
      });

      return { ok: true, durationMs };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;

      // Record failure on circuit breaker
      const breaker = this.registry.get(params.provider);
      breaker.recordFailure();

      // Enqueue for retry
      await this.retryQueue.enqueue({
        incrementId: params.incrementId,
        provider: params.provider,
        featureId: params.featureId,
        projectPath: params.projectPath,
        projectName: params.projectName,
        error: errMsg,
      });

      // Audit log
      await this.auditLogger.append({
        incrementId: params.incrementId,
        provider: params.provider,
        outcome: 'failure',
        error: errMsg,
        errorStack: errStack,
      });

      // Notification
      await this.notify({
        type: 'sync-failure',
        severity: 'warning',
        title: `Sync failed: ${params.provider}`,
        message: `External sync to ${params.provider} failed for increment ${params.incrementId}: ${errMsg}. Queued for retry.`,
        data: { incrementId: params.incrementId, provider: params.provider, error: errMsg },
      });

      return { ok: false, error: errMsg };
    }
  }

  private async notify(input: CreateNotificationInput): Promise<void> {
    if (!this.notificationAdd) return;
    try {
      await this.notificationAdd(input);
    } catch {
      // Notification failures should never block sync flow
    }
  }
}
