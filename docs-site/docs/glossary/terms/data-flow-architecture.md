---
id: data-flow-architecture
title: Data Flow Architecture
sidebar_label: Data Flow Architecture
---

# Data Flow Architecture

SpecWeave uses a **hub-and-spoke architecture** with Living Docs at the center. Data flows in **two separate one-way pipelines** (NOT bidirectional):

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWO SEPARATE ONE-WAY FLOWS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PUBLISH FLOW (Implementation → External)                    │
│     ┌──────────┐     ┌─────────────┐     ┌────────────────┐    │
│     │INCREMENT │ ──→ │ LIVING DOCS │ ──→ │ EXTERNAL TOOL  │    │
│     │ (local)  │     │   (hub)     │     │ (GitHub/JIRA)  │    │
│     └──────────┘     └─────────────┘     └────────────────┘    │
│                                                                 │
│  2. IMPORT FLOW (External → Reference Catalog)                  │
│     ┌────────────────┐     ┌─────────────┐     ┌──────────┐    │
│     │ EXTERNAL TOOL  │ ──→ │ LIVING DOCS │ ──→ │INCREMENT │    │
│     │ (GitHub/JIRA)  │     │  (catalog)  │     │ (manual) │    │
│     └────────────────┘     └─────────────┘     └──────────┘    │
│                              ↑                       ↑          │
│                        E-suffix IDs         Create manually     │
│                        (read-only)          to implement!       │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Two Flows

### 1. Publish Flow (Internal → External)

**Direction**: SpecWeave → World

When you create and work on increments in SpecWeave:

```
/sw:increment "User Auth"
     ↓
spec.md, plan.md, tasks.md  (increment)
     ↓
/sw:sync-docs update
     ↓
Living Docs (.specweave/docs/)
     ↓
/sw:sync-progress  OR  hooks
     ↓
GitHub Issue / JIRA Epic / ADO Work Item
```

**Key points**:
- You are the **source of truth** for content
- External tools receive your specs, tasks, progress
- Status from external tools flows back (split-source sync)

### 2. Import Flow (External → Reference)

**Direction**: World → SpecWeave (as reference catalog)

When you import work items from external tools:

```
GitHub Issues / JIRA Epics / ADO Work Items
     ↓
/sw:import-external
     ↓
Living Docs with E-suffix (US-001E, FS-042E)
     ↓
READ-ONLY REFERENCE (not implemented yet!)
     ↓
/sw:increment "Implement US-001E"  ← Manual!
     ↓
spec.md references the external item
```

**Key points**:
- Imported items are **read-only snapshots**
- They serve as a **catalog** of external work
- To implement, you **manually create an increment**
- NO automatic increment creation from imports

---

## Why Not True Bidirectional?

True bidirectional sync (edit in either place, changes merge) causes:

1. **Conflict hell**: Who wins when both change?
2. **Source confusion**: Which system is authoritative?
3. **Complexity explosion**: Merge algorithms for specs

SpecWeave avoids this by **separating concerns**:
- **Content** (specs, tasks): SpecWeave is source of truth
- **Status** (checkboxes, closed): External tool is source of truth

This is called [Split-Source Sync](/docs/glossary/terms/split-source-sync).

---

## Common Misconceptions

### "Import creates increments automatically"

**Wrong**. Import creates Living Docs references only.

```bash
/sw:import-external --github-only

# Creates:
# .specweave/docs/internal/specs/FS-042E/us-001e-login.md  ← Reference!
# Does NOT create:
# .specweave/increments/XXXX-login/  ← You create this manually
```

### "sync-docs is bidirectional"

**Wrong**. It has two modes at different phases:
- **Review mode**: Pull context before work (docs → you)
- **Update mode**: Push learnings after work (you → docs)

These are sequential, not simultaneous.

### "External edits sync back"

**Partially true**. Only **status** syncs back:
- ✅ Task checkboxes (completed/not)
- ✅ Issue state (open/closed)
- ✅ Labels and assignees

Content edits in GitHub do NOT sync back to SpecWeave.

---

## Flow Commands

| Flow | Command | What It Does |
|------|---------|--------------|
| Publish | `/sw:increment` | Create local increment |
| Publish | `/sw:sync-docs update` | Push to living docs |
| Publish | `/sw:sync-progress` | Push to external tools |
| Import | `/sw:import-external` | Pull from external as references |
| Import | Manual `/sw:increment` | Create increment to implement |

---

## Related

- [Living Docs](/docs/glossary/terms/living-docs) - The central hub
- [Split-Source Sync](/docs/glossary/terms/split-source-sync) - Content out, status in
- [Increments](/docs/glossary/terms/increments) - Units of work
- [/sw:import-external](/docs/commands/overview) - Import command
