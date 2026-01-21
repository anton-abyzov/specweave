#!/usr/bin/env node
/**
 * CLI wrapper for getting default completion conditions
 * Outputs JSON array of completion conditions
 */

import { getDefaultConditions } from '../../../src/core/auto/default-conditions.js';
import { ProjectType } from '../../../src/core/auto/project-detector.js';

const projectType = process.argv[2];

if (!projectType) {
  console.error('Usage: get-default-conditions.js <project-type>');
  console.error('Example: get-default-conditions.js web-frontend');
  process.exit(1);
}

// Validate project type
const validTypes: ProjectType[] = [
  'web-frontend',
  'web-fullstack',
  'mobile-native',
  'backend-api',
  'desktop-app',
  'library',
  'cli-tool',
  'generic',
];

if (!validTypes.includes(projectType as ProjectType)) {
  console.error(`Invalid project type: ${projectType}`);
  console.error(`Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

try {
  const conditions = getDefaultConditions(projectType as ProjectType);

  // Output JSON to stdout
  console.log(JSON.stringify(conditions, null, 2));

  // Exit with success
  process.exit(0);
} catch (error: any) {
  // Output error to stderr
  console.error('Error getting default conditions:', error.message);
  process.exit(1);
}
