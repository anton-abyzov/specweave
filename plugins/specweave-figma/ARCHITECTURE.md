# specweave-figma Plugin Architecture

## The MCP-First Realization

**Problem**: Original plugin tried to implement Figma API integration directly.

**Solution**: Use Figma's official MCP server for data access, SpecWeave for workflow patterns.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Figma MCP Server (Official)                            │
│  Announced: June 4, 2025 (Beta)                         │
│                                                          │
│  Endpoints:                                              │
│  - Desktop: http://127.0.0.1:3845/mcp                   │
│  - Remote: https://mcp.figma.com/mcp                    │
│                                                          │
│  Tools Exposed:                                          │
│  - get-file(fileKey) → File metadata                    │
│  - list-files(projectId) → Project files                │
│  - Access variables, components, layout data            │
│  - Extract FigJam and Make resources                    │
│                                                          │
│  Authentication: Figma personal access token            │
│  Access: View/Collab (6/month), Paid plans (Tier 1 API) │
└─────────────────────────────────────────────────────────┘
                            ↓
                    MCP Protocol
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Claude Code (MCP Client)                               │
│  - Connects to MCP server                               │
│  - Exposes tools to Claude                              │
│  - Handles authentication                               │
└─────────────────────────────────────────────────────────┘
                            ↓
                 Claude has Figma data
                            ↓
┌─────────────────────────────────────────────────────────┐
│  specweave-figma Plugin                                 │
│                                                          │
│  .mcp.json:                                              │
│  {                                                       │
│    "figma": {                                            │
│      "url": "http://127.0.0.1:3845/mcp",                │
│      "env": { "FIGMA_ACCESS_TOKEN": "..." }             │
│    }                                                     │
│  }                                                       │
│                                                          │
│  Skills:                                                 │
│  ├── figma-to-code/                                     │
│  │   └── Workflow patterns (NOT API calls):             │
│  │       • How to structure design tokens               │
│  │       • Component scaffolding patterns               │
│  │       • File organization                            │
│  │       • Test generation                              │
│  │                                                       │
│  SpecWeave Integration:                                 │
│  - Living docs: Track design decisions                  │
│  - Increments: Component implementation progress        │
│  - Tests: Visual regression test scaffolds              │
└─────────────────────────────────────────────────────────┘
```

---

## Key Principles

### 1. Don't Reinvent MCP

**Wrong Approach** (what we almost did):
```typescript
// ❌ Plugin makes API calls directly
async function fetchFigmaFile(fileKey: string) {
  const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: { 'X-Figma-Token': process.env.FIGMA_ACCESS_TOKEN }
  });
  // Parse, transform, etc.
}
```

**Right Approach** (MCP-first):
```yaml
# ✅ Plugin configures MCP, assumes tools are available
---
name: figma-to-code
description: Workflow patterns for converting Figma designs to code
---

When the user provides a Figma URL:

1. Use MCP tool `get-file` to fetch design data
   (Claude Code handles this automatically via MCP)

2. Extract design tokens following this pattern:
   - Colors: Group by semantic names (primary, secondary, etc.)
   - Typography: Scale from Figma text styles
   - Spacing: Use 4px/8px grid systems

3. Generate components using these conventions:
   - Atomic Design (atoms/molecules/organisms)
   - TypeScript interfaces for all props
   - Co-located styles
```

### 2. SpecWeave Value = Workflow Patterns, Not Data Fetching

**What MCP Provides**:
- ✅ Connection to Figma
- ✅ Authentication
- ✅ Raw design data

**What SpecWeave Provides**:
- ✅ How to organize that data
- ✅ File structure conventions
- ✅ Design system patterns
- ✅ Testing strategies
- ✅ Living docs integration

### 3. Plugin = MCP Config + Workflow Expertise

```
plugins/specweave-figma/
├── .claude-plugin/
│   ├── manifest.json         # SpecWeave metadata
│   ├── plugin.json           # Claude Code native
│   └── .mcp.json             # ✅ NEW: MCP server config
├── skills/
│   └── figma-to-code/
│       ├── SKILL.md          # Workflow patterns (NOT API logic)
│       └── test-cases/
└── README.md                 # Setup: How to enable Figma MCP
```

---

## .mcp.json Configuration

Create `.claude-plugin/.mcp.json`:

```json
{
  "$schema": "https://spec-weave.com/schemas/mcp-config.json",
  "servers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@figma/mcp-server"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"
      }
    }
  }
}
```

**Alternative: Desktop Server**

```json
{
  "servers": {
    "figma": {
      "url": "http://127.0.0.1:3845/mcp",
      "description": "Figma Desktop MCP server (must be enabled in Figma app)"
    }
  }
}
```

---

## Updated figma-to-code Skill

**Before** (tried to be a data fetcher):
```yaml
description: Fetches Figma designs via MCP, parses JSON, generates code...
```

**After** (workflow patterns only):
```yaml
description: Workflow patterns for design-to-code. Assumes Figma MCP provides data. Converts design tokens, scaffolds components, generates tests. Activates for: figma to code, design implementation, component generation.
```

**Key Change**: Skill ASSUMES Claude has Figma data (via MCP), focuses on HOW TO USE IT.

---

## Workflow Examples

### Example 1: Convert Frame to Component

**User Request**:
> "Convert this Figma button to a React component: https://figma.com/file/abc123"

**What Happens**:

1. **MCP Layer** (automatic, Claude Code handles):
   ```
   Claude Code → Figma MCP → get-file(abc123)
   Returns: { components: [...], variables: [...], ... }
   ```

2. **SpecWeave figma-to-code Skill** (workflow pattern):
   ```
   See Button component in Figma data
   → Extract variants (primary, secondary, text)
   → Extract size (sm, md, lg)
   → Generate TypeScript interface:
      export interface ButtonProps {
        variant?: 'primary' | 'secondary' | 'text';
        size?: 'sm' | 'md' | 'lg';
        disabled?: boolean;
        children: ReactNode;
      }
   → Generate component scaffold
   → Generate test file
   → Update living docs
   ```

### Example 2: Extract Design Tokens

**User Request**:
> "Extract design tokens from https://figma.com/file/xyz789"

**Workflow**:

1. **MCP provides** variables from Figma
2. **Skill applies pattern**:
   ```
   Colors:
   - Figma: color/primary/500 → CSS: --color-primary-500
   - Group by semantic naming
   - Generate theme.css

   Typography:
   - Figma: Heading 1 → TypeScript: typography.heading1
   - Include font-size, line-height, font-weight
   - Generate tokens.ts

   Spacing:
   - Use 4px grid system
   - Generate spacing scale (4, 8, 12, 16, 24, 32, 48, 64)
   ```

---

## Setup Instructions (for README.md)

### Prerequisites

1. **Figma Access**:
   - Figma account (Starter or higher)
   - Personal access token (Settings → Account → Personal access tokens)

2. **Figma Desktop App** (recommended):
   - Download from https://figma.com/downloads
   - Latest version (supports MCP)

3. **Claude Code**:
   - Install plugin via marketplace or SpecWeave CLI

### Enable Figma MCP Server

**Option 1: Desktop Server** (recommended)

1. Open Figma Desktop app
2. Open any design file
3. Switch to Dev Mode (Shift + D)
4. Click "Enable desktop MCP server" in MCP section
5. Server starts at `http://127.0.0.1:3845/mcp`

**Option 2: Remote Server**

1. Set `FIGMA_ACCESS_TOKEN` environment variable
2. Configure `.mcp.json` to use `https://mcp.figma.com/mcp`

### Install Plugin

**Via SpecWeave CLI**:
```bash
specweave plugin install figma
```

**Via Claude Code**:
```bash
/plugin marketplace add specweave/marketplace
/plugin install specweave-figma@specweave
```

### Verify Installation

```bash
# Check MCP connection
/mcp status

# Should show:
# ✅ figma: Connected (http://127.0.0.1:3845/mcp)

# Test with a Figma URL
"Extract design tokens from https://figma.com/file/your-file-id"
```

---

## Migration Guide

### What to Remove

1. **Custom Figma API calls** - Delete all `fetch('https://api.figma.com/...')`
2. **Authentication logic** - MCP handles this
3. **JSON parsing** - MCP provides structured data
4. **Data fetching skills** - Keep only workflow patterns

### What to Keep

1. **Design token patterns** - How to structure CSS/SCSS/Tailwind
2. **Component scaffolding** - File templates and conventions
3. **Test generation** - Visual regression test patterns
4. **Living docs integration** - Track design decisions

### Files to Update

- [ ] Delete `figma-designer` skill (out of scope)
- [ ] Delete `figma-implementer` skill (duplicate)
- [ ] Delete `figma-mcp-connector` skill (infrastructure detail)
- [x] Keep `figma-to-code` skill (workflow patterns)
- [ ] Create `.claude-plugin/.mcp.json` (MCP configuration)
- [ ] Update `SKILL.md` (assume MCP provides data)
- [ ] Update `README.md` (setup instructions)
- [ ] Update `manifest.json` (accurate description)

---

## Community vs. Official MCP Servers

### Official Figma MCP (Recommended)

**Pros**:
- ✅ Maintained by Figma
- ✅ Desktop + Remote options
- ✅ Includes Dev Mode features
- ✅ Code Connect integration
- ✅ FigJam and Make support

**Cons**:
- ⚠️ Beta (as of June 2025)
- ⚠️ Rate limits (6/month for free, Tier 1 for paid)

### Community MCP Servers

**GLips/Figma-Context-MCP**:
- ✅ Simplified layout data (less context noise)
- ✅ Optimized for AI coding agents
- ⚠️ Community-maintained

**TimHolden/figma-mcp-server**:
- ✅ Full REST API coverage
- ✅ Read/write operations (limited by Figma API)
- ⚠️ Requires personal access token setup

**Recommendation**: Use official Figma MCP for best experience.

---

## Testing Strategy

### Test MCP Connection

```yaml
# test-cases/test-1-mcp-connection.yaml
name: MCP Connection Test
description: Verify Figma MCP server is accessible
input:
  action: "Check MCP status"
expected:
  mcp_servers:
    - name: figma
      status: connected
      url: "http://127.0.0.1:3845/mcp OR https://mcp.figma.com/mcp"
```

### Test Design Token Extraction

```yaml
# test-cases/test-2-token-extraction.yaml
name: Design Token Extraction
description: Extract tokens from Figma file
input:
  figma_url: "https://figma.com/file/sample-design-system"
  action: "Extract design tokens"
expected:
  files_created:
    - src/design-tokens/theme.css
    - src/design-tokens/tokens.ts
    - src/design-tokens/types.ts
  token_categories:
    - colors
    - typography
    - spacing
    - shadows
```

### Test Component Generation

```yaml
# test-cases/test-3-component-generation.yaml
name: Component Generation
description: Generate React component from Figma frame
input:
  figma_url: "https://figma.com/file/abc/Button"
  framework: "react"
  typescript: true
expected:
  files_created:
    - src/components/atoms/Button/Button.tsx
    - src/components/atoms/Button/Button.module.css
    - src/components/atoms/Button/Button.test.tsx
    - src/components/atoms/Button/index.ts
  component_props:
    - variant: "primary | secondary | text"
    - size: "sm | md | lg"
    - disabled: boolean
```

---

## Next Steps

1. **Create `.mcp.json`** - Configure Figma MCP server
2. **Update `SKILL.md`** - Rewrite to assume MCP provides data
3. **Add setup docs** - README with MCP enablement instructions
4. **Test with real Figma files** - Validate workflow patterns
5. **Document limitations** - Rate limits, access tiers
6. **Add examples** - Common design-to-code scenarios

---

## References

- [Official Figma MCP Announcement](https://www.figma.com/blog/introducing-figmas-dev-mode-mcp-server/)
- [Figma MCP Guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [Claude Code Plugins](https://docs.claude.com/en/docs/claude-code/plugins)
- [GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP)
- [TimHolden/figma-mcp-server](https://github.com/TimHolden/figma-mcp-server)

---

**Last Updated**: 2025-11-02
**Status**: Architecture redesign - MCP-first approach
