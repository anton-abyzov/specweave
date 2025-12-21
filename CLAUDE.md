# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)

For **contributors to SpecWeave itself** (not users).

---

## CRITICAL SAFETY RULES

### 1. Context Management (CRASH PREVENTION!)

**Active increment (10+ tasks) + large file edit (2000+ lines) = CRASH**

```bash
# Before editing large files outside increment:
/sw:pause XXXX → edit → /sw:resume XXXX
# OR close completed increments: /sw:done XXXX
1b. Max 25 Tasks Per Increment (SOFT LIMIT)
>25 tasks = consider splitting for maintainability

# Check task count before starting work:
grep -c "^### T-" .specweave/increments/*/tasks.md

# If >25 tasks: Consider splitting by phase
# Pattern: Feature → Phase1 (T-001 to T-008) + Phase2 (T-009 to T-016) + ...
When to split (guidelines, not hard rules):
Tasks span unrelated subsystems
Different teams would own different phases
Review cycles would benefit from smaller PRs
Phase-by-phase execution (recommended for 15-25 tasks):

Execute Phase 1 → validate → continue to Phase 2 → ...
Token budget per increment: ~80k tokens max (tasks + spec + plan + context)
2. Source of Truth
tasks.md + spec.md are SOURCE OF TRUTH (not internal TODO)

// After completing work - IMMEDIATELY update both:
TodoWrite([{task: "T-013", status: "completed"}]);
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
2b. NEVER Edit metadata.json to "completed" Directly
Direct status change to "completed" = BUG (auto-completion without user approval)

❌ FORBIDDEN:
Edit("metadata.json", '"status": "active"', '"status": "completed"')
→ Status becomes "completed" without ACs checked or user approval!

✅ CORRECT workflow:
1. All tasks completed → auto-transition to "ready_for_review"
2. /sw:done <id> → validates ACs + asks for user confirmation
3. Only then → status becomes "completed" with approvedAt timestamp
If you need to implement closure, use:

MetadataManager.updateStatus(incrementId, IncrementStatus.COMPLETED);
// Only succeeds if current status is "ready_for_review"
2b-bis. Task-AC Auto-Sync (EDA)
When you mark a task complete in tasks.md, THREE things are AUTO-UPDATED!

FLOW (fully automatic via EDA hooks):
1. Edit tasks.md: **Status**: [ ] pending → **Status**: [x] completed
2. Hook auto-checks ALL **Acceptance** points in that task: - [ ] → - [x]
3. Hook extracts AC tags from task: **Satisfies ACs**: AC-US1-01, AC-US1-02
4. Hook auto-updates spec.md: - [ ] **AC-US1-01** → - [x] **AC-US1-01**
5. When ALL tasks complete → auto-transitions status to "ready_for_review"
6. User runs /sw:done → PM validation → status becomes "completed"
Example (automatic transformation):

# BEFORE: Mark task complete
### T-001: Implement Feature
**Acceptance**:
- [ ] Code compiles              ← Will be auto-checked!
- [ ] Tests pass                 ← Will be auto-checked!
**Status**: [x] completed        ← You only edit this line

# AFTER: Hook runs automatically
### T-001: Implement Feature
**Acceptance**:
- [x] Code compiles              ← Auto-checked by hook
- [x] Tests pass                 ← Auto-checked by hook
**Status**: [x] completed
Hook chain: post-tool-use.sh → task-ac-sync-guard.sh → us-completion-detector.sh Log location: .specweave/logs/task-ac-sync.log
2c. Per-US Project: Fields (ADR-0140)
User Stories SHOULD have **Project**: field for proper sync. This applies to BOTH single-project AND multi-project modes. The field helps:
Living docs sync to place files in correct folders
External tool sync to create issues in correct projects
LLM to maintain project context
RESOLUTION PRIORITY (MUST FOLLOW THIS ORDER!):

1. ✅ EXACT MATCH: config.project.name or multiProject.projects key → USE IT
2. ✅ LIVING DOCS: Existing folder in specs/ → USE THAT PROJECT ID
3. ✅ RECENT PATTERNS: Same feature type in past increments → USE SAME PROJECT
4. ⚠️  UNCERTAIN: Multiple valid options OR no clear match → ASK USER!
5. 🔄 FALLBACK: If all else fails → USE "default" (NEVER "specweave"!)
❌ NEVER assign "specweave" as project - that's the framework name, not user's project! ✅ When uncertain, ASK the user which project to use! ✅ Fallback to "default" if no projects are configured. Per-US Project/Board (RECOMMENDED in spec.md body):

### US-001: Login Form
**Project**: my-app           # ← RECOMMENDED (even in single-project mode!)
**Board**: ui-team            # ← For 2-level structures only

**As a** user, I want...
Two File Formats for Project Field:
spec.md (increment folder): **Project**: in BODY of each user story
us-*.md (living docs folder): project: in FRONTMATTER - auto-generated from spec.md
Code Implementation Rules:
Generating GitHub issues: Read from frontmatter.project in us-*.md files
Parsing spec.md: Extract from **Project**: in body using regex
Living docs sync: Transforms body field → frontmatter field
2c-bis. Each User Story = ONE Project (and ONE Board for 2-level)
Each User Story maps to EXACTLY ONE project and ONE board:

### US-001: Login Form UI
**Project**: frontend-app     ← Exactly ONE project
**Board**: ui-team            ← For 2-level, exactly ONE board
**As a** user, I want a login form...

### US-002: Auth API Endpoints
**Project**: backend-api      ← DIFFERENT project = OK
**Board**: api-team           ← DIFFERENT board = OK
**As a** developer, I want JWT auth API...
Cross-project features → Create SEPARATE User Stories:

## OAuth Feature (Cross-Project)

### US-001: OAuth Login Form
**Project**: frontend-app     ← One project per US
...

### US-002: OAuth API Endpoints
**Project**: backend-api      ← Different project = separate US
...

### US-003: OAuth Mobile Screen
**Project**: mobile-app       ← Different project = separate US
...
2d. NEVER Create Files in _features/ Folder
The _features/ folder is OBSOLETE! Features MUST live in project folders:

❌ FORBIDDEN:
.specweave/docs/internal/specs/_features/FS-116/FEATURE.md

✅ CORRECT:
.specweave/docs/internal/specs/{project}/FS-116/FEATURE.md
Where {project} comes from (ADR-0140):
Per-US **Project**: field (PRIMARY - recommended)
config.json → project.name (single-project mode fallback)
Example: **Project**: specweave → .specweave/docs/internal/specs/specweave/FS-116/
Pre-tool-use hook features-folder-guard.sh BLOCKS writes to _features/.
2e. Increment Root File Structure
Files at increment root SHOULD be limited to required files!

❌ AVOID:
.specweave/increments/0134-feature/COMPLETION_REPORT.md

✅ BETTER - Use reports/ subfolder:
.specweave/increments/0134-feature/reports/COMPLETION_REPORT.md
RECOMMENDED at increment root:
metadata.json
spec.md
plan.md
tasks.md
Everything else → subfolders:
reports/ - completion reports, validation reports, analysis docs
scripts/ - helper scripts, automation
logs/ - execution logs, debug output
backups/ - backup files
docs/ - additional documentation
2f. NEVER Create Duplicate Increment IDs
Increment numbers MUST be unique across ALL directories!

❌ FORBIDDEN:
0121-ado-jira-feature-parity-p2-p3/  ← exists
0121-intelligent-living-docs-content/ ← DUPLICATE!

❌ ALSO FORBIDDEN (0001 and 0001E share SAME base number):
0001-internal-feature/
0001E-external-fix/  ← COLLISION! Same base number!
MULTI-LAYER PREVENTION:
Code-level: generateIncrementId() validates by default
Hook-level: increment-duplicate-guard.sh blocks Write operations
Split-level: Use validateExplicitId() when manually specifying IDs
API:

import { IncrementNumberManager } from './core/increment/increment-utils.js';

// RECOMMENDED: Auto-generated ID (validates by default)
const id = IncrementNumberManager.generateIncrementId('feature-name');
// → "0122-feature-name" (guaranteed unique, throws if duplicate)

// For explicit IDs (e.g., splits): MUST validate first!
IncrementNumberManager.validateExplicitId('0145-split-part2');
// → Throws if 0145 already exists!
Gap-filling: IDs fill gaps instead of always using highest + 1.

// Existing: [0001, 0002, 0004, 0005]
IncrementNumberManager.getNextIncrementNumber(); // "0003" ← Fills gap!
2f-bis. Per-Project Increment ID Collision Prevention
In multi-project setups, increment IDs are checked against the target project's feature space!

// WITH projectId - checks target project's FS-ID space
const safeId = IncrementNumberManager.generateIncrementId('feature', {
  projectId: 'ec-web-ui'  // ← Checks specs/ec-web-ui/ for FS-001, FS-001E
});
// → "0002-feature" (skipped 0001 because FS-001E exists in ec-web-ui)
2g. Project Folder Validation
Project folders SHOULD exist in config.json before creation!

❌ AVOID:
.specweave/docs/internal/specs/frontend-app/   ← Example from spec.md!
.specweave/docs/internal/specs/{{PROJECT_ID}}/ ← Unresolved placeholder!

✅ CORRECT:
.specweave/docs/internal/specs/specweave/  (exists in config.json)
KNOWN EXAMPLE PROJECT NAMES (avoid unless configured):
frontend-app, backend-api, mobile-app, shared-lib
acme-corp, my-app, myapp, example-project, sample-project
test-project, demo, placeholder, per, default
API for validation:

import { ProjectResolutionService } from './core/project/project-resolution.js';

const resolver = new ProjectResolutionService(projectRoot);
const validation = await resolver.validateProjectForFolderCreation('frontend-app');
if (!validation.valid) {
  console.error(`Cannot create folder: ${validation.reason}`);
}
2h. Single-Project vs Multi-Project Architecture
Both modes SHOULD use **Project**: field per User Story.

SINGLE-PROJECT: **Project**: uses config.project.name (e.g., "my-app")
MULTI-PROJECT:  **Project**: uses one of multiProject.projects keys
Single-Project Mode (Default)

{
  "project": {
    "name": "my-app",
    "description": "My Application",
    "techStack": ["TypeScript", "React"]
  },
  "multiProject": {
    "enabled": false
  }
}
Multi-Project Mode (Opt-In)

{
  "multiProject": {
    "enabled": true,
    "projects": {
      "frontend-app": { "name": "Frontend App" },
      "backend-api": { "name": "Backend API" }
    }
  }
}
Scenario	Use Single-Project	Use Multi-Project
One repository, one application	✅ Default	❌ Unnecessary
Monorepo with 2-3 services	⚠️ Simpler but limited	✅ Recommended
5+ services/teams	❌ Too simple	✅ Required
Multi-repo (umbrella)	❌ Not supported	✅ Required
Troubleshooting
Error: "Project folders created for example names" Fix: Auto-migration runs on next command. Check .specweave/logs/migration.log. Error: "board: field not allowed" Fix: Remove board: field OR run /sw:enable-multiproject
3. Protected Directories
NEVER delete: .specweave/docs/, .specweave/increments/ NEVER run: specweave init . --force (deletes all without backup)
4. Skills Must NOT Spawn Large Agents
Skills spawning content-generating agents = CRASH (context explosion)

// ❌ FORBIDDEN in skills:
Task({ subagent_type: "specweave:architect:architect" }); // 1000-3000 lines output

// ✅ CORRECT: Skills create templates, guide user to invoke agents in main context
5. NEVER Spawn Parallel Agents for Multi-File Migrations (CRITICAL!)
Parallel agents reading large files = CRASH (context shared, not isolated!)

❌ FORBIDDEN:
"This is a large migration (46 files)... Let me use parallel agents"
→ 4 parallel tech-lead agents × 36k tokens each = 144k tokens → CRASH!

✅ CORRECT: Sequential single-agent execution:
- Process files ONE BY ONE in main context
- Use Edit tool directly (not agents) for simple find-replace
- For complex migrations: ONE file per response, ask "Ready for next?"
6. Emergency Minimal Mode (Explicit Activation Only)
Activates ONLY when user says: "emergency mode", "minimal mode ON", "crashed N times" Does NOT activate on: "be careful", "small chunks" (normal caution ≠ emergency) Emergency mode rules:

READ: limit:50 | EDIT: 1 per response | AGENTS: none | FLOW: "Done. Next?"
User emergency phrase: EMERGENCY MODE. 1 edit. 50 lines max. No agents.
7. Writing Effective Claude Instructions
Terse imperatives > verbose explanations:

❌ "Please consider making smaller edits and waiting for my confirmation"
✅ "1 edit. STOP. Wait for 'next'."
Format: ACTION. CONSTRAINT. CONSTRAINT. (periods, not commas)
8. MDX Compatibility (Docusaurus Preview)
External HTML content = MDX compilation errors (blocks docs preview)

❌ MDX FAILS ON:
- target=_blank (unquoted attribute) → target="_blank"
- <br> (self-closing without /) → <br />
- dir=auto, rel=noopener, alt=image (all unquoted)

✅ PREVENTION: ADO/JIRA/GitHub importers use sanitizeHtmlForMdx()
   Located: src/utils/html-to-mdx.ts
If Docusaurus preview fails with "Unexpected character":

find .specweave/docs -name "*.md" -exec sed -i '' 's/target=_blank/target="_blank"/g' {} \;
9. Fire-and-Forget Notifications
⛔ NEVER use execSync() or await exec() for notifications!

// ❌ WRONG - BLOCKS execution!
execSync(`osascript -e 'display notification...'`);
await exec(`osascript -e 'display notification...'`);

// ✅ CORRECT - Fire-and-forget!
import('child_process').then(cp => {
  cp.exec(`osascript -e 'display notification...'`, (error) => {
    if (error) logger.debug(`Notification failed: ${error.message}`);
  });
});
Sound selection rules (macOS):
Sound	When to use
Pop	Success, completion (neutral)
Glass	Informational (gentle)
Submarine	Warning OR error (deep but calm)
⛔ NEVER USE "Basso" - triggers RED ALERT ICON in macOS notification center! Cross-platform behavior:
macOS: Uses osascript with sound name param
Linux: Uses notify-send with --urgency=normal
Windows: Uses PowerShell toast
Use notification constants from src/utils/notification-constants.ts:

import { getTitleForType, buildNotificationMessage, getSoundForType } from './notification-constants.js';

const title = getTitleForType('cleanup');  // "SpecWeave: Cleanup Done"
const sound = getSoundForType('cleanup');  // "Pop" (NEVER returns "Basso")
Development Setup

npm install && npm run rebuild
npm run rebuild && npm test
git add . && git commit -m "feat: feature" && git push origin develop
Marketplace: bash scripts/refresh-marketplace.sh (GitHub mode, always use) NPM Release: /sw-release:npm
No Default Increment on Init
specweave init NO LONGER creates 0001-project-setup increment automatically! Reason: Multi-project scenarios REQUIRE **Project**: field per User Story, which cannot be determined automatically at init time.

npx specweave init .           # Creates structure, no increment
/sw:increment "my-feature"     # User creates increment with proper project context
Coding Standards
Logger injection: ALL src/ code uses logger, NEVER console.*

import { Logger, consoleLogger } from '../../utils/logger.js';
constructor(options: { logger?: Logger } = {}) {
  this.logger = options.logger ?? consoleLogger;
}
Imports: ALWAYS .js extensions
Tests: .test.ts files, vi.fn() (not jest), os.tmpdir() (not cwd)
Filesystem: Native fs only (NEVER fs-extra)
Code: Functions < 100 lines, avoid any, custom error types
File Size Limits
Max 1500 lines/file (2000+ = crash risk). Check: wc -l file.ts
1000 lines → extract before adding code
Split pattern: See ADR-0138 (init.ts → init/ folder)
Folder Structure
At .specweave/increments/ root - ONLY: ####-name/ or ####E-name/ folders, _archive/, README.md Inside increment folders - ONLY at root: spec.md, plan.md, tasks.md, metadata.json Everything else → subfolders: reports/, scripts/, logs/, backups/, docs/
External Increment E-Suffix
Increments for external items MUST use E suffix to match FS-XXXE, US-XXXE conventions:

✅ CORRECT: 0111E-dora-metrics-fix (external GitHub issue #779)
❌ WRONG:   0111-dora-metrics-fix  (missing E suffix)
When to use E suffix:
Increment works on imported GitHub/JIRA/ADO issue
spec.md has origin: external or external_ref:
Feature folder is FS-XXXE (ends with E)

import { IncrementNumberManager } from './core/increment/increment-utils.js';

const id = IncrementNumberManager.generateIncrementId('fix-name', { isExternal: true });
// → "0112E-fix-name"

IncrementNumberManager.isExternalIncrement('0111E-fix'); // true
CLI Command Structure (ADR-0138)
Init command is modular - DO NOT add logic to main file:

src/cli/commands/init.ts           ← Orchestrator only (~600 lines)
src/cli/helpers/init/
├── types.ts                       ← Shared interfaces
├── path-utils.ts                  ← findPackageRoot, findSourceDir
├── config-detection.ts            ← detectGitHubRemote/Jira/ADO
├── smart-reinit.ts                ← Re-init prompts (SINGLE source!)
├── plugin-installer.ts            ← Claude plugin installation
├── repository-setup.ts            ← Git provider selection
├── testing-config.ts              ← Test mode prompts
├── external-import.ts             ← Import from external tools
├── directory-structure.ts         ← .specweave/ creation
└── next-steps.ts                  ← Post-init instructions
Rule: Add new init features to appropriate helper, NOT to init.ts
Key Formats
Task Format (MANDATORY)

### T-001: Task Title
**User Story**: US-001           ← MANDATORY
**Satisfies ACs**: AC-US1-01     ← MANDATORY
**Status**: [x] completed
GitHub Issue Format
ONLY: [FS-XXX][US-YYY] User Story Title PROHIBITED: [SP-*], [FS-XXX] alone, [undefined][US-XXX]
spec.md Format
Frontmatter (simplified - NO project/board):

---
increment: 0001-feature-name  # REQUIRED
title: "Feature Title"        # REQUIRED
---
Per-User-Story Fields (RECOMMENDED):

### US-001: Feature Name
**Project**: my-project       # ← RECOMMENDED (from config.project.name or multiProject.projects)
**Board**: digital-ops        # ← For 2-level structures ONLY
**As a** user, I want...
NOTE: feature_id is derived from increment number (0001 → FS-001), not stored How to Determine Structure Level:
Run specweave context projects
If output has boardsByProject → 2-level (include Board:)
If output has only projects → 1-level (NO Board:)
ADR Naming
Format: XXXX-decision-title.md (4-digit, NO adr- prefix) Location: .specweave/docs/internal/architecture/adr/
Important Rules
NO Increment-to-Increment References
FORBIDDEN: User stories referencing increments (increments: [0050-...]) ONLY ALLOWED: INCREMENT → FEATURE → USER STORIES (forward reference only)
Structured Data Matching

// ❌ WRONG: content.includes('FS-039')  // Matches "See FS-039"!
// ✅ CORRECT: Use deriveFeatureId() from src/utils/feature-id-derivation.ts
//    or match folder patterns: /^FS-\d{3,}E?$/
GitHub Duplicates
Use DuplicateDetector.createWithProtection(), NEVER --limit 1 in gh searches
AC Presence in spec.md
MANDATORY - even with external living docs. Use /sw:embed-acs if missing.
Git Provider Abstraction
Use getPlatformRegistry().getProvider('github'). NEVER hardcode platform names/endpoints.
Configuration
Secrets vs Configuration (MANDATORY)
CRITICAL: Configuration values MUST NOT be in .env. Use config.json via ConfigManager. Secrets (.env, gitignored):
AZURE_DEVOPS_PAT - Personal Access Token
JIRA_API_TOKEN - API Token
JIRA_EMAIL - Auth email
GH_TOKEN / GITHUB_TOKEN - GitHub token
Config (.specweave/config.json, committed):
issueTracker.domain - JIRA domain (e.g., "company.atlassian.net")
issueTracker.organization_ado - ADO organization name
issueTracker.project - Project name
sync.profiles - Sync profile configurations
FORBIDDEN Patterns (Pre-tool-use hook blocks these)

// NEVER DO THIS in src/ files:
const domain = process.env.JIRA_DOMAIN;  // VIOLATION!
const org = process.env.AZURE_DEVOPS_ORG;  // VIOLATION!

// ALWAYS DO THIS:
const config = await this.configManager.read();
const domain = config.issueTracker?.domain || '';
const org = config.issueTracker?.organization_ado || '';
Migration from .env to config.json

# 1. Add to config.json
specweave config set issueTracker.domain "company.atlassian.net"
specweave config set issueTracker.organization_ado "my-org"

# 2. Remove deprecated vars from .env (keep only secrets)
# JIRA_DOMAIN=xxx  # DELETE THIS LINE
# AZURE_DEVOPS_ORG=xxx  # DELETE THIS LINE

# 3. Keep these in .env (secrets):
AZURE_DEVOPS_PAT=xxx
JIRA_API_TOKEN=xxx
JIRA_EMAIL=xxx
ADR Reference
See ADR-0194 for full architecture decision.
Commands

/sw:increment "feature"    # Plan new increment
/sw:do                     # Execute tasks
/sw:done 0002              # Close (validates gates)
/sw:progress               # Show status
/sw:sync-progress          # Full sync (tasks→docs→GitHub/JIRA/ADO)
/sw:validate 0001          # Validate increment
/sw:living-docs            # Launch living docs builder (interactive)
/sw:living-docs --full-scan # Full deep scan
Build & Test

npm run rebuild     # Clean + build (tsc → dist/, esbuild → hooks)
npm test            # Smoke tests
npm run test:all    # All tests (30%+ coverage required)
Plugin validation: bash scripts/validation/validate-marketplace-plugins.sh
Zombie Processes (AUTO-CLEANUP)
Status: ✅ AUTOMATED - No manual intervention needed! How it works:
SessionStart hook registers all Claude Code sessions
Heartbeat process monitors parent health every 5s
Session watchdog cleans up zombies every 60s
Automatic cleanup within 60s of session termination
Session Registry: .specweave/state/.session-registry.json Logs:

cat .specweave/logs/sessions/session-*.log  # Session tracking
cat .specweave/logs/cleanup.log             # Cleanup logs
cat .specweave/logs/heartbeat-*.log         # Heartbeat logs
Manual Cleanup (if needed):

node dist/src/cli/cleanup-zombies.js 60
bash plugins/specweave/scripts/session-watchdog.sh
Troubleshooting:
If zombies persist >5 minutes: Check .specweave/state/.session-registry.json
If cleanup fails: Run bash plugins/specweave/scripts/cleanup-state.sh
Hook Development
Hook Concurrency System
All hooks use proper concurrency primitives via fail-fast-wrapper.sh: Semaphore (hooks/lib/semaphore.sh):
Limits concurrent hooks to HOOK_MAX_CONCURRENT (default: 15)
Graceful degradation when slots unavailable (returns safe default)
Auto-cleanup of stale locks (>30s old)
Circuit Breaker (hooks/lib/circuit-breaker.sh):
Per-hook circuit breakers (not global!)
States: CLOSED → (5 failures) → OPEN → (30s) → HALF_OPEN → (3 successes) → CLOSED
Prevents cascade failures from broken hooks
Metrics (hooks/lib/metrics.sh):
Tracks success/failure/timeout/skipped per hook
Calculates latency percentiles (p50, p95, p99)
Health score (0-100) per hook
Configuration:

HOOK_MAX_CONCURRENT=15     # Max concurrent hooks
HOOK_TIMEOUT=5             # Hook execution timeout (seconds)
HOOK_DEBUG=1               # Enable debug logging
HOOK_ACQUIRE_TIMEOUT_MS=3000  # Semaphore acquire timeout
Health Dashboard:

bash plugins/specweave/scripts/hook-health.sh          # Full dashboard
bash plugins/specweave/scripts/hook-health.sh --status # Quick status
bash plugins/specweave/scripts/hook-health.sh --reset  # Reset circuit breakers
Quick Reference
Aspect	Rule
Skills vs Agents	Skills = auto-activate (keywords), Agents = explicit Task()
Hook events	PostToolUse, PreToolUse, UserPromptSubmit, SessionStart/End
Hook input	Write/Edit: .tool_input.file_path, Bash: .command
Cache	.specweave/cache/ (24h TTL)
Stuck session	pkill -9 -f "bash.*specweave" + rm .specweave/state/*.lock
MCP drops	Restart Extension Host OR use terminal mode
References
Internal Docs: .specweave/docs/internal/
sync-architecture.md - GitHub sync flow, troubleshooting
architecture/adr/ - Decision records (ADR-0032, 0060, 0129, etc.)
emergency-procedures/ - Crash recovery guides
External: .github/CONTRIBUTING.md, https://spec-weave.com