# Implementation Roadmap: Living Docs Architecture Fix

**Goal**: Fix living docs sync to eliminate duplication and map correctly to external tools

---

## 🎯 KEY FILES TO MODIFY

### 1. Sync Logic (Core Fix)

**File**: `plugins/specweave/lib/hooks/sync-living-docs.ts`

**Current**: Lines 180-215 (copyIncrementSpecToLivingDocs)
```typescript
// ❌ Copies ENTIRE spec.md
await fs.copy(incrementSpecPath, livingDocsPath);
```

**New**: Replace with extraction logic
```typescript
// ✅ Extract user stories ONLY
async function extractAndMergeLivingDocs(incrementId: string) {
  // 1. Parse increment spec (extract user stories)
  // 2. Check if living docs exists
  // 3. If exists: Merge new stories
  // 4. If not: Create new living docs
  // 5. Generate links (don't duplicate content)
  // 6. Update implementation history
}
```

**Key Functions to Add**:
- `parseIncrementSpec()` - Extract user stories from increment spec
- `parseLivingDocsSpec()` - Parse existing living docs
- `extractUserStories()` - Get user stories only (no architecture)
- `generateRelatedDocsLinks()` - Create links to architecture/ADRs
- `writeLivingDocsSpec()` - Write using new template

---

### 2. Templates

#### Living Docs Template

**File**: `plugins/specweave/agents/pm/templates/living-docs-spec.md` (NEW FILE)

**Sections**:
```markdown
# SPEC-{number}: {Feature Area}

## Overview (Brief)

## Implementation History (Table with links)

## User Stories & Acceptance Criteria (ALL stories)

## Architecture & Design (LINKS ONLY - NO DUPLICATION)

## External Tool Links (GitHub Project, Jira Epic, ADO Feature)

## Related Documentation (LINKS ONLY)
```

#### Increment Template

**File**: `plugins/specweave/agents/pm/templates/increment-spec.md` (UPDATE)

**Add**:
```markdown
**Implements**: [SPEC-{number}: {Feature Area}](../../docs/internal/specs/default/SPEC-{number}-{name}.md)

## What We're Implementing (This Increment Only)
- US-001
- US-002
- US-003

## Out of Scope (For This Increment)
- US-004 → Increment 0002
- US-005 → Increment 0003
```

---

### 3. PM Agent Instructions

**File**: `plugins/specweave/agents/pm/AGENT.md`

**Add Section**: "Living Docs vs Increment Specs: The Distinction"

**Key Points**:
- When to create living docs (major feature, multiple increments)
- When to create increment spec (single iteration)
- What goes in each
- External tool mapping (Epic vs Story)

---

### 4. Migration Script

**File**: `scripts/migrate-living-docs-to-new-format.ts` (NEW FILE)

**Purpose**: Convert existing living docs to new format

**Steps**:
1. Scan `.specweave/docs/internal/specs/default/SPEC-*.md`
2. For each file:
   - Extract user stories (keep)
   - Extract implementation history (keep, simplify)
   - Find architecture sections → Replace with links
   - Find ADR sections → Replace with links
   - Remove success metrics → Move to increment reports
   - Remove future enhancements → Move to roadmap
3. Rewrite using new template
4. Create backup (.bak)

**Run**:
```bash
npx ts-node scripts/migrate-living-docs-to-new-format.ts --dry-run
npx ts-node scripts/migrate-living-docs-to-new-format.ts --apply
```

---

### 5. Parser Utilities

**File**: `src/utils/spec-parser.ts` (NEW FILE)

**Functions**:
```typescript
// Parse increment spec.md into structured data
export interface IncrementSpec {
  title: string;
  overview: string;
  userStories: UserStory[];
  architecture?: string; // Raw markdown (will be discarded)
  adrs?: string[]; // Raw markdown (will be discarded)
}

export function parseIncrementSpec(filePath: string): IncrementSpec;

// Parse living docs spec.md into structured data
export interface LivingDocsSpec {
  id: string; // SPEC-001
  title: string;
  overview: string;
  userStories: UserStory[];
  implementationHistory: ImplementationHistoryEntry[];
  relatedDocs: RelatedDocs;
  externalLinks: ExternalLinks;
}

export function parseLivingDocsSpec(filePath: string): LivingDocsSpec;

// Extract user stories from markdown
export interface UserStory {
  id: string; // US-001
  title: string;
  description: string;
  acceptanceCriteria: AcceptanceCriterion[];
  implementedIn?: string; // Increment ID
  status: 'pending' | 'in-progress' | 'complete';
}

export function extractUserStories(markdown: string): UserStory[];

// Generate links to architecture docs
export interface RelatedDocs {
  architecture: string[]; // Links to architecture/*.md
  adrs: string[]; // Links to adr/*.md
  strategy: string[]; // Links to strategy/*.md
  operations: string[]; // Links to operations/*.md
}

export function generateRelatedDocsLinks(spec: IncrementSpec): RelatedDocs;
```

---

### 6. External Tool Mapping

**File**: `plugins/specweave-github/lib/github-issue-creator.ts` (UPDATE)

**Current**: Creates issue for increment

**New**: Check if living docs spec exists
```typescript
// If living docs spec exists → Link to Project
// If increment spec only → Create issue (link to Project if exists)

async function createIssueForIncrement(incrementId: string) {
  // 1. Check for living docs spec
  const specId = extractSpecId(incrementId); // SPEC-001
  const livingDocsSpec = await loadLivingDocsSpec(specId);

  // 2. If living docs exists → Check for GitHub Project
  if (livingDocsSpec && livingDocsSpec.externalLinks.github) {
    console.log(`Living docs spec ${specId} already linked to GitHub Project`);
    // Create issue and link to project
  } else if (livingDocsSpec && !livingDocsSpec.externalLinks.github) {
    // Create GitHub Project for epic
    const projectId = await createGitHubProject(livingDocsSpec);
    livingDocsSpec.externalLinks.github = projectId;
    await saveLivingDocsSpec(livingDocsSpec);

    // Create issue and link to project
  } else {
    // No living docs → Just create issue
  }
}
```

**Similar Updates**:
- `plugins/specweave-jira/lib/jira-issue-creator.ts`
- `plugins/specweave-ado/lib/ado-workitem-creator.ts`

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Core Sync Logic (HIGH PRIORITY)
- [ ] Create `src/utils/spec-parser.ts` with parsing utilities
- [ ] Update `plugins/specweave/lib/hooks/sync-living-docs.ts`:
  - [ ] Replace `copyIncrementSpecToLivingDocs` with `extractAndMergeLivingDocs`
  - [ ] Add `parseIncrementSpec()` function
  - [ ] Add `parseLivingDocsSpec()` function
  - [ ] Add `extractUserStories()` function
  - [ ] Add `generateRelatedDocsLinks()` function
  - [ ] Add `writeLivingDocsSpec()` function
- [ ] Test: Create increment → Verify living docs extracts stories only

### Phase 2: Templates (HIGH PRIORITY)
- [ ] Create `plugins/specweave/agents/pm/templates/living-docs-spec.md`
- [ ] Update `plugins/specweave/agents/pm/templates/increment-spec.md`:
  - [ ] Add "Implements SPEC-{number}" reference
  - [ ] Add "Out of Scope" section
  - [ ] Remove architecture duplication
- [ ] Test: PM agent creates specs using new templates

### Phase 3: PM Agent (MEDIUM PRIORITY)
- [ ] Update `plugins/specweave/agents/pm/AGENT.md`:
  - [ ] Add "Living Docs vs Increment Specs" section
  - [ ] Add external tool mapping explanation
  - [ ] Add examples of when to create each type
- [ ] Test: PM agent follows new instructions

### Phase 4: Migration (MEDIUM PRIORITY)
- [ ] Create `scripts/migrate-living-docs-to-new-format.ts`
- [ ] Test: Run on SPEC-001 (dry-run)
- [ ] Test: Run on SPEC-001 (apply)
- [ ] Verify: SPEC-001 has no duplication after migration

### Phase 5: External Tool Mapping (LOW PRIORITY - NICE TO HAVE)
- [ ] Update `plugins/specweave-github/lib/github-issue-creator.ts`
- [ ] Update `plugins/specweave-jira/lib/jira-issue-creator.ts`
- [ ] Update `plugins/specweave-ado/lib/ado-workitem-creator.ts`
- [ ] Test: Living docs spec → GitHub Project created
- [ ] Test: Increment spec → Issue linked to Project

### Phase 6: Testing & Documentation (HIGH PRIORITY)
- [ ] Write unit tests for parser utilities
- [ ] Write integration tests for sync logic
- [ ] Test all 4 scenarios:
  - [ ] Create new feature (living docs + increment)
  - [ ] Add to existing feature (update living docs)
  - [ ] Complete increment (update history)
  - [ ] External tool sync (GitHub Project)
- [ ] Update CLAUDE.md with new architecture
- [ ] Update user documentation

---

## 🚀 QUICK START (For Implementation)

1. **Start with parser utilities**:
   ```bash
   vim src/utils/spec-parser.ts
   # Create parsing functions first
   # Test them in isolation
   ```

2. **Update sync logic**:
   ```bash
   vim plugins/specweave/lib/hooks/sync-living-docs.ts
   # Replace copyIncrementSpecToLivingDocs
   # Use new parser utilities
   ```

3. **Test manually**:
   ```bash
   # Create test increment
   /specweave:increment "Test feature for living docs"

   # Complete increment
   # Verify living docs has NO duplication
   cat .specweave/docs/internal/specs/default/SPEC-*.md
   ```

4. **Update templates**:
   ```bash
   vim plugins/specweave/agents/pm/templates/living-docs-spec.md
   vim plugins/specweave/agents/pm/templates/increment-spec.md
   ```

5. **Update PM agent**:
   ```bash
   vim plugins/specweave/agents/pm/AGENT.md
   ```

6. **Migrate existing specs**:
   ```bash
   npx ts-node scripts/migrate-living-docs-to-new-format.ts --dry-run
   # Review changes
   npx ts-node scripts/migrate-living-docs-to-new-format.ts --apply
   ```

---

## 📊 SUCCESS METRICS

Implementation is COMPLETE when:

1. ✅ Living docs specs have NO architecture duplication (only links)
2. ✅ Living docs specs have NO ADR duplication (only links)
3. ✅ Living docs specs have NO success metrics (moved to reports)
4. ✅ Living docs specs have NO future enhancements (moved to roadmap)
5. ✅ Increment specs reference living docs (clear link)
6. ✅ Increment specs have "Out of Scope" section
7. ✅ Sync logic extracts stories (doesn't copy entire spec)
8. ✅ PM agent creates both types correctly
9. ✅ All tests pass
10. ✅ Documentation updated

---

## 🔄 ITERATIVE APPROACH

**Don't do everything at once!** Break it down:

### Iteration 1 (Day 1): Core Fix
- Parser utilities
- Sync logic update
- Manual test

### Iteration 2 (Day 2): Templates
- Living docs template
- Increment template
- PM agent test

### Iteration 3 (Day 3): Migration
- Migration script
- Test on SPEC-001
- Review results

### Iteration 4 (Day 4): External Tools
- GitHub mapping
- Jira mapping
- ADO mapping

### Iteration 5 (Day 5): Testing & Docs
- Unit tests
- Integration tests
- Documentation

---

**Ready to implement? Start with Phase 1!**
