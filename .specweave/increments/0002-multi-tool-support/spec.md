---
increment: 0002-multi-tool-support
title: "Multi-Tool Compatibility & Adapter System"
priority: P1
status: planned
created: 2025-10-27
updated: 2025-10-27
started: null
completed: null
closed: null

structure: user-stories
total_tasks: 0
completed_tasks: 0
completion_rate: 0

dependencies:
  - 0001-core-framework

wip_slot: null
---

# Increment 0002: Multi-Tool Compatibility & Adapter System

## Overview

**Problem**: SpecWeave v0.1.0-beta.1 only works with Claude Code, limiting adoption to ~10% of developers.

**Solution**: Implement adapter pattern to make SpecWeave work with ALL major AI coding tools (Cursor, GitHub Copilot, Windsurf, ChatGPT, Gemini, etc.) while maintaining best-in-class experience with Claude Code.

**Inspiration**:
- **spec-kit** (GitHub): Works with 14+ AI tools through plain Markdown + text commands
- **BMAD-METHOD**: Portable prompt bundles work across Gemini, Claude, CustomGPT

**Key Insight**: Separate tool-agnostic core (`.specweave/`) from tool-specific adapters (optional enhancements).

---

## User Stories

### US-001: Developer Using Cursor

**As a** Cursor user
**I want to** use SpecWeave's spec-driven workflow
**So that** I can benefit from specifications, context manifests, and structured development without switching to Claude Code

**Acceptance Criteria**:
- **TC-0001**: Running `specweave init my-project --adapter cursor` creates Cursor-compatible project
- **TC-0002**: `.cursorrules` file generated with SpecWeave workflow instructions
- **TC-0003**: @ context shortcuts (e.g., `@increments`, `@docs`) work in Cursor Composer
- **TC-0004**: User can create increments manually or via Cursor's multi-file editing
- **TC-0005**: Context manifests guide Cursor to load only relevant specs (70%+ token reduction)
- **TC-0006**: SpecWeave structure (`.specweave/`, spec.md, plan.md, tasks.md) is standard Markdown (no Cursor extensions required)

### US-002: Developer Using GitHub Copilot

**As a** GitHub Copilot user
**I want to** use SpecWeave without Claude-specific features
**So that** I can follow spec-driven development in my existing GitHub workflow

**Acceptance Criteria**:
- **TC-0007**: Running `specweave init my-project --adapter copilot` creates Copilot-compatible project
- **TC-0008**: `.github/copilot/instructions.md` generated with SpecWeave workspace instructions
- **TC-0009**: Copilot reads context manifests to understand which docs to load
- **TC-0010**: Copilot suggests code based on spec.md and plan.md content
- **TC-0011**: No GitHub Copilot extensions required (works with built-in features)
- **TC-0012**: All SpecWeave files are plain Markdown compatible with GitHub's rendering

### US-003: Developer Using ANY AI Tool (Generic Adapter)

**As a** developer using ChatGPT, Gemini, Windsurf, or any other AI
**I want to** use SpecWeave's structured approach
**So that** I can benefit from specs, context manifests, and living documentation regardless of my AI tool choice

**Acceptance Criteria**:
- **TC-0013**: Running `specweave init my-project --adapter generic` creates universal project
- **TC-0014**: `SPECWEAVE.md` file provides manual workflow guide (step-by-step)
- **TC-0015**: All SpecWeave files are plain Markdown + YAML (no tool dependencies)
- **TC-0016**: Context manifests work by manually guiding AI to load specific files
- **TC-0017**: Workflow documented clearly: create spec → plan → tasks → implement
- **TC-0018**: Works with literally ANY AI (even non-coding tools like ChatGPT web)

### US-004: Developer Upgrading from Claude-Only beta.1

**As a** SpecWeave beta.1 user (Claude-only)
**I want to** upgrade to multi-tool support without breaking my existing project
**So that** my project continues working while gaining cross-tool compatibility

**Acceptance Criteria**:
- **TC-0019**: Existing `.claude/` directory continues to work (backward compatible)
- **TC-0020**: Running `specweave upgrade --adapter cursor` adds Cursor support without removing Claude features
- **TC-0021**: `CLAUDE.md` renamed to `SPECWEAVE.md` with symlink for backward compatibility
- **TC-0022**: All existing increments, specs, and docs work without modification
- **TC-0023**: CLI detects adapter type automatically (if `.claude/` exists → Claude adapter)

### US-005: Framework Developer (SpecWeave Contributor)

**As a** SpecWeave framework developer
**I want** clear separation between core and adapters
**So that** I can add support for new tools easily without modifying core

**Acceptance Criteria**:
- **TC-0024**: Core framework in `.specweave/` has zero tool-specific dependencies
- **TC-0025**: Adapters in `src/adapters/{tool}/` follow standard interface
- **TC-0026**: Adding new adapter requires only creating new adapter directory (no core changes)
- **TC-0027**: Adapter interface documented with examples
- **TC-0028**: CLI automatically discovers adapters in `src/adapters/`

---

## Functional Requirements

### FR-001: Tool-Agnostic Core

**Description**: Core SpecWeave functionality must work with ANY AI tool through plain files.

**Requirements**:
1. `.specweave/` directory contains ONLY plain Markdown and YAML
2. No tool-specific file formats (no .claude-specific extensions)
3. Context manifests are simple YAML (any tool can parse)
4. Increments use standard Markdown checkboxes for tasks
5. Diagrams use standard Mermaid (renders in GitHub, VS Code, etc.)
6. All commands documented as text-based workflows (not tool APIs)

### FR-002: Adapter System

**Description**: Adapters enhance experience for specific tools but are OPTIONAL.

**Requirements**:
1. Adapters in `src/adapters/{tool-name}/`
2. Each adapter contains:
   - `README.md` - What this adapter provides
   - `install.sh` - Installation script
   - Tool-specific files (e.g., `.cursorrules`, `instructions.md`)
   - `test-cases/` - Minimum 3 test cases
3. Adapters registered in `src/adapters/registry.yaml`
4. CLI reads registry to show available adapters

### FR-003: CLI Adapter Support

**Description**: `specweave init` command supports `--adapter` flag.

**Requirements**:
1. `specweave init my-project --adapter [claude|cursor|copilot|generic]`
2. Auto-detection: If flag omitted, detect from environment:
   - If Claude Code CLI present → Claude adapter
   - If `.cursorrules` exists → Cursor adapter
   - Else → Generic adapter
3. `specweave list-adapters` - Show all available adapters
4. `specweave add-adapter {name}` - Add adapter to existing project

### FR-004: Adapter Capabilities

**Description**: Each adapter provides different automation levels.

**Claude Adapter** (Full Automation):
- Skills auto-activate (specweave-detector, skill-router, etc.)
- Agents coordinate (PM, Architect, DevOps, QA)
- Hooks auto-update docs (post-task-completion, etc.)
- Slash commands (/create-increment, /review-docs, etc.)
- Best experience, most features

**Cursor Adapter** (Semi-Automation):
- `.cursorrules` with SpecWeave workflow instructions
- @ context shortcuts (@increments, @docs, @strategy)
- Composer multi-file editing support
- Good experience, semi-automated

**Copilot Adapter** (Basic Automation):
- `.github/copilot/instructions.md` workspace guidance
- Copilot reads context manifests for suggestions
- Works with built-in Copilot features only
- Decent experience, basic automation

**Generic Adapter** (Manual Workflow):
- `SPECWEAVE.md` with step-by-step manual instructions
- Works with ANY AI (ChatGPT, Gemini, etc.)
- No automation, user guides AI through workflow
- Basic experience, maximum compatibility

---

## Non-Functional Requirements

### NFR-001: Backward Compatibility

**Requirement**: SpecWeave v0.1.0-beta.1 projects (Claude-only) must continue working.

**Implementation**:
- Keep `.claude/` support (don't break existing users)
- Symlink `CLAUDE.md` → `SPECWEAVE.md` if upgrading
- CLI detects Claude adapter automatically if `.claude/` exists
- No breaking changes

### NFR-002: Zero Tool Lock-In

**Requirement**: Users can switch AI tools without losing SpecWeave benefits.

**Implementation**:
- Core `.specweave/` works independently of adapter
- Can add multiple adapters (e.g., Claude + Cursor simultaneously)
- Removing adapter doesn't break core functionality
- Plain files exportable to any tool

### NFR-003: Performance

**Requirement**: Context manifests must achieve 70%+ token reduction across ALL tools.

**Implementation**:
- Manifests are simple YAML (any tool parses efficiently)
- Loading logic in documentation (user guides AI to load specific files)
- Works same way in Claude, Cursor, Copilot, generic

### NFR-004: Documentation Quality

**Requirement**: Every adapter must have excellent documentation.

**Implementation**:
- Each adapter has `README.md` with setup instructions
- Public docs (`.specweave/docs/public/`) explain all adapters
- Examples for each adapter in docs
- Troubleshooting section per adapter

---

## Success Criteria

### SC-001: Multi-Tool Compatibility Achieved

**Metric**: SpecWeave works with ≥4 major AI coding tools

**Target**:
- ✅ Claude Code (full automation)
- ✅ Cursor (semi-automation)
- ✅ GitHub Copilot (basic automation)
- ✅ Generic (works with ANY AI)

**Verification**: Create test project with each adapter, verify workflow works

### SC-002: No Claude Lock-In

**Metric**: 100% of core features work without Claude-specific code

**Target**:
- ✅ Increments creation (manual or assisted)
- ✅ Context manifests (guide AI to load files)
- ✅ Spec → Plan → Tasks workflow
- ✅ Living documentation (manual updates without hooks)
- ✅ Test mapping (TC-0001 IDs work universally)

**Verification**: Use SpecWeave with ChatGPT (web) to create a feature end-to-end

### SC-003: Market Expansion

**Metric**: Adoption increases from ~10% (Claude only) to ~100% (all tools)

**Target**:
- Claude Code users: 10% → keep all
- Cursor users: 30% → now accessible
- GitHub Copilot users: 40% → now accessible
- Other AI users: 20% → now accessible
- **Total: 100% market coverage**

**Verification**: Track GitHub stars, forks, and tool-specific feedback

### SC-004: Developer Experience

**Metric**: Developers can use their preferred AI tool without compromise

**Target**:
- ✅ Cursor users get great experience (not just "works")
- ✅ Copilot users get good experience
- ✅ Generic users get clear manual workflow
- ✅ Claude users keep best-in-class experience

**Verification**: User interviews, GitHub discussions, feedback

---

## Out of Scope (v0.2.0 or later)

**Not in this increment:**
- ❌ Windsurf adapter (add in v0.3.0 if requested)
- ❌ Gemini adapter (add in v0.3.0 if requested)
- ❌ ChatGPT web UI integration (generic adapter covers this)
- ❌ VS Code extension (separate increment)
- ❌ Adapter marketplace (future)
- ❌ Custom adapter creation wizard (future)

**Rationale**: Focus on 4 core adapters (Claude, Cursor, Copilot, Generic) to prove concept and get feedback before expanding.

---

## Technical Approach Summary

### Architecture

```
SpecWeave
├── Core (Tool-Agnostic)
│   └── .specweave/              # Plain Markdown + YAML
│       ├── config.yaml
│       ├── increments/
│       └── docs/
│
└── Adapters (Optional)
    ├── Claude                    # Full automation
    │   ├── .claude/skills/
    │   ├── .claude/agents/
    │   └── .claude/hooks/
    │
    ├── Cursor                    # Semi-automation
    │   └── .cursorrules
    │
    ├── Copilot                   # Basic automation
    │   └── .github/copilot/instructions.md
    │
    └── Generic                   # Manual workflow
        └── SPECWEAVE.md
```

### Implementation Strategy

**Phase 1: Core Refactor** (Day 1)
- Extract tool-agnostic core
- Move Claude-specific code to adapters/claude/
- Update CLI to support --adapter flag

**Phase 2: Adapter Implementation** (Day 2-3)
- Implement Cursor adapter (.cursorrules)
- Implement Copilot adapter (instructions.md)
- Implement Generic adapter (SPECWEAVE.md)

**Phase 3: Testing** (Day 4)
- Test each adapter with actual tools
- Verify context manifests work
- Verify backward compatibility

**Phase 4: Documentation** (Day 5)
- Update public docs
- Create adapter-specific guides
- Update CHANGELOG.md

---

## Dependencies

**Depends on**:
- 0001-core-framework (must be complete)

**Blocks**:
- None (this enables future multi-tool features)

---

## References

**External Frameworks**:
- [spec-kit](https://github.com/github/spec-kit) - Agent-agnostic approach
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) - Portable prompts

**Internal Docs**:
- `.specweave/docs/internal/architecture/adapter-architecture.md` (to be created)
- `.specweave/docs/internal/architecture/adr/0003-multi-tool-support.md` (to be created)

**Skills**:
- `spec-kit-expert` - Reference for compatibility patterns
- `bmad-method-expert` - Reference for prompt portability

---

**Status**: Ready for implementation
**Next**: Create plan.md with detailed technical design
