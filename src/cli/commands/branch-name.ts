/**
 * CLI Command: branch-name
 *
 * Outputs the computed branch name for an increment, optionally including
 * external ticket keys (JIRA/ADO) when cicd.git.includeExternalKey is true.
 *
 * Usage:
 *   specweave branch-name <increment-id>
 *
 * Output:
 *   Prints the branch name to stdout (e.g., "PROJ-123/sw/0521-smart-linking")
 *   for easy consumption by shell scripts and Claude skills.
 *
 * @module cli/commands/branch-name
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildBranchName } from '../../core/cicd/branch-utils.js';

export async function branchNameCommand(incrementId: string): Promise<void> {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, '.specweave', 'config.json');
  const metadataPath = path.join(projectRoot, '.specweave', 'increments', incrementId, 'metadata.json');

  // Read config for git settings
  let gitConfig: { branchPrefix?: string; includeExternalKey?: boolean } = {};
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    gitConfig = config.cicd?.git || {};
  } catch {
    // Use defaults
  }

  // Read metadata for external links
  let metadata: any = null;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  } catch {
    // No metadata — branch name will use default format
  }

  const branchName = buildBranchName(incrementId, metadata, {
    branchPrefix: gitConfig.branchPrefix,
    includeExternalKey: gitConfig.includeExternalKey,
  });

  // Output just the branch name for shell consumption
  process.stdout.write(branchName);
}
