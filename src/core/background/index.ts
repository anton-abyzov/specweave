/**
 * Background Jobs Module
 *
 * Long-running operations that can run in background:
 * - Repository cloning (multi-repo setup)
 * - Issue import (10K+ items from GitHub/JIRA/ADO)
 * - External sync operations
 */

export * from './types.js';
export * from './job-manager.js';
