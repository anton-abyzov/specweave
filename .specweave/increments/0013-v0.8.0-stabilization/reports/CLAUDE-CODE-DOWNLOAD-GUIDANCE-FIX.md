# Fix: Claude Code Download Guidance

## Problem

The `specweave init` command showed incorrect download instructions when Claude Code CLI was not found:

```
❌ WRONG URL:
   → https://claude.com/code
```

This URL doesn't actually provide a download for Claude Code, causing user confusion.

## Solution

Updated error message with **correct, actionable guidance**:

### What Changed

**Before** (init.ts:513):
- Pointed to non-existent URL `https://claude.com/code`
- Minimal instructions
- No verification steps

**After** (init.ts:513-545):
- ✅ Explains what Claude Code is: "CLI comes bundled with Claude Desktop app"
- ✅ Correct download URL: `https://claude.ai` (actual download page)
- ✅ Step-by-step instructions:
  - **Step 1**: Download Claude Desktop (visit claude.ai, sign in, click Download)
  - **Step 2**: Install the app (platform-specific: macOS, Windows, Linux)
  - **Step 3**: Verify installation (`claude --version`)
  - **Step 4**: Re-run initialization (`specweave init`)
- ✅ Alternative options clearly explained
- ✅ Helpful tip: Restart terminal if command not found

### User Experience Improvement

**Old message** (confusing):
```
1️⃣  Install Claude Code (Recommended):
   → https://claude.com/code
   → Once installed, re-run: specweave init
```

**New message** (clear, actionable):
```
1️⃣  Install Claude Desktop (Recommended):

   Step 1: Download Claude Desktop
           → Visit: https://claude.ai
           → Sign in with your account
           → Click "Download" in the navigation

   Step 2: Install the app (includes CLI automatically)
           → macOS: Drag to Applications folder
           → Windows: Run the installer
           → Linux: Follow installation instructions

   Step 3: Verify installation
           → Open new terminal window
           → Run: claude --version
           → Should show version number (e.g., 0.1.0)

   Step 4: Re-run initialization
           → specweave init

💡 Tip: The `claude` command should be available globally after
   installing Claude Desktop. If not, restart your terminal.
```

## Files Changed

1. **src/cli/commands/init.ts** (lines 502-546)
   - Replaced misleading URL with correct download process
   - Added step-by-step installation guide
   - Added verification instructions
   - Added helpful tips

## Testing

Build completed successfully:
```bash
npm install  # ✅ Passed
npm run build  # ✅ Passed (TypeScript compiled)
```

## Impact

- **Users**: Clear guidance on how to actually install Claude Code CLI
- **Support**: Fewer support requests about installation
- **UX**: Better first-time experience with SpecWeave

## Related

- Issue: User feedback about incorrect download URL
- Context: SpecWeave init command (specweave init)
- Platform: Cross-platform (macOS, Windows, Linux)
