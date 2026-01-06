---
increment: 0156-per-skill-reflection-memory-override
title: "Per-Skill Reflection with MEMORY.md Override System"
priority: P1
status: completed
created: 2026-01-06
dependencies: []
structure: user-stories
tech_stack:
  detected_from: "package.json"
  language: "typescript"
  framework: "node.js"
  database: "filesystem"
  orm: "none"
platform: "cli"
estimated_cost: "$0/month"
---

# Per-Skill Reflection with MEMORY.md Override System

## Problem Statement

SpecWeave's reflection system currently uses centralized memory files (`.specweave/memory/*.md`), but this has limitations:

1. **No Skill-Specific Memory**: All skills share generic memory categories
2. **Marketplace Updates Overwrite**: User learnings lost when refreshing marketplace
3. **Silent Reflection Missing**: Manual `/sw:reflect` required, no auto-learning
4. **No Confidence Levels**: Can't distinguish strong corrections from weak observations
5. **LSP Not Integrated**: Skills don't leverage Claude Code's LSP capabilities
6. **Homepage Needs Polish**: Docusaurus homepage not optimized for promotion

## Solution

Implement comprehensive per-skill reflection system with:
1. Per-skill MEMORY.md files with marketplace update preservation
2. Silent reflection workflow with HIGH/MEDIUM/LOW confidence levels
3. Smart merge system that preserves user learnings during updates
4. LSP integration examples for multiple languages
5. Enhanced Docusaurus homepage design

## User Stories

### US-001: Per-Skill MEMORY.md Architecture
**Project**: specweave
**As a** SpecWeave contributor working on skill improvements
**I want** each skill to have its own MEMORY.md file
**So that** learnings are stored with the skill they apply to

**Acceptance Criteria**:
- [x] **AC-US1-01**: Each skill has `MEMORY.md` in its directory (e.g., `skills/pm/MEMORY.md`)
- [x] **AC-US1-02**: MEMORY.md format matches reflect skill documentation (LRN-YYYYMMDD-XXXX IDs)
- [x] **AC-US1-03**: Reflection system detects skill from learning context
- [x] **AC-US1-04**: Skills load their MEMORY.md on activation
- [x] **AC-US1-05**: Centralized memory (`.specweave/memory/*.md`) still supported as fallback

### US-002: SpecWeave Project Detection
**Project**: specweave
**As a** SpecWeave contributor
**I want** reflection to detect when running in SpecWeave project itself
**So that** learnings update SKILL.md directly (not MEMORY.md)

**Acceptance Criteria**:
- [x] **AC-US2-01**: Detect SpecWeave project by checking `package.json` name field
- [x] **AC-US2-02**: When in SpecWeave project, update `SKILL.md` with learnings
- [x] **AC-US2-03**: When in user project, update `MEMORY.md` with learnings
- [x] **AC-US2-04**: Clear logging shows which mode is active

### US-003: Smart Marketplace Merge System
**Project**: specweave
**As a** SpecWeave user
**I want** my learnings preserved when updating marketplace
**So that** I don't lose corrections and patterns I've taught

**Acceptance Criteria**:
- [x] **AC-US3-01**: `bin/install-skills.sh` detects existing MEMORY.md files
- [x] **AC-US3-02**: Backup created before merge (`.memory-backups/MEMORY-YYYY-MM-DD.md`)
- [x] **AC-US3-03**: User learnings merged with new defaults (deduplicated)
- [x] **AC-US3-04**: Merge script removes duplicate learnings (>50% content overlap)
- [x] **AC-US3-05**: Merge preserves user learning timestamps and sources

### US-004: Silent Reflection Workflow
**Project**: specweave
**As a** SpecWeave user
**I want** reflection to happen automatically with no prompts
**So that** learning is seamless and non-intrusive

**Acceptance Criteria**:
- [x] **AC-US4-01**: Stop hook detects reflection opportunities (corrections, approvals)
- [x] **AC-US4-02**: Confidence levels calculated: HIGH (>80%), MEDIUM (50-80%), LOW (<50%)
- [x] **AC-US4-03**: HIGH confidence learnings auto-commit to MEMORY.md
- [x] **AC-US4-04**: MEDIUM/LOW learnings queued for user review
- [x] **AC-US4-05**: Silent notification via jq system message (no interruption)
- [x] **AC-US4-06**: `/sw:reflect-status` shows pending and committed learnings

### US-005: Confidence-Based Detection
**Project**: specweave
**As a** SpecWeave user
**I want** reflection to detect confidence levels automatically
**So that** strong corrections are learned immediately

**Acceptance Criteria**:
- [x] **AC-US5-01**: HIGH confidence: Explicit corrections ("No, use X", "Never do Y")
- [x] **AC-US5-02**: HIGH confidence: Explicit rules ("Always do X")
- [x] **AC-US5-03**: MEDIUM confidence: Approvals ("Perfect!", "That's right")
- [x] **AC-US5-04**: LOW confidence: Observations (patterns that worked)
- [x] **AC-US5-05**: Confidence calculation based on keyword matching

### US-006: LSP Integration Examples for Skills
**Project**: specweave
**As a** SpecWeave skill developer
**I want** clear LSP integration examples
**So that** skills can leverage semantic code understanding

**Acceptance Criteria**:
- [x] **AC-US6-01**: Examples for .NET (OmniSharp, Roslyn)
- [x] **AC-US6-02**: Examples for Node.js/TypeScript (typescript-language-server)
- [x] **AC-US6-03**: Examples for JavaScript (typescript-language-server with allowJs)
- [x] **AC-US6-04**: Examples for Python (python-lsp-server, Pylance)
- [x] **AC-US6-05**: Examples for Java (jdtls)
- [x] **AC-US6-06**: Examples for Scala (metals)
- [x] **AC-US6-07**: Examples for Swift (sourcekit-lsp)
- [x] **AC-US6-08**: Each example shows: setup, common operations, error handling

### US-007: Enhanced Docusaurus Homepage
**Project**: specweave
**As a** SpecWeave user discovering the project
**I want** an engaging and informative homepage
**So that** I understand value proposition immediately

**Acceptance Criteria**:
- [x] **AC-US7-01**: Hero section with clear value proposition
- [x] **AC-US7-02**: Feature cards with icons and descriptions
- [x] **AC-US7-03**: Quick start section with installation commands
- [x] **AC-US7-04**: Comparison with traditional workflows
- [x] **AC-US7-05**: Testimonial or use case section
- [x] **AC-US7-06**: Call-to-action buttons (Get Started, GitHub)
- [x] **AC-US7-07**: Responsive design (mobile, tablet, desktop)
- [x] **AC-US7-08**: Dark mode support

## Technical Notes

### Per-Skill Memory Paths

**Claude Code Environment**:
```
~/.claude/plugins/marketplaces/specweave/plugins/specweave/skills/
├── pm/
│   ├── SKILL.md
│   └── MEMORY.md              # User learnings for PM skill
├── architect/
│   ├── SKILL.md
│   └── MEMORY.md              # User learnings for Architect skill
└── ...
```

**Non-Claude Environment**:
```
.specweave/plugins/specweave/skills/
├── pm/
│   ├── SKILL.md
│   └── MEMORY.md
└── ...
```

### MEMORY.md Format

```markdown
# Skill Memory: pm

> Auto-generated by SpecWeave Reflect v4.0
> Last updated: 2026-01-06T10:30:00Z
> Skill: pm

## Learned Patterns

### LRN-20260106-A1B2 (correction, high)
**Content**: Always use shadcn Button component from design system
**Context**: User corrected button component usage
**Triggers**: button, component, ui, design system
**Added**: 2026-01-06
**Source**: session:2026-01-06
```

### Smart Merge Algorithm

```typescript
interface Learning {
  id: string;           // LRN-YYYYMMDD-XXXX
  timestamp: string;    // ISO 8601
  type: 'correction' | 'rule' | 'approval';
  confidence: 'high' | 'medium' | 'low';
  content: string;
  context?: string;
  triggers: string[];
  source: string;
}

function mergeMemories(userMemory: Learning[], newDefaults: Learning[]): Learning[] {
  // 1. Start with user learnings (always preserved)
  const merged = [...userMemory];

  // 2. Add new defaults if not duplicate
  for (const newLearning of newDefaults) {
    if (!isDuplicate(newLearning, merged)) {
      merged.push(newLearning);
    }
  }

  return merged;
}

function isDuplicate(learning: Learning, existing: Learning[]): boolean {
  return existing.some(e =>
    e.id === learning.id ||
    contentSimilarity(e.content, learning.content) > 0.5 ||
    triggerOverlap(e.triggers, learning.triggers) > 0.5
  );
}
```

### Confidence Level Detection

**HIGH (>80%)**:
- Pattern: `"No, .* instead"`
- Pattern: `"Never .*"`
- Pattern: `"Always .*"`
- Pattern: `"Don't .*, use .*"`

**MEDIUM (50-80%)**:
- Pattern: `"Perfect!"`
- Pattern: `"That's exactly right"`
- Pattern: `"Yes, .*"`

**LOW (<50%)**:
- Observation of successful pattern
- No explicit feedback

### LSP Integration Patterns

**Common LSP Operations**:
```typescript
// TypeScript/JavaScript
lsp.findReferences('src/utils/helper.ts', { line: 42, character: 10 })
lsp.goToDefinition('Button', 'src/components/ui/button.tsx')
lsp.getDiagnostics('src/App.tsx')

// Python
lsp.documentSymbol('src/main.py')
lsp.hover('function_name', { line: 15, character: 5 })

// Java
lsp.codeAction('src/Main.java', 'unused_import')
```

## Success Metrics

- [ ] Per-skill MEMORY.md working in all environments
- [ ] Marketplace updates preserve 100% of user learnings
- [ ] Silent reflection auto-commits HIGH confidence learnings
- [ ] LSP examples working for all 7 languages
- [ ] Homepage bounce rate < 40%
- [ ] All existing tests pass
- [ ] No new security vulnerabilities

## Out of Scope

- Embedding-based similarity (using simple text matching)
- Multi-language memory support (English only)
- Real-time reflection during sessions (stop hook only)
- Visual MEMORY.md editor UI
- Cross-skill learning sharing
