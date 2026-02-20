/**
 * Scan Pipeline
 *
 * Orchestrates: content fetching → security scanning → status update.
 * Takes a submission in "scanning" status, fetches its SKILL.md,
 * runs scanSkillContent(), and advances to tier1_passed or tier1_failed.
 */

import type { SkillSubmission, Tier1Result } from '../submission-queue-types.js';
import type { SubmissionQueue } from '../submission-queue.js';
import { ContentFetcher } from './content-fetcher.js';
import { scanSkillContent } from '../security-scanner.js';

const TIER1_PASS_THRESHOLD = 70;

export class ScanPipeline {
  private fetcher: ContentFetcher;

  constructor(
    private queue: SubmissionQueue,
    options?: { token?: string },
  ) {
    this.fetcher = new ContentFetcher({ token: options?.token });
  }

  /**
   * Fetch SKILL.md and run Tier 1 security scan for a submission.
   * The submission must be in "scanning" status.
   * Returns the updated submission, or null if not found.
   */
  async scanSubmission(id: string): Promise<SkillSubmission | null> {
    const sub = this.queue.getById(id);
    if (!sub) return null;

    // Fetch SKILL.md content
    const content = await this.fetcher.fetchSkillContent(sub.repoFullName, sub.skillPath);

    if (!content) {
      // SKILL.md not found — mark as failed
      this.queue.updateFields(id, {
        tier1Result: { passed: false, findings: 0, score: 0 },
      });
      const updated = this.queue.updateStatus(id, 'tier1_failed');
      if (updated) {
        // Store reason via reject-like mechanism (but keeping tier1_failed status)
        updated.rejectedReason = 'SKILL.md not found in repository';
        // Re-save by updating fields
        this.queue.updateFields(id, {});
      }
      return this.queue.getById(id);
    }

    // Store the fetched content
    this.queue.updateFields(id, { skillContent: content });

    // Run security scan
    const scanResult = scanSkillContent(content);
    const score = computeScore(scanResult.passed, scanResult.findings.length);

    const tier1Result: Tier1Result = {
      passed: scanResult.passed && score >= TIER1_PASS_THRESHOLD,
      findings: scanResult.findings.length,
      score,
    };

    this.queue.updateFields(id, { tier1Result });

    // Advance status based on result
    const newStatus = tier1Result.passed ? 'tier1_passed' : 'tier1_failed';
    this.queue.updateStatus(id, newStatus);

    return this.queue.getById(id);
  }
}

/**
 * Compute a 0-100 trust score from scan results.
 * Starts at 100, deducts per finding.
 */
function computeScore(passed: boolean, findingCount: number): number {
  if (!passed) return Math.max(0, 30 - findingCount * 10);
  return Math.max(0, 100 - findingCount * 15);
}
