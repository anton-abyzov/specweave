## C4 Diagram Conventions - Quick Reference

**CRITICAL**: SpecWeave adopts the **C4 Model** (Context, Container, Component, Code) for architecture diagrams.

**For detailed C4 knowledge and diagram creation**, see the **`diagrams-architect` agent** (`src/agents/diagrams-architect/AGENT.md`), which contains:
- Complete C4 Model specification (4 levels)
- Mermaid syntax mastery with examples
- Diagram creation workflow
- Validation rules and common pitfalls
- Best practices

This guide provides quick reference for **file conventions** and **tooling** only.

---

### File Naming & Placement Conventions

**C4 Context (Level 1)**: `.specweave/docs/internal/architecture/diagrams/system-context.mmd`

**C4 Container (Level 2)**: `.specweave/docs/internal/architecture/diagrams/system-container.mmd`

**C4 Component (Level 3)**: `.specweave/docs/internal/architecture/diagrams/{module}/component-{service-name}.mmd`
- Examples: `auth/component-auth-service.mmd`, `payment/component-payment-gateway.mmd`

**Sequence Diagrams**: `.specweave/docs/internal/architecture/diagrams/{module}/flows/{flow-name}.mmd`
- Examples: `auth/flows/login-flow.mmd`, `payment/flows/checkout-flow.mmd`

**ER Diagrams**: `.specweave/docs/internal/architecture/diagrams/{module}/data-model.mmd`
- Examples: `auth/data-model.mmd`, `order/data-model.mmd`

**Deployment Diagrams**: `.specweave/docs/internal/operations/diagrams/deployment-{environment}.mmd`
- Examples: `deployment-production.mmd`, `deployment-staging.mmd`

---

### Usage Workflow

**How to Create Diagrams**:
```
User: "Create C4 context diagram for authentication"
→ diagrams-generator skill activates
→ Invokes diagrams-architect agent
→ Agent creates diagram following C4 conventions
→ Saves to correct location with validation instructions
```

**You don't need to know C4 syntax** - the agent handles everything. Just describe what you want to diagram.

---

### CRITICAL Syntax Rule (Must Know!)

**DO NOT include the `mermaid` keyword in C4 diagrams!**

✅ **CORRECT** (C4 diagrams):
```
C4Context
  title System Context Diagram
```

❌ **WRONG** (will not render):
```
mermaid
C4Context
  title System Context Diagram
```

**Why**: C4 diagrams start DIRECTLY with `C4Context`, `C4Container`, `C4Component`, or `C4Deployment`.

The `mermaid` keyword is ONLY for standard diagrams: `sequenceDiagram`, `erDiagram`, `classDiagram`, `graph`, etc.

---

### Validation (MANDATORY)

**Principle**: **If a diagram doesn't render, it doesn't exist.**

**After creating any diagram**:
1. Open the `.mmd` file in VS Code
2. Install Mermaid Preview extension (if needed)
3. Verify diagram renders correctly
4. Report syntax errors immediately

The `diagrams-architect` agent will always provide validation instructions with every diagram it creates.

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

