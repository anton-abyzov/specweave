# Diagram Conventions - Mermaid Diagrams-as-Code

**Default**: Use **Mermaid diagrams-as-code** for all architecture diagrams, flowcharts, sequence diagrams, and entity relationships.

---

## C4 Model Mapping

**SpecWeave adopts the C4 model** for architecture diagrams to provide consistent abstraction levels from system context to code.

### C4 Levels in SpecWeave

| C4 Level | SpecWeave Doc Type | Location | Diagram Types | Audience |
|----------|-------------------|----------|---------------|----------|
| **Level 1: Context** | HLD | `docs/internal/architecture/hld-{system}.md` | Context diagrams (`context.mmd`) | All stakeholders, non-technical |
| **Level 2: Container** | HLD | `docs/internal/architecture/hld-{system}.md` | Component diagrams (`component.mmd`) | Technical stakeholders, architects |
| **Level 3: Component** | LLD | `docs/internal/architecture/lld-{service}.md` | Component diagrams (`c4-component.mmd`) | Developers, tech leads |
| **Level 4: Code** | Source code | `src/` with inline docs | Class diagrams (optional) | Developers only |

### When to Use Each Level

**C4 Level 1 - Context Diagram** (HLD):
- **Purpose**: Show the system in its environment
- **Shows**: System boundary, external users, external systems
- **Omits**: Internal implementation details
- **Example**: User → Web App → External Payment Gateway

**C4 Level 2 - Container Diagram** (HLD):
- **Purpose**: Show high-level technology choices
- **Shows**: Applications, services, databases, message queues
- **Omits**: Internal code structure
- **Example**: Web App → API Gateway → Auth Service → PostgreSQL

**C4 Level 3 - Component Diagram** (LLD):
- **Purpose**: Show internal structure of a container
- **Shows**: Controllers, services, repositories, classes
- **Omits**: Method-level details
- **Example**: Auth Controller → Auth Service → User Repository → Database

**C4 Level 4 - Code** (Source):
- **Purpose**: Show implementation details
- **Shows**: Classes, methods, interfaces
- **Usually**: Generated from code or inline docs
- **Example**: UML class diagrams, sequence diagrams at method level

---

## Where to Keep Diagrams

### 1) Co-locate per page (PREFERRED ✅)

**Keep each diagram next to the Markdown page that explains it.**

**Benefits**:
- One glance shows the page + its sources + rendered assets
- Easy PR reviews (all changes in one place)
- Maintenance trivial (no hunting for diagrams)
- Clear ownership

**Example Structure**:
```
/docs
  /internal
    /architecture
      hld-system-overview.md
      hld-system-overview.context.mmd         # Mermaid source
      hld-system-overview.context.svg         # Rendered (for social previews)
      hld-system-overview.sequence-auth.mmd   # Another diagram
      hld-system-overview.sequence-auth.svg
      /adr
        0007-event-streaming.md
        0007-event-streaming.context.mmd
        0007-event-streaming.context.svg
  /public
    /architecture
      overview.md
      overview.sanitized-context.mmd          # Sanitized for public
      overview.sanitized-context.svg
```

**Why**: One glance shows the page + its sources + rendered assets. Easy PR reviews.

### 2) Library for shared diagrams (OPTIONAL)

**If multiple pages reuse the same diagram**, add a tiny library:

```
/docs/_shared/diagrams/
  context-highlevel.mmd
  data-flow-ingestion.mmd
```

**Reference or copy into page folders when needed.**

---

## File Naming Conventions

### Pattern

```
<page>.<type>.mmd   → source (Mermaid source file)
<page>.<type>.svg   → rendered (for public sites like SVG)
```

### Types

#### HLD Diagrams (C4 Levels 1-2)
- `context` or `c4-context` - C4 Level 1: System context diagram
- `component` or `c4-container` - C4 Level 2: Container/component diagram
- `sequence` - Sequence diagram (cross-system interactions)
- `flow` - Flow diagram (business processes)
- `entity` - Entity relationship diagram (data model)
- `deployment` - Deployment diagram (infrastructure)

#### LLD Diagrams (C4 Level 3)
- `c4-component` - C4 Level 3: Internal component structure
- `sequence` - Sequence diagram (internal component interactions)
- `class` - Class diagram (if needed)
- `state` - State diagram (component state machines)

### Examples

**HLD Examples**:
```
hld-system-overview.c4-context.mmd         # C4 Level 1: System context
hld-system-overview.c4-container.mmd       # C4 Level 2: Containers
hld-system-overview.sequence-auth.mmd      # Sequence: Auth flow
hld-system-overview.entity.mmd             # ERD: Data model
hld-system-overview.deployment.mmd         # Deployment architecture
```

**LLD Examples**:
```
lld-auth-service.c4-component.mmd          # C4 Level 3: Auth service internals
lld-auth-service.sequence-login.mmd        # Sequence: Login flow
lld-auth-service.class.mmd                 # Class: Auth classes (optional)
lld-payment-service.c4-component.mmd       # C4 Level 3: Payment service
```

**ADR Examples**:
```
0007-event-streaming.c4-container.mmd      # For ADR 0007, container level
0007-event-streaming.context.mmd           # For ADR 0007, context level
```

**Public Examples**:
```
overview.sanitized-c4-context.mmd          # Sanitized for public
overview.sanitized-c4-container.mmd        # Sanitized container view
```

---

## How to Embed Mermaid in MkDocs

**MkDocs Material supports Mermaid out of the box.**

### In your Markdown:

```markdown
## System Context

![Main Flow Diagram](../../architecture/diagrams/1-main-flow.svg)
```

**That's it—no images needed.** MkDocs renders the diagram at build time.

### For **public** pages where you want crisp social previews or PDF exports:

**Also keep an SVG** (rendered via CI). Embed either the Mermaid source OR the SVG:

```markdown
![System Context](./hld-system-overview.context.svg)
```

---

## Rendering Pipeline (CI) for PNG/SVG

Even though MkDocs can render Mermaid directly, **pre-rendered assets help for**:
- Embedding in PDFs, slide decks
- Sharing on LinkedIn/Notion
- Ensuring consistency if the site themes change

### GitHub Actions Example

**Renders every `.mmd` to `.svg` alongside it**:

```yaml
name: Render Diagrams

on:
  push:
    paths:
      - '**/*.mmd'

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Mermaid CLI
        run: npm install -g @mermaid-js/mermaid-cli

      - name: Render all .mmd files
        run: |
          find docs -name "*.mmd" | while read file; do
            mmdc -i "$file" -o "${file%.mmd}.svg"
          done

      - name: Commit rendered SVGs
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add docs/**/*.svg
          git commit -m "docs: auto-render diagrams" || echo "No changes"
          git push
```

**Result**: Every `.mmd` file automatically gets a `.svg` sibling.

---

## Diagram Types and When to Use

| Diagram Type | C4 Level | When to Use | Mermaid Type | Doc Type |
|--------------|----------|-------------|--------------|----------|
| **Context Diagram** | Level 1 | Show system boundaries, external actors, users | `graph LR` or `graph TB` | HLD |
| **Container Diagram** | Level 2 | Show applications, services, databases | `graph LR` or `graph TB` | HLD |
| **Component Diagram** | Level 3 | Show internal structure of a service | `graph LR` or `graph TB` | LLD |
| **Sequence Diagram** | Any | Show interaction flow, API calls, method calls | `sequenceDiagram` | HLD/LLD |
| **Entity Relationship** | Level 2-3 | Show database schema, data models | `erDiagram` | HLD/LLD |
| **Flow Diagram** | Any | Show process flow, decision trees | `graph TB` or `flowchart` | HLD/LLD |
| **State Diagram** | Level 3 | Show component state transitions | `stateDiagram-v2` | LLD |
| **Class Diagram** | Level 4 | Show classes, methods (optional) | `classDiagram` | Source |
| **Deployment Diagram** | Level 2 | Show infrastructure, servers, networks | `graph TB` | HLD |

---

## Examples

### C4 Level 1: Context Diagram (HLD)

**File**: `docs/internal/architecture/hld-system-overview.c4-context.mmd`

**Purpose**: Show the system boundary and external actors

![delivery-guides-diagram-conventions-comprehensive-1](../../architecture/diagrams/delivery-guides-diagram-conventions-comprehensive-1.svg)

**Referenced in**: `docs/internal/architecture/hld-system-overview.md`

---

### C4 Level 2: Container Diagram (HLD)

**File**: `docs/internal/architecture/hld-system-overview.c4-container.mmd`

**Purpose**: Show applications, services, and data stores

![delivery-guides-diagram-conventions-comprehensive-2](../../architecture/diagrams/delivery-guides-diagram-conventions-comprehensive-2.svg)

**Referenced in**: `docs/internal/architecture/hld-system-overview.md`

---

### C4 Level 3: Component Diagram (LLD)

**File**: `docs/internal/architecture/lld-auth-service.c4-component.mmd`

**Purpose**: Show internal structure of Auth Service

![delivery-guides-diagram-conventions-comprehensive-3](../../architecture/diagrams/delivery-guides-diagram-conventions-comprehensive-3.svg)

**Referenced in**: `docs/internal/architecture/lld-auth-service.md`

### Sequence Diagram (Authentication Flow)

**File**: `docs/internal/architecture/hld-system-overview.sequence-auth.mmd`

![delivery-guides-diagram-conventions-comprehensive-4](../../architecture/diagrams/delivery-guides-diagram-conventions-comprehensive-4.svg)

**Referenced in**: `docs/internal/architecture/hld-system-overview.md` (Authentication section)

### Entity Relationship Diagram (Data Model)

**File**: `docs/internal/architecture/hld-system-overview.entity.mmd`

![delivery-guides-diagram-conventions-comprehensive-5](../../architecture/diagrams/delivery-guides-diagram-conventions-comprehensive-5.svg)

**Referenced in**: `docs/internal/architecture/hld-system-overview.md` (Data Model section)

### ADR with Diagram

**File**: `docs/internal/architecture/adr/0007-event-streaming.md`

**Diagram**: `docs/internal/architecture/adr/0007-event-streaming.context.mmd`

![delivery-guides-diagram-conventions-comprehensive-6](../../architecture/diagrams/delivery-guides-diagram-conventions-comprehensive-6.svg)

**In the ADR**:
```markdown
## Decision

We will use **Kafka** for event streaming between services.

### Architecture

![delivery-guides-diagram-conventions-comprehensive-7](../../architecture/diagrams/delivery-guides-diagram-conventions-comprehensive-7.svg)
```

---

## Public vs Internal Diagrams

### Internal Diagrams (docs/internal/)
- **Full detail**: Show all components, databases, secrets, IPs
- **NOT published**: Only accessible via GitHub repository
- **Examples**: Full HLD context diagrams, detailed data flows

### Public Diagrams (docs/public/)
- **Sanitized**: Remove secrets, internal IPs, sensitive details
- **Simplified**: High-level overview only
- **Published**: Visible on public documentation site
- **File naming**: `overview.sanitized-context.mmd`

**Example**:
```
# Internal (FULL detail)
docs/internal/architecture/hld-system-overview.context.mmd

# Public (SANITIZED, simplified)
docs/public/architecture/overview.sanitized-context.mmd
```

---

## Best Practices

### ✅ DO
- **Co-locate diagrams** with the markdown that references them
- **Use Mermaid** as the default (diagrams-as-code)
- **Keep .mmd source** in version control (always)
- **Render to .svg** for public pages (via CI)
- **Use descriptive names**: `hld-system-overview.context.mmd`
- **Number ADR diagrams**: `0007-event-streaming.context.mmd`

### ❌ DON'T
- Don't use binary formats (PNG, JPG) unless absolutely necessary
- Don't store diagrams separately from documentation
- Don't use external diagramming tools (Lucidchart, Draw.io) unless exporting to Mermaid
- Don't skip the `.mmd` source file (always keep it!)
- Don't use vague names: `diagram1.mmd`, `image.mmd`

---

## CI/CD Integration

### Automatic Rendering (GitHub Actions)

**File**: `.github/workflows/render-diagrams.yml`

```yaml
name: Render Mermaid Diagrams

on:
  push:
    paths:
      - '**/*.mmd'
  pull_request:
    paths:
      - '**/*.mmd'

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Mermaid CLI
        run: npm install -g @mermaid-js/mermaid-cli

      - name: Render all .mmd files to .svg
        run: |
          find docs -name "*.mmd" -type f | while read file; do
            output="${file%.mmd}.svg"
            echo "Rendering $file -> $output"
            mmdc -i "$file" -o "$output" -b transparent
          done

      - name: Commit rendered SVGs
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
          git add docs/**/*.svg
          git diff --staged --quiet || git commit -m "docs: auto-render Mermaid diagrams to SVG"
          git push
```

**This ensures**:
- Every `.mmd` file gets a `.svg` sibling
- SVGs are committed automatically
- Public documentation always has crisp, rendered diagrams

---

## Sanitization for Public Docs

When creating public diagrams from internal ones:

1. **Copy the .mmd file** to `docs/public/`
2. **Rename**: `overview.sanitized-context.mmd`
3. **Remove**:
   - Internal IPs, database credentials
   - Sensitive service names
   - Internal API endpoints
   - Secrets, keys
4. **Simplify**:
   - Show only high-level components
   - Use generic labels ("Database" instead of "PostgreSQL 14 on 10.0.0.5")

**Example**:

**Internal** (`docs/internal/architecture/hld-system-overview.context.mmd`):
![delivery-guides-diagram-conventions-comprehensive-8](../../architecture/diagrams/delivery-guides-diagram-conventions-comprehensive-8.svg)

**Public** (`docs/public/architecture/overview.sanitized-context.mmd`):
![delivery-guides-diagram-conventions-comprehensive-9](../../architecture/diagrams/delivery-guides-diagram-conventions-comprehensive-9.svg)

---

## Related Documentation

- [Architecture Documentation](../../architecture/README.md) - How to use diagrams in architecture docs
- **HLD Template** - High-Level Design template with diagram examples (see `src/templates/docs/hld-template.md` in repository)
- [Diagram Legend](../../architecture/diagrams/diagram-legend.md) - Symbol reference guide
- [Mermaid Documentation](https://mermaid.js.org/) - Official Mermaid syntax

---

**Summary**: Use Mermaid diagrams-as-code, co-locate with markdown, render to SVG via CI for public docs.
