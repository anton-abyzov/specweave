#!/usr/bin/env node
/**
 * Wrapper script for DuplicateDetector.createWithProtection()
 *
 * Used by bash hooks to create GitHub issues with full duplicate protection.
 *
 * Usage:
 *   node scripts/create-github-issue-with-protection.js \
 *     --title "Issue Title" \
 *     --body "Issue body content" \
 *     --pattern "[FS-031]" \
 *     --labels "label1,label2" \
 *     --repo "owner/repo"
 *
 * Output: JSON with { issue: { number, url }, duplicatesFound, duplicatesClosed, wasReused }
 */

import { DuplicateDetector } from '../plugins/specweave-github/lib/duplicate-detector.js';

// Parse command-line arguments
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  params[key] = value;
}

// Validate required parameters
if (!params.title || !params.body || !params.pattern) {
  console.error('ERROR: Missing required parameters');
  console.error('Usage: --title "..." --body "..." --pattern "[FS-XXX]" [--labels "..."] [--repo "owner/repo"]');
  process.exit(1);
}

// Parse labels (comma-separated string to array)
const labels = params.labels ? params.labels.split(',').map(l => l.trim()) : ['specweave'];

// Create issue with full protection
try {
  const result = await DuplicateDetector.createWithProtection({
    title: params.title,
    body: params.body,
    titlePattern: params.pattern,
    labels,
    repo: params.repo || undefined
  });

  // Output JSON result for bash to parse
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);

} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
