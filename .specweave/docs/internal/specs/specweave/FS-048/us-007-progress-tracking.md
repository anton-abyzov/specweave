---
id: US-007
feature: FS-048
title: "Progress Tracking (Batch Loading with Cancel)"
status: proposed
priority: P1
created: 2025-11-21
---

# US-007: Progress Tracking (Batch Loading with Cancel)

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/709

**Feature**: [FS-048 - Enhanced External Tool Import](../../../_features/FS-048/FEATURE.md)

## User Story

**As a** user importing 100+ projects
**I want** real-time progress indicators and cancelation support
**So that** I know how long it will take and can stop if needed

## Business Value

- **User Confidence**: Progress bars reduce perceived wait time
- **Flexibility**: Cancelation allows course correction (wrong filters, etc.)
- **Error Transparency**: Show which projects failed, why, and how to fix

## Acceptance Criteria

### AC-US7-01: Real-Time Progress Bar
- **Priority**: P1
- **Testable**: Yes (E2E test with visual validation)
- **Description**: Show progress during bulk operations
- **Format**:
  ```
  Loading projects... 47/127 (37%) [=============>          ]
  ```
- **Updates**: Every 5 projects (avoid UI spam)
- **Validation**: Progress bar visible, percentage accurate

### AC-US7-02: Project-Level Status
- **Priority**: P1
- **Testable**: Yes (E2E test)
- **Description**: Show current project being processed
- **Format**:
  ```
  Loading projects... 47/127 (37%)
  ✅ BACKEND (completed)
  ✅ FRONTEND (completed)
  ⏳ MOBILE (loading dependencies...)
  ```
- **Validation**: Current project highlighted, status accurate

### AC-US7-03: Elapsed Time Tracking
- **Priority**: P2
- **Testable**: Yes (integration test)
- **Description**: Show elapsed time and estimated remaining
- **Format**:
  ```
  Loading projects... 47/127 (37%) [47s elapsed, ~2m remaining]
  ```
- **Calculation**: Linear extrapolation based on current rate
- **Validation**: Time estimates within 20% accuracy

### AC-US7-04: Cancelation Support (Ctrl+C)
- **Priority**: P1
- **Testable**: Yes (integration test)
- **Description**: Gracefully handle Ctrl+C during import
- **Behavior**:
  - Save partial progress to `.specweave/cache/import-state.json`
  - Show summary: "Imported 47/127 projects (37% complete)"
  - Suggest resume: "Run /specweave-jira:import-projects --resume to continue"
  - Exit cleanly (no errors, no corruption)
- **Validation**: State saved, resume works

### AC-US7-05: Error Handling (Continue on Failure)
- **Priority**: P1
- **Testable**: Yes (integration test)
- **Description**: Continue importing if single project fails
- **Behavior**:
  - Log error: `❌ PROJECT-123: API error (403 Forbidden)`
  - Continue to next project (don't stop entire batch)
  - Final summary: "Imported 98/127, 5 failed, 24 skipped"
- **Validation**: Import completes despite errors

### AC-US7-06: Final Summary Report
- **Priority**: P1
- **Testable**: Yes (E2E test)
- **Description**: Comprehensive summary after import
- **Format**:
  ```
  ✅ Import Complete!

  Imported: 98 projects
  Failed: 5 projects (see .specweave/logs/import-errors.log)
    ❌ PROJECT-123: 403 Forbidden (check permissions)
    ❌ PROJECT-456: 404 Not Found (project deleted?)
    ❌ PROJECT-789: Timeout (network issue)
  Skipped: 24 projects (archived)

  Total time: 2m 34s
  ```
- **Validation**: Summary accurate, error log created

## Technical Implementation

### Progress Tracker (New Module)

```typescript
// src/core/progress/progress-tracker.ts (NEW)

export interface ProgressOptions {
  total: number;
  label?: string;
  showEta?: boolean;
}

export class ProgressTracker {
  private total: number;
  private current: number = 0;
  private startTime: number;
  private label: string;
  private showEta: boolean;

  constructor(options: ProgressOptions) {
    this.total = options.total;
    this.label = options.label || 'Processing';
    this.showEta = options.showEta ?? true;
    this.startTime = Date.now();
  }

  /**
   * Update progress (call after each item)
   */
  update(item: string, status: 'pending' | 'success' | 'error' = 'success'): void {
    this.current++;

    const percentage = Math.floor((this.current / this.total) * 100);
    const progressBar = this.renderProgressBar(percentage);

    const elapsed = this.getElapsedTime();
    const eta = this.showEta ? this.getEta() : '';

    const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';

    console.log(`${this.label}... ${this.current}/${this.total} (${percentage}%) ${progressBar} ${elapsed}${eta}`);
    console.log(`${statusIcon} ${item}`);
  }

  /**
   * Render ASCII progress bar
   */
  private renderProgressBar(percentage: number): string {
    const width = 30;
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;

    return `[${'='.repeat(filled)}${'>'}${' '.repeat(empty - 1)}]`;
  }

  /**
   * Get elapsed time (human-readable)
   */
  private getElapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);

    if (seconds < 60) return `[${seconds}s elapsed]`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `[${minutes}m ${remainingSeconds}s elapsed]`;
  }

  /**
   * Estimate time remaining (linear extrapolation)
   */
  private getEta(): string {
    if (this.current === 0) return '';

    const elapsed = Date.now() - this.startTime;
    const rate = elapsed / this.current;  // ms per item
    const remaining = (this.total - this.current) * rate;

    const seconds = Math.floor(remaining / 1000);

    if (seconds < 60) return `, ~${seconds}s remaining`;
    const minutes = Math.floor(seconds / 60);
    return `, ~${minutes}m remaining`;
  }

  /**
   * Finish (show final summary)
   */
  finish(succeeded: number, failed: number, skipped: number): void {
    const totalTime = this.getElapsedTime();

    console.log(`\n✅ ${this.label} Complete!\n`);
    console.log(`   Succeeded: ${succeeded}`);
    if (failed > 0) console.log(`   Failed: ${failed}`);
    if (skipped > 0) console.log(`   Skipped: ${skipped}`);
    console.log(`   Total time: ${totalTime}\n`);
  }
}
```

### Cancelation Handler

```typescript
// src/core/progress/cancelation-handler.ts (NEW)

export class CancelationHandler {
  private isCanceled: boolean = false;
  private saveState: (state: any) => Promise<void>;

  constructor(saveState: (state: any) => Promise<void>) {
    this.saveState = saveState;

    // Register Ctrl+C handler
    process.on('SIGINT', async () => {
      if (this.isCanceled) {
        process.exit(1);  // Force exit on second Ctrl+C
      }

      this.isCanceled = true;
      console.log('\n\n⏸️  Cancelation requested...');
      console.log('   Saving progress (press Ctrl+C again to force exit)\n');

      await this.handleCancelation();
    });
  }

  /**
   * Check if cancelation requested
   */
  shouldCancel(): boolean {
    return this.isCanceled;
  }

  /**
   * Handle cancelation (save state, exit)
   */
  private async handleCancelation(): Promise<void> {
    try {
      // Save current state
      await this.saveState({
        timestamp: new Date().toISOString(),
        canceled: true
      });

      console.log('✅ Progress saved. Run with --resume to continue.\n');
      process.exit(0);
    } catch (error) {
      console.error('❌ Failed to save progress:', (error as Error).message);
      process.exit(1);
    }
  }
}
```

## Test Cases

### TC-US7-01: Progress Bar Updates (E2E Test)
```typescript
test('should show progress bar during import', async ({ page }) => {
  await page.goto('/');
  await initializeJira(page);

  // Trigger import (100 projects)
  await page.getByRole('button', { name: 'Import All' }).click();

  // Verify progress bar appears
  const progressBar = page.locator('[data-testid="progress-bar"]');
  await expect(progressBar).toBeVisible();

  // Wait for progress updates
  await page.waitForSelector('text=/47\\/100/');  // 47/100
  await page.waitForSelector('text=/100\\/100/');  // 100/100
});
```

### TC-US7-02: Cancelation Handling (Integration Test)
```typescript
test('should save state on Ctrl+C', async () => {
  const tracker = new ProgressTracker({ total: 100 });
  const handler = new CancelationHandler(async (state) => {
    await saveImportState(state);
  });

  // Simulate Ctrl+C after 50 items
  for (let i = 0; i < 50; i++) {
    tracker.update(`PROJECT-${i}`, 'success');

    if (i === 49) {
      process.emit('SIGINT');  // Simulate Ctrl+C
    }
  }

  // Verify state saved
  const state = await loadImportState();
  expect(state.completed).toBe(50);
  expect(state.canceled).toBe(true);
});
```

### TC-US7-03: Error Handling (Integration Test)
```typescript
test('should continue import despite errors', async () => {
  const tracker = new ProgressTracker({ total: 10 });
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < 10; i++) {
    try {
      // Simulate error on project 5
      if (i === 5) throw new Error('API error');

      tracker.update(`PROJECT-${i}`, 'success');
      succeeded++;
    } catch (error) {
      tracker.update(`PROJECT-${i}`, 'error');
      failed++;
    }
  }

  expect(succeeded).toBe(9);
  expect(failed).toBe(1);
});
```

### TC-US7-04: Final Summary (E2E Test)
```typescript
test('should show summary after import', async ({ page }) => {
  await page.goto('/');
  await importProjects(page, 100);

  // Verify summary shown
  const summary = page.getByText(/Import Complete/);
  await expect(summary).toBeVisible();

  // Verify stats
  await expect(page.getByText(/Succeeded: 98/)).toBeVisible();
  await expect(page.getByText(/Failed: 2/)).toBeVisible();
});
```

## Dependencies

- **US-001**: Smart Pagination (progress tracking during init)
- **US-005**: Dedicated Import Commands (uses progress tracker)

## Risks & Mitigations

### Risk: Progress Bar Spam (Too Many Updates)
- **Problem**: Updating on every project (100 updates) is noisy
- **Mitigation**:
  - Update every 5 projects (reduce spam)
  - Configurable: `--progress-interval 10`

### Risk: ETA Inaccuracy (Variable API Latency)
- **Problem**: Linear extrapolation is wrong if API slow/fast
- **Mitigation**:
  - Use rolling average (last 10 projects)
  - Show range: "~2-3m remaining" instead of "~2m 34s"

---

**Implementation Tasks**: See increment plan
**Related User Stories**: US-005 (Import Commands), US-001 (Smart Pagination)
