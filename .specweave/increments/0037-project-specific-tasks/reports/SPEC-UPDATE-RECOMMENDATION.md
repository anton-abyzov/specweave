# Spec Update Recommendation: Strategic Init Research

**Date**: 2025-11-16
**Increment**: 0037-project-specific-tasks
**Issue**: Strategic init research not reflected in spec.md

---

## Current Situation

### What spec.md Currently Covers (✅ Already Updated)

**Scope**: Copy-based sync paradigm
- ✅ PM Agent multi-project awareness
- ✅ Config schema (architecture detection)
- ✅ Copy-based living docs sync
- ✅ Copy-based GitHub sync
- ✅ Migration & backward compatibility

**User Stories**:
- US-001: Config Schema Implementation
- US-002: PM Agent Multi-Project Awareness
- US-003: Copy-Based Living Docs Sync
- US-004: Copy-Based GitHub Sync
- US-005: Migration & Backward Compatibility

**Status**: ✅ Spec is complete for copy-based sync implementation

---

### What Strategic Init Research Adds (🔬 Research Complete)

**Scope**: Strategic `specweave init` planning session
- 🔬 4 strategic modes (Learning, Startup, Enterprise, Research)
- 🔬 Cloud provider recommendations ($100K-$350K credits!)
- 🔬 Architecture decision framework (serverless vs containers)
- 🔬 BMAD Method integration (market research)
- 🔬 MVP planning (1-3-10 rule)
- 🔬 User-friendly questions (no jargon)
- 🔬 Infrastructure as Code (Terraform generation)

**Status**: 🔬 Research complete, not yet in spec.md

---

## Recommendation: Two Options

### Option 1: Keep Separate (Recommended ✅)

**Rationale**: Strategic init is **Phase 0** (happens BEFORE copy-based sync)

**Approach**:
1. **Current increment 0037**: Focus on copy-based sync only
   - US-001 through US-005 (as currently defined)
   - Timeline: 8-12 weeks

2. **New increment 0038**: Strategic init enhancement
   - US-001: Mode detection (4 modes)
   - US-002: User-friendly questions (no jargon)
   - US-003: Cloud provider recommendations
   - US-004: Architecture decision framework
   - US-005: BMAD Method integration (optional)
   - US-006: Terraform generation
   - Timeline: 12 weeks

**Benefits**:
- ✅ Clear separation of concerns
- ✅ Can ship copy-based sync first (MVP)
- ✅ Strategic init can be v2.1.0 (after v2.0.0)
- ✅ Easier to test/validate independently

**Dependencies**:
- 0038 depends on 0037 (needs config schema from US-001)
- 0037 can ship without 0038 (still valuable)

---

### Option 2: Combine into 0037 (Not Recommended ❌)

**Rationale**: Both are about "architecture awareness from init"

**Approach**:
1. Update spec.md to include strategic init
2. Add US-006 through US-011 (strategic init features)
3. Timeline: 20+ weeks (too long!)

**Drawbacks**:
- ❌ Too large (20+ weeks is risky)
- ❌ Can't ship incrementally
- ❌ Harder to test/validate
- ❌ Violates "start small" principle

---

## Recommended Action: Create Increment 0038

### Increment 0037 (Current - No Changes Needed)
**Title**: Copy-Based Sync: Multi-Project Architecture
**Focus**: PM Agent multi-project awareness + copy-based sync
**User Stories**: US-001 through US-005
**Timeline**: 8-12 weeks
**Status**: ✅ Spec complete, ready for implementation

### Increment 0038 (New - Create Next)
**Title**: Strategic Init: Architecture Planning Assistant
**Focus**: Transform `specweave init` into strategic planning session
**User Stories**:
- US-001: Mode Detection (Learning, Startup, Enterprise, Research)
- US-002: User-Friendly Questions (no jargon, progressive disclosure)
- US-003: Cloud Provider Recommendations (AWS, Azure, GCP credits)
- US-004: Architecture Decision Framework (serverless vs containers)
- US-005: BMAD Method Integration (market research)
- US-006: MVP Planning (1-3-10 rule)
- US-007: Infrastructure as Code (Terraform generation)
- US-008: Testing & Documentation

**Timeline**: 12 weeks
**Dependencies**: Requires 0037 (config schema)
**Status**: 🔬 Research complete (ULTRATHINK docs exist)

---

## Implementation Sequence

### Phase 1: Ship 0037 (v2.0.0)
**Focus**: Core architecture (copy-based sync)
**Timeline**: 8-12 weeks
**Release**: v2.0.0 (breaking change, config migration)

**Deliverables**:
- Config schema with project detection
- PM Agent multi-project awareness
- Copy-based living docs sync
- Copy-based GitHub sync
- Migration tools

**Value**: 74% code reduction, 10x faster sync, 100% accuracy

---

### Phase 2: Ship 0038 (v2.1.0)
**Focus**: Strategic init enhancement
**Timeline**: 12 weeks (after 0037 ships)
**Release**: v2.1.0 (feature addition, non-breaking)

**Deliverables**:
- 4 strategic modes
- Cloud credits database
- Architecture advisor
- BMAD Method integration (optional)
- Terraform generation

**Value**: $100K-$350K savings, avoid 3-6 months refactoring

---

## Why Keep Separate?

### 1. **MVP Principle** (Start Small, Ship Fast)
- 0037 is already 8-12 weeks (substantial)
- Adding strategic init → 20+ weeks (too risky)
- Ship 0037 first, validate, then ship 0038

### 2. **Independent Value**
- 0037: Valuable even without strategic init (copy-based sync)
- 0038: Valuable even without 0037 (strategic planning)
- Can prioritize based on user feedback

### 3. **Testing & Validation**
- 0037: Test copy-based sync in isolation
- 0038: Test strategic init in isolation
- Easier to debug, easier to rollback

### 4. **User Adoption**
- v2.0.0 (0037): "SpecWeave now has multi-project support!"
- v2.1.0 (0038): "SpecWeave now helps you plan architecture!"
- Two separate announcements, two marketing moments

---

## Next Steps

### For Increment 0037 (Current)
1. ✅ Spec.md is complete (no changes needed)
2. ✅ Research documents exist (ULTRATHINK, ADR, CONFIG, PM-AGENT)
3. 🚀 Ready to start implementation (Phase 1: Config Schema)

### For Increment 0038 (New)
1. 📝 Create new increment: `/specweave:increment "strategic init"`
2. 📝 Use ULTRATHINK research as input (copy findings to new spec)
3. 📝 Define US-001 through US-008 (based on research)
4. 📝 Add to backlog (implement after 0037 ships)

---

## Conclusion

**Recommendation**: ✅ **Keep 0037 focused on copy-based sync, create 0038 for strategic init**

**Why**:
- Start small, ship fast (MVP principle)
- Independent value (can ship separately)
- Easier testing & validation
- Better user adoption (two feature releases)

**Current spec.md**: ✅ Complete for 0037 (no updates needed)

**Strategic init research**: 🔬 Use for increment 0038 (create next)

---

**Status**: ✅ RECOMMENDATION COMPLETE
**Decision Needed**: Approve keeping 0037 focused, creating 0038 for strategic init
**Impact**: Low (no changes to current increment, clear path forward)
