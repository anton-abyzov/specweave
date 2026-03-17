class AdoRateLimiter {
  constructor(options) {
    this.capacity = options?.capacity ?? 200;
    this.windowMs = options?.windowMs ?? 6e4;
    this.tokens = this.capacity;
    this.windowStart = Date.now();
    this.retryAfterUntil = 0;
  }
  /**
   * Try to consume one token. Returns true if allowed, false if exhausted.
   */
  consume() {
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
  remaining() {
    this.refillIfWindowExpired();
    return this.tokens;
  }
  /**
   * Whether the bucket is fully exhausted (0 tokens remaining).
   */
  isExhausted() {
    this.refillIfWindowExpired();
    return this.tokens <= 0;
  }
  /**
   * Apply a Retry-After delay (from ADO 429 response).
   * Blocks all consumption until the delay expires.
   *
   * @param seconds - Number of seconds to wait
   */
  applyRetryAfter(seconds) {
    this.retryAfterUntil = Date.now() + seconds * 1e3;
  }
  refillIfWindowExpired() {
    const now = Date.now();
    if (now - this.windowStart >= this.windowMs) {
      this.tokens = this.capacity;
      this.windowStart = now;
    }
  }
}
export {
  AdoRateLimiter
};
