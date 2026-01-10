# SpecWeave Hookify Templates

Pre-configured [Hookify](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/hookify) rules for SpecWeave conventions.

## Installation

Copy desired templates to your project's `.claude/` directory:

```bash
# Copy all templates
cp plugins/specweave/templates/hookify/*.local.md .claude/

# Or copy specific templates
cp plugins/specweave/templates/hookify/hookify.block-metadata-status.local.md .claude/
```

## Available Templates

| Template | Action | Purpose |
|----------|--------|---------|
| `hookify.block-metadata-status.local.md` | block | Prevents direct metadata.json edits to status |
| `hookify.warn-root-files.local.md` | warn | Warns when creating markdown files at project root |
| `hookify.block-force-push.local.md` | block | Blocks force push to main/master branches |
| `hookify.block-secrets.local.md` | block | Blocks hardcoded API keys and tokens |
| `hookify.warn-dangerous-rm.local.md` | warn | Warns on dangerous rm -rf commands |
| `hookify.require-tests.local.md` | warn | Reminds to run tests before commit (disabled by default) |

## Customization

Edit any template to adjust:
- `enabled: true/false` - Turn rule on/off
- `action: warn/block` - Warning vs hard block
- `pattern:` - Regex pattern to match

## Hookify Commands

| Command | Purpose |
|---------|---------|
| `/hookify` | Analyze conversation for patterns to create rules |
| `/hookify [description]` | Create rule from description |
| `/hookify:list` | List all active rules |
| `/hookify:configure` | Enable/disable rules interactively |

## Learn More

- [Hookify Plugin Documentation](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/hookify)
- [ADR-0226: Claude Code Plugin Integration](../../.specweave/docs/internal/architecture/adr/0226-claude-code-official-plugin-integration.md)
