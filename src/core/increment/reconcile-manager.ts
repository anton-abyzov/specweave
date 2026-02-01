/**
 * Reconcile Manager
 *
 * Handles post-merge increment ID collision resolution.
 * When multiple developers create increments with the same ID on different branches,
 * this manager detects collisions and renumbers the "later" increments.
 *
 * Updates:
 * - Increment folder name
 * - metadata.json
 * - spec.md frontmatter
 * - Living docs (FS-XXX folders)
 * - External tools (GitHub, JIRA, ADO)
 */

import * as fs from 'fs';
import * as path from 'path';
import { IncrementNumberManager } from './increment-utils.js';
import { consoleLogger as logger } from '../../utils/logger.js';

export interface IncrementInfo {
  id: string; // e.g., "0001E-auth-feature"
  baseNumber: number; // e.g., 1
  isExternal: boolean; // has E suffix
  folder: string; // relative path from increments/
  absolutePath: string;
  modifiedDate: Date;
  createdDate?: Date;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface Collision {
  baseNumber: number;
  increments: IncrementInfo[];
  winner: IncrementInfo;
  toRenumber: IncrementInfo[];
}

export interface RenumberOperation {
  increment: IncrementInfo;
  oldId: string;
  newId: string;
  oldFeatureId: string;
  newFeatureId: string;
  updatedReferences: UpdatedReference[];
}

export interface UpdatedReference {
  type:
    | 'metadata'
    | 'spec'
    | 'living-docs'
    | 'github'
    | 'jira'
    | 'ado'
    | 'cross-reference';
  path?: string;
  details: string;
  success: boolean;
  error?: string;
}

export interface ReconcileResult {
  collisionsFound: number;
  incrementsRenumbered: number;
  operations: RenumberOperation[];
  errors: string[];
  reportPath?: string;
}

export interface ReconcileOptions {
  dryRun?: boolean;
  force?: boolean;
  byCommit?: boolean; // Use git commit date instead of file modification date
  incrementNumber?: string; // Only check specific increment number
}

export class ReconcileManager {
  private projectRoot: string;
  private incrementsDir: string;
  private livingDocsDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.incrementsDir = path.join(projectRoot, '.specweave', 'increments');
    this.livingDocsDir = path.join(
      projectRoot,
      '.specweave',
      'docs',
      'internal',
      'specs'
    );
  }

  /**
   * Main entry point - detect and fix ID collisions
   */
  async reconcile(options: ReconcileOptions = {}): Promise<ReconcileResult> {
    const result: ReconcileResult = {
      collisionsFound: 0,
      incrementsRenumbered: 0,
      operations: [],
      errors: [],
    };

    try {
      // Step 1: Scan all increments
      const increments = await this.scanAllIncrements();
      logger.debug(`Found ${increments.length} increments`);

      // Step 2: Detect collisions
      const collisions = this.detectCollisions(
        increments,
        options.incrementNumber
      );
      result.collisionsFound = collisions.length;

      if (collisions.length === 0) {
        logger.info('No ID collisions found');
        return result;
      }

      logger.info(`Found ${collisions.length} collision(s)`);

      // Step 3: Process each collision
      for (const collision of collisions) {
        for (const increment of collision.toRenumber) {
          const operation = await this.renumberIncrement(
            increment,
            collision.winner,
            options
          );
          result.operations.push(operation);

          if (
            operation.updatedReferences.every((r) => r.success) ||
            options.dryRun
          ) {
            result.incrementsRenumbered++;
          } else {
            const errors = operation.updatedReferences
              .filter((r) => !r.success)
              .map((r) => r.error || 'Unknown error');
            result.errors.push(...errors);
          }
        }
      }

      // Step 4: Generate report
      if (!options.dryRun && result.operations.length > 0) {
        result.reportPath = await this.generateReport(result);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      logger.error('Reconcile failed:', errorMessage);
    }

    return result;
  }

  /**
   * Scan all increment directories
   */
  private async scanAllIncrements(): Promise<IncrementInfo[]> {
    const increments: IncrementInfo[] = [];
    const folders = ['', '_archive', '_abandoned', '_paused'];

    for (const folder of folders) {
      const dir = folder
        ? path.join(this.incrementsDir, folder)
        : this.incrementsDir;

      if (!fs.existsSync(dir)) continue;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('_')) continue; // Skip special folders

        // Match increment pattern: NNNN-name or NNNNE-name
        const match = entry.name.match(/^(\d{4})(E)?-(.+)$/);
        if (!match) continue;

        const absolutePath = path.join(dir, entry.name);
        const info = await this.getIncrementInfo(
          entry.name,
          folder ? path.join(folder, entry.name) : entry.name,
          absolutePath
        );

        if (info) {
          increments.push(info);
        }
      }
    }

    return increments;
  }

  /**
   * Get detailed info about an increment
   */
  private async getIncrementInfo(
    id: string,
    folder: string,
    absolutePath: string
  ): Promise<IncrementInfo | null> {
    const match = id.match(/^(\d{4})(E)?-(.+)$/);
    if (!match) return null;

    const baseNumber = parseInt(match[1], 10);
    const isExternal = !!match[2];

    // Get modification date from spec.md or metadata.json
    let modifiedDate = new Date();
    let createdDate: Date | undefined;
    let status: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    const metadataPath = path.join(absolutePath, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
        if (metadata) {
          if (typeof metadata.lastActivity === 'string') {
            modifiedDate = new Date(metadata.lastActivity);
          }
          if (typeof metadata.created === 'string') {
            createdDate = new Date(metadata.created);
          }
          if (typeof metadata.status === 'string') {
            status = metadata.status;
          }
        }
      } catch {
        // Fall back to file modification time
        const stats = fs.statSync(absolutePath);
        modifiedDate = stats.mtime;
      }
    } else {
      // Use directory modification time
      const stats = fs.statSync(absolutePath);
      modifiedDate = stats.mtime;
    }

    return {
      id,
      baseNumber,
      isExternal,
      folder,
      absolutePath,
      modifiedDate,
      createdDate,
      status,
      metadata,
    };
  }

  /**
   * Detect collisions (same base number)
   */
  private detectCollisions(
    increments: IncrementInfo[],
    specificNumber?: string
  ): Collision[] {
    // Group by base number
    const groups = new Map<number, IncrementInfo[]>();

    for (const inc of increments) {
      if (specificNumber) {
        const targetNumber = parseInt(specificNumber.replace(/^0+/, ''), 10);
        if (inc.baseNumber !== targetNumber) continue;
      }

      const existing = groups.get(inc.baseNumber) || [];
      existing.push(inc);
      groups.set(inc.baseNumber, existing);
    }

    // Find collisions (groups with > 1 increment)
    const collisions: Collision[] = [];

    Array.from(groups.entries()).forEach(([baseNumber, incs]) => {
      if (incs.length <= 1) return;

      // Sort by modification date (oldest first = winner)
      const sorted = [...incs].sort(
        (a, b) => a.modifiedDate.getTime() - b.modifiedDate.getTime()
      );

      collisions.push({
        baseNumber,
        increments: sorted,
        winner: sorted[0],
        toRenumber: sorted.slice(1),
      });
    });

    return collisions;
  }

  /**
   * Renumber a single increment
   */
  private async renumberIncrement(
    increment: IncrementInfo,
    _winner: IncrementInfo,
    options: ReconcileOptions
  ): Promise<RenumberOperation> {
    const updatedReferences: UpdatedReference[] = [];

    // Get next available number
    const nextNumber = IncrementNumberManager.getNextIncrementNumber(
      this.projectRoot
    );
    const newId = `${nextNumber}${increment.isExternal ? 'E' : ''}-${increment.id.replace(/^\d{4}E?-/, '')}`;

    const oldFeatureId = this.deriveFeatureId(increment.id);
    const newFeatureId = this.deriveFeatureId(newId);

    const operation: RenumberOperation = {
      increment,
      oldId: increment.id,
      newId,
      oldFeatureId,
      newFeatureId,
      updatedReferences,
    };

    if (options.dryRun) {
      // In dry-run mode, just show what would happen
      updatedReferences.push({
        type: 'metadata',
        details: `Would rename folder: ${increment.id} → ${newId}`,
        success: true,
      });
      updatedReferences.push({
        type: 'living-docs',
        details: `Would rename living docs: ${oldFeatureId} → ${newFeatureId}`,
        success: true,
      });
      return operation;
    }

    // Step 1: Rename increment folder
    const newAbsolutePath = path.join(
      path.dirname(increment.absolutePath),
      newId
    );
    try {
      fs.renameSync(increment.absolutePath, newAbsolutePath);
      updatedReferences.push({
        type: 'metadata',
        path: newAbsolutePath,
        details: `Renamed folder: ${increment.id} → ${newId}`,
        success: true,
      });
    } catch (error) {
      updatedReferences.push({
        type: 'metadata',
        details: `Failed to rename folder`,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return operation; // Stop if folder rename fails
    }

    // Step 2: Update metadata.json
    try {
      await this.updateMetadataJson(newAbsolutePath, newId);
      updatedReferences.push({
        type: 'metadata',
        path: path.join(newAbsolutePath, 'metadata.json'),
        details: `Updated id field in metadata.json`,
        success: true,
      });
    } catch (error) {
      updatedReferences.push({
        type: 'metadata',
        details: `Failed to update metadata.json`,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Step 3: Update spec.md frontmatter
    try {
      await this.updateSpecFrontmatter(newAbsolutePath, newId);
      updatedReferences.push({
        type: 'spec',
        path: path.join(newAbsolutePath, 'spec.md'),
        details: `Updated increment field in spec.md`,
        success: true,
      });
    } catch (error) {
      updatedReferences.push({
        type: 'spec',
        details: `Failed to update spec.md`,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Step 4: Rename living docs folder (FS-XXX)
    try {
      await this.renameLivingDocsFolder(oldFeatureId, newFeatureId);
      updatedReferences.push({
        type: 'living-docs',
        details: `Renamed living docs: ${oldFeatureId} → ${newFeatureId}`,
        success: true,
      });
    } catch (error) {
      updatedReferences.push({
        type: 'living-docs',
        details: `Failed to rename living docs (may not exist)`,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Step 5: Update external tools
    await this.updateExternalTools(
      increment,
      newId,
      oldFeatureId,
      newFeatureId,
      updatedReferences
    );

    return operation;
  }

  /**
   * Derive feature ID from increment ID
   * e.g., "0001E-auth-feature" → "FS-001E"
   */
  private deriveFeatureId(incrementId: string): string {
    const match = incrementId.match(/^(\d{4})(E)?-/);
    if (!match) return '';

    const number = parseInt(match[1], 10);
    const isExternal = !!match[2];
    const paddedNumber = String(number).padStart(3, '0');

    return `FS-${paddedNumber}${isExternal ? 'E' : ''}`;
  }

  /**
   * Update metadata.json with new ID
   */
  private async updateMetadataJson(
    incrementPath: string,
    newId: string
  ): Promise<void> {
    const metadataPath = path.join(incrementPath, 'metadata.json');
    if (!fs.existsSync(metadataPath)) return;

    const content = fs.readFileSync(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);
    metadata.id = newId;
    metadata.lastActivity = new Date().toISOString();

    // Add reconcile note
    if (!metadata.reconcileHistory) {
      metadata.reconcileHistory = [];
    }
    metadata.reconcileHistory.push({
      date: new Date().toISOString(),
      action: 'renumbered',
      note: `Renumbered during post-merge reconciliation`,
    });

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
  }

  /**
   * Update spec.md frontmatter
   */
  private async updateSpecFrontmatter(
    incrementPath: string,
    newId: string
  ): Promise<void> {
    const specPath = path.join(incrementPath, 'spec.md');
    if (!fs.existsSync(specPath)) return;

    let content = fs.readFileSync(specPath, 'utf-8');

    // Update increment field in frontmatter
    content = content.replace(
      /^(---[\s\S]*?increment:\s*)[^\n]+/m,
      `$1${newId}`
    );

    fs.writeFileSync(specPath, content);
  }

  /**
   * Rename living docs folder (FS-XXX)
   */
  private async renameLivingDocsFolder(
    oldFeatureId: string,
    newFeatureId: string
  ): Promise<void> {
    if (!fs.existsSync(this.livingDocsDir)) return;

    // Search for the feature folder in all project directories
    const projects = fs.readdirSync(this.livingDocsDir, { withFileTypes: true });

    for (const project of projects) {
      if (!project.isDirectory()) continue;

      const projectPath = path.join(this.livingDocsDir, project.name);
      const oldPath = path.join(projectPath, oldFeatureId);
      const newPath = path.join(projectPath, newFeatureId);

      if (fs.existsSync(oldPath)) {
        // Check if target exists
        if (fs.existsSync(newPath)) {
          throw new Error(
            `Target feature folder ${newFeatureId} already exists in ${project.name}`
          );
        }

        // Rename the folder
        fs.renameSync(oldPath, newPath);

        // Update FEATURE.md frontmatter
        const featureMdPath = path.join(newPath, 'FEATURE.md');
        if (fs.existsSync(featureMdPath)) {
          let content = fs.readFileSync(featureMdPath, 'utf-8');
          content = content.replace(
            /^(---[\s\S]*?id:\s*)[^\n]+/m,
            `$1${newFeatureId}`
          );
          // Also update any references to the old ID
          content = content.replace(
            new RegExp(oldFeatureId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            newFeatureId
          );
          fs.writeFileSync(featureMdPath, content);
        }

        // Update user story files
        const files = fs.readdirSync(newPath);
        for (const file of files) {
          if (file.startsWith('us-') && file.endsWith('.md')) {
            const filePath = path.join(newPath, file);
            let content = fs.readFileSync(filePath, 'utf-8');
            content = content.replace(
              new RegExp(
                oldFeatureId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                'g'
              ),
              newFeatureId
            );
            fs.writeFileSync(filePath, content);
          }
        }

        logger.info(
          `Renamed living docs: ${oldFeatureId} → ${newFeatureId} in ${project.name}`
        );
        return; // Found and renamed
      }

      // Also check 2-level structure (JIRA/ADO)
      const subDirs = fs.readdirSync(projectPath, { withFileTypes: true });
      for (const subDir of subDirs) {
        if (!subDir.isDirectory()) continue;

        const subPath = path.join(projectPath, subDir.name);
        const oldSubPath = path.join(subPath, oldFeatureId);
        const newSubPath = path.join(subPath, newFeatureId);

        if (fs.existsSync(oldSubPath)) {
          if (fs.existsSync(newSubPath)) {
            throw new Error(
              `Target feature folder ${newFeatureId} already exists in ${project.name}/${subDir.name}`
            );
          }

          fs.renameSync(oldSubPath, newSubPath);
          logger.info(
            `Renamed living docs: ${oldFeatureId} → ${newFeatureId} in ${project.name}/${subDir.name}`
          );
          return;
        }
      }
    }

    // Feature folder not found - this is OK for new increments that haven't been synced yet
    logger.debug(`Living docs folder ${oldFeatureId} not found (may not exist yet)`);
  }

  /**
   * Update external tools (GitHub, JIRA, ADO)
   */
  private async updateExternalTools(
    increment: IncrementInfo,
    newId: string,
    oldFeatureId: string,
    newFeatureId: string,
    updatedReferences: UpdatedReference[]
  ): Promise<void> {
    const metadata = increment.metadata;
    if (!metadata) return;

    // GitHub updates
    if (metadata.github && typeof metadata.github === 'object') {
      const github = metadata.github as Record<string, unknown>;
      try {
        await this.updateGitHubReferences(
          github,
          oldFeatureId,
          newFeatureId,
          updatedReferences
        );
      } catch (error) {
        updatedReferences.push({
          type: 'github',
          details: `Failed to update GitHub references`,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // JIRA updates
    const externalSync = metadata.external_sync as Record<string, unknown> | undefined;
    if (externalSync?.jira && typeof externalSync.jira === 'object') {
      const jira = externalSync.jira as Record<string, unknown>;
      try {
        await this.updateJiraReferences(
          jira,
          oldFeatureId,
          newFeatureId,
          updatedReferences
        );
      } catch (error) {
        updatedReferences.push({
          type: 'jira',
          details: `Failed to update JIRA references`,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ADO updates
    if (externalSync?.ado && typeof externalSync.ado === 'object') {
      const ado = externalSync.ado as Record<string, unknown>;
      try {
        await this.updateAdoReferences(
          ado,
          oldFeatureId,
          newFeatureId,
          updatedReferences
        );
      } catch (error) {
        updatedReferences.push({
          type: 'ado',
          details: `Failed to update ADO references`,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Update GitHub issue titles and milestone
   */
  private async updateGitHubReferences(
    github: Record<string, unknown>,
    oldFeatureId: string,
    newFeatureId: string,
    updatedReferences: UpdatedReference[]
  ): Promise<void> {
    const { execFileNoThrow } = await import('../../utils/execFileNoThrow.js');

    // Update milestone if exists
    if (typeof github.milestone === 'string' || typeof github.milestone === 'number') {
      // Milestones are typically named with feature ID
      // We need to find and rename the milestone
      const result = await execFileNoThrow('gh', [
        'api',
        'repos/{owner}/{repo}/milestones',
        '--jq',
        `.[] | select(.title | contains("${oldFeatureId}")) | .number`,
      ]);

      if (result.exitCode === 0 && result.stdout.trim()) {
        const milestoneNumber = result.stdout.trim();
        const newTitle = `${newFeatureId}: Feature`;

        await execFileNoThrow('gh', [
          'api',
          '--method',
          'PATCH',
          `repos/{owner}/{repo}/milestones/${milestoneNumber}`,
          '-f',
          `title=${newTitle}`,
        ]);

        updatedReferences.push({
          type: 'github',
          details: `Updated milestone #${milestoneNumber}: ${oldFeatureId} → ${newFeatureId}`,
          success: true,
        });
      }
    }

    // Update issue titles
    const issues = github.issues as number[] | undefined;
    if (Array.isArray(issues)) {
      for (const issueNumber of issues) {
        // Get current title
        const getResult = await execFileNoThrow('gh', [
          'issue',
          'view',
          String(issueNumber),
          '--json',
          'title',
          '--jq',
          '.title',
        ]);

        if (getResult.exitCode === 0 && getResult.stdout.includes(oldFeatureId)) {
          const oldTitle = getResult.stdout.trim();
          const newTitle = oldTitle.replace(oldFeatureId, newFeatureId);

          await execFileNoThrow('gh', [
            'issue',
            'edit',
            String(issueNumber),
            '--title',
            newTitle,
          ]);

          updatedReferences.push({
            type: 'github',
            details: `Updated issue #${issueNumber} title: ${oldFeatureId} → ${newFeatureId}`,
            success: true,
          });
        }
      }
    }

    // Single issue
    if (typeof github.issue === 'number') {
      const issueNumber = github.issue;
      const getResult = await execFileNoThrow('gh', [
        'issue',
        'view',
        String(issueNumber),
        '--json',
        'title',
        '--jq',
        '.title',
      ]);

      if (getResult.exitCode === 0 && getResult.stdout.includes(oldFeatureId)) {
        const oldTitle = getResult.stdout.trim();
        const newTitle = oldTitle.replace(oldFeatureId, newFeatureId);

        await execFileNoThrow('gh', [
          'issue',
          'edit',
          String(issueNumber),
          '--title',
          newTitle,
        ]);

        updatedReferences.push({
          type: 'github',
          details: `Updated issue #${issueNumber} title: ${oldFeatureId} → ${newFeatureId}`,
          success: true,
        });
      }
    }
  }

  /**
   * Update JIRA issue summary (title)
   */
  private async updateJiraReferences(
    jira: Record<string, unknown>,
    oldFeatureId: string,
    newFeatureId: string,
    updatedReferences: UpdatedReference[]
  ): Promise<void> {
    // Try to import JIRA client
    try {
      const { JiraClient } = await import(
        '../../integrations/jira/jira-client.js'
      );
      const client = new JiraClient();

      const issueKey = jira.issueKey as string | undefined;
      if (!issueKey) return;

      // Get current issue
      const issue = await client.getIssue(issueKey);
      if (!issue || !issue.fields?.summary?.includes(oldFeatureId)) return;

      // Update summary
      const newSummary = issue.fields.summary.replace(oldFeatureId, newFeatureId);
      await client.updateIssue({
        key: issueKey,
        summary: newSummary,
      });

      updatedReferences.push({
        type: 'jira',
        details: `Updated ${issueKey} summary: ${oldFeatureId} → ${newFeatureId}`,
        success: true,
      });
    } catch (error) {
      // JIRA client may not be configured
      updatedReferences.push({
        type: 'jira',
        details: `JIRA client not available`,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update ADO work item title
   */
  private async updateAdoReferences(
    ado: Record<string, unknown>,
    oldFeatureId: string,
    newFeatureId: string,
    updatedReferences: UpdatedReference[]
  ): Promise<void> {
    // Try to use az CLI to update ADO work item
    try {
      const { execFileNoThrow } = await import('../../utils/execFileNoThrow.js');

      const workItemId = ado.workItemId as number | undefined;
      if (!workItemId) return;

      // Get current work item title using az CLI
      const getResult = await execFileNoThrow('az', [
        'boards',
        'work-item',
        'show',
        '--id',
        String(workItemId),
        '--query',
        'fields."System.Title"',
        '-o',
        'tsv',
      ]);

      if (getResult.exitCode !== 0) {
        updatedReferences.push({
          type: 'ado',
          details: `ADO CLI not available or work item not found`,
          success: false,
          error: getResult.stderr,
        });
        return;
      }

      const currentTitle = getResult.stdout.trim();
      if (!currentTitle.includes(oldFeatureId)) return;

      // Update title
      const newTitle = currentTitle.replace(oldFeatureId, newFeatureId);
      const updateResult = await execFileNoThrow('az', [
        'boards',
        'work-item',
        'update',
        '--id',
        String(workItemId),
        '--title',
        newTitle,
      ]);

      if (updateResult.exitCode === 0) {
        updatedReferences.push({
          type: 'ado',
          details: `Updated work item #${workItemId} title: ${oldFeatureId} → ${newFeatureId}`,
          success: true,
        });
      } else {
        updatedReferences.push({
          type: 'ado',
          details: `Failed to update work item #${workItemId}`,
          success: false,
          error: updateResult.stderr,
        });
      }
    } catch (error) {
      // ADO CLI may not be configured
      updatedReferences.push({
        type: 'ado',
        details: `ADO not available`,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate reconcile report
   */
  private async generateReport(result: ReconcileResult): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportDir = path.join(
      this.projectRoot,
      '.specweave',
      'increments',
      'reports'
    );

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, `RECONCILE-${timestamp}.md`);

    const content = `# Increment ID Reconciliation Report

**Date**: ${new Date().toISOString()}
**Command**: /sw:reconcile
**Trigger**: Post-merge ID collision resolution

## Summary

- **Collisions found**: ${result.collisionsFound}
- **Increments renumbered**: ${result.incrementsRenumbered}
- **Errors**: ${result.errors.length}

## Renumbering Operations

${result.operations
  .map(
    (op) => `
### ${op.oldId} → ${op.newId}

**Feature ID**: ${op.oldFeatureId} → ${op.newFeatureId}

**References Updated**:
${op.updatedReferences
  .map(
    (ref) =>
      `- [${ref.success ? 'x' : ' '}] ${ref.type}: ${ref.details}${ref.error ? ` (Error: ${ref.error})` : ''}`
  )
  .join('\n')}
`
  )
  .join('\n')}

${
  result.errors.length > 0
    ? `
## Errors

${result.errors.map((e) => `- ${e}`).join('\n')}
`
    : ''
}

---
*Generated by SpecWeave /sw:reconcile*
`;

    fs.writeFileSync(reportPath, content);
    logger.info(`Report saved to: ${reportPath}`);

    return reportPath;
  }

  /**
   * Get collision summary for display
   */
  async getCollisionSummary(
    incrementNumber?: string
  ): Promise<{ collisions: Collision[]; summary: string }> {
    const increments = await this.scanAllIncrements();
    const collisions = this.detectCollisions(increments, incrementNumber);

    let summary = '';

    if (collisions.length === 0) {
      summary = 'No ID collisions found. All increment IDs are unique.';
    } else {
      summary = `Found ${collisions.length} collision(s):\n\n`;

      for (const collision of collisions) {
        summary += `Collision: Base ID ${String(collision.baseNumber).padStart(4, '0')}${collision.increments[0].isExternal ? 'E' : ''}\n`;
        summary += `  Increments (ordered by modification date):\n`;

        for (let i = 0; i < collision.increments.length; i++) {
          const inc = collision.increments[i];
          const action =
            i === 0 ? 'KEEP' : `RENUMBER to ${String(collision.baseNumber + i).padStart(4, '0')}${inc.isExternal ? 'E' : ''}`;
          summary += `    ${i + 1}. ${inc.id} (${inc.modifiedDate.toISOString().slice(0, 10)}) → ${action}\n`;
        }

        summary += '\n';
      }
    }

    return { collisions, summary };
  }
}

// Export singleton-style factory
export function createReconcileManager(projectRoot: string): ReconcileManager {
  return new ReconcileManager(projectRoot);
}
