# Figma Workflow Enhancement - Backlog Item

**Status**: backlog
**Priority**: P2
**Estimate**: 3-4 days
**Created**: 2025-10-28

## Overview

Enhance SpecWeave's Figma integration to support complete design-to-code-to-Storybook workflow with:
- Bidirectional Figma integration (read + write via MCP servers)
- Atomic design workflow (atoms → molecules → organisms)
- Automated Storybook setup and validation
- Visual regression testing + accessibility audits

## Key Components

1. **figma-mcp-connector**: Add support for claude-talk-to-figma-mcp (bidirectional) alongside existing Framelink MCP (read-only)
2. **figma-designer**: Programmatic component creation in Figma (when bidirectional MCP available)
3. **figma-to-code**: Enhanced parsing (component hierarchy, TypeScript interfaces, prop mapping)
4. **figma-implementer**: Automated Storybook setup + validation pipeline

## User Value

**Problem**: Current Figma workflow is manual and disconnected:
- Can't create reusable components in Figma programmatically
- No automated atomic design hierarchy
- Manual Storybook setup
- No validation pipeline

**Solution**: Complete automation:
- User: "Create authentication UI with design system"
- SpecWeave: Builds design system in Figma → Generates React components → Sets up Storybook → Validates accessibility → Captures visual baselines
- Time: < 5 minutes (vs 2-3 hours manual)

## Research Completed

- ✅ Analyzed two Figma MCP servers:
  - **Framelink MCP** (GLips): Read-only, design-to-code focus (~11.5k stars)
  - **claude-talk-to-figma-mcp** (arinspunk): Bidirectional, WebSocket-based, full CRUD
- ✅ Reviewed existing Figma skills (4 total)
- ✅ Created comprehensive specification (70+ pages)
- ✅ Created implementation plan (5 phases, 23 tasks)

## Documents Created

All analysis documents are saved in `.specweave/increments/_backlog/figma-enhancement-analysis/`:
- `spec.md` - Complete specification with problem statement, MCP analysis, architecture, test cases
- `plan.md` - 5-phase implementation plan with detailed tasks
- `tasks.md` - 23 tasks broken down by phase
- `context-manifest.yaml` - Context loading configuration

## Dependencies

**Blocked By**: None (independent feature)

**Requires**:
- Existing Figma skills (figma-designer, figma-implementer, figma-to-code, figma-mcp-connector)
- User must install at least one Figma MCP server

## When to Prioritize

**Start this increment when**:
1. Increment 0002 (Core Enhancements) is closed
2. WIP limit allows (current: 1/3 used)
3. User wants to improve Figma workflow

**Estimated Impact**: HIGH
- Enables complete design system workflow
- 10x faster than manual process
- Production-ready component libraries with Storybook + tests

## Next Steps

When ready to start:
1. Close increment 0002
2. Run `/create-increment "Figma Workflow Enhancement"` to create 0003
3. Copy analysis documents from `_backlog/figma-enhancement-analysis/` to `.specweave/increments/0003-figma-workflow-enhancement/`
4. Follow 5-phase implementation plan

---

**Note**: This backlog item was created after incorrectly creating increment 0003 while 0002 was still in-progress. Following proper SpecWeave workflow: analyze → backlog → wait for WIP slot → create increment.
