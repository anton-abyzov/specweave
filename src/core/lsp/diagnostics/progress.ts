/**
 * Progress indicator for LSP operations
 *
 * @see spec.md US-005: Progress & Diagnostics
 * @satisfies AC-US5-01
 */

/**
 * Progress callback for LSP operations
 */
export interface ProgressCallback {
  start(message: string): void;
  update(message: string): void;
  succeed(message: string): void;
  fail(message: string): void;
}

/**
 * Progress tracker that shows elapsed time
 */
export class LspProgress implements ProgressCallback {
  private startTime: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private currentMessage: string = '';
  private onUpdate?: (message: string) => void;

  constructor(onUpdate?: (message: string) => void) {
    this.onUpdate = onUpdate;
  }

  start(message: string): void {
    this.startTime = Date.now();
    this.currentMessage = message;
    this.emit(`[...] ${message}...`);

    // Update every second to show elapsed time
    // Use unref() to prevent interval from keeping process alive
    this.intervalId = setInterval(() => {
      const elapsed = this.getElapsedSeconds();
      this.emit(`[...] ${this.currentMessage} (${elapsed}s elapsed)...`);
    }, 1000);
    this.intervalId.unref();
  }

  update(message: string): void {
    this.currentMessage = message;
    const elapsed = this.getElapsedSeconds();
    this.emit(`[...] ${message} (${elapsed}s elapsed)...`);
  }

  succeed(message: string): void {
    this.stop();
    const elapsed = this.getElapsedSeconds();
    this.emit(`[OK] ${message} (${elapsed}s)`);
  }

  fail(message: string): void {
    this.stop();
    const elapsed = this.getElapsedSeconds();
    this.emit(`[FAILED] ${message} (${elapsed}s)`);
  }

  private stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private getElapsedSeconds(): number {
    // Use max(0) to handle potential clock adjustments
    return Math.max(0, Math.round((Date.now() - this.startTime) / 1000));
  }

  private emit(message: string): void {
    if (this.onUpdate) {
      this.onUpdate(message);
    }
  }
}

/**
 * Format symbol count report
 *
 * @param counts - Map of symbol kind to count
 * @returns Formatted string like "847 symbols (423 functions, 312 classes, 112 interfaces)"
 */
export function formatSymbolCount(counts: Record<string, number>): string {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  if (total === 0) {
    return '0 symbols';
  }

  const parts: string[] = [];
  const order = ['functions', 'classes', 'interfaces', 'methods', 'variables', 'constants'];

  for (const kind of order) {
    if (counts[kind] && counts[kind] > 0) {
      parts.push(`${counts[kind]} ${kind}`);
    }
  }

  // Add any remaining kinds not in the order list
  for (const [kind, count] of Object.entries(counts)) {
    if (!order.includes(kind) && count > 0) {
      parts.push(`${count} ${kind}`);
    }
  }

  if (parts.length === 0) {
    return `${total} symbols`;
  }

  return `${total} symbols (${parts.join(', ')})`;
}
