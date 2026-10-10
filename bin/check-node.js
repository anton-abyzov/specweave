// ============================================================================
// CRITICAL: Node.js Version Check (MUST run before ANY ESM imports)
// ============================================================================
// This check runs synchronously before any imports that use modern syntax
// (like `import ... with { type: 'json' }`) which would crash on older Node.js
// ============================================================================

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
  return true; // Equal versions
}

/**
 * Get platform-specific Node.js upgrade instructions
 */
function getUpgradeInstructions() {
  const platform = process.platform;
  const isNvm = process.env.NVM_DIR || process.env.NVM_BIN;
  const isFnm = process.env.FNM_DIR || process.env.FNM_MULTISHELL_PATH;
  const isVolta = process.env.VOLTA_HOME;
  const isAsdf = process.env.ASDF_DIR;

  let instructions = [];

  // Version manager detection (cross-platform)
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
    // Platform-specific fallback
    switch (platform) {
      case 'darwin':
        instructions.push('  macOS options:');
        instructions.push('    # Using Homebrew:');
        instructions.push('    brew install node@22');
        instructions.push('');
        instructions.push('    # Using nvm (recommended):');
        instructions.push('    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash');
        instructions.push('    nvm install 22 && nvm use 22');
        break;
      case 'linux':
        instructions.push('  Linux options:');
        instructions.push('    # Using nvm (recommended):');
        instructions.push('    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash');
        instructions.push('    nvm install 22 && nvm use 22');
        instructions.push('');
        instructions.push('    # Using NodeSource (Debian/Ubuntu):');
        instructions.push('    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -');
        instructions.push('    sudo apt-get install -y nodejs');
        break;
      case 'win32':
        instructions.push('  Windows options:');
        instructions.push('    # Using nvm-windows:');
        instructions.push('    nvm install 22');
        instructions.push('    nvm use 22');
        instructions.push('');
        instructions.push('    # Direct download:');
        instructions.push('    https://nodejs.org/en/download/');
        break;
      default:
        instructions.push('  Download Node.js 22+ from:');
        instructions.push('    https://nodejs.org/en/download/');
    }
  }

  return instructions.join('\n');
}

// Perform the version check
if (!isVersionSatisfied(CURRENT_NODE_VERSION, MIN_NODE_VERSION)) {
  // Use basic console methods (no chalk yet - it may fail to import)
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
  console.error(`${DIM}  Why? SpecWeave uses modern JavaScript features (ES2022+) including${RESET}`);
  console.error(`${DIM}  import assertions which require Node.js 20.12.0+${RESET}`);
  console.error('');
  console.error(`${BOLD}Quick upgrade:${RESET}`);
  console.error(getUpgradeInstructions());
  console.error('');
  console.error(`${BOLD}Full guide:${RESET}`);
  console.error(`  ${CYAN}${UNDERLINE}https://spec-weave.com/docs/guides/troubleshooting/common-errors#node-version-error${RESET}`);
  console.error('');
  console.error(`${DIM}After upgrading, verify with: node --version${RESET}`);
  console.error('');
  process.exit(1);
}

// ============================================================================
// Node.js version is OK - proceed with normal imports
// ============================================================================

