/**
 * Base class for duplicate detection across external PM tools.
 * Implements 3-phase protection identical across GitHub, JIRA, and ADO.
 *
 * Usage:
 *   class GitHubDuplicateDetector extends DuplicateDetectorBase<GitHubIssue> {
 *     async searchExisting(query: SearchQuery): Promise<GitHubIssue[]> { ... }
 *     async closeItem(itemId: string, reason: string): Promise<void> { ... }
 *     getItemId(item: GitHubIssue): string { ... }
 *   }
 */

export interface SearchQuery {
  incrementId: string;
  title?: string;
  project?: string;
  board?: string;
}

export interface VerificationResult<T> {
  success: boolean;
  expectedCount: number;
  actualCount: number;
  duplicates: T[];
  message: string;
}

export interface DetectionResult<T> {
  hasDuplicates: boolean;
  existing: T[];
  message: string;
}

/**
 * Abstract base class for duplicate detection.
 * Subclass per external tool (GitHub, JIRA, ADO).
 */
export abstract class DuplicateDetectorBase<T> {
  protected toolName: string;

  constructor(toolName: string) {
    this.toolName = toolName;
  }

  /**
   * Search for existing items that might be duplicates.
   * Implementation is tool-specific (different APIs).
   */
  protected abstract searchExisting(query: SearchQuery): Promise<T[]>;

  /**
   * Close/archive a duplicate item.
   * Implementation is tool-specific (different APIs).
   */
  protected abstract closeItem(itemId: string, reason: string): Promise<void>;

  /**
   * Get the unique ID of an item.
   */
  protected abstract getItemId(item: T): string;

  /**
   * Get the title/summary of an item for display.
   */
  protected abstract getItemTitle(item: T): string;

  // =========================================================================
  // PHASE 1: Detection (Before Create)
  // =========================================================================

  /**
   * Check for existing items before creating a new one.
   * Returns existing items if found, preventing duplicate creation.
   */
  async detectBeforeCreate(query: SearchQuery): Promise<DetectionResult<T>> {
    const existing = await this.searchExisting(query);

    if (existing.length > 0) {
      return {
        hasDuplicates: true,
        existing,
        message: this.formatDetectionMessage(existing, query)
      };
    }

    return {
      hasDuplicates: false,
      existing: [],
      message: `No existing ${this.toolName} items found for increment ${query.incrementId}`
    };
  }

  // =========================================================================
  // PHASE 2: Verification (After Create)
  // =========================================================================

  /**
   * Verify that creation didn't accidentally create duplicates.
   * Called after a create operation to ensure only expected items exist.
   */
  async verifyAfterCreate(
    query: SearchQuery,
    expectedCount: number
  ): Promise<VerificationResult<T>> {
    const existing = await this.searchExisting(query);
    const actualCount = existing.length;

    if (actualCount === expectedCount) {
      return {
        success: true,
        expectedCount,
        actualCount,
        duplicates: [],
        message: `Verification passed: ${actualCount} items as expected`
      };
    }

    if (actualCount > expectedCount) {
      const duplicates = existing.slice(expectedCount);
      return {
        success: false,
        expectedCount,
        actualCount,
        duplicates,
        message: this.formatVerificationMessage(expectedCount, actualCount, duplicates)
      };
    }

    // Fewer items than expected (unlikely but possible)
    return {
      success: false,
      expectedCount,
      actualCount,
      duplicates: [],
      message: `Warning: Expected ${expectedCount} items but found ${actualCount}`
    };
  }

  // =========================================================================
  // PHASE 3: Auto-Correction (Close Duplicates)
  // =========================================================================

  /**
   * Automatically close duplicate items.
   * Called when duplicates are detected to clean them up.
   */
  async closeDuplicates(duplicates: T[]): Promise<void> {
    for (const duplicate of duplicates) {
      const itemId = this.getItemId(duplicate);
      const title = this.getItemTitle(duplicate);

      try {
        await this.closeItem(
          itemId,
          `Closed as duplicate by SpecWeave auto-correction`
        );
        console.log(`✅ Closed duplicate ${this.toolName} item #${itemId}: ${title}`);
      } catch (error) {
        console.error(`❌ Failed to close duplicate #${itemId}: ${error}`);
      }
    }
  }

  // =========================================================================
  // Message Formatting (Consistent across tools)
  // =========================================================================

  private formatDetectionMessage(existing: T[], query: SearchQuery): string {
    const itemList = existing
      .map(item => `  - #${this.getItemId(item)}: ${this.getItemTitle(item)}`)
      .join('\n');

    return `
⚠️  Existing ${this.toolName} items found for increment ${query.incrementId}:

${itemList}

Options:
1. Link to existing: Use --link-existing to connect without creating new items
2. Force create: Use --force to create anyway (not recommended)
3. Skip: Cancel this operation
`.trim();
  }

  private formatVerificationMessage(
    expected: number,
    actual: number,
    duplicates: T[]
  ): string {
    const itemList = duplicates
      .map(item => `  - #${this.getItemId(item)}: ${this.getItemTitle(item)}`)
      .join('\n');

    return `
⚠️  Duplicate ${this.toolName} items detected!

Expected: ${expected} items
Found: ${actual} items
Duplicates:
${itemList}

Auto-correction: These duplicates will be closed automatically.
`.trim();
  }
}
