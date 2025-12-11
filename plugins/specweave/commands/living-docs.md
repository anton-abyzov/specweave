---
name: sw:living-docs
description: Launch or resume Living Docs Builder independently. Generates documentation from codebase analysis with AI-powered insights.
usage: /sw:living-docs [--resume <jobId>] [--depth <level>] [--priority <modules>] [--sources <folders>] [--depends-on <jobIds>] [--foreground] [--full-scan]
---

# Living Docs Builder (Standalone)

**Usage**: `/sw:living-docs [options]`

---

## Purpose

Launch the Living Docs Builder independently of `specweave init`. This is essential for:
- **Resuming after crash** - Claude Code crashed after init, need to restart living docs
- **On-demand analysis** - Re-analyze codebase after major changes
- **Large brownfield projects** - Run targeted analysis on specific modules
- **CI/CD integration** - Automate documentation generation

---

## Command Options

| Option | Description |
|--------|-------------|
| (none) | Interactive mode - prompts for configuration |
| `--resume <jobId>` | Resume orphaned/paused living-docs job |
| `--depth <level>` | Analysis depth: `quick`, `standard`, `deep-native`, `deep-api` |
| `--priority <modules>` | Priority modules (comma-separated): `auth,payments,api` |
| `--sources <folders>` | Additional doc folders (comma-separated): `docs/,wiki/` |
| `--depends-on <jobIds>` | Wait for jobs before starting (comma-separated) |
| `--foreground` | Run in current session instead of background |
| `--force` | Force run even for greenfield projects |
| `--full-scan` | **Force full deep scan** - All phases (repos, org, arch, inconsistencies, strategy) |

---

## Quick Start

### Launch New Analysis (Interactive)

```bash
/sw:living-docs

# Prompts for:
# 1. Analysis depth (quick/standard/deep-native/deep-api)
# 2. Priority modules to focus on
# 3. Additional documentation sources
# 4. Confirmation to launch
```

### Resume After Crash

```bash
# Check for orphaned jobs first
/sw:jobs

# If you see an orphaned living-docs-builder job:
/sw:living-docs --resume abc12345

# Or let it auto-detect:
/sw:living-docs
# → "Found orphaned job abc12345. Resume? [Y/n]"
```

### Quick Analysis (Non-Interactive)

```bash
# Quick scan - 5-10 minutes
/sw:living-docs --depth quick

# Standard analysis - 15-30 minutes
/sw:living-docs --depth standard --priority auth,payments

# AI-powered deep analysis (FREE with MAX subscription)
/sw:living-docs --depth deep-native --priority core,api

# Force FULL deep scan (all phases: repos, org, arch, inconsistencies, strategy)
/sw:living-docs --full-scan
```

---

## Analysis Depths

| Depth | Duration | What It Does | Cost |
|-------|----------|--------------|------|
| `quick` | ~5-10 min | Structure scan, tech detection, imports map | Free |
| `standard` | ~15-30 min | Module analysis, exports, dependencies | Free |
| `deep-native` | Progress-based | AI analysis via Claude Code CLI | FREE (MAX) |
| `deep-api` | Progress-based | AI analysis via API key | API costs |

### Full Scan Mode (--full-scan)

**What it does**: Forces a comprehensive deep analysis with ALL phases, regardless of brownfield detection.

**When to use**:
- Initial setup - want complete documentation structure
- After major refactoring - need fresh analysis of everything
- Imported external repos - want full org structure, inconsistencies, strategy docs
- Complete living docs - need `review-needed/` and `strategy/` folders populated

**What you get** (beyond standard depths):
```
.specweave/docs/internal/
├── repos/                      # All repos analyzed (Phase B)
│   └── {repo-name}/
│       ├── overview.md
│       └── api-surface.md
├── organization/               # Team structure (Phase C)
│   ├── teams/
│   └── org-chart.mmd
├── architecture/               # System architecture (Phase D)
│   ├── adr/                   # Auto-detected ADRs
│   └── system-architecture.md
├── review-needed/              # Inconsistencies (Phase E) ✨
│   ├── questions-for-cto.md
│   ├── questions-for-po.md
│   └── inconsistencies.md
└── strategy/                   # Strategic recommendations (Phase F) ✨
    ├── tech-debt-catalog.md
    ├── modernization-candidates.md
    └── recommendations.md
```

**Command**:
```bash
/sw:living-docs --full-scan

# Uses deep-native if Claude MAX available, otherwise deep-api
# Runs ALL phases: B → C → D → E → F
# Duration: Variable (depends on project size)
```

### Deep-Native (Recommended for MAX Users)

Uses your Claude MAX subscription via `claude --print`:
- **No extra cost** - included in MAX
- Runs in **background** - survives terminal close
- **Checkpoint/resume** - can resume from any phase
- Uses **Opus 4.5** for best quality

```bash
/sw:living-docs --depth deep-native

# Monitor progress:
/sw:jobs --follow <jobId>
```

---

## Implementation Steps

When this command is invoked:

### Step 1: Check for Orphaned Jobs

```typescript
import { getOrphanedJobs, getJobManager } from '../../../src/core/background/job-launcher.js';

const orphaned = getOrphanedJobs(projectPath).filter(j => j.type === 'living-docs-builder');
if (orphaned.length > 0) {
  // Prompt: "Found orphaned job {id}. Resume? [Y/n]"
  // If yes: resume job
  // If no: ask if they want to start fresh
}
```

### Step 2: Collect Configuration (if not --resume)

If no `--resume` flag and no auto-resume:

```typescript
import { collectLivingDocsInputs } from '../../../src/cli/helpers/init/living-docs-preflight.js';

const result = await collectLivingDocsInputs({
  projectPath,
  language: 'en',
  isCi: hasFlags, // Skip prompts if flags provided
});
```

Override with flags:
- `--depth` → `result.userInputs.analysisDepth`
- `--priority` → `result.userInputs.priorityAreas`
- `--sources` → `result.userInputs.additionalSources`

### Step 3: Launch Job

```typescript
import { launchLivingDocsJob } from '../../../src/core/background/job-launcher.js';

const { job, pid, isBackground } = await launchLivingDocsJob({
  projectPath,
  userInputs: result.userInputs,
  dependsOn: dependsOnJobIds,
  foreground: hasForegroundFlag,
});
```

### Step 4: Display Status

```
✅ Living Docs Builder launched!

   Job ID: ldb-abc12345
   Depth: deep-native (Claude Code Opus 4.5)
   Priority: auth, payments, api
   PID: 45678

   Monitor: /sw:jobs --follow ldb-abc12345
   Logs: /sw:jobs --logs ldb-abc12345

💡 This job runs in background and survives terminal close.
   Output will be saved to:
   - .specweave/docs/SUGGESTIONS.md
   - .specweave/docs/ENTERPRISE-HEALTH.md
```

---

## Resume Behavior

When resuming a job:

1. **Load checkpoint** from `.specweave/state/jobs/<jobId>/checkpoints/`
2. **Skip completed phases**:
   - `waiting` → dependency waiting
   - `discovery` → codebase scanning
   - `foundation` → high-level docs
   - `integration` → work item matching
   - `deep-dive` → module analysis (per-module checkpoints)
   - `suggestions` → recommendations
   - `enterprise` → health report
3. **Continue from resume point**

```bash
# Example: Job crashed during deep-dive phase
/sw:living-docs --resume abc12345

# Output:
# Resuming from checkpoint: phase=deep-dive, module=auth (5/18)
# ✓ Skipping completed phases: waiting, discovery, foundation, integration
# → Continuing deep-dive from module: payments
```

---

## Waiting for Dependencies

For umbrella projects with clone/import jobs:

```bash
# Launch after clone completes
/sw:living-docs --depends-on clone-xyz123 --depth standard

# Launch after both clone and import complete
/sw:living-docs --depends-on clone-xyz123,import-abc456
```

The job will:
1. Enter `waiting` phase
2. Poll dependency status every 30 seconds
3. Start analysis once all dependencies complete
4. Warn if any dependency failed (proceeds with available data)

---

## Update Summary (v0.33.0+)

After completion, you'll see a detailed summary showing:

```
✅ LIVING DOCS UPDATE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SUMMARY:

  Discovery: Discovered 3 repos (2,845 files)
    Duration: 5s

  Analysis: Analyzed 3 repos
    Duration: 127s

  Synthesis: Generated 12 ADRs, 4 teams
    Duration: 43s

  Files Created: 47
    • .specweave/docs/internal/repos/main/overview.md
    • .specweave/docs/internal/repos/main/api-surface.md
    • .specweave/docs/internal/architecture/system-architecture.md
    • .specweave/docs/internal/architecture/adr/0001-typescript-migration.md
    • .specweave/docs/internal/architecture/adr/0002-plugin-system.md
    ... and 42 more

  Files Updated: 8
    • .specweave/docs/internal/modules/auth.md
    • .specweave/docs/internal/modules/payments.md
    ... and 6 more

  Total Duration: 175s
  Mode: INCREMENTAL (cache used)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Output Files

After completion:

| File | Description |
|------|-------------|
| `.specweave/docs/SUGGESTIONS.md` | Documentation recommendations by priority |
| `.specweave/docs/ENTERPRISE-HEALTH.md` | Health score, coverage, accuracy metrics |
| `.specweave/docs/overview/PROJECT-OVERVIEW.md` | Auto-generated project overview |
| `.specweave/docs/overview/TECH-STACK.md` | Detected technologies and frameworks |
| `.specweave/docs/modules/*.md` | Per-module documentation |

---

## Examples

### Example 1: Post-Crash Resume

```bash
# Claude crashed after init, living docs job orphaned

# Step 1: Check what's there
/sw:jobs
# Shows: [ldb-abc123] living-docs-builder - ORPHANED (worker died)

# Step 2: Resume
/sw:living-docs --resume ldb-abc123

# Output:
# ✅ Resuming Living Docs Builder (ldb-abc123)
#    Last checkpoint: deep-dive phase, module 12/45
#    Continuing from: payments-service
```

### Example 2: Large Brownfield (247 repos)

```bash
# Focus on critical modules first
/sw:living-docs --depth deep-native \
  --priority auth,payments,billing,core \
  --depends-on clone-main123

# Monitor in another terminal
/sw:jobs --follow ldb-xyz789
```

### Example 3: CI/CD Integration

```bash
# In CI pipeline (non-interactive)
specweave living-docs --depth quick --foreground

# Or background with polling
specweave living-docs --depth standard
specweave jobs --wait ldb-latest  # Wait for completion
```

---

## Error Handling

### Worker Crashed
```
/sw:jobs
# Shows: ORPHANED status

/sw:living-docs --resume <jobId>
# Resumes from last checkpoint
```

### Dependency Failed
```
⚠️  Dependency clone-xyz123 failed
    Reason: Network timeout

Proceeding with available data...
Some repositories may be missing from analysis.
```

### No Brownfield Detected
```
ℹ️  No existing code detected (greenfield project)
    Living docs will sync automatically as you create increments.

    To force analysis anyway: /sw:living-docs --force
```

---

## See Also

- `/sw:jobs` - Monitor all background jobs
- `/sw:import-docs` - Import existing documentation
- `specweave:brownfield-analyzer` skill - Analyze doc gaps
- `specweave:brownfield-onboarder` skill - Merge existing docs

---

**Implementation**: `src/cli/commands/living-docs.ts`
