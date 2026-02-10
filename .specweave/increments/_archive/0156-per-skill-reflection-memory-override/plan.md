# Implementation Plan: Per-Skill Reflection System

## Overview

This increment implements a comprehensive per-skill reflection system with MEMORY.md overrides, silent reflection, smart marketplace merging, LSP integration, and homepage enhancements.

## Architecture Decisions

### ADR-001: Per-Skill Memory Files vs Centralized

**Decision**: Use per-skill MEMORY.md files while maintaining centralized memory as fallback

**Rationale**:
- ✅ Skills load relevant learnings automatically (context scoped)
- ✅ Marketplace updates can preserve user learnings per-skill
- ✅ Easier to maintain and debug
- ✅ Backward compatible (centralized still works)

**Implementation**:
```
~/.claude/skills/{skill-name}/MEMORY.md (Claude Code)
.specweave/plugins/specweave/skills/{skill-name}/MEMORY.md (non-Claude)
.specweave/memory/*.md (fallback for non-skill learnings)
```

### ADR-002: Smart Merge vs Complete Override

**Decision**: Smart merge that preserves user learnings and adds new defaults

**Rationale**:
- ✅ User corrections never lost
- ✅ New marketplace patterns automatically added
- ✅ Deduplication prevents bloat
- ❌ More complex than override (acceptable trade-off)

**Algorithm**:
1. Backup existing MEMORY.md
2. Parse user learnings
3. Parse new default learnings
4. Deduplicate (content similarity >50%)
5. Merge: user + new defaults
6. Write merged result

### ADR-003: Silent Reflection vs User Confirmation

**Decision**: Silent auto-commit for HIGH confidence, queue for MEDIUM/LOW

**Rationale**:
- ✅ Seamless UX (no interruptions)
- ✅ Strong signals trusted (explicit corrections)
- ✅ Weak signals reviewed before commit
- ✅ User stays in control

**Confidence Thresholds**:
- HIGH (>80%): Auto-commit
- MEDIUM (50-80%): Queue for review
- LOW (<50%): Queue for review

### ADR-004: SpecWeave Project Detection Method

**Decision**: Check `package.json` name field for "specweave"

**Rationale**:
- ✅ Simple and reliable
- ✅ Works in all environments
- ✅ No false positives
- ✅ Clear separation of concerns

**Implementation**:
```typescript
function isSpecWeaveProject(root: string): boolean {
  const pkg = readJson(path.join(root, 'package.json'));
  return pkg.name === 'specweave';
}
```

## Components

### 1. Reflection Core

**File**: `src/core/reflection/reflection-engine.ts`

**Responsibilities**:
- Detect skill from learning context
- Calculate confidence levels
- Route learnings to skill MEMORY.md or centralized
- Handle SpecWeave project detection

**Key Functions**:
```typescript
class ReflectionEngine {
  detectSkill(content: string, context: string): string | null
  calculateConfidence(signals: Signal[]): ConfidenceLevel
  addLearning(skill: string, learning: Learning): void
  isSpecWeaveProject(): boolean
}
```

### 2. Memory Manager

**File**: `src/core/reflection/memory-manager.ts`

**Responsibilities**:
- Read/write MEMORY.md files
- Parse learning entries
- Format learning records
- Handle skill vs project detection

**Key Functions**:
```typescript
class MemoryManager {
  readMemory(skill: string): Learning[]
  writeMemory(skill: string, learnings: Learning[]): void
  addLearning(skill: string, learning: Learning): void
  getSkillMemoryPath(skill: string): string
}
```

### 3. Smart Merge System

**File**: `bin/install-skills.sh` (enhanced)

**Changes**:
```bash
# OLD (blind copy)
cp -r "$skill"/* "$SKILLS_DEST/$skill_name/"

# NEW (smart merge)
for file in "$skill"/*; do
  filename=$(basename "$file")
  if [ "$filename" = "MEMORY.md" ] && [ -f "$SKILLS_DEST/$skill_name/MEMORY.md" ]; then
    # Backup
    mkdir -p "$SKILLS_DEST/$skill_name/.memory-backups"
    cp "$SKILLS_DEST/$skill_name/MEMORY.md" \
       "$SKILLS_DEST/$skill_name/.memory-backups/MEMORY-$(date +%Y-%m-%dT%H-%M-%S).md"

    # Merge
    node scripts/merge-skill-memory.js \
      "$SKILLS_DEST/$skill_name/MEMORY.md" \
      "$file" \
      "$SKILLS_DEST/$skill_name/MEMORY.md"
  else
    cp -r "$file" "$SKILLS_DEST/$skill_name/"
  fi
done
```

**File**: `scripts/merge-skill-memory.js`

**Algorithm**:
```typescript
function mergeMemories(userPath: string, defaultsPath: string, outputPath: string): void {
  const userLearnings = parseMemory(userPath);
  const defaultLearnings = parseMemory(defaultsPath);

  const merged = [...userLearnings]; // User first (always preserved)

  for (const newLearning of defaultLearnings) {
    if (!isDuplicate(newLearning, merged)) {
      merged.push(newLearning);
    }
  }

  writeMemory(outputPath, merged);
}

function isDuplicate(learning: Learning, existing: Learning[]): boolean {
  return existing.some(e =>
    e.id === learning.id ||
    contentSimilarity(e.content, learning.content) > 0.5 ||
    triggerOverlap(e.triggers, learning.triggers) > 0.5
  );
}
```

### 4. Silent Reflection Hook

**File**: `plugins/specweave/hooks/stop-session.sh` (enhanced)

**Changes**:
```bash
# Detect reflection opportunities
CORRECTIONS=$(grep -i "no, .* instead\|never .*\|always .*" session.log | wc -l)
APPROVALS=$(grep -i "perfect\|exactly right\|yes, .*" session.log | wc -l)

if [ $CORRECTIONS -gt 0 ] || [ $APPROVALS -gt 0 ]; then
  # Calculate confidence
  CONFIDENCE=$(node plugins/specweave/lib/calculate-confidence.js session.log)

  if [ "$CONFIDENCE" = "high" ]; then
    # Auto-commit
    node plugins/specweave/lib/auto-reflect.js session.log

    # Silent notification
    jq -n '{type: "system", content: "✅ Learned from session (auto-committed)"}'
  else
    # Queue for review
    node plugins/specweave/lib/queue-learning.js session.log

    # Silent notification
    jq -n '{type: "system", content: "💡 Learning queued for review (/sw:reflect-status)"}'
  fi
fi
```

### 5. LSP Integration Examples

**File**: `docs-site/docs/guides/lsp-integration.md`

**Structure**:
```markdown
# LSP Integration Guide

## Overview
## Prerequisites
## Language-Specific Examples

### .NET (C#, F#)
- OmniSharp setup
- Roslyn integration
- Common operations

### Node.js/TypeScript
- typescript-language-server setup
- Common operations
- Error handling

### JavaScript
- typescript-language-server with allowJs
- JSDoc support

### Python
- python-lsp-server setup
- Pylance alternative
- Common operations

### Java
- Eclipse JDT Language Server
- Setup and config

### Scala
- Metals setup
- SBT integration

### Swift
- SourceKit-LSP setup
- Xcode integration

## Best Practices
## Troubleshooting
```

### 6. Enhanced Homepage

**File**: `docs-site/src/pages/index.tsx`

**Sections**:
1. Hero (value proposition)
2. Features (cards with icons)
3. Quick Start (installation)
4. Comparison (before/after)
5. Use Cases
6. Call to Action

**Design Principles**:
- Clean, modern aesthetic
- Mobile-first responsive
- Dark mode support
- Fast loading (<3s)
- Accessible (WCAG AA)

## Data Model

### Learning Record

```typescript
interface Learning {
  id: string;           // LRN-YYYYMMDD-XXXX
  timestamp: string;    // ISO 8601
  type: 'correction' | 'rule' | 'approval';
  confidence: 'high' | 'medium' | 'low';
  content: string;      // The actual learning
  context?: string;     // What triggered it
  triggers: string[];   // Keywords for matching
  source: string;       // session:YYYY-MM-DD
}
```

### MEMORY.md File Structure

```markdown
# Skill Memory: {skill-name}

> Auto-generated by SpecWeave Reflect v4.0
> Last updated: {timestamp}
> Skill: {skill-name}

## Learned Patterns

### {learning-id} ({type}, {confidence})
**Content**: {learning-content}
**Context**: {optional-context}
**Triggers**: {comma-separated-keywords}
**Added**: {date}
**Source**: {source}
```

## Testing Strategy

### Unit Tests

**File**: `tests/unit/reflection/reflection-engine.test.ts`
- Skill detection
- Confidence calculation
- Project detection

**File**: `tests/unit/reflection/memory-manager.test.ts`
- Read/write MEMORY.md
- Parse learnings
- Format records

**File**: `tests/unit/reflection/merge-memory.test.ts`
- Deduplication logic
- User learning preservation
- New defaults addition

### Integration Tests

**File**: `tests/integration/reflection/end-to-end.test.ts`
- Full reflection workflow
- Silent reflection hook
- Marketplace merge

### E2E Tests

**File**: `tests/e2e/reflection/user-journey.spec.ts`
- User teaches correction
- Reflection captures learning
- Marketplace update preserves learning
- Future sessions apply learning

## Migration Strategy

### Phase 1: Add Per-Skill Memory (Non-Breaking)

1. Create MEMORY.md template for each skill
2. Update reflection engine to support per-skill
3. Keep centralized memory working
4. No user action required

### Phase 2: Smart Merge (Non-Breaking)

1. Update `bin/install-skills.sh`
2. Create merge script
3. Test with various scenarios
4. No user action required

### Phase 3: Silent Reflection (Opt-In)

1. Update stop hook
2. Add `/sw:reflect-on` command
3. Add `/sw:reflect-status` command
4. Users opt-in via command

### Phase 4: LSP Examples (Additive)

1. Create documentation
2. Add examples
3. No breaking changes

### Phase 5: Homepage (Standalone)

1. Update homepage components
2. Test responsive design
3. Deploy

## Rollback Plan

**If issues arise**:
1. Revert `bin/install-skills.sh` changes
2. Disable silent reflection (remove from stop hook)
3. Fall back to centralized memory only
4. All user data preserved in backups

## Performance Considerations

**Memory File Size**:
- Max 50 learnings per skill (configurable)
- Oldest learnings pruned when limit reached
- Backup before pruning

**Merge Performance**:
- O(n*m) deduplication (acceptable for n,m < 100)
- Async processing (no blocking)
- <100ms for typical merge

**LSP Integration**:
- Lazy initialization (on first use)
- Cache results (1-minute TTL)
- Timeout: 5 seconds (fallback gracefully)

## Security Considerations

**MEMORY.md Privacy**:
- No sensitive data in learnings
- No raw conversation stored
- Only patterns and corrections
- User can clear anytime

**Merge Safety**:
- Backup before merge
- Validate JSON/Markdown syntax
- Rollback on error
- No data loss risk

## Success Criteria

- [ ] All 8 user stories accepted
- [ ] All tests passing (unit, integration, E2E)
- [ ] No regressions in existing features
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Performance benchmarks met
- [ ] Security review passed
