# 0197: Native Agent Teams — Implementation Plan

## Architecture Decision

### Why Skill Enhancement (Not New TypeScript Module)

The existing `src/core/auto/parallel/` module handles the **programmatic** side (spawning, state, worktrees). This increment focuses on the **instructional** side — giving Claude Code the right prompts and patterns to form and manage teams effectively. The deliverables are primarily **SKILL.md files** (rich markdown instructions) and **documentation**.

The key insight from the video: Claude Code already knows HOW to use Agent Teams mechanically. What it lacks is the **judgment** for forming good teams and managing dependencies. SpecWeave's skills provide that judgment.

### Two-Mode Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 /sw:team-orchestrate "feature"              │
│                 /sw:team-build --preset full-stack          │
└────────────────────────┬───────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │ Detect   │
                    │ mode     │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │                     │
     ┌────────▼────────┐  ┌────────▼────────┐
     │ NATIVE TEAMS    │  │ SUBAGENT MODE   │
     │ (experimental)  │  │ (fallback)      │
     │                 │  │                 │
     │ Env var set?    │  │ Task tool with  │
     │ → tmux/iTerm2/  │  │ run_in_bg: true │
     │   in-process    │  │                 │
     │ → Peer messaging│  │ File-based      │
     │ → Shared tasks  │  │ communication   │
     │ → Split panes   │  │ JSON state      │
     └─────────────────┘  └─────────────────┘
```

### Contract-First Spawning Protocol

```
Phase 0: ANALYSIS (Lead Agent)
  ├── Detect domains from feature description
  ├── Map domains to SpecWeave skills
  ├── Determine contract chain
  └── Create increments per domain

Phase 1: CONTRACTS (Sequential)
  ├── Spawn upstream agent (shared types / DB schema)
  ├── Agent writes contract artifacts:
  │   ├── src/types/api-contract.ts (TypeScript interfaces)
  │   ├── prisma/schema.prisma (DB schema)
  │   └── docs/api-spec.yaml (OpenAPI, if applicable)
  └── Agent signals completion to lead

Phase 2: PARALLEL IMPLEMENTATION
  ├── Lead spawns downstream agents with contract context
  ├── Each agent runs /sw:auto on its increment
  ├── Agents communicate via:
  │   ├── Native: SDK SendMessage
  │   └── Fallback: .specweave/state/parallel/messages/
  └── Agents run /sw:grill before signaling done

Phase 3: MERGE (Lead Agent)
  ├── /sw:team-status confirms all agents complete
  ├── /sw:team-merge in dependency order
  ├── /sw:done per increment
  └── /sw-github:sync or /sw-jira:push
```

## Implementation Strategy

### Phase 1: Core Skill Enhancement (US-001, US-002)

**Deliverable**: Rewrite `/sw:team-orchestrate` SKILL.md

The SKILL.md is the primary deliverable. It needs to be a comprehensive instruction set (500-800 lines) that Claude Code follows when forming and managing teams. Key sections:

1. **Mode Detection** — check env var, detect terminal multiplexer
2. **Feature Analysis** — domain detection from user prompt
3. **Team Formation** — agent role assignment with specific SpecWeave skills
4. **Contract Chain** — dependency analysis and sequential spawning
5. **Agent Spawn Prompts** — detailed templates per domain
6. **Communication Protocol** — how agents share discoveries
7. **Quality Gates** — /sw:grill per agent before completion
8. **Troubleshooting** — common issues and fixes

### Phase 2: Team Build Skill + Presets (US-003)

**Deliverable**: New `/sw:team-build` SKILL.md

A streamlined skill focused on implementation (vs. team-orchestrate which is for planning). Uses presets for common team compositions:

```bash
/sw:team-build --preset full-stack "Build checkout"
/sw:team-build --preset review
/sw:team-build --preset testing
/sw:team-build --preset tdd
```

### Phase 3: Terminal Configuration (US-004)

**Deliverable**: Setup section in SKILL.md + docs-site page

Detection logic:
```bash
# In SKILL.md instructions
1. Check: which tmux → tmux available
2. Check: which it2 → iTerm2 CLI available
3. Check: $TERM_PROGRAM == "iTerm.app" → iTerm2 native
4. Fallback: in-process mode (always works)
```

### Phase 4: Workflow Integration (US-005, US-006)

**Deliverable**: Agent spawn prompt templates with SpecWeave commands baked in

Each agent's spawn prompt includes:
```
You are the {DOMAIN} agent for SpecWeave increment {ID}.

SKILLS TO USE:
- Primary: {PRIMARY_SKILL} — invoke at start for domain expertise
- Secondary: {SECONDARY_SKILLS}

YOUR INCREMENT: .specweave/increments/{ID}/
YOUR FILES: {FILE_OWNERSHIP_PATTERNS}

WORKFLOW:
1. Read spec.md and tasks.md
2. Invoke Skill({ skill: "{PRIMARY_SKILL}" })
3. Run /sw:do to execute tasks one by one
4. After all tasks: run /sw:grill for quality check
5. Signal completion to lead agent

RULES:
- ONLY modify files matching your ownership patterns
- READ any file for context but WRITE only to your files
- If you need a contract change, message the shared/types agent
- Update tasks.md immediately when completing tasks
```

### Phase 5: Documentation (US-007)

**Deliverables**:
1. Updated `docs-site/docs/guides/agent-teams-and-swarms.md`
2. New `docs-site/docs/guides/agent-teams-setup.md`
3. Troubleshooting section in SKILL.md

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `plugins/specweave/skills/team-orchestrate/SKILL.md` | **Rewrite** | Full native Agent Teams instructions (500-800 lines) |
| `plugins/specweave/skills/team-build/SKILL.md` | **New** | Preset-driven team building skill |
| `plugins/specweave/skills/team-status/SKILL.md` | **Enhance** | Native Agent Teams status integration |
| `plugins/specweave/skills/team-merge/SKILL.md` | **Enhance** | Native Agent Teams merge integration |
| `docs-site/docs/guides/agent-teams-and-swarms.md` | **Update** | Add native Agent Teams section |
| `docs-site/docs/guides/agent-teams-setup.md` | **New** | Step-by-step setup guide |
| `AGENTS.md` | **Update** | Add Agent Teams section with role definitions |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Agent Teams feature changes (experimental) | SKILL.md instructions are soft — easy to update. No hard TypeScript dependencies. |
| Token cost explosion | Presets limit team size. SKILL.md warns about 2-4x cost. Task sizing guidance (5-6 per agent). |
| tmux hanging | Default to in-process mode. tmux is opt-in. Troubleshooting section covers known issues. |
| Agents stepping on files | File ownership patterns enforced in spawn prompts. Merge detects conflicts. |
| Backward compatibility | Mode detection: native if env var set, subagent fallback otherwise. Zero breaking changes. |

## Success Metrics

- Team formation works reliably in 8/10 attempts (vs current ~5/10 without instructions)
- Contract-first spawning eliminates schema mismatch errors
- All 5 presets produce functional teams
- Setup guide enables new users in <5 minutes
- Existing subagent mode unaffected
