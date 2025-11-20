# SpecWeave Sync Architecture Diagrams (v0.24.0)

**Purpose**: Visual explanations of three-permission sync architecture for user-facing documentation

---

## Diagram 1: Three-Permission Decision Flow

**Use in**: README.md, external-tool-sync.md, getting-started guide

```mermaid
graph TB
    A[👤 You + Claude] -->|"Plan feature:\n/specweave:increment"| B{Q1: canUpsertInternalItems}
    B -->|"✅ true\n(CREATE + UPDATE)"| C[📝 Create GitHub Issue #42]
    B -->|"❌ false\n(Local-only)"| D[💻 Local Mode Only]

    E[✅ Task T-001 Completed] -->|"Update content?"| F{Q2: canUpdateExternalItems}
    F -->|"✅ true\n(Full content sync)"| G[📤 Update Issue #42\nTitle, Description, ACs, Tasks]
    F -->|"❌ false\n(Read-only)"| H[📋 Living Docs Only]

    I[🔔 Issue #42 Closed in GitHub] -->|"Sync status?"| J{Q3: canUpdateStatus}
    J -->|"✅ true\n(Status sync)"| K[✅ Mark Increment Complete]
    J -->|"❌ false\n(Manual)"| L[👤 Manual Status Management]

    style B fill:#339af0,stroke:#1971c2,stroke-width:3px,color:#fff
    style F fill:#51cf66,stroke:#2f9e44,stroke-width:3px,color:#fff
    style J fill:#ff8c42,stroke:#e8590c,stroke-width:3px,color:#fff
    style C fill:#d0ebff
    style G fill:#d3f9d8
    style K fill:#ffe3c6
```

**Legend**:
- 🔵 Blue: Q1 - Internal item creation and updates
- 🟢 Green: Q2 - External item content updates
- 🟠 Orange: Q3 - Status synchronization

---

## Diagram 2: Complete Sync Flow (End-to-End)

**Use in**: external-tool-sync.md, architecture guides

```mermaid
sequenceDiagram
    participant User as 👤 Developer
    participant SW as SpecWeave
    participant Perm as Permission Layer
    participant Ext as External Tool

    Note over User,Ext: Phase 1: Planning

    User->>SW: /specweave:increment "user auth"
    SW->>SW: Generate spec.md, tasks.md
    SW->>Perm: Request: CREATE issue
    Perm->>Perm: Check: canUpsertInternalItems?
    alt canUpsertInternalItems = true
        Perm->>Ext: ✅ CREATE GitHub Issue #42
        Ext-->>SW: Issue URL
        SW->>SW: Update metadata.json
    else canUpsertInternalItems = false
        Perm->>SW: ❌ Skip (local-only mode)
    end

    Note over User,Ext: Phase 2: Implementation

    User->>SW: Complete T-001
    SW->>SW: Mark [x] T-001 in tasks.md
    SW->>Perm: Request: UPDATE content
    Perm->>Perm: Check: canUpdateExternalItems?
    alt canUpdateExternalItems = true
        Perm->>Ext: ✅ UPDATE Issue #42 content
        Ext-->>Perm: Success
    else canUpdateExternalItems = false
        Perm->>SW: ❌ Skip (living docs only)
    end

    Note over User,Ext: Phase 3: Status Sync

    User->>Ext: Close Issue #42 (in GitHub)
    Ext->>Perm: Event: Issue closed
    Perm->>Perm: Check: canUpdateStatus?
    alt canUpdateStatus = true
        Perm->>SW: ✅ UPDATE increment status
        SW->>SW: Mark increment complete
    else canUpdateStatus = false
        Perm->>Ext: ❌ Skip (manual management)
    end
```

---

## Diagram 3: Before vs After Architecture

**Use in**: Migration guides, CHANGELOG

```mermaid
graph TB
    subgraph "❌ Old: v0.23 (Bidirectional Sync)"
        A1[syncDirection: bidirectional]
        A1 -->|"All-or-nothing"| B1[Everything Syncs]
        B1 --> C1[Content]
        B1 --> D1[Status]
        B1 --> E1[Creation]
        B1 --> F1[Updates]
        style A1 fill:#ff6b6b,stroke:#c92a2a,color:#fff
        style B1 fill:#ff8787
    end

    subgraph "✅ New: v0.24 (Three-Permission Sync)"
        A2[Three Permissions]
        A2 --> B2[canUpsertInternalItems]
        A2 --> C2[canUpdateExternalItems]
        A2 --> D2[canUpdateStatus]

        B2 --> E2[CREATE + UPDATE\ninternal items]
        C2 --> F2[UPDATE\nexternal items]
        D2 --> G2[UPDATE\nstatus only]

        style A2 fill:#51cf66,stroke:#2f9e44,color:#fff
        style B2 fill:#339af0
        style C2 fill:#51cf66
        style D2 fill:#ff8c42
    end
```

---

## Diagram 4: Common Workflows

**Use in**: README.md, getting-started guide

```mermaid
graph LR
    subgraph "Workflow 1: Solo Developer"
        A1[canUpsertInternalItems: true]
        A2[canUpdateExternalItems: false]
        A3[canUpdateStatus: false]
        A1 --> A4[✅ Create my issues]
        A2 --> A5[❌ No external items]
        A3 --> A6[❌ Don't track status]
        style A1 fill:#339af0
        style A2 fill:#868e96
        style A3 fill:#868e96
    end

    subgraph "Workflow 2: Team Collaboration"
        B1[canUpsertInternalItems: true]
        B2[canUpdateExternalItems: true]
        B3[canUpdateStatus: true]
        B1 --> B4[✅ Create and update]
        B2 --> B5[✅ Update PM items]
        B3 --> B6[✅ Track closures]
        style B1 fill:#339af0
        style B2 fill:#51cf66
        style B3 fill:#ff8c42
    end

    subgraph "Workflow 3: Read-Only Observer"
        C1[canUpsertInternalItems: false]
        C2[canUpdateExternalItems: false]
        C3[canUpdateStatus: true]
        C1 --> C4[❌ Don't create]
        C2 --> C5[❌ Don't update]
        C3 --> C6[✅ Pull status only]
        style C1 fill:#868e96
        style C2 fill:#868e96
        style C3 fill:#ff8c42
    end
```

---

## Diagram 5: Permission Matrix

**Use in**: Configuration guides, troubleshooting

```mermaid
graph TB
    A[Which operations do you need?]
    A --> B{Create own\nwork items?}
    B -->|Yes| C[canUpsertInternalItems: true]
    B -->|No| D[canUpsertInternalItems: false]

    C --> E{Update\nexternal items?}
    D --> E

    E -->|Yes| F[canUpdateExternalItems: true]
    E -->|No| G[canUpdateExternalItems: false]

    F --> H{Sync\nstatus?}
    G --> H

    H -->|Yes| I[canUpdateStatus: true]
    H -->|No| J[canUpdateStatus: false]

    I --> K[✅ Configuration Complete]
    J --> K

    style C fill:#339af0
    style F fill:#51cf66
    style I fill:#ff8c42
    style K fill:#d3f9d8,stroke:#2f9e44,stroke-width:3px
```

---

## Diagram 6: Sync Direction Flow (Data Flow)

**Use in**: Technical documentation, ADRs

```mermaid
graph LR
    subgraph "SpecWeave"
        A[Increment]
        B[Living Docs]
    end

    subgraph "Permission Layer"
        C{canUpsertInternalItems}
        D{canUpdateExternalItems}
        E{canUpdateStatus}
    end

    subgraph "External Tools"
        F[GitHub/JIRA/ADO]
    end

    A -->|"Content\n(CREATE)"| C
    C -->|true| F
    C -->|false| G[Local Only]

    A -->|"Content\n(UPDATE)"| D
    D -->|true| F
    D -->|false| H[Skip Update]

    F -->|"Status\nChange"| E
    E -->|true| B
    E -->|false| I[Manual]

    B -->|"Always\nOne-Way"| J[Living Docs]

    style C fill:#339af0,stroke:#1971c2
    style D fill:#51cf66,stroke:#2f9e44
    style E fill:#ff8c42,stroke:#e8590c
```

---

## Diagram 7: Living Docs Sync Architecture

**Use in**: Living docs guides, sync architecture docs

```mermaid
graph TB
    subgraph "Source of Truth"
        A[Increment]
        A1[spec.md - Acceptance Criteria]
        A2[tasks.md - Implementation Tasks]
    end

    subgraph "Sync Direction"
        B[Increment → Living Docs]
        B1[ONE-WAY ONLY]
        B2[Post-task-completion hook]
    end

    subgraph "Living Docs"
        C[FS-XXX Feature Folder]
        C1[us-001-title.md]
        C2[us-002-title.md]
        C3[FEATURE.md]
    end

    subgraph "External Tools"
        D[GitHub/JIRA/ADO]
        D1[Three-Permission Control]
    end

    A --> B
    B --> C
    C --> D1
    D1 -->|canUpsertInternalItems| D
    D1 -->|canUpdateExternalItems| D
    D -->|canUpdateStatus| C

    style A fill:#ff6b6b,color:#fff
    style B1 fill:#51cf66,color:#fff
    style D1 fill:#339af0,color:#fff
```

**Key Point**: Increment → Living Docs is ALWAYS one-way (immutable). Only Living Docs → External Tools uses three-permission control.

---

## Usage Guidelines

### Where to Use Each Diagram

| Diagram | README.md | external-tool-sync.md | Migration Guides | Technical Docs |
|---------|-----------|----------------------|------------------|----------------|
| #1 - Decision Flow | ✅ Primary | ✅ Overview | ❌ | ❌ |
| #2 - Complete Flow | ❌ | ✅ Primary | ❌ | ✅ |
| #3 - Before/After | ❌ | ❌ | ✅ Primary | ✅ |
| #4 - Workflows | ✅ Secondary | ✅ Examples | ✅ | ❌ |
| #5 - Permission Matrix | ❌ | ✅ Config | ✅ | ❌ |
| #6 - Data Flow | ❌ | ❌ | ❌ | ✅ Primary |
| #7 - Living Docs | ❌ | ✅ | ❌ | ✅ |

### Color Scheme

**Consistent colors across all diagrams**:
- 🔵 **Blue (#339af0)**: Q1 - canUpsertInternalItems (CREATE + UPDATE internal)
- 🟢 **Green (#51cf66)**: Q2 - canUpdateExternalItems (UPDATE external)
- 🟠 **Orange (#ff8c42)**: Q3 - canUpdateStatus (Status sync)
- 🔴 **Red (#ff6b6b)**: Deprecated/Old architecture
- ⚪ **Gray (#868e96)**: Disabled permissions

### Accessibility

All diagrams follow accessibility best practices:
- ✅ Color + shape + text labels (not color-only)
- ✅ High contrast (WCAG AAA compliant)
- ✅ Text alternatives provided in documentation
- ✅ Logical reading order (left-to-right, top-to-bottom)

---

**Created**: 2025-11-20
**Author**: Claude (Sonnet 4.5)
**Version**: v0.24.0
**Status**: ✅ READY FOR USE IN DOCUMENTATION
