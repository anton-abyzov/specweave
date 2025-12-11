---
name: specweave:translate
description: Translate SpecWeave project content to target language using LLM-native zero-cost translation
---

# /sw:translate - Batch Translation Command

You are being asked to translate SpecWeave project content to a target language.

## Your Role

Act as the **translator agent** to coordinate batch translation of project files.

## Context

SpecWeave supports **LLM-native i18n** - zero-cost translation using system prompt injection instead of external translation APIs. This command orchestrates translation of:

- Project instructions (CLAUDE.md, AGENTS.md)
- Increment specifications (.specweave/increments/*/spec.md, plan.md, tasks.md)
- Strategic documentation (.specweave/docs/internal/)
- Public documentation (.specweave/docs/public/)
- Skills, agents, commands (skills/, agents/, commands/)

## Supported Languages

- 🇬🇧 English (en) - Default
- 🇷🇺 Russian (ru) - Русский
- 🇪🇸 Spanish (es) - Español
- 🇨🇳 Chinese (zh) - 中文
- 🇩🇪 German (de) - Deutsch
- 🇫🇷 French (fr) - Français
- 🇯🇵 Japanese (ja) - 日本語
- 🇰🇷 Korean (ko) - 한국어
- 🇧🇷 Portuguese (pt) - Português

## Command Syntax

```bash
# Translate entire project
/sw:translate <target-language>

# Translate specific scope
/sw:translate <target-language> --scope <scope>

# Preview without writing
/sw:translate <target-language> --dry-run
```

**Examples**:
```bash
/sw:translate ru                          # Translate all to Russian
/sw:translate es --scope increments       # Only increment specs
/sw:translate zh --scope current          # Only current increment
/sw:translate de --dry-run                # Preview German translation
```

## Scopes

| Scope | What Gets Translated |
|-------|---------------------|
| `all` (default) | Everything (CLAUDE.md, specs, docs, skills, agents, commands) |
| `increments` | All increment files (.specweave/increments/*/) |
| `current` | Current increment only |
| `docs` | Documentation only (.specweave/docs/) |
| `skills` | Skills only (skills/*/) |
| `agents` | Agents only (agents/*/) |
| `commands` | Commands only (commands/*/) |
| `claude-md` | CLAUDE.md only |

## Your Workflow

### Step 1: Parse Command
```
Extract:
- Target language (required)
- Scope (default: all)
- Dry-run flag (default: false)

Validate:
- Target language is supported
- Scope is valid
- Project has translatable content
```

### Step 2: Discovery Phase
```
Scan project for translatable files based on scope:

If scope = all:
  - CLAUDE.md
  - AGENTS.md (if exists)
  - .specweave/increments/*/spec.md, plan.md, tasks.md
  - .specweave/docs/internal/**/*.md
  - .specweave/docs/public/**/*.md
  - skills/*/SKILL.md
  - agents/*/AGENT.md
  - commands/*.md

If scope = increments:
  - .specweave/increments/*/spec.md, plan.md, tasks.md

If scope = current:
  - Get current increment from tasks status
  - Translate only current increment files

[... and so on for other scopes ...]

Output:
📊 Translation Project Discovery
Target Language: [language] ([native name])
Scope: [scope]

Discovered Files:
- [count] project instructions
- [count] increment specs
- [count] internal docs
- [count] public docs
- [count] skills
- [count] agents
- [count] commands

Total: [count] files
Estimated Time: [X] minutes
```

### Step 3: Confirm with User (unless --dry-run)
```
**IMPORTANT**: Always confirm before translating:

"Proceed with translation? (Y/n)"

If dry-run:
  Show what WOULD be translated, exit
If user confirms:
  Proceed to Step 4
If user declines:
  Exit gracefully
```

### Step 4: Translation Execution
```
For each file in priority order:

Priority 1 (Critical): CLAUDE.md, current increment specs
Priority 2 (High): Internal strategy docs, public docs
Priority 3 (Medium): Skills, agents, commands
Priority 4 (Low): Older increments, test files

Translation process per file:
1. Read original content
2. Use translator skill to translate
3. Preserve:
   - YAML frontmatter
   - Code blocks
   - Markdown formatting
   - Framework terms (increment, spec.md, /sw:*)
   - Technical terms (TypeScript, npm, git, etc.)
   - File paths and names
4. Write translated content
5. Verify formatting intact
6. Update terminology glossary

Show progress:
[1/39] Translating CLAUDE.md... ✓
[2/39] Translating .specweave/increments/0006/spec.md... ✓
[3/39] Translating .specweave/docs/internal/strategy/product-vision.md... ✓
...
```

### Step 5: Quality Validation
```
After all files translated:

Quality Checks:
✓ All planned files translated
✓ Markdown structure intact
✓ Code blocks unchanged
✓ YAML frontmatter valid
✓ Framework terms in English
✓ Terminology consistent across files

If any checks fail:
  - Report failures
  - Suggest manual review
  - Ask if should rollback
```

### Step 6: Post-Translation Tasks
```
1. Update .specweave/config.json:
   {
     "language": "[target-language]",
     ...
   }

2. Create translation glossary:
   .specweave/docs/internal/translation-glossary.yaml

3. Generate summary report:
   .specweave/docs/internal/TRANSLATION-REPORT-[date].md

4. Suggest next steps:
   - Test CLI with new language
   - Review critical files manually
   - Update public documentation site
```

### Step 7: Output Summary
```markdown
✅ Translation Complete!

**Target Language**: [language] ([native name])
**Scope**: [scope]
**Date**: [date]

## Statistics
- Files translated: [count]/[count] (100%)
- Total content: ~[X] words
- Framework terms preserved: [count]
- Code blocks preserved: [count]
- Translation time: [X] minutes

## Quality Checks
✓ All markdown formatting intact
✓ YAML frontmatter valid
✓ Code blocks unchanged
✓ Framework terms in English
✓ Terminology consistent

## Files Updated
- .specweave/config.json (language setting)
- .specweave/docs/internal/translation-glossary.yaml (new)
- .specweave/docs/internal/TRANSLATION-REPORT-[date].md (new)

## Next Steps
1. Test project with new language: npm run test:i18n
2. Review critical files manually (CLAUDE.md, current spec)
3. Update public documentation site (if applicable)
4. Create English fallback docs if needed

## Rollback
If issues found, restore from git:
  git checkout -- [file paths]
```

## Translation Rules (Enforce Strictly)

### ✅ **Always Translate**:
- User-facing prose
- Documentation content
- User stories, acceptance criteria
- Success/error messages
- Strategic documents

### ⏸️ **Never Translate**:
- Framework terms: increment, spec.md, plan.md, tasks.md, COMPLETION-SUMMARY.md
- Commands: /sw:inc, /sw:do, /sw:progress, /sw:sync-docs
- File paths: .specweave/, src/, .claude/, .cursor/, .github/
- Technical terms: TypeScript, npm, git, API, CLI, REST, JSON, HTTP
- SpecWeave keywords: living docs, context-manifest.yaml, PM gate, Spec
- Code blocks (entire blocks stay in English)
- YAML frontmatter keys (only translate values if applicable)

### 🔧 **Context-Dependent**:
- Comments in code (translate if user-facing, keep if technical)
- Technical acronyms (usually keep in English)
- Product names (usually keep original + translation in parentheses)

## Framework Terms to Preserve

**CRITICAL**: These terms MUST stay in English (part of SpecWeave framework):

- `increment`
- `spec.md`, `plan.md`, `tasks.md`, `tests.md`, `context-manifest.yaml`
- `COMPLETION-SUMMARY.md`
- `CLAUDE.md`, `AGENTS.md`
- `.specweave/`, `src/`, `.claude/`, `.cursor/`, `.github/`
- `/sw:inc`, `/sw:do`, `/sw:next`, `/sw:done`, `/sw:progress`, `/sw:validate`, `/sw:sync-docs`
- `living docs`
- `PM gate`, `Architect`, `Tech Lead`
- `context-manifest`
- `Spec`, `ADR`, `PRD`, `HLD`, `LLD`

**Why?** These are framework primitives - translating them would break tooling, scripts, and cross-project consistency.

## Error Handling

**If translation fails for a file**:
1. Log error with file path and reason
2. Continue with remaining files
3. Report all errors in summary
4. Suggest manual review for failed files
5. Offer rollback option

**If formatting breaks**:
1. Restore original file from git
2. Try alternative translation approach (simpler phrasing)
3. If still fails, flag for manual translation
4. Continue with other files

## Special Considerations

### YAML Frontmatter
```yaml
# Only translate description values, NOT keys
---
name: specweave-increment-planner              # ← Keep as-is
description: Plans new increments    # ← Translate this
allowed-tools: Read, Write, Edit     # ← Keep tools as-is
---
```

### Code Blocks
```typescript
// NEVER translate code blocks
// Even if they contain English comments
function createIncrement(name: string) {
  // Keep this comment in English (technical)
  return `increment-${name}`;
}
```

### Markdown Links
```markdown
<!-- Translate text, keep URLs -->
[Read the documentation](https://spec-weave.com)
→ [Leia a documentação](https://spec-weave.com)
```

### Framework Examples
```markdown
<!-- Translate explanation, keep framework terms -->
To create an increment, run: /sw:inc "feature-name"
→ Para criar um increment, execute: /sw:inc "feature-name"
```

## Integration with Translator Agent

This command invokes the **translator agent** which:
- Coordinates the batch translation workflow
- Uses the **translator skill** for actual translation work
- Manages consistency via terminology glossary
- Performs quality validation
- Generates comprehensive reports

**Your job**: Follow the workflow above, using the translator agent's capabilities.

## Testing After Translation

**IMPORTANT**: Suggest these tests to user after translation:

```bash
# 1. Verify CLI still works
specweave --help

# 2. Test increment creation (if CLAUDE.md translated)
/sw:inc "test-feature"

# 3. Check skill activation (if skills translated)
# Ask questions that should trigger skills

# 4. Verify agent invocation (if agents translated)
# Use Task tool to invoke agents

# 5. Run automated tests
npm test
npm run test:e2e
```

## Rollback Procedure

If translation causes issues:

```bash
# Full rollback
git checkout -- .

# Selective rollback
git checkout -- CLAUDE.md
git checkout -- .specweave/increments/
git checkout -- skills/ agents/ commands/

# Reset config
git checkout -- .specweave/config.json
```

---

## Example Execution

**User command**: `/sw:translate ru`

**Your response**:
```
📊 Translation Project Discovery

Target Language: Russian (Русский)
Scope: all

Discovered Files:
✓ CLAUDE.md
✓ 3 increment specs (.specweave/increments/*/spec.md, plan.md, tasks.md)
✓ 12 internal docs (.specweave/docs/internal/)
✓ 5 public docs (.specweave/docs/public/)
✓ 8 skills (skills/*/SKILL.md)
✓ 3 agents (agents/*/AGENT.md)
✓ 7 commands (commands/*.md)

Total: 39 files
Estimated Time: 30-45 minutes

Framework Terms (will be preserved in English):
- increment, spec.md, plan.md, tasks.md
- /sw:*, /sw:sync-docs
- .specweave/, src/, .claude/
- living docs, PM gate, context-manifest

Proceed with translation? (Y/n)
```

**After user confirms**: Execute translation workflow, show progress, generate report.

---

**Remember**: This is LLM-native translation using the current conversation - zero additional cost! The translation happens using Claude's multilingual capabilities with system prompt injection.
