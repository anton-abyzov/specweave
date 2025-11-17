# SpecWeave UI Plugin

**Complete UI/UX Development Toolkit** - Playwright E2E testing, Figma design integration, React/Vue/Angular development, design systems, Storybook component testing.

---

## What's Included

### Skills (7)

1. **e2e-playwright** - Browser automation and E2E testing with Playwright
   - Write automated tests for web applications
   - Cross-browser testing (Chrome, Firefox, Safari, Edge)
   - Screenshot and video capture
   - Accessibility testing
   - Mobile emulation

2. **figma-designer** - Figma design integration and mockup creation
   - Create production-ready Figma designs
   - Design systems with reusable components
   - Design tokens (colors, typography, spacing)
   - Responsive layouts

3. **figma-implementer** - Convert Figma designs to production code
   - Pixel-perfect React/Angular components
   - Extract design tokens automatically
   - Generate TypeScript interfaces from Figma
   - Storybook integration

4. **figma-mcp-connector** - Connect to Figma via MCP servers
   - Read/write Figma files
   - Extract design variables
   - Sync design changes

5. **design-system-architect** - Build scalable design systems
   - Atomic design methodology
   - Component hierarchy (atoms/molecules/organisms)
   - Design token management
   - Brand consistency

6. **frontend** - React, Vue, Angular development
   - Component-driven development
   - State management (Redux, Zustand, Pinia)
   - Form validation and handling
   - Responsive design with Tailwind/CSS modules
   - Accessibility (WCAG 2.1 compliance)

7. **nextjs** - Next.js 14+ App Router specialist
   - Server components and streaming
   - Server actions and mutations
   - Route handlers and middleware
   - Metadata API and SEO
   - NextAuth.js authentication
   - Prisma ORM integration

### Agents (1)

**ui-ux-specialist** - Unified agent with expertise across all UI/UX tools
- Combines knowledge from all 7 skills
- Coordinates design → implementation → testing workflow
- Provides holistic UI/UX guidance

### Commands (3)

1. `/ui.test` - Run Playwright E2E tests
2. `/ui.design` - Generate Figma designs
3. `/ui.implement` - Convert Figma to code

---

## Auto-Detection

This plugin **auto-activates** when your project contains:

**Package.json dependencies**:
- `@playwright/test`, `playwright`
- `figma`, `@figma/rest-api-types`
- `react`, `react-dom`, `next`
- `vue`, `@vue/core`
- `@angular/core`
- `@storybook/react`

**Files/directories**:
- `playwright.config.ts`
- `figma.config.json`
- `.storybook/`
- `next.config.js`

**Keywords in increment descriptions**:
- "playwright", "e2e", "end-to-end"
- "figma", "design", "ui", "ux"
- "react", "next", "vue", "angular"
- "storybook", "design system"

---

## Installation

### Automatic (Recommended)

```bash
# SpecWeave detects UI project and suggests plugin
specweave init

# Detected: React + Playwright
# Installing: specweave-ui
```

### Manual

```bash
# Via SpecWeave CLI
specweave plugin enable specweave-ui

# Via Claude Code
/plugin install specweave-ui

# Via NPM
npm install -g specweave
cp -r node_modules/specweave/plugins/specweave-ui .claude/plugins/
```

---

## Usage

### E2E Testing with Playwright

**Skill auto-activates when you mention:**
- "Add Playwright tests"
- "Create E2E test for login"
- "Test user signup flow"

**Example interaction**:
```
User: Add Playwright tests for the login page
AI: I'll create a comprehensive E2E test suite for the login page...
[Generates tests/e2e/login.spec.ts with Playwright tests]
```

**Manual command**:
```bash
/ui.test login
```

---

### Figma Design Integration

**Skill auto-activates when you mention:**
- "Design in Figma"
- "Create mockup"
- "Convert Figma to code"

**Example interaction**:
```
User: Convert the Figma dashboard design to React components
AI: I'll extract the Figma design and generate React components...
[Generates components with design tokens and TypeScript types]
```

**Manual command**:
```bash
/ui.design dashboard
/ui.implement dashboard
```

---

### Frontend Development

**Skill auto-activates when you mention:**
- "Create React component"
- "Build Next.js page"
- "Add Vue component"

**Example interaction**:
```
User: Create a reusable Button component with variants
AI: I'll create a Button component following atomic design...
[Generates Button.tsx with primary/secondary variants, Storybook stories, tests]
```

---

### Design System Architecture

**Skill auto-activates when you mention:**
- "Design system"
- "Component library"
- "Design tokens"

**Example interaction**:
```
User: Set up a design system with Tailwind and design tokens
AI: I'll create a comprehensive design system...
[Generates tokens.ts, color palette, typography scale, spacing system]
```

---

## MCP Integration

### Playwright MCP (PRIMARY - Local Browser Automation)

**✅ RECOMMENDED: Use Playwright MCP for local development**

**What it does**:
- Local browser automation (Chromium, Firefox, WebKit, Edge)
- E2E testing with accessibility-first selectors
- No API keys or credentials needed
- Fast, reliable, works offline

**Setup** (Automatic via `.mcp.json`):

The plugin auto-configures Playwright MCP. To verify:

```bash
# Check MCP server status
claude mcp list

# Should show: playwright - ✓ Connected
```

**Manual Installation** (if needed):
```bash
# Install Playwright MCP globally
npm install -g @playwright/mcp

# Or use npx (recommended)
npx @playwright/mcp@latest
```

**Configuration** (`.mcp.json`):
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],  // ⚠️ -y flag is REQUIRED!
      "description": "Local Playwright - PRIMARY"
    }
  }
}
```

**⚠️ IMPORTANT**: The `-y` flag is **required**! Without it, npx waits for user confirmation and the MCP connection hangs.

**Advanced Options**:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",  // ⚠️ REQUIRED for auto-install
        "@playwright/mcp@latest",
        "--browser", "chromium",    // or firefox, webkit, msedge
        "--headless",               // run without UI
        "--timeout-action", "5000", // ms
        "--timeout-navigation", "60000" // ms
      ]
    }
  }
}
```

**Usage Example**:
```javascript
// Navigate to page
mcp__plugin_specweave-ui_playwright__browser_goto({ url: "https://example.com" })

// Click button (accessibility-first)
mcp__plugin_specweave-ui_playwright__browser_click({
  ref: "button[name='submit']",
  element: "Submit button"
})

// Fill input
mcp__plugin_specweave-ui_playwright__browser_fill({
  ref: "input[name='email']",
  text: "user@example.com"
})
```

**Benefits**:
- ✅ No API keys needed
- ✅ Works offline
- ✅ Fast local execution
- ✅ Full browser control
- ✅ Built-in debugging

---

### Browserbase (OPTIONAL - Cloud Browser Automation)

**⚠️ NOT loaded by default. Enable only when needed for CI/CD or cloud scenarios.**

**What it does**:
- Runs Playwright tests in cloud infrastructure
- Parallel test execution (10x faster at scale)
- No local browser dependencies in CI
- Automatic screenshots/videos

**Manual Setup** (when needed):

1. Get API key from [Browserbase](https://www.browserbase.com/)

2. Set environment variables:
   ```bash
   export BROWSERBASE_API_KEY="bb_xxx"
   export BROWSERBASE_PROJECT_ID="proj_xxx"
   ```

3. **Add to your project's `.claude/settings.json`**:
   ```json
   {
     "mcpServers": {
       "browserbase": {
         "command": "npx",
         "args": ["-y", "@browserbasehq/mcp-server-browserbase"],
         "env": {
           "BROWSERBASE_API_KEY": "${BROWSERBASE_API_KEY}",
           "BROWSERBASE_PROJECT_ID": "${BROWSERBASE_PROJECT_ID}"
         }
       }
     }
   }
   ```

4. Restart Claude Code

**Why not auto-loaded?**
- Saves ~5,600 tokens per request
- Most developers use Playwright locally, not Browserbase
- Browserbase requires API keys (not needed for most users)
- Can still enable when needed for CI/CD

**Benefits**:
- ✅ Parallel execution (10x faster)
- ✅ No browser installation in CI
- ✅ Automatic scaling
- ✅ Works in serverless environments

**When to Use**:
- ✅ CI/CD pipelines
- ✅ Cloud deployments
- ✅ High-scale parallel testing
- ❌ Local development (use Playwright MCP instead)

---

## Workflow Example

### Complete UI Feature Development

```bash
# 1. Create increment
/specweave:inc "Add user dashboard with charts"

# 2. SpecWeave detects UI work, auto-enables plugin
# Installing: specweave-ui (Playwright + Figma + React + Design System)

# 3. Design phase (Figma skill)
/ui.design dashboard

# 4. Implementation (Frontend + Next.js skills)
/ui.implement dashboard

# 5. Testing (Playwright skill)
/ui.test dashboard

# 6. Storybook documentation (auto-generated)
npm run storybook
```

**AI auto-coordinates** across all skills:
1. **Design System Architect**: Defines tokens, components
2. **Figma Designer**: Creates mockups
3. **Frontend**: Implements React components
4. **Next.js**: Integrates into App Router
5. **Playwright**: Writes E2E tests
6. **Storybook**: Documents components

---

## Configuration

### Plugin Settings

**File**: `.claude/settings.json`

```json
{
  "plugins": {
    "specweave-ui": {
      "enabled": true,
      "defaults": {
        "frontend_framework": "react",  // or "vue", "angular"
        "test_framework": "playwright",
        "design_tool": "figma"
      }
    }
  }
}
```

**Note**: Browserbase is NOT auto-loaded. See "Browserbase (OPTIONAL)" section above for manual setup.

---

## FAQ

### Q: Do I need all 7 skills?

**A**: No! Skills auto-activate based on your project.
- React project? Only `frontend` and `nextjs` activate
- Playwright tests? Only `e2e-playwright` activates
- Design work? Only `figma-*` and `design-system-architect` activate

### Q: Can I disable specific skills?

**A**: Yes, via settings:
```json
{
  "plugins": {
    "specweave-ui": {
      "skills": {
        "figma-designer": { "enabled": false }
      }
    }
  }
}
```

### Q: Does this work without SpecWeave?

**A**: Yes! This is a **native Claude Code plugin**. Install it directly:
```bash
/plugin install specweave-ui
```

### Q: How much context does this use?

**A**:
- **All skills loaded**: ~8K tokens
- **Typical usage** (2-3 skills active): ~3K tokens
- **vs. Monolithic** (loading all 44 skills): 50K tokens

**Result**: **84-94% context reduction** vs. old architecture.

### Q: Can I contribute skills?

**A**: Yes! Submit a PR:
1. Add skill to `src/plugins/specweave-ui/skills/`
2. Update `plugin.json` provides list
3. Add tests in `test-cases/`
4. Update this README

---

## Community Extensions

### Available Community Skills

- **specweave-ui-mobile** - React Native, Flutter, SwiftUI
- **specweave-ui-3d** - Three.js, WebGL, 3D visualization
- **specweave-ui-animation** - Framer Motion, GSAP, Lottie

**Install**:
```bash
/plugin marketplace add specweave-community
/plugin install specweave-ui-mobile
```

---

## Support

- **Documentation**: https://spec-weave.com/plugins/ui
- **Issues**: https://github.com/anton-abyzov/specweave/issues
- **Discussions**: https://github.com/anton-abyzov/specweave/discussions

---

## License

MIT © Anton Abyzov

---

🎨 **SpecWeave UI Plugin** - Complete UI/UX toolkit for AI-assisted development
