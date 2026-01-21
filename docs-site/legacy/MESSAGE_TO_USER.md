# Message for Your User - Copy/Paste Ready

---

## Short Version (Send This First)

Hey! I found the issue with your Node 22 upgrade.

**The Problem:**
When you use nvm to switch Node versions, all global npm packages get "lost" because each Node version has its own separate global packages directory.

**Quick Fix (30 seconds):**
```bash
nvm use 22
npm install -g specweave
npm install -g @anthropic-ai/claude-code
```

That's it! Your `specweave` and `claude` commands should work now.

**For Future Node Upgrades:**
Use this command instead to auto-copy all your global packages:
```bash
nvm install <new-version> --reinstall-packages-from=<old-version>

# Example:
nvm install 22 --reinstall-packages-from=18
```

This copies ALL global packages automatically - no manual reinstall needed!

---

## Long Version (If They Want Details)

### Why This Happened

nvm (Node Version Manager) isolates global packages per Node version. Here's what your system looks like:

```
~/.nvm/versions/node/
├── v18.20.0/
│   └── lib/node_modules/        ← Your old packages are HERE
│       ├── specweave/
│       ├── claude/
│       └── typescript/
│
└── v22.0.0/
    └── lib/node_modules/        ← Empty! (currently active)
```

When you ran `nvm use 22`, you switched to the Node 22 directory, which starts empty.

This is **by design** - nvm isolates each Node version to prevent conflicts. It's actually a good thing for professional development, but it catches people by surprise the first time!

---

### Better Solutions for Future

**Option 1: Auto-Copy During Install** (Easiest)
```bash
# Instead of:
nvm install 22
nvm use 22

# Do this:
nvm install 22 --reinstall-packages-from=18
```

This automatically copies ALL global packages from Node 18 to Node 22.

---

**Option 2: Backup Before, Restore After** (Most Reliable)

Before upgrading:
```bash
npm list -g --depth=0 --parseable | sed '1d' | awk '{gsub(/.*\//,"",$1); print}' > ~/.nvm-global-packages.txt
```

After upgrading:
```bash
nvm use 22
cat ~/.nvm-global-packages.txt | xargs npm install -g
```

---

**Option 3: Use a Helper Script** (Best Practice)

I can share a script that does backup/restore automatically if you want. Just ask!

---

### Prevention Tips

1. **Always use `--reinstall-packages-from` flag** when installing new Node versions
2. **Keep a list of your essential globals** in a file (like `~/.global-npm-packages.txt`)
3. **Set up auto-switch with .nvmrc** in your projects:
   ```bash
   echo "22" > .nvmrc
   # Now "nvm use" auto-switches to correct version
   ```

---

### Verify Your Fix Worked

```bash
# Check Node version
node --version
# Should show: v22.x.x

# Check that commands work
specweave --version
claude --version

# List all current global packages
npm list -g --depth=0
```

---

### Full Documentation

I've added comprehensive guides to SpecWeave documentation:
- Quick fix guide (1 page, copy/paste commands)
- Full runbook (complete nvm reference)
- Updated installation guide with this warning

Once SpecWeave docs are published, you'll find them at:
`https://spec-weave.com/guides/getting-started/nvm-global-packages-fix`

---

### Common Globals to Reinstall

If you had other global packages you use regularly:

```bash
# TypeScript
npm install -g typescript ts-node

# Linters/Formatters
npm install -g eslint prettier

# Build Tools
npm install -g webpack-cli vite

# Utilities
npm install -g nodemon npm-check-updates
```

---

Let me know if you need any help or have questions!

---

**TL;DR:**
```bash
nvm use 22
npm install -g specweave @anthropic-ai/claude-code
```

Done! 🚀
