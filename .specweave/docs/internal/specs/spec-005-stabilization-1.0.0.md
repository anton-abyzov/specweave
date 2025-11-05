# SPEC-005: Stabilization & 1.0.0 Release

**Feature Area**: Bug Fixes, Polish, User Feedback
**Status**: Planned (0% complete)
**GitHub Project**: [Create project for 1.0.0 milestone](https://github.com/anton-abyzov/specweave/projects/new)
**Priority**: P0 (Critical for launch)
**Timeline**: Week of 2025-11-04 to 2025-11-08

---

## Overview

Stabilization phase for SpecWeave 1.0.0 release:
- Run 1.0.0-rc in production on real projects
- Gather user feedback from early adopters
- Fix critical bugs and edge cases
- Polish UX and error messages
- Prepare for public launch

This is the **final gate** before official 1.0.0 release.

---

## Increments (Planned)

| Increment | Status | Timeline | Focus |
|-----------|--------|----------|-------|
| **0011-e2e-testing-infrastructure** | 🔜 Planned | Nov 4 | Automated E2E tests, smoke tests, CI setup |
| **0012-critical-bug-fixes** | 🔜 Planned | Nov 5 | P0 bugs discovered during testing |
| **0013-ux-polish** | 🔜 Planned | Nov 6 | Error messages, prompts, help text |
| **0014-feedback-integration** | 🔜 Planned | Nov 6-7 | User feedback from early adopters |
| **0015-release-preparation** | 🔜 Planned | Nov 7-8 | Final checks, release notes, publish |

**Overall Progress**: 0/5 increments complete (0%)

**Rationale for Testing-First**: E2E tests MUST be in place BEFORE bug fixes to:
- Validate that fixes actually work
- Prevent regressions during UX polish
- Give confidence for 1.0.0 launch
- Enable automated testing in CI/CD

---

## User Stories & Acceptance Criteria

### Epic 1: E2E Testing Infrastructure (0011)

**US-001**: As a developer, I want automated smoke tests so that critical paths are always validated
- [ ] **AC-001-01**: Test `npm install -g specweave` works (fresh install)
- [ ] **AC-001-02**: Test `specweave init` creates `.specweave/` structure correctly
- [ ] **AC-001-03**: Test plugin loading works (core plugin auto-loads)
- [ ] **AC-001-04**: Test hooks execute (post-task-completion.sh fires)
- [ ] **AC-001-05**: Test runs in <2 minutes (fast feedback)

**US-002**: As a developer, I want E2E CLI tests so that commands work end-to-end
- [ ] **AC-002-01**: Test `/specweave:increment` creates increment folder + spec.md
- [ ] **AC-002-02**: Test `/specweave:do` executes tasks
- [ ] **AC-002-03**: Test `/specweave:done` closes increment
- [ ] **AC-002-04**: Test `/specweave:sync-docs` syncs living docs
- [ ] **AC-002-05**: Test commands work from both CLI and slash commands

**US-003**: As a developer, I want cross-platform tests so that Windows/Mac/Linux all work
- [ ] **AC-003-01**: Test suite runs on Ubuntu 24.04 (CI)
- [ ] **AC-003-02**: Test suite runs on macOS 15 (local)
- [ ] **AC-003-03**: Test suite runs on Windows 11 (local or CI)
- [ ] **AC-003-04**: Hooks work on all platforms (bash + PowerShell)

**US-004**: As a developer, I want integration tests for external services
- [ ] **AC-004-01**: Test GitHub sync works (issue creation, checkbox updates)
- [ ] **AC-004-02**: Test living docs sync works (spec → .specweave/docs/)
- [ ] **AC-004-03**: Test translation works (Russian → English)
- [ ] **AC-004-04**: Mock external APIs (don't hit real GitHub in CI)

**US-005**: As a developer, I want CI/CD integration so that tests run automatically
- [ ] **AC-005-01**: GitHub Actions workflow runs tests on every PR
- [ ] **AC-005-02**: Tests run on push to main branch
- [ ] **AC-005-03**: Test failures block merge
- [ ] **AC-005-04**: Test results posted to PR as comment

**US-006**: As a user, I want confidence that SpecWeave works so that I can use it in production
- [ ] **AC-006-01**: 100% of smoke tests pass before launch
- [ ] **AC-006-02**: 95%+ of E2E tests pass before launch
- [ ] **AC-006-03**: All critical paths tested (install → init → increment → done)
- [ ] **AC-006-04**: No regressions from 0.7.0 to 1.0.0

---

### Epic 2: Critical Bug Fixes (0012)

**US-001**: As a user, I want all P0 bugs fixed so that SpecWeave is reliable
- [ ] **AC-001-01**: Living docs sync works automatically (config enabled by default)
- [ ] **AC-001-02**: Cross-platform hooks execute correctly (Windows/Mac/Linux)
- [ ] **AC-001-03**: Plugin installation works on first try (no manual steps)
- [ ] **AC-001-04**: GitHub sync checkboxes update correctly

**US-002**: As a user, I want clear error messages so that I can fix issues myself
- [ ] **AC-002-01**: All errors include: what happened, why, how to fix
- [ ] **AC-002-02**: Validation errors show exact line number and fix
- [ ] **AC-002-03**: Network errors include retry instructions

### Epic 3: UX Polish (0013)

**US-003**: As a new user, I want a smooth onboarding experience so that I can get started quickly
- [ ] **AC-003-01**: `specweave init` interactive wizard (asks for project name, language, plugins)
- [ ] **AC-003-02**: First increment creation guided (PM asks clarifying questions)
- [ ] **AC-003-03**: Success messages celebrate milestones (first increment complete!)

**US-004**: As a user, I want helpful command feedback so that I know what's happening
- [ ] **AC-004-01**: Progress indicators for long operations (plugin install, translation)
- [ ] **AC-004-02**: Spinner animations for async tasks
- [ ] **AC-004-03**: Summary at end of each command (what changed, next steps)

**US-005**: As a user, I want consistent command naming so that I can remember them
- [ ] **AC-005-01**: All commands use `/specweave:*` prefix (no shortcuts)
- [ ] **AC-005-02**: Command help text is clear and concise
- [ ] **AC-005-03**: Examples in help text work copy-paste

### Epic 4: Feedback Integration (0014)

**US-006**: As a user, I want to report bugs easily so that they get fixed
- [ ] **AC-006-01**: `/specweave:feedback` command opens GitHub issue template
- [ ] **AC-006-02**: Automatic diagnostic info included (version, OS, config)
- [ ] **AC-006-03**: Link to GitHub issues in error messages

**US-007**: As a user, I want requested features considered so that SpecWeave improves
- [ ] **AC-007-01**: Feature request template on GitHub
- [ ] **AC-007-02**: Voting system for feature priority
- [ ] **AC-007-03**: Public roadmap shows planned features

**US-008**: As an early adopter, I want to share my experience so that others can learn
- [ ] **AC-008-01**: Case study template for success stories
- [ ] **AC-008-02**: Show metrics (time saved, cost reduction, velocity improvement)
- [ ] **AC-008-03**: Testimonials section on website

### Epic 5: Release Preparation (0015)

**US-009**: As a user, I want to know what's new in 1.0.0 so that I can upgrade confidently
- [ ] **AC-009-01**: Comprehensive CHANGELOG.md with all features
- [ ] **AC-009-02**: Migration guide from 0.x to 1.0.0
- [ ] **AC-009-03**: Breaking changes clearly documented

**US-010**: As a new user, I want to see SpecWeave in action so that I can decide to use it
- [ ] **AC-010-01**: Demo video (5 min, quickstart)
- [ ] **AC-010-02**: Interactive playground (try without install)
- [ ] **AC-010-03**: Before/after comparison (manual vs SpecWeave)

**US-011**: As a developer, I want to trust SpecWeave quality so that I can use it in production
- [ ] **AC-011-01**: E2E test suite passes (100% success rate)
- [ ] **AC-011-02**: Cross-platform testing (Windows, Mac, Linux)
- [ ] **AC-011-03**: Load testing (100 concurrent users)

---

## Known Issues (To Fix)

### Critical (Must Fix for 1.0.0)

1. **Living docs sync disabled by default** ✅ FIXED
   - Issue: Config had `sync_living_docs: false`
   - Impact: Specs not syncing to permanent location
   - Fix: Enable by default in template config

2. **Spec architecture confusion**
   - Issue: 1:1 increment→spec mapping (wrong)
   - Impact: Living docs not feature-level
   - Fix: Restructure to feature-level specs ✅ IN PROGRESS

3. **GitHub sync checkbox updates**
   - Issue: Sometimes checkboxes don't update in issue description
   - Impact: Progress not visible to stakeholders
   - Fix: Improve sed pattern matching

### High (Should Fix for 1.0.0)

4. **Windows hook execution**
   - Issue: Bash hooks don't work on Windows (need PowerShell versions)
   - Impact: Windows users can't use hooks
   - Fix: Create .ps1 versions of critical hooks

5. **Plugin install reliability**
   - Issue: Sometimes requires restart after install
   - Impact: Confusing UX (why isn't my plugin working?)
   - Fix: Hot reload for plugins OR clear messaging

### Medium (Can Defer to 1.1.0)

6. **Model selection transparency**
   - Issue: Users don't know why Haiku vs Sonnet was chosen
   - Impact: Trust issues (why did it pick this model?)
   - Fix: Add explanation to output

7. **Increment reopening edge cases**
   - Issue: Conflict detection not comprehensive
   - Impact: Possible data loss if codebase changed significantly
   - Fix: Implement 0009 fully (intelligent reopen logic)

---

## Testing Plan

### Pre-Launch Testing (Nov 4-6)

1. **Dogfooding**: Use SpecWeave 1.0.0-rc to build SpecWeave itself
2. **Early Adopters**: 5-10 beta testers on real projects
3. **Cross-Platform**: Windows 11, macOS 15, Ubuntu 24.04
4. **Stress Testing**: 50 increments in one project (scalability)
5. **Edge Cases**: Non-standard setups (monorepos, nested projects)

### Launch Day Testing (Nov 8)

1. **Smoke Tests**: E2E suite (Playwright)
2. **Install Tests**: Fresh install on clean machines
3. **Monitoring**: Error tracking (Sentry or similar)
4. **Rollback Plan**: 0.7.0 as fallback if critical issues

---

## Success Metrics (1.0.0 Launch)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Critical bugs** | 0 | 2 | ⚠️ In Progress |
| **Install success rate** | 98%+ | TBD | 🔜 Testing |
| **Cross-platform parity** | 100% | 95% | ⚠️ Windows hooks |
| **User satisfaction** (NPS) | 50+ | TBD | 🔜 After launch |
| **Early adopters** | 10+ | 3 | 🔜 Recruiting |

---

## Post-Launch Plan (Week of Nov 11)

### Immediate (Week 1)

- Monitor GitHub issues (respond within 24h)
- Hot patches for critical bugs (publish as 1.0.1, 1.0.2)
- Gather feedback from early adopters
- Update docs based on common questions

### Short-Term (Weeks 2-4)

- Implement top 3 feature requests
- Improve onboarding based on feedback
- Write case studies from early adopters
- Expand testing coverage (edge cases discovered)

### Medium-Term (Months 2-3)

- Plugin ecosystem expansion (new plugins from community)
- Integration with more tools (Jira, Azure DevOps)
- Performance optimizations (faster plugin loading)
- AI improvements (better PM agent, smarter model selection)

---

## Related Documentation

- [Release Process](../delivery/release-process.md)
- [Testing Strategy](../delivery/guides/testing-strategy.md)
- [Breaking Changes](../delivery/breaking-changes-1.0.0.md)
- [Migration Guide 0.x → 1.0.0](../../public/guides/migration-1.0.0.md)

---

## GitHub Project Setup

**Suggested Structure**:

```
Project: SpecWeave 1.0.0 Stabilization
View: Board (To Do | In Progress | Done)

Columns:
- 🔜 To Do (Planned work)
- 🏗️ In Progress (Active this week)
- ✅ Done (Completed)
- 🚫 Won't Do (Deferred to 1.1.0)

Milestones:
- 1.0.0-rc (Nov 4)
- 1.0.0-beta (Nov 6)
- 1.0.0 (Nov 8)

Labels:
- bug (P0, P1, P2)
- enhancement
- ux-polish
- documentation
- testing
```

**Link to Create Project**: https://github.com/anton-abyzov/specweave/projects/new

---

**Last Updated**: 2025-11-04
**Owner**: SpecWeave Core Team
**Launch Lead**: Anton Abyzov
