# Mermaid Diagram Improvements - November 3, 2025

## Summary

Successfully enhanced the main SpecWeave flow diagram (`1-main-flow.mmd`) with clear agent roles and optional/mandatory step indicators.

## Validation Results

✅ **Syntax Validation**: PASSED
- 98 defined nodes
- 5 class definition lines
- 118 connections
- File size: 329KB SVG output

✅ **Rendering Test**: PASSED
- Successfully generated SVG using @mermaid-js/mermaid-cli
- Proper YAML frontmatter format
- High-contrast styling applied

## Key Improvements

### 1. Research Phase - Now Optional
**Before**: Research was mandatory with no clear agent role
**After**:
```mermaid
Research{Research needed?}
Research -->|Yes| DoResearch[PM Agent: Research and Analysis]
Research -->|No, skip research| SpecGen
DoResearch --> ResearchSteps[PM Agent performs:
• Market analysis
• Competitive research
• User story extraction]
```

### 2. Validation Phase - Now Optional
**Before**: Validation flow was unclear
**After**:
```mermaid
TestContent --> ValidateCheck{Run validation?<br/>OPTIONAL}
ValidateCheck -->|Yes| Validate[Quality Judge Agent:<br/>Run specweave.validate]
ValidateCheck -->|No, skip validation| Ready2
```

### 3. Agent Roles Specified for All Tasks

#### Planning & Specification
- **PM Agent**: Research, spec generation, user story extraction
- **Architect Agent**: Technical planning, architecture design, tech stack selection
- **Tech Lead Agent**: Task breakdown, quality gates, estimation
- **QA Lead Agent**: Test planning, coverage requirements, quality gates

#### Validation & Quality
- **Quality Judge Agent**: Optional AI quality assessment, rule-based checks, edge case detection

#### Brownfield Support
- **Brownfield Analyzer**: Scans existing codebases, tech stack inventory
- **Brownfield Onboarder**: Context loading, migration suggestions

#### Plugin System
- **Plugin Detector**: 4-phase detection (init-time, pre-spec, pre-task, post-increment)
- **Plugin Manager**: Plugin lifecycle management, enable/disable plugins

#### Automation
- **Living Docs Agent**: Documentation sync, ADR updates, lessons learned
- **Hook System**: Lifecycle automation, post-task hooks, sound notifications
- **Developer**: Human actions (run commands, write code, fix issues)

### 4. Improved Visual Clarity

**Formatting changes**:
- Bullet points (•) instead of plain text lists
- Clear "Agent: Action" format for all nodes
- "OPTIONAL" labels on decision nodes
- Comments moved inside diagram (after flowchart declaration)
- YAML frontmatter for title metadata

**Example node format**:
```mermaid
PM Agent performs:
• Market analysis
• Competitive research
• User story extraction
```

### 5. Documentation Header

Used proper Mermaid frontmatter format:
```yaml
---
title: SpecWeave Main Flow - Enhanced with Agent Roles
---
%%{ init: { 'theme': 'base', 'themeVariables': { 'fontSize': '14px' } } }%%
```

Inline comments after flowchart declaration document:
- Last updated date
- All agent roles
- Mandatory vs optional steps

## Mandatory vs Optional Steps

### Mandatory Path
```
Spec → Plan → Tasks → Tests → Execute → Complete
```

Agents involved:
1. PM Agent → spec.md
2. Architect Agent → plan.md
3. Tech Lead Agent → tasks.md
4. QA Lead Agent → tests.md
5. Developer → Implementation
6. Tech Lead + QA Lead → Quality gates

### Optional Steps
1. **Research** (PM Agent)
   - Can be skipped if requirements are clear
   - User decides at Decision Gate

2. **Validation** (Quality Judge Agent)
   - Can be skipped for faster iteration
   - Optional AI Judge for deeper analysis
   - User decides at Decision Gate

## Plugin Detection (4 Phases)

All phases show **Plugin Detector** as the responsible agent:

1. **Phase 1: Init-Time Detection**
   - During `specweave init`
   - Scans project structure for stack indicators
   - Suggests plugins: React → frontend-stack, K8s → kubernetes

2. **Phase 2: Pre-Spec Detection**
   - During `specweave.inc` (before spec generation)
   - Analyzes increment description keywords
   - Loads brownfield context if available

3. **Phase 3: Pre-Task Detection**
   - During `specweave.do` (before each task)
   - Non-blocking suggestions based on task description
   - Offers to enable plugins mid-increment

4. **Phase 4: Post-Increment Detection**
   - During `specweave.done` (after completion)
   - Analyzes git diff for new dependencies
   - Suggests plugins for next increment

## Brownfield Support

### Brownfield Analyzer
- Scans existing codebase (structure, files, patterns)
- Analyzes tech stack, frameworks, docs, tests, dependencies
- Creates Project Context Map
- NO migration plan upfront (just-in-time migration)

### Brownfield Onboarder
- Loads brownfield context during increment planning
- Auto-detects related existing code
- Offers to include in spec analysis
- Just-in-time migration per increment

## Hook System

**Post-Task Hook** (automatic after each task):
1. Log completion
2. Play sound notification
3. Update progress
4. Sync docs if auto-sync enabled

**Living Docs Agent** performs:
- Automatic documentation sync (if enabled)
- Final sync at increment completion
- Architecture changes, ADR updates, lessons learned

## Quality Gates

**Tech Lead + QA Lead** verify:
- All tasks complete
- All tests passing
- Docs synced

**Result**:
- ✅ Pass → Can close increment
- ❌ Fail → Cannot close increment (developer must fix)

## File Changes

### Modified
- `.specweave/docs/internal/architecture/diagrams/1-main-flow.mmd`
  - Added YAML frontmatter
  - Added agent roles to all nodes
  - Marked optional steps clearly
  - Improved formatting with bullet points
  - Added Research and Validation decision points

### New
- `.specweave/docs/internal/architecture/diagrams/DIAGRAM-IMPROVEMENTS-2025-11-03.md` (this file)

## Testing

### Syntax Validation
```bash
node /tmp/validate-mermaid.js .specweave/docs/internal/architecture/diagrams/1-main-flow.mmd
```

Result:
```
✅ Mermaid syntax validation PASSED
   - Found 98 defined nodes
   - 5 class definition lines
   - 118 connections
```

### Rendering Test
```bash
npx @mermaid-js/mermaid-cli -i 1-main-flow.mmd -o test.svg
```

Result:
```
✅ SVG generated successfully (329KB)
```

## Next Steps (Optional)

1. **Add time/complexity estimates** to each phase
2. **Create simplified version** showing only mandatory path
3. **Add more detailed sub-steps** for specific agents
4. **Generate diagrams for other phases**:
   - Decision Gate (already exists in `2-decision-gate.mmd`)
   - Plugin Detection (already exists in `3-plugin-detection-4phase.mmd`)
   - Context Efficiency (already exists in `4-context-efficiency.mmd`)
   - Living Docs Sync (already exists in `5-living-docs-sync.mmd`)

## Summary

The SpecWeave main flow diagram now provides a complete "who does what" view:
- ✅ Clear agent roles for every task
- ✅ Optional vs mandatory steps clearly marked
- ✅ Valid Mermaid syntax (validated + rendered)
- ✅ High-contrast styling for accessibility
- ✅ Comprehensive documentation

**Total improvements**:
- 10+ agents clearly identified
- 2 optional decision points added
- 98 nodes properly styled
- 118 connections validated
- 329KB SVG output generated successfully
