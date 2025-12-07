---
increment: 0086-brownfield-doc-analysis
feature_id: FS-086
title: "Brownfield Documentation Analysis & Discrepancy Management"
status: completed
started: 2025-12-01
priority: P0
type: feature
created: 2025-12-01
---

# 0086: Brownfield Documentation Analysis & Discrepancy Management

## Vision

**Living Docs as Source of Truth for UNDERSTANDING** - not just for new development, but as the persistent knowledge layer for brownfield/legacy systems where tribal knowledge is the real source of truth (and it leaves when people leave).

## The Problem We're Solving

### The "Code is Source of Truth" Myth

Code tells you **WHAT**. It cannot tell you **WHY**.

| Question | Real Source of Truth |
|----------|---------------------|
| What does this code do? | Code |
| **Why** was it built this way? | ??? (often lost) |
| What are the business requirements? | ??? (scattered) |
| How do components interact? | ??? (tribal knowledge) |
| What was considered but rejected? | ??? (gone with authors) |

### Brownfield Reality

For brownfield/legacy systems:
- Original authors are gone
- Documentation is 5+ versions behind
- "Understanding" exists only in 2 people's heads
- New hires take 6+ months to become productive
- Nobody fully understands the whole system

## Solution Architecture

### The "Layered Truth" Model

```
Layer 5: Runtime Reality (WHAT-ACTUALLY-HAPPENS)
  → Logs, metrics, incidents, production behavior
  → Source: Observability systems

Layer 4: Implementation (WHAT-IS)
  → Code, tests, configs
  → Source: Code (only here is code authoritative)

Layer 3: Expected Behavior (WHAT-SHOULD)
  → Specs, ACs, API contracts
  → Source: Living Docs

Layer 2: Design Decisions (HOW-WHY)
  → ADRs, architecture docs, tradeoffs
  → Source: Living Docs

Layer 1: Business Intent (WHY)
  → PRDs, features, user stories, domain context
  → Source: Living Docs
```

**Living Docs = Source of Truth for UNDERSTANDING (Layers 1-3)**
**Code = Source of Truth for IMPLEMENTATION (Layer 4)**

## Scope

This increment implements:
1. **Init Flow Integration** - Add brownfield analysis question after testing config
2. **Background Job Infrastructure** - Long-running analyzer for 1000+ repo codebases
3. **Discrepancy Storage** - Structured folder for detected discrepancies
4. **Discrepancy → Increment Flow** - Convert discrepancies into actionable work

## User Stories

### US-001: Init Flow Brownfield Analysis Question
**As a** developer setting up SpecWeave on an existing project,
**I want** to be asked if I want to analyze my codebase for documentation gaps,
**So that** I can bootstrap living docs from existing code and documentation.

#### Acceptance Criteria
- [x] **AC-US1-01**: After testing configuration questions, prompt asks about brownfield analysis
- [x] **AC-US1-02**: User can choose analysis depth: Quick (5-10min), Standard (30-60min), Deep (hours)
- [x] **AC-US1-03**: User can specify existing documentation location (auto-detect common paths)
- [x] **AC-US1-04**: Analysis starts as background job (non-blocking init)
- [x] **AC-US1-05**: Skip option available with clear explanation of what's missed

### US-002: Brownfield Background Job System
**As a** developer with a large enterprise codebase,
**I want** the analysis to run as a background job,
**So that** I can continue working while it processes 1000+ repos.

#### Acceptance Criteria
- [x] **AC-US2-01**: Create job type `brownfield-analysis` in background job system
- [x] **AC-US2-02**: Job shows progress: phase, items processed, ETA
- [x] **AC-US2-03**: Job can be paused/resumed without losing progress
- [x] **AC-US2-04**: Job survives session restart (persistent state)
- [x] **AC-US2-05**: `/specweave:jobs` shows brownfield analysis status
- [x] **AC-US2-06**: Job completion triggers notification with summary

### US-003: Discrepancy Storage Structure
**As a** developer with many documentation gaps,
**I want** discrepancies stored in a structured, scalable folder,
**So that** I can manage thousands of discrepancies without file explosion.

#### Acceptance Criteria
- [x] **AC-US3-01**: Create `.specweave/discrepancies/` folder structure
- [x] **AC-US3-02**: Store discrepancies in batched folders (0001-0100/, 0101-0200/)
- [x] **AC-US3-03**: Main `index.json` with summary stats and pagination
- [x] **AC-US3-04**: Discrepancy schema includes: id, type, module, severity, status, evidence
- [x] **AC-US3-05**: Support discrepancy types: missing-docs, stale-docs, knowledge-gap, missing-adr
- [x] **AC-US3-06**: Resolved discrepancies move to `resolved/YYYY-MM/` for archival

### US-004: Discrepancy Detection Algorithms
**As a** developer,
**I want** intelligent detection of documentation gaps,
**So that** I know what's missing, stale, or misaligned.

#### Acceptance Criteria
- [x] **AC-US4-01**: Detect undocumented public APIs and exported functions
- [x] **AC-US4-02**: Detect stale docs (code changed but docs haven't in 90+ days)
- [x] **AC-US4-03**: Detect orphan docs (docs for code that no longer exists)
- [x] **AC-US4-04**: Detect missing ADRs (significant patterns without decision records)
- [x] **AC-US4-05**: Calculate confidence score (0-100) for each discrepancy
- [x] **AC-US4-06**: Detect knowledge silos (modules only one person has committed to)

### US-005: Discrepancy → Increment Conversion
**As a** developer,
**I want** to convert discrepancies into increments,
**So that** I can systematically address documentation gaps.

#### Acceptance Criteria
- [x] **AC-US5-01**: Command `/specweave:discrepancy-to-increment` creates increment from discrepancies
- [x] **AC-US5-02**: Multiple discrepancies can be grouped into single increment
- [x] **AC-US5-03**: Increment spec auto-generated with discrepancy context
- [x] **AC-US5-04**: Discrepancy status changes to `in-progress` with increment link
- [x] **AC-US5-05**: When increment completes, discrepancies auto-marked `resolved`
- [x] **AC-US5-06**: Resolution syncs to living docs

### US-006: Discrepancy Commands
**As a** developer,
**I want** commands to view and manage discrepancies,
**So that** I can prioritize and track documentation work.

#### Acceptance Criteria
- [x] **AC-US6-01**: `/specweave:discrepancies` lists all pending discrepancies
- [x] **AC-US6-02**: Filter by module: `--module payment`
- [x] **AC-US6-03**: Filter by type: `--type missing-docs`
- [x] **AC-US6-04**: Filter by severity: `--severity critical`
- [x] **AC-US6-05**: View single discrepancy: `/specweave:discrepancy DISC-0001`
- [x] **AC-US6-06**: Ignore discrepancy: `--ignore DISC-0001` with reason

## Technical Architecture

### Folder Structure

```
.specweave/
├── discrepancies/
│   ├── index.json              # Summary stats, pagination info
│   ├── pending/
│   │   ├── 0001-0100/          # Batched for scalability
│   │   │   ├── DISC-0001.json
│   │   │   ├── DISC-0002.json
│   │   │   └── ...
│   │   ├── 0101-0200/
│   │   └── ...
│   ├── in-progress/            # Linked to increments
│   │   └── DISC-0050.json
│   └── resolved/               # Archived by month
│       ├── 2025-01/
│       └── 2025-02/
```

### Discrepancy Schema

```typescript
interface Discrepancy {
  id: string;                    // DISC-0001
  type: 'missing-docs' | 'stale-docs' | 'code-doc-mismatch' |
        'knowledge-gap' | 'orphan-doc' | 'missing-adr';

  // Location
  module: string;                // e.g., "payment-service"
  codeLocation?: string;         // e.g., "src/payment/processor.ts:42"
  docLocation?: string;          // e.g., "docs/modules/payment.md"

  // Details
  summary: string;               // Brief description
  details: string;               // Full explanation
  evidence: {
    codeSnippet?: string;
    docSnippet?: string;
    gitHistory?: {
      lastCodeChange: string;    // ISO date
      lastDocChange?: string;
      authors: string[];
    };
  };

  // Classification
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;            // 0-100
  autoDetected: boolean;

  // Resolution
  status: 'pending' | 'in-progress' | 'resolved' | 'ignored';
  incrementId?: string;          // If being addressed
  resolution?: {
    type: 'doc-updated' | 'code-updated' | 'both-updated' | 'false-positive';
    resolvedAt: string;
    resolvedBy: string;
  };

  // Metadata
  detectedAt: string;
  detectedBy: 'brownfield-analyzer' | 'drift-detector' | 'manual';
  lastChecked: string;
}
```

### Background Job Configuration

```typescript
interface BrownfieldAnalysisJobConfig {
  type: 'brownfield-analysis';
  projectPath: string;

  sourceDocsPath?: string;       // Existing docs location
  codebasePaths: string[];       // Paths to analyze
  analysisDepth: 'quick' | 'standard' | 'deep';

  // Progress tracking
  phases: ['discovery', 'code-analysis', 'doc-matching', 'discrepancy-detection', 'reporting'];
  currentPhase: number;

  // Pause/resume support
  checkpoint?: {
    phase: string;
    lastProcessedPath: string;
    processedCount: number;
  };
}
```

### Init Flow Integration

```typescript
// src/cli/helpers/init/brownfield-analysis.ts

export async function promptBrownfieldAnalysis(
  targetDir: string,
  language: SupportedLanguage
): Promise<BrownfieldAnalysisConfig | null> {
  // 1. Ask if user wants analysis
  const wantsAnalysis = await confirm({
    message: 'Analyze existing codebase for documentation gaps?'
  });

  if (!wantsAnalysis) return null;

  // 2. Auto-detect existing docs
  const detectedDocs = await detectExistingDocs(targetDir);

  // 3. Ask for docs location (pre-filled with detection)
  const docsPath = await input({
    message: 'Existing documentation location:',
    default: detectedDocs[0]?.path || 'docs/'
  });

  // 4. Select analysis depth
  const depth = await select({
    message: 'Analysis depth:',
    choices: [
      { name: 'Quick (5-10 min) - Structure only', value: 'quick' },
      { name: 'Standard (30-60 min) - Full analysis', value: 'standard' },
      { name: 'Deep (hours) - Semantic analysis', value: 'deep' }
    ]
  });

  // 5. Start background job
  const job = await launchBrownfieldAnalysisJob({
    projectPath: targetDir,
    sourceDocsPath: docsPath,
    analysisDepth: depth
  });

  console.log(chalk.green(`Background analysis started (Job: ${job.id})`));
  console.log(chalk.gray('Monitor with: /specweave:jobs'));

  return { jobId: job.id, docsPath, depth };
}
```

## Dependencies

- Existing background job system (from FS-074)
- Existing discrepancy detection (from 0084) - code analysis portion reusable
- Init flow helpers infrastructure

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 10,000+ discrepancies overwhelming | Batch storage, pagination, smart prioritization |
| Hours-long analysis | Background job with pause/resume |
| False positives | Confidence scoring, manual ignore |
| Stale discrepancies | Re-check on code changes |

## Success Metrics

- Brownfield init flow adoption: 50%+ of existing project inits
- Discrepancy → Increment conversion: 30%+ of discrepancies addressed
- Documentation coverage increase: measurable via discrepancy count trend

## Out of Scope (Phase 1)

- Real-time code watching (batch mode only)
- AI-powered documentation generation
- Multi-language support (TypeScript/JavaScript first)
- External tool sync for discrepancies
