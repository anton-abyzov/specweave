# Template Testing Strategy - Comprehensive Validation

**Date**: 2025-11-15
**Context**: Testing template enhancements for simulated progressive disclosure
**Goal**: Thoroughly verify all template enhancements work correctly

---

## Test Categories

### 1. Template Rendering Tests
**Goal**: Verify templates render correctly with placeholder substitution

**Tests**:
- ✅ All placeholders get replaced
- ✅ No unresolved `{VARIABLE}` patterns remain
- ✅ Dynamic sections (AGENTS_SECTION, SKILLS_SECTION) populate correctly
- ✅ Conditional sections (IF_SINGLE_PROJECT, IF_MULTI_PROJECT) work
- ✅ Output files are valid Markdown

### 2. Anchor Link Validation Tests
**Goal**: Verify all anchor links in Section Index exist

**Tests**:
- ✅ Every link in Section Index has corresponding section
- ✅ All `#command-*` anchors exist
- ✅ All `#skill-*` anchors exist
- ✅ All `#agent-*` anchors exist
- ✅ All `#workflow-*` anchors exist
- ✅ All `#troubleshoot-*` anchors exist

### 3. Structure Completeness Tests
**Goal**: Verify all required sections are present

**Tests**:
- ✅ "How to Use This File" section exists (AGENTS.md only)
- ✅ Section Index exists (AGENTS.md only)
- ✅ Quick Reference Cards exist (both templates)
- ✅ Troubleshooting section exists (both templates)
- ✅ Essential Knowledge section exists (AGENTS.md only)
- ✅ Critical Rules section exists (AGENTS.md only)

### 4. Search Pattern Tests
**Goal**: Verify search patterns work correctly

**Tests**:
- ✅ `#command-increment` findable via search
- ✅ `#skill-increment-planner` findable
- ✅ `#agent-pm` findable
- ✅ `#workflow-daily-development` findable
- ✅ `#troubleshoot-sync` findable

### 5. Content Accuracy Tests
**Goal**: Verify content matches specifications

**Tests**:
- ✅ Quick Reference Cards show correct commands
- ✅ File Organization rules are accurate
- ✅ Troubleshooting solutions are correct
- ✅ Multi-tool callouts are present
- ✅ Manual sync instructions are clear

### 6. Token Efficiency Tests
**Goal**: Verify simulated progressive disclosure reduces token usage

**Tests**:
- ✅ Measure tokens for full file read
- ✅ Measure tokens for section-only read
- ✅ Verify 80%+ token savings
- ✅ Compare before/after enhancement

### 7. Multi-Tool Compatibility Tests
**Goal**: Verify templates work in different tools

**Tests**:
- ✅ Markdown renders correctly in Cursor
- ✅ Markdown renders correctly in VS Code
- ✅ Search (Ctrl+F) works for anchor patterns
- ✅ Visual tables display properly
- ✅ Code blocks are formatted correctly

---

## Test Implementation Plan

### Phase 1: Automated Tests (TypeScript)
Create test files:
- `tests/unit/template-rendering.test.ts`
- `tests/unit/template-anchor-links.test.ts`
- `tests/unit/template-structure.test.ts`
- `tests/e2e/template-validation.spec.ts`

### Phase 2: Manual Validation
Create validation scripts:
- `scripts/validate-template-anchors.ts`
- `scripts/validate-template-placeholders.ts`
- `scripts/measure-template-tokens.ts`

### Phase 3: E2E Testing
Test actual `specweave init` flow:
- Create fresh project
- Run `specweave init`
- Verify CLAUDE.md and AGENTS.md rendered correctly
- Test navigation patterns work

---

## Test Execution Order

1. **Template Rendering** (validate base functionality)
2. **Anchor Links** (validate navigation infrastructure)
3. **Structure Completeness** (validate all sections present)
4. **Search Patterns** (validate findability)
5. **Content Accuracy** (validate correctness)
6. **Token Efficiency** (validate optimization)
7. **Multi-Tool Compatibility** (validate universality)

---

## Success Criteria

### Critical (Must Pass)
- ✅ 100% of placeholders resolved
- ✅ 100% of anchor links valid
- ✅ 100% of required sections present
- ✅ 100% of search patterns work

### Important (Should Pass)
- ✅ 90%+ Quick Reference accuracy
- ✅ 90%+ Troubleshooting completeness
- ✅ 80%+ token savings demonstrated

### Nice-to-Have (May Pass)
- ✅ Visual consistency across tools
- ✅ Performance benchmarks
- ✅ User feedback positive

---

## Test Data

### Test Projects
1. **Single-project TypeScript** - Frontend React app
2. **Single-project Python** - Backend FastAPI
3. **Multi-project Monorepo** - Full-stack Next.js + Node.js
4. **Brownfield Project** - Existing codebase with docs

### Test Scenarios
1. **Fresh init** - `specweave init` on empty project
2. **Re-init** - `specweave init` on existing SpecWeave project
3. **Plugin selection** - Init with different plugin combinations
4. **Multi-project mode** - Init with multi-project enabled

---

## Implementation Details

Each test will follow this pattern:
```typescript
describe('Template Enhancement Tests', () => {
  describe('Template Rendering', () => {
    test('should replace all placeholders', () => {
      // Test implementation
    });

    test('should not leave unresolved variables', () => {
      // Test implementation
    });
  });

  describe('Anchor Links', () => {
    test('should have all Section Index links valid', () => {
      // Test implementation
    });

    test('should be findable via search patterns', () => {
      // Test implementation
    });
  });

  // ... more tests
});
```

---

**Next**: Implement actual test files
