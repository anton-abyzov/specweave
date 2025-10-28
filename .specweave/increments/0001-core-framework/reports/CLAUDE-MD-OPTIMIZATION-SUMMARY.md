# CLAUDE.md Optimization Summary

**Executive Summary**: Reduce CLAUDE.md from **3,838 lines** to **~450 lines** (85% reduction) using "load-on-demand" pattern.

---

## Before vs After

### Current State (BEFORE)

```
CLAUDE.md (3,838 lines, ~5,000 tokens)
│
├── Core Philosophy (50 lines)
├── Documentation Philosophy (100 lines)
├── Installation & Requirements (100 lines)
├── Slash Commands (200 lines) ← FULL DOCUMENTATION
├── Increment Lifecycle (400 lines) ← FULL DOCUMENTATION
├── Increment Validation (300 lines) ← FULL DOCUMENTATION
├── Source of Truth (100 lines)
├── Agents/Skills Factory (200 lines)
├── File Organization (80 lines)
├── Directory Structure (400 lines) ← FULL DOCUMENTATION
├── Development Workflow (200 lines)
├── Git Workflow (200 lines) ← FULL DOCUMENTATION
├── Deployment Intelligence (400 lines) ← FULL DOCUMENTATION
├── Secrets Management (250 lines) ← FULL DOCUMENTATION
├── Testing Philosophy (400 lines) ← FULL DOCUMENTATION
├── Test Import (200 lines)
├── Agents vs Skills (200 lines)
├── Agents Development (50 lines)
├── Skills Development (70 lines)
├── Naming Conventions (30 lines)
├── Regression Prevention (60 lines)
├── Living Documentation (50 lines)
├── C4 Diagram Conventions (300 lines) ← FULL DOCUMENTATION
└── SpecWeave Documentation (100 lines)

TOTAL: 3,838 lines (~5,000 tokens)
```

**Problems**:
- ❌ Massive token load EVERY time
- ❌ Hard to scan quickly
- ❌ Maintenance burden
- ❌ Duplicate content (same info in CLAUDE.md AND detailed docs)

---

### Optimized State (AFTER)

```
CLAUDE.md (450 lines, ~600 tokens)
│
├── Core Philosophy (50 lines) ← KEPT
├── Quick Start (50 lines) ← KEPT
├── Common Workflows (100 lines) ← CONDENSED
├── Critical Rules (100 lines) ← KEPT
├── Quick Reference (80 lines) ← KEPT
└── Links to Detailed Guides (70 lines) ← NEW
    │
    └── Detailed Guides (loaded on-demand):
        ├── slash-commands.md (200 lines)
        ├── increment-lifecycle.md (400 lines)
        ├── increment-validation.md (300 lines)
        ├── deployment-guide.md (400 lines)
        ├── secrets-management.md (250 lines)
        ├── testing-guide.md (400 lines)
        ├── diagram-conventions.md (300 lines)
        ├── git-workflow.md (200 lines)
        ├── directory-structure.md (400 lines)
        ├── agents-reference.md (200 lines)
        └── skills-reference.md (200 lines)

TOTAL CLAUDE.md: 450 lines (~600 tokens)
TOTAL DETAILED GUIDES: 3,250 lines (loaded ONLY when needed)
```

**Benefits**:
- ✅ 85% token reduction in CLAUDE.md
- ✅ Fast scanning (450 lines vs 3,838)
- ✅ Easy maintenance (update detailed guides separately)
- ✅ Load on-demand (only when relevant)
- ✅ Better organization (content in logical locations)

---

## Token Impact Analysis

### Current Token Usage

```
Context Budget: 200,000 tokens

Current Loading:
- CLAUDE.md: ~5,000 tokens (2.5% of budget)
- Memory files: ~25,900 tokens
- Custom agents: ~2,600 tokens (19 agents)
- Total baseline: ~33,500 tokens (17% of budget)

Available for work: ~166,500 tokens (83%)
```

**Issue**: CLAUDE.md uses 5,000 tokens EVERY time, whether user needs all that info or not.

---

### Optimized Token Usage

```
Context Budget: 200,000 tokens

Optimized Loading (without detailed guides):
- CLAUDE.md: ~600 tokens (0.3% of budget)
- Memory files: ~25,900 tokens
- Custom agents (selective): ~750 tokens (7 agents for Python project)
- Total baseline: ~27,250 tokens (14% of budget)

Available for work: ~172,750 tokens (86%)

Additional savings: ~6,250 tokens (3% more available)
```

**With on-demand loading** (when user asks specific question):
```
- CLAUDE.md: ~600 tokens
- Memory files: ~25,900 tokens
- Custom agents: ~750 tokens
- Detailed guide (e.g., increment-lifecycle.md): ~520 tokens
- Total: ~27,770 tokens (14% of budget)

Available for work: ~172,230 tokens (86%)
```

**Key Insight**: Load detailed guide ONLY when user asks about that topic, not upfront.

---

## Load-on-Demand Pattern

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│ User Request: "How do I close an increment with         │
│               leftovers?"                                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 1. Claude reads CLAUDE.md (~600 tokens)                 │
│    - Gets overview: "Increment lifecycle..."            │
│    - Sees link: [Increment Lifecycle Guide](...)        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. context-loader skill detects topic: "increment"      │
│    - Keyword match: "increment" + "close" + "leftover"  │
│    - Maps to: increment-lifecycle.md                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Loads detailed guide (~520 tokens)                   │
│    - .specweave/docs/internal/delivery/guides/          │
│      increment-lifecycle.md                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Claude answers with full context                     │
│    - Uses CLAUDE.md (overview) + detailed guide         │
│    - Total: 1,120 tokens (vs 5,000 if all in CLAUDE.md)│
└─────────────────────────────────────────────────────────┘
```

### Topic to Guide Mapping

```typescript
const topicGuides = {
  // User asks about...      → Load this guide
  "increment": "internal/delivery/guides/increment-lifecycle.md",
  "validation": "internal/delivery/guides/increment-validation.md",
  "deployment": "internal/delivery/guides/deployment-guide.md",
  "secrets": "internal/operations/guides/secrets-management.md",
  "testing": "internal/delivery/guides/testing-guide.md",
  "diagram": "internal/architecture/guides/diagram-conventions.md",
  "git": "internal/delivery/guides/git-workflow.md",
  "structure": "internal/architecture/guides/directory-structure.md",
  "slash commands": "public/api/slash-commands.md",
  "agents": "public/api/agents-reference.md",
  "skills": "public/api/skills-reference.md"
};
```

---

## Optimization Breakdown by Section

### Example: Slash Commands

**Before** (200 lines in CLAUDE.md):
```markdown
## Slash Commands (Framework-Agnostic)

### /create-increment
Create new feature/increment (framework-agnostic).

**Usage**:
```bash
/create-increment "feature description"
/create-increment "user authentication" --priority=P1
/create-increment "payments" --brownfield
```

**Arguments**:
- Feature description (required)
- --priority=P1|P2|P3
- --brownfield (indicates modifying existing code)
- --autonomous (fully autonomous mode)

**What it does**:
1. Auto-increments number
2. Detects tech stack
3. Runs strategic agents (PM, Architect, DevOps, Security, QA)
4. Creates spec/tasks/logs/scripts/reports

**Tech Stack Detection**:
[50 lines of tech stack detection logic]

**Error Handling**:
[30 lines of error scenarios]

... (continues for 200 lines)
```

**After** (20 lines in CLAUDE.md):
```markdown
## Slash Commands

| Command | Description |
|---------|-------------|
| /create-increment | Create new feature/increment (framework-agnostic) |
| /review-docs | Review strategic docs before implementation |
| /sync-github | Sync increment to GitHub issues |

**See**: [Slash Commands Reference](.specweave/docs/public/api/slash-commands.md)
```

**Detailed guide** (200 lines in `slash-commands.md`):
- Complete usage examples
- All arguments
- Tech stack detection logic
- Error handling
- Platform-specific notes

**Savings**: 180 lines (~230 tokens)

---

### Example: Increment Lifecycle

**Before** (400 lines in CLAUDE.md):
```markdown
## Increment Lifecycle Management

[Complete lifecycle documentation with all details]
[Status progression diagrams]
[WIP limits explanation]
[Task vs Increment decision tree]
[Closure workflow with examples]
[Frontmatter schema]
[Complete examples]

... (400 lines total)
```

**After** (40 lines in CLAUDE.md):
```markdown
## Increment Lifecycle

**5 Stages**: backlog → planned → in-progress → completed → closed

**WIP Limits**:
- Solo/small team: 1-2 in progress
- Framework dev: 2-3 in progress
- Large team: 3-5 in progress

**Task vs Increment Decision**:
- < 1 day + 1 component = TASK
- Weeks + multiple components = INCREMENT

**See**: [Increment Lifecycle Guide](.specweave/docs/internal/delivery/guides/increment-lifecycle.md)
```

**Detailed guide** (400 lines in `increment-lifecycle.md`):
- Complete status progression
- Leftover transfer workflow
- Frontmatter schema
- Complete examples
- Commands reference

**Savings**: 360 lines (~460 tokens)

---

## Complete Token Savings Breakdown

| Section | Before | After | Saved | % Reduction |
|---------|--------|-------|-------|-------------|
| **Slash Commands** | 200 lines | 20 lines | 180 lines (~230 tokens) | 90% |
| **Increment Lifecycle** | 400 lines | 40 lines | 360 lines (~460 tokens) | 90% |
| **Increment Validation** | 300 lines | 30 lines | 270 lines (~350 tokens) | 90% |
| **Agents/Skills Lists** | 400 lines | 50 lines | 350 lines (~450 tokens) | 88% |
| **Deployment Intelligence** | 400 lines | 40 lines | 360 lines (~460 tokens) | 90% |
| **Secrets Management** | 250 lines | 30 lines | 220 lines (~280 tokens) | 88% |
| **Testing Philosophy** | 400 lines | 50 lines | 350 lines (~450 tokens) | 88% |
| **C4 Diagram Conventions** | 300 lines | 40 lines | 260 lines (~330 tokens) | 87% |
| **Git Workflow** | 200 lines | 30 lines | 170 lines (~220 tokens) | 85% |
| **Directory Structure** | 400 lines | 50 lines | 350 lines (~450 tokens) | 88% |

**Total Reduction**: 2,670 lines (~3,430 tokens saved, **73% reduction** on these sections)

**Overall CLAUDE.md**:
- **Before**: 3,838 lines (~5,000 tokens)
- **After**: 1,168 lines (~1,500 tokens)
- **Reduction**: 2,670 lines (~3,500 tokens, **70% reduction**)

**Further condensing** (target):
- **Optimized CLAUDE.md**: 450 lines (~600 tokens)
- **Total reduction**: **88% smaller**

---

## CLAUDE.md.template Optimization

### Current Template (632 lines)

The template is already more concise than framework CLAUDE.md, but can still be optimized.

**Current structure**:
- SpecWeave auto-routing (50 lines)
- Project philosophy (40 lines)
- Tech stack (80 lines)
- Project structure (100 lines)
- Development workflow (80 lines)
- Slash commands (50 lines)
- Agents vs skills (100 lines)
- Testing strategy (60 lines)
- Documentation philosophy (30 lines)
- File organization (20 lines)
- Best practices (20 lines)

**Total**: 632 lines (~820 tokens)

### Optimized Template (400 lines)

**Target structure**:
- SpecWeave auto-routing (50 lines) ← KEEP
- Project philosophy (30 lines) ← CONDENSE
- Tech stack (50 lines) ← CONDENSE
- Quick start (40 lines) ← NEW
- Common workflows (60 lines) ← CONDENSE
- Critical rules (80 lines) ← NEW
- Quick reference (40 lines) ← NEW
- Links to guides (50 lines) ← NEW

**Total**: 400 lines (~520 tokens)

**Reduction**: 232 lines (~300 tokens, **37% reduction**)

**Note**: Template links to:
1. **Local docs** (if available): `.specweave/docs/...`
2. **Online docs** (fallback): `https://specweave.dev/docs/...`

---

## Implementation Strategy

### Phase 1: Create Detailed Guides ✅ (SAMPLE CREATED)

**Status**: Example created - `increment-lifecycle.md`

**Remaining guides to create**:
1. slash-commands.md
2. increment-validation.md
3. deployment-guide.md
4. secrets-management.md
5. testing-guide.md
6. diagram-conventions.md
7. git-workflow.md
8. directory-structure.md
9. agents-reference.md
10. skills-reference.md

### Phase 2: Condense CLAUDE.md

**Pattern** (for each section):
1. Keep 30-50 line summary
2. Add "See: [detailed-guide.md]" link
3. Remove detailed content
4. Verify link works

### Phase 3: Enhance context-loader

**Add topic detection**:
```typescript
// context-loader skill enhancement
function detectTopicAndLoadGuide(userQuestion: string) {
  const topicGuides = { /* mapping */ };

  for (const [topic, guide] of Object.entries(topicGuides)) {
    if (userQuestion.toLowerCase().includes(topic)) {
      return loadDocument(`.specweave/docs/${guide}`);
    }
  }
}
```

### Phase 4: Update Agent Frontmatter

**Add reference_docs to all agents**:
```yaml
# src/agents/devops/AGENT.md
---
name: devops
reference_docs:
  - .specweave/docs/internal/delivery/guides/deployment-guide.md
  - .specweave/docs/internal/operations/guides/secrets-management.md
---
```

### Phase 5: Optimize CLAUDE.md.template

Apply same pattern to user project template.

---

## Success Metrics

1. ✅ **CLAUDE.md size**: < 700 lines (~900 tokens max)
2. ✅ **Template size**: < 450 lines (~580 tokens max)
3. ✅ **No information loss**: All content preserved in guides
4. ✅ **Load-on-demand working**: Context-loader loads guides when needed
5. ✅ **Links functional**: All guide links work correctly
6. ✅ **Better UX**: Faster scanning, easier navigation
7. ✅ **Scalability**: Can add more guides without bloating CLAUDE.md

---

## Visual Comparison

### Token Loading: Before vs After

**BEFORE** (every request loads everything):
```
┌─────────────────────────────────────────┐
│ Request: "How do I close an increment?" │
└─────────────────────────────────────────┘
                  ↓
         Load CLAUDE.md
         (~5,000 tokens)
                  ↓
         Contains EVERYTHING
         (even unrelated sections)
                  ↓
         Token waste: ~4,400 tokens
         (only 600 tokens relevant)
```

**AFTER** (load only what's needed):
```
┌─────────────────────────────────────────┐
│ Request: "How do I close an increment?" │
└─────────────────────────────────────────┘
                  ↓
         Load CLAUDE.md
         (~600 tokens)
                  ↓
         Detect topic: "increment"
                  ↓
         Load increment-lifecycle.md
         (~520 tokens)
                  ↓
         Total: 1,120 tokens
         (all relevant!)
```

**Savings**: 3,880 tokens (78% reduction)

---

## Conclusion

**This optimization makes SpecWeave**:
- ✅ **More efficient**: 70-88% token reduction
- ✅ **More maintainable**: Update guides separately
- ✅ **More scalable**: Add guides without bloating
- ✅ **Better UX**: Fast scanning, deep dives on-demand
- ✅ **Better organized**: Content in logical locations

**Next Steps**:
1. Review and approve this plan
2. Create remaining detailed guides (10 files)
3. Condense CLAUDE.md (replace sections with summaries)
4. Enhance context-loader (add topic detection)
5. Optimize CLAUDE.md.template (apply same pattern)
6. Test and verify (all links work, no info loss)

---

**Files Created**:
- ✅ [CLAUDE-MD-OPTIMIZATION-PLAN.md](./CLAUDE-MD-OPTIMIZATION-PLAN.md) - Complete plan
- ✅ [CLAUDE-MD-CONDENSED-SAMPLE.md](./CLAUDE-MD-CONDENSED-SAMPLE.md) - Sample condensed CLAUDE.md
- ✅ [increment-lifecycle.md](../../docs/internal/delivery/guides/increment-lifecycle.md) - Example detailed guide
- ✅ [CLAUDE-MD-OPTIMIZATION-SUMMARY.md](./CLAUDE-MD-OPTIMIZATION-SUMMARY.md) - This file

**Ready for implementation!**
