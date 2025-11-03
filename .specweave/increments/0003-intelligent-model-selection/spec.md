---
increment_id: '0003'
increment: 0003-intelligent-model-selection
title: "Intelligent Model Selection - Automatic Cost Optimization"
type: feature
priority: P1
status: in-progress
created: 2025-10-30
updated: 2025-10-31
started: 2025-10-31
dependencies:
  - 0001-core-framework
  - 0002-core-enhancements
tags:
  - cost-optimization
  - ai-models
  - anthropic
  - haiku-4.5
  - sonnet-4.5
  - research-driven
  - model-versioning
  - quality-optimization
estimated_savings: 60-70%
user_stories: 11
---

# Intelligent Model Selection - Automatic Cost Optimization

## Problem Statement

**Current State**: SpecWeave uses Claude Sonnet for all operations, resulting in high costs for simple implementation tasks. Users must manually specify `model: "haiku"` to optimize costs.

**User Pain Points**:
- ❌ Using outdated Sonnet 3.5 instead of latest Sonnet 4.5 (quality regression)
- ❌ High AI costs for repetitive implementation work ($0.80 per feature)
- ❌ No visibility into where costs are incurred
- ❌ Manual model selection requires deep knowledge of capabilities
- ❌ No guidance on when to use Haiku vs Sonnet
- ❌ No pre-implementation research (building wrong things)
- ❌ Quality validation too slow/expensive (3 rounds Sonnet)
- ❌ Missing Anthropic's official cost optimization pattern

**Market Context**:
- Anthropic officially recommends **Sonnet 4.5 for planning** and **Haiku 4.5 for execution** (90% performance, 1/3 cost, 2x speed)
- Research-first development prevents wasted implementation work
- Model version policy ensures users always get latest quality/performance

## Solution Overview

**Intelligent Model Selection System** - Automatically routes work to the optimal AI model based on task type, achieving 60-70% cost savings while maintaining quality.

### Core Capabilities

1. **Model Version Policy (NEW - CRITICAL)**
   - ✅ Always use **Sonnet 4.5** (latest) - NEVER Sonnet 3.5
   - ✅ Always use **Haiku 4.5** (latest) - NEVER Haiku 3.0
   - Simple naming: `sonnet`/`haiku`/`opus` → latest versions
   - Automatic upgrades when Anthropic releases new models
   - No manual configuration needed

2. **Research Phase (NEW - GAME CHANGER)**
   - Optional market research before spec generation
   - Uses Haiku 4.5 (15 min, ~$0.02 - cheap!)
   - Prevents wasted work on saturated markets
   - Informs better specs (research-driven vs guesswork)
   - Enables "research-only" mode (validate ideas without coding)

3. **Automatic Model Selection**
   - System intelligently chooses Sonnet (planning) vs Haiku (execution)
   - Based on agent type, work phase, and task complexity
   - No user intervention required

4. **Cost Visibility**
   - Real-time cost tracking per increment, agent, and phase
   - Savings calculations vs baseline (all-Sonnet)
   - ROI reporting for AI investments

5. **Multi-Phase Orchestration**
   - Complex tasks auto-split: Sonnet plans → Haiku executes → Sonnet validates
   - Transparent phase transitions
   - Quality gates between phases

6. **Quality Validation Optimization (NEW)**
   - Validation uses Haiku 4.5 (not Sonnet)
   - 2 rounds default (down from 3)
   - 67% time savings, 73% cost savings
   - Strict mode available for critical specs

7. **User Control**
   - Three modes: Auto (default), Balanced (approval), Manual
   - Override capability for any task
   - Configurable cost policies

## Business Value

### For Individual Developers
- **60-70% cost reduction** on implementation work
- Build more features with same AI budget
- Transparent cost tracking per feature

### For Teams
- Predictable AI costs per sprint
- Cost allocation by feature/team
- ROI metrics for management reporting

### For SpecWeave Project
- **Competitive advantage**: Only framework with automatic cost optimization
- Aligns with Anthropic's official best practices
- Differentiation in crowded AI-tools market

### Market Impact
- Lower barrier to entry (affordable AI-assisted development)
- Enables longer development sessions
- Positions SpecWeave as cost-conscious enterprise solution

## User Stories

### US-001: Automatic Cost Optimization (Core Value)
**As a** SpecWeave user
**I want** the system to automatically use the most cost-effective AI model
**So that** I can build features for 60% less cost without sacrificing quality

**Acceptance Criteria**:
- [ ] System detects planning phase and uses Sonnet 4.5
- [ ] System detects execution phase and uses Haiku 4.5
- [ ] Quality of Haiku-generated code matches Sonnet baseline (90%+ success rate)
- [ ] User sees transparent model selection (logs show which model used)
- [ ] No configuration required (works out of the box)

**Priority**: P1 - Core differentiator

---

### US-002: Cost Visibility & Tracking
**As a** developer
**I want** to see how much each feature costs in AI usage
**So that** I can budget AI spending and optimize expensive operations

**Acceptance Criteria**:
- [ ] Real-time cost display during increment execution
- [ ] Cost report per increment in `.specweave/increments/####/reports/cost-analysis.json`
- [ ] Command `/specweave:costs` shows current and historical costs
- [ ] Cost breakdown by: model, agent, phase, increment
- [ ] Savings calculation vs all-Sonnet baseline

**Priority**: P1 - Essential transparency

---

### US-003: Agent-Level Model Intelligence
**As a** SpecWeave architect
**I want** each agent to declare its optimal model preference
**So that** planning agents use Sonnet and execution agents use Haiku automatically

**Acceptance Criteria**:
- [ ] All 20 agents have `model_preference` field in AGENT.md
- [ ] PM/Architect/Security agents default to Sonnet
- [ ] Frontend/Backend/DevOps agents default to Haiku
- [ ] Diagrams/Docs agents support auto mode (context-dependent)
- [ ] Task tool respects agent preferences unless overridden

**Priority**: P1 - Foundation of system

---

### US-004: Phase Detection
**As a** system
**I want** to detect whether user is planning or executing work
**So that** I can auto-select the appropriate model without user input

**Acceptance Criteria**:
- [ ] Detects planning phase from keywords: "plan", "design", "analyze", "architecture"
- [ ] Detects execution phase from keywords: "implement", "build", "create", "write"
- [ ] Detects review phase from keywords: "review", "validate", "audit", "assess"
- [ ] Slash commands hint at phase: `/specweave:inc` = planning, `/specweave:do` = execution
- [ ] Phase detection logged for transparency

**Priority**: P1 - Smart automation

---

### US-005: Multi-Phase Auto-Split
**As a** user running complex workflows
**I want** the system to automatically split work across models
**So that** I get Sonnet's planning intelligence and Haiku's execution speed

**Acceptance Criteria**:
- [ ] Brownfield-onboarder splits: Sonnet analysis → Haiku migration → Sonnet validation
- [ ] Role-orchestrator uses Sonnet for PM/Architect, Haiku for Frontend/Backend
- [ ] Phase transitions are transparent (user sees "Switching to Haiku for execution")
- [ ] Each phase completes independently (no cross-phase dependencies)
- [ ] Failed phase falls back to Sonnet for debugging

**Priority**: P2 - Advanced optimization

---

### US-006: Cost Dashboard & Reporting
**As a** project manager
**I want** to see AI cost trends and savings over time
**So that** I can justify AI tool investments and optimize spending

**Acceptance Criteria**:
- [ ] `/specweave:costs` command shows summary dashboard
- [ ] Dashboard displays: total spent, savings %, cost per increment
- [ ] Historical trend chart (last 10 increments)
- [ ] Cost comparison: Sonnet-only vs optimized
- [ ] Export to CSV for reporting

**Priority**: P2 - Business reporting

---

### US-007: User Control Modes
**As a** power user
**I want** to control how aggressively the system optimizes costs
**So that** I can balance cost savings with my preferred workflow

**Acceptance Criteria**:
- [ ] `auto` mode: System decides everything (default)
- [ ] `balanced` mode: System asks approval for major model switches
- [ ] `manual` mode: User specifies model per task
- [ ] Configuration in `.specweave/config.yaml`
- [ ] Mode change takes effect immediately (no restart)

**Priority**: P3 - Power user feature

---

### US-008: Cost Policies & Guardrails
**As a** team lead
**I want** to set cost policies for my project
**So that** I can prevent runaway AI spending

**Acceptance Criteria**:
- [ ] Set max cost per increment (warning/block thresholds)
- [ ] Set daily/weekly/monthly budget limits
- [ ] Warning notifications when approaching limits
- [ ] Automatic downgrade to Haiku when nearing budget
- [ ] Override with `--force` flag for critical work

**Priority**: P3 - Enterprise feature

---

### US-009: Research Phase Before Spec Generation
**As a** product owner
**I want** optional market research before spec generation
**So that** I validate ideas before investing time in detailed specs

**Acceptance Criteria**:
- [ ] `/specweave:inc` prompts: "Run research first? [Y/n]" (default: Yes)
- [ ] Research uses Haiku 4.5 (cheap, fast, 15 min)
- [ ] Research covers: market analysis, competitors, user needs, competitive gaps
- [ ] Research output saved to `increment/research.md`
- [ ] PM agent reads `research.md` when generating spec.md
- [ ] Cost estimate shown: "Research: 15 min, ~$0.02"
- [ ] User can skip research for known problems (internal tools, technical debt)
- [ ] Research results presented with proceed/pivot/cancel options

**Research Output Includes**:
- Competitive landscape (5-10 competitors with strengths/weaknesses)
- Market size and growth trends
- User pain points (validated)
- Gaps in existing solutions
- Opportunity assessment

**Why This Matters**:
- Prevents wasted work on saturated markets
- Informs better specs (research-driven vs guesswork)
- Reduces spec iteration rounds (better inputs = better outputs)
- Enables "research-only" mode (validate ideas without implementation)

**Priority**: P1 - Changes the entire increment workflow

---

### US-010: Model Version Policy (Always Latest)
**As a** system architect
**I want** model references to always point to the latest versions
**So that** users automatically benefit from quality/performance improvements

**Acceptance Criteria**:
- [ ] ❌ NEVER use Sonnet 3.5 - ALWAYS use Sonnet 4.5
- [ ] ❌ NEVER use Haiku 3.0 - ALWAYS use Haiku 4.5
- [ ] Simple naming: `sonnet` = latest Sonnet (currently 4.5)
- [ ] Simple naming: `haiku` = latest Haiku (currently 4.5)
- [ ] Simple naming: `opus` = latest Opus (when available)
- [ ] Model IDs in code reference constants (easy to update)
- [ ] Documentation clarifies: "sonnet" means "current best Sonnet model"
- [ ] Version changelog tracks which Anthropic models map to our tiers

**Model Mapping** (as of 2025-10-31):
```typescript
const MODELS = {
  sonnet: 'claude-sonnet-4-5-20250929',    // CURRENT BEST
  haiku: 'claude-4-5-haiku-20250110',      // CURRENT BEST
  opus: 'claude-opus-4-0-...',             // When released
}
```

**Update Policy**:
- When Anthropic releases Sonnet 4.6 → update MODELS.sonnet
- When Anthropic releases Haiku 5.0 → update MODELS.haiku
- Users get upgrade automatically (no config changes needed)

**Priority**: P1 - Critical for quality

---

### US-011: Quality Validation Optimization
**As a** user running quality validation (optional feature)
**I want** validation to be fast and cheap
**So that** I can iterate on specs quickly without high costs

**Acceptance Criteria**:
- [ ] Quality validation uses Haiku 4.5 (not Sonnet)
- [ ] Validation rounds reduced from 3 to 2 (default)
- [ ] `--strict` flag enables 3-round Sonnet validation (for critical specs)
- [ ] Cost/time estimate shown before running: "~1 min, ~$0.04"
- [ ] Quality judge skill updated to use Haiku for LLM-as-Judge
- [ ] PM agent refinement rounds use Haiku (not Sonnet)
- [ ] Only initial spec generation uses Sonnet

**Performance Gains**:
- Current (3 rounds Sonnet): ~3-4 min, ~$0.15
- Optimized (2 rounds Haiku): ~1 min, ~$0.04
- **Savings: 67% time, 73% cost**

**Quality Maintained**:
- Haiku 4.5 is 90% as capable as Sonnet for judgment tasks
- Validation is pass/fail (doesn't require deep reasoning)
- Strict mode available for critical specs (healthcare, finance)

**Priority**: P2 - Enhances existing optional feature

---

## Non-Functional Requirements

### Performance
- **NFR-001**: Model selection decision < 50ms (negligible overhead)
- **NFR-002**: Cost tracking adds < 10ms per operation
- **NFR-003**: Phase detection accuracy > 95%

### Reliability
- **NFR-004**: Haiku execution success rate > 90% (vs Sonnet baseline)
- **NFR-005**: Automatic fallback to Sonnet if Haiku fails repeatedly
- **NFR-006**: Cost data persists across sessions (no data loss)

### Usability
- **NFR-007**: Zero configuration required for basic usage
- **NFR-008**: Clear explanation of model choices in logs
- **NFR-009**: Cost savings visible in real-time

### Compatibility
- **NFR-010**: Backward compatible (existing projects work without changes)
- **NFR-011**: Works with all existing agents and skills
- **NFR-012**: Manual model override always available

## Success Criteria

### Quantitative Metrics
- **60% cost reduction** on implementation-heavy increments
- **90% accuracy** for Haiku vs Sonnet on execution tasks
- **95% phase detection** accuracy
- **0 breaking changes** to existing workflows
- **100% model references** use Sonnet 4.5 / Haiku 4.5 (NEVER 3.x)
- **50% of users** opt for research phase before spec generation
- **67% time savings** on quality validation (when used)

### Qualitative Metrics
- Users report significant cost savings
- Positive feedback on cost transparency
- No complaints about degraded quality from Haiku
- Users appreciate research preventing wasted work
- Faster iteration cycles (research → informed spec → less rework)

### Adoption Metrics
- 80% of users keep default (auto mode)
- 50% of users check `/specweave:costs` regularly
- 90% of agents use model_preference field

## Out of Scope (Future Increments)

### Deferred to Later
- ❌ Opus model support (focus on Sonnet/Haiku only)
- ❌ Cost prediction before execution (ML model required)
- ❌ Team-level cost analytics dashboard (web UI)
- ❌ Integration with cloud billing APIs
- ❌ Cost optimization for MCP servers

### Explicitly Not Included
- ❌ Support for non-Anthropic models (OpenAI, etc.)
- ❌ Real-time model switching mid-task
- ❌ A/B testing framework for model comparison
- ❌ Cost-based task prioritization

## Technical Constraints

### Must Maintain
- ✅ Current Task tool API (backward compatible)
- ✅ Manual model override capability
- ✅ All existing agent/skill functionality

### Must Avoid
- ❌ Breaking existing user projects
- ❌ Requiring configuration for basic usage
- ❌ Hidden cost charges (full transparency required)
- ❌ Quality degradation below 90% threshold

## Risk Assessment

### High Risks
1. **Haiku quality insufficient** → Mitigation: Automatic fallback to Sonnet
2. **Phase detection inaccurate** → Mitigation: Explicit logging, user override
3. **Cost tracking overhead** → Mitigation: Async logging, minimal instrumentation

### Medium Risks
1. **User confusion about models** → Mitigation: Clear documentation, transparent logs
2. **Cost savings overpromised** → Mitigation: Conservative estimates (60% vs 70%)

### Low Risks
1. **Agent classification errors** → Mitigation: Easy to update agent preferences
2. **Budget policy too restrictive** → Mitigation: Configurable, default generous

## Dependencies

### Technical Dependencies
- Anthropic Claude API (Haiku 4.5 availability) ✅ Available
- Task tool model parameter support ✅ Exists
- Agent system ✅ Exists
- Config management system ✅ Exists

### Increment Dependencies
- **0001-core-framework**: Agent system, Task tool
- **0002-core-enhancements**: Command system, hooks

### External Dependencies
- None (self-contained feature)

## Rollout Strategy

### Phase 1: Foundation (Week 1)
- Agent model preferences
- Basic phase detection
- Cost tracking infrastructure

### Phase 2: Intelligence (Week 2)
- Advanced phase detection
- Auto-split orchestration
- Cost dashboard

### Phase 3: Control (Week 3)
- User control modes
- Cost policies
- Documentation

### Beta Testing
- Internal dogfooding (SpecWeave development)
- 5-10 beta users
- Measure actual cost savings
- Refine thresholds

### General Availability
- Documentation complete
- Success metrics validated
- Announcement blog post

## Documentation Requirements

### User Documentation
- [ ] Getting Started: "How SpecWeave saves you 60% on AI costs"
- [ ] Reference: Model selection algorithm explanation
- [ ] How-To: Overriding model selection
- [ ] How-To: Reading cost reports
- [ ] How-To: Setting cost policies

### Developer Documentation
- [ ] Architecture: Cost tracking system design
- [ ] API: Cost tracker service API
- [ ] Contributing: Adding new agents with preferences

### Marketing Materials
- [ ] Blog post: "Announcing Intelligent Model Selection"
- [ ] Comparison: SpecWeave vs competitors (cost focus)
- [ ] Case study: Real project cost savings

## Related Work

### Inspiration
- Anthropic's official Sonnet/Haiku guidance (transcript)
- BMAD-METHOD's cost-conscious approach
- spec-kit's simplicity philosophy

### Competitive Analysis
- ❌ Cursor: No automatic model optimization
- ❌ GitHub Copilot: No cost visibility
- ❌ Windsurf: No multi-model support
- ✅ **SpecWeave: Only framework with automatic cost optimization**

## Appendix: Anthropic Official Guidance

**From Anthropic Video Transcript**:
> "The big pattern we're seeing from our community is that **Sonnet 4.5 does the high-level problem decomposition and planning**, and then **Haiku 4.5 is used to actually implement and write the code**. This multi-agent approach is becoming really popular for things like large-scale refactors or tackling technical debt."

**Performance**: Haiku 4.5 achieves **90% of Sonnet 4.5's performance** in agentic coding evaluations.

**Cost**: Haiku is **1/3 the cost** ($1 vs $3 per million input tokens).

**Speed**: Haiku is **2x faster** than Sonnet.

**Conclusion**: This increment implements Anthropic's official recommendation as an automatic, transparent system.

---

**Last Updated**: 2025-10-30
**Increment ID**: 0003-intelligent-model-selection
**Status**: Planned
**Next Steps**: Create `plan.md` with technical architecture
