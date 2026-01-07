#!/usr/bin/env node
/**
 * CLI wrapper for project type detection
 * Outputs JSON detection result
 */

import { detectProjectType } from '../../../src/core/auto/project-detector.js';
import { resolve } from 'path';

const projectRoot = process.argv[2] || process.cwd();
const resolvedPath = resolve(projectRoot);

try {
  const detection = detectProjectType(resolvedPath);

  // Output JSON to stdout
  console.log(JSON.stringify(detection, null, 2));

  // Exit with success
  process.exit(0);
} catch (error) {
  // Output error to stderr
  console.error('Error detecting project type:', error.message);
  process.exit(1);
}
