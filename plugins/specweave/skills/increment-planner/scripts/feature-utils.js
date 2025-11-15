/**
 * Feature Planning Utilities for SpecWeave
 * Supports increment-planner skill with auto-numbering and name generation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Stop words to filter from feature descriptions
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'to', 'from', 'in', 'on', 'at',
  'by', 'of', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'can', 'may', 'might', 'must', 'i', 'you', 'we', 'they', 'it', 'this', 'that',
  'want', 'need', 'help', 'please', 'create', 'make', 'build'
]);

/**
 * Generate a short feature name from description
 * @param {string} description - Feature description
 * @returns {string} Short kebab-case name
 */
function generateShortName(description) {
  // Lowercase and remove special characters
  let cleaned = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim();

  // Split into words
  let words = cleaned.split(/\s+/);

  // Filter stop words
  let meaningful = words.filter(word =>
    word.length > 2 && !STOP_WORDS.has(word)
  );

  // Take first 2-4 most meaningful words
  let selected = meaningful.slice(0, Math.min(4, meaningful.length));

  // Join with hyphens
  let shortName = selected.join('-');

  // Enforce max 50 characters
  if (shortName.length > 50) {
    shortName = shortName.substring(0, 47) + '...';
  }

  return shortName || 'new-feature';
}

/**
 * Get the next available feature number
 * @param {string} featuresDir - Path to features directory (default: '.specweave/increments')
 * @returns {string} Next feature number (zero-padded to 4 digits: 0001-9999)
 *
 * NOTE: This function is DEPRECATED. Use IncrementNumberManager from src/core/increment-utils.ts instead.
 * Kept for backward compatibility with existing scripts.
 */
function getNextFeatureNumber(featuresDir = '.specweave/increments') {
  // DEPRECATED: For backward compatibility only
  // The NEW implementation scans ALL directories (_archive, _abandoned, _paused)
  // To use the new implementation, import IncrementNumberManager from src/core/increment-utils.ts

  let highest = 0;

  if (fs.existsSync(featuresDir)) {
    const entries = fs.readdirSync(featuresDir);

    entries.forEach(entry => {
      // Match BOTH 3-digit (legacy) and 4-digit formats to prevent conflicts
      const match = entry.match(/^(\d{3,4})-/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > highest) {
          highest = num;
        }
      }
    });
  }

  const next = highest + 1;

  // Always return 4-digit format
  return String(next).padStart(4, '0');
}

/**
 * Check if feature name already exists
 * @param {string} shortName - Feature short name
 * @param {string} featuresDir - Path to features directory
 * @returns {boolean} True if exists
 */
function featureExists(shortName, featuresDir = '.specweave/increments') {
  if (!fs.existsSync(featuresDir)) {
    return false;
  }

  const entries = fs.readdirSync(featuresDir);
  return entries.some(entry => entry.endsWith(`-${shortName}`));
}

/**
 * Check if increment number already exists (prevents duplicates like 0002, 0002)
 * @param {string} incrementNumber - Increment number to check (e.g., '0001')
 * @param {string} featuresDir - Path to features directory
 * @returns {boolean} True if number already exists
 *
 * NOTE: This function is DEPRECATED. Use IncrementNumberManager.incrementNumberExists() instead.
 * Kept for backward compatibility with existing scripts.
 */
function incrementNumberExists(incrementNumber, featuresDir = '.specweave/increments') {
  // DEPRECATED: For backward compatibility only
  // The NEW implementation scans ALL directories (_archive, _abandoned, _paused)
  // To use the new implementation, import IncrementNumberManager from src/core/increment-utils.ts

  if (!fs.existsSync(featuresDir)) {
    return false;
  }

  const entries = fs.readdirSync(featuresDir);

  // Normalize to 4-digit format for comparison
  const normalizedNum = String(incrementNumber).padStart(4, '0');

  return entries.some(entry => {
    const match = entry.match(/^(\d{3,4})-/);
    if (match) {
      const entryNum = String(match[1]).padStart(4, '0');
      return entryNum === normalizedNum;
    }
    return false;
  });
}

/**
 * Create feature directory structure
 * @param {string} featureNumber - Feature number (e.g., '0001')
 * @param {string} shortName - Feature short name
 * @param {string} featuresDir - Path to features directory
 * @returns {string} Full feature path
 * @throws {Error} If increment number already exists
 */
function createFeatureDirectory(featureNumber, shortName, featuresDir = '.specweave/increments') {
  // Normalize to 4-digit format
  const normalizedNumber = String(featureNumber).padStart(4, '0');

  // Check for duplicate increment number
  if (incrementNumberExists(normalizedNumber, featuresDir)) {
    throw new Error(`Increment number ${normalizedNumber} already exists! Use getNextFeatureNumber() to get the next available number.`);
  }

  const featurePath = path.join(featuresDir, `${normalizedNumber}-${shortName}`);

  if (!fs.existsSync(featuresDir)) {
    fs.mkdirSync(featuresDir, { recursive: true });
  }

  if (!fs.existsSync(featurePath)) {
    fs.mkdirSync(featurePath, { recursive: true });
  }

  return featurePath;
}

/**
 * Extract priority from description
 * @param {string} description - Feature description
 * @returns {string} Priority level (P1, P2, or P3)
 */
function extractPriority(description) {
  const lower = description.toLowerCase();

  // Check for explicit priority mentions
  if (lower.includes('critical') || lower.includes('must have') || lower.includes('mvp')) {
    return 'P1';
  }

  if (lower.includes('nice to have') || lower.includes('polish') || lower.includes('optional')) {
    return 'P3';
  }

  // Default to P2 (important)
  return 'P2';
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date
 */
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse feature description into structured data
 * @param {string} description - Feature description
 * @returns {object} Parsed feature data
 */
function parseFeatureDescription(description) {
  return {
    description,
    shortName: generateShortName(description),
    priority: extractPriority(description),
    createdDate: getCurrentDate()
  };
}

export {
  generateShortName,
  getNextFeatureNumber,
  featureExists,
  incrementNumberExists,
  createFeatureDirectory,
  extractPriority,
  getCurrentDate,
  parseFeatureDescription,
  STOP_WORDS
};

// CLI usage - check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node feature-utils.js shortname "feature description"');
    console.log('  node feature-utils.js next [features-dir]');
    console.log('  node feature-utils.js parse "feature description"');
    console.log('  node feature-utils.js check-increment <number> [features-dir]');
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'shortname':
      if (args[1]) {
        console.log(generateShortName(args[1]));
      }
      break;

    case 'next':
      const dir = args[1] || '.specweave/increments';
      console.log(getNextFeatureNumber(dir));
      break;

    case 'parse':
      if (args[1]) {
        const parsed = parseFeatureDescription(args[1]);
        console.log(JSON.stringify(parsed, null, 2));
      }
      break;

    case 'check-increment':
      if (args[1]) {
        const incrementNumber = args[1];
        const checkDir = args[2] || '.specweave/increments';
        if (incrementNumberExists(incrementNumber, checkDir)) {
          console.error(`ERROR: Increment ${incrementNumber} already exists!`);
          process.exit(1);
        } else {
          console.log(`OK: Increment ${incrementNumber} is available`);
        }
      } else {
        console.error('Error: Increment number required');
        process.exit(1);
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}
