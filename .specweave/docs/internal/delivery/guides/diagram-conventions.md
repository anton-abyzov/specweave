## C4 Diagram Conventions

**CRITICAL**: SpecWeave adopts the **C4 Model** (Context, Container, Component, Code) for architecture diagrams.

### C4 Model Mapping to SpecWeave

| C4 Level | SpecWeave Equivalent | Status | Purpose | Location |
|----------|----------------------|--------|---------|----------|
| **C4-1: Context** | HLD Context Diagram | ✅ Defined | System boundaries, external actors | `.specweave/docs/internal/architecture/diagrams/` |
| **C4-2: Container** | HLD Component Diagram | ✅ Defined | Applications, services, data stores | `.specweave/docs/internal/architecture/diagrams/` |
| **C4-3: Component** | LLD Component Diagram | ✅ Defined (NEW) | Internal structure of a container | `.specweave/docs/internal/architecture/diagrams/{module}/` |
| **C4-4: Code** | Source code + UML | ⚠️ Optional | Class diagrams, implementation details | Code comments or separate docs |

### Design Decision

- **HLD (High-Level Design) = C4 Levels 1-2** (Context + Container)
- **LLD (Low-Level Design) = C4 Level 3** (Component)
- **Code-Level Documentation = C4 Level 4** (Optional, generated from code)

### C4 Level 1: Context Diagram (HLD)
**Purpose**: System boundaries, external actors. **Location**: `.specweave/docs/internal/architecture/diagrams/system-context.mmd`. **Syntax**: `C4Context` with Person/System/System_Ext/Rel.

### C4 Level 2: Container Diagram (HLD)
**Purpose**: Applications, services, databases. **Location**: `.specweave/docs/internal/architecture/diagrams/system-container.mmd`. **Syntax**: `C4Container` with Container/ContainerDb/Container_Boundary.

### C4 Level 3: Component Diagram (LLD)
**Purpose**: Internal container structure (modules, classes). **Location**: `.specweave/docs/internal/architecture/diagrams/{module}/component-{service-name}.mmd`. **Syntax**: `C4Component` with Component/ComponentDb. **Naming**: `component-auth-service.mmd`, `component-payment-service.mmd`.

### C4 Level 4: Code Diagram (Optional)
**Purpose**: Class diagrams. **Approach**: Generate from code using TypeDoc/JSDoc/Sphinx/Javadoc.

**If Manual Creation Required**: Use standard UML class diagrams with Mermaid `classDiagram`.

### Other Diagram Types

**Sequence**: Interaction flows → `.specweave/docs/internal/architecture/diagrams/{module}/flows/{flow-name}.mmd`
**ER**: Data models → `.specweave/docs/internal/architecture/diagrams/{module}/data-model.mmd`
**Deployment**: Infrastructure → `.specweave/docs/internal/operations/diagrams/deployment-{environment}.mmd`

### Diagram Agent & Skill

**Agent**: `diagrams-architect` (`src/agents/diagrams-architect/`)
- Expert in creating Mermaid diagrams following C4 conventions
- Contains all diagram rules and best practices
- Creates diagrams with correct syntax and placement

**Skill**: `diagrams-generator` (`src/skills/diagrams-generator/`)
- Detects diagram requests
- Coordinates with `diagrams-architect` agent
- Saves diagrams to correct locations

**Usage**:
```
User: "Create C4 context diagram"
→ diagrams-generator skill activates
→ Invokes diagrams-architect agent
→ Agent creates diagram following C4 Level 1 conventions
→ Saves to .specweave/docs/internal/architecture/diagrams/system-context.mmd
```

### CRITICAL: Mermaid C4 Syntax Rules

**DO NOT include the `mermaid` keyword in C4 diagrams!**

#### WRONG (will not render):
```
mermaid
C4Context
  title System Context Diagram
```

#### CORRECT (will render):
```
C4Context
  title System Context Diagram
```

**Why**: Mermaid C4 diagrams start DIRECTLY with `C4Context`, `C4Container`, `C4Component`, or `C4Deployment`. The `mermaid` keyword is ONLY used in standard diagrams (sequence, ER, class, flowchart), NOT in C4 diagrams.

### Diagram Validation (MANDATORY)

**Principle**: **If a diagram doesn't render, it doesn't exist.** Validation is not optional.

#### Before Saving Any Diagram

1. ✅ **C4 diagrams**: Start with `C4Context`, `C4Container`, `C4Component`, or `C4Deployment` (NO `mermaid` keyword)
2. ✅ **Other diagrams**: Start with `mermaid` keyword (sequenceDiagram, erDiagram, classDiagram, graph)
3. ✅ **Syntax valid**: No missing quotes, parentheses, or braces
4. ✅ **Indentation correct**: 2 spaces per level
5. ✅ **File location correct**: HLD in `architecture/diagrams/`, LLD in `architecture/diagrams/{module}/`

#### After Creating Diagram (MANDATORY)

Agent MUST instruct user to validate rendering:

```
✅ Diagram created: .specweave/docs/internal/architecture/diagrams/system-context.mmd

📋 VALIDATION REQUIRED:
1. Open the .mmd file in VS Code
2. Install Mermaid Preview extension (if not already)
3. Verify diagram renders correctly
4. Report any syntax errors immediately

If diagram fails to render, I will fix the syntax and regenerate.
DO NOT mark task as complete until rendering is verified.
```

#### Common Syntax Errors

| Error | Wrong | Correct |
|-------|-------|---------|
| **`mermaid` keyword in C4** | `mermaid`<br>`C4Context` | `C4Context` (start directly) |
| **Missing quotes** | `Person(user, Customer User)` | `Person(user, "Customer User", "Description")` |
| **Missing parentheses** | `Rel(user, system, "Uses"` | `Rel(user, system, "Uses")` |
| **Incorrect indentation** | `title System Context` | `  title System Context` (2 spaces) |

### Best Practices

1. **Follow C4 hierarchy** - Context → Container → Component → Code
2. **Keep diagrams focused** - One concept per diagram
3. **Use consistent naming** - Follow file naming conventions
4. **Place correctly** - HLD in `architecture/diagrams/`, LLD in `architecture/diagrams/{module}/`
5. **Add annotations** - Performance notes, security considerations
6. **Version control** - Track diagram changes with git
7. **Link from docs** - Reference diagrams in architecture documents
8. **Validate rendering** - ALWAYS verify diagram displays correctly before marking complete

### SVG Generation for Reliable Rendering

**CRITICAL**: For production documentation sites (Docusaurus, MkDocs, etc.), always generate SVG files from Mermaid diagrams.

**Why SVG Generation**:
- ✅ Consistent rendering across all browsers
- ✅ Faster page loads (no client-side JavaScript rendering)
- ✅ Dark mode support (separate light/dark SVGs)
- ✅ Version controlled visuals (git diff on diagrams)
- ✅ SSG-friendly (static site generators)
- ✅ Better accessibility

**Quick Usage**:

```bash
# Generate SVGs for all .mmd diagrams
npm run generate:diagrams

# Output:
# - {filename}.svg (light theme)
# - {filename}-dark.svg (dark theme)
```

**Configuration**:
- `.mermaidrc.json` - Theme configuration (SpecWeave brand colors)
- `scripts/generate-diagram-svgs.sh` - Automation script (finds all .mmd files)

**Docusaurus Integration**:

```mdx
import ThemedImage from '@theme/ThemedImage';

<ThemedImage
  alt="Workflow Diagram"
  sources={{
    light: '/diagrams/specweave-workflow.svg',
    dark: '/diagrams/specweave-workflow-dark.svg',
  }}
/>
```

**Workflow**:
1. Create/edit `.mmd` file
2. Run `npm run generate:diagrams`
3. Commit both `.mmd` and `.svg` files
4. Use `.svg` in documentation

**Files**:
- **Script**: `scripts/generate-diagram-svgs.sh`
- **Config**: `.mermaidrc.json`
- **Generated**: `.specweave/docs/internal/architecture/diagrams/*.svg`

### Related Documentation

- [Diagram SVG Generation Guide](.specweave/docs/internal/delivery/guides/diagram-svg-generation.md) - Complete SVG generation guide
- [Diagrams README](.specweave/docs/internal/architecture/diagrams/README.md) - Quick reference for diagrams
- [Docusaurus Integration](.specweave/increments/001-core-framework/reports/diagram-svgs-docusaurus.md) - Embedding SVGs in Docusaurus
- [DIAGRAM-TESTING-STRATEGY.md](.specweave/increments/001-core-framework/reports/DIAGRAM-TESTING-STRATEGY.md) - Complete diagram validation strategy
- [src/agents/diagrams-architect/AGENT.md](src/agents/diagrams-architect/AGENT.md) - Diagrams architect agent specification

---

