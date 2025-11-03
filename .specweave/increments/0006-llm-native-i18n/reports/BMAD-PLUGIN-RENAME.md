# BMAD Plugin Rename Analysis

**Date**: 2025-11-02
**Issue**: Plugin name "specweave-bmad" is too specific - it's about comparing with multiple spec-driven frameworks
**Goal**: Find the perfect name for a plugin that compares SpecWeave with BMAD, spec-kit, openspec, and future frameworks

---

## 🎯 What This Plugin Actually Does

**Current Skills**:
1. **bmad-method-expert** - BMAD framework SME, does gap analysis vs SpecWeave
2. **spec-kit-expert** - spec-kit framework SME, does gap analysis vs SpecWeave

**Future Skills** (mentioned by user):
3. **openspec-expert** - openspec framework SME (to be added)
4. Potentially more spec-driven frameworks

**Core Purpose**:
- ✅ Dynamic gap analysis (SpecWeave vs other frameworks)
- ✅ Fresh comparison reports based on actual code
- ✅ Strategic recommendations ("Should I use X or SpecWeave?")
- ✅ Framework expertise ("How does X handle Y?")
- ✅ Help users evaluate/choose between frameworks

---

## 💡 Recommended Name: **specweave-comparison**

**Why This Name Wins**:

1. **✅ Clear Purpose** - Immediately understand it's about comparing frameworks
2. **✅ Concise** - Short and memorable (19 chars)
3. **✅ Accurate** - Plugin compares SpecWeave to other spec-driven frameworks
4. **✅ Future-Proof** - Can add any framework (BMAD, spec-kit, openspec, etc.)
5. **✅ Consistent** - Matches naming pattern (`specweave-{purpose}`)
6. **✅ Neutral Tone** - Not negative (unlike "competitors")
7. **✅ User-Focused** - Helps users make informed decisions

**Full Plugin Path**: `plugins/specweave-comparison/`

**Skill Naming**:
- ✅ `bmad-method-expert` (keep as-is)
- ✅ `spec-kit-expert` (keep as-is)
- ✅ `openspec-expert` (future)
- ✅ Pattern: `{framework}-expert`

---

## 🥈 Alternative Name: **specweave-alternatives**

**Why This Also Works**:

1. **✅ Shows Alternative Frameworks** - Clear that it's about other options
2. **✅ Evaluation Focus** - Helps users compare alternatives
3. **✅ Neutral Tone** - Respectful of other frameworks
4. **✅ Future-Proof** - Can add any framework

**Considerations**:
- ⚠️ "Alternatives" might imply they're better/worse than SpecWeave
- ⚠️ Less specific about what it does (comparison)

---

## ❌ Rejected Names

### specweave-competitors
- ❌ Sounds negative/combative
- ❌ Implies rivalry rather than objective comparison
- ❌ Not user-focused

### specweave-benchmarks
- ❌ Implies performance testing, not feature comparison
- ❌ Doesn't capture gap analysis aspect

### specweave-framework-comparison
- ❌ Too long (29 chars)
- ❌ Redundant ("framework" is implied)

### specweave-sdd-comparison
- ❌ "SDD" acronym not widely known
- ❌ Requires explanation (Spec-Driven Development)

### specweave-frameworks
- ❌ Unclear - could mean SpecWeave supports multiple frameworks
- ❌ Doesn't convey comparison purpose

### specweave-evaluations
- ❌ Sounds like testing/QA, not comparison
- ❌ Less clear than "comparison"

---

## 📊 Name Comparison Matrix

| Name | Clarity | Conciseness | Accuracy | Future-Proof | Tone | Overall |
|------|---------|-------------|----------|--------------|------|---------|
| **specweave-comparison** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **⭐⭐⭐⭐⭐** |
| specweave-alternatives | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **⭐⭐⭐⭐** |
| specweave-competitors | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | **⭐⭐⭐** |
| specweave-benchmarks | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | **⭐⭐** |
| specweave-framework-comparison | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **⭐⭐⭐⭐** |

---

## 🎯 Final Recommendation

### **Primary Choice: `specweave-comparison`**

**Rationale**: Perfect balance of clarity, conciseness, and accuracy. Neutral tone helps position SpecWeave as mature framework that objectively compares itself to alternatives.

### **Backup Choice: `specweave-alternatives`**

**Rationale**: If "comparison" feels too analytical, "alternatives" emphasizes user choice and evaluation.

---

## 📝 Updated Plugin Metadata

### New manifest.json (specweave-comparison)

```json
{
  "$schema": "https://spec-weave.com/schemas/plugin-manifest.json",
  "name": "specweave-comparison",
  "version": "1.0.0",
  "description": "Framework comparison experts for spec-driven development. Provides gap analysis, feature comparison, and strategic recommendations comparing SpecWeave with BMAD, spec-kit, openspec, and other spec-driven frameworks. Helps users evaluate and choose the best framework for their needs.",
  "author": "SpecWeave Team",
  "license": "MIT",
  "specweave_core_version": ">=0.6.0",

  "auto_detect": {
    "files": [
      "bmad/",
      "BMAD/",
      "spec-kit/",
      "openspec/"
    ]
  },

  "provides": {
    "skills": [
      "bmad-method-expert",
      "spec-kit-expert"
    ],
    "agents": [],
    "commands": []
  },

  "triggers": [
    "compare",
    "comparison",
    "gap analysis",
    "alternative",
    "bmad",
    "BMAD",
    "spec-kit",
    "SpecKit",
    "openspec",
    "should I use",
    "vs SpecWeave",
    "better than",
    "framework comparison"
  ]
}
```

### New plugin.json (Claude Code native)

```json
{
  "name": "specweave-comparison",
  "description": "Compare SpecWeave with BMAD, spec-kit, openspec, and other spec-driven frameworks. Get gap analysis, feature comparison, and recommendations.",
  "version": "1.0.0",
  "author": {
    "name": "SpecWeave Team"
  }
}
```

---

## 🔄 Migration Steps

### 1. Rename Directory
```bash
mv plugins/specweave-bmad plugins/specweave-comparison
```

### 2. Update Manifests
```bash
# Update both manifests with new name and description
vim plugins/specweave-comparison/.claude-plugin/manifest.json
vim plugins/specweave-comparison/.claude-plugin/plugin.json
```

### 3. Update Marketplace Catalog
```bash
# Update marketplace.json with new plugin name
vim marketplace/.claude-plugin/marketplace.json
```

### 4. Update SKILLS-INDEX.md
```bash
# Update skills index with new plugin name
vim skills/SKILLS-INDEX.md
```

### 5. Update Documentation
```bash
# Update CLAUDE.md references
vim CLAUDE.md

# Update README.md if needed
vim README.md
```

### 6. Test
```bash
# Verify skills still load
find plugins/specweave-comparison -name "SKILL.md"

# Check manifest validates
# (validation script if exists)
```

---

## 📊 Impact Analysis

### Files to Update:
1. ✅ `plugins/specweave-bmad/` → `plugins/specweave-comparison/`
2. ✅ `plugins/specweave-comparison/.claude-plugin/manifest.json`
3. ✅ `plugins/specweave-comparison/.claude-plugin/plugin.json`
4. ✅ `marketplace/.claude-plugin/marketplace.json`
5. ✅ `skills/SKILLS-INDEX.md`
6. ✅ `CLAUDE.md` (plugin reference table)
7. ⚠️ Any increment docs mentioning "bmad plugin"

### Skills Remain Unchanged:
- ✅ `bmad-method-expert/SKILL.md` (no changes needed)
- ✅ `spec-kit-expert/SKILL.md` (no changes needed)

### User Impact:
- ⚠️ Users who installed "specweave-bmad" will need to reinstall as "specweave-comparison"
- ✅ Skills and functionality remain identical
- ✅ Triggers updated to include broader comparison keywords

---

## 🎯 Conclusion

**Recommended Action**: Rename `specweave-bmad` → `specweave-comparison`

**Benefits**:
1. ✅ Accurate name reflecting actual purpose (multi-framework comparison)
2. ✅ Future-proof for adding openspec and other frameworks
3. ✅ Better triggers/keywords for user discovery
4. ✅ Professional, neutral tone
5. ✅ Clear value proposition to users

**Next Steps**:
1. Get user approval for name
2. Execute migration steps
3. Update all documentation
4. Test marketplace installation
5. Update changelog

---

**Date**: 2025-11-02
**Recommendation**: ✅ **Rename to `specweave-comparison`**
**Backup**: `specweave-alternatives` if preferred
