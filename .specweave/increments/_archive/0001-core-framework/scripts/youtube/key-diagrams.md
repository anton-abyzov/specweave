# SpecWeave Key Diagrams for YouTube Video

> **Version Reference**: v1.1.x (production)
> Copy these Mermaid diagrams to Excalidraw for video production.

---

## 1. THE PROBLEM (Before SpecWeave)

```mermaid
flowchart LR
    subgraph "AI Coding Today"
        User[Developer] --> Chat[AI Chat]
        Chat --> Code[Generated Code]
        Code --> Void["🕳️ Chat History<br/>(Lost Forever)"]
    end

    subgraph "6 Months Later"
        NewDev[New Developer] --> Question["Why was this<br/>built this way?"]
        Question --> NoAnswer["🤷 No one knows"]
    end

    style Void fill:#ffcccc,stroke:#cc0000
    style NoAnswer fill:#ffcccc,stroke:#cc0000
```

---

## 2. THE SOLUTION (SpecWeave Core Flow)

```mermaid
flowchart LR
    subgraph "3-Command Workflow"
        A["/sw:increment<br/>'Add OAuth'"] --> B["spec.md<br/>plan.md<br/>tasks.md"]
        B --> C["/sw:do<br/>Build It"]
        C --> D["Code +<br/>Tests +<br/>Docs"]
        D --> E["/sw:done<br/>Validate"]
        E --> F["✅ Quality<br/>Gates Pass"]
    end

    subgraph "6 Months Later"
        G[Search 'OAuth'] --> H["Found: Exact<br/>spec, decisions,<br/>who approved"]
    end

    F --> G

    style B fill:#e6ffe6,stroke:#00cc00
    style F fill:#e6ffe6,stroke:#00cc00
    style H fill:#e6ffe6,stroke:#00cc00
```

---

## 3. THREE-FILE FOUNDATION

```mermaid
flowchart TD
    Feature["Feature: OAuth Auth"] --> Files

    subgraph Files[".specweave/increments/0001-oauth/"]
        Spec["📄 spec.md<br/>──────────<br/>WHAT: User stories<br/>Acceptance criteria<br/>Requirements"]
        Plan["📄 plan.md<br/>──────────<br/>HOW: Architecture<br/>Tech decisions<br/>ADRs"]
        Tasks["📄 tasks.md<br/>──────────<br/>DO: Tasks<br/>Embedded tests<br/>60%+ coverage"]
    end

    style Spec fill:#cce5ff,stroke:#0066cc
    style Plan fill:#fff2cc,stroke:#cc9900
    style Tasks fill:#d4edda,stroke:#28a745
```

---

## 4. COMPETITOR COMPARISON

```mermaid
flowchart TD
    subgraph "BMAD"
        B1["19 Agents<br/>Manual Switching"]
        B2["Alpha v6"]
        B3["No External Sync"]
    end

    subgraph "SpecKit"
        S1["Single-Use Specs"]
        S2["Greenfield Only"]
        S3["No Lifecycle"]
    end

    subgraph "SpecWeave"
        W1["Full Lifecycle<br/>pause/resume/done"]
        W2["Production v1.1<br/>140+ self-built features"]
        W3["GitHub/JIRA/ADO<br/>Bidirectional Sync"]
        W4["Brownfield Ready<br/>10-year legacy? Fine."]
    end

    style W1 fill:#d4edda,stroke:#28a745
    style W2 fill:#d4edda,stroke:#28a745
    style W3 fill:#d4edda,stroke:#28a745
    style W4 fill:#d4edda,stroke:#28a745
```

---

## 5. EXTERNAL SYNC FLOW

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant SW as SpecWeave
    participant Ext as JIRA/GitHub/ADO

    Dev->>SW: /sw:increment "Feature"
    SW->>SW: Create spec + plan + tasks

    Dev->>SW: /sw:do
    SW->>SW: Execute tasks

    Dev->>SW: /sw:sync-progress
    SW->>Ext: Push: Create issue, sync progress
    Ext-->>SW: Confirmed

    Note over Ext: PM sees progress!

    Dev->>SW: /sw:done 0001
    SW->>Ext: Close issue, final sync
    Ext-->>SW: Issue closed
```

---

## 6. LIVING DOCS FLOW (Event-Driven)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CLI as SpecWeave
    participant Hook as EDA Hooks
    participant Docs as Living Docs
    participant Ext as External Tools

    Dev->>CLI: Mark task complete
    CLI->>Hook: PostToolUse event

    Hook->>Hook: Detect AC completion
    Hook->>Docs: Update living docs
    Hook->>Ext: Push progress

    Note over Docs,Ext: Auto-sync on events!

    Dev->>CLI: /sw:done 0001
    CLI->>Hook: increment.done event
    Hook->>Docs: Final sync
    Hook->>Ext: Close issues
```

---

## 7. WORKS EVERYWHERE

```mermaid
flowchart TD
    subgraph "Works On..."
        Legacy["🏛️ 10-Year Legacy<br/>Brownfield Analysis"]
        Startup["🚀 Weekend MVP<br/>Full spec in 60s"]
        Enterprise["🏢 50-Team Enterprise<br/>Multi-project + JIRA/ADO"]
    end

    SW["SpecWeave<br/>One Framework"] --> Legacy
    SW --> Startup
    SW --> Enterprise

    style SW fill:#6366f1,stroke:#4338ca,color:#fff
```

---

## 8. QUALITY GATES

```mermaid
flowchart LR
    Done["/sw:done 0001"] --> G1

    subgraph Gates["3 Quality Gates"]
        G1["✓ Tasks<br/>All complete?"]
        G2["✓ Tests<br/>60%+ coverage?"]
        G3["✓ Docs<br/>Living docs synced?"]
    end

    G1 --> G2 --> G3 --> Pass["✅ Ship It!"]

    G1 -.->|Fail| Block["❌ Cannot Close"]
    G2 -.->|Fail| Block
    G3 -.->|Fail| Block

    style Pass fill:#d4edda,stroke:#28a745
    style Block fill:#f8d7da,stroke:#dc3545
```

---

## 9. DOGFOODING PROOF

```mermaid
flowchart TD
    SW["SpecWeave v1.1"] --> Stats

    subgraph Stats["Built With SpecWeave"]
        S1["140+ Features<br/>All with full specs"]
        S2["100/month<br/>Deploy Frequency"]
        S3["0%<br/>Change Failure Rate"]
        S4["3.4h<br/>Lead Time"]
    end

    Stats --> Proof["🔍 Browse: github.com/anton-abyzov/specweave<br/>.specweave/increments/"]

    style Proof fill:#f0f9ff,stroke:#0284c7
```

---

## HOW TO USE IN EXCALIDRAW

1. Copy any Mermaid diagram above
2. Go to https://mermaid.live/ to render
3. Export as SVG
4. Import SVG into Excalidraw
5. Customize colors/fonts as needed

Or use the Excalidraw Mermaid plugin to paste directly.

---

## SUGGESTED VIDEO FLOW

1. **Hook (0:00-0:30)**: Show Problem diagram - "Where do your AI specs go?"
2. **Solution (0:30-2:00)**: Show Solution flow + Three-File Foundation
3. **Comparison (2:00-3:00)**: Show Competitor Comparison
4. **Demo (3:00-8:00)**: Live coding with SpecWeave
5. **External Sync (8:00-9:00)**: Show sync to JIRA/GitHub
6. **Proof (9:00-10:00)**: Show Dogfooding stats
7. **CTA (10:00-10:30)**: Install command + links
