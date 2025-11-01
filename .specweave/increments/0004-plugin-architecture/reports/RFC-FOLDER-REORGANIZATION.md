# RFC Folder Reorganization - Implementation Guide
**Date**: 2025-11-01
**Increment**: 0004-plugin-architecture
**Status**: Ready to Execute
**Priority**: P0 (Quick Win - 30 minutes)

---

## Problem Statement

### Current Mess

**Git Status Shows**:
```
D .specweave/docs/internal/architecture/diagrams/README.md
D .specweave/docs/internal/architecture/diagrams/specweave-workflow-dark.svg
D .specweave/docs/rfcs/rfc-0003-specweave-test-test-epic-for-sync.md
D .specweave/docs/rfcs/rfc-0005-authentication-features.md

?? .specweave/docs/internal/architecture/rfc/
```

**What Happened**:
1. RFCs moved from `.specweave/docs/rfcs/` → `.specweave/docs/internal/architecture/rfc/`
2. Git tracked the delete but not the add (files appear untracked)
3. Code references new location (jira-mapper.ts) but docs don't explain

**Why This is Confusing**:
- ❌ Two RFC locations in git history
- ❌ Deleted files still show in git status
- ❌ New files untracked (not committed)
- ❌ No documentation explaining the move

---

## Correct Architecture

### Final Structure

```
.specweave/docs/
├── internal/                          # Strategic docs (NEVER published)
│   ├── architecture/
│   │   ├── adr/                       # Architecture Decision Records
│   │   │   ├── adr-0001-*.md
│   │   │   ├── adr-0002-*.md
│   │   │   └── ...
│   │   ├── rfc/                       # ✅ Request for Comments (detailed specs)
│   │   │   ├── rfc-0003-specweave-test-test-epic-for-sync.md
│   │   │   ├── rfc-0005-authentication-features.md
│   │   │   └── ...
│   │   ├── diagrams/                  # Mermaid + SVG
│   │   │   ├── v2/
│   │   │   └── README.md
│   │   └── hld-system.md              # High-Level Design
│   ├── strategy/                      # Business strategy
│   └── delivery/                      # Implementation notes
└── public/                            # User-facing docs (can publish)
    ├── guides/
    └── api/
```

**Why `.specweave/docs/internal/architecture/rfc/`?**

✅ **RFCs are INTERNAL strategic documents**:
- Not user-facing (unlike guides)
- Architectural artifacts (like ADRs)
- Co-located with related docs (ADRs, diagrams, HLD)

✅ **Aligns with Code Expectations**:
- `src/integrations/jira/jira-mapper.ts` references this path
- JIRA Epic → SpecWeave RFC mapping expects this location

✅ **Cleaner Than Top-Level**:
- Old: `.specweave/docs/rfcs/` (flat, unclear purpose)
- New: `.specweave/docs/internal/architecture/rfc/` (nested, clear hierarchy)

✅ **Consistent Naming**:
- `adr/` - Architecture Decision Records (what was decided)
- `rfc/` - Request for Comments (what we're proposing)
- `diagrams/` - Visual architecture
- `hld-system.md` - High-level overview

---

## Implementation Steps

### Step 1: Commit the Move (5 minutes)

```bash
# Ensure you're on the right branch
git checkout develop

# Stage the new RFC folder
git add .specweave/docs/internal/architecture/rfc/

# The deletes are already staged, just commit everything
git commit -m "refactor(docs): consolidate RFCs to internal/architecture/rfc/

- Moved RFCs from .specweave/docs/rfcs/ to .specweave/docs/internal/architecture/rfc/
- Aligns with JIRA mapper expectations (jira-mapper.ts)
- Groups architectural artifacts (ADRs, RFCs, diagrams)
- Part of 0004 plugin architecture reorganization"

# Verify clean status
git status
```

**Expected Output**:
```
On branch develop
nothing to commit, working tree clean
```

### Step 2: Update Documentation References (10 minutes)

**A. Update CLAUDE.md**

Add to the "Directory Structure" section:

```markdown
.specweave/                     # SpecWeave's own increments
├── increments/
│   ├── 0001-core-framework/
│   ├── 0002-core-enhancements/
│   └── _backlog/
├── docs/
│   ├── internal/               # Strategic docs (NEVER published)
│   │   ├── strategy/           # Business strategy, market analysis
│   │   ├── architecture/       # Technical architecture
│   │   │   ├── adr/            # Architecture Decision Records
│   │   │   ├── rfc/            # ✅ Request for Comments (detailed specs)
│   │   │   ├── diagrams/       # Mermaid + SVG
│   │   │   └── hld-system.md   # High-Level Design
│   │   └── delivery/           # Implementation notes, runbooks
│   └── public/                 # User-facing docs (can publish)
│       ├── guides/
│       └── api/
└── logs/
```

**B. Create RFC Index**

```bash
cat > .specweave/docs/internal/architecture/rfc/README.md << 'EOF'
# Request for Comments (RFCs)

**Purpose**: Detailed technical specifications for features, integrations, and architectural changes.

**When to Create an RFC**:
- Complex feature requiring team alignment
- External integrations (JIRA, GitHub, etc.)
- Breaking changes or migrations
- Cross-cutting concerns affecting multiple increments

**RFC Lifecycle**:
1. **Draft** - Proposal written, seeking feedback
2. **Under Review** - Team reviewing, discussing
3. **Accepted** - Approved for implementation
4. **Implemented** - Code complete, linked to increment
5. **Superseded** - Replaced by newer RFC

---

## Active RFCs

| RFC | Title | Status | Increment | Created |
|-----|-------|--------|-----------|---------|
| [RFC-0003](rfc-0003-specweave-test-test-epic-for-sync.md) | Test Epic for Sync | Implemented | 0004 | 2025-10-30 |
| [RFC-0005](rfc-0005-authentication-features.md) | Authentication Features | Draft | TBD | 2025-10-30 |

---

## RFC Template

```markdown
# RFC-XXXX: Title

**Status**: Draft | Under Review | Accepted | Implemented | Superseded
**Created**: YYYY-MM-DD
**Author**: Name
**Increment**: XXXX-name (if applicable)

## Problem Statement

What problem does this solve?

## Proposed Solution

How do we solve it?

## Alternatives Considered

What other options were explored?

## Implementation Plan

How will this be built?

## Success Criteria

How do we know it's working?

## References

- Related ADRs
- External docs
```

---

**Related**:
- [Architecture Decision Records (ADRs)](../adr/README.md)
- [System Architecture Diagrams](../diagrams/README.md)
- [High-Level Design](../hld-system.md)
EOF
```

**C. Update increment 0004 spec.md**

Add user story to `.specweave/increments/0004-plugin-architecture/spec.md`:

```markdown
### US-014: RFC Folder Consolidation

**As a** SpecWeave contributor
**I want** RFCs in a consistent, well-organized location
**So that** architectural documentation is easy to find and maintain

**Acceptance Criteria**:
- ✅ All RFCs in `.specweave/docs/internal/architecture/rfc/`
- ✅ Old location (`.specweave/docs/rfcs/`) removed
- ✅ All code references updated (jira-mapper.ts already correct)
- ✅ RFC index (README.md) created
- ✅ CLAUDE.md documents structure
- ✅ Clean git status (no untracked RFC files)

**Rationale**:
- RFCs are internal strategic docs (not user-facing)
- Co-located with ADRs and diagrams (architectural artifacts)
- Matches JIRA mapper expectations
- Clearer hierarchy than flat `docs/rfcs/` folder
```

### Step 3: Verify Everything (5 minutes)

**A. Check Git Status**:
```bash
git status
# Should be clean (or only show unrelated files)
```

**B. Check File Existence**:
```bash
ls -la .specweave/docs/internal/architecture/rfc/
# Should show:
# - rfc-0003-specweave-test-test-epic-for-sync.md
# - rfc-0005-authentication-features.md
# - README.md
```

**C. Check Old Location Gone**:
```bash
ls .specweave/docs/rfcs/ 2>/dev/null || echo "Old rfcs/ folder correctly deleted ✅"
# Should output: "Old rfcs/ folder correctly deleted ✅"
```

**D. Verify Code References**:
```bash
grep -r "docs/rfcs" src/
# Should return nothing (or only comments)

grep -r "docs/internal/architecture/rfc" src/
# Should show jira-mapper.ts (correct!)
```

### Step 4: Update Related Docs (10 minutes)

**A. Create Architecture Overview**

Update `.specweave/docs/internal/architecture/README.md`:

```markdown
# SpecWeave Architecture Documentation

**Purpose**: Technical architecture, decisions, and design artifacts for SpecWeave framework.

---

## Directory Structure

```
architecture/
├── adr/                       # Architecture Decision Records
│   ├── README.md             # ADR index
│   ├── adr-0001-*.md
│   └── ...
├── rfc/                       # Request for Comments
│   ├── README.md             # RFC index
│   ├── rfc-0003-*.md
│   └── ...
├── diagrams/                  # Architecture diagrams
│   ├── v2/                   # Current diagrams (Mermaid + SVG)
│   └── README.md             # Diagram index
└── hld-system.md             # High-Level Design (entry point)
```

---

## Document Types

### Architecture Decision Records (ADRs)

**What**: Decisions we've made and why
**Format**: Problem → Decision → Consequences
**Status**: Proposed → Accepted → Superseded
**Examples**:
- ADR-0001: Multi-tool support via adapters
- ADR-0002: Context loading architecture
- ADR-0006: Plugin architecture

📖 [ADR Index](adr/README.md)

### Request for Comments (RFCs)

**What**: Detailed technical specifications for features
**Format**: Problem → Solution → Implementation Plan
**Status**: Draft → Under Review → Accepted → Implemented
**Examples**:
- RFC-0003: JIRA/SpecWeave sync specification
- RFC-0005: Authentication features

📖 [RFC Index](rfc/README.md)

### Architecture Diagrams

**What**: Visual representations of system architecture
**Formats**: Mermaid (source) + SVG (rendered)
**Types**:
- C4 Context/Container/Component
- Sequence diagrams
- Data flow diagrams
**Examples**:
- System architecture overview
- Plugin loading flow
- GitHub sync workflow

📖 [Diagram Index](diagrams/README.md)

### High-Level Design (HLD)

**What**: Entry point - system overview and key concepts
**File**: `hld-system.md`
**Purpose**: Onboard new contributors, provide big picture

---

## How to Use

**For New Contributors**:
1. Start with [hld-system.md](hld-system.md) - system overview
2. Review [ADR index](adr/README.md) - understand key decisions
3. Check [diagrams](diagrams/README.md) - visualize architecture

**When Proposing Changes**:
1. Check [RFC index](rfc/README.md) - see if already proposed
2. Review relevant [ADRs](adr/README.md) - understand constraints
3. Create new RFC or ADR as appropriate

**When Implementing Features**:
1. Reference RFCs for detailed specs
2. Update diagrams if architecture changes
3. Create ADR if new decision made

---

## Related Documentation

- [Strategy Docs](../strategy/) - Business strategy, market analysis
- [Delivery Docs](../delivery/) - Implementation notes, runbooks
- [Public Docs](../../public/) - User-facing guides and API docs

---

**Last Updated**: 2025-11-01
**Maintainer**: SpecWeave Core Team
```

---

## Completion Checklist

- [ ] Step 1: Commit RFC folder move
- [ ] Step 2A: Update CLAUDE.md with directory structure
- [ ] Step 2B: Create RFC index (README.md)
- [ ] Step 2C: Add US-014 to increment 0004 spec.md
- [ ] Step 3: Verify git status clean
- [ ] Step 4: Create/update architecture README.md

**Estimated Time**: 30 minutes
**Complexity**: Low (organizational, no code changes)

---

## Benefits

✅ **Clarity**: One clear location for RFCs
✅ **Consistency**: Aligns code expectations with reality
✅ **Discoverability**: README.md indexes make RFCs easy to find
✅ **Clean Git History**: No more "deleted but untracked" confusion
✅ **Part of 0004**: Connects to plugin architecture increment

---

## Next Actions

After completing this:
1. Push to develop branch
2. Merge to features/001-core-feature
3. Reference in GITHUB-PRIMARY-ARCHITECTURE-PROPOSAL.md (Phase 1 complete!)

---

**Version**: 1.0
**Last Updated**: 2025-11-01
**Owner**: Anton Abyzov
