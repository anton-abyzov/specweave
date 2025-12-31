#!/usr/bin/env node

/**
 * Node.js Version Checker for SpecWeave
 *
 * This script runs during `npm install` (preinstall hook) to ensure
 * the user's Node.js version meets requirements BEFORE installation.
 *
 * Why this matters:
 * - SpecWeave uses `import ... with { type: 'json' }` syntax (Import Attributes)
 * - This syntax is only supported in Node.js 20.12.0+
 * - Without this check, users see cryptic "SyntaxError: Unexpected token 'with'"
 */

const MIN_NODE_VERSION = '20.12.0';
const CURRENT_NODE_VERSION = process.versions.node;

/**
 * Compare semver versions
 * @param {string} current - Current version (e.g., "18.17.0")
 * @param {string} required - Required version (e.g., "20.12.0")
 * @returns {boolean} true if current >= required
 */
function isVersionSatisfied(current, required) {
  const currentParts = current.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const curr = currentParts[i] || 0;
    const req = requiredParts[i] || 0;
    if (curr > req) return true;
    if (curr < req) return false;
  }
  return true;
}

/**
 * Get platform-specific upgrade instructions
 */
function getUpgradeInstructions() {
  const platform = process.platform;
  const isNvm = process.env.NVM_DIR || process.env.NVM_BIN;
  const isFnm = process.env.FNM_DIR || process.env.FNM_MULTISHELL_PATH;
  const isVolta = process.env.VOLTA_HOME;
  const isAsdf = process.env.ASDF_DIR;

  let instructions = [];

  if (isNvm) {
    instructions.push('  Using nvm (detected):');
    instructions.push('    nvm install 22');
    instructions.push('    nvm use 22');
    instructions.push('    nvm alias default 22');
  } else if (isFnm) {
    instructions.push('  Using fnm (detected):');
    instructions.push('    fnm install 22');
    instructions.push('    fnm use 22');
    instructions.push('    fnm default 22');
  } else if (isVolta) {
    instructions.push('  Using Volta (detected):');
    instructions.push('    volta install node@22');
  } else if (isAsdf) {
    instructions.push('  Using asdf (detected):');
    instructions.push('    asdf install nodejs 22.0.0');
    instructions.push('    asdf global nodejs 22.0.0');
  } else {
    switch (platform) {
      case 'darwin':
        instructions.push('  macOS options:');
        instructions.push('    brew install node@22');
        instructions.push('    # or');
        instructions.push('    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash');
        instructions.push('    nvm install 22 && nvm use 22');
        break;
      case 'linux':
        instructions.push('  Linux options:');
        instructions.push('    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash');
        instructions.push('    nvm install 22 && nvm use 22');
        break;
      case 'win32':
        instructions.push('  Windows options:');
        instructions.push('    nvm install 22');
        instructions.push('    nvm use 22');
        instructions.push('    # or download from https://nodejs.org/');
        break;
      default:
        instructions.push('  Download from https://nodejs.org/');
    }
  }

  return instructions.join('\n');
}

// Perform version check
if (!isVersionSatisfied(CURRENT_NODE_VERSION, MIN_NODE_VERSION)) {
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const CYAN = '\x1b[36m';
  const BOLD = '\x1b[1m';
  const RESET = '\x1b[0m';
  const DIM = '\x1b[2m';
  const UNDERLINE = '\x1b[4m';

  console.error('');
  console.error(`${RED}${BOLD}╔══════════════════════════════════════════════════════════════════╗${RESET}`);
  console.error(`${RED}${BOLD}║  SpecWeave requires Node.js ${MIN_NODE_VERSION} or higher                     ║${RESET}`);
  console.error(`${RED}${BOLD}╚══════════════════════════════════════════════════════════════════╝${RESET}`);
  console.error('');
  console.error(`${YELLOW}  Your version:${RESET}  ${RED}${CURRENT_NODE_VERSION}${RESET}`);
  console.error(`${YELLOW}  Required:${RESET}      ${CYAN}≥${MIN_NODE_VERSION}${RESET} (Node.js 22 LTS recommended)`);
  console.error('');
  console.error(`${DIM}  SpecWeave uses modern JavaScript features (ES2022+) that are${RESET}`);
  console.error(`${DIM}  not available in older Node.js versions.${RESET}`);
  console.error('');
  console.error(`${BOLD}Quick upgrade:${RESET}`);
  console.error(getUpgradeInstructions());
  console.error('');
  console.error(`${BOLD}Full guide:${RESET}`);
  console.error(`  ${CYAN}${UNDERLINE}https://spec-weave.com/docs/guides/troubleshooting/common-errors#node-version-error${RESET}`);
  console.error('');
  console.error(`${DIM}After upgrading, run: npm install -g specweave${RESET}`);
  console.error('');

  // Exit with error to stop installation
  process.exit(1);
}

// Version OK - continue silently
process.exit(0);
