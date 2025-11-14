# CLAUDE.md Token Optimization Analysis

**Date**: 2025-11-13
**Current Size**: 2,981 lines (~31,726 tokens - exceeds Read tool limit!)
**Target**: <15,000 tokens (50% reduction)
**Approach**: Remove marketing, compress verbose sections, move procedural knowledge to skills

---

## Executive Summary

The CLAUDE.md file has grown too large (31K+ tokens) and contains significant marketing content, verbose explanations, and duplicate information that should live in:
1. **docs-site/** - Marketing, benefits, comparisons
2. **Skills** - Procedural knowledge, workflows, templates
3. **Compressed with links** - Keep essentials, link to full docs

**Estimated Token Savings**: 16K+ tokens (50%+ reduction)

---

## 🎯 HIGH-IMPACT REMOVALS (Marketing → docs-site/)

### 1. "Why This Matters" Sections (Save ~2K tokens)

**Remove these marketing-style benefit lists**:

| Line Range | Section | Content to Remove | Move To |
|------------|---------|-------------------|---------|
| 51-58 | Root pollution | "Complete traceability, Easy cleanup..." | `docs-site/docs/learn/file-organization.md` |
| 234-257 | Root-level .specweave/ | "Single Source of Truth, Cross-Cutting Features..." | `docs-site/docs/learn/multi-repo-setup.md` |
| 362-381 | Multi-repo benefits | "All approaches, Option 2 specific, Option 3 specific" | `docs-site/docs/integrations/multi-project-sync.md` |

**Keep**: Just the rule + 1-line reason. Link to full explanation.

**Example Replacement**:
```markdown
### Root-Level .specweave/ Folder (MANDATORY)

SpecWeave ONLY supports root-level `.specweave/` (no nesting). One central location for all specs.

**Why**: Single source of truth, cross-cutting features, simpler sync. See [Multi-Repo Setup Guide](https://spec-weave.com/docs/learn/multi-repo-setup).
```

**Token Savings**: ~2,000 tokens

---

### 2. Tool Support Section (Save ~500 tokens)

**Current** (Lines 119-124):
```markdown
## Tool Support

**CRITICAL**: SpecWeave is Claude Code-first. Other tools (Cursor, Copilot) have limited support.

**Why?** Claude Code provides native hooks, MCP protocol, plugin system, and isolated agent contexts. See [Why Claude Code?](https://spec-weave.com/docs/overview/why-claude-code) for technical details.
```

**Optimized**:
```markdown
## Tool Support

Claude Code-first (native hooks, plugins, MCP). See [Why Claude Code?](https://spec-weave.com/docs/overview/why-claude-code).
```

**Token Savings**: ~500 tokens

---

### 3. Verbose Examples (Save ~3K tokens)

**Problem**: Many sections have 50-100 line examples that could be 10-20 lines with "See full example: [link]"

| Section | Current Lines | Optimized Lines | Savings |
|---------|---------------|-----------------|---------|
| Multi-repo setup (323-360) | 38 lines | 10 lines + link | ~600 tokens |
| Enforcement code (385-421) | 37 lines | 5 lines + link | ~700 tokens |
| Plugin structure (489-500) | Multiple examples | 1 example + link | ~500 tokens |
| Test-aware planning (178-203) | Full example | Condensed + link | ~400 tokens |
| Living reports (various) | Multiple examples | Summary + link | ~800 tokens |

**Total Example Savings**: ~3,000 tokens

---

## 🗜️ COMPRESSION OPPORTUNITIES (Keep core, link to full)

### 1. Multi-Project Sync Architecture (Save ~1.5K tokens)

**Current**: Full explanation of 3-layer architecture, profiles, time ranges
**Optimized**: 5-line summary + link to comprehensive guide

```markdown
## Multi-Project Sync

Sync increments to unlimited repos (GitHub/JIRA/ADO). 3-layer: credentials → profiles → metadata. Smart project detection, rate limiting, time filtering (1W/1M/3M). See [Multi-Project Sync](https://spec-weave.com/docs/integrations/multi-project-sync).
```

**Token Savings**: ~1,500 tokens

---

### 2. Status Line Feature (Save ~1K tokens)

**Current**: Detailed architecture, performance benchmarks, multi-window scenarios
**Optimized**: Quick summary + link

```markdown
## Status Line

<1ms render, auto-updates after tasks, multi-window support, external edit detection. Shows most recent increment progress. See [Status Line Guide](https://spec-weave.com/docs/learn/status-line).
```

**Token Savings**: ~1,000 tokens

---

### 3. Translation Workflow (Save ~1.5K tokens)

**Current**: Full two-phase architecture, language detection, code preservation
**Optimized**: Quick summary + link

```markdown
## Translation Workflow

Two-phase post-generation: Phase 1 (increment files), Phase 2 (ADRs/HLDs). 9 languages, ~$0.02/increment, 100% auto. See [Translation Guide](https://spec-weave.com/docs/learn/translation).
```

**Token Savings**: ~1,500 tokens

---

### 4. Enterprise Specs Organization (Save ~2K tokens)

**Current**: Full domain-based architecture, 6 domains, rich metadata, migration scripts
**Optimized**: Brief overview + link

```markdown
## Enterprise Specs (Domain-Based)

Living docs organized by feature domain (core-framework, integrations, infrastructure, etc.). Rich metadata, auto-generated indices. See [Organization Strategy](.specweave/docs/internal/specs/ORGANIZATION-STRATEGY.md).
```

**Token Savings**: ~2,000 tokens

---

### 5. Living Completion Reports (Save ~1K tokens)

**Current**: Full explanation, example entries, workflow
**Optimized**: Core concept + link

```markdown
## Living Completion Reports

Update reports during work (not at end) for complete audit trail. Log scope changes with `/specweave:update-scope`. See [update-scope.md](plugins/specweave/commands/update-scope.md).
```

**Token Savings**: ~1,000 tokens

---

### 6. Specs Architecture: Two Locations (Save ~2K tokens)

**Current**: Very long analogy (Wikipedia vs Sticky Notes), multiple examples, comparison table
**Optimized**: Core distinction + link

```markdown
## Specs: Two Locations

1. **Living Docs** (`.specweave/docs/internal/specs/`): Permanent, feature-level, 20+ user stories
2. **Increment Specs** (`.specweave/increments/####/`): Temporary, focused, 3-5 user stories

Relationship: One living docs spec → Many increment specs. See [SPECS-ARCHITECTURE-CLARIFICATION.md](.specweave/increments/0007-smart-increment-discipline/reports/SPECS-ARCHITECTURE-CLARIFICATION.md).
```

**Token Savings**: ~2,000 tokens

---

### 7. Hooks Architecture (Save ~2K tokens)

**Current**: Full explanation of post-task-completion, pre-tool-use, living docs sync, GitHub auto-creation
**Optimized**: Core workflow + links

```markdown
## Hooks (Automated Workflows)

- **post-task-completion**: Sound notification, living docs sync, external tool sync
- **post-increment-planning**: Auto-create GitHub issue + metadata.json
- **pre-tool-use**: Immediate sound on AskUserQuestion

Configuration: `.specweave/config.json` → `hooks.*`. See [Plugin Hook Docs](plugins/specweave/hooks/README.md).
```

**Token Savings**: ~2,000 tokens

---

## 🧠 MOVE TO SKILLS (Procedural Knowledge)

Following [Claude's best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices): "Only add context Claude doesn't already have."

### 1. Plugin Creation Workflow → `plugin-creator` skill

**Current Location**: CLAUDE.md "Adding a New Plugin" section
**Problem**: Step-by-step procedural knowledge (250+ lines)
**Solution**: Move to new skill

```markdown
# plugins/specweave/skills/plugin-creator/SKILL.md

---
name: plugin-creator
description: Creates new SpecWeave plugins. Activates when contributor asks about "create plugin", "new plugin", "plugin structure", "add plugin".
---

# Plugin Creator Skill

## When I Activate

You're creating a new SpecWeave plugin or need plugin structure guidance.

## What I Know

[Move the full plugin creation workflow here]
- Directory structure
- plugin.json format (CRITICAL: repository must be string)
- Manifest validation rules
- Component organization
- Marketplace registration
- Testing locally

## Quick Start

[Step-by-step workflow with examples]

## Common Validation Errors

[Repository format, unrecognized keys, etc.]
```

**Token Savings**: ~1,000 tokens from CLAUDE.md
**Benefit**: Activates only when creating plugins (not loaded for regular work)

---

### 2. Release Workflow → `release-manager` skill

**Current Location**: CLAUDE.md "Release Process" section
**Problem**: Procedural workflow with multiple steps
**Solution**: Move to new skill

```markdown
# plugins/specweave/skills/release-manager/SKILL.md

---
name: release-manager
description: Manages SpecWeave releases and versioning. Activates for "release", "publish", "version bump", "npm publish", "github release".
---

# Release Manager Skill

## When I Activate

You're publishing a new SpecWeave version or managing releases.

## Critical Rules

1. **Manual version control** - NEVER auto-bump versions
2. **CHANGELOG first** - Always update before release
3. **GitHub Actions** - Primary release method
4. **Atomic releases** - NPM + GitHub together

## Workflow

[Full release process with automation steps]

## Emergency Manual Release

[Manual steps if GitHub Actions fails]
```

**Token Savings**: ~800 tokens from CLAUDE.md

---

### 3. Documentation Patterns → `docs-writer` skill

**Current Location**: CLAUDE.md "Internal Documentation Structure" section
**Problem**: Template knowledge for doc organization
**Solution**: Enhance existing skill or create new one

```markdown
# plugins/specweave/skills/docs-writer/SKILL.md

---
name: docs-writer
description: SpecWeave documentation patterns and organization. Activates for "write docs", "documentation", "ADR", "architecture docs", "living docs".
---

# Documentation Writer Skill

## Internal Docs Structure

[5 cross-project folders + multi-project organization]

## Document Types

[9 categories: User Story, NFR, Architecture, ADR, Operations, etc.]

## Frontmatter Templates

[Rich metadata for each doc type]

## Auto-Classification

[Domain detection keywords]
```

**Token Savings**: ~1,200 tokens from CLAUDE.md

---

### 4. Test Planning → Enhance `tdd-workflow` skill

**Current Location**: CLAUDE.md "Test-Aware Planning" section
**Problem**: Duplicates content from tdd-workflow skill
**Solution**: Keep 3-line summary in CLAUDE.md, remove details

```markdown
## Test-Aware Planning

Tests embedded in tasks.md (BDD format). AC-ID traceability (AC-US1-01). The `tdd-workflow` skill contains complete guide.
```

**Token Savings**: ~500 tokens

---

## 📊 SUMMARY OF SAVINGS

| Category | Strategy | Token Savings | Priority |
|----------|----------|---------------|----------|
| **Marketing Content** | Remove → docs-site/ | ~5,500 | P0 (High) |
| **Verbose Examples** | Condense + link | ~3,000 | P0 (High) |
| **Architecture Details** | Compress + link | ~9,000 | P1 (Medium) |
| **Procedural Knowledge** | Move to skills | ~3,500 | P1 (Medium) |
| **Duplicate Content** | Remove (already in skills) | ~1,000 | P2 (Low) |
| **Total Estimated Savings** | | **~22,000 tokens (70%)** | |

**Result**: CLAUDE.md reduces from ~31K → ~9K tokens (within Read tool limit!)

---

## 🎯 RECOMMENDED IMPLEMENTATION PLAN

### Phase 1: High-Impact Removals (P0)

**Task**: Remove marketing content and verbose examples
**Files to update**:
- CLAUDE.md (compress)
- docs-site/docs/learn/file-organization.md (new)
- docs-site/docs/learn/multi-repo-setup.md (enhance)
- docs-site/docs/integrations/multi-project-sync.md (already exists)

**Actions**:
1. Remove "Why This Matters" benefit lists → Keep 1-line + link
2. Compress multi-repo examples → 10 lines + link
3. Remove enforcement code → 5 lines + link
4. Compress test examples → Brief + link

**Token Reduction**: ~8,500 tokens

---

### Phase 2: Compression with Links (P1)

**Task**: Compress architecture sections, link to full docs
**Files to update**:
- CLAUDE.md (compress)
- Existing comprehensive guides (already exist, just link to them)

**Actions**:
1. Multi-project sync → 5 lines + link
2. Status line → 3 lines + link
3. Translation → 3 lines + link
4. Enterprise specs → 3 lines + link
5. Living reports → 3 lines + link
6. Specs architecture → 5 lines + link
7. Hooks architecture → 5 lines + link

**Token Reduction**: ~11,000 tokens

---

### Phase 3: Move to Skills (P1)

**Task**: Create new skills for procedural knowledge
**New skills to create**:
- plugins/specweave/skills/plugin-creator/SKILL.md
- plugins/specweave/skills/release-manager/SKILL.md
- plugins/specweave/skills/docs-writer/SKILL.md (or enhance existing)

**Actions**:
1. Create plugin-creator skill (move plugin creation workflow)
2. Create release-manager skill (move release process)
3. Enhance docs-writer skill (move doc patterns)
4. Update CLAUDE.md with 1-line references

**Token Reduction**: ~3,500 tokens

---

### Phase 4: Cleanup & Validation (P2)

**Task**: Remove duplicate content, validate compression
**Actions**:
1. Search for duplicate info (CLAUDE.md vs skills)
2. Ensure all links work
3. Test with Claude Code (verify skills activate correctly)
4. Measure final token count

**Token Reduction**: ~1,000 tokens

---

## 🚀 QUICK WINS (Implement First)

### 1. Tool Support Section
**Current**: 6 lines → **Optimized**: 1 line
**Change**:
```markdown
## Tool Support
Claude Code-first (native hooks, plugins, MCP). See [Why Claude Code?](https://spec-weave.com/docs/overview/why-claude-code).
```

### 2. Multi-Project Sync
**Current**: 50+ lines → **Optimized**: 5 lines
**Change**:
```markdown
## Multi-Project Sync
Sync increments to unlimited repos (GitHub/JIRA/ADO). See [Multi-Project Sync](https://spec-weave.com/docs/integrations/multi-project-sync).
```

### 3. Status Line
**Current**: 30+ lines → **Optimized**: 3 lines
**Change**:
```markdown
## Status Line
<1ms render, auto-updates, multi-window support. See [Status Line Guide](https://spec-weave.com/docs/learn/status-line).
```

### 4. Translation
**Current**: 40+ lines → **Optimized**: 3 lines
**Change**:
```markdown
## Translation Workflow
Two-phase post-generation, 9 languages, 100% auto. See [Translation Guide](https://spec-weave.com/docs/learn/translation).
```

**Total Quick Wins**: ~5,000 tokens (30 minutes of work!)

---

## 📖 SKILLS BEST PRACTICES APPLIED

Based on [Claude's best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices):

### ✅ What We're Doing Right

1. **Progressive Disclosure**: Load content only when needed (skills activate on keywords)
2. **Conciseness**: "Claude is already very smart" - remove explanations Claude knows
3. **Specificity Matching**: High freedom for concepts, low freedom for error-prone operations
4. **Avoid Time-Sensitive Info**: Architecture patterns (not dated)

### 🎯 What We Need to Fix

1. **CLAUDE.md > 500 lines**: Currently 2,981 lines (6x too large!)
2. **Marketing content**: "Why This Matters" sections are promotional
3. **Verbose examples**: 50-100 line examples vs 10-line summaries
4. **Procedural knowledge in CLAUDE.md**: Should be in skills (plugin-creator, release-manager)
5. **Duplicate content**: Test-aware planning duplicates tdd-workflow skill

### 📋 Implementation Checklist

- [ ] Remove "Why This Matters" sections → Keep 1-line + link
- [ ] Compress verbose examples → 10 lines + link to full
- [ ] Create plugin-creator skill
- [ ] Create release-manager skill
- [ ] Enhance docs-writer skill
- [ ] Compress architecture sections → 3-5 lines + link
- [ ] Remove duplicate content (CLAUDE.md vs skills)
- [ ] Validate all links work
- [ ] Test skills activate correctly
- [ ] Measure final token count (target: <15K)

---

## 🎯 SUCCESS METRICS

**Before**:
- CLAUDE.md: 2,981 lines, ~31,726 tokens
- Skills: 9 skills (some with duplicate content)
- Compression: Verbose, marketing-heavy

**After** (Target):
- CLAUDE.md: <1,000 lines, <15,000 tokens (50% reduction)
- Skills: 12 skills (plugin-creator, release-manager, docs-writer added)
- Compression: Concise, link-heavy, skill-augmented

**Validation**:
- [ ] CLAUDE.md fits in single Read tool call (<25K tokens)
- [ ] Skills activate on relevant keywords
- [ ] All links resolve correctly
- [ ] No loss of critical information (just reorganized)

---

## 📚 REFERENCES

- [Claude Skills Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [SpecWeave Plugin Architecture](plugins/specweave/.claude-plugin/plugin.json)
- [Existing Skills](plugins/specweave/skills/)
- [Public Documentation](https://spec-weave.com/docs)

---

**Next Steps**: Implement Phase 1 (High-Impact Removals) for immediate 8,500 token savings!
