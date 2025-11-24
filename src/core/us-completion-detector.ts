/**
 * User Story Completion Detector
 *
 * Detects when user stories become fully complete (all ACs satisfied)
 * and triggers living docs + external tool sync.
 *
 * CRITICAL: This module enables automatic US-level sync cascade:
 * Task completion → AC marking → US detection → Living docs sync → External tools sync
 *
 * Architecture:
 * - Parses spec.md to extract all ACs
 * - Groups ACs by user story (AC-US1-01 → US-001)
 * - Detects which USs have ALL ACs marked [x]
 * - Tracks completion state to prevent re-sync
 *
 * Integration:
 * - Called by consolidated-sync.js after AC sync
 * - Returns newly completed USs (state transition detection)
 * - Living docs sync handles external tool updates
 */

import { promises as fs } from 'fs';
import path from 'path';
import { Logger, consoleLogger } from '../utils/logger.js';

/**
 * User Story completion data
 */
export interface UserStoryCompletion {
  usId: string;               // e.g., "US-001"
  title: string;              // User story title
  totalACs: number;           // Total ACs for this US
  completedACs: number;       // Number of completed ACs
  percentage: number;         // Completion percentage (0-100)
  isComplete: boolean;        // true if all ACs are complete
  status: string;             // US status: "not_started" | "in_progress" | "completed"
  acIds: string[];            // Array of AC IDs (e.g., ["AC-US1-01", "AC-US1-02"])
  completedAcIds: string[];   // Array of completed AC IDs
  wasAlreadyComplete: boolean; // true if US was already complete before (prevents re-sync)
}

/**
 * Acceptance Criteria data from spec.md
 */
interface ACData {
  acId: string;               // e.g., "AC-US1-01"
  usId: string;               // e.g., "US-001" (extracted from AC-US1-01)
  description: string;        // AC description
  completed: boolean;         // true if checkbox is [x]
  lineNumber: number;         // Line number in spec.md
}

/**
 * User Story Completion Detector
 *
 * Detects when user stories transition from incomplete to complete
 * and triggers sync cascade.
 */
export class USCompletionDetector {
  private projectRoot: string;
  private logger: Logger;

  constructor(projectRoot: string, options: { logger?: Logger } = {}) {
    this.projectRoot = projectRoot;
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Detect user story completions for an increment
   *
   * @param incrementId - Increment ID (e.g., "0053-safe-feature-deletion")
   * @returns Array of user story completion data
   */
  async detectCompletions(incrementId: string): Promise<UserStoryCompletion[]> {
    try {
      // 1. Parse spec.md to extract all ACs
      const acs = await this.parseSpecACs(incrementId);

      if (acs.length === 0) {
        this.logger.log(`   ℹ️  No ACs found in spec.md for ${incrementId}`);
        return [];
      }

      // 2. Group ACs by user story
      const usGroups = this.groupACsByUserStory(acs);

      // 3. Calculate completion status for each user story
      const completions = this.calculateCompletions(usGroups);

      // 4. Load previous completion state (to detect NEW completions)
      const previousState = await this.loadCompletionState(incrementId);

      // 5. Mark which USs were already complete
      for (const completion of completions) {
        completion.wasAlreadyComplete = previousState.has(completion.usId);
      }

      return completions;

    } catch (error) {
      this.logger.error(`   ❌ Failed to detect US completions for ${incrementId}:`, error);
      return [];
    }
  }

  /**
   * Get only NEWLY completed user stories (state transition detection)
   *
   * @param incrementId - Increment ID
   * @returns Array of newly completed user stories (excludes already-complete USs)
   */
  async getNewlyCompletedUSs(incrementId: string): Promise<UserStoryCompletion[]> {
    const completions = await this.detectCompletions(incrementId);

    return completions.filter(us =>
      us.isComplete && !us.wasAlreadyComplete
    );
  }

  /**
   * Parse spec.md to extract all acceptance criteria
   *
   * @param incrementId - Increment ID
   * @returns Array of AC data
   */
  private async parseSpecACs(incrementId: string): Promise<ACData[]> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    if (!await this.fileExists(specPath)) {
      throw new Error(`spec.md not found: ${specPath}`);
    }

    const content = await fs.readFile(specPath, 'utf-8');
    const lines = content.split('\n');
    const acs: ACData[] = [];

    // Pattern: - [x] **AC-US1-01**: Description
    // Also supports: - [ ] AC-US1-01: Description (without bold)
    const acPattern = /^[-*]\s+\[([ x])\]\s+\*{0,2}(AC-US\d+-\d+)\*{0,2}:\s+(.+?)$/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(acPattern);
      if (match) {
        const completed = match[1] === 'x';
        const acId = match[2];
        const description = match[3];

        // Extract user story ID from AC ID (AC-US1-01 → US-001)
        const usMatch = acId.match(/AC-US(\d+)-\d+/);
        if (usMatch) {
          const usNum = usMatch[1].padStart(3, '0'); // 1 → 001
          const usId = `US-${usNum}`;

          acs.push({
            acId,
            usId,
            description,
            completed,
            lineNumber: i + 1
          });
        }
      }
    }

    return acs;
  }

  /**
   * Group ACs by user story
   *
   * @param acs - Array of AC data
   * @returns Map of US-ID to array of ACs
   */
  private groupACsByUserStory(acs: ACData[]): Map<string, ACData[]> {
    const groups = new Map<string, ACData[]>();

    for (const ac of acs) {
      if (!groups.has(ac.usId)) {
        groups.set(ac.usId, []);
      }
      groups.get(ac.usId)!.push(ac);
    }

    return groups;
  }

  /**
   * Calculate completion status for each user story
   *
   * @param usGroups - Map of US-ID to array of ACs
   * @returns Array of user story completion data
   */
  private calculateCompletions(
    usGroups: Map<string, ACData[]>
  ): UserStoryCompletion[] {
    const completions: UserStoryCompletion[] = [];

    for (const [usId, usACs] of usGroups.entries()) {
      const totalACs = usACs.length;
      const completedACs = usACs.filter(ac => ac.completed).length;
      const percentage = totalACs > 0
        ? Math.round((completedACs / totalACs) * 100 * 100) / 100
        : 0;
      const isComplete = percentage === 100;

      // Calculate user story status based on AC completion
      const status = this.calculateUSStatus(percentage, completedACs);

      const acIds = usACs.map(ac => ac.acId);
      const completedAcIds = usACs.filter(ac => ac.completed).map(ac => ac.acId);

      // Extract title from first AC description (if available)
      const title = this.extractUSTitle(usId, usACs);

      completions.push({
        usId,
        title,
        totalACs,
        completedACs,
        percentage,
        isComplete,
        status,
        acIds,
        completedAcIds,
        wasAlreadyComplete: false // Will be set by detectCompletions()
      });
    }

    return completions;
  }

  /**
   * Calculate user story status based on AC completion
   *
   * Status mapping (Universal 5-level hierarchy - Level 2):
   * - 0% complete → "not_started"
   * - 1-99% complete → "in_progress"
   * - 100% complete → "completed"
   *
   * @param percentage - Completion percentage (0-100)
   * @param completedACs - Number of completed ACs
   * @returns User story status
   */
  private calculateUSStatus(percentage: number, completedACs: number): string {
    if (percentage === 0) {
      return 'not_started';
    } else if (percentage === 100) {
      return 'completed';
    } else {
      return 'in_progress';
    }
  }

  /**
   * Extract user story title from ACs or generate default
   *
   * @param usId - User story ID
   * @param acs - Array of ACs for this user story
   * @returns User story title
   */
  private extractUSTitle(usId: string, acs: ACData[]): string {
    // For now, just return the US ID
    // TODO: Extract actual title from spec.md user story heading
    return usId;
  }

  /**
   * Load previous completion state from disk
   *
   * @param incrementId - Increment ID
   * @returns Set of previously completed US IDs
   */
  private async loadCompletionState(incrementId: string): Promise<Set<string>> {
    const statePath = path.join(
      this.projectRoot,
      '.specweave/state',
      `us-completion-${incrementId}.json`
    );

    try {
      if (!await this.fileExists(statePath)) {
        return new Set();
      }

      const content = await fs.readFile(statePath, 'utf-8');
      const data = JSON.parse(content);

      // Return set of US IDs that were marked as complete
      return new Set(
        Object.entries(data)
          .filter(([_, state]: [string, any]) => state.completed)
          .map(([usId]) => usId)
      );

    } catch (error) {
      this.logger.warn(`   ⚠️  Failed to load completion state: ${error}`);
      return new Set();
    }
  }

  /**
   * Save completion state to disk
   *
   * @param incrementId - Increment ID
   * @param completions - Array of user story completion data
   */
  async saveCompletionState(
    incrementId: string,
    completions: UserStoryCompletion[]
  ): Promise<void> {
    const statePath = path.join(
      this.projectRoot,
      '.specweave/state',
      `us-completion-${incrementId}.json`
    );

    try {
      // Ensure state directory exists
      await fs.mkdir(path.dirname(statePath), { recursive: true });

      // Build state object
      const state: Record<string, any> = {};
      for (const completion of completions) {
        state[completion.usId] = {
          completed: completion.isComplete,
          percentage: completion.percentage,
          completedAt: completion.isComplete ? new Date().toISOString() : null,
          totalACs: completion.totalACs,
          completedACs: completion.completedACs
        };
      }

      // Write to disk
      await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');

      this.logger.log(`   ✅ Saved completion state: ${statePath}`);

    } catch (error) {
      this.logger.error(`   ❌ Failed to save completion state: ${error}`);
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
