# SpecWeave - Development Guide

**Project**: SpecWeave - Spec-Driven Development Framework
**Type**: TypeScript CLI (NPM Package)

For **contributors to SpecWeave itself** (not users).

---

## CRITICAL SAFETY RULES

### 1. Context Management (CRASH PREVENTION!)

**Active increment (10+ tasks) + large file edit (2000+ lines) = CRASH**

```bash
/sw:pause XXXX → edit → /sw:resume XXXX
# OR: /sw:done XXXX
1b. Max 25 Tasks Per Increment
>25 tasks = consider splitting for maintainability Token budget: ~80k tokens max per increment
2. Source of Truth
tasks.md + spec.md are SOURCE OF TRUTH (not internal TODO)

// After completing work - IMMEDIATELY update both:
Edit("tasks.md", "**Status**: [ ] pending", "**Status**: [x] completed");
Edit("spec.md", "- [ ] **AC-US1-01**", "- [x] **AC-US1-01**");
2b. NEVER Edit metadata.json to "completed" Directly
Use /sw:done <id> workflow only. Direct edit = BUG.
2b-bis. Task-AC Auto-Sync (EDA)
When you mark task complete, hooks auto-update:
Task Acceptance checkboxes
spec.md ACs
Status → "ready_for_review" when all done
Hook chain: post-tool-use.sh → task-ac-sync-guard.sh → us-completion-detector.sh
2c. Per-US Project: Fields (ADR-0140)
User Stories SHOULD have **Project**: field for proper sync.

### US-001: Login Form
**Project**: my-app           # ← RECOMMENDED
**Board**: ui-team            # ← For 2-level only
**As a** user, I want...
RESOLUTION PRIORITY:
config.project.name or multiProject.projects key
Existing folder in specs/
Same feature type pattern
ASK USER if uncertain
Fallback: "default" (NEVER "specweave"!)
2d. NEVER Create Files in _features/ Folder
Features MUST live in specs/{project}/FS-XXX/ folders. Hook features-folder-guard.sh BLOCKS writes to _features/.
2e. Increment Root File Structure
At root: metadata.json, spec.md, plan.md, tasks.md Everything else → subfolders: reports/, scripts/, logs/, backups/, docs/
2f. NEVER Create Duplicate Increment IDs

const id = IncrementNumberManager.generateIncrementId('feature-name');
// → Guaranteed unique, throws if duplicate
Hook increment-duplicate-guard.sh BLOCKS duplicates. Gap-filling: IDs fill gaps instead of highest + 1.
2g. Project Folder Validation
Project folders SHOULD exist in config.json. Avoid example names like: frontend-app, backend-api, acme-corp, my-app, {{PROJECT_ID}}
2h. Single-Project vs Multi-Project

SINGLE-PROJECT: **Project**: uses config.project.name
MULTI-PROJECT:  **Project**: uses multiProject.projects keys
3. Protected Directories
NEVER delete: .specweave/docs/, .specweave/increments/ NEVER run: specweave init . --force
4. Skills Must NOT Spawn Large Agents
Skills spawning content-generating agents = CRASH (context explosion)
5. NEVER Spawn Parallel Agents for Multi-File Migrations
Multi-file migrations MUST be sequential, NEVER parallel agents.
6. Emergency Minimal Mode
Activate with: "emergency mode", "minimal mode ON"

READ: limit:50 | EDIT: 1 per response | AGENTS: none | FLOW: "Done. Next?"
7. Writing Effective Claude Instructions

❌ "Please consider making smaller edits..."
✅ "1 edit. STOP. Wait for 'next'."
8. MDX Compatibility

❌ target=_blank → ✅ target="_blank"
❌ <br> → ✅ <br />
Importers use sanitizeHtmlForMdx().
9. Fire-and-Forget Notifications

// ❌ WRONG: execSync() or await exec()
// ✅ CORRECT: Fire-and-forget callback
import('child_process').then(cp => {
  cp.exec(`osascript -e '...'`, () => {});
});
Sounds: Pop (success), Glass (info), Submarine (warning). NEVER Basso!
Development Setup

npm install && npm run rebuild
npm test
git add . && git commit -m "feat: feature" && git push origin develop
Marketplace: bash scripts/refresh-marketplace.sh NPM Release: /sw-release:npm
No Default Increment on Init
specweave init creates structure only. Use /sw:increment for first increment.
Coding Standards
Logger: Use logger, NEVER console.*
Imports: ALWAYS .js extensions
Tests: .test.ts, vi.fn(), os.tmpdir()
Filesystem: Native fs only (NEVER fs-extra)
Code: Functions < 100 lines, avoid any
File Size Limits
Max 1500 lines/file. Check: wc -l file.ts
Folder Structure
Increments root: ####-name/ or ####E-name/ folders, _archive/, README.md
External Increment E-Suffix
External items use E suffix: 0111E-dora-metrics-fix

const id = IncrementNumberManager.generateIncrementId('fix-name', { isExternal: true });
CLI Command Structure (ADR-0138)
Init is modular: src/cli/commands/init.ts (orchestrator) + src/cli/helpers/init/ (helpers)
Key Formats
Task Format

### T-001: Task Title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [x] completed
GitHub Issue Format
ONLY: [FS-XXX][US-YYY] User Story Title
spec.md Format

---
increment: 0001-feature-name
title: "Feature Title"
---

### US-001: Feature Name
**Project**: my-project
**As a** user, I want...
ADR Naming
XXXX-decision-title.md in .specweave/docs/internal/architecture/adr/
Important Rules
NO Increment-to-Increment References - only INCREMENT → FEATURE → USER STORIES
Structured Data Matching - use deriveFeatureId(), not content.includes('FS-039')
GitHub Duplicates - use DuplicateDetector.createWithProtection()
AC Presence - MANDATORY in spec.md
Git Provider Abstraction - use getPlatformRegistry().getProvider('github')
Configuration
Secrets vs Configuration
Secrets (.env): AZURE_DEVOPS_PAT, JIRA_API_TOKEN, JIRA_EMAIL, GH_TOKEN Config (config.json): issueTracker.domain, issueTracker.organization_ado

// ❌ process.env.JIRA_DOMAIN
// ✅ config.issueTracker?.domain
Commands

/sw:increment "feature"    # Plan new increment
/sw:do                     # Execute tasks
/sw:done 0002              # Close
/sw:progress               # Show status
/sw:sync-progress          # Full sync
/sw:validate 0001          # Validate
/sw:living-docs            # Living docs builder
Build & Test

npm run rebuild     # Clean + build
npm test            # Smoke tests
npm run test:all    # All tests (30%+ coverage)
Zombie Processes (AUTO-CLEANUP)
Automated via SessionStart hook + heartbeat + watchdog. Manual: node dist/src/cli/cleanup-zombies.js 60
Hook Development
Hook Concurrency System
Semaphore: Max 15 concurrent hooks
Circuit Breaker: Per-hook, prevents cascade failures
Metrics: Tracks success/failure/timeout

HOOK_MAX_CONCURRENT=15
HOOK_TIMEOUT=5
HOOK_DEBUG=1
Dashboard: bash plugins/specweave/scripts/hook-health.sh
Quick Reference
Aspect	Rule
Skills vs Agents	Skills = auto-activate, Agents = explicit Task()
Hook events	PostToolUse, PreToolUse, UserPromptSubmit, SessionStart/End
Hook input	Write/Edit: .tool_input.file_path, Bash: .command
Cache	.specweave/cache/ (24h TTL)
Stuck session	pkill -9 -f "bash.*specweave" + rm .specweave/state/*.lock
References
Internal Docs: .specweave/docs/internal/ External: .github/CONTRIBUTING.md, https://spec-weave.com


**Stats**: ~270 lines vs original ~1165 lines = **77% reduction**

**Removed blocking hooks references:**
- ~~`spec-project-validator.sh`~~
- ~~`per-us-project-validator.sh`~~
- ~~`increment-root-guard.sh`~~
- ~~`project-folder-guard.sh`~~

**Kept active hooks:**
- `features-folder-guard.sh` ✓
- `increment-duplicate-guard.sh` ✓