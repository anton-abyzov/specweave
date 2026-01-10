/**
 * Discrepancy to Increment Generator
 *
 * Converts brownfield discrepancies into actionable increments.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger, consoleLogger } from '../../utils/logger.js';
import { BrownfieldDiscrepancy } from './brownfield-types.js';
import { BrownfieldDiscrepancyManager } from './brownfield-manager.js';

/**
 * Options for generating an increment from discrepancies
 */
export interface GenerateIncrementOptions {
  discrepancyIds: string[];
  projectPath: string;
  incrementTitle?: string;
  logger?: Logger;
}

/**
 * Result of increment generation
 */
export interface GenerateIncrementResult {
  success: boolean;
  incrementId: string;
  incrementPath: string;
  discrepanciesLinked: number;
  error?: string;
}

/**
 * Generate an increment spec from discrepancies
 */
export async function generateSpecFromDiscrepancies(
  discrepancies: BrownfieldDiscrepancy[],
  incrementId: string,
  incrementTitle?: string
): Promise<string> {
  // Group by module
  const byModule = new Map<string, BrownfieldDiscrepancy[]>();
  for (const disc of discrepancies) {
    const module = disc.module || 'unknown';
    if (!byModule.has(module)) {
      byModule.set(module, []);
    }
    byModule.get(module)!.push(disc);
  }

  const modules = Array.from(byModule.keys());
  const primaryModule = modules[0];
  const title = incrementTitle || `Documentation Improvement: ${primaryModule}`;

  // Build discrepancy table
  const discTable = discrepancies.map(d =>
    `| ${d.id} | ${d.type} | ${d.priority} | ${d.summary.slice(0, 50)}${d.summary.length > 50 ? '...' : ''} |`
  ).join('\n');

  // Build acceptance criteria
  const acs = discrepancies.map((d, i) =>
    `- [ ] **AC-US1-${String(i + 1).padStart(2, '0')}**: ${d.summary} (${d.id})`
  ).join('\n');

  // Build affected files section
  const affectedFiles = discrepancies
    .filter(d => d.codeLocation)
    .map(d => `- \`${d.codeLocation}\` (${d.id})`)
    .join('\n');

  const spec = `---
increment: ${incrementId}
status: planning
type: documentation
created: ${new Date().toISOString().split('T')[0]}
---

# ${title}

## Context

This increment addresses documentation gaps detected during brownfield analysis.

### Source Discrepancies

| ID | Type | Priority | Summary |
|----|------|----------|---------|
${discTable}

## User Stories

### US-001: Document ${primaryModule} Module

**As a** new developer joining the team,
**I want** comprehensive documentation for the ${primaryModule} module,
**So that** I can understand and contribute to this area of the codebase.

#### Acceptance Criteria

${acs}

## Technical Notes

### Affected Files

${affectedFiles || 'No specific files identified.'}

### Linked Discrepancies

${discrepancies.map(d => `- **${d.id}**: ${d.type} - ${d.summary}`).join('\n')}

## Success Criteria

- All acceptance criteria marked complete
- Documentation reviewed by at least one team member
- No new discrepancies detected in this module on next analysis
`;

  return spec;
}

/**
 * Link discrepancies to an increment
 */
export async function linkDiscrepanciesToIncrement(
  projectPath: string,
  discrepancyIds: string[],
  incrementId: string,
  options: { logger?: Logger } = {}
): Promise<number> {
  const logger = options.logger ?? consoleLogger;
  const manager = new BrownfieldDiscrepancyManager(projectPath, { logger });

  let linked = 0;
  for (const id of discrepancyIds) {
    try {
      const success = await manager.linkToIncrement(id, incrementId);
      if (success) {
        linked++;
        logger.log(`Linked ${id} to increment ${incrementId}`);
      } else {
        logger.warn(`Discrepancy ${id} not found`);
      }
    } catch (error) {
      logger.error(`Failed to link ${id}:`, error);
    }
  }

  return linked;
}

/**
 * Resolve discrepancies when increment is completed
 */
export async function resolveDiscrepanciesOnCompletion(
  projectPath: string,
  incrementId: string,
  options: { logger?: Logger } = {}
): Promise<number> {
  const logger = options.logger ?? consoleLogger;
  const manager = new BrownfieldDiscrepancyManager(projectPath, { logger });

  // Find all discrepancies linked to this increment
  const discrepancies = await manager.listDiscrepancies({
    incrementId,
    status: 'in-progress',
  });

  let resolved = 0;
  for (const disc of discrepancies) {
    try {
      await manager.resolveDiscrepancy(disc.id, {
        type: 'doc-updated',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'increment-completion',
        notes: `Resolved via increment ${incrementId}`,
      });
      resolved++;
      logger.log(`Resolved ${disc.id}`);
    } catch (error) {
      logger.error(`Failed to resolve ${disc.id}:`, error);
    }
  }

  return resolved;
}

/**
 * Get the next increment ID for documentation improvements
 */
export function getNextIncrementId(projectPath: string): string {
  const incrementsDir = path.join(projectPath, '.specweave', 'increments');

  if (!fs.existsSync(incrementsDir)) {
    return '0001';
  }

  const ids = fs.readdirSync(incrementsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^\d{3,4}E?-/.test(d.name))
    .map(d => {
      const match = d.name.match(/^(\d{3,4})E?-/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(id => id > 0);

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  return String(maxId + 1).padStart(4, '0');
}

/**
 * Generate increment from discrepancies
 */
export async function generateIncrementFromDiscrepancies(
  options: GenerateIncrementOptions
): Promise<GenerateIncrementResult> {
  const logger = options.logger ?? consoleLogger;
  const manager = new BrownfieldDiscrepancyManager(options.projectPath, { logger });

  try {
    // Load discrepancies
    const discrepancies: BrownfieldDiscrepancy[] = [];
    for (const id of options.discrepancyIds) {
      const disc = await manager.getDiscrepancy(id);
      if (disc) {
        if (disc.status !== 'pending') {
          logger.warn(`Discrepancy ${id} is not in pending status (${disc.status})`);
        }
        discrepancies.push(disc);
      } else {
        logger.warn(`Discrepancy ${id} not found`);
      }
    }

    if (discrepancies.length === 0) {
      return {
        success: false,
        incrementId: '',
        incrementPath: '',
        discrepanciesLinked: 0,
        error: 'No valid discrepancies found',
      };
    }

    // Determine module name and generate increment ID
    const primaryModule = discrepancies[0].module.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const incrementNum = getNextIncrementId(options.projectPath);
    const incrementId = `${incrementNum}-${primaryModule}-docs`;

    // Create increment directory
    const incrementPath = path.join(
      options.projectPath,
      '.specweave',
      'increments',
      incrementId
    );
    fs.mkdirSync(incrementPath, { recursive: true });

    // Generate and write spec.md
    const specContent = await generateSpecFromDiscrepancies(
      discrepancies,
      incrementId,
      options.incrementTitle
    );
    fs.writeFileSync(path.join(incrementPath, 'spec.md'), specContent);

    // Create metadata.json
    const metadata = {
      incrementId,
      title: options.incrementTitle || `Documentation: ${primaryModule}`,
      status: 'planning',
      type: 'documentation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      linkedDiscrepancies: options.discrepancyIds,
      userStories: [
        {
          id: 'US-001',
          title: `Document ${primaryModule} module`,
          status: 'pending',
        },
      ],
    };
    fs.writeFileSync(
      path.join(incrementPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Link discrepancies to increment
    const linked = await linkDiscrepanciesToIncrement(
      options.projectPath,
      options.discrepancyIds,
      incrementId,
      { logger }
    );

    logger.log(`Created increment ${incrementId} with ${linked} discrepancies`);

    return {
      success: true,
      incrementId,
      incrementPath,
      discrepanciesLinked: linked,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to generate increment:', error);
    return {
      success: false,
      incrementId: '',
      incrementPath: '',
      discrepanciesLinked: 0,
      error: errorMsg,
    };
  }
}
