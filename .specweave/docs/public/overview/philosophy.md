# Philosophy

SpecWeave is built on a set of core principles that guide every design decision. Understanding these principles will help you get the most out of the framework.

## Core Principles

### 1. Specification Before Implementation

**Define WHAT and WHY before HOW.**

Traditional development often jumps straight to implementation without clear specifications. This leads to:
- Unclear requirements
- Scope creep
- Missing features
- Undocumented systems

SpecWeave enforces specification-first development:

\`\`\`
Specification → Architecture → Implementation → Testing
\`\`\`

### 2. Living Documentation

**Specs evolve with code, never diverge.**

Documentation is not a one-time artifact—it's a living system that grows with your codebase.

- **Auto-update**: Claude hooks update docs after task completion
- **Version controlled**: All specs in git
- **Backwards links**: Every doc references related docs
- **Context manifests**: Declare what specs are needed

### 3. Context Precision

**Load only what's needed (70%+ token reduction).**

Loading entire specifications wastes tokens and money. SpecWeave uses:
- **Selective loading**: Load specific sections
- **Context manifests**: Declare required context
- **Cache-friendly**: Reuse frequently-loaded context
- **Scalable**: Works with 10 pages or 1000+ pages

### 4. Test-Validated Features

**Every feature proven through automated tests.**

Four levels of testing ensure quality:
1. Specification acceptance criteria (TC-0001)
2. Feature test strategy (tests.md)
3. Skill test cases (YAML)
4. Code tests (E2E, unit, integration)

**Truth-telling requirement**: E2E tests MUST tell the truth—no false positives.

### 5. Regression Prevention

**Document existing code before modification.**

Modifying brownfield code without documentation is dangerous. SpecWeave enforces:

1. Analyze current implementation
2. Generate retroactive documentation
3. Create baseline tests
4. User reviews and approves
5. Implement modifications safely

### 6. Scalable from Solo to Enterprise

**Modular structure that grows with project size.**

Whether you're a solo developer or a 100-person team, SpecWeave scales:

- **Solo/Startup**: Start with 10-20 pages, grow incrementally
- **Enterprise**: Create 500-600+ pages upfront
- **Both approaches supported**: Comprehensive or incremental

### 7. Auto-Role Routing

**Skills detect expertise automatically.**

No manual agent selection—SpecWeave routes intelligently:

\`\`\`
User: "Create payment integration"
→ specweave-detector activates
→ Routes to increment-planner
→ Invokes PM, Architect, Security agents
→ Generates complete specification
\`\`\`

>90% routing accuracy.

### 8. Closed-Loop Validation

**E2E tests must tell the truth (no false positives).**

Test validation is not enough—tests must be **truthful**:

- ✅ If test passes → feature actually works
- ✅ If test fails → exactly what failed
- ❌ No masking failures
- ❌ No assuming success without verification

## Design Decisions

### Why Markdown?

**Human-readable, version-controllable, AI-friendly.**

- Git-friendly (easy diffs)
- Tooling-agnostic (works anywhere)
- Readable without rendering
- AI can parse and generate
- Supports Mermaid diagrams
- No vendor lock-in

### Why Mermaid Diagrams?

**Diagrams-as-code, version controlled, maintainable.**

- Text-based (git-friendly)
- No binary files
- Easy to update
- Renders beautifully
- C4 Model support
- No external tools required

### Why C4 Model?

**Industry-standard architecture visualization.**

- Clear hierarchy (Context → Container → Component → Code)
- Scales to enterprise systems
- Well-documented methodology
- Tool support (Mermaid, PlantUML, Structurizr)
- Familiar to architects

### Why Auto-Numbering?

**Prevents merge conflicts, maintains order.**

- Increments: `0001-feature-name`
- ADRs: `0001-decision-title.md`
- RFCs: `0001-proposal-title.md`
- Test cases: `TC-0001`

No manual numbering = no conflicts.

### Why Framework-Agnostic?

**Works with ANY tech stack.**

SpecWeave doesn't impose technology choices:
- Detects your stack (TypeScript, Python, Go, etc.)
- Adapts commands to your framework
- Generates stack-specific examples
- No vendor lock-in

### Why Claude Code?

**Best AI coding assistant for production software.**

- Sonnet 4.5: Best for coding and complex agents
- Agentic workflows: Multi-agent orchestration
- Tool use: Read, Write, Edit, Bash, etc.
- Context awareness: Large context window
- Production-ready: Not a toy

## Documentation Approaches

SpecWeave supports TWO valid approaches:

### Approach 1: Comprehensive Upfront (Enterprise)

**When to use**:
- Enterprise systems with complex requirements
- Regulated industries (healthcare, finance, government)
- Large teams (10+ developers)
- Production systems requiring complete spec before implementation

**Characteristics**:
- 500-600+ page specifications created before development
- Complete architecture documentation upfront
- All ADRs documented in advance

**Benefits**:
- Complete clarity before code is written
- Easier team coordination
- Better for regulated environments

### Approach 2: Incremental/Evolutionary (Startup)

**When to use**:
- Startups with evolving requirements
- Exploratory projects
- Small teams (1-5 developers)
- MVPs and prototypes

**Characteristics**:
- Start with high-level overview (10-20 pages)
- Build documentation as you go (like Microsoft)
- Add modules/specs as features are planned

**Benefits**:
- Faster time-to-first-code
- Adapts to changing requirements
- Less documentation maintenance

**Both approaches are equally valid!** Choose based on your project needs.

## Workflow Philosophy

### Greenfield Projects

1. Choose documentation approach (comprehensive or incremental)
2. Create specifications (strategy docs)
3. Design architecture (ADRs, system design)
4. Plan increments
5. Implement with context precision
6. Tests validate automatically

### Brownfield Projects

1. **Step 0**: Merge existing CLAUDE.md (if exists)
2. **Step 1**: Analyze existing code
3. **Step 2**: Document related modules
4. **Step 3**: Create tests for current behavior
5. **Step 4**: Plan modifications
6. **Step 5**: Implement with regression monitoring

## Anti-Patterns

### ❌ What SpecWeave Prevents

1. **Vibe Coding**: Implementing without specifications
2. **Documentation Divergence**: Code and docs out of sync
3. **Context Bloat**: Loading entire specs unnecessarily
4. **Regression Bugs**: Modifying code without tests
5. **Tech Debt**: Missing architecture decisions
6. **False Confidence**: Tests that lie about functionality

### ✅ What SpecWeave Enforces

1. **Specification-First**: Always define before implementing
2. **Living Documentation**: Auto-update via hooks
3. **Context Precision**: Load only what's needed
4. **Regression Prevention**: Document before modifying
5. **Architecture Clarity**: ADRs for all major decisions
6. **Truth-Telling Tests**: E2E tests must be honest

## Success Metrics

How do you know SpecWeave is working?

### Code Quality
- ✅ >80% test coverage for critical paths
- ✅ All P1 tasks have specifications
- ✅ All ADRs documented
- ✅ 0% false positive tests

### Efficiency
- ✅ 70%+ token reduction (context precision)
- ✅ >90% routing accuracy
- ✅ &lt;5 minutes to find relevant specs
- ✅ Auto-documentation updates

### Team Collaboration
- ✅ New developers onboard in &lt;1 day
- ✅ Specifications are single source of truth
- ✅ No "tribal knowledge" silos
- ✅ Clear decision history (ADRs)

### Production Readiness
- ✅ All features have specifications
- ✅ All features have tests
- ✅ All features have documentation
- ✅ Regression tests before modifications

---

**Ready to get started?**

- [Quickstart Guide](/docs/guides/getting-started/quickstart) - Get up and running in 5 minutes
- [Core Concepts](/docs/guides/core-concepts/specifications) - Understand the fundamentals

**Previous**: [Key Features](/docs/overview/features) ←
