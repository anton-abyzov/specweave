# Why API Key is Needed - Technical Explanation

**Your Question**: "Why do you need API key? I guess if user has Claude Code tool installed, whether it's Mac or Windows, I think it should be available in terminal, right?"

**Short Answer**: You're 100% right to question this! Let me explain the technical constraint and the solution we implemented.

---

## 🤔 The Core Problem

### What You Expected (Reasonable!)
```
User in Claude Code terminal
   ↓
Runs: /specweave:inc "Добавить чат-бот"
   ↓
Files generated in Russian
   ↓
Hook fires → asks Claude (me!) to translate
   ↓
I translate → files now in English
✅ Done (no API key needed!)
```

**This makes perfect sense!** Claude Code is already running, so why external API?

### What Actually Happens (Technical Constraint)
```
User in Claude Code terminal
   ↓
Runs: /specweave:inc "Добавить чат-бот"
   ↓
PM agent generates files in Russian
   ↓
post-increment-planning.sh hook fires (NEW SUBPROCESS)
   ↓
Subprocess cannot "talk back" to Claude Code
   ↓
❌ I (Claude Code AI) cannot respond to subprocess output
   ↓
Hook finishes, files still in Russian
```

**The Issue**: Hooks run as **non-interactive subprocesses**. Even though Claude Code is running, the subprocess can't "call back" to me to get translations.

---

## 🔧 Technical Architecture

### How Hooks Work in Claude Code

**When you run `/specweave:inc`**:
```
[Main Claude Code Session]
  ├── User: /specweave:inc "feature"
  ├── Me (Claude): Generates files ✅
  └── Hook Fires:
       └── [NEW SUBPROCESS - ISOLATED]
            ├── bash post-increment-planning.sh
            ├── node translate-file.js
            └── ❌ Cannot access parent Claude Code AI
```

**Key Constraint**: The hook subprocess is **isolated** from the main Claude Code session. It can't "ask" me for help.

### Why Can't Subprocess Talk to Claude?

1. **Process Isolation**: bash subprocess ≠ Claude Code main process
2. **No IPC (Inter-Process Communication)**: No mechanism for hook → Claude
3. **Non-Interactive**: Hook runs to completion without user input
4. **No Claude Code SDK**: No official API for subprocess → Claude invocation

**Result**: For TRUE automation (no user intervention), we need external API call.

---

## ✅ What We Implemented

### Three-Mode System (Flexible!)

#### Mode 1: Automatic (With API Key) ⚡
```bash
# Setup once:
echo 'ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY' >> .specweave/secrets.env

# Then works automatically:
/specweave:inc "Добавить чат-бот"
# ✅ Files translated automatically (~2-3s, ~$0.0075)
```

**How it Works**:
- Hook detects API key in `.specweave/secrets.env`
- Makes direct API call to Anthropic
- Translation happens in subprocess (no manual intervention!)
- Cost: ~$0.0075 per increment (negligible)

#### Mode 2: Manual Translation (No API Key) 📝
```bash
# No API key needed
/specweave:inc "Добавить чат-бот"
# Files created with markers:
# <!-- ⚠️ AUTO-TRANSLATION PENDING -->
# <!-- Set ANTHROPIC_API_KEY in .specweave/secrets.env -->

# Then you manually translate:
/specweave:translate spec.md
# I (Claude) translate interactively ✅
```

**How it Works**:
- Hook adds clear markers to files
- You run `/specweave:translate` command
- I translate interactively (you're talking to me directly, not subprocess)

#### Mode 3: Silent (Disable Translation)
```json
// .specweave/config.json
{
  "translation": {
    "autoTranslateInternalDocs": false
  }
}
```

**How it Works**:
- Hook doesn't fire at all
- Files stay in your language
- You translate manually if needed

---

## 🔒 Secrets Management (Your Other Point!)

### You Said: "Make sure we have instructions, once LLM needs some secrets, it MUST tell user where and how to populate it!"

**100% AGREE!** Here's what we implemented:

### Clear Template File
```bash
# Located at: .specweave/secrets.env.template
cp .specweave/secrets.env.template .specweave/secrets.env
# Edit secrets.env with your API key
```

**Template includes**:
✅ Step-by-step instructions for EVERY secret
✅ Links to where to get keys
✅ Explanation of WHY each secret is needed
✅ Cost information
✅ Security best practices
✅ Clear examples

### Auto-Detection & Clear Errors
```bash
# If API key missing:
$ node dist/hooks/lib/translate-file.js spec.md

===============================================================================
❌ Missing Secret: ANTHROPIC_API_KEY
===============================================================================

📋 Context: Automatic translation in hooks

📝 Description: Anthropic API key for automatic translation

⚙️  Required: No (optional)

🔑 ANTHROPIC_API_KEY Setup Instructions:

WHY NEEDED:
  Enables automatic translation during increment creation.
  Without this key, translation requires manual intervention.

HOW TO GET IT:
  1. Visit: https://console.anthropic.com/
  2. Sign in or create account
  3. Navigate to "API Keys"
  4. Click "Create Key"
  5. Copy your key (starts with "sk-ant-api03-...")

WHERE TO PUT IT:
  Option A (Recommended): Create .specweave/secrets.env file
    1. Copy template: cp .specweave/secrets.env.template .specweave/secrets.env
    2. Edit .specweave/secrets.env
    3. Add line: ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY

  Option B: Set environment variable
    # macOS/Linux
    export ANTHROPIC_API_KEY="sk-ant-api03-YOUR-KEY"

COST:
  ~$0.0075 per increment (negligible)
  ~$0.15 per month (20 increments)

===============================================================================
💡 After setting up, retry the operation
===============================================================================
```

**Features**:
✅ Explains WHY API key is needed (subprocess constraint)
✅ Shows HOW to get it (step-by-step)
✅ Shows WHERE to put it (.specweave/secrets.env)
✅ Explains COST (negligible)
✅ Provides ALTERNATIVES (manual translation)

### Priority Order for Secrets
```
1. Check: process.env.ANTHROPIC_API_KEY
2. Check: .specweave/secrets.env
3. Fall back: Display helpful error
```

### Security
✅ `.specweave/secrets.env` is gitignored
✅ Template included (`.specweave/secrets.env.template`)
✅ Clear warnings about security
✅ Secrets NEVER in source code

---

## 💡 Why This Design is Best

### Your Concern: "Why not use Claude Code directly?"
**Answer**: We DO use you directly for interactive translation! But hooks need automation.

### The Tradeoff
| Approach | Pros | Cons |
|----------|------|------|
| **API Key** | ✅ Fully automatic<br>✅ No user intervention<br>✅ Works in CI/CD | ❌ Requires setup<br>❌ ~$0.0075 cost |
| **Interactive** | ✅ No API key needed<br>✅ Free | ❌ Manual step<br>❌ Doesn't work in hooks |
| **Disable** | ✅ No setup<br>✅ No cost | ❌ No translation<br>❌ Manual work |

### Best of Both Worlds
- **With API Key**: Fully automatic (~$0.0075 = essentially free)
- **Without API Key**: Manual but works (you translate via /specweave:translate)
- **User Choice**: Enable/disable per project

---

## 📋 Files Implemented

### 1. Secrets Template
**Location**: `.specweave/secrets.env.template`
**Purpose**: Step-by-step instructions for ALL secrets
**Features**:
- ANTHROPIC_API_KEY instructions
- GITHUB_TOKEN instructions
- JIRA_API_TOKEN instructions
- Clear examples
- Security warnings

### 2. Secrets Loader Utility
**Location**: `src/utils/secrets-loader.ts`
**Purpose**: Load secrets with priority (env > file)
**Features**:
- Auto-detects project root
- Parses .specweave/secrets.env
- Validates secret format
- Displays helpful errors
- Clear setup instructions

### 3. Updated Translation Scripts
**Location**: `src/hooks/lib/translate-file.ts`
**Purpose**: Use secrets-loader, provide clear errors
**Features**:
- Checks .specweave/secrets.env first
- Falls back to environment variable
- Displays WHY API key is needed (subprocess constraint)
- Shows WHERE to put secrets
- Provides alternatives

### 4. Updated .gitignore
**Location**: `.gitignore`
**Added**:
```gitignore
# SpecWeave secrets (v0.6.9+)
.specweave/secrets.env
**/secrets.env
!**/secrets.env.template
```

---

## 🎯 User Experience

### Setup (ONE TIME)
```bash
# 1. Copy template
cp .specweave/secrets.env.template .specweave/secrets.env

# 2. Get API key from https://console.anthropic.com/

# 3. Edit secrets.env
echo 'ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY' >> .specweave/secrets.env

# 4. Done! Now works automatically
```

### Daily Use
```bash
# Just work in your language - translation automatic!
/specweave:inc "Добавить чат-бот"

# Output:
✅ Increment created
🌐 Detected Russian content
🤖 Translating via Anthropic API...
  📄 spec.md... ✅ ($0.0028)
  📄 plan.md... ✅ ($0.0045)
  📄 tasks.md... ✅ ($0.0013)
✅ Translation complete! Cost: ~$0.0086
```

### Without API Key (Also Works!)
```bash
/specweave:inc "Добавить чат-бот"

# Output:
✅ Increment created

================================================================================
🌐 TRANSLATION REQUIRES API KEY (For Automatic Translation)
================================================================================

📋 CONTEXT:
   This script runs in a non-interactive hook (post-increment-planning).
   Even in Claude Code terminal, hooks run as subprocesses.
   Claude Code AI cannot respond to subprocess output in real-time.
   Therefore: External API call required for automatic translation.

💡 WHY NOT USE CLAUDE CODE DIRECTLY?
   Great question! When you run /specweave:inc:
   1. PM agent generates files in your language
   2. Hook fires (non-interactive subprocess)
   3. Hook needs to translate → but can't "call back" to Claude
   4. Solution: External API for true automation

[... detailed instructions follow ...]

🔄 ALTERNATIVE (Manual Translation):
   1. Files marked with translation markers
   2. Run: /specweave:translate spec.md
   3. Claude Code will translate interactively
```

---

## 🏁 Summary

### Your Questions Answered

**Q: "Why API key? Claude Code is already available!"**
**A**: Hooks run as isolated subprocesses. They can't "call back" to Claude Code AI. For true automation, we need external API. BUT: Manual translation (via you!) works without API key!

**Q: "Make sure we have instructions where to populate secrets!"**
**A**: ✅ Implemented!
- `.specweave/secrets.env.template` with step-by-step instructions
- Helpful error messages with WHERE to put secrets
- Clear validation and feedback
- Security best practices included

### Implementation Quality
✅ Three-mode system (automatic/interactive/manual)
✅ Clear secrets management
✅ Helpful error messages
✅ Security by default (gitignored)
✅ User choice (enable/disable)
✅ Explains WHY (subprocess constraint)
✅ Shows HOW (step-by-step)
✅ Shows WHERE (.specweave/secrets.env)
✅ Negligible cost (~$0.0075)

### Cost Reality
- **Per increment**: ~$0.0075 (less than a cent!)
- **Per month (20 increments)**: ~$0.15 (price of a coffee)
- **ROI**: Work in native language = priceless UX

**Bottom Line**: API key enables automation (~$0.0075), but framework works WITHOUT it via manual translation!

---

**Ready to use?** Copy `.specweave/secrets.env.template` and add your key, or use manual translation mode!
