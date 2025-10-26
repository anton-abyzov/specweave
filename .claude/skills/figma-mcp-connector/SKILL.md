---
name: figma-mcp-connector
description: Connects to Figma MCP servers (official and community) to read/write Figma files, extract design tokens, and manage design resources. Wrapper for both official Figma MCP (desktop/remote) and community Framelink MCP. Activates for figma file, figma api, figma mcp, read figma, figma data, figma variables.
---

# Figma MCP Connector Skill

This skill provides a unified interface to Figma MCP servers (official and community).

## Prerequisites

1. **Figma API Token** (required)
   - Get from: https://www.figma.com/developers/api#access-tokens
   - Set as environment variable: `FIGMA_ACCESS_TOKEN`

2. **MCP Server** (choose one):
   - **Official Figma MCP**: Desktop app (local) or remote (https://mcp.figma.com/mcp)
   - **Community Framelink MCP**: npm package `figma-developer-mcp`

## Setup

### Option 1: Official Figma MCP (Desktop)

**Requirements**:
- Figma desktop app installed
- Dev/Full seat with Professional/Organization/Enterprise plan

**Configuration** (`.claude/mcp.json`):
```json
{
  "mcpServers": {
    "figma": {
      "url": "http://127.0.0.1:3845/mcp"
    }
  }
}
```

### Option 2: Official Figma MCP (Remote)

**Configuration** (`.claude/mcp.json`):
```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp",
      "headers": {
        "X-Figma-Token": "${FIGMA_ACCESS_TOKEN}"
      }
    }
  }
}
```

### Option 3: Community Framelink MCP

**Install**:
```bash
npm install -g figma-developer-mcp
```

**Configuration** (`.claude/mcp.json`):
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

## Operations

### Read Figma File

**Input**: Figma file URL
**Process**: Parse URL → Extract file ID → Call MCP `getFile(fileId)` → Extract components/variables/styles
**Output**: File metadata (components, variables, styles)

### Read Figma Component

**Input**: Component URL or ID
**Process**: Parse URL → Extract file ID + node ID → Call MCP `getNode(fileId, nodeId)` → Extract properties/variants
**Output**: Component metadata (properties, variants, styles)

### Extract Design Tokens

**Input**: Figma file URL
**Process**: Get file variables → Map to Style Dictionary format → Generate tokens.json
**Output**: tokens.json with all design tokens

### Generate Code from Frame

**Input**: Frame URL
**Process**: Extract frame layout/styles → Call MCP `generateCode(frameUrl)` → Return code
**Output**: Code string (HTML/CSS/React/etc.)

## Error Handling

**Common errors**:
- Invalid Figma token → Request user to set `FIGMA_ACCESS_TOKEN`
- File not found → Verify URL and permissions
- Rate limit → Wait and retry
- MCP server offline → Check connection

## Usage Examples

### Example 1: Read Design System
```typescript
const figmaUrl = "https://figma.com/file/ABC123/Design-System";
const file = await figmaMCP.getFile(figmaUrl);
const tokens = await figmaMCP.extractTokens(file);
// tokens.json generated
```

### Example 2: Generate Component Code
```typescript
const componentUrl = "https://figma.com/file/ABC123?node-id=1:23";
const component = await figmaMCP.getNode(componentUrl);
const code = await figmaMCP.generateCode(component);
// React component code
```

## Integration with Agents

**figma-designer agent**: Uses this skill to create Figma files, add components/variables
**figma-implementer agent**: Uses this skill to read Figma files, extract design data

## Test Cases

See `test-cases/` for validation scenarios.
