# SpecWeave v2 Diagrams (v0.4.0 - Plugin Architecture)

**Version**: 2.0
**Date**: 2025-10-31
**Architecture**: Plugin-based, modular, context-efficient

---

## Overview

This folder contains 6 modular Mermaid diagrams for SpecWeave v0.4.0 with plugin architecture. Each diagram is independent and can be:
- Rendered individually as SVG
- Referenced in documentation
- Used in presentations
- Combined for comprehensive explanations

---

## Diagrams

### 1. Main Flow (`1-main-flow.mmd`)

**Description**: Complete SpecWeave lifecycle from initialization to increment completion

**Includes**:
- Greenfield vs brownfield paths
- 4-phase plugin detection (integrated)
- Decision gates (user control)
- Multi-agent planning (PM, Architect, QA, Tech Lead)
- Execution with hooks
- Quality gates
- Living docs sync

**Use for**:
- ✅ Complete workflow explanation (10 min)
- ✅ Architecture documentation
- ✅ YouTube video (section 8:00-11:00)
- ✅ Technical onboarding

**Complexity**: High (comprehensive)

---

### 2. Decision Gate (`2-decision-gate.mmd`)

**Description**: User control points during increment planning

**Shows**:
- Q1: Spec depth (high-level vs detailed)
- Q2: TDD mode (yes/no)
- Q3: Test quality (basic vs AI judge)
- Q4: Living docs sync (auto vs manual)

**Use for**:
- ✅ Show flexibility/user control (2 min)
- ✅ YouTube video (section 9:30-9:45)
- ✅ PM presentations
- ✅ Feature documentation

**Complexity**: Low (simple flow)

---

### 3. 4-Phase Plugin Detection (`3-plugin-detection-4phase.mmd`)

**Description**: Intelligent plugin detection system across 4 lifecycle phases

**Shows**:
- **Phase 1 (Init-time)**: Scan project structure, suggest plugins immediately
- **Phase 2 (Pre-spec)**: Analyze increment description, suggest before spec creation
- **Phase 3 (Pre-task)**: Scan task description, non-blocking suggestions
- **Phase 4 (Post-increment)**: Git diff analysis, suggest for next increment

**Use for**:
- ✅ Explain plugin intelligence (3 min)
- ✅ YouTube video (section 10:15-10:30)
- ✅ Architecture deep dive
- ✅ Plugin developer docs

**Complexity**: Medium (detailed phases)

---

### 4. Context Efficiency (`4-context-efficiency.mmd`)

**Description**: Before/after comparison showing 76% context reduction

**Shows**:
- **Before v0.4.0**: Monolithic (50K tokens, all skills/agents loaded)
- **After v0.4.0**: Modular (12K-17K tokens, selective plugin loading)
- **Examples**: React app, K8s project, GitHub project

**Use for**:
- ✅ Performance benefits (1 min)
- ✅ YouTube video (section 10:45-11:00)
- ✅ Marketing materials
- ✅ Sales presentations
- ✅ README.md

**Complexity**: Low (side-by-side comparison)

---

### 5. Living Docs Sync (`5-living-docs-sync.mmd`)

**Description**: Sequence diagram showing automated doc sync via hooks

**Shows**:
- Task completion → hook fires
- Automated sync (spec.md, plan.md, ADRs)
- Auto vs manual paths
- Final sync after all tasks

**Use for**:
- ✅ Explain automation advantage (2 min)
- ✅ YouTube video (section 11:00-11:15)
- ✅ Hook documentation
- ✅ Living docs concept

**Complexity**: Low (linear sequence)

---

### 6. Comparison Matrix (`6-comparison-matrix.mmd`)

**Description**: Decision tree comparing BMAD vs SpecKit vs SpecWeave

**Shows**:
- **BMAD**: Research-heavy, manual, solo architect
- **SpecKit**: Simple templates, no automation
- **SpecWeave**: Automated, plugin-based, team-focused
- Pros/cons for each
- When to use what

**Use for**:
- ✅ Positioning vs alternatives (2 min)
- ✅ YouTube video (section 24:00-24:30)
- ✅ Landing page
- ✅ README.md
- ✅ Decision-makers

**Complexity**: Low (decision tree)

---

## Usage Guide

### For YouTube Video (28 min total)

Use **all 6 diagrams** in this order:

| Timestamp | Diagram | Duration | Purpose |
|-----------|---------|----------|---------|
| 8:00-8:30 | 1. Main Flow | 30 sec | Overview |
| 9:30-9:45 | 2. Decision Gate | 15 sec | User control |
| 10:15-10:30 | 3. Plugin Detection | 15 sec | Intelligence |
| 10:45-11:00 | 4. Context Efficiency | 15 sec | Performance |
| 11:00-11:15 | 5. Living Docs Sync | 15 sec | Automation |
| 24:00-24:30 | 6. Comparison Matrix | 30 sec | Positioning |

**Total diagram time**: ~2.5 minutes

---

### For Documentation Site

Use **individual diagrams** based on page:

- **Landing page**: #6 (Comparison Matrix) - Quick decision tree
- **Architecture**: #1 (Main Flow) + #3 (Plugin Detection)
- **Features**: #2 (Decision Gate) + #5 (Living Docs)
- **Performance**: #4 (Context Efficiency)

---

### For README.md

Use **1-2 diagrams**:
- Quick intro: #6 (Comparison Matrix)
- Architecture: #4 (Context Efficiency) - shows value prop

---

### For Presentations

**Technical audience** (engineers):
- #1 (Main Flow) - Complete lifecycle
- #3 (Plugin Detection) - How it works
- #5 (Living Docs) - Automation

**Business audience** (PMs, leads):
- #4 (Context Efficiency) - ROI/performance
- #6 (Comparison Matrix) - Positioning
- #2 (Decision Gate) - Flexibility

---

## Generating SVGs

```bash
# From project root
npm run generate:diagrams

# Or manually with Mermaid CLI
npx @mermaid-js/mermaid-cli -i v2/1-main-flow.mmd -o v2/1-main-flow.svg
npx @mermaid-js/mermaid-cli -i v2/2-decision-gate.mmd -o v2/2-decision-gate.svg
# ... etc for all 6 diagrams
```

---

## File Naming Convention

**Pattern**: `{number}-{name}.mmd`

**Examples**:
- ✅ `1-main-flow.mmd` (descriptive, sortable)
- ✅ `2-decision-gate.mmd`
- ❌ `main.mmd` (not sortable)
- ❌ `flow.mmd` (ambiguous)

**Numbers**: Correspond to recommended usage order (1 = most important)

---

## Embedding in Documentation

### Markdown

```markdown
![Main Flow](./v2/1-main-flow.svg)
```

### MDX (with dark mode)

```mdx
import ThemedImage from '@theme/ThemedImage';

<ThemedImage
  alt="Main Flow"
  sources={{
    light: './v2/1-main-flow.svg',
    dark: './v2/1-main-flow-dark.svg',
  }}
/>
```

### HTML

```html
<img src="./v2/1-main-flow.svg" alt="SpecWeave Main Flow" />
```

---

## Modification Guide

### To Update a Diagram

1. **Edit source**: `vim v2/1-main-flow.mmd`
2. **Test rendering**: Use Mermaid Live Editor (https://mermaid.live/)
3. **Generate SVG**: `npm run generate:diagrams`
4. **Verify**: Open SVG in browser
5. **Commit**:
   ```bash
   git add v2/1-main-flow.mmd v2/1-main-flow.svg
   git commit -m "docs: update main flow diagram"
   ```

---

### To Add a New Diagram

1. **Create file**: `v2/7-new-diagram.mmd`
2. **Follow naming**: `{number}-{descriptive-name}.mmd`
3. **Document here**: Add section above
4. **Generate SVG**: `npm run generate:diagrams`
5. **Update parent README**: `.specweave/docs/internal/architecture/diagrams/README.md`

---

## Color Scheme

**Consistent across all diagrams**:

| Element | Color | Purpose |
|---------|-------|---------|
| Decision nodes | `#FFE4B5` (Peach) | User choices |
| Process nodes | `#B0E0E6` (Light Blue) | Automated processes |
| Hook nodes | `#98FB98` (Light Green) | Automation triggers |
| Plugin nodes | `#DDA0DD` (Plum) | Plugin-related |
| Quality nodes | `#FFB6C1` (Pink) | Quality gates |

**Why consistent**: Easier to understand across multiple diagrams

---

## Maintenance

**Update frequency**:
- Major releases (v0.5.0, v1.0.0): Review all diagrams
- Minor releases (v0.4.1, v0.4.2): Update only if architecture changes
- Bug fixes: No diagram updates needed

**Ownership**: Architecture team (diagrams-architect agent)

**Review process**:
1. Architecture changes → Update relevant diagrams
2. Generate SVGs
3. Visual QA (check rendering)
4. Update docs that reference diagrams

---

## Related Documentation

- [Main Diagrams README](../README.md) - Parent folder index
- [Diagram Legend](../DIAGRAM-LEGEND.md) - Conventions & symbols
- [SVG Generation Guide](../../delivery/guides/diagram-svg-generation.md) - Technical details
- [C4 Conventions](../../../../CLAUDE.md#c4-diagram-conventions) - Architecture standards

---

**Maintained By**: SpecWeave Architecture Team
**Last Updated**: 2025-10-31 (v0.4.0 diagram extraction)
