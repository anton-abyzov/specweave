# Proposal: Emphasize "Programmable Skills" as Core Differentiator

## The Key Insight

**Skills are like programs, but you control them.**

Traditional software:
- ❌ Code is obfuscated and unchangeable
- ❌ You're stuck with developer's implementation
- ❌ Can't customize behavior without forking source code

SpecWeave skills:
- ✅ Transparent skill logic in SKILL.md
- ✅ Customizable through skill-memories/*.md
- ✅ Add your own logic/rules without touching source
- ✅ Learn and improve from your corrections

**This is revolutionary** - it's like having source code access to every tool you use, but even better because Claude reads and applies your customizations automatically.

---

## Proposed Changes

### 1. README.md - Add Prominent Section (After "Why SpecWeave")

```markdown
## 🎛️ Programmable Skills - The SpecWeave Advantage

**Skills are like programs, but you control them.**

Unlike traditional software where you're stuck with what the developer built, SpecWeave skills are **fully customizable**:

**Traditional Software** 🔒
```typescript
// Obfuscated, compiled, unchangeable
function doSomething() {
  // You can't change this behavior
  // You're stuck with developer's decisions
}
```

**SpecWeave Skills** 🎨
```markdown
# .specweave/skill-memories/frontend.md

### Component Preferences
- Always use our `Button` component from `@/components/ui`
- Never use inline styles - use Tailwind utilities
- Forms must use React Hook Form with Zod validation

### Custom Display Logic
When showing docs:
- Filter out examples unless user asks for them
- Show TypeScript examples before JavaScript
- Prioritize internal docs over external links
```

**How it works:**
1. **Skills** define behavior in SKILL.md (like source code)
2. **You customize** through skill-memories/*.md (your rules layer)
3. **Claude applies both** - skill logic + your customizations
4. **Auto-learning** - corrections become permanent knowledge

**Example: Customizing the Frontend Skill**

```bash
# During development
You: "Generate a login form"
Claude: *creates form with useState*
You: "No, we always use React Hook Form with Zod"

# SpecWeave learns this correction
# Saves to .specweave/skill-memories/frontend.md

# Next session
You: "Generate a signup form"
Claude: *automatically uses React Hook Form + Zod*
```

**Why this matters:**
- 🎯 **No vendor lock-in** - customize every skill to match YOUR patterns
- 🧠 **Self-improving** - corrections become permanent knowledge
- 🔍 **Transparent** - see exactly what skills do
- 🎨 **Extensible** - add logic the original developer never imagined

**Compare this to Copilot, Cursor, or any code assistant:**
- They suggest code, but you can't customize HOW they think
- SpecWeave skills expose their reasoning AND let you modify it
- Your corrections persist across sessions, not just within one chat

This is the power of **programmable skills** - you're not just using tools, you're **programming the tools themselves**.
```

---

### 2. YouTube Script - Reframe the Reflect Section (Line ~1309)

**Current approach:** Focuses on "learning from corrections"
**New approach:** Frame it as "programmable skills" first

```markdown
## [34:30] Programmable Skills - The SpecWeave Advantage

**[Point to skill-memories directory]**

> "Here's something most people miss about SpecWeave. It's hiding in plain sight."

**[OPEN .specweave/skill-memories/frontend.md]**

> "Skills aren't just prompts. They're programs. And like any program, you can customize them.

**[CONTRAST VISUALIZATION]**

**Traditional Software:**
```
┌─────────────────┐
│ Compiled Binary │  ← You can't change this
│   (Obfuscated)  │
└─────────────────┘
```

**SpecWeave Skills:**
```
┌──────────────┐     ┌─────────────────┐
│  SKILL.md    │  +  │ skill-memories/ │
│ (Base Logic) │     │ (Your Rules)    │
└──────────────┘     └─────────────────┘
         ↓                    ↓
    ┌─────────────────────────────┐
    │   Claude applies both       │
    │   = Customized behavior     │
    └─────────────────────────────┘
```

**[REAL EXAMPLE]**

> "Let me show you what this looks like in practice."

**[TYPE in Claude]**
```
User: "Generate a login form"
Claude: *creates form with useState*
User: "No, we always use React Hook Form with Zod validation"
```

**[SHOW the learning being captured]**

> "Watch what happens. SpecWeave detects this correction. It extracts the learning:
> 'Frontend skill should use React Hook Form with Zod for forms.'

> It saves this to `.specweave/skill-memories/frontend.md`."

**[CAT .specweave/skill-memories/frontend.md]**

```markdown
### Form Handling
- Use React Hook Form for all forms
- Combine with Zod for validation schemas
- Never use plain useState for form state
```

> "Next session, you start fresh. But this knowledge persists."

**[NEW SESSION - TYPE]**
```
User: "Generate a signup form"
Claude: *automatically uses React Hook Form + Zod*
```

> "No reminder needed. Claude reads the SKILL.md AND your customizations.
> You've programmed the skill to match your preferences."

**[DRIVE HOME THE DIFFERENTIATOR]**

> "This is fundamentally different from GitHub Copilot, Cursor, or any other code assistant.

> **They suggest code.** You can't change how they think.
> **SpecWeave skills expose their reasoning AND let you modify it.**

> Think about that. Every skill you use — frontend, backend, testing, security — is fully transparent and customizable.

> You're not locked into what the skill developer decided. You can add logic they never imagined. You can override behaviors you don't like.

> **Skills are programs. And you control the programs.**"

**[SHOW THE POWER - COMPLEX CUSTOMIZATION]**

> "Here's where it gets really powerful. You're not limited to simple preferences."

**[SHOW advanced customization example]**

```markdown
# .specweave/skill-memories/docs.md

### Custom Display Logic
When user invokes /sw:docs with no arguments:
1. Check if topic appears in recent conversation (last 10 messages)
2. If found, auto-load that topic instead of showing list
3. Filter examples unless user explicitly asks
4. Prioritize internal docs over public docs
```

> "This is custom LOGIC. Not just preferences. You're extending the skill's behavior.

> The original skill developer never thought of this. But you can add it. And it persists."

**[CONNECT TO AUTO MODE]**

> "When you combine this with auto mode, it's magical.

> Run `/sw:auto`, Claude works autonomously for hours. When it finishes, the session-end hook triggers Reflect automatically.

> Any corrections you made during autonomous work? Permanent learning.

> **Correct once. Never again.**"

**[SHOW THE COMMANDS]**

```bash
/sw:reflect         # Manual reflection after any session
/sw:reflect-on      # Enable auto-learning
/sw:reflect-status  # See what Claude has learned

# Check skill memories
ls .specweave/skill-memories/
cat .specweave/skill-memories/frontend.md
```

**[FINAL POINT]**

> "This is why SpecWeave is different. It's not just smarter. It's programmable.

> Every skill you use is a tool you can customize, extend, and improve.

> You're not using software. You're programming it to match your exact needs."
```

---

### 3. Quick Start - Expand "Self-Improving AI" Section

**Current:**
```markdown
**Self-Improving AI (Reflect)**
```bash
/sw:reflect-on    # Enable automatic learning from corrections
```
Claude will learn your patterns and preferences, getting smarter over time. [Learn more →](./guides/self-improving-skills)
```

**Proposed:**
```markdown
**🎛️ Programmable Skills - Customize Any Skill**

Skills aren't just prompts - they're **programs you can customize**:

**Example: Teaching the Frontend Skill Your Preferences**
```bash
# During development
You: "Generate a Button component"
Claude: *creates component with inline styles*
You: "No, use our design system from @/components/ui"

# SpecWeave automatically learns this
# Next time:
You: "Generate a Card component"
Claude: *uses @/components/ui automatically*
```

**Your customizations live here:**
```bash
.specweave/skill-memories/
├── frontend.md      # Frontend skill customizations
├── pm.md           # Product management preferences
├── tdd.md          # Testing approach overrides
└── general.md      # Cross-cutting rules
```

**Enable auto-learning:**
```bash
/sw:reflect-on      # Corrections become permanent knowledge
/sw:reflect-status  # See what Claude has learned
```

**Why this matters:**
- ✅ **Fully transparent** - see exactly what skills do (SKILL.md)
- ✅ **Fully customizable** - add YOUR rules (skill-memories/*.md)
- ✅ **Self-improving** - corrections persist across sessions
- ✅ **No vendor lock-in** - you control the behavior

Unlike Copilot or Cursor which you can't customize, SpecWeave skills are **programs you can reprogram**. [Learn more →](./guides/self-improving-skills)
```

---

### 4. Philosophy.md - Add New Core Principle

Insert after "Context Precision" (around line 93):

```markdown
### 6. Programmable Skills

**Skills are transparent programs you can customize.**

Unlike traditional software where code is compiled and unchangeable, SpecWeave skills are:

**Transparent**
- Skill logic defined in `SKILL.md` (like source code)
- You can read exactly what a skill does
- No black boxes, no vendor lock-in

**Customizable**
- Add YOUR rules in `.specweave/skill-memories/*.md`
- Override behavior without forking source
- Extend logic the original developer never imagined

**Self-Improving**
- Corrections during sessions become permanent knowledge
- Claude reads both SKILL.md and your customizations
- Auto-learning enabled with `/sw:reflect-on`

**Example: Customizing the Frontend Skill**

```markdown
# .specweave/skill-memories/frontend.md

### Component Preferences
- Always use our Button component from @/components/ui
- Never use inline styles - Tailwind utilities only

### Form Handling
- React Hook Form + Zod validation
- Display errors with toast notifications, not inline

### Custom Logic
When generating components:
1. Check design system first
2. Use composition over prop drilling
3. Extract logic to custom hooks if >50 lines
```

Next session, Claude automatically follows these rules - you've **programmed the skill** to match your needs.

**Compare to traditional tools:**
- **GitHub Copilot**: Suggests code, can't customize how it thinks
- **Cursor**: Similar - black box you can't modify
- **SpecWeave**: Exposes skill logic AND lets you customize it

**Why this matters:**
- 🎯 No vendor lock-in - you control behavior
- 🧠 Knowledge compounds - corrections persist forever
- 🔍 Full transparency - see what skills do
- 🎨 Infinite extensibility - add logic developers never planned

**Skills as Programs, Not Just Prompts**

Think of skill-memories as "runtime configuration" for Claude's expertise:
- SKILL.md = compiled program
- skill-memories/*.md = your configuration file
- Claude reads both and applies your overrides

This is the power of programmable AI - you're not just using tools, you're **programming the tools themselves**.
```

---

## Summary of Impact

| Location | Current | Proposed | Impact |
|----------|---------|----------|--------|
| **README** | No mention | Prominent section after "Why SpecWeave" | Immediate visibility for new users |
| **YouTube Script** | Buried in "Reflect" section | Reframed as "Programmable Skills" (34:30) | Clear differentiator vs competitors |
| **Quick Start** | Brief mention | Concrete example with code | Users understand immediately |
| **Philosophy** | Missing | New Core Principle #6 | Elevates to foundational concept |

---

## Key Messaging Points

1. **Skills are programs, not just prompts**
2. **You can customize them** (unlike traditional software)
3. **Transparent + Extensible** (unlike Copilot/Cursor)
4. **Self-improving** (corrections persist)
5. **No vendor lock-in** (you control behavior)

---

## Visual Assets Needed

For YouTube script:
1. **Contrast diagram** - Traditional software vs SpecWeave skills
2. **Before/After demo** - Same request with/without customization
3. **File tree** - Show skill-memories directory structure
4. **Logic flow** - How Claude reads SKILL.md + memories

---

## Next Steps

1. Review this proposal
2. Adjust messaging/examples as needed
3. Apply changes to:
   - README.md
   - docs-site/docs/guides/youtube-tutorial-script.md
   - docs-site/docs/quick-start.md
   - docs-site/docs/overview/philosophy.md
4. Create visual assets for YouTube
5. Update other marketing materials (landing page, etc.)
