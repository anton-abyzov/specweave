# Documentation Placement Analysis - Claude Code Marketplace Symlink Issue

**Date**: 2025-11-18
**Decision**: Public docs NOT needed (contributor-only issue)

---

## Analysis

### Audience Segmentation

| Audience | Affected? | Needs Documentation? |
|----------|-----------|---------------------|
| **End Users** (using SpecWeave) | ❌ No | ❌ No - They install via npm, no marketplace setup |
| **Contributors** (developing SpecWeave) | ✅ Yes | ✅ Yes - Must create symlink for local dev |
| **Plugin Developers** (extending SpecWeave) | 🟡 Maybe | 🟡 Maybe - If using similar setup |

### Issue Characteristics

| Characteristic | Assessment | Public Documentation? |
|----------------|------------|----------------------|
| **Scope** | SpecWeave contributors only | ❌ No |
| **Complexity** | Technical (symlinks, Claude Code internals) | ❌ No |
| **Frequency** | One-time setup per contributor | ❌ No |
| **Discoverability** | Pre-commit hook warns, CLAUDE.md has section | ❌ No |
| **User Impact** | None (users never see marketplace directory) | ❌ No |

---

## Decision

### ❌ Public Documentation NOT Needed

**Reasoning**:
1. **Contributor-specific**: Only affects SpecWeave developers, not users
2. **Already documented**: CLAUDE.md (contributor guide) has comprehensive section
3. **Not user-facing**: Users install via `npm install specweave`, never interact with marketplace
4. **Too technical**: Symlink vs directory distinction confuses users unnecessarily
5. **Clear discoverability**: Pre-commit hook + verification script ensure contributors are aware

### ✅ Internal Documentation Sufficient

**Locations**:
1. ✅ **CLAUDE.md** (lines 13-71): Prominent warning section for contributors
2. ✅ **ADR-0082**: Comprehensive architectural decision record
3. ✅ **Ultrathink Report**: Deep investigation and root cause analysis
4. ✅ **Fixes Applied Report**: Summary of all changes made

---

## Documentation Strategy

### For Contributors (✅ Documented)

**Primary**: `CLAUDE.md`
- Prominent warning section at top of file
- Quick fix commands
- Reference to detailed reports

**Secondary**: Internal docs
- ADR-0082: Architectural decision + alternatives analysis
- Ultrathink report: Investigation process + lessons learned
- Fixes applied: Before/after + verification results

**Tertiary**: Verification
- Pre-commit hook warns if broken
- Verification script provides clear pass/fail
- Install script shows symlink check in output

### For End Users (❌ Not Needed)

**Why not needed**:
- Users never interact with `~/.claude/plugins/marketplaces/`
- Users install SpecWeave via `npm install specweave`
- Users don't develop SpecWeave, they USE it
- Marketplace directory is a Claude Code implementation detail

**If users ask**:
- Point to CLAUDE.md for contributor setup
- Clarify this is for SpecWeave developers only
- Redirect to user guides for normal usage

### For Plugin Developers (🟡 Future Consideration)

**Scenario**: Someone develops a Claude Code plugin and encounters same issue

**Current approach**: Not documented publicly (no evidence this affects other plugins)

**Future approach**: If pattern emerges across multiple plugins:
1. Create public guide: "Developing Claude Code Plugins"
2. Include section on marketplace symlinks
3. Reference our experience (ADR-0082)

**For now**: Wait for evidence that other plugin developers need this

---

## Cross-References

### Internal (All documented ✅)

1. **CLAUDE.md** → **ADR-0082**
   - CLAUDE.md references: `.specweave/docs/internal/architecture/adr/0082-claude-code-marketplace-symlink-requirement.md`
   - ADR-0082 references: `CLAUDE.md` (lines 13-71)

2. **CLAUDE.md** → **Ultrathink Report**
   - CLAUDE.md references: `.specweave/increments/0043-spec-md-desync-fix/reports/ULTRATHINK-HOOK-EXECUTION-ERRORS-ROOT-CAUSE-ANALYSIS-2025-11-18.md`
   - Ultrathink report references: `CLAUDE.md` for setup instructions

3. **CLAUDE.md** → **Fixes Applied Report**
   - CLAUDE.md references: `.specweave/increments/0043-spec-md-desync-fix/reports/HOOK-EXECUTION-ERRORS-FIXES-APPLIED-2025-11-18.md`
   - Fixes report references: `CLAUDE.md` for enhanced warnings

4. **ADR-0082** → **Verification Script**
   - ADR-0082 references: `.specweave/increments/0043-spec-md-desync-fix/scripts/verify-dev-setup.sh`
   - Verification script referenced by: Pre-commit hook

5. **ADR-0082** → **Related ADRs**
   - ADR-0015: Hybrid Plugin System
   - ADR-0018: Plugin Validation

### Public (None needed ✅)

- No public documentation created
- No user-facing impact
- No FAQ entry needed
- No troubleshooting guide needed

---

## Verification

### Documentation Completeness

- [x] CLAUDE.md has prominent warning (lines 13-71)
- [x] ADR-0082 created with full analysis
- [x] Ultrathink report documents investigation
- [x] Fixes applied report summarizes changes
- [x] All docs cross-reference each other
- [x] Verification script provides clear guidance
- [x] Pre-commit hook warns on broken setup

### Audience Coverage

- [x] **Contributors**: CLAUDE.md + ADR + reports + scripts
- [x] **End Users**: No documentation (not affected)
- [x] **Plugin Developers**: Wait for evidence of need

---

## Future Review Triggers

**Review public documentation decision if**:
1. ✅ Multiple external plugin developers report same issue
2. ✅ Claude Code changes marketplace behavior
3. ✅ We create a "Plugin Development Guide" for public consumption
4. ✅ Users mistakenly think they need symlinks (indicates confusion)

**Current status**: No review needed (no evidence of broader impact)

---

## Conclusion

### Summary

| Documentation Type | Status | Reasoning |
|-------------------|--------|-----------|
| **CLAUDE.md** | ✅ Complete | Contributor-facing, prominent warning |
| **Internal ADR** | ✅ Complete | Architectural record for long-term reference |
| **Ultrathink Report** | ✅ Complete | Deep investigation for understanding |
| **Fixes Applied Report** | ✅ Complete | Implementation record |
| **Public Docs** | ❌ Not Needed | User-facing, no impact on users |
| **FAQ Entry** | ❌ Not Needed | Users don't encounter this issue |

### Key Takeaway

> **This is a contributor-only issue, fully documented in contributor-facing docs (CLAUDE.md + internal architecture). Public documentation is NOT needed because users are NOT affected.**

---

**Decision Made**: 2025-11-18
**Rationale**: Contributor-specific, already comprehensively documented internally
**Review Date**: None (unless future review triggers occur)
