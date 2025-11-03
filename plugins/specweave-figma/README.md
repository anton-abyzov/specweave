# specweave-figma Plugin

**Version**: 1.0.0
**Status**: Beta (MCP-first architecture)
**License**: MIT

Convert Figma designs to production-ready code using workflow patterns and the Figma MCP server.

---

## What This Plugin Does

The `specweave-figma` plugin provides **workflow patterns** for design-to-code conversion:

✅ **Extract design tokens** (colors, typography, spacing) → CSS/TypeScript
✅ **Generate components** (React, Angular, Vue, Svelte) from Figma frames
✅ **Scaffold tests** (React Testing Library, Jest)
✅ **Apply conventions** (Atomic Design, TypeScript, accessibility)
✅ **Integrate with SpecWeave** (living docs, increment tracking)

**Important**: This plugin does **NOT** fetch Figma data directly. It uses the **official Figma MCP server** for data access, then applies workflow patterns to generate code.

---

## Architecture

```
Figma MCP Server (Official)
  ↓ Provides design data
Claude Code (MCP client)
  ↓ Makes data available to Claude
specweave-figma Plugin
  ↓ Applies workflow patterns
Production-ready code
```

**Key Insight**: We don't reinvent Figma's API integration. We use their MCP server and focus on what SpecWeave does best: workflow patterns and conventions.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full technical deep dive.

---

## Prerequisites

### 1. Figma Account & Access Token

**Required**:
- Figma account (Starter plan or higher)
- Personal access token (for API access)

**Get Your Token**:
1. Open [Figma](https://figma.com) → Log in
2. Settings → Account → Personal access tokens
3. Click "Create new token"
4. Copy token (you'll need it for setup)

**Rate Limits**:
- **Free (View/Collab seats)**: 6 MCP calls per month
- **Paid (Dev/Full seats)**: Tier 1 REST API rate limits

### 2. Figma Desktop App (Recommended)

**Why Desktop?**
- Local MCP server (no rate limits for development)
- Faster response times
- Better for rapid iteration

**Download**:
- https://figma.com/downloads
- Install latest version (v118+)

**Alternative**: Remote MCP server (`https://mcp.figma.com/mcp`) - uses rate limits

### 3. Claude Code

**Required**:
- Claude Code installed
- Version 0.4.0+ (supports plugins + MCP)

**Install Claude Code**:
- https://claude.com/claude-code

---

## Installation

### Option 1: SpecWeave CLI (Recommended)

```bash
# Install via SpecWeave plugin manager
specweave plugin install figma

# Verify installation
specweave plugin list
# Should show: ✅ specweave-figma (1.0.0)
```

### Option 2: Claude Code Native

```bash
# Add SpecWeave marketplace
/plugin marketplace add https://raw.githubusercontent.com/anton-abyzov/specweave/main/marketplace/.claude-plugin/marketplace.json

# Install figma plugin
/plugin install specweave-figma@specweave

# Verify
/plugin list
```

### Option 3: Manual (Development)

```bash
# Clone SpecWeave repository
git clone https://github.com/anton-abyzov/specweave.git
cd specweave

# Copy plugin to Claude
cp -r plugins/specweave-figma ~/.claude/plugins/
```

---

## Configuration

### Step 1: Enable Figma MCP Server

#### Option A: Desktop Server (Recommended)

1. Open **Figma Desktop** app
2. Open any design file
3. Switch to **Dev Mode** (Shift + D)
4. Find "MCP" section in the panel
5. Click **"Enable desktop MCP server"**
6. Server starts at: `http://127.0.0.1:3845/mcp`

**Verify**:
```bash
# Check if server is running
curl http://127.0.0.1:3845/mcp
# Should return: {"status": "ok"}
```

#### Option B: Remote Server

If you can't use Desktop app:

1. Set environment variable:
   ```bash
   export FIGMA_PERSONAL_ACCESS_TOKEN="your-token-here"
   ```

2. Configure `.mcp.json` (plugin handles this automatically)

3. Server URL: `https://mcp.figma.com/mcp`

**Note**: Remote server uses API rate limits (6/month for free).

### Step 2: Configure Environment Variables

**Required for remote server** (optional for desktop):

```bash
# Add to ~/.bashrc or ~/.zshrc
export FIGMA_PERSONAL_ACCESS_TOKEN="figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Reload shell
source ~/.bashrc  # or source ~/.zshrc
```

**For development**, create `.env`:
```bash
# .env (gitignored)
FIGMA_PERSONAL_ACCESS_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Verify Installation

```bash
# In Claude Code, check MCP status
/mcp status

# Should show:
# ✅ figma: Connected
#    URL: http://127.0.0.1:3845/mcp (Desktop)
#    OR: https://mcp.figma.com/mcp (Remote)
```

**Test with a Figma file**:
```
Extract design tokens from https://figma.com/file/your-file-id
```

If successful, Claude will fetch data via MCP and apply workflow patterns.

---

## Usage

### Example 1: Extract Design Tokens

**Prompt**:
```
Extract design tokens from https://figma.com/file/ABC123/Design-System
```

**What Happens**:
1. Claude uses Figma MCP to fetch variables
2. `figma-to-code` skill applies token extraction patterns
3. Generates files:
   ```
   src/design-tokens/
   ├── theme.css         # CSS custom properties
   ├── tokens.ts         # TypeScript tokens
   ├── tailwind.config.ts # Tailwind config (if requested)
   └── types.ts          # TypeScript types
   ```

**Generated Code**:
```css
/* theme.css */
:root {
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --font-size-heading1: 2.25rem;
  --spacing-4: 1rem;
}
```

```typescript
// tokens.ts
export const colors = {
  primary: { 500: '#3b82f6', 600: '#2563eb' }
};
export const typography = {
  heading1: { fontSize: '2.25rem', lineHeight: '1.2' }
};
```

### Example 2: Generate React Component

**Prompt**:
```
Convert this Button component to React: https://figma.com/file/ABC123/Components/Button
```

**What Happens**:
1. Claude fetches Button component data via MCP
2. Skill analyzes variants, properties, layout
3. Generates component files:
   ```
   src/components/atoms/Button/
   ├── Button.tsx           # Component
   ├── Button.module.css    # Styles
   ├── Button.test.tsx      # Tests
   └── index.ts             # Exports
   ```

**Generated Component**:
```typescript
// Button.tsx
export type ButtonVariant = 'primary' | 'secondary' | 'text';
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ ... }) => { ... };
```

### Example 3: Bootstrap Design System

**Prompt**:
```
Create a complete design system from https://figma.com/file/XYZ789
```

**What Happens**:
1. Extract all design tokens
2. Generate token files (CSS, TypeScript, Tailwind)
3. Create folder structure (atoms/molecules/organisms)
4. Generate Storybook setup (optional)
5. Update SpecWeave living docs

**File Structure**:
```
src/
├── design-tokens/
│   ├── theme.css
│   ├── tokens.ts
│   └── types.ts
├── components/
│   ├── atoms/      (Button, Input, Label)
│   ├── molecules/  (FormField, Card)
│   └── organisms/  (Navigation, Hero)
└── types/
    └── design-system.ts
```

---

## Supported Frameworks

### React

**Output**:
- TypeScript components
- CSS Modules or Tailwind
- React Testing Library tests
- Storybook stories (optional)

**Example**:
```bash
"Generate React Button component from Figma"
```

### Angular

**Output**:
- Standalone components (Angular 15+)
- SCSS styles
- Jest tests
- TypeScript types

**Example**:
```bash
"Convert this Figma component to Angular standalone component"
```

### Vue

**Output**:
- Composition API (Vue 3+)
- Scoped styles
- Vitest tests
- TypeScript types

**Example**:
```bash
"Create Vue component from this Figma frame"
```

### Svelte

**Output**:
- TypeScript components
- Scoped styles
- Vitest tests

**Example**:
```bash
"Implement this design in Svelte with TypeScript"
```

---

## Workflow Patterns

The plugin provides **4 core workflow patterns**:

### 1. Design Token Extraction

**Converts**:
- Figma variables → CSS custom properties
- Figma text styles → Typography tokens
- Figma spacing → Spacing scale

**Output formats**:
- CSS (custom properties)
- TypeScript (token objects)
- Tailwind (theme config)

### 2. Component Generation

**Converts**:
- Figma components → React/Angular/Vue/Svelte components
- Variants → TypeScript union types
- Properties → Component props
- Auto Layout → Flexbox/Grid

**Conventions**:
- Atomic Design (atoms/molecules/organisms)
- TypeScript for type safety
- Co-located styles and tests

### 3. Layout Conversion

**Converts**:
- Auto Layout → Flexbox CSS
- Constraints → Responsive design
- Spacing → rem values (4px/8px grid)

### 4. Test Generation

**Generates**:
- Unit tests (component behavior)
- Visual regression tests (Storybook snapshots)
- Accessibility tests (ARIA, keyboard nav)

---

## SpecWeave Integration

### Living Docs

After generating components, living docs are updated:

```markdown
# Component Library

## Button

**Source**: [Figma](https://figma.com/file/ABC/Button)
**Status**: Implemented (2025-11-02)
**Location**: src/components/atoms/Button/

**Variants**: primary, secondary, text
**Sizes**: sm, md, lg

**Design Decisions**:
- 8px border radius (friendly feel)
- 2:1 padding ratio (better click targets)
- 50% opacity for disabled (WCAG compliant)
```

### Increment Tracking

Track component implementation progress:

```yaml
# .specweave/increments/0006-design-system/tasks.md
- [x] T-001: Extract design tokens
- [x] T-002: Generate Button component
- [ ] T-003: Generate Input component
- [ ] T-004: Visual regression tests
```

---

## Troubleshooting

### MCP Server Not Connected

**Error**:
```
❌ Figma MCP server not found
```

**Solutions**:

1. **Desktop server not enabled**:
   - Open Figma Desktop app
   - Switch to Dev Mode (Shift + D)
   - Enable "desktop MCP server"

2. **Remote server missing token**:
   ```bash
   export FIGMA_PERSONAL_ACCESS_TOKEN="your-token"
   ```

3. **Verify MCP status**:
   ```bash
   /mcp status
   ```

### Rate Limit Exceeded

**Error**:
```
❌ Figma API rate limit reached
```

**Solutions**:

1. **Free plan**: 6 calls/month
   - Wait for reset (monthly)
   - OR upgrade to paid plan

2. **Paid plan**: Tier 1 limits
   - Check usage in Figma settings
   - Contact Figma support for increase

3. **Use Desktop server** (no rate limits for local dev):
   - Enable desktop MCP server
   - Develops locally without API calls

### Invalid Figma URL

**Error**:
```
❌ Invalid Figma URL
```

**Valid formats**:
- `https://figma.com/file/ABC123/Design-Name`
- `https://figma.com/design/ABC123/Design-Name`
- File key: `ABC123`

**Not valid**:
- `figma.com/file/...` (missing https)
- `ABC` (too short)

### Plugin Not Activating

**Check**:
1. Plugin installed:
   ```bash
   specweave plugin list
   # OR
   /plugin list
   ```

2. MCP server connected:
   ```bash
   /mcp status
   ```

3. Trigger keywords used:
   - "figma to code"
   - "convert figma"
   - "design tokens"
   - "implement design"

---

## Configuration Files

### .mcp.json (Auto-generated)

Located at: `~/.claude/plugins/specweave-figma/.claude-plugin/.mcp.json`

```json
{
  "$schema": "https://spec-weave.com/schemas/mcp-config.json",
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-figma"],
      "env": {
        "FIGMA_PERSONAL_ACCESS_TOKEN": "${FIGMA_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

**Desktop server** (alternative):
```json
{
  "mcpServers": {
    "figma": {
      "url": "http://127.0.0.1:3845/mcp"
    }
  }
}
```

### manifest.json (SpecWeave Metadata)

Located at: `~/.claude/plugins/specweave-figma/.claude-plugin/manifest.json`

```json
{
  "name": "specweave-figma",
  "version": "1.0.0",
  "provides": {
    "skills": ["figma-to-code"],
    "agents": [],
    "commands": []
  },
  "auto_detect": {
    "files": ["figma/", "design-system/"],
    "packages": ["figma", "@figma/plugin-typings"],
    "env_vars": ["FIGMA_ACCESS_TOKEN", "FIGMA_FILE_KEY"]
  }
}
```

---

## Best Practices

### 1. Use Desktop Server for Development

**Why**:
- ✅ No rate limits (unlimited local calls)
- ✅ Faster response (local vs. API)
- ✅ Better for rapid iteration

**Setup**: Enable once in Figma Desktop, use forever.

### 2. Commit Tokens, Not Credentials

**Do commit**:
- `src/design-tokens/theme.css`
- `src/design-tokens/tokens.ts`
- Generated components

**Don't commit**:
- `FIGMA_PERSONAL_ACCESS_TOKEN`
- `.env` file with credentials

**Use**:
- `.env.example` (template)
- `.gitignore` for `.env`

### 3. Link to Figma Source of Truth

**In component docs**:
```markdown
**Source**: [Figma Button](https://figma.com/file/ABC/Button)
```

**Why**: Designers can see which code matches which designs.

### 4. Review Generated Code

**AI generates scaffolds**, humans refine:
- ✅ Check accessibility (ARIA, contrast)
- ✅ Verify responsive behavior
- ✅ Test edge cases
- ✅ Add business logic

**Don't blindly merge** - always review!

---

## FAQ

### Q: Do I need a paid Figma plan?

**A**: No. Free plan works, but has 6 MCP calls/month. Desktop server has no rate limits.

### Q: Can I use this without Claude Code?

**A**: Technically yes (via SpecWeave CLI), but you lose auto-activation and MCP integration. Cursor/Copilot support is limited.

### Q: Does this replace designers?

**A**: No! This implements designs from Figma. Designers still create the source of truth.

### Q: What if Figma changes?

**A**: We use the official Figma MCP server. If Figma updates their API, they update the MCP server, not our plugin.

### Q: Can I customize the workflow patterns?

**A**: Yes! Fork the plugin, edit `skills/figma-to-code/SKILL.md`, reinstall locally.

### Q: Does this work with FigJam?

**A**: Yes, if using official Figma MCP server (supports FigJam + Make resources).

---

## Contributing

We welcome contributions!

**How to help**:
1. Report bugs: https://github.com/anton-abyzov/specweave/issues
2. Suggest workflow improvements
3. Add support for new frameworks (Solid, Qwik, etc.)
4. Improve test generation patterns

**Development**:
```bash
# Clone repo
git clone https://github.com/anton-abyzov/specweave.git
cd specweave/plugins/specweave-figma

# Make changes to SKILL.md or .mcp.json

# Test locally
cp -r . ~/.claude/plugins/specweave-figma/
# Restart Claude Code

# Submit PR
git checkout -b feature/your-improvement
git commit -m "feat: improve component generation"
git push origin feature/your-improvement
```

---

## Resources

### Official Documentation

- [Figma MCP Server Guide](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [Figma Variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Code Plugins](https://docs.claude.com/en/docs/claude-code/plugins)

### SpecWeave Docs

- [Plugin Architecture](./ARCHITECTURE.md) - Technical deep dive
- [SpecWeave Main Docs](https://spec-weave.com)
- [GitHub Repository](https://github.com/anton-abyzov/specweave)

### Design Systems

- [Atomic Design](https://atomicdesign.bradfrost.com/)
- [Design Tokens](https://designtokens.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Storybook](https://storybook.js.org/)

---

## License

MIT License - see [LICENSE](../../LICENSE)

---

## Support

**Issues**: https://github.com/anton-abyzov/specweave/issues
**Discussions**: https://github.com/anton-abyzov/specweave/discussions
**Email**: support@spec-weave.com

---

**Last Updated**: 2025-11-02
**Plugin Version**: 1.0.0 (Beta)
**SpecWeave Core**: v0.6.0+
