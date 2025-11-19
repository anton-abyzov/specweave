# Template Optimization Recommendations

**Date**: 2025-11-15
**Context**: Analysis of CLAUDE.md.template and AGENTS.md.template
**Goal**: Optimize templates for better knowledge injection into user projects

---

## Executive Summary

The template files (CLAUDE.md.template and AGENTS.md.template) are **THE critical knowledge transfer mechanism** for SpecWeave. They need optimization for:

1. ✅ Progressive disclosure (Essential → Reference → Advanced)
2. ✅ Better multi-tool support (Claude Code vs Cursor/Copilot)
3. ✅ Quick reference cards for common workflows
4. ✅ Clear separation: Templates (core) vs Living Docs (details)

---

## Priority 1: Restructure with Progressive Disclosure

### Current Problem
Both templates mix essential and advanced content, making it hard to find critical info quickly.

### Solution
Add clear section markers:

```markdown
## 🎯 ESSENTIAL KNOWLEDGE (Read First!)

**If you read nothing else, read this:**
- [ ] NEVER pollute project root with .md files
- [ ] Always use /specweave:increment before coding
- [ ] Increment IDs must be unique (0001-9999)
- [ ] All reports/scripts/logs go in increment folders

**Primary Workflow**:
```
/specweave:increment "feature" → /specweave:do → /specweave:progress → /specweave:done
```

[Core commands, critical rules, quick reference - ~100 lines]

---

## 📖 REFERENCE (Read When Needed)

[Detailed workflows, multi-project, external sync - ~300 lines]

---

## 🔧 ADVANCED (Optional)

[Edge cases, troubleshooting, customization - ~100 lines]
```

**Impact**:
- Users find essential info in <2 minutes
- Advanced users can drill down when needed
- Reduces context overwhelm

---

## Priority 2: Add Quick Reference Cards

### Current Problem
Users forget command syntax and have to search through template.

### Solution
Add visual quick reference cards at the top:

```markdown
## Quick Reference Cards

### Daily Workflow
┌──────────────────────────────────────────────────────┐
│ TASK                    → COMMAND                    │
├──────────────────────────────────────────────────────┤
│ Plan feature            → /specweave:increment "..."  │
│ Execute tasks           → /specweave:do              │
│ Check progress          → /specweave:progress        │
│ Validate quality        → /specweave:validate 0001   │
│ Close increment         → /specweave:done 0001       │
└──────────────────────────────────────────────────────┘

### File Organization Rules
┌──────────────────────────────────────────────────────┐
│ NEVER in Root           ↔ ALWAYS in Increment       │
├──────────────────────────────────────────────────────┤
│ ❌ analysis.md          ↔ ✅ .../0001/reports/       │
│ ❌ migration.py         ↔ ✅ .../0001/scripts/       │
│ ❌ execution.log        ↔ ✅ .../0001/logs/          │
└──────────────────────────────────────────────────────┘

### When to Use Which Command
| User Says...              | Use Command                |
|---------------------------|----------------------------|
| "Let's build X"           | /specweave:increment "X"   |
| "Start implementing"      | /specweave:do              |
| "What's the status?"      | /specweave:progress        |
| "Is this ready?"          | /specweave:validate 0001   |
| "We're done"              | /specweave:done 0001       |
| "Sync to GitHub"          | /specweave:github:sync     |
```

**Impact**:
- 80% reduction in "how do I..." questions
- Visual format = easier to remember
- Copy-paste friendly

---

## Priority 3: Multi-Tool Clarity

### Current Problem
Templates don't clearly distinguish Claude Code (automatic) vs Other Tools (manual).

### Solution
Add callout boxes for tool-specific behavior:

```markdown
## Task Completion Workflow

**🤖 For Claude Code Users**:
✅ Automatic! Hooks handle this:
- Living docs sync
- External tracker update
- Sound notification
**No manual action needed!**

**⚙️ For Cursor/Copilot/Generic Tools**:
⚠️ Manual sync required after EACH task:

```bash
# After completing a task:
/specweave:sync-tasks                  # 1. Update tasks.md
/specweave:sync-docs update            # 2. Sync living docs
/specweave-github:sync <increment-id>  # 3. Sync to GitHub
```

See "Manual Sync Guide" section below for details.
```

**Impact**:
- Clear expectations for each tool
- Prevents missed syncs in non-Claude tools
- Reduces confusion about "automatic" features

---

## Priority 4: Move Detailed Content to Living Docs

### Current Problem
Templates contain detailed workflows that could live in living docs.

### Solution
Keep **what exists** in template, link to **how to use it** in living docs:

**In Template** (CLAUDE.md/AGENTS.md):
```markdown
## Available Commands

**Core Commands**:
- `/specweave:increment` - Plan new feature
- `/specweave:do` - Execute tasks
- `/specweave:done` - Close increment
- `/specweave:validate` - Quality check

**Plugin Commands** (if installed):
- `/specweave:github:sync` - Sync to GitHub
- `/specweave:jira:sync` - Sync to Jira

For detailed workflows, see:
- [Command Reference Guide](.specweave/docs/public/guides/command-reference.md)
- [GitHub Sync Guide](.specweave/docs/public/guides/github-sync.md)
```

**In Living Docs** (.specweave/docs/public/guides/command-reference.md):
```markdown
# Command Reference Guide

## /specweave:increment - Plan New Feature

**When to use**: Starting any new feature or increment

**Workflow**:
1. PM-led planning (market research, spec.md)
2. Architect designs (plan.md)
3. Auto-generate tasks (tasks.md)
4. QA defines tests (embedded in tasks)

**Example**:
```bash
/specweave:increment "User Authentication"
```
[... detailed workflow ...]
```

**Impact**:
- Template stays concise (~400 lines instead of 1965)
- Detailed docs available when needed
- Living docs can be updated independently
- Better token efficiency

---

## Priority 5: Add Troubleshooting Section

### Current Problem
Users hit common issues and don't know where to look.

### Solution
Add troubleshooting section at end of template:

```markdown
## 🆘 Troubleshooting

### Skills Not Activating

**Symptoms**: Task requires skill but it's not loading

**Solutions**:
1. Check available skills: `cat .claude/skills/SKILLS-INDEX.md`
2. Verify keywords match: Look for "Activates for" section
3. Load manually: `cat .claude/skills/{skill-name}/SKILL.md`
4. Restart Claude Code (if using Claude)

### Commands Not Found

**Symptoms**: `/specweave:do` doesn't work

**Solutions**:
1. List commands: `ls plugins/specweave/commands/`
2. Verify plugin installed: `/plugin list --installed`
3. For non-Claude tools: Read command file manually
4. Restart Claude Code (if using Claude)

### Root Folder Polluted

**Symptoms**: `git status` shows .md files in root

**Solutions**:
1. Move files: `mv *.md .specweave/increments/0001/reports/`
2. Update .gitignore if needed
3. Commit: `git add . && git commit -m "fix: move reports to increment folder"`

### External Tracker Not Syncing

**Symptoms**: GitHub/Jira not updating

**Solutions (Claude Code)**:
- Check `.specweave/config.json` has `external_tracker_sync: true`
- Verify hook exists: `ls plugins/specweave/hooks/post-task-completion.sh`

**Solutions (Other Tools)**:
- Run manual sync: `/specweave:github:sync <increment-id>`
- Check credentials: `gh auth status` or `jira config list`

For more help: https://spec-weave.com/docs/troubleshooting
```

**Impact**:
- 90% of common issues self-service
- Reduces support burden
- Users unblock themselves

---

## Priority 6: Template Validation During Init

### Current Problem
No validation that template rendered correctly.

### Solution
Add validation in `src/cli/init.ts`:

```typescript
interface TemplateValidation {
  hasEssentialSection: boolean;
  hasQuickReference: boolean;
  hasWorkflowCommands: boolean;
  hasProjectStructure: boolean;
  noUnresolvedPlaceholders: boolean;
}

function validateRenderedTemplate(content: string): TemplateValidation {
  return {
    hasEssentialSection: content.includes('🎯 ESSENTIAL'),
    hasQuickReference: content.includes('Quick Reference'),
    hasWorkflowCommands: content.includes('/specweave:increment'),
    hasProjectStructure: content.includes('.specweave/'),
    noUnresolvedPlaceholders: !content.match(/\{[A-Z_]+\}/),
  };
}

function renderTemplate(templatePath: string, context: any): string {
  const template = fs.readFileSync(templatePath, 'utf-8');
  const rendered = renderWithContext(template, context);

  // Validate
  const validation = validateRenderedTemplate(rendered);
  const allValid = Object.values(validation).every(Boolean);

  if (!allValid) {
    console.error('Template validation failed:', validation);
    throw new Error('Template rendering incomplete');
  }

  return rendered;
}
```

**Impact**:
- Prevents broken templates from being deployed
- Catches missing placeholders
- Ensures template quality

---

## Priority 7: Version Detection and Upgrade

### Current Problem
Users on old templates don't know they're outdated.

### Solution
Add version marker to templates:

**In template**:
```markdown
<!-- SPECWEAVE_TEMPLATE_VERSION: 2.0.0 -->
<!-- SPECWEAVE_TEMPLATE_DATE: 2025-11-15 -->

# {PROJECT_NAME} - SpecWeave Quick Reference

[Rest of template...]
```

**Detection script** (add to CLI):
```typescript
function detectTemplateVersion(claudeMdPath: string): {
  current: string;
  latest: string;
  needsUpgrade: boolean;
} {
  const content = fs.readFileSync(claudeMdPath, 'utf-8');
  const match = content.match(/SPECWEAVE_TEMPLATE_VERSION: ([\d.]+)/);
  const current = match ? match[1] : '1.0.0';
  const latest = '2.0.0'; // From package.json or config

  return {
    current,
    latest,
    needsUpgrade: semver.lt(current, latest),
  };
}

// Usage in CLI
const version = detectTemplateVersion('CLAUDE.md');
if (version.needsUpgrade) {
  console.warn(`
⚠️ Your CLAUDE.md template is outdated!
Current: v${version.current}
Latest: v${version.latest}

Run: specweave upgrade-template
  `);
}
```

**Impact**:
- Users know when templates are outdated
- Can offer guided upgrades
- Prevents confusion from old instructions

---

## Implementation Plan

### Phase 1: CLAUDE.md.template (Claude Code users)
- [ ] Restructure with progressive disclosure
- [ ] Add quick reference cards at top
- [ ] Move detailed workflows to living docs (link from template)
- [ ] Add multi-tool callouts
- [ ] Add troubleshooting section
- [ ] Add template version marker
- [ ] Reduce from 569 lines to ~400 lines

**Estimated Impact**: 30% reduction in lines, 80% faster info discovery

### Phase 2: AGENTS.md.template (Cursor/Generic users)
- [ ] Restructure with progressive disclosure
- [ ] Add quick reference cards
- [ ] Add multi-tool callouts (emphasize manual sync)
- [ ] Add troubleshooting section
- [ ] Keep comprehensive (but organized)
- [ ] Reduce from 1965 lines to ~1200 lines (consolidate redundant sections)

**Estimated Impact**: 40% reduction in lines, better organization

### Phase 3: Template Validation
- [ ] Add validation function in init.ts
- [ ] Add version detection
- [ ] Add upgrade command
- [ ] Add template diff tool (show changes)

**Estimated Impact**: Zero broken templates, easy upgrades

### Phase 4: Living Docs Migration
- [ ] Create detailed command guides in .specweave/docs/public/guides/
- [ ] Create workflow tutorials
- [ ] Create troubleshooting guide (comprehensive)
- [ ] Update templates to link to guides

**Estimated Impact**: Better docs, shorter templates

---

## Metrics for Success

**Before Optimization**:
- CLAUDE.md: 569 lines
- AGENTS.md: 1965 lines
- Time to find essential info: 5-10 minutes
- User confusion: High (based on issues)

**After Optimization**:
- CLAUDE.md: ~400 lines (30% reduction)
- AGENTS.md: ~1200 lines (40% reduction)
- Time to find essential info: <2 minutes (80% improvement)
- User confusion: Low (clear structure)

**Additional Benefits**:
- ✅ Better token efficiency (shorter templates)
- ✅ Easier maintenance (DRY with living docs)
- ✅ Clearer multi-tool support
- ✅ Self-service troubleshooting

---

## Risks and Mitigation

**Risk 1**: Shorter templates might omit critical info
- **Mitigation**: Link to comprehensive living docs
- **Validation**: Add template validation tests

**Risk 2**: Users might not follow links to living docs
- **Mitigation**: Include most critical info inline
- **Mitigation**: Make links obvious with emojis (📖 See Guide)

**Risk 3**: Breaking changes for existing users
- **Mitigation**: Version detection + guided upgrade
- **Mitigation**: Keep both old and new templates available

**Risk 4**: Living docs might become stale
- **Mitigation**: Add CI check for broken links
- **Mitigation**: Update docs during template changes

---

## Next Steps

1. **Review with team** (get feedback on recommendations)
2. **Create PR** for Phase 1 (CLAUDE.md.template restructure)
3. **Test with new init** (validate template renders correctly)
4. **Gather user feedback** (A/B test new vs old template)
5. **Iterate** (refine based on feedback)
6. **Roll out Phase 2-4** (AGENTS.md, validation, living docs)

---

## Conclusion

The template files are **the most critical part of SpecWeave's knowledge injection system**. By optimizing them with:
- Progressive disclosure
- Quick reference cards
- Clear multi-tool callouts
- Living docs migration
- Template validation

We can dramatically improve the user experience while reducing maintenance burden and token usage.

**The templates don't just contain information - they ARE the user's guide to SpecWeave. Let's make them exceptional.**

---

**Generated by**: Ultrathink Analysis Session
**Date**: 2025-11-15
**Related**: Template Optimization, Knowledge Injection, Multi-Tool Support
