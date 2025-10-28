# Figma Workflow Enhancement - Specification

**Status**: backlog
**Priority**: P2 (high value, but not blocking core framework)
**Created**: 2025-10-28

## Overview

Enhance SpecWeave's Figma integration to support a complete design-to-code workflow: create reusable components in Figma (design system approach), convert to production-ready React components, and validate with Storybook.

## Problem Statement

**Current State**:
- Four separate skills exist (`figma-designer`, `figma-implementer`, `figma-to-code`, `figma-mcp-connector`)
- Only supports Framelink MCP (read-only, design-to-code focus)
- Limited bidirectional workflow (can't create/modify Figma designs programmatically)
- Manual workflow gaps between design system creation and code generation
- No automated Storybook validation pipeline

**User Pain Points**:
1. Can't programmatically create Figma components (must use Figma UI)
2. No atomic design workflow (atoms → molecules → organisms in Figma, then to code)
3. Storybook setup is manual
4. No visual regression testing baseline
5. Design tokens sync is one-directional (Figma → Code only)

## Goals

**Primary Goals**:
1. **Bidirectional Figma Integration**: Read AND write Figma designs programmatically
2. **Atomic Design Workflow**: Build reusable component hierarchy in Figma, then convert to code
3. **Automated Storybook Pipeline**: Generate stories, run visual regression, validate accessibility
4. **Design System Roundtrip**: Figma ↔ Code ↔ Storybook in single workflow

**Success Criteria**:
- ✅ Can create Figma components via MCP (using claude-talk-to-figma-mcp)
- ✅ Can build complete design system (tokens → atoms → molecules → organisms) in Figma
- ✅ Can convert entire Figma file to React component library
- ✅ Storybook automatically configured with all components
- ✅ Visual regression baseline captured
- ✅ Accessibility tests pass (0 violations)
- ✅ >95% visual match between Figma and rendered components

## MCP Server Analysis

### Framelink MCP (GLips) - Read-Only Focus

**Repository**: https://github.com/GLips/Figma-Context-MCP
**Stars**: ~11.5k | **Forks**: ~929

**Capabilities**:
- ✅ Read Figma files (layouts, styles, metadata)
- ✅ Simplify API responses for AI consumption
- ✅ Extract design tokens
- ✅ Generate code from frames
- ❌ Cannot create/modify Figma designs

**Best For**: Design-to-code conversion (one-way)

**Integration**: Already supported in `figma-mcp-connector`

**Technical Details**:
- TypeScript-based (98.5%)
- Uses official Figma Developer API
- Requires FIGMA_ACCESS_TOKEN
- Published as `figma-developer-mcp` NPM package

### claude-talk-to-figma-mcp (arinspunk) - Bidirectional

**Repository**: https://github.com/arinspunk/claude-talk-to-figma-mcp

**Capabilities**:
- ✅ Read Figma files (document structure, selections, styles)
- ✅ **Create components** (rectangles, frames, text, shapes)
- ✅ **Modify designs** (colors, effects, auto-layout, styles)
- ✅ **Component operations** (clone, group, create instances)
- ✅ **Typography control** (fonts, sizing, weights, spacing)
- ✅ Export assets as images
- ✅ Access team libraries

**Requirements**:
- Figma Desktop app
- Bun runtime
- WebSocket server (port 3055)
- Figma plugin installed

**Architecture**:
- 3-layer system: MCP Server + WebSocket Server + Figma Plugin
- Messages routed via WebSocket between AI and Figma
- Executes commands within Figma's context

**Best For**: Full design automation (bidirectional)

**Integration**: NEW - Must add to `figma-mcp-connector`

## Proposed Solution

### Architecture Overview

```
User Request: "Create authentication UI with design system"
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Design System Creation (Figma)                     │
├─────────────────────────────────────────────────────────────┤
│ design-system-architect → figma-designer                     │
│   ↓ Define tokens                                            │
│   ↓ Create atoms (Button, Input, Typography)                │
│   ↓ Build molecules (FormField, Card)                       │
│   ↓ Compose organisms (LoginForm, RegisterForm)             │
│                                                               │
│ Output: Figma file with complete design system              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Code Generation (React + TypeScript)               │
├─────────────────────────────────────────────────────────────┤
│ figma-mcp-connector → figma-to-code → figma-implementer     │
│   ↓ Read Figma file                                          │
│   ↓ Extract design tokens                                    │
│   ↓ Parse component hierarchy                                │
│   ↓ Generate TypeScript interfaces                           │
│   ↓ Create React components (atoms → molecules → organisms) │
│   ↓ Generate Tailwind/CSS styles                            │
│                                                               │
│ Output: src/components/ + src/design-tokens/                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Storybook Validation                               │
├─────────────────────────────────────────────────────────────┤
│ figma-implementer → Storybook                                │
│   ↓ Generate stories for all components                     │
│   ↓ Configure Storybook (addons: a11y, docs, interactions) │
│   ↓ Start Storybook server                                  │
│   ↓ Run accessibility tests (axe-core)                      │
│   ↓ Capture visual regression baseline (Chromatic/Percy)    │
│   ↓ Validate pixel-perfect match with Figma                 │
│                                                               │
│ Output: Storybook site + test reports                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Enhancements (Summary)

1. **figma-mcp-connector**: Dual MCP support (Framelink + claude-talk-to-figma), auto-detection, unified interface
2. **figma-designer**: Programmatic component creation, design system builder, atom/molecule/organism builders
3. **figma-to-code**: Enhanced hierarchy parsing, TypeScript interface generation, prop mapping
4. **figma-implementer**: Automated Storybook setup, story generation, validation pipeline (a11y + visual regression)

## User Experience Flow

**User Input**: "Create authentication UI with design system and Storybook validation"

**SpecWeave Response**:

```
🔷 SpecWeave Active - Figma Workflow Enhancement

Phase 1: Creating design system in Figma...
  ✅ Design tokens defined (colors, typography, spacing)
  ✅ Created 8 atom components (Button, Input, Typography)
  ✅ Created 4 molecule components (FormField, Card)
  ✅ Created 2 organism components (LoginForm, RegisterForm)
  📐 Figma file: https://figma.com/file/ABC123/Authentication-Design-System

Phase 2: Generating React components...
  ✅ Extracted design tokens → src/design-tokens/
  ✅ Generated 8 atoms → src/components/atoms/
  ✅ Generated 4 molecules → src/components/molecules/
  ✅ Generated 2 organisms → src/components/organisms/

Phase 3: Setting up Storybook...
  ✅ Storybook configured with addons
  ✅ Generated 14 stories
  ✅ Storybook running at http://localhost:6006

Phase 4: Running validation...
  ✅ Accessibility: 0 violations
  ✅ Visual regression: 14 screenshots captured
  ✅ Figma match: 97% accuracy

✅ Complete! Your authentication UI is ready.

Deliverables:
- Figma design system: https://figma.com/file/ABC123/...
- React component library: src/components/
- Storybook: http://localhost:6006
- Validation report: tests/visual/report.html
```

**Time**: ~5 minutes (vs 2-3 hours manual)

## Technical Requirements

### New Dependencies

```json
{
  "devDependencies": {
    "@storybook/react": "^7.6.0",
    "@storybook/addon-a11y": "^7.6.0",
    "@storybook/addon-docs": "^7.6.0",
    "@storybook/addon-interactions": "^7.6.0",
    "@storybook/test": "^7.6.0",
    "@playwright/test": "^1.40.0",
    "axe-core": "^4.8.0",
    "ws": "^8.15.0"
  }
}
```

### MCP Configuration

Users must install at least ONE Figma MCP server:

**Option 1: Framelink MCP** (read-only, easiest):
```json
{
  "mcpServers": {
    "figma-framelink": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "${FIGMA_ACCESS_TOKEN}"
      }
    }
  }
}
```

**Option 2: claude-talk-to-figma-mcp** (bidirectional, more setup):
```json
{
  "mcpServers": {
    "figma-bidirectional": {
      "command": "bun",
      "args": ["run", "/path/to/claude-talk-to-figma-mcp/src/index.ts"],
      "env": {
        "FIGMA_WEBSOCKET_URL": "ws://localhost:3055"
      }
    }
  }
}
```

## Validation Criteria

**Figma Creation** (if using bidirectional MCP):
- ✅ All design tokens defined as Figma variables
- ✅ Components follow atomic design hierarchy
- ✅ All variants and properties configured
- ✅ Auto-layout used for responsive components

**Code Generation**:
- ✅ TypeScript with strict mode
- ✅ All prop types exported
- ✅ Components match Figma structure
- ✅ Design tokens used (no hardcoded values)
- ✅ Accessibility attributes present

**Storybook Validation**:
- ✅ All components have stories
- ✅ Accessibility tests: 0 violations
- ✅ Visual match with Figma: >95%
- ✅ All variants/states demonstrated

## Test Cases

**TC-001**: Create design system in Figma (bidirectional MCP)
**TC-002**: Convert Figma design to React components
**TC-003**: Generate Storybook stories
**TC-004**: Validate accessibility (0 violations)
**TC-005**: Visual regression baseline

## Out of Scope

**Not Included**:
- ❌ Vue/Svelte support (React/Angular only)
- ❌ CSS-in-JS (Tailwind/CSS Modules only)
- ❌ Chromatic/Percy integration (Playwright only)
- ❌ Real-time sync (one-time conversion only)

**Future Enhancements**:
- Bidirectional sync (code changes → Figma updates)
- Design system versioning
- Component usage analytics

## Dependencies

**Blocked By**: None (independent feature)

**Requires**:
- Existing Figma skills (figma-designer, figma-implementer, figma-to-code, figma-mcp-connector)
- User must install at least one Figma MCP server

## Acceptance Criteria

**Must Have**:
- [ ] figma-mcp-connector supports both MCPs
- [ ] figma-designer creates components in Figma (bidirectional)
- [ ] figma-to-code generates TypeScript interfaces
- [ ] figma-implementer sets up Storybook automatically
- [ ] Accessibility tests pass (0 violations)
- [ ] Visual regression baselines captured
- [ ] 3+ test cases per skill

**Nice to Have**:
- [ ] Design system showcase story
- [ ] Component usage docs auto-generated
- [ ] Workflow completes in <5 minutes

## References

- [Framelink MCP Repository](https://github.com/GLips/Figma-Context-MCP)
- [claude-talk-to-figma-mcp Repository](https://github.com/arinspunk/claude-talk-to-figma-mcp)
- [Figma API Documentation](https://www.figma.com/developers/api)
- [Storybook Documentation](https://storybook.js.org/)
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
