# SpecWeave Plugin Marketplace

Official Claude Code marketplace for SpecWeave plugins.

## Installation

### Claude Code Users

**Option 1: Install from Marketplace** (Native)

```bash
# Add SpecWeave marketplace
/plugin marketplace add specweave/marketplace

# Install plugins
/plugin install specweave-github@specweave

# Enable plugin
/plugin enable specweave-github@specweave
```

**Option 2: Local Development** (Testing)

```bash
# Add local marketplace
/plugin marketplace add ./marketplace

# Install from local
/plugin install specweave-github@marketplace
```

### All Other Tools (Cursor, Copilot, Generic)

Use SpecWeave CLI:

```bash
# Install via SpecWeave CLI
specweave plugin install github

# Plugins will be automatically compiled to:
# - Cursor: AGENTS.md
# - Copilot: .github/copilot/instructions.md
# - Generic: SPECWEAVE-MANUAL.md
```

## Available Plugins

### specweave-github (v1.0.0)

**Description**: GitHub Issues integration for SpecWeave increments. Bidirectional sync between SpecWeave increments and GitHub Issues.

**Provides**:
- 2 skills: `github-sync`, `github-issue-tracker`
- 1 agent: `github-manager` (GitHub CLI specialist)
- 4 commands: `/specweave.github.create-issue`, `/specweave.github.sync`, `/specweave.github.close-issue`, `/specweave.github.status`

**Auto-detects**: `.git/` folder + `github.com` remote + `GITHUB_TOKEN` env var

**Installation**:
```bash
/plugin install specweave-github@specweave
```

## Plugin Development

### Creating a New Plugin

See [Plugin Development Guide](../src/plugins/README.md) for detailed instructions.

### Dual Manifest Requirement

All SpecWeave plugins support **BOTH** Claude Code native and SpecWeave custom formats:

```
your-plugin/
├── .claude-plugin/
│   ├── plugin.json          # Claude Code native (required)
│   └── manifest.json         # SpecWeave custom (required)
├── skills/
├── agents/
└── commands/
```

**Why both?**
- `plugin.json` = Claude Code native support (best UX for Claude users)
- `manifest.json` = SpecWeave features (auto-detection, triggers, multi-tool compilation)

### Publishing to Marketplace

1. Create your plugin in `src/plugins/your-plugin/`
2. Add both `plugin.json` and `manifest.json`
3. Test locally: `/plugin marketplace add ./marketplace`
4. Add entry to `marketplace/.claude-plugin/marketplace.json`
5. Submit PR to SpecWeave repository

## Architecture Decision

This hybrid approach is documented in:
- [ADR-0015: Hybrid Plugin System](../.specweave/docs/internal/architecture/adr/0015-hybrid-plugin-system.md)

**Key Benefits**:
- ✅ Claude Code users get native experience
- ✅ Cursor/Copilot users still get plugins (via compilation)
- ✅ Can import community Claude Code plugins
- ✅ Maintains "works with any tool" promise

## Migration Path

### From SpecWeave v0.3.x (pre-plugins)

Your existing installation is already modular! Just enable plugins:

```bash
specweave plugin enable github
```

### From Claude Code Native Plugins

To use SpecWeave plugins in Claude Code:

```bash
# Add SpecWeave marketplace
/plugin marketplace add specweave/marketplace

# Install any SpecWeave plugin
/plugin install specweave-github@specweave
```

## License

MIT - See [LICENSE](../LICENSE)

## Links

- **Documentation**: https://spec-weave.com
- **GitHub**: https://github.com/anton-abyzov/specweave
- **Issues**: https://github.com/anton-abyzov/specweave/issues

---

**Version**: 1.0.0
**Last Updated**: 2025-10-31
**Increment**: 0004-plugin-architecture
