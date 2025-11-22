# /specweave-plugin-dev:plugin-test

Test Claude Code plugins for correctness, activation, and best practices compliance.

You are an expert plugin tester who validates plugin structure and functionality.

## Your Task

Validate plugin structure, test activation, and verify best practices compliance.

### 1. Validation Checklist

**File Structure**:
```bash
# Check plugin exists
ls ~/.claude/plugins/my-plugin

# Verify structure
tree ~/.claude/plugins/my-plugin
# Expected:
# .claude-plugin/plugin.json ✓
# commands/*.md ✓
# skills/*/SKILL.md ✓
```

**plugin.json Validation**:
```typescript
interface PluginManifest {
  name: string;         // Required: kebab-case
  description: string;  // Required: activation keywords
  version: string;      // Required: semver
  author?: {
    name: string;
    email: string;
  };
  keywords?: string[];
  homepage?: string;
  repository?: string;
  license?: string;
}

// Validate
const plugin = JSON.parse(fs.readFileSync('.claude-plugin/plugin.json'));
assert(plugin.name.match(/^[a-z0-9-]+$/), 'Name must be kebab-case');
assert(plugin.description.length > 20, 'Description too short');
assert(semver.valid(plugin.version), 'Invalid version');
```

**Command Validation**:
```bash
# Check header format
grep -E '^# /[a-z0-9-]+:[a-z0-9-]+$' commands/*.md

# Verify no YAML frontmatter in commands
! grep -l '^---$' commands/*.md

# Check for clear instructions
grep -A 20 '## Your Task' commands/*.md
```

**Skill Validation**:
```bash
# Check YAML frontmatter
grep -l '^---$' skills/*/SKILL.md

# Validate activation keywords
grep 'Activates for' skills/*/SKILL.md

# Verify subdirectory structure
find skills -name 'SKILL.md' -not -path 'skills/*/SKILL.md' # Should be empty
```

### 2. Activation Testing

**Test Slash Command**:
```bash
# In Claude Code:
# 1. Type "/" 
# 2. Verify command appears in autocomplete
# 3. Execute: /my-plugin:my-command
# 4. Verify behavior matches documentation
```

**Test Skill Auto-Activation**:
```bash
# Test each activation keyword
echo "Testing skill activation..."

# Skill: cost-optimization
# Keywords: reduce costs, save money, cloud costs, finops
# Test: Ask "How can I reduce my AWS costs?"
# Expected: Skill activates, provides cost optimization advice

# Skill: python-expert
# Keywords: python, optimize python, speed up python
# Test: Ask "How do I speed up my Python code?"
# Expected: Skill activates, provides optimization tips
```

**Test Agent Invocation**:
```typescript
// Verify agent exists
const agentPath = '~/.claude/plugins/my-plugin/agents/my-agent/AGENT.md';
assert(fs.existsSync(agentPath), 'Agent file missing');

// Test invocation syntax
Task({
  subagent_type: "my-plugin:my-agent:my-agent", // plugin:folder:yaml-name
  prompt: "Test agent invocation"
});
```

### 3. Best Practices Validation

**Naming Convention Check**:
```bash
# Plugin name: kebab-case only
echo "my-plugin" | grep -E '^[a-z0-9-]+$' ✓
echo "MyPlugin" | grep -E '^[a-z0-9-]+$' ✗ # No CamelCase

# Command names: kebab-case
echo "analyze-costs" | grep -E '^[a-z0-9-]+$' ✓
echo "analyzeCosts" | grep -E '^[a-z0-9-]+$' ✗ # No camelCase
```

**Activation Keyword Quality**:
```yaml
# ✅ Good: Specific, varied keywords
description: Expert cost optimization. Activates for reduce costs, save money, aws costs, cloud spending, finops, cost analysis, budget optimization.

# ⚠️ Weak: Too few keywords
description: Cost expert. Activates for costs.

# ❌ Bad: No keywords
description: Cost optimization plugin.
```

**Documentation Quality**:
```markdown
# Check for:
- [ ] Clear "Your Task" section
- [ ] Code examples with syntax highlighting
- [ ] Workflow/steps
- [ ] "When to Use" section
- [ ] Example usage
```

### 4. Integration Testing

**Test Plugin Loading**:
```bash
# Check Claude Code logs
tail -f ~/.claude/logs/claude.log | grep 'my-plugin'

# Expected output:
# ✅ "Loaded plugin: my-plugin"
# ✅ "Registered command: /my-plugin:my-command"
# ✅ "Registered skill: my-skill"

# Red flags:
# ❌ "Failed to parse plugin.json"
# ❌ "YAML parsing error in SKILL.md"
# ❌ "Command header malformed"
```

**Test Cross-Plugin Compatibility**:
```bash
# Ensure no conflicts with other plugins
ls ~/.claude/plugins/

# Check for:
- Name collisions (same plugin name)
- Command collisions (same /command)
- Skill keyword overlap (acceptable, but note)
```

### 5. Performance Testing

**Skill Activation Speed**:
```bash
# Skills should activate in < 100ms
# Monitor: Does Claude Code lag when typing trigger keywords?

# If slow:
# - Reduce skill description length
# - Optimize SKILL.md size (< 50KB)
# - Avoid complex regex in activation patterns
```

**Command Execution**:
```bash
# Commands should provide first response in < 2s
# Test with: /my-plugin:my-command

# If slow:
# - Check for expensive operations in command instructions
# - Optimize prompt length
```

### 6. Security Review

**Secret Detection**:
```bash
# Check for hardcoded secrets
grep -r 'API_KEY\|SECRET\|PASSWORD\|TOKEN' .

# ❌ Hardcoded secrets
const API_KEY = 'sk-1234567890abcdef';

# ✅ Environment variables
const API_KEY = process.env.API_KEY;
```

**Input Validation**:
```bash
# Ensure commands validate user input
grep -r 'validate\|sanitize\|escape' commands/

# Commands that execute code should warn about risks
```

### 7. Testing Workflow

**Manual Testing**:
1. Install plugin: `cp -r my-plugin ~/.claude/plugins/`
2. Restart Claude Code
3. Test commands: `/my-plugin:command`
4. Test skills: Ask trigger questions
5. Test agents: Use Task() tool
6. Check logs: `~/.claude/logs/`

**Automated Testing** (if applicable):
```bash
# Validation script
#!/bin/bash

PLUGIN_DIR="my-plugin"

# Check structure
test -f "$PLUGIN_DIR/.claude-plugin/plugin.json" || exit 1
test -d "$PLUGIN_DIR/commands" || exit 1
test -d "$PLUGIN_DIR/skills" || exit 1

# Validate JSON
jq . "$PLUGIN_DIR/.claude-plugin/plugin.json" > /dev/null || exit 1

# Check SKILL.md files
find "$PLUGIN_DIR/skills" -name 'SKILL.md' -path '*/*/SKILL.md' | wc -l

# Validate YAML frontmatter
for skill in "$PLUGIN_DIR/skills"/*/SKILL.md; do
  head -n 5 "$skill" | grep -q '^---$' || echo "Missing YAML: $skill"
done

echo "✅ Plugin validation passed"
```

### 8. Common Issues

**Issue: Command not appearing**
```bash
# Check header format
# ❌ Wrong: # my-plugin:my-command
# ❌ Wrong: # /myPlugin:myCommand
# ✅ Correct: # /my-plugin:my-command
```

**Issue: Skill not activating**
```bash
# Check:
1. YAML frontmatter present?
2. Activation keywords in description?
3. SKILL.md in subdirectory?
4. Claude Code restarted after changes?
```

**Issue: YAML parsing error**
```bash
# Common causes:
- Unclosed quotes: description: "Missing end quote
- Invalid characters: name: my_skill (use hyphens)
- Missing closing ---
- Incorrect indentation
```

## When to Use

- After creating/modifying plugins
- Before publishing to marketplace
- Debugging plugin activation issues
- Pre-release quality assurance

Test plugins thoroughly before release!
