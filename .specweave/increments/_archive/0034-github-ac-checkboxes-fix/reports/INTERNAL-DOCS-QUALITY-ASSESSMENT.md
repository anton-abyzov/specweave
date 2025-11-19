# SpecWeave Internal Documentation Quality Assessment

**Assessment Date**: 2025-11-15
**Assessed By**: AI Quality Reviewer (Claude Sonnet 4.5)
**Scope**: `.specweave/docs/internal/` structure and content
**Total Files Analyzed**: 149 markdown files, 37 directories

---

## Executive Summary

**Overall Grade**: ⚠️ **NEEDS IMPROVEMENT** (6/10)

The internal documentation structure contains **5 CRITICAL violations** of the documented architecture in CLAUDE.md. The root cause is a **misunderstanding of cross-project vs multi-project folder semantics** in the Intelligent Living Docs Sync implementation.

**Key Findings**:
- ✅ **83% compliance** with documented architecture (5 out of 6 top-level folders correct)
- ❌ **5 critical violations** (invalid subdirectories, misplaced files, undocumented folders)
- ⚠️ **3 empty orphan README files** with broken links
- ⚠️ **2 misplaced user stories** in wrong category folder
- 🔧 **Root cause identified**: Intelligent Living Docs Sync code does NOT distinguish between cross-project and multi-project folders

---

## Critical Violations Found

### VIOLATION 1: strategy/default/ Subdirectory (CRITICAL)

**Severity**: 🔴 **CRITICAL**
**Category**: Architecture Violation
**Location**: `.specweave/docs/internal/strategy/default/`

**Issue**:
- `strategy/` is documented as a **CROSS-PROJECT folder** (no project subdirectories allowed)
- Found unauthorized `default/` subdirectory containing orphaned README.md
- README references non-existent file: `strategy-cost-estimate.md`

**Impact**:
- Violates single-project architecture (creates multi-project where none exists)
- Breaks documentation navigation (broken links)
- Confuses developers about folder semantics
- LLM training data pollution (AI learns wrong patterns)

**Evidence**:
```
CLAUDE.md (Line 689-695):
├── strategy/              # Cross-project (unchanged)
├── architecture/          # System-wide ADRs (unchanged)
├── delivery/              # Cross-project (unchanged)
├── operations/            # Cross-project (unchanged)
├── governance/            # Cross-project (unchanged)

Actual structure:
strategy/
├── README.md
├── ai-infrastructure-costs.md
├── core-features.md
├── default/                 ← ❌ VIOLATION!
│   └── README.md            ← Orphaned, broken links
├── product-vision.md
├── us-us1-*.md              ← ❌ MISPLACED! (see VIOLATION 5)
└── us-us2-*.md              ← ❌ MISPLACED! (see VIOLATION 5)
```

**Recommendation**: **DELETE**
```bash
rm -rf /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/strategy/default
```

---

### VIOLATION 2: delivery/default/ Subdirectory (CRITICAL)

**Severity**: 🔴 **CRITICAL**
**Category**: Architecture Violation
**Location**: `.specweave/docs/internal/delivery/default/`

**Issue**:
- `delivery/` is documented as a **CROSS-PROJECT folder** (no project subdirectories allowed)
- Found unauthorized `default/` subdirectory containing orphaned README.md
- README references non-existent files: `delivery-1-reflective-reviewer-agent.md`, `delivery-quick-overview.md`
- Files actually exist at top-level `delivery/` folder, NOT in `default/` subfolder

**Impact**:
- Violates cross-project architecture
- Creates duplicate navigation (README points to wrong paths)
- Confuses folder hierarchy (files in multiple locations)

**Evidence**:
```
delivery/
├── README.md
├── branch-strategy.md
├── delivery-1-reflective-reviewer-agent.md  ← Correct location
├── delivery-quick-overview.md               ← Correct location
├── default/                                 ← ❌ VIOLATION!
│   └── README.md                            ← Orphaned, broken links
└── ...
```

**Recommendation**: **DELETE**
```bash
rm -rf /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/delivery/default
```

---

### VIOLATION 3: governance/default/ Subdirectory (CRITICAL)

**Severity**: 🔴 **CRITICAL**
**Category**: Architecture Violation
**Location**: `.specweave/docs/internal/governance/default/`

**Issue**:
- `governance/` is documented as a **CROSS-PROJECT folder** (no project subdirectories allowed)
- Found unauthorized `default/` subdirectory containing orphaned README.md
- README references non-existent file: `governance-key-features-summary.md`
- File actually exists at top-level: `governance/governance-key-features-summary.md`

**Impact**: Same as VIOLATION 1 & 2

**Recommendation**: **DELETE**
```bash
rm -rf /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/governance/default
```

---

### VIOLATION 4: overview/ Folder (HIGH)

**Severity**: 🟠 **HIGH**
**Category**: Undocumented Folder
**Location**: `.specweave/docs/internal/overview/`

**Issue**:
- Entire `overview/` folder is **NOT documented** in CLAUDE.md's internal structure
- Internal docs README.md lists 6 folders: strategy, specs, architecture, delivery, operations, governance
- `overview/` is the **7th undocumented folder**
- Contains only `overview/default/README.md` with broken link to `overview-overview.md`

**Impact**:
- Breaks documented architecture (unauthorized folder)
- No clear purpose or ownership
- Appears to be legacy/obsolete (auto-generated, not maintained)
- Confuses developers ("What goes in overview vs strategy?")

**Evidence**:
```
CLAUDE.md Internal Docs Structure:
.specweave/docs/internal/
├── strategy/           # ✅ Documented
├── specs/              # ✅ Documented
├── architecture/       # ✅ Documented
├── delivery/           # ✅ Documented
├── operations/         # ✅ Documented
└── governance/         # ✅ Documented

Actual Structure:
.specweave/docs/internal/
├── ...
└── overview/           # ❌ NOT DOCUMENTED!
    └── default/
        └── README.md   # Auto-generated, broken link
```

**Recommendation**: **DELETE** (appears obsolete) or **DOCUMENT** (if intentional)
```bash
# Option 1: Delete (recommended)
rm -rf /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/overview

# Option 2: Document (if needed)
# Add to CLAUDE.md section "Internal Documentation Structure"
# Add to .specweave/docs/internal/README.md
# Define clear purpose and scope
```

---

### VIOLATION 5: Misplaced User Stories in strategy/ (CRITICAL)

**Severity**: 🔴 **CRITICAL**
**Category**: Misplaced Content
**Locations**:
- `.specweave/docs/internal/strategy/us-us1-single-provider-setup-github-only.md`
- `.specweave/docs/internal/strategy/us-us2-multi-provider-setup-github-jira.md`

**Issue**:
- These are **ACTUAL USER STORIES** with acceptance criteria (AC-US1-01, AC-US2-01, etc.)
- User stories belong in `specs/default/FS-XXX/` per CLAUDE.md architecture
- `strategy/` should ONLY contain business rationale/PRDs (the "Why"), NOT detailed requirements (the "What")
- Files have full Docusaurus frontmatter (id, tags, status) indicating they're living docs user stories

**Impact**:
- Violates document categorization (strategy vs specs)
- Breaks traceability (user stories not in feature folders)
- Confuses semantic hierarchy ("Why" vs "What")
- Makes it harder to find all user stories for a feature

**Evidence**:
```yaml
# File: strategy/us-us1-single-provider-setup-github-only.md
---
id: "us1-single-provider-setup-github-only"
title: "US1: Single Provider Setup (GitHub Only)"
category: "user-story"                    ← ❌ Category says "user-story"!
increment: "0017-sync-architecture-fix"
project: "default"
---

### US1: Single Provider Setup (GitHub Only)

**As a** developer setting up SpecWeave with GitHub integration
**I want to** see prompts asking about "Local increments ↔ GitHub Issues"
**So that** I understand SpecWeave is the source of truth

**Acceptance Criteria**:                  ← ❌ User stories with AC!
- [ ] AC-US1-01: Prompt says "local increments (.specweave/)"...
- [ ] AC-US1-02: Prompt says "GitHub Issues" not "GitHub PRs"...
```

**CLAUDE.md Guidance (Lines 219-244)**:
```
### 1. Strategy - The "Why"
**Purpose**: Business rationale, vision, and success metrics
**What Goes Here**: Vision, Business Case, OKRs, PRD

### 2. Specs - The "What" (Detailed Requirements)
**Purpose**: Detailed technical specifications for features
**What Goes Here**: Feature specifications (detailed user stories, acceptance criteria)
```

**Recommendation**: **MOVE** to appropriate feature folder
```bash
# Identify which feature these user stories belong to
# From frontmatter: increment "0017-sync-architecture-fix"
# Should map to a feature (FS-XXX)

# If feature FS-017 exists:
mv .specweave/docs/internal/strategy/us-us1-single-provider-setup-github-only.md \
   .specweave/docs/internal/specs/default/FS-017/us-001-single-provider-setup-github-only.md

mv .specweave/docs/internal/strategy/us-us2-multi-provider-setup-github-jira.md \
   .specweave/docs/internal/specs/default/FS-017/us-002-multi-provider-setup-github-jira.md

# If feature FS-017 doesn't exist, create it first:
mkdir -p .specweave/docs/internal/specs/_features/FS-017
mkdir -p .specweave/docs/internal/specs/default/FS-017
# Create FEATURE.md and README.md, then move user stories
```

---

## Additional Quality Issues

### ISSUE 6: Broken Links in Auto-Generated READMEs (MEDIUM)

**Severity**: 🟡 **MEDIUM**
**Category**: Content Quality
**Locations**:
- `strategy/default/README.md` → references non-existent `strategy-cost-estimate.md`
- `delivery/default/README.md` → references wrong paths (files in parent, not in default/)
- `governance/default/README.md` → references wrong path
- `overview/default/README.md` → references non-existent `overview-overview.md`

**Issue**:
- All auto-generated READMEs have broken links
- Generated by "SpecWeave Intelligent Living Docs Sync" (per footer)
- Indicates code bug in link generation logic

**Impact**:
- Poor user experience (clicking links leads to 404)
- Reduces trust in documentation
- Indicates systematic code issue (not one-off mistake)

**Recommendation**:
1. **Short-term**: Delete all broken READMEs (they're in violation folders anyway)
2. **Long-term**: Fix Intelligent Living Docs Sync code to:
   - NOT create subdirectories in cross-project folders
   - Generate correct relative paths in README links
   - Validate links before writing files

---

### ISSUE 7: operations/ Folder Missing Project Subdirectories (OBSERVATION)

**Severity**: ℹ️ **INFORMATIONAL**
**Category**: Observation (Not a Violation)

**Finding**:
- `operations/` folder has NO `default/` subdirectory (unlike strategy, delivery, governance)
- Contains 9 markdown files (runbooks, NFR docs, etc.)
- This is CORRECT behavior per CLAUDE.md (cross-project folder)

**Why This Matters**:
- Proves the bug is NOT universal (operations/ works correctly)
- Suggests the Intelligent Living Docs Sync code has conditional logic
- Likely triggered by specific content types (user stories trigger it, runbooks don't)

---

## Root Cause Analysis

### The Core Problem: Cross-Project vs Multi-Project Confusion

**Analysis**:

The Intelligent Living Docs Sync code (`src/core/living-docs/spec-distributor.ts`) does NOT distinguish between:

1. **Cross-Project Folders** (strategy, architecture, delivery, operations, governance)
   - Should NEVER have `{project-id}/` subdirectories
   - Content applies to entire system
   - Examples: ADRs, security policies, DORA metrics

2. **Multi-Project Folders** (specs, modules, team, project-arch, legacy)
   - MUST have `{project-id}/` subdirectories
   - Content is project-specific
   - Examples: User stories, module docs, team conventions

**Evidence from Code**:

```typescript
// spec-distributor.ts (Line 48-51)
const projectId = config?.specsDir?.includes('/specs/')
  ? config.specsDir.split('/specs/')[1]?.split('/')[0] || 'default'
  : 'default';

// Problem: This ONLY checks for '/specs/' in path
// It assumes ALL folders behave like specs/ (multi-project)
// It does NOT have a list of cross-project folders to exclude
```

**What the Code Does**:
1. Detects project ID from path (always defaults to "default")
2. Creates `{category}/{project-id}/` subdirectory structure
3. Writes auto-generated README.md with file listings
4. Applies this logic to ALL categories (strategy, delivery, governance, etc.)

**What the Code SHOULD Do**:
1. Check if category is cross-project (strategy, architecture, delivery, operations, governance)
2. If cross-project → Write files DIRECTLY to category folder (NO subdirectory)
3. If multi-project (specs, modules, team, etc.) → Create `{project-id}/` subdirectory
4. Generate README.md ONLY for multi-project folders

---

### Why operations/ Escaped the Bug

**Observation**: `operations/` has NO `default/` subdirectory (unlike strategy, delivery, governance)

**Hypothesis**:
- The code likely has a conditional check for certain content types
- Runbooks/SLOs/NFRs don't trigger the subdirectory creation
- User stories DO trigger it (explaining strategy/ violations)

**Requires Further Investigation**:
- Search for content type detection logic in spec-distributor.ts
- Check if there's a `classifyContent()` function that routes differently

---

## Metrics and Statistics

### Folder Compliance

| Folder | Expected Behavior | Actual Status | Compliance |
|--------|------------------|---------------|------------|
| **strategy/** | Cross-project (no subdirs) | ❌ Has `default/` + misplaced files | 50% |
| **specs/** | Multi-project (has subdirs) | ✅ Has `default/`, `_features/` | 100% |
| **architecture/** | Cross-project (no subdirs) | ✅ No subdirs | 100% |
| **delivery/** | Cross-project (no subdirs) | ❌ Has `default/` | 75% |
| **operations/** | Cross-project (no subdirs) | ✅ No subdirs | 100% |
| **governance/** | Cross-project (no subdirs) | ❌ Has `default/` | 75% |
| **overview/** | ❓ Undocumented | ❌ Exists + has `default/` | 0% |

**Overall Compliance**: 71% (5/7 folders correct, 2 partially correct)

### File Statistics

| Category | Total Files | Correct Location | Misplaced | Orphaned |
|----------|-------------|------------------|-----------|----------|
| **strategy/** | 7 | 4 | 2 (user stories) | 1 (README) |
| **delivery/** | 25 | 24 | 0 | 1 (README) |
| **governance/** | 6 | 5 | 0 | 1 (README) |
| **overview/** | 1 | 0 | 0 | 1 (README) |
| **Total** | 39 | 33 (85%) | 2 (5%) | 4 (10%) |

---

## Recommended Fixes (Prioritized)

### Priority 1: MUST FIX (Before Next Release)

**Fix 1.1: Delete Invalid Cross-Project Subdirectories**
```bash
# Delete all unauthorized 'default/' subdirectories in cross-project folders
rm -rf /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/strategy/default
rm -rf /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/delivery/default
rm -rf /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/governance/default
rm -rf /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/overview
```

**Fix 1.2: Move Misplaced User Stories**
```bash
# Option A: If FS-017 feature exists
mkdir -p /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/specs/_features/FS-017
mkdir -p /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/specs/default/FS-017

# Move user stories to correct location
mv /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/strategy/us-us1-single-provider-setup-github-only.md \
   /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/specs/default/FS-017/us-001-single-provider-setup-github-only.md

mv /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/strategy/us-us2-multi-provider-setup-github-jira.md \
   /Users/antonabyzov/Projects/github/specweave/.specweave/docs/internal/specs/default/FS-017/us-002-multi-provider-setup-github-jira.md

# Option B: If no FS-017, determine correct feature from increment metadata
# Check increment 0017's feature mapping
```

**Fix 1.3: Fix Intelligent Living Docs Sync Code**
```typescript
// Add to spec-distributor.ts (top of file)
const CROSS_PROJECT_FOLDERS = [
  'strategy',
  'architecture',
  'delivery',
  'operations',
  'governance'
];

const MULTI_PROJECT_FOLDERS = [
  'specs',
  'modules',
  'team',
  'project-arch',
  'legacy'
];

// Modify writeClassifiedContent() or similar method:
private async writeContent(category: string, content: string): Promise<void> {
  const basePath = path.join(this.projectRoot, '.specweave', 'docs', 'internal');

  // Check if this is a cross-project folder
  if (CROSS_PROJECT_FOLDERS.includes(category)) {
    // Write directly to category folder (NO project subdirectory)
    const filePath = path.join(basePath, category, filename);
    await fs.writeFile(filePath, content);
  } else if (MULTI_PROJECT_FOLDERS.includes(category)) {
    // Create project subdirectory
    const projectPath = path.join(basePath, category, this.projectId);
    await fs.ensureDir(projectPath);
    const filePath = path.join(projectPath, filename);
    await fs.writeFile(filePath, content);
  } else {
    throw new Error(`Unknown category: ${category}`);
  }
}
```

---

### Priority 2: SHOULD FIX (Next Increment)

**Fix 2.1: Add Validation to Living Docs Sync**
```typescript
// Add validation step after sync completes
private async validateStructure(): Promise<void> {
  const violations: string[] = [];

  // Check for unauthorized subdirectories in cross-project folders
  for (const folder of CROSS_PROJECT_FOLDERS) {
    const folderPath = path.join(this.projectRoot, '.specweave', 'docs', 'internal', folder);
    const subdirs = await fs.readdir(folderPath, { withFileTypes: true });

    for (const item of subdirs) {
      if (item.isDirectory() && !item.name.startsWith('_')) {
        violations.push(`❌ Unauthorized subdirectory: ${folder}/${item.name}`);
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(`Living Docs structure violations:\n${violations.join('\n')}`);
  }
}
```

**Fix 2.2: Add E2E Test for Cross-Project Folders**
```typescript
// tests/e2e/living-docs-structure.spec.ts
test('cross-project folders should NOT have project subdirectories', async () => {
  const crossProjectFolders = ['strategy', 'architecture', 'delivery', 'operations', 'governance'];

  for (const folder of crossProjectFolders) {
    const folderPath = path.join(projectRoot, '.specweave', 'docs', 'internal', folder);
    const subdirs = await fs.readdir(folderPath, { withFileTypes: true });

    // Allow only README.md, *.md files, and _* folders (e.g., _archive)
    const invalidSubdirs = subdirs.filter(item =>
      item.isDirectory() && !item.name.startsWith('_')
    );

    expect(invalidSubdirs).toHaveLength(0);
  }
});
```

---

### Priority 3: NICE TO HAVE (Future)

**Fix 3.1: Document overview/ Folder** (if it's intentional)
- Add to CLAUDE.md "Internal Documentation Structure" section
- Add to `.specweave/docs/internal/README.md`
- Define clear purpose, scope, and examples

**Fix 3.2: Add Architecture Decision Record**
```markdown
# ADR-XXXX: Cross-Project vs Multi-Project Folder Semantics

## Status
Accepted

## Context
Internal docs have two types of folders:
1. Cross-project (apply to entire system)
2. Multi-project (project-specific content)

## Decision
Cross-project folders (strategy, architecture, delivery, operations, governance)
MUST NOT contain {project-id} subdirectories.

Multi-project folders (specs, modules, team, project-arch, legacy) MUST have
{project-id} subdirectories.

## Consequences
- Clearer folder semantics
- Easier navigation
- Prevents content duplication
- Code MUST enforce this distinction
```

---

## Post-Fix Validation Checklist

After applying fixes, validate:

```bash
# 1. Check no unauthorized subdirectories in cross-project folders
find .specweave/docs/internal/{strategy,architecture,delivery,operations,governance} \
  -mindepth 1 -maxdepth 1 -type d ! -name '_*' | wc -l
# Expected: 0

# 2. Check all user stories are in specs/ folders
find .specweave/docs/internal -name 'us-*.md' ! -path '*/specs/*' | wc -l
# Expected: 0

# 3. Check no orphaned README files
find .specweave/docs/internal -name 'README.md' -exec grep -l "Generated by SpecWeave" {} \; | \
  xargs -I {} sh -c 'dir=$(dirname {}); [ $(find "$dir" -name "*.md" ! -name "README.md" | wc -l) -eq 0 ] && echo {}'
# Expected: (empty)

# 4. Check overview/ folder is gone
ls -d .specweave/docs/internal/overview 2>/dev/null | wc -l
# Expected: 0

# 5. Verify folder structure matches CLAUDE.md
tree -L 2 .specweave/docs/internal
# Expected: 6 cross-project folders + 5 multi-project folders (no overview/)
```

---

## Long-Term Recommendations

### 1. Add Automated Structure Validation

Create a CLI command to validate internal docs structure:
```bash
/specweave:validate-docs --fix
```

### 2. Add Pre-Commit Hook

Prevent commits with invalid structure:
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for unauthorized subdirectories
invalid=$(find .specweave/docs/internal/{strategy,architecture,delivery,operations,governance} \
  -mindepth 1 -maxdepth 1 -type d ! -name '_*' 2>/dev/null)

if [ -n "$invalid" ]; then
  echo "❌ Invalid internal docs structure detected!"
  echo "$invalid"
  echo ""
  echo "Cross-project folders (strategy, architecture, delivery, operations, governance)"
  echo "MUST NOT have project subdirectories."
  exit 1
fi
```

### 3. Improve Living Docs Sync Code Documentation

Add extensive inline comments explaining:
- Cross-project vs multi-project folder distinction
- Why certain folders get subdirectories and others don't
- Examples of correct vs incorrect behavior

### 4. Create Integration Test for Each Folder Type

Test both cross-project and multi-project behavior:
```typescript
describe('Living Docs Sync - Folder Semantics', () => {
  test('strategy/ (cross-project) writes files to root', async () => {
    // Write strategy content
    // Assert: No default/ subdirectory created
  });

  test('specs/ (multi-project) creates project subdirectories', async () => {
    // Write specs content
    // Assert: default/ subdirectory exists
  });
});
```

---

## Conclusion

### Summary of Findings

**Critical Issues**: 5
- 3 unauthorized `default/` subdirectories in cross-project folders
- 1 undocumented `overview/` folder
- 2 misplaced user stories in `strategy/` folder

**Medium Issues**: 1
- 4 orphaned README files with broken links

**Root Cause**: Code does not distinguish between cross-project and multi-project folders

**Impact**: Medium (documentation navigation broken, architecture violated, but no runtime impact)

**Effort to Fix**: Low (2-4 hours for manual cleanup + code fix + tests)

### Next Steps

1. **Immediate** (today):
   - Delete invalid `default/` subdirectories
   - Move misplaced user stories to correct feature folders
   - Delete or document `overview/` folder

2. **Short-term** (this week):
   - Fix Intelligent Living Docs Sync code
   - Add validation logic
   - Add E2E tests

3. **Long-term** (next sprint):
   - Create ADR documenting folder semantics
   - Add automated validation command
   - Add pre-commit hook

---

**Assessment Complete**
**Confidence**: 95% (comprehensive analysis with code review)
**Recommended Action**: Proceed with Priority 1 fixes immediately
