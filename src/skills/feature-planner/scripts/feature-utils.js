/**
 * Feature Planning Utilities for SpecWeave
 * Supports feature-planner skill with auto-numbering and name generation
 */

const fs = require('fs');
const path = require('path');

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
 * @param {string} featuresDir - Path to features directory
 * @returns {string} Next feature number (zero-padded to 3 digits)
 */
function getNextFeatureNumber(featuresDir = 'features') {
  let highest = 0;

  if (fs.existsSync(featuresDir)) {
    const entries = fs.readdirSync(featuresDir);

    entries.forEach(entry => {
      const match = entry.match(/^(\d{3})-/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > highest) {
          highest = num;
        }
      }
    });
  }

  const next = highest + 1;
  return String(next).padStart(3, '0');
}

/**
 * Check if feature name already exists
 * @param {string} shortName - Feature short name
 * @param {string} featuresDir - Path to features directory
 * @returns {boolean} True if exists
 */
function featureExists(shortName, featuresDir = 'features') {
  if (!fs.existsSync(featuresDir)) {
    return false;
  }

  const entries = fs.readdirSync(featuresDir);
  return entries.some(entry => entry.endsWith(`-${shortName}`));
}

/**
 * Create feature directory structure
 * @param {string} featureNumber - Feature number (e.g., '001')
 * @param {string} shortName - Feature short name
 * @param {string} featuresDir - Path to features directory
 * @returns {string} Full feature path
 */
function createFeatureDirectory(featureNumber, shortName, featuresDir = 'features') {
  const featurePath = path.join(featuresDir, `${featureNumber}-${shortName}`);

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

module.exports = {
  generateShortName,
  getNextFeatureNumber,
  featureExists,
  createFeatureDirectory,
  extractPriority,
  getCurrentDate,
  parseFeatureDescription,
  STOP_WORDS
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node feature-utils.js shortname "feature description"');
    console.log('  node feature-utils.js next [features-dir]');
    console.log('  node feature-utils.js parse "feature description"');
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
      const dir = args[1] || 'features';
      console.log(getNextFeatureNumber(dir));
      break;

    case 'parse':
      if (args[1]) {
        const parsed = parseFeatureDescription(args[1]);
        console.log(JSON.stringify(parsed, null, 2));
      }
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}
