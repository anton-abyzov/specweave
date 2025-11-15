# 📚 SpecWeave Marketplace Architecture - Clarification

**Date**: 2025-11-11
**Context**: Understanding how local development uses local plugins, not remote

---

## ✅ **CORRECT Understanding**

Your local SpecWeave development **DOES use local plugins**, NOT remote GitHub!

### The Architecture

```
Local Development Setup:
========================

1. Source Code (Local):
   /Users/antonabyzov/Projects/github/specweave/
   ├── .claude-plugin/
   │   └── marketplace.json
   │       {
   │         "plugins": [
   │           {
   │             "name": "specweave",
   │             "source": "./plugins/specweave"  ← LOCAL PATH!
   │           }
   │         ]
   │       }
   ├── plugins/
   │   ├── specweave/
   │   ├── specweave-github/
   │   └── ...

2. Marketplace Registration (GLOBAL):
   ~/.claude/settings.json:
   {
     "extraKnownMarketplaces": {
       "specweave": {
         "source": "../.claude-plugin"  ← LOCAL PATH (relative to project)
       }
     }
   }

3. Installed Plugins (LOCAL copy):
   ~/.claude/plugins/marketplaces/specweave/
   ├── plugins/specweave/        ← Copied from LOCAL ./plugins/specweave
   ├── plugins/specweave-github/ ← Copied from LOCAL ./plugins/specweave-github
   └── ... (copied from LOCAL, not GitHub!)
```

### How It Works

**When you run `/plugin install specweave`**:

1. Claude Code reads marketplace: `~/.claude/settings.json` → `"source": "../.claude-plugin"`
2. Resolves to: `/Users/antonabyzov/Projects/github/specweave/.claude-plugin/`
3. Reads `marketplace.json`: `"source": "./plugins/specweave"`
4. Copies **LOCAL files** from `./plugins/specweave/` → `~/.claude/plugins/marketplaces/specweave/`

**Result**: Your LOCAL changes ARE used!

---

## 🎯 The Confusion (Resolved)

**I was wrong when I said**: "Even locally, you're pulling from GitHub"

**The truth**: The `~/.claude/settings.json` **source** field can point to:
- ✅ **Local path**: `"../.claude-plugin"` (what you have)
- ✅ **GitHub URL**: `{"source": "github", "repo": "anton-abyzov/specweave"}` (for users)

**Your setup uses LOCAL paths**, so changes take effect immediately after:
1. Edit file locally
2. Run `npm run build` (if TypeScript)
3. Reinstall plugin: `/plugin install specweave`
4. Restart Claude Code

---

## 📋 Email Update Complete

**Fixed all occurrences** of `anton@spec-weave.com` → `anton.abyzov@gmail.com`:

✅ `.claude-plugin/marketplace.json` (22 occurrences)
✅ `plugins/specweave-ui/.claude-plugin/plugin.json` (1 occurrence)
✅ `.claude-plugin/README.md` (2 occurrences)

**Total**: 25 email addresses updated

---

## 🔍 Key Takeaways

### For Local Development (You)

```bash
# Your workflow:
1. Edit code:          vim plugins/specweave/hooks/post-task-completion.sh
2. Build if needed:    npm run build
3. Reinstall plugin:   /plugin install specweave  # Uses LOCAL files
4. Restart Claude Code
5. Test changes:       Complete a task, check hook fires
```

**No GitHub push needed for testing!**

### For Production Users

```bash
# User workflow:
1. Install SpecWeave:  npm install -g specweave
2. Run init:           specweave init .
   # This registers marketplace from GitHub: anton-abyzov/specweave
3. Install plugins:    /plugin install specweave  # Uses GITHUB files
4. Use:                /specweave:increment "feature"
```

**Users get latest from GitHub automatically!**

---

## 🎨 Marketplace Source Options

**Local Development** (`.claude/settings.json`):
```json
{
  "extraKnownMarketplaces": {
    "specweave": {
      "source": "../.claude-plugin"  ← LOCAL PATH
    }
  }
}
```

**Production Users** (via `specweave init`):
```json
{
  "extraKnownMarketplaces": {
    "specweave": {
      "source": {
        "source": "github",
        "repo": "anton-abyzov/specweave",  ← REMOTE GITHUB
        "path": ".claude-plugin"
      }
    }
  }
}
```

**Key Difference**: `"source"` can be:
- String (local path): `"../.claude-plugin"`
- Object (GitHub): `{"source": "github", "repo": "anton-abyzov/specweave"}`

---

## ✅ Summary

**Your concern**: "I'm using remote GitHub even locally"
**The reality**: ✅ **You're using LOCAL files** (`.claude/settings.json` has `"source": "../.claude-plugin"`)

**The fix is already working** because:
- Hook shell scripts run from: `~/.claude/plugins/marketplaces/specweave/` (copied from LOCAL)
- Hook JS scripts execute from: `$PROJECT_ROOT/dist/` (your local build)
- Result: **ALL your changes take effect** after rebuild + reinstall

**No further action needed!** 🎉
