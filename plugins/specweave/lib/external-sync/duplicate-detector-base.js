class DuplicateDetectorBase {
  constructor(toolName) {
    this.toolName = toolName;
  }
  // =========================================================================
  // PHASE 1: Detection (Before Create)
  // =========================================================================
  /**
   * Check for existing items before creating a new one.
   * Returns existing items if found, preventing duplicate creation.
   */
  async detectBeforeCreate(query) {
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
  async verifyAfterCreate(query, expectedCount) {
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
  async closeDuplicates(duplicates) {
    for (const duplicate of duplicates) {
      const itemId = this.getItemId(duplicate);
      const title = this.getItemTitle(duplicate);
      try {
        await this.closeItem(
          itemId,
          `Closed as duplicate by SpecWeave auto-correction`
        );
        console.log(`\u2705 Closed duplicate ${this.toolName} item #${itemId}: ${title}`);
      } catch (error) {
        console.error(`\u274C Failed to close duplicate #${itemId}: ${error}`);
      }
    }
  }
  // =========================================================================
  // Message Formatting (Consistent across tools)
  // =========================================================================
  formatDetectionMessage(existing, query) {
    const itemList = existing.map((item) => `  - #${this.getItemId(item)}: ${this.getItemTitle(item)}`).join("\n");
    return `
\u26A0\uFE0F  Existing ${this.toolName} items found for increment ${query.incrementId}:

${itemList}

Options:
1. Link to existing: Use --link-existing to connect without creating new items
2. Force create: Use --force to create anyway (not recommended)
3. Skip: Cancel this operation
`.trim();
  }
  formatVerificationMessage(expected, actual, duplicates) {
    const itemList = duplicates.map((item) => `  - #${this.getItemId(item)}: ${this.getItemTitle(item)}`).join("\n");
    return `
\u26A0\uFE0F  Duplicate ${this.toolName} items detected!

Expected: ${expected} items
Found: ${actual} items
Duplicates:
${itemList}

Auto-correction: These duplicates will be closed automatically.
`.trim();
  }
}
export {
  DuplicateDetectorBase
};
