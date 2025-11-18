/**
 * IncrementFactory - Builder pattern for creating test increment objects
 *
 * Usage:
 * ```typescript
 * const increment = new IncrementFactory()
 *   .withId('0099')
 *   .withStatus('active')
 *   .withPriority('P1')
 *   .build();
 * ```
 */

import type { IncrementMetadata } from '../../../src/types/increment.js';
import minimalFixture from '../../fixtures/increments/minimal.json';

export class IncrementFactory {
  private data: Partial<IncrementMetadata>;

  constructor() {
    // Start with minimal fixture as base
    this.data = JSON.parse(JSON.stringify(minimalFixture));
  }

  /**
   * Set increment ID (e.g., '0042')
   */
  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  /**
   * Set increment name (kebab-case, e.g., 'test-cleanup')
   */
  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  /**
   * Set increment title (human-readable)
   */
  withTitle(title: string): this {
    this.data.title = title;
    return this;
  }

  /**
   * Set increment status
   */
  withStatus(status: 'active' | 'planning' | 'in-progress' | 'completed' | 'paused' | 'abandoned'): this {
    this.data.status = status;
    return this;
  }

  /**
   * Set increment type
   */
  withType(type: 'feature' | 'bug' | 'hotfix' | 'refactor' | 'experiment' | 'change-request'): this {
    this.data.type = type;
    return this;
  }

  /**
   * Set priority
   */
  withPriority(priority: 'P0' | 'P1' | 'P2' | 'P3'): this {
    this.data.priority = priority;
    return this;
  }

  /**
   * Set epic ID
   */
  withEpic(epic: string): this {
    this.data.epic = epic;
    return this;
  }

  /**
   * Set test mode
   */
  withTestMode(mode: 'TDD' | 'BDD' | 'NONE'): this {
    this.data.test_mode = mode;
    return this;
  }

  /**
   * Set coverage target
   */
  withCoverageTarget(target: number): this {
    this.data.coverage_target = target;
    return this;
  }

  /**
   * Set metadata fields
   */
  withMetadata(metadata: {
    created?: string;
    updated?: string;
    started?: string;
    completed?: string;
  }): this {
    this.data.metadata = {
      ...this.data.metadata,
      ...metadata,
    };
    return this;
  }

  /**
   * Set team information
   */
  withTeam(team: {
    lead?: string;
    contributors?: string[];
  }): this {
    this.data.team = {
      ...this.data.team,
      ...team,
    };
    return this;
  }

  /**
   * Set metrics
   */
  withMetrics(metrics: Record<string, any>): this {
    this.data.metrics = {
      ...this.data.metrics,
      ...metrics,
    };
    return this;
  }

  /**
   * Build the final increment object
   */
  build(): IncrementMetadata {
    return this.data as IncrementMetadata;
  }

  /**
   * Reset to minimal fixture state
   */
  reset(): this {
    this.data = JSON.parse(JSON.stringify(minimalFixture));
    return this;
  }
}
