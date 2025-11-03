# Marketplace Architecture Problem Analysis

**Date**: 2025-11-02
**Issue**: Plugin commands not visible in `/specweave` command
**Root Cause**: Architectural duplication and incomplete marketplace structure

---

## 🔍 Current State (BROKEN)

### File Structure
```
specweave/
├── agents/               ← ROOT LEVEL (23 agents) - v0.5.0 Claude native
├── commands/             ← ROOT LEVEL (23 commands) - v0.5.0 Claude native
├── skills/               ← ROOT LEVEL (48 skills) - v0.5.0 Claude native
│
├── .claude/              ← DUPLICATE for development ❌
│   ├── agents/           ← Same content as root agents/
│   ├── commands/         ← Same content as root commands/
│   └── skills/           ← Same content as root skills/
│
├── src/
│   └── commands/         ← OLD location (pre-v0.5.0) ❌
│
└── marketplace/
    ├── marketplace.json  ← References NON-EXISTENT src/plugins/ ❌
    └── (no .claude-plugin/ folder)
```

### Problems

1. **Triple Duplication**:
   - Root level: `agents/`, `commands/`, `skills/`
   - Developer mode: `.claude/agents/`, `.claude/commands/`, `.claude/skills/`
   - Old source: `src/commands/` (partial)

2. **Broken Marketplace References**:
   ```json
   {
     "plugins": [
       {
         "name": "specweave-github",
         "source": "../src/plugins/specweave-github"  // ← DOESN'T EXIST!
       }
     ]
   }
   ```

3. **Missing Plugin Structure**:
   - No `src/plugins/` folder at all
   - No `.claude-plugin/` subfolder in marketplace
   - Plugin commands isolated and never loaded

4. **Command Loading Issue**:
   - `/specweave` command loads from `.claude/commands/`
   - Only sees core commands (no plugins)
   - Plugin commands never installed

---

## ✅ Desired State (MARKETPLACE-FIRST)

### File Structure
```
specweave/
├── .claude-plugin/               ← NEW: Claude Code native plugin manifest
│   └── plugin.json               ← SpecWeave itself as a plugin
│
├── agents/                       ← Core framework agents
├── commands/                     ← Core framework commands
├── skills/                       ← Core framework skills
│
├── plugins/                      ← NEW: Plugin library (moved from src/plugins)
│   ├── specweave-github/
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   ├── agents/
│   │   └── commands/
│   └── specweave-translator/    ← Future plugins
│
├── marketplace/
│   └── marketplace.json          ← References ./plugins/* (relative paths)
│
└── (NO .claude/ folder in root) ← Use marketplace for loading
```

### Key Changes

1. **Remove `.claude/` from root**:
   - Not needed when SpecWeave uses its own marketplace
   - Eliminates duplication
   - Forces dogfooding of plugin system

2. **Move plugins to root level**:
   - `src/plugins/` → `plugins/`
   - Consistent with agents/commands/skills at root
   - Easier relative path references

3. **Update marketplace.json**:
   ```json
   {
     "plugins": [
       {
         "name": "specweave-core",
         "source": ".",
         "description": "Core SpecWeave framework"
       },
       {
         "name": "specweave-github",
         "source": "./plugins/specweave-github",
         "description": "GitHub integration"
       }
     ]
   }
   ```

4. **Add `.claude-plugin/plugin.json` at root**:
   - Makes SpecWeave itself a Claude Code plugin
   - Enables `/plugin install specweave@local`
   - Allows marketplace-based loading

---

## 🎯 Benefits

### For Development
- ✅ **Dogfooding**: SpecWeave uses its own plugin system
- ✅ **Single source of truth**: Marketplace is the loader
- ✅ **No duplication**: One copy of each skill/agent/command
- ✅ **Easier testing**: Test as users would use it

### For Users
- ✅ **Plugin commands visible**: All commands in `/specweave`
- ✅ **Consistent loading**: Everything via marketplace
- ✅ **Easier updates**: `claude plugin update specweave`
- ✅ **Better discoverability**: Plugin system works as designed

### For Contributors
- ✅ **Clearer structure**: Root = source, no `.claude/` confusion
- ✅ **Simpler setup**: `claude plugin marketplace add ./marketplace`
- ✅ **Better isolation**: Each plugin self-contained
- ✅ **Easier plugin creation**: Clear template to follow

---

## 📋 Migration Steps

### Phase 1: Create Plugin Structure
1. Create `plugins/` folder at root
2. Create `plugins/specweave-github/` (even if empty initially)
3. Add `.claude-plugin/plugin.json` to each plugin

### Phase 2: Update Marketplace
1. Create marketplace `.claude-plugin/` folder
2. Update marketplace.json with correct paths
3. Add core framework as "specweave-core" plugin

### Phase 3: Remove Duplicates
1. Delete `.claude/` from root
2. Update `.gitignore` to ignore `.claude/` entirely
3. Remove `src/commands/` (if still present)

### Phase 4: Update Loading Logic
1. Update adapters to load from marketplace
2. Update install scripts to use marketplace paths
3. Test command visibility

### Phase 5: Documentation
1. Update CLAUDE.md with new structure
2. Add development mode setup guide
3. Document plugin creation process

---

## 🚨 Critical Path

**Must complete in order:**
1. Create plugin structure → Marketplace update → Remove duplicates → Test

**Cannot:**
- Remove `.claude/` before marketplace is working
- Update marketplace.json before plugins exist
- Test until adapters are updated

---

## ✅ Success Criteria

**Command Visibility**:
```bash
/specweave
# Should show:
# - Core commands (list-increments, progress, inc, next, done, sync-docs)
# - GitHub plugin commands (github-create-issue, github-sync, etc.)
# - Translator plugin commands (when added)
```

**Development Mode**:
```bash
# In SpecWeave repo:
claude plugin marketplace add ./marketplace
claude plugin install specweave-core@specweave
claude plugin install specweave-github@specweave

# Should work exactly like user installation
```

**User Installation**:
```bash
# From NPM:
npm install -g specweave
specweave init my-project

# Should install via marketplace, all commands visible
```

---

## 📊 Estimated Effort

| Phase | Tasks | Time | Risk |
|-------|-------|------|------|
| Create Plugin Structure | 3 tasks | 2 hours | Low |
| Update Marketplace | 4 tasks | 3 hours | Medium |
| Remove Duplicates | 2 tasks | 1 hour | Low |
| Update Loading Logic | 5 tasks | 4 hours | High |
| Documentation | 3 tasks | 2 hours | Low |
| **Total** | **17 tasks** | **12 hours** | **Medium** |

**Risk Factors**:
- Adapter loading logic changes (may break existing installations)
- Testing across all adapters (Claude/Cursor/Copilot/Generic)
- Ensuring backward compatibility

**Mitigation**:
- Keep old loading logic as fallback
- Test each adapter independently
- Document migration path for users

---

## 🎯 Implementation Order

1. ✅ **Create this analysis document**
2. Create plugin structure (`plugins/specweave-github/`)
3. Update marketplace.json with correct paths
4. Add `.claude-plugin/plugin.json` at root
5. Test marketplace loading in dev mode
6. Remove `.claude/` folder once confirmed working
7. Update adapters to use marketplace paths
8. Test command visibility
9. Update documentation
10. Close increment

---

**Status**: Analysis complete, ready to proceed with implementation
**Next**: Create plugin structure and update marketplace
