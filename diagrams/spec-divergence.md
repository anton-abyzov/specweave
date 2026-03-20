# The Spec Divergence

Use this Mermaid diagram on the introduction page to visualize why specs matter.

## Diagram: The Divergence

```mermaid
graph TD
    Start["Day 1: Ship a Feature with AI<br/><i>Both paths ship fast. Both look identical.</i>"]

    Start -->|"Just code it!"| V1
    Start -->|"Spec it first"| S1

    V1["Session 2: Starting from zero<br/>AI has no memory. Re-explain everything."]
    S1["Session 2: Spec provides full context<br/>AI continues where you left off."]

    V1 --> V2["Month 3: 'Which prompt made this?'<br/>10 features = 10 undocumented mysteries<br/>New dev joins → 2 weeks to understand"]
    S1 --> S2["Month 3: 50 searchable specs<br/>Verified skills encode your team's patterns<br/>New dev → productive in 2 days"]

    V2 --> V3["Year 1: Rewriting features you already built<br/>Knowledge evaporated. Bugs reappear.<br/>3 parallel agents = 3 conflicting decisions"]
    S2 --> S3["Year 1: 635 increments. Zero knowledge lost.<br/>Skills compound — AI gets better over time.<br/>Parallel agents coordinate through shared specs"]

    V3 --> VEnd["VELOCITY COLLAPSES<br/>Technical debt > new features"]
    S3 --> SEnd["VELOCITY ACCELERATES<br/>Institutional memory compounds"]

    classDef start fill:#e8f0fe,stroke:#495057,color:#1e1e1e
    classDef vibe fill:#fff5f5,stroke:#e03131,color:#1e1e1e
    classDef spec fill:#ebfbee,stroke:#2f9e44,color:#1e1e1e
    classDef vibeEnd fill:#c92a2a,stroke:#a51d1d,color:#ffffff
    classDef specEnd fill:#2b8a3e,stroke:#1e7a30,color:#ffffff

    class Start start
    class V1,V2,V3 vibe
    class S1,S2,S3 spec
    class VEnd vibeEnd
    class SEnd specEnd
```

## Stronger Arguments (suggested copy for the introduction page)

Replace the current bullet list with this narrative:

### The Session Amnesia Problem

Every AI coding session starts from zero. Session 47 has no idea what session 46 did. Without specs, you're paying for context-building over and over — explaining the same codebase, the same constraints, the same decisions.

### The Parallel Chaos Problem

Run 3 AI agents in parallel without specs = 3 agents making conflicting decisions. No shared source of truth. No coordination layer. The more agents you add, the more chaos you create.

### The Knowledge Drain

When a developer leaves, their prompting patterns leave too. The "how we do things here" lives in chat history that no one will ever search. Six months later, the team is rewriting features they already built — because no one documented they existed.

### The Brownfield Wall

AI tools hit a wall when they encounter undocumented decisions from 3 years ago. Multi-repo codebases with hundreds of services and zero architectural docs are where AI assistants fail hardest — right where you need them most.

### Why Specs + Skills Change Everything

**Specs** are persistent requirements that survive sessions, team changes, and tool migrations. They tell AI WHAT to build and WHY.

**Skills** are verified, reusable expertise — not just prompts, but validated patterns that any AI agent can follow consistently. They tell AI HOW your team builds.

Together, they create a coordination layer that compounds:
- Spec #1 feels like overhead
- Spec #635 feels like compound interest
- Every spec makes every future session faster — because AI has more context to build on
- Every skill encodes a lesson learned — so the team never makes the same mistake twice

**The proof**: SpecWeave itself was built with 635+ increments. Every feature specified. Every decision traceable. Zero knowledge lost.
