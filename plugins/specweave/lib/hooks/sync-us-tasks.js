#!/usr/bin/env node
/**
 * US-Task Synchronization Module
 *
 * Syncs task completion status from tasks.md to living docs User Story files.
 * Updates:
 * - Task lists in US files (replaces "No tasks defined")
 * - AC checkboxes based on task completion
 *
 * Part of increment 0047-us-task-linkage implementation.
 */

import fs from 'fs-extra';
import path from 'path';
import { parseTasksWithUSLinks, getAllTasks } from '../../../../dist/src/generators/spec/task-parser.js';
import { glob } from 'glob';
import { getCachedTasks, needsSync, recordSync, batchFileUpdates } from './sync-cache.js';

/**
 * Sync tasks from tasks.md to living docs User Story files
 *
 * @param {string} incrementId - Increment ID (e.g., "0047-us-task-linkage")
 * @param {string} projectRoot - Project root directory
 * @param {string} featureId - Feature ID (e.g., "FS-047")
 * @param {object} options - Sync options
 * @returns {Promise<SyncResult>} Sync result
 */
export async function syncUSTasksToLivingDocs(incrementId, projectRoot, featureId, options = {}) {
  try {
    console.log(`   📋 Syncing tasks to living docs User Stories...`);

    const tasksPath = path.join(projectRoot, '.specweave', 'increments', incrementId, 'tasks.md');

    // Check if tasks.md exists
    if (!fs.existsSync(tasksPath)) {
      console.log(`   ⚠️  tasks.md not found, skipping task sync`);
      return { success: true, updatedFiles: [], errors: [] };
    }

    // Parse tasks with US linkage (with caching for performance)
    let tasksByUS;
    try {
      tasksByUS = getCachedTasks(tasksPath, parseTasksWithUSLinks);
    } catch (error) {
      console.error(`   ❌ Failed to parse tasks.md:`, error.message);
      return { success: false, updatedFiles: [], errors: [error.message] };
    }

    const allTasks = getAllTasks(tasksByUS);
    console.log(`   ✓ Parsed ${allTasks.length} tasks from tasks.md`);

    // Check for tasks without US linkage (backward compatibility)
    const unassignedTasks = tasksByUS['unassigned'] || [];
    if (unassignedTasks.length > 0) {
      console.log(`   ⚠️  ${unassignedTasks.length} tasks without User Story linkage (old format)`);
    }

    // Get project ID (default to "specweave" for now, can be enhanced later)
    const projectId = getProjectId(projectRoot, incrementId) || 'specweave';

    const updatedFiles = [];
    const errors = [];
    const filesToUpdate = []; // Batch file updates

    // For each User Story with tasks, update its living docs file
    for (const [usId, tasks] of Object.entries(tasksByUS)) {
      if (usId === 'unassigned') continue; // Skip unassigned tasks

      try {
        // Find US file in living docs
        const usFilePath = await findUSFile(projectRoot, projectId, featureId, usId);

        if (!usFilePath) {
          console.log(`   ⚠️  Living docs file not found for ${usId}, skipping`);
          continue;
        }

        // Incremental sync: Check if sync is needed
        if (!needsSync(usFilePath, tasks, tasksPath)) {
          console.log(`   ⏭️  ${usId} unchanged, skipping sync`);
          continue;
        }

        // Update US file with task list
        const result = await updateUSFile(usFilePath, tasks, incrementId);

        if (result.updated) {
          filesToUpdate.push({ path: usFilePath, content: result.content });
          recordSync(usFilePath, tasks); // Cache sync result for next run
          console.log(`   ✓ Prepared update for ${usId} (${tasks.length} tasks)`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating ${usId}:`, error.message);
        errors.push(`${usId}: ${error.message}`);
      }
    }

    // Batch write all file updates (reduce I/O)
    if (filesToUpdate.length > 0) {
      await batchFileUpdates(filesToUpdate);
      updatedFiles.push(...filesToUpdate.map(f => f.path));
    }

    if (updatedFiles.length > 0) {
      console.log(`   ✅ Updated ${updatedFiles.length} User Story file(s)`);
    } else {
      console.log(`   ℹ️  No User Story files updated`);
    }

    return {
      success: errors.length === 0,
      updatedFiles,
      errors
    };
  } catch (error) {
    console.error(`   ❌ US-Task sync failed:`, error);
    return { success: false, updatedFiles: [], errors: [error.message] };
  }
}

/**
 * Find User Story file in living docs
 *
 * @param {string} projectRoot - Project root
 * @param {string} projectId - Project ID (e.g., "specweave")
 * @param {string} featureId - Feature ID (e.g., "FS-047")
 * @param {string} usId - User Story ID (e.g., "US-001")
 * @returns {Promise<string|null>} Path to US file or null if not found
 */
async function findUSFile(projectRoot, projectId, featureId, usId) {
  // Pattern: .specweave/docs/internal/specs/{project}/{feature}/us-{id}-*.md
  const pattern = path.join(
    projectRoot,
    '.specweave',
    'docs',
    'internal',
    'specs',
    projectId,
    featureId,
    `${usId.toLowerCase()}-*.md`
  );

  const files = await glob(pattern);

  if (files.length === 0) {
    return null;
  }

  if (files.length > 1) {
    console.log(`   ⚠️  Multiple files found for ${usId}, using first: ${path.basename(files[0])}`);
  }

  return files[0];
}

/**
 * Update User Story file with task list and AC checkboxes
 *
 * @param {string} usFilePath - Path to US markdown file
 * @param {Array} tasks - Tasks linked to this US
 * @param {string} incrementId - Increment ID
 * @returns {Promise<{updated: boolean, content: string}>} Update result
 */
async function updateUSFile(usFilePath, tasks, incrementId) {
  let content = await fs.readFile(usFilePath, 'utf-8');
  let updated = false;

  // 1. Update task list section
  const taskList = generateTaskList(tasks, incrementId);
  const newTasksSection = `## Tasks\n\n${taskList}`;

  // Replace existing tasks section
  if (content.includes('## Tasks')) {
    // Replace everything from "## Tasks" to next "##" or end of file
    const tasksRegex = /(## Tasks\n\n)(?:.*?)(?=\n## |\n---\n|$)/s;
    const newContent = content.replace(tasksRegex, newTasksSection);

    if (newContent !== content) {
      content = newContent;
      updated = true;
    }
  }

  // 2. Update AC checkboxes based on task completion
  const updatedACs = updateACCheckboxes(content, tasks);
  if (updatedACs !== content) {
    content = updatedACs;
    updated = true;
  }

  return { updated, content };
}

/**
 * Generate task list markdown
 *
 * @param {Array} tasks - Tasks to list
 * @param {string} incrementId - Increment ID
 * @returns {string} Markdown task list
 */
function generateTaskList(tasks, incrementId) {
  if (tasks.length === 0) {
    return '_No tasks defined for this user story_';
  }

  return tasks.map(task => {
    const checkbox = task.status === 'completed' ? 'x' : ' ';
    const link = `../../../../increments/${incrementId}/tasks.md#${task.id}`;
    return `- [${checkbox}] [${task.id}](${link}): ${task.title}`;
  }).join('\n');
}

/**
 * Update AC checkboxes based on task completion
 *
 * @param {string} content - US file content
 * @param {Array} tasks - Tasks linked to this US
 * @returns {string} Updated content
 */
function updateACCheckboxes(content, tasks) {
  // Collect all AC-IDs satisfied by completed tasks
  const satisfiedACs = new Set();

  tasks.forEach(task => {
    if (task.status === 'completed' && task.satisfiesACs) {
      task.satisfiesACs.forEach(acId => satisfiedACs.add(acId));
    }
  });

  // Update AC checkboxes
  let updatedContent = content;

  satisfiedACs.forEach(acId => {
    // Replace: - [ ] **AC-US1-01** with - [x] **AC-US1-01**
    const uncheckedRegex = new RegExp(`- \\[ \\] \\*\\*${escapeRegex(acId)}\\*\\*`, 'g');
    updatedContent = updatedContent.replace(uncheckedRegex, `- [x] **${acId}**`);
  });

  // Also uncheck ACs that are no longer satisfied (tasks incomplete/pending)
  // Extract all AC-IDs from content
  const acPattern = /- \[[x ]\] \*\*(AC-US\d+-\d{2})\*\*/g;
  let match;
  const allACs = [];

  while ((match = acPattern.exec(content)) !== null) {
    allACs.push(match[1]);
  }

  // Uncheck ACs not in satisfiedACs set
  allACs.forEach(acId => {
    if (!satisfiedACs.has(acId)) {
      const checkedRegex = new RegExp(`- \\[x\\] \\*\\*${escapeRegex(acId)}\\*\\*`, 'g');
      updatedContent = updatedContent.replace(checkedRegex, `- [ ] **${acId}**`);
    }
  });

  return updatedContent;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get project ID from metadata or config
 *
 * @param {string} projectRoot - Project root
 * @param {string} incrementId - Increment ID
 * @returns {string|null} Project ID or null
 */
function getProjectId(projectRoot, incrementId) {
  try {
    // Try to get from metadata.json
    const metadataPath = path.join(projectRoot, '.specweave', 'increments', incrementId, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      if (metadata.project) {
        return metadata.project;
      }
    }

    // Try to get from config.json
    const configPath = path.join(projectRoot, '.specweave', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.defaultProject) {
        return config.defaultProject;
      }
    }

    // Default to "specweave" (single-project mode)
    return 'specweave';
  } catch (error) {
    console.log(`   ⚠️  Could not determine project ID, using default: "specweave"`);
    return 'specweave';
  }
}
