# ADR-0015: Hybrid Plugin System (Claude Code Native + SpecWeave Custom)

> **⚠️ CURRENT STATUS (2025-11-03): SUPERSEDED**
>
> **This ADR documents a hybrid approach that was initially proposed but later simplified.**
>
> **Final Implementation**: SpecWeave uses **ONLY Claude Code's native plugin system** (plugin.json).
> - ✅ Claude Code: Native plugin.json format only
> - ❌ NO custom manifest.json (removed)
> - ❌ NO hybrid dual-manifest approach (simplified)
> - ❌ NO SpecWeave custom plugin system (abandoned)
>
> **Rationale for Change**:
> - Claude Code is the primary target tool (95%+ of users)
> - Maintaining two manifest formats added unnecessary complexity
> - Other tools (Cursor, Copilot, Generic) work via AGENTS.md compilation regardless
> - Simplicity > flexibility for a feature that was rarely used
>
> This document remains for historical reference to understand the decision-making process.

---

**Status**: Superseded
**Date**: 2025-10-31 (Original), 2025-11-03 (Superseded)
**Context**: Increment 0004 - Plugin Architecture
**Deciders**: Core Team
**Technical Story**: Plugin distribution and multi-tool compatibility

## Context and Problem Statement

SpecWeave v0.4.0 introduced a custom plugin system with:
- Custom manifest format (`.claude-plugin/manifest.json`)
- Custom installation (`specweave plugin install`)
- Multi-tool adapters (Claude Code, Cursor, Copilot, Generic)

However, Anthropic released native plugin support for Claude Code with:
- Native manifest format (`.claude-plugin/plugin.json`)
- Native commands (`/plugin marketplace add`, `/plugin install`)
- Marketplace-based distribution

**The Core Dilemma**: Should we migrate to Claude Code's native system or keep our custom implementation?

**Key Tension**:
- Claude Code native = best experience for Claude users, but **breaks multi-tool support** (Cursor, Copilot, Generic)
- SpecWeave custom = works with all tools, but **misses Claude Code native benefits**

## Decision Drivers

1. **Multi-Tool Promise**: SpecWeave's core value proposition is "Works with ANY tool, best with Claude Code"
2. **Claude Code Native Benefits**: Better UX for majority of users (Claude Code is primary target)
3. **Community Plugins**: Ability to import existing Claude Code marketplace plugins
4. **Backward Compatibility**: Don't break existing SpecWeave plugins
5. **Maintainability**: Avoid maintaining two completely separate systems

## Considered Options

### Option A: Migrate to Claude Code Native Only

**Description**: Drop SpecWeave's custom plugin system entirely, use only Claude Code native.

**Pros**:
- ✅ Best Claude Code experience (native `/plugin` commands)
- ✅ Leverage Anthropic's marketplace ecosystem
- ✅ Simpler codebase (no custom plugin manager)
- ✅ Automatic updates via marketplace

**Cons**:
- ❌ **BREAKS multi-tool support** (Cursor, Copilot, Generic)
- ❌ **Violates core promise** ("works with any tool")
- ❌ Forces 40-85% of users to switch to Claude Code
- ❌ Loses SpecWeave's unique differentiator

**Decision**: ❌ REJECTED - Breaks core value proposition

### Option B: Keep SpecWeave Custom Only

**Description**: Ignore Claude Code native, continue with SpecWeave-only system.

**Pros**:
- ✅ Multi-tool support maintained (Claude, Cursor, Copilot, Generic)
- ✅ Full control over plugin lifecycle
- ✅ No migration needed
- ✅ Backward compatible

**Cons**:
- ❌ Claude Code users miss native benefits
- ❌ Can't leverage Anthropic marketplace
- ❌ Can't import community Claude Code plugins
- ❌ Duplicate effort vs industry standard
- ❌ Fragmentation (SpecWeave plugins vs Claude plugins)

**Decision**: 🟡 ACCEPTABLE but not optimal

### Option C: Hybrid Approach (SELECTED)

**Description**: Support BOTH Claude Code native AND SpecWeave custom systems via dual manifests and smart detection.

**Architecture**:
```
src/plugins/specweave-github/
├── .claude-plugin/
│   ├── plugin.json          # Claude Code native format
│   └── manifest.json         # SpecWeave custom format
├── skills/
├── agents/
└── commands/
```

**Installation Flow**:
```
Claude Code User:
  Option 1: /plugin marketplace add specweave/marketplace
            /plugin install github
            → Native Claude Code installation

  Option 2: specweave plugin install github
            → SpecWeave CLI installation (still works)

Cursor User:
  Only option: specweave plugin install github
               → Compiles to AGENTS.md

Copilot User:
  Only option: specweave plugin install github
               → Compiles to instructions.md
```

**Pros**:
- ✅ **Claude Code users get native experience** (best of both worlds)
- ✅ **Multi-tool support maintained** (Cursor, Copilot, Generic still work)
- ✅ **Can import community plugins** from Claude Code marketplace
- ✅ **Backward compatible** (existing code continues working)
- ✅ **Future-proof** (adapts to Anthropic's direction)

**Cons**:
- ⚠️ Slightly more complex (maintain two manifest formats)
- ⚠️ Dual distribution channels (SpecWeave + marketplace)
- ⚠️ Need sync logic between formats

**Decision**: ✅ SELECTED - Best balance of all factors

## Decision Outcome

**Chosen option**: **Option C - Hybrid Approach**

### Implementation Strategy

#### Phase 1: Dual-Format Support (v0.4.1 - Immediate)

**Goal**: Make existing plugins compatible with Claude Code native.

**Changes**:
1. Add `plugin.json` alongside `manifest.json` in all plugins
2. Keep both formats in sync (automated conversion)
3. Update docs with both installation methods
4. Test `/plugin install` with SpecWeave plugins

**Timeline**: This week (part of 0004 increment)

**Risk**: Low - Additive only, no breaking changes

#### Phase 2: Marketplace Publication (v0.5.0 - Next Release)

**Goal**: Publish SpecWeave plugins to Claude Code marketplace.

**Changes**:
1. Create `specweave/marketplace` GitHub repository
2. Structure per Claude Code marketplace format:
   ```
   specweave/marketplace/
   ├── .claude-plugin/
   │   └── marketplace.json
   ├── plugins/
   │   ├── specweave-github/
   │   ├── specweave-jira/
   │   └── ...
   └── README.md
   ```
3. Publish to marketplace
4. Update installation docs

**Timeline**: Next sprint (2-3 weeks)

**Risk**: Medium - New distribution channel

#### Phase 3: Community Plugin Bridge (v0.7.0 - Future)

**Goal**: Import existing Claude Code marketplace plugins into SpecWeave.

**Changes**:
1. Implement `specweave plugin import-from-claude <marketplace> <plugin>`
2. Auto-convert Claude Code plugins to SpecWeave format
3. Enable AGENTS.md compilation for Cursor/Copilot
4. Create compatibility layer

**Example**:
```bash
# Import wshobson's observability plugin
specweave plugin import-from-claude wshobson/agents observability

# SpecWeave:
# - Downloads from Claude Code marketplace
# - Validates compatibility
# - Installs natively (Claude Code) OR compiles (Cursor/Copilot)
```

**Timeline**: 2-3 months

**Risk**: High - Complex conversion logic

### Manifest Format Mapping

**Claude Code Native** (`plugin.json`):
```json
{
  "name": "specweave-github",
  "description": "GitHub Issues integration for SpecWeave",
  "version": "1.0.0",
  "author": {
    "name": "SpecWeave Team"
  }
}
```

**SpecWeave Custom** (`manifest.json`):
```json
{
  "$schema": "https://spec-weave.com/schemas/plugin-manifest.json",
  "name": "specweave-github",
  "version": "1.0.0",
  "description": "GitHub Issues integration for SpecWeave...",
  "author": "SpecWeave Team",
  "license": "MIT",
  "specweave_core_version": ">=0.4.0",
  "auto_detect": { ... },
  "provides": { ... },
  "triggers": [ ... ]
}
```

**Sync Strategy**:
- `manifest.json` is **source of truth** (more detailed)
- `plugin.json` is **generated** from `manifest.json` (subset)
- Build script: `npm run generate-plugin-json`

### Adapter Changes

**Claude Adapter** (Enhanced):
```typescript
// Detection order:
1. Check for native Claude Code plugin (/plugin list)
2. If found, use native commands
3. Else, fall back to SpecWeave CLI
4. Install to .claude/ either way
```

**Cursor/Copilot Adapters** (Unchanged):
```typescript
// Only SpecWeave CLI works
// Compile to AGENTS.md as before
```

**Generic Adapter** (Unchanged):
```typescript
// Manual workflows only
// Compile to SPECWEAVE-MANUAL.md
```

### Compatibility Matrix

| Tool | Native /plugin | SpecWeave CLI | AGENTS.md | Quality |
|------|----------------|---------------|-----------|---------|
| **Claude Code** | ✅ Primary | ✅ Fallback | N/A | ⭐⭐⭐⭐⭐ (100%) |
| **Cursor** | ❌ No | ✅ Only option | ✅ Compiled | ⭐⭐⭐⭐ (85%) |
| **Copilot** | ❌ No | ✅ Only option | ✅ Compiled | ⭐⭐⭐ (60%) |
| **Generic** | ❌ No | ✅ Only option | ✅ Compiled | ⭐⭐ (40%) |

### Documentation Updates

**User-Facing** (README.md, docs site):
```markdown
## Installing Plugins

### Claude Code (Recommended)

**Option 1: Native Marketplace** (Best experience)
```bash
/plugin marketplace add specweave/marketplace
/plugin install github
```

**Option 2: SpecWeave CLI** (Also works)
```bash
specweave plugin install github
```

### Cursor, Copilot, or Other Tools
```bash
specweave plugin install github
```
Plugins will be compiled to AGENTS.md automatically.
```

**Contributor-Facing** (CLAUDE.md):
- Document dual manifest requirement
- Add `generate-plugin-json` script
- Update plugin creation guide

## Consequences

### Positive

1. **✅ Best of Both Worlds**: Claude Code users get native experience, others get multi-tool support
2. **✅ Future-Proof**: Aligned with Anthropic's direction, but not locked in
3. **✅ Community Leverage**: Can import existing Claude Code plugins
4. **✅ Backward Compatible**: No breaking changes for existing users
5. **✅ Maintains Differentiation**: SpecWeave still unique (multi-tool support)

### Negative

1. **⚠️ Maintenance Overhead**: Two manifest formats to keep in sync
2. **⚠️ Documentation Complexity**: Two installation methods to explain
3. **⚠️ Testing Burden**: Test both native and CLI installation paths
4. **⚠️ Conversion Logic**: Need robust conversion between formats

### Neutral

1. **🔄 Dual Distribution**: Both SpecWeave registry and Claude marketplace
2. **🔄 Mixed Ecosystem**: Some plugins SpecWeave-only, some Claude-only, some both

## Compliance

### Standards Adherence

- ✅ **Claude Code Plugin Standard**: `plugin.json` follows Anthropic spec exactly
- ✅ **SpecWeave Standard**: `manifest.json` maintains richer metadata
- ✅ **Markdown Format**: Skills/agents/commands unchanged (both systems use same)
- ✅ **Directory Structure**: Compatible with both systems

### License Considerations

- MIT license maintained (compatible with Claude Code marketplace)
- Attribution required for imported community plugins
- Clear documentation of plugin origins

## Related Decisions

- **ADR-0006**: Plugin Architecture (foundational decision for 0004)
- **ADR-0002**: Context Loading Efficiency (plugin system reduces context)
- **ADR-0003**: Multi-Tool Support (hybrid maintains this principle)

## References

- [Claude Code Plugin Documentation](https://docs.claude.com/en/docs/claude-code/plugins)
- [Anthropic Plugin Announcement](https://www.anthropic.com/news/claude-code-plugins)
- [SpecWeave Plugin System](../../../README.md#plugin-architecture)
- Increment 0004: `.specweave/increments/0004-plugin-architecture/`

## Notes

- This decision was made during increment 0004 after discovering Claude Code's native plugin system
- The hybrid approach maintains SpecWeave's core promise while embracing industry standards
- Implementation begins immediately as part of 0004 (Phase 1)
- Future phases will be separate increments with their own specs/plans

---

**Date**: 2025-10-31
**Status**: Accepted
**Approvers**: Core Team
**Supersedes**: None
**Superseded By**: None (current)
