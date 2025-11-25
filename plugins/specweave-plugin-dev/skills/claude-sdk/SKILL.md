---
name: claude-sdk
description: Expert knowledge of Claude Code SDK, API, tools (Read, Write, Edit, Bash, Grep, Glob), agent tools (Task, Skill, SlashCommand), plugin hooks, MCP integration, and Claude Code extension development. Activates for claude sdk, claude api, claude tools, Read tool, Write tool, Edit tool, Task tool, Skill tool, claude hooks, MCP, claude code api.
---

# Claude SDK Expert

Expert knowledge of Claude Code SDK, tools, and extension development.

## Core Tools

**File Operations**:
```typescript
// Read files
Read({ file_path: '/absolute/path/file.ts' });

// Write files (creates new or overwrites)
Write({
  file_path: '/absolute/path/file.ts',
  content: 'export const hello = () => "world";'
});

// Edit files (precise replacements)
Edit({
  file_path: '/absolute/path/file.ts',
  old_string: 'const x = 1;',
  new_string: 'const x = 2;'
});
```

**Search**:
```typescript
// Find files by pattern
Glob({ pattern: '**/*.ts' });

// Search file contents
Grep({
  pattern: 'TODO',
  output_mode: 'files_with_matches'
});

// Search with context
Grep({
  pattern: 'function.*export',
  output_mode: 'content',
  '-C': 3, // 3 lines before/after
  '-n': true // Line numbers
});
```

**Execution**:
```typescript
// Run commands
Bash({
  command: 'npm test',
  description: 'Run test suite'
});

// Background processes
Bash({
  command: 'npm run dev',
  run_in_background: true
});
```

## Agent Tools

**Sub-agents**:
```typescript
// Invoke specialized sub-agent
Task({
  subagent_type: 'plugin:agent-folder:agent-name',
  prompt: 'Analyze this architecture'
});
```

**Skills**:
```typescript
// Activate skill explicitly
Skill({ skill: 'skill-name' });

// Or let auto-activation handle it
```

**Commands**:
```typescript
// Execute slash command
SlashCommand({ command: '/plugin:command arg1 arg2' });
```

## Plugin Hooks

**Available Hook Events**:
```typescript
type HookEvent =
  | 'PostToolUse'        // After tool executes
  | 'PreToolUse'         // Before tool executes
  | 'PermissionRequest'  // User permission dialog
  | 'Notification'       // System notification
  | 'UserPromptSubmit'   // After user submits prompt
  | 'Stop'               // Conversation stopped
  | 'SubagentStop'       // Sub-agent stopped
  | 'PreCompact'         // Before context compaction
  | 'SessionStart'       // Session started
  | 'SessionEnd';        // Session ended
```

**Hook Configuration**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [{
          "type": "command",
          "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task.sh",
          "timeout": 10
        }]
      }
    ]
  }
}
```

## MCP (Model Context Protocol)

> **Code-First Preferred**: Anthropic research shows [code execution achieves 98% token reduction vs MCP](https://www.anthropic.com/engineering/code-execution-with-mcp). Use MCP only for: quick debugging, Claude Desktop integration, or tools with no code equivalent. For automation, CI/CD, and production - write code instead.

**MCP Server Integration** (when needed):
```typescript
// Connect to MCP server
const mcp = await connectMCP({
  name: 'filesystem',
  transport: 'stdio',
  command: 'node',
  args: ['mcp-server-filesystem.js']
});

// Use MCP tools
mcp.call('read_file', { path: '/path/to/file' });
```

## Best Practices

**Tool Usage**:
- Use absolute paths (not relative)
- Handle errors gracefully
- Provide clear descriptions
- Batch independent operations

**Performance**:
- Minimize tool calls
- Use Grep before Read (search first)
- Parallel independent operations
- Cache results when possible

**Security**:
- Validate file paths
- Sanitize user input
- No hardcoded secrets
- Use environment variables

Build powerful Claude Code extensions!
