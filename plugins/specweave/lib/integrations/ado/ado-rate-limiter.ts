/**
 * ADO Token Bucket Rate Limiter
 *
 * Simple token bucket that prevents exceeding Azure DevOps API rate limits.
 * ADO's documented limit is ~200 requests per minute for PAT-based auth.
 *
 * Supports Retry-After header handling: when ADO returns 429, call
 * applyRetryAfter(seconds) to block consumption until the cooldown expires.
 *
 * @module ado-rate-limiter
 */

export interface AdoRateLimiterOptions {
  /** Max tokens per window (default: 200) */
  capacity?: number;
  /** Window duration in ms (default: 60000 = 1 minute) */
  windowMs?: number;
}

export class AdoRateLimiter {
  private readonly capacity: number;
  private readonly windowMs: number;
  private tokens: number;
  private windowStart: number;
  private retryAfterUntil: number;

  constructor(options?: AdoRateLimiterOptions) {
    this.capacity = options?.capacity ?? 200;
    this.windowMs = options?.windowMs ?? 60_000;
    this.tokens = this.capacity;
    this.windowStart = Date.now();
    this.retryAfterUntil = 0;
  }

  /**
   * Try to consume one token. Returns true if allowed, false if exhausted.
   */
  consume(): boolean {
    this.refillIfWindowExpired();

    if (Date.now() < this.retryAfterUntil) {
      return false;
    }

    if (this.tokens <= 0) {
      return false;
    }

    this.tokens--;
    return true;
  }

  /**
   * Number of tokens remaining in the current window.
   */
  remaining(): number {
    this.refillIfWindowExpired();
    return this.tokens;
  }

  /**
   * Whether the bucket is fully exhausted (0 tokens remaining).
   */
  isExhausted(): boolean {
    this.refillIfWindowExpired();
    return this.tokens <= 0;
  }

  /**
   * Apply a Retry-After delay (from ADO 429 response).
   * Blocks all consumption until the delay expires.
   *
   * @param seconds - Number of seconds to wait
   */
  applyRetryAfter(seconds: number): void {
    this.retryAfterUntil = Date.now() + seconds * 1000;
  }

  private refillIfWindowExpired(): void {
    const now = Date.now();
    if (now - this.windowStart >= this.windowMs) {
      this.tokens = this.capacity;
      this.windowStart = now;
    }
  }
}
