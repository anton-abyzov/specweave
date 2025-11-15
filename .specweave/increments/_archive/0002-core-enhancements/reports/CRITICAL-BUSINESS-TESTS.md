# Critical Business Use Cases Testing Strategy

## Executive Summary

Based on the comprehensive test coverage analysis, here's a prioritized testing strategy focused on **business-critical functionality** rather than arbitrary coverage percentages.

## 🎯 Critical Business Use Cases (Must Have Tests)

### 1. **New User Onboarding & Installation** ⚠️ PARTIALLY TESTED
**Business Impact**: First impressions, user retention
**Current State**:
- ✅ `init` command basic flow tested
- ❌ **Multi-project init untested** (226 lines)
- ❌ **Plugin validation untested** (246 lines)
- ❌ **Marketplace registration untested**

**Required Tests**:
```typescript
// E2E Test Scenarios
- Fresh install → init → verify structure
- Init with existing project
- Init with broken plugin marketplace
- Init in multi-repo environment
- Offline init handling
```

### 2. **Core Increment Workflow** ✅ WELL TESTED
**Business Impact**: Core value proposition
**Current State**:
- ✅ Increment planning (88% covered)
- ✅ Task execution
- ✅ Discipline enforcement
- ⚠️ Scope changes partially tested

**Required Tests**:
```typescript
// Critical paths already covered
- /specweave:increment → do → done workflow
- WIP limits enforcement
- Task completion tracking
```

### 3. **External System Integration** 🔴 CRITICAL GAP
**Business Impact**: Team collaboration, enterprise adoption
**Current State**:
- ❌ **GitHub multi-repo sync untested** (505 lines)
- ❌ **JIRA validation untested** (130 lines)
- ❌ **Profile migration untested** (443 lines) ← HIGHEST RISK
- ⚠️ Basic sync tested, advanced features not

**Required Tests**:
```typescript
// Integration Test Scenarios
- GitHub: Create issue → sync → update → close
- JIRA: Bidirectional sync with conflict resolution
- ADO: Work item lifecycle
- Migration: V1 → V2 profiles without data loss
- Rate limiting & error recovery
```

### 4. **Living Documentation Sync** ⚠️ HOOK-DEPENDENT
**Business Impact**: Documentation accuracy, compliance
**Current State**:
- ✅ Hook infrastructure tested
- ❌ **Translation system 77% untested**
- ❌ **Spec parsing untested** (393 lines)
- ❌ **Multi-language workflows untested**

**Required Tests**:
```typescript
// Critical paths needed
- Increment complete → living docs updated
- Multi-language content → English translation
- Spec metadata extraction
- Conflict resolution in sync
```

### 5. **Monorepo/Polyrepo Support** 🔴 COMPLETELY UNTESTED
**Business Impact**: Enterprise scalability
**Current State**:
- ❌ **Repo structure manager untested** (681 lines)
- ❌ **Project detection untested** (392 lines)
- ❌ **Multi-project workflows untested**

**Required Tests**:
```typescript
// E2E Scenarios
- Detect monorepo → configure projects
- Polyrepo with submodules
- Cross-repo increment sync
- Project switching workflow
```

### 6. **Brownfield Project Import** 🔴 HIGH RISK
**Business Impact**: Adoption for existing projects
**Current State**:
- ✅ Analyzer well tested (89%)
- ❌ **Import command untested** (174 lines)
- ❌ **Doc migration untested**

**Required Tests**:
```typescript
// Critical import scenarios
- Import Notion/Confluence docs
- Classify existing documentation
- Merge with existing specs
- Handle duplicates/conflicts
```

### 7. **Quality Assurance System** ⚠️ COMPONENTS OK, ORCHESTRATION NOT
**Business Impact**: Code quality, reliability
**Current State**:
- ✅ QA components 100% tested
- ❌ **QA runner orchestration untested** (498 lines)
- ❌ **RFC generation untested** (542 lines)

**Required Tests**:
```typescript
// QA workflow tests
- Run QA → get risk score → make decision
- Quality gate pass/fail scenarios
- RFC generation from spec
```

## 📊 Coverage Threshold Recommendations

### Current Thresholds (jest.config.cjs)
```javascript
{
  branches: 45%,   // ← Too low for error handling
  functions: 68%,  // ← Recently adjusted, reasonable
  lines: 65%,      // ← Acceptable for now
  statements: 65%  // ← Acceptable for now
}
```

### Recommended Thresholds (Business-Driven)

```javascript
{
  branches: 55%,    // +10% (focus on error paths)
  functions: 68%,   // Keep current (reasonable)
  lines: 70%,       // +5% (achievable)
  statements: 70%   // +5% (achievable)
}
```

### Why These Numbers?

1. **Branches at 55%**: Currently 57.63%, but many error paths untested. Setting to 55% allows fixing critical bugs without breaking builds while encouraging error path testing.

2. **Functions at 68%**: Current level is appropriate. The untested functions are mostly in non-critical areas or planned for deprecation.

3. **Lines/Statements at 70%**: Achievable with Phase 1 fixes (enabling 43 disabled tests + testing critical CLI commands).

## 🎬 Immediate Action Items (Next Sprint)

### Week 1: Enable Disabled Tests (4-6 hours)
```bash
# Fix Jest ES2020 module configuration
# This alone will add 43 integration tests!
# Expected coverage increase: +5-8%
```

### Week 2: Critical CLI Commands (20 hours)
```typescript
// Priority order:
1. migrate-to-profiles.ts     // Data loss risk
2. import-docs.ts             // User onboarding
3. init-multiproject.ts       // Enterprise feature
4. validate-plugins.ts        // Installation issues
```

### Week 3: External Sync Tests (20 hours)
```typescript
// Focus on:
1. GitHub multi-repo scenarios
2. Profile migration without data loss
3. JIRA connectivity validation
4. Rate limiting protection
```

### Week 4: E2E Critical Paths (20 hours)
```typescript
// User journeys:
1. New user: Install → Init → First increment → Sync
2. Enterprise: Multi-project setup → Team collaboration
3. Brownfield: Import docs → Classify → Integrate
4. Quality: Run QA → View risks → Make decisions
```

## 💡 Smart Testing Strategy

### Focus Areas (Not Coverage %)

1. **Test What Users Do** - User journeys over implementation details
2. **Test What Breaks Production** - External integrations, data migrations
3. **Test What Costs Money** - API rate limits, cloud resources
4. **Test What Loses Data** - Migrations, sync conflicts
5. **Test What Blocks Teams** - Multi-user workflows, permissions

### Skip Testing (For Now)

1. **Deprecated features** - Legacy adapters
2. **Pure UI formatting** - Console colors, spinners
3. **Simple getters/setters** - Unless business logic
4. **Third-party wrappers** - Unless custom logic

## 📈 Expected Outcomes

With the recommended approach:

- **Week 1-2**: Coverage jumps to ~75% (43 tests enabled + critical commands)
- **Week 3-4**: Coverage reaches ~80% (sync + E2E tests)
- **Business Impact**: 95% of critical user paths tested
- **Risk Reduction**: Data loss scenarios covered
- **Team Confidence**: Can ship without fear

## 🚫 What NOT to Do

1. **Don't chase 100% coverage** - Diminishing returns after 85%
2. **Don't test generated code** - Plugin templates, boilerplate
3. **Don't test external libraries** - Focus on integration points
4. **Don't write tests for test sake** - Each test must prevent a real bug

## ✅ Success Metrics

Not just coverage, but:
- **0 critical path failures** in production
- **<5% bug escape rate** to users
- **<2 hour MTTR** for issues (good tests = fast debugging)
- **100% of data loss scenarios** tested
- **All user-reported bugs** have regression tests

## 🎯 Final Recommendation

**Set thresholds at 55/68/70/70** but focus on:
1. **Enabling the 43 disabled tests** (quick win)
2. **Testing critical CLI commands** (high risk)
3. **E2E user journeys** (real usage)

This gives you **meaningful quality improvement** without arbitrary coverage chasing.

---

*Generated: 2025-11-11*
*Increment: 0002-core-enhancements*
*Focus: Business-critical testing over coverage metrics*