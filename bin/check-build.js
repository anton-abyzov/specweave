import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM equivalents for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// DEVELOPMENT GUARD: Check if dist/ is built (prevents silent hangs)
// ============================================================================
// This only matters for developers running from source. NPM users always get
// a pre-built package via prepublishOnly hook.
// ============================================================================
import { existsSync } from 'fs';
import { join } from 'path';

const distCliPath = join(__dirname, '..', 'dist', 'src', 'cli', 'commands', 'init.js');
const isDevEnvironment = existsSync(join(__dirname, '..', 'tsconfig.json'));

if (isDevEnvironment && !existsSync(distCliPath)) {
  const RED = '\x1b[31m';
  const YELLOW = '\x1b[33m';
  const CYAN = '\x1b[36m';
  const BOLD = '\x1b[1m';
  const RESET = '\x1b[0m';
  const DIM = '\x1b[2m';

  console.error('');
  console.error(`${RED}${BOLD}╔══════════════════════════════════════════════════════════════════╗${RESET}`);
  console.error(`${RED}${BOLD}║  SpecWeave is not built! Run: npm run rebuild                    ║${RESET}`);
  console.error(`${RED}${BOLD}╚══════════════════════════════════════════════════════════════════╝${RESET}`);
  console.error('');
  console.error(`${YELLOW}  Missing:${RESET}  ${DIM}dist/src/cli/commands/init.js${RESET}`);
  console.error('');
  console.error(`${BOLD}Quick fix:${RESET}`);
  console.error(`  ${CYAN}npm run rebuild${RESET}`);
  console.error('');
  console.error(`${DIM}  This happens when 'npm run clean' runs without 'npm run build'.${RESET}`);
  console.error(`${DIM}  NPM users never see this - packages are pre-built before publish.${RESET}`);
  console.error('');
  process.exit(1);
}

