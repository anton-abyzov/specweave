# ADR Consolidation Plan

**Generated**: 2025-11-26
**Status**: Pending Review
**Purpose**: Consolidate duplicate/overlapping ADRs into canonical documents

---

## Executive Summary

Found **6 topic clusters** with multiple ADRs covering the same subject.
Total duplicate ADRs to consolidate: **~18 files**

---

## Consolidation Plan by Topic

### 1. Smart Pagination (3 → 1)

**Current Files**:
| ADR | Title | Keep? |
|-----|-------|-------|
| 0052 | CLI-First Defaults and Smart Pagination | **SPLIT** |
| 0180 | Smart Pagination 50-Project Limit | MERGE |
| 0181 | Smart Pagination | DELETE |

**Action**:
1. Create `0052-smart-pagination.md` with content from 0180/0181
2. Mark 0180, 0181 as `Superseded by ADR-0052`
3. Split CLI-first content to dedicated ADR (see below)

**Canonical ADR**: `0052-smart-pagination.md`

---

### 2. CLI-First Defaults (3 → 1)

**Current Files**:
| ADR | Title | Keep? |
|-----|-------|-------|
| 0052 | CLI-First Defaults and Smart Pagination | SPLIT |
| 0053 | CLI-First Defaults Philosophy | **CANONICAL** |
| 0182 | CLI-First Defaults | DELETE |

**Action**:
1. Keep `0053-cli-first-defaults-philosophy.md` as canonical
2. Merge relevant content from 0052, 0182 into 0053
3. Mark 0182 as `Superseded by ADR-0053`
4. Update 0052 to only contain smart pagination

**Canonical ADR**: `0053-cli-first-defaults-philosophy.md`

---

### 3. Progress Tracking (4 → 2)

**Current Files**:
| ADR | Title | Keep? |
|-----|-------|-------|
| 0055 | Progress Tracking with Cancelation | **CANONICAL** |
| 0058 | Progress Tracking Implementation | KEEP (implementation details) |
| 0183 | Progress Tracking and Cancelation | DELETE |
| 0184 | Progress Tracking | DELETE |

**Action**:
1. Keep `0055-progress-tracking-cancelation.md` as high-level decision
2. Keep `0058-progress-tracking-implementation.md` as implementation guide
3. Mark 0183, 0184 as `Superseded by ADR-0055`

**Canonical ADRs**: `0055` (decision) + `0058` (implementation)

---

### 4. Phase Detection (3 → 1)

**Current Files**:
| ADR | Title | Keep? |
|-----|-------|-------|
| 0013 | Phase Detection | **CANONICAL** |
| 0044 | Phase Detection Enhancement | MERGE |
| 0147 | Phase Detection Algorithm | MERGE |

**Action**:
1. Keep `0013-phase-detection.md` as canonical
2. Add enhancement content from 0044 as "Updates" section
3. Add algorithm details from 0147 as "Implementation" section
4. Mark 0044, 0147 as `Superseded by ADR-0013`

**Canonical ADR**: `0013-phase-detection.md`

---

### 5. Cost Tracking (3 → 1)

**Current Files**:
| ADR | Title | Keep? |
|-----|-------|-------|
| 0012 | Cost Tracking | **CANONICAL** |
| 0041 | Cost Estimation Algorithm | MERGE |
| 0146 | Cost Tracking System | DELETE |

**Action**:
1. Keep `0012-cost-tracking.md` as canonical
2. Add algorithm details from 0041 as subsection
3. Mark 0041, 0146 as `Superseded by ADR-0012`

**Canonical ADR**: `0012-cost-tracking.md`

---

### 6. Model Selection (3 → 1)

**Current Files**:
| ADR | Title | Keep? |
|-----|-------|-------|
| 0003 | Intelligent Model Selection | **CANONICAL** |
| 0011 | Intelligent Model Selection | Already SUPERSEDED |
| 0151 | Reflection Model Selection | MERGE (different aspect) |

**Action**:
1. Keep `0003-intelligent-model-selection.md` as canonical
2. 0011 is already marked superseded - verify it links to 0003
3. Evaluate if 0151 (reflection) is distinct enough to keep separate

**Canonical ADR**: `0003-intelligent-model-selection.md`

---

## Superseded File Template

When marking a file as superseded, replace content with:

```markdown
# ADR-{NUMBER}: {Original Title}

---
**⚠️ SUPERSEDED**: This ADR has been superseded.

**See instead**: [ADR-{CANONICAL}: {Title}](./{canonical-file}.md)

**Date Superseded**: 2025-11-26
**Reason**: Consolidated with related ADRs to reduce duplication.
---

## Original Content (Archived)

{Keep original content below for historical reference}
```

---

## Execution Script

```bash
#!/bin/bash
# Mark ADRs as superseded

mark_superseded() {
    local file="$1"
    local canonical="$2"
    local canonical_title=$3

    echo "Marking $file as superseded by $canonical..."

    # Backup
    cp "$file" "$file.pre-consolidation"

    # Get original content
    original="$(cat" "$file")

    # Create superseded header
    cat > "$file" << EOF
# $(head -1 "$file" | sed 's/^# //')

---
**⚠️ SUPERSEDED**: This ADR has been superseded.

**See instead**: [ADR-$canonical: $canonical_title](./$canonical)

**Date Superseded**: $(date +%Y-%m-%d)
**Reason**: Consolidated with related ADRs to reduce duplication.
---

## Original Content (Archived)

$original
EOF

    echo "Done!"
}

# Example usage:
# mark_superseded "0181-smart-pagination.md" "0052-smart-pagination.md" "Smart Pagination"
```

---

## Post-Consolidation Checklist

After consolidating:

- [ ] All superseded ADRs link to canonical version
- [ ] Canonical ADRs have comprehensive content
- [ ] No broken cross-references
- [ ] README.md in adr/ folder updated
- [ ] Run `./scripts/docs-audit-and-fix.sh audit` - should show 0 duplicates

---

## Impact Analysis

| Metric | Before | After |
|--------|--------|-------|
| Total ADRs | 134 | ~120 |
| Duplicate Topics | 6 clusters | 0 |
| Superseded ADRs | ~5 | ~18 |
| Active ADRs | ~129 | ~102 |

**Benefits**:
- Clearer navigation for wiki users
- Single source of truth per topic
- Easier maintenance
- Reduced confusion
